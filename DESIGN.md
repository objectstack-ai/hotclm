# HotCLM — 设计蓝图

> 本文是架构权威：定位、对象、权限、受众端、自动化、集成、里程碑。改设计先改这里，再改代码。
> 派发循环（`AGENTS.md` → PM dispatch）把它当作 ADR 目录使用：一个卡片与本文冲突时，本文胜出，或者先在这里落一条修订。
>
> 思路来源：Ironclad 的四件套 —— Workflow Designer（合同类型即流程）、Launch Form（业务自助发起）、
> Playbook（条款立场与偏离）、Repository（合同是结构化数据）—— 落到 ObjectStack 元数据。
> 签后管理参照 Sirion，可配置性参照 Agiloft。

## 00 命名

| 项 | 值 |
|---|---|
| 仓库 | `objectstack-ai/hotclm` |
| 产品名 | **HotCLM** —— 与 HotCRM 同一命名法：`Hot` + 品类缩写，一眼可知是合同全生命周期管理 |
| manifest id | `app.objectstack.hotclm` |
| namespace / 对象前缀 | `clm` / `clm_`（领域前缀，与 hotcrm → `crm_` 同例） |
| 显示名 | HotCLM · 合同管理 |
| 协议范围 | `engines.protocol '^17'`，与 `@objectstack/spec` 同步升级 |

命名核查（2026-09-07）：`hotclm` 在 npm 未被占用，搜索无同名产品。放弃 `Open*` 前缀：OpenCLM（openclm.ai，AGPL）、OpenContracts、OpenClause、OpenSign 全部已被占用。
曾考虑的 `whereas`（鉴于条款首词）被否决：看不出是合同管理，且显得随意。备选 `contractstack`（npm 未占用，无同名产品）。

## 01 定位与边界

**单企业内部的合同全生命周期管理，法务、财务、合规视角，买卖双边加非交易类合同。**
它不是 HotCRM 的模块：合同管理的买家是法务部门，法务不会为了管合同买一套 CRM。

### Ironclad 的三条原则，原样采用

1. **业务自助发起，法务是控制点不是瓶颈。** 发起人按合同类型填一张表单，系统决定谁审、谁签、归哪；法务只处理需要判断的地方。
2. **合同类型即流程。** NDA、采购、销售、劳务各自一条流程定义：发起字段、审批矩阵、签署方式、归档属性。新增一种合同 = 加一条配置，不是加一段代码。
3. **合同是数据，不是文件。** 关键属性结构化存储，文件只是附件；到期、义务、收付款都是可查询、可提醒、可看板的记录。

### 范围

**范围内**：发起与受理 · 法务审查 · 条款库与偏离 · 审批矩阵 · 谈判轮次与版本 · 签署与用印 · 履约义务 · 收付款计划核对 · 变更补充与续签 · 到期与归档 · 台账与看板 · 存量合同导入。

**范围外**：在线起草与红线编辑器（v2）· 电子签引擎（只集成，不自建）· 供应商准入与评价（SRM）· 应收应付账（财务系统）· 商机与报价（HotCRM）· 法律案件与诉讼。

### 与 HotCRM 的分工

| | `crm_contract` | `clm_contract` |
|---|---|---|
| 回答的问题 | 客户关系是否有效、何时续约、交给计费什么 | 在哪个环节、谁审的、盖没盖章、履约到哪、收付款是否按计划 |
| 方向 | 只有销售 | 销售、采购、其他 |
| 相对方 | `crm_account` 必填 | `clm_party`，可链到 `crm_account` |

**方向规则**：商务信息以 `crm_contract` 为准，法律状态以 `clm_contract` 为准。`clm_contract.crm_contract` 是跨包 lookup；两者并装时 HotCRM 的 `in_approval` 由 CLM 推进（§06 F15）。

### 命名纪律

对象名、字段名、选项值一律通用，**零行业词汇**。合同类型、审批阈值、用印种类、付款条件、签约主体全部是种子数据或配置 —— 换一套种子就是另一个行业的版本。
平台保留词（`role` · `position` · `permission_set` · `business_unit`）不得作字段名（ADR-0090 D3）。

## 02 Ironclad 概念 → 平台落法

| Ironclad | 含义 | CLM 落法 |
|---|---|---|
| Workflow Designer | 每种合同一条可配置流程 | `clm_contract_type` 承载发起字段、审查与签署方式；`clm_approval_rule` 承载审批矩阵。流程元数据只有**一套**，读矩阵结果 |
| Launch Form | 业务自助发起，条件字段 | screen flow `contract_intake`（F1）；可选字段按类型的 `intake_fields` 显隐与必填 |
| Conditional Approvers | 金额、部门、偏离决定审批人 | hook 解析矩阵，把结果盖成 `route_*` 标志；审批流是固定五级台阶，decision 节点按标志跳过台阶；法务加财务会签用 `per_group` |
| Turn tracking | 球在谁手里 | `current_turn` + `turn_since`；停滞提醒（F4） |
| Editor / Redlining | 在线红线 | v1 版本文件加 `kind` 标记（`clm_contract_version`）；v2 再做编辑器 |
| Playbook | 条款的标准立场与备选立场 | `clm_clause` 标准文本 / 备选文本 / 风险级别；`clm_deviation` 记录偏离，高风险偏离触发法务负责人台阶 |
| Repository / Properties | 结构化属性与检索 | `clm_contract` 字段 + 导入映射 + AI 抽取（S1） |
| Signature | 电子签 | 连接器集成（F8）；国内特有的**用印**单独建模（`clm_seal_request`） |
| Insights | 周转分析 | 阶段时间戳 → dataset → 看板（§09） |
| Jurist | AI 法务助手 | 四个 skill（§07），无 AI 运行时时显式降级 |

## 03 对象模型

前缀 `clm_`。11 个对象，三个域。`[MD]` = master-detail 子对象，`sharingModel: 'controlled_by_parent'`。

```
配置域                          合同域                              签后域
clm_contract_type [public_read] clm_contract          [private]     clm_obligation    [MD]
clm_clause        [public_read] clm_contract_version  [MD]          clm_payment_plan  [MD]
clm_approval_rule [public_read] clm_review            [MD]
clm_party         [public_read] clm_deviation         [MD]
                                clm_seal_request      [MD]
```

### 字段清单

`*` = required；_斜体_ = 受字段级安全约束；枚举值即机器值。数字字段四件套（小数位 / 最小值 / 最大值 / 单位）必须显式声明。

| 对象 | 字段 |
|---|---|
| `clm_contract_type` `public_read` | name* · code*（编号前缀，如 `NDA`/`PUR`/`SAL`）· direction* `sales/purchase/other` · category* `nda/sales/purchase/service/lease/labor/framework/amendment/other` · description · template_file file · template_placeholders json（`{key,label,type,required}[]`，对应 spec 的 `DocumentTemplate.placeholders`）· intake_fields multiselect（本类型在发起表单上出现的可选字段）· requires_legal_review boolean · requires_seal boolean · sign_method `esign/wet_ink/both` · default_term_months · review_sla_days · retention_years · is_active |
| `clm_clause` `public_read` | title* · category `liability/payment/termination/confidentiality/ip/warranty/dispute/other` · standard_text* richtext · fallback_text richtext · position_note（不可接受的底线，文字）· risk_level `low/medium/high` · applies_to multiselect（合同 category）· requires_legal_head boolean（偏离即需法务负责人）· is_active |
| `clm_approval_rule` `public_read` | name* · applies_to multiselect（合同 category）· direction `sales/purchase/other/any` · amount_min currency · amount_max currency · only_with_deviation boolean · route_legal_head boolean · route_finance boolean · route_executive boolean · route_gm boolean · priority number · is_active |
| `clm_party` `public_read` | name* · party_kind `company/individual/government/other` · registration_no（统一登记号）· legal_representative · contact_name · _contact_phone_ · contact_email · address · bank_name · _bank_account_ · crm_account lookup（跨包，可选）· risk_flag `none/watch/blocked` · risk_note · verified_at · is_active。唯一索引 `(registration_no)` scope organization |
| `clm_contract` `private` | contract_number autonumber `CT-{00000}` · title* · contract_type* lookup · category（自类型盖戳，只读）· direction（同上）· party* lookup · our_entity select（签约主体，种子）· department select（种子）· owner_id（业务承办）· legal_owner lookup user · amount currency · currency_code · is_amount_estimated boolean · start_date · end_date · term_months · auto_renew boolean · renewal_notice_days · renewed_from lookup clm_contract · parent_contract lookup clm_contract（框架合同 / 补充协议的主合同）· **status**（§状态机）· risk_level `low/medium/high` · summary richtext · governing_law · payment_terms select · confidentiality_term_months · liability_cap currency · current_turn `internal/counterparty/none` · turn_since datetime · route_legal_head / route_finance / route_executive / route_gm boolean（hook 盖戳，只读）· approval_status（审批节点镜像）· submitted_at · review_started_at · approved_at · signed_at · activated_at · closed_at · signed_file file · esign_provider select · esign_envelope_id · esign_status `none/sent/completed/declined/voided` · requires_seal boolean（自类型盖戳）· sealed_at · is_expiring boolean（日任务盖戳）· archive_no · archived_at · crm_contract lookup（跨包，可选）· 汇总：version_count · open_deviation_count · overdue_obligation_count · planned_amount · actual_amount |
| `clm_contract_version` `by parent` | display_name（存储镜像 "v<n> · <kind>"，nameField）· contract* MD cascade · version_no* · kind* `draft/internal_redline/counterparty_redline/clean/final_signed` · file* · submitted_by user · turn `internal/counterparty` · notes · is_current boolean |
| `clm_review` `by parent` | display_name（镜像 "<stage> · <reviewer>"）· contract* MD cascade · reviewer* user · stage* `legal/finance/compliance/business` · decision `pending/approved/changes_requested/rejected` · risk_level_assessed · comments richtext（对发起人可见）· _internal_note_ richtext（仅法务）· started_at · decided_at |
| `clm_deviation` `by parent` | display_name（镜像 "<clause> · <status>"）· contract* MD cascade · clause* lookup · deviation_text* · requested_position `standard/fallback/custom` · justification · status `open/accepted/rejected/withdrawn` · decided_by user · decided_at |
| `clm_seal_request` `by parent` | display_name（镜像 "<seal_kind> ×<copies>"）· contract* MD cascade · seal_kind* `company/contract/legal_rep/finance`（标签由种子给：公章 / 合同章 / 法人章 / 财务章）· copies* number · purpose · requested_by user · status `pending/approved/sealed/rejected/cancelled` · sealed_by user · sealed_at · courier_no · return_confirmed boolean |
| `clm_obligation` `by parent` | display_name（镜像 title）· contract* MD cascade · title* · kind `deliverable/payment/report/renewal/compliance/other` · due_date* · owner lookup user · status `pending/in_progress/done/overdue/waived` · completed_at · evidence file · notes |
| `clm_payment_plan` `by parent` | display_name（镜像 "第<seq>期 · <planned_date>"）· contract* MD cascade · seq* · planned_date* · planned_amount* currency · condition · actual_date · actual_amount currency · status `planned/due/partial/paid/overdue` · invoice_no · notes |

### 状态机（写入层强制，非前端隐藏）

`clm_contract.status`：

| 从 | 到 | 守卫 |
|---|---|---|
| draft | submitted | 类型必选字段齐全；party 已设；至少一个版本文件或类型带模板 |
| submitted | in_review | 类型 `requires_legal_review`；法务受理（`legal_owner` 已分配） |
| submitted | in_approval | 类型不需法务审查时直达 |
| submitted | draft | 法务退回 |
| in_review | in_approval | 无 `open` 偏离；至少一条 `legal` 审查 `approved` |
| in_review | draft | 审查 `changes_requested` |
| in_approval | approved / rejected / draft | 审批流决定；send-back 回 draft |
| approved | signing | 存在 `kind: clean` 的当前版本 |
| signing | active | 存在 `final_signed` 版本；`requires_seal` 时 `sealed_at` 非空；`signed_at` 非空 |
| signing | approved | 签署失败回退 |
| active | expired | 仅日任务（F13） |
| active | terminated | `closed_at` 与终止原因必填 |
| rejected | draft | 修改重提 |
| draft / submitted / in_review / in_approval / approved / signing | cancelled | 发起人撤回或法务作废 |

`expired` · `terminated` · `cancelled` 为终态。续签不是转换：动作「发起续签」创建一份新的 draft 并写 `renewed_from`。补充协议同理：新合同，`category: amendment`，`parent_contract` 指向主合同。

其余子对象的状态机：
- `clm_deviation.status`：open→accepted/rejected/withdrawn；终态不可回
- `clm_seal_request.status`：pending→approved/rejected/cancelled；approved→sealed/cancelled
- `clm_obligation.status`：pending→in_progress/done/waived/overdue；overdue→done/waived；in_progress→done/waived
- `clm_payment_plan.status`：planned→due→partial/paid/overdue；overdue→partial/paid

### 五个刻意的取舍

- **没有 `clm_template` 对象。** 模板文件和占位符挂在合同类型上；换模板就是换文件。一个类型一份现行模板，历史模板不管。
- **没有 `clm_amendment` 对象。** 补充协议是一份合同，靠 `parent_contract` 和 `category` 表达；两个对象只会制造两份真相。
- **没有 `clm_signatory` 对象。** 签署方就是 `party` 加 `our_entity`；电子签的信封与状态是合同上的三个字段。
- **审批台阶固定五级。** 直接主管 → 法务负责人 → 财务负责人 → 分管领导 → 总经理。矩阵决定走哪几级，不决定台阶本身。Ironclad 的任意条件审批人在本平台对应「客户覆盖层加台阶」，不进标准品（§13 Q3）。
- **没有相对方门户。** 平台外部门户能力仍是缺口（PLATFORM_GAPS #27）；相对方红线走邮件往来，法务上传为 `counterparty_redline` 版本。

## 04 权限与隔离

企业 SaaS 形状：租户 = 组织，全部对象进租户墙（与 ats 的市场型划分不同，这里无需豁免）。

### OWD 与岗位

`clm_contract` `private`；五个子对象 `controlled_by_parent`；四个配置对象 `public_read`，写权限仅管理岗。

Position 扁平，八个：`clm_legal_counsel`（法务经办）· `clm_legal_head`（法务负责人）· `clm_finance_controller`（财务负责人）· `clm_executive`（分管领导）· `clm_general_manager`（总经理）· `clm_seal_keeper`（印章管理员）· `clm_archivist`（档案管理员）· `clm_admin`。

Permission set 六个：`clm_requester`（所有员工默认）· `clm_legal` · `clm_finance` · `clm_seal` · `clm_archive` · `clm_admin`。

导航分区的门控能力由权限集 `systemPermissions` 授予：`clm_requester.access` · `clm_legal.access` · `clm_finance.access` · `clm_seal.access` · `clm_archive.access` · `clm_admin.access`。
动作门控同时在 UI 与服务端生效（ADR-0066 D4）：`approve_contract` · `seal_contract` · `archive_contract` · `terminate_contract` · `manage_clauses` · `manage_approval_rules`。

### 权限矩阵

R 读 · C 建 · U 改 · D 删；括号内为行级作用域。

| 对象 | clm_requester | clm_legal | clm_finance | clm_seal | clm_archive | clm_admin |
|---|---|---|---|---|---|---|
| clm_contract | RCU（本人发起，`draft`/`submitted` 可改） | RCU（全部） | RU（`approved` 及之后，FLS 锁法律字段） | R（`signing`） | RU（终态；归档字段） | RCUD |
| clm_contract_version | RC（本人合同） | RCU | R | R | R | RCUD |
| clm_review | R（`comments`，不含 `internal_note`） | RCU | RCU（stage=finance） | — | R | RCUD |
| clm_deviation | RC（本人合同） | RCU | R | — | R | RCUD |
| clm_seal_request | RC（本人合同） | RCU | — | RU（执行） | R | RCUD |
| clm_obligation | RU（本人负责） | RCU | R | — | R | RCUD |
| clm_payment_plan | R（本人合同） | RC | RCU | — | R | RCUD |
| clm_party | R（不含银行与电话） | RCU | RU（银行信息） | — | R | RCUD |
| clm_contract_type · clm_clause · clm_approval_rule | R | R（clause RCU） | R | R | R | RCUD |

### 共享规则

| 规则 | 对象 | 条件 | 授予 |
|---|---|---|---|
| `contract_legal_all` | clm_contract | 全部 | position `clm_legal_counsel` · `clm_legal_head` — edit |
| `contract_finance_post_approval` | clm_contract | `status in [approved, signing, active, expired, terminated]` | position `clm_finance_controller` — edit（FLS 锁法律字段，§13 Q1） |
| `contract_seal_signing` | clm_contract | `status == 'signing' && requires_seal == true` | position `clm_seal_keeper` — read |
| `contract_archive_terminal` | clm_contract | `status in [active, expired, terminated]` | position `clm_archivist` — edit |
| `contract_executive_routed` | clm_contract | `route_executive == true` | position `clm_executive` — read |
| `contract_gm_routed` | clm_contract | `route_gm == true` | position `clm_general_manager` — read |
| `contract_manager_reports` | clm_contract | — | `writeScope: 'own_and_reports'`（企业版 `hierarchy-security`，开源版退化为 owner-only） |

RLS 谓词不能跨对象（ADR-0055），所以「同部门可见」无法用 `current_user` 的部门表达 —— `department` 是合同上的冗余标量，部门内共享按客户以 team 规则覆盖（§13 Q2）。

### 字段级安全

| 字段 | 对谁遮蔽 | 理由 |
|---|---|---|
| `clm_party.bank_account` · `contact_phone` | clm_requester · clm_seal · clm_archive | 付款与联系信息最易外泄；读取落审计 |
| `clm_review.internal_note` | clm_requester · clm_finance | 法务内部意见；对发起人的结论走 `comments` |
| `clm_contract.risk_level` · `liability_cap` | clm_requester 只读 | 由法务评定 |
| `clm_contract.route_*` · `approval_status` · 阶段时间戳 | 所有岗位只读 | 只由 hook 与审批流写 |

## 05 视图与受众端

一个 App `clm`（ADR-0019 D3：一个 app 包一个 App），导航按受众分五组，每组 `requiredPermissions` 门控，空组自动折叠。

| 分区 | 门控 | 导航 | 主视图 |
|---|---|---|---|
| 我的合同（所有人） | `clm_requester.access` | 发起合同 · 我发起的 · 待我处理 · 我负责的履约 | 发起 = screen flow 动作；我发起的 grid（按 status 分组）；待我处理 = 平台审批收件箱；履约 grid（due_date 升序） |
| 法务工作台 | `clm_legal.access` | 待受理 · 审查中 · 谈判中 · 全部合同 · 到期日历 · 条款库 · 合同类型 | 待受理 grid（`submitted` 且未分配）· 审查中 grid（`legal_owner == me`）· 谈判中 grid（`current_turn == counterparty`，按 `turn_since` 升序）· **状态看板** kanban（groupBy status）· 到期 calendar（end_date） |
| 财务 | `clm_finance.access` | 收付款计划 · 生效合同 · 收付款看板 | 计划 grid ×3 listView（本月到期 / 逾期 / 已付）· 生效合同 grid |
| 用印与档案 | `clm_seal.access` / `clm_archive.access` | 用印申请 · 待归档 · 合同台账 | 用印 grid（`pending`/`approved`）· 待归档 grid（终态且 `archive_no` 空）· 台账 grid（全字段，可导出） |
| 管理 | `clm_admin.access` | 审批矩阵 · 相对方 · 签约主体与部门 · 报表 | 配置对象 grid |

**合同详情页**（slotted）：header 挂「提交 / 受理 / 送审 / 发起签署 / 生效 / 终止 / 发起续签」动作，按 status 与门控显隐；highlights：编号 · 相对方 · 金额 · 到期日 · 当前轮次；path 组件显示 draft→submitted→in_review→in_approval→approved→signing→active；tab：概要 / 版本（timeline）/ 审查与偏离 / 审批记录（平台 `sys_approval_request`）/ 履约与收付款 / 用印与归档 / 讨论（平台 discussion slot，评论与 @）。

无匿名公开表单：合同发起必须登录。

## 06 自动化

| # | 名称 | 类型 | 行为 |
|---|---|---|---|
| F1 | `contract_intake` | screen flow（发起表单） | 选类型 → 按类型 `intake_fields` 显示条件字段 → 相对方查找或新建 → 上传首版或标记「按模板」→ 建合同（`draft`）与版本 v1 → 可选一键提交。`ai.exposed`，输入变量齐全时可由 MCP 调用 |
| F2 | `contract_route` | hook beforeUpdate（进入 `submitted`） | 自类型盖戳 `category`/`direction`/`requires_seal`；按 `clm_approval_rule` 命中项盖 `route_*`；写 `submitted_at`；`requires_legal_review` 时在 `clm_legal_counsel` 中按未结合同数最少轮询分配 `legal_owner` 并进 `in_review`，否则直进 `in_approval` |
| F3 | `legal_review_sla` | 定时（日） | `in_review` 超过类型 `review_sla_days`：提醒 `legal_owner`，超一倍抄送 `clm_legal_head` |
| F4 | `turn_stalled` | 定时（日） | `current_turn == counterparty` 且 `turn_since` 超 7 天：提醒业务承办催对方 |
| F5 | `contract_approval` | record_change（进入 `in_approval`），`runAs: 'system'` | 台阶 1 直接主管（`type: 'manager'`）→ decision 按 `route_legal_head` / `route_finance` 决定台阶 2 是否为法务加财务**会签**（`per_group`）或单方 → decision `route_executive` → 台阶 4 分管领导（position）→ decision `route_gm` → 台阶 5 总经理。`lockRecord: true`，`approvalStatusField: approval_status`；approve → `approved` + `approved_at`；reject → `rejected`；send-back → `draft` |
| F6 | `deviation_gate` | hook beforeUpdate | 存在 `open` 偏离时拒绝进入 `in_approval`；接受了 `requires_legal_head` 条款的偏离即置 `route_legal_head = true` |
| F7 | `seal_request_approval` | record_change（`clm_seal_request` 新建） | 法务负责人审批 → `approved` → 通知印章管理员；管理员标 `sealed` → hook 盖合同 `sealed_at` |
| F8 | `esign_dispatch` / `esign_callback` | 动作 + api 触发流 | 「发起电子签」经 durable HTTP 把 clean 版本与签署方送给连接器指定的提供商；回调 api 流按信封状态写 `esign_status`，完成时建 `final_signed` 版本并写 `signed_at` |
| F9 | `contract_activate` | hook afterUpdate（进入 `active`） | 写 `activated_at`；按类型默认建续签提醒义务；发起时填了付款安排则生成 `clm_payment_plan`；并装 HotCRM 时回写 `crm_contract`（status `activated`、`signed_date`、文件） |
| F10 | `obligation_due` | 定时（日） | T-7 与 T-0 提醒义务 owner；过期未完成置 `overdue`，父合同汇总 `overdue_obligation_count` 随之变化 |
| F11 | `payment_overdue` | 定时（日） | `planned_date` 已过且未 `paid`：置 `overdue`，提醒财务负责人与业务承办 |
| F12 | `renewal_notice` | 定时（日） | `active` 且 `end_date - renewal_notice_days <= today`：置 `is_expiring`，提醒业务承办与法务；动作「发起续签」预填新 draft |
| F13 | `expiration_sweep` | 定时（日） | `active` 且 `end_date < today`：非自动续签置 `expired`；自动续签则建续签 draft 并提醒 |
| F14 | `contract_archive` | hook beforeUpdate | 终态合同由档案岗填 `archive_no` 后置 `archived_at`，此后除 `notes` 外只读 |
| F15 | `crm_handoff` | record_change（`crm_contract` 进入 `in_approval`） | **仅 `CLM_COMPOSITION=with-hotcrm` 装配时注册**：建 `clm_contract`（direction `sales`，party 自 `crm_account` 查找或新建，金额期限预填，`crm_contract` 回链） |

定时流与对审批结果做出反应的 record_change 流一律 `runAs: 'system'` 并注明理由（审批服务的镜像写不带用户，默认身份会被拒绝）。

## 07 AI（skills-only，挂平台 `ask` 助手）

AI 运行时只在云版存在。开源版启动时没有 `ai` 能力：按钮不出现、字段不出现，**绝不用占位输出冒充预测**（templates 仓库的教训）。

| # | skill | 触发 | 行为 |
|---|---|---|---|
| S1 | `extract_terms` | 上传 PDF 或存量导入 | 提出 party · amount · start/end · governing_law · payment_terms · 关键条款摘要；用户确认后写入字段。存量合同导入的主路径 |
| S2 | `review_summary` | 法务打开新版本 | 对比上一版本，按 `clm_clause` 类别列出变动，提出偏离草案；用户确认后建 `clm_deviation` |
| S3 | `deviation_check` | 建偏离时 | 对照标准文本与备选文本，建议 `risk_level` 与是否需法务负责人 |
| S4 | `contract_qa` | 合同库问答 | 在当前用户可见的合同内检索作答，附来源合同编号 |

四个 skill 都只**建议**，写入都经用户确认；每次调用带合同编号落审计。

## 08 集成

| 对象 | 方式 | 现状 |
|---|---|---|
| 电子签 | REST 连接器（Docusign · 契约锁 · 法大大 · e签宝），提供商与凭证在 `sys_setting`；回调走 api 触发流 | 平台**无**电子签引擎（spec 17 已明示移除），只集成不自建 |
| HotCRM | F15 交接 + F9 回写；跨包 lookup | 组合开关装配，单装 CLM 不含 |
| 相对方核验 | 企查查 / 天眼查连接器，写 `verified_at` 与 `risk_flag` | 可选 |
| 通知 | 站内 inbox · email · sms | 钉钉 / 飞书 / 企微 通道平台未实现（PLATFORM_GAPS #1），只能声明不能承诺 |
| 台账导出 | 平台导出 CSV / XLSX | PDF 打印仍是缺口（#9） |

## 09 分析

Dataset（语义层）：
- `contract_metrics` — 数量与金额，按类型 / 方向 / 状态 / 部门 / 月
- `contract_cycle_time` — `submitted_at → review_started_at → approved_at → signed_at → activated_at` 各段时长，按类型与法务经办
- `obligation_metrics` — 到期 / 逾期，按 owner 与合同
- `payment_metrics` — 计划与实际，按月；逾期金额

看板三个：
- **法务工作台** — 待受理数 · 审查中 · 超 SLA · 谈判停滞 · 平均周转（本月 vs 上月）· 各阶段合同数漏斗
- **管理层** — 生效合同额 · 90 天内到期 · 高风险合同 · 审批瓶颈（各台阶平均停留）· 按方向的合同额趋势
- **财务** — 本月应收 / 应付 · 逾期金额 · 按相对方的未付 top 10

已知限制：分析过滤器不支持公式字段（#10），所以所有看板筛选字段都是持久化字段；周期对比用平台 period-over-period。

## 10 种子数据

一家虚构公司，六个月历史，让每个看板第一屏就有内容。`demo-zh` 默认（国内买家），`demo-en` 同构。

| 对象 | 条数 | 要点 |
|---|---|---|
| clm_contract_type | 8 | NDA · 销售 · 采购 · 服务 · 租赁 · 劳务 · 框架 · 补充协议 |
| clm_clause | 30 | 覆盖全部 category，每类至少一条 `high` |
| clm_approval_rule | 6 | 三档金额 × 有无偏离 |
| clm_party | 40 | 客户 / 供应商 / 个人 / 政府各有；2 条 `blocked` |
| clm_contract | 120 | draft 10 · submitted 6 · in_review 12 · in_approval 8 · approved 4 · signing 6 · active 60 · expired 8 · terminated 4 · cancelled 2；其中 10 条 30 天内到期 |
| clm_contract_version | 300 | 谈判中的合同有 3 到 5 版，含对方红线 |
| clm_review · clm_deviation | 60 · 25 | 8 条偏离 `open`，让门槛可演示 |
| clm_seal_request | 20 | 4 条待办 |
| clm_obligation | 200 | 未来 30 天内到期 40 条，逾期 10 条 |
| clm_payment_plan | 300 | 本月到期 30 条，逾期 12 条 |

用户不可种子；各岗位账号在 Setup 建用户后分配 position（法务经办 ×2、法务负责人、财务负责人、分管领导、总经理、印章管理员、档案管理员、业务承办 ×3）。

## 11 仓库与里程碑

从 hotcrm 仓库 fork 骨架，保留 verify 链、token ratchet、docs 站、截图 meta.yaml、feature-inventory、requirements log、e2e、changesets、publish-marketplace，删除 `crm_` 对象。

```
objectstack.config.ts      defineStack；requires: automation · triggers · analytics · auth · ui · approvals · sharing（可选 hierarchy-security）
src/objects/               11 个 *.object.ts + *.hook.ts（状态机守卫、盖戳、display_name 镜像）
src/views/  src/pages/     五个分区的视图；合同详情 slotted 页
src/apps/                  1 个 App，五组受众分区
src/flows/                 F1–F15（F15 受组合开关控制）
src/skills/                S1–S4
src/datasets/ src/dashboards/  4 dataset · 3 dashboard
src/profiles/ src/sharing/ 6 permission set · 8 position · 7 sharing rule · FLS
src/mappings/              存量合同 / 相对方导入映射
src/translations/          zh-CN（默认）· en
src/data/                  demo-zh/ · demo-en/
content/docs/              产品文档（法务 / 财务 / 管理员 / 发布）
docs/requirements/         客户需求分诊记录（A/B/C/D）
docs/backlog/              派发卡片
```

| 里程碑 | 内容 | 验收 |
|---|---|---|
| M1 数据与权限骨架 | 11 对象 · 状态机守卫 · 8 position / 6 set · 共享与 FLS · 配置域种子 | `validate`/`lint`/`typecheck` 绿；业务承办经 REST 看不到他人合同；财务看不到 `in_review` 合同 |
| M2 发起与审批 | F1 · F2 · F5 · F6 · F7 · 法务工作台 · 详情页 · 全量种子 | 走通 发起→受理→偏离→会签→用印→生效，审批记录与审计齐全 |
| M3 签后与分析 | F9–F14 · 履约与收付款 · 4 dataset · 3 看板 · zh/en | 演示数据下无空图；到期、逾期提醒在收件箱可见 |
| M4 集成与可发布 | F8 电子签 · F15 CRM 交接 · S1–S4 · 导入映射 · 文档 · 截图 · marketplace 发布 | 陌生人 clone 一条命令跑起；marketplace 一键安装；需求书逐条对应 feature-inventory 与测试 |

一次只做一个里程碑；token ratchet 上限：业务语义 ≤ 60k，交互层 ≤ 30k，M1 起就卡。

## 12 平台缺口与降级（开工前逐条复核）

| 缺口 | 编号 | v1 降级 | 解除后 |
|---|---|---|---|
| 在线红线编辑器 | — | 版本文件 + `kind` 标记；对方红线上传 | 编辑器内比对 |
| 模板填充生成文档 | — | `DocumentTemplate.placeholders` 有 schema 无渲染引擎：下载模板 + 变量清单，法务填后上传 | 一键生成 v1 |
| PDF / 打印 | #9 | 浏览器打印 | 台账与用印单模板打印 |
| 电子签引擎 | — | 连接器集成 | 不自建 |
| 入站邮件 | #39 | 手动上传对方版本 | 邮件附件自动成版本 |
| 外部相对方门户 | #27 | 邮件往来 | 相对方在线红线 |
| IM 通知通道 | #1 | inbox / email / sms | 钉钉 / 飞书 / 企微 |
| CEL 日期算术 | #7 | 到期、逾期由日任务盖戳字段 | 公式字段 |
| 跨对象公式 | #36 | hook 冗余 `category` / `direction` / `requires_seal` | 直接引用类型 |

规则：平台能力受限**只上报** objectstack，不在本仓库修平台；应用侧只允许带环境闸门的临时夹具并注明平台 issue；新发现追加到 objectstack 的 `docs/PLATFORM_GAPS_FROM_TEMPLATES.md`。

## 13 待裁决项

**Q1 · 财务对生效合同的写权限。** 当前：`edit` + FLS 锁法律字段。替代：`clm_payment_plan` 脱离 master-detail、自持 OWD 和共享。前者简单但财务可改合同非法律字段；后者失去汇总字段。建议前者，M1 验证 FLS 能否锁住 `status`。

**Q2 · 部门内可见性。** RLS 不能表达「与当前用户同部门」。选项：不做（默认，靠 `own_and_reports`）；或按客户覆盖层加 team 共享规则，部门 = team。建议不进标准品。

**Q3 · 审批台阶是否够。** 固定五级覆盖国内中型企业常见的分级审批；Ironclad 式任意条件审批人留给客户覆盖层。若第一个客户就要第六级，改为矩阵驱动台阶数（hook 盖 `approver_n` 字段、节点 `type: 'field'`），成本一周。

**Q4 · 相对方与 `crm_account` 的关系。** 当前：永远独立 `clm_party`，可选 lookup 到 `crm_account`。替代：并装时直接复用 `crm_account`。后者让 CLM 单装时缺相对方主数据，否决；保留 lookup 即可。

**Q5 · 合同编号。** `autonumber` 只有静态格式（`CT-{00000}`），做不到「按类型前缀 + 年份 + 流水」。选项：接受单一流水，类型 code 作独立列；或 hook 生成编号并存 `contract_number` 文本字段（放弃 autonumber）。国内客户对编号规则要求刚性，建议 M1 用 hook 方案并把规则做成类型配置。

**Q6 · 是否复用 HotCRM 的 `crm_contract` 六种类型枚举。** 不复用。CLM 的 category 是流程分类，crm_contract 的类型是商务分类，两者语义不同，硬对齐只会互相牵制；F15 做一次映射即可。
