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

### 全球优先（维护者裁定，2026-09-07）

产品面向全球客户，区域需求以配置和区域包承载，绝不进 schema 的硬路径：

- **语言**：英文为默认与源语言，`zh-CN` 为完整第二语言包；对象、字段、选项的 label 先写英文。
- **主体与币种**：签约主体多个（集团多法人），币种在合同上（`currency_code`，组织级默认是设置不是 schema，出厂 `USD`）。
- **法域**：每份合同带 `governing_law`、`jurisdiction`、`contract_language`；相对方带 `country_code`。
- **执行**：电子签是默认执行方式（DocuSign 首发，Adobe Acrobat Sign、Dropbox Sign 随后，ESIGN / eIDAS 框架下的法律效力由提供商承担）；公司印章、公证、见证、回签副本是类型上可配置的**执行形式**（`execution_formalities`），不是模块。
- **相对方筛查**：制裁名单与公司登记核验走连接器（OFAC / EU / UK 名单，OpenCorporates、Dun & Bradstreet），区域包接本地登记库。
- **数据保护**：类型级保留年限与处置，满足 GDPR 的存储限制；导出与删除按平台数据主体流程。
- **区域包**：中国（契约锁 / 法大大 / e签宝、本地登记库、印章形式的种子）等区域差异以扩展包装配（§13 Q7），标准品零区域词汇。

### 范围

**范围内**：发起与受理 · 法务审查 · 条款库与偏离 · 审批矩阵 · 谈判轮次与版本 · 签署与执行形式 · 履约义务 · 收付款计划核对 · 变更补充与续签 · 到期与归档 · 台账与看板 · 存量合同导入。

**范围外**：在线起草与红线编辑器（v2）· 电子签引擎（只集成，不自建）· 供应商准入与评价（SRM）· 应收应付账（财务系统）· 商机与报价（HotCRM）· 法律案件与诉讼。

### 与 HotCRM 的分工

| | `crm_contract` | `clm_contract` |
|---|---|---|
| 回答的问题 | 客户关系是否有效、何时续约、交给计费什么 | 在哪个环节、谁审的、盖没盖章、履约到哪、收付款是否按计划 |
| 方向 | 只有销售 | 销售、采购、其他 |
| 相对方 | `crm_account` 必填 | `clm_party`，可链到 `crm_account` |

**方向规则**：商务信息以 `crm_contract` 为准，法律状态以 `clm_contract` 为准。`clm_contract.crm_contract` 是跨包 lookup；两者并装时 HotCRM 的 `in_approval` 由 CLM 推进（§06 F15）。

### 命名纪律

对象名、字段名、选项值一律通用，**零行业词汇**。合同类型、审批阈值、执行形式、币种、付款条件、签约主体全部是种子数据或配置 —— 换一套种子就是另一个行业的版本。
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
| Signature | 电子签与执行 | 连接器集成（F8）：DocuSign、Adobe Acrobat Sign、Dropbox Sign 首发，区域提供商作区域包；每一轮签署是一条 `clm_signature` 记录，类型要求的执行形式（回签副本、公司印章、公证、见证）在记录上勾齐才能生效 |
| Insights | 周转分析 | 阶段时间戳 → dataset → 看板：交付各阶段到达数与审批吞吐，各段时长等平台日期能力（§09） |
| Jurist | AI 法务助手 | 四个 skill（§07），无 AI 运行时时显式降级 |

## 03 对象模型

前缀 `clm_`。11 个对象，三个域。`[MD]` = master-detail 子对象，`sharingModel: 'controlled_by_parent'`。

```
配置域                          合同域                              签后域
clm_contract_type [public_read] clm_contract          [private]     clm_obligation    [MD]
clm_clause        [public_read] clm_contract_version  [MD]          clm_payment_plan  [MD]
clm_approval_rule [public_read] clm_review            [MD]
clm_party         [public_read] clm_deviation         [MD]
                                clm_signature         [MD]
```

### 字段清单

`*` = required；_斜体_ = 受字段级安全约束；枚举值即机器值。数字字段四件套（小数位 / 最小值 / 最大值 / 单位）必须显式声明。

| 对象 | 字段 |
|---|---|
| `clm_contract_type` `public_read` | name* · code*（编号前缀，如 `NDA`/`MSA`/`SOW`）· direction* `sales/purchase/other` · category* `nda/sales/purchase/service/lease/employment/framework/dpa/amendment/other` · description · template_file file · template_placeholders json（`{key,label,type,required}[]`，对应 spec 的 `DocumentTemplate.placeholders`）· intake_fields multiselect（本类型在发起表单上出现的可选字段）· requires_legal_review boolean · execution_formalities multiselect `countersigned_copy/company_seal/notarized/witnessed` · sign_method `esign/wet_ink/either`（默认 esign） · default_term_months · review_sla_days · retention_years · is_active |
| `clm_clause` `public_read` | title* · category `liability/payment/termination/confidentiality/ip/warranty/dispute/other` · standard_text* richtext · fallback_text richtext · position_note（不可接受的底线，文字）· risk_level `low/medium/high` · applies_to multiselect（合同 category）· requires_legal_head boolean（偏离即需法务负责人）· is_active |
| `clm_approval_rule` `public_read` | name* · applies_to multiselect（合同 category）· direction `sales/purchase/other/any` · amount_min currency · amount_max currency · only_with_deviation boolean · route_legal_head boolean · route_finance boolean · route_executive boolean · route_gm boolean · priority number · is_active |
| `clm_party` `public_read` | name* · party_kind `company/individual/government/other` · registration_no（统一登记号）· legal_representative · contact_name · _contact_phone_ · contact_email · address · bank_name · _bank_account_ · crm_account lookup（跨包，可选）· risk_flag `none/watch/blocked` · risk_note · verified_at · is_active。唯一索引 `(registration_no)` scope organization |
| `clm_contract` `private` | contract_number text（hook 生成 `<type.code>-<YYYY>-<0000>`，按类型按年流水，提交时盖戳后只读，唯一索引 scope organization；§13 Q5）· is_backfilled boolean（补录的已签合同，§13 Q8）· title* · contract_type* lookup · category（自类型盖戳，只读）· direction（同上）· party* lookup · our_entity select（签约主体，种子）· department select（种子）· owner_id（业务承办）· legal_owner lookup user · amount currency · currency_code（种子：`USD` 默认、`EUR`、`GBP`、`CNY`、`JPY`）· is_amount_estimated boolean · start_date · end_date · term_months · auto_renew boolean · renewal_notice_days · renewed_from lookup clm_contract · parent_contract lookup clm_contract（框架合同 / 补充协议的主合同）· **status**（§状态机）· risk_level `low/medium/high` · summary richtext · governing_law · jurisdiction · contract_language select（种子，默认 `en`）· payment_terms select · confidentiality_term_months · liability_cap currency · current_turn `internal/counterparty/none` · turn_since datetime · route_legal_head / route_finance / route_executive / route_gm boolean（hook 盖戳，只读）· approval_status（审批节点镜像）· submitted_at · review_started_at · approved_at · signed_at · activated_at · closed_at · termination_reason textarea（`requiredWhen` 状态为 `terminated`；不出现在发起表单，只在终止那一刻问一次）· execution_formalities multiselect（自类型盖戳，只读）· executed_at datetime · ai_summary richtext · ai_risk_score number（0–100）· ai_risk_rationale textarea · ai_reviewed_at datetime（四个 AI 字段只由「采纳建议」动作写入，§07）· is_expiring boolean（日任务盖戳）· archive_no · archived_at · crm_contract lookup（跨包，可选）· 汇总：version_count · open_deviation_count · overdue_obligation_count · planned_amount · actual_amount |
| `clm_contract_version` `by parent` | display_name（存储镜像 "v<n> · <kind>"，nameField）· contract* MD cascade · version_no* · kind* `draft/internal_redline/counterparty_redline/clean/final_signed` · file* · submitted_by user · turn `internal/counterparty` · notes · is_current boolean |
| `clm_review` `by parent` | display_name（镜像 "<stage> · <reviewer>"）· contract* MD cascade · reviewer* user · stage* `legal/finance/compliance/business` · decision `pending/approved/changes_requested/rejected` · risk_level_assessed · comments richtext（对发起人可见）· _internal_note_ richtext（仅法务）· started_at · decided_at |
| `clm_deviation` `by parent` | display_name（镜像 "<clause> · <status>"）· contract* MD cascade · clause* lookup · deviation_text* · requested_position `standard/fallback/custom` · justification · status `open/accepted/rejected/withdrawn` · decided_by user · decided_at |
| `clm_signature` `by parent` | display_name（镜像 "<method> · <status>"）· contract* MD cascade · method* `esign/wet_ink` · provider select（DocuSign / Adobe Acrobat Sign / Dropbox Sign；区域包追加）· envelope_id · signers json（`[{side: our|counterparty, name, email, order, status, signed_at}]`）· status `draft/sent/completed/declined/voided` · formalities_done multiselect（与类型 `execution_formalities` 同值域）· executed_file file · completed_at · notes |
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
| signing | active | 存在 `completed` 的签署记录且其 `formalities_done` 覆盖类型的 `execution_formalities`；存在 `final_signed` 版本；`signed_at` 非空 |
| signing | approved | 签署失败回退 |
| active | expired | 仅日任务（F13） |
| active | terminated | `closed_at` 与终止原因必填 |
| rejected | draft | 修改重提 |
| draft / submitted / in_review / in_approval / approved / signing | cancelled | 发起人撤回或法务作废 |

`expired` · `terminated` · `cancelled` 为终态。续签不是转换：动作「发起续签」创建一份新的 draft 并写 `renewed_from`。补充协议同理：新合同，`category: amendment`，`parent_contract` 指向主合同。

其余子对象的状态机：
- `clm_deviation.status`：open→accepted/rejected/withdrawn；终态不可回
- `clm_signature.status`：draft→sent/completed/voided（湿签直接 completed）；sent→completed/declined/voided；declined→draft
- `clm_obligation.status`：pending→in_progress/done/waived/overdue；overdue→done/waived；in_progress→done/waived/overdue
- `clm_payment_plan.status`：planned→due→partial/paid/overdue；overdue→partial/paid；partial→paid/overdue

### 五个刻意的取舍

- **没有 `clm_template` 对象。** 模板文件和占位符挂在合同类型上；换模板就是换文件。一个类型一份现行模板，历史模板不管。
- **没有 `clm_amendment` 对象。** 补充协议是一份合同，靠 `parent_contract` 和 `category` 表达；两个对象只会制造两份真相。
- **没有 `clm_signatory` 对象。** 签署方是 `clm_signature.signers` 里的 JSON 行；一轮签署一条记录，信封、状态与执行形式都在记录上，合同只保留 `executed_at`。
- **审批台阶固定五级。** 直接主管 → 法务负责人 → 财务负责人 → 分管领导 → 总经理。矩阵决定走哪几级，不决定台阶本身。Ironclad 的任意条件审批人在本平台对应「客户覆盖层加台阶」，不进标准品（§13 Q3）。
- **没有相对方门户。** 平台外部门户能力仍是缺口（PLATFORM_GAPS #27）；相对方红线走邮件往来，法务上传为 `counterparty_redline` 版本。
- **没有印章模块。** 公司印章是 `execution_formalities` 的一个值，与公证、见证、回签副本同级；印章流转（申请、执行、快递）属于中国区域包，标准品不建模。

## 04 权限与隔离

企业 SaaS 形状：租户 = 组织，全部对象进租户墙（与 ats 的市场型划分不同，这里无需豁免）。

### OWD 与岗位

`clm_contract` `private`；五个子对象 `controlled_by_parent`；四个配置对象 `public_read`，写权限仅管理岗。

Position 扁平，七个：`clm_legal_counsel`（法务经办）· `clm_legal_head`（法务负责人）· `clm_finance_controller`（财务负责人）· `clm_executive`（分管领导）· `clm_general_manager`（总经理）· `clm_records_manager`（档案与记录管理员：执行登记、归档、台账）· `clm_admin`。

Permission set 五个：`clm_requester`（所有员工默认）· `clm_legal` · `clm_finance` · `clm_records` · `clm_admin`。

导航分区的门控能力由权限集 `systemPermissions` 授予：`clm_requester.access` · `clm_legal.access` · `clm_finance.access` · `clm_records.access` · `clm_admin.access`。
动作门控同时在 UI 与服务端生效（ADR-0066 D4）：`approve_contract` · `execute_contract` · `archive_contract` · `terminate_contract` · `manage_clauses` · `manage_approval_rules`。

### 权限矩阵

R 读 · C 建 · U 改 · D 删；括号内为行级作用域。

| 对象 | clm_requester | clm_legal | clm_finance | clm_records | clm_admin |
|---|---|---|---|---|---|
| clm_contract | RCU（本人发起，`draft`/`submitted` 可改） | RCU（全部） | RU（`approved` 及之后，FLS 锁法律字段） | RU（`signing` 及之后；执行与归档字段） | RCUD |
| clm_contract_version | RC（本人合同） | RCU | R | RC（执行副本） | RCUD |
| clm_review | R（`comments`，不含 `internal_note`） | RCU | RCU（stage=finance） | R | RCUD |
| clm_deviation | RC（本人合同） | RCU | R | R | RCUD |
| clm_signature | R（本人合同） | RCU | R | RU（执行形式、执行副本） | RCUD |
| clm_obligation | RU（本人负责） | RCU | R | R | RCUD |
| clm_payment_plan | R（本人合同） | RC | RCU | R | RCUD |
| clm_party | R（不含银行与电话） | RCU | RU（银行信息） | R | RCUD |
| clm_contract_type · clm_clause · clm_approval_rule | R | R（clause RCU） | R | R | RCUD |

### 共享规则

| 规则 | 对象 | 条件 | 授予 |
|---|---|---|---|
| `contract_legal_all` | clm_contract | 全部 | position `clm_legal_counsel` · `clm_legal_head` — edit |
| `contract_finance_post_approval` | clm_contract | `status in [approved, signing, active, expired, terminated]` | position `clm_finance_controller` — edit（FLS 锁法律字段，§13 Q1） |
| `contract_records_execution` | clm_contract | `status in [signing, active, expired, terminated]` | position `clm_records_manager` — edit（FLS 限执行与归档字段） |
| `contract_executive_routed` | clm_contract | `route_executive == true` | position `clm_executive` — read |
| `contract_gm_routed` | clm_contract | `route_gm == true` | position `clm_general_manager` — read |
| `contract_manager_reports` | clm_contract | — | `writeScope: 'own_and_reports'`（企业版 `hierarchy-security`，开源版退化为 owner-only） |

RLS 谓词不能跨对象（ADR-0055），所以「同部门可见」无法用 `current_user` 的部门表达 —— `department` 是合同上的冗余标量，部门内共享按客户以 team 规则覆盖（§13 Q2）。

### 字段级安全

| 字段 | 对谁遮蔽 | 理由 |
|---|---|---|
| `clm_party.bank_account` · `contact_phone` | clm_requester · clm_records | 付款与联系信息最易外泄；读取落审计 |
| `clm_review.internal_note` | clm_requester · clm_finance | 法务内部意见；对发起人的结论走 `comments` |
| `clm_contract.risk_level` · `liability_cap` | clm_requester 只读 | 由法务评定 |
| `clm_contract.route_*` · `approval_status` · 阶段时间戳 | 所有岗位只读 | 只由 hook 与审批流写 |
| `clm_contract.ai_*` | 所有岗位只读 | 只由「采纳建议」动作写入，写入前 AI 输出不落字段 |

## 05 视图与受众端

一个 App `clm`（ADR-0019 D3：一个 app 包一个 App），导航按受众分五组，每组 `requiredPermissions` 门控，空组自动折叠。

| 分区 | 门控 | 导航 | 主视图 |
|---|---|---|---|
| 我的合同（所有人） | `clm_requester.access` | 发起合同 · 我发起的 · 待我处理 · 我负责的履约 | 发起 = screen flow 动作；我发起的 grid（按 status 分组）；待我处理 = 平台审批收件箱；履约 grid（due_date 升序） |
| 法务工作台 | `clm_legal.access` | 待受理 · 审查中 · 谈判中 · 全部合同 · 到期日历 · 条款库 · 合同类型 | 待受理 grid（`submitted` 且未分配）· 审查中 grid（`legal_owner == me`）· 谈判中 grid（`current_turn == counterparty`，按 `turn_since` 升序）· **状态看板** kanban（groupBy status）· 到期 calendar（end_date） |
| 财务 | `clm_finance.access` | 收付款计划 · 生效合同 · 收付款看板 | 计划 grid ×3 listView（本月到期 / 逾期 / 已付）· 生效合同 grid |
| 执行与档案 | `clm_records.access` | 待执行 · 待归档 · 合同台账 | 待执行 grid（`signing` 且签署记录未 `completed` 或执行形式未齐）· 待归档 grid（终态且 `archive_no` 空）· 台账 grid（全字段，可导出） |
| 管理 | `clm_admin.access` | 审批矩阵 · 相对方 · 签约主体与部门 · 报表 | 配置对象 grid |

**合同详情页**（slotted）：header 挂「提交 / 受理 / 送审 / 发起签署 / 生效 / 终止 / 发起续签」动作，按 status 与门控显隐；highlights：编号 · 相对方 · 金额 · 到期日 · 当前轮次；path 组件显示 draft→submitted→in_review→in_approval→approved→signing→active；tab：概要 / 版本（timeline）/ 审查与偏离 / 审批记录（平台 `sys_approval_request`）/ 履约与收付款 / 签署与归档 / 讨论（平台 discussion slot，评论与 @）。

无匿名公开表单：合同发起必须登录。

## 06 自动化

| # | 名称 | 类型 | 行为 |
|---|---|---|---|
| F1 | `contract_intake` | screen flow（发起表单） | 选类型 → 按类型 `intake_fields` 显示条件字段 → 相对方查找或新建 → 上传首版或标记「按模板」→ 建合同（`draft`）与版本 v1 → 可选一键提交。`ai.exposed`，输入变量齐全时可由 MCP 调用 |
| F2 | `contract_route` | hook beforeUpdate（进入 `submitted`） | 自类型盖戳 `category`/`direction`/`execution_formalities`；按 `clm_approval_rule` 命中项盖 `route_*`；写 `submitted_at`；`requires_legal_review` 时在 `clm_legal_counsel` 中按未结合同数最少轮询分配 `legal_owner` 并进 `in_review`，否则直进 `in_approval` |
| F3 | `legal_review_sla` | 定时（日） | `in_review` 超过类型 `review_sla_days`：提醒 `legal_owner`，超一倍抄送 `clm_legal_head` |
| F4 | `turn_stalled` | 定时（日） | `current_turn == counterparty` 且 `turn_since` 超 7 天：提醒业务承办催对方 |
| F5 | `contract_approval` | record_change（进入 `in_approval`），`runAs: 'system'` | 台阶 1 直接主管（`type: 'manager'`）→ decision 按 `route_legal_head` / `route_finance` 决定台阶 2 是否为法务加财务**会签**（`per_group`）或单方 → decision `route_executive` → 台阶 4 分管领导（position）→ decision `route_gm` → 台阶 5 总经理。`lockRecord: true`，`approvalStatusField: approval_status`；approve → `approved` + `approved_at`；reject → `rejected`；send-back → `draft` |
| F6 | `deviation_gate` | hook beforeUpdate | 存在 `open` 偏离时拒绝进入 `in_approval`；接受了 `requires_legal_head` 条款的偏离即置 `route_legal_head = true` |
| F7 | `signature_record` | record_change（`clm_signature` 进入 `completed`） | hook 比对 `formalities_done` 与类型 `execution_formalities`：齐备则盖合同 `executed_at` 并由 `executed_file` 建 `final_signed` 版本；缺项则通知法务经办并点名缺哪一项。湿签路径：法务或档案岗在签署记录上传执行副本并勾选形式 |
| F8 | `esign_dispatch` / `esign_callback` | 动作 + api 触发流 | 「发起电子签」经 durable HTTP 把 clean 版本与签署方送给连接器指定的提供商；回调 api 流按信封状态写 `esign_status`，完成时建 `final_signed` 版本并写 `signed_at` |
| F9 | `contract_activate` | hook afterUpdate（进入 `active`） | 写 `activated_at`；按类型默认建续签提醒义务；并装 HotCRM 时回写 `crm_contract`（status `activated`、`signed_date`、文件） |
| F10 | `obligation_due` | 定时（日） | T-7 与 T-0 提醒义务 owner；过期未完成置 `overdue`，父合同汇总 `overdue_obligation_count` 随之变化 |
| F11 | `payment_overdue` | 定时（日） | `planned_date` 已过且未 `paid`：置 `overdue`，提醒财务负责人与业务承办 |
| F12 | `renewal_notice` | 定时（日） | `active` 且 `end_date - renewal_notice_days <= today`：置 `is_expiring`，提醒业务承办与法务；动作「发起续签」预填新 draft |
| F13 | `expiration_sweep` | 定时（日） | `active` 且 `end_date < today`：非自动续签置 `expired`；自动续签则建续签 draft 并提醒 |
| F14 | `contract_archive` | hook beforeUpdate | 终态合同由档案岗填 `archive_no` 后置 `archived_at`，此后除 `summary` 外只读 |
| F16 | `executed_upload` | 动作（补录已签合同，§13 Q8） | 档案或法务岗「补录已签合同」：一步填核心字段、相对方、执行副本与签署日期，合同直接进入 `active` 并置 `is_backfilled`，跳过审查与审批但全部留审计；仅 `clm_records.access` 与 `clm_legal.access` 可用 |
| F15 | `crm_handoff` | record_change（`crm_contract` 进入 `in_approval`） | **仅 `CLM_COMPOSITION=with-hotcrm` 装配时注册**：建 `clm_contract`（direction `sales`，party 自 `crm_account` 查找或新建，金额期限预填，`crm_contract` 回链） |

定时流与对审批结果做出反应的 record_change 流一律 `runAs: 'system'` 并注明理由（审批服务的镜像写不带用户，默认身份会被拒绝）。

## 07 AI 融合（维护者要求：与 AI 怎么融合，2026-09-07）

AI 是流程里的**参与者**，不是旁边的聊天窗。三条治理原则先于任何能力：与人同权限同审计（AI 只能看调用者能看的合同，每次调用落审计：谁、哪份合同、哪个 skill、哪个模型、结论）；只建议不直接写（每条建议经人「采纳」才落字段或改状态，AI 永远不能推动状态机）；没有 AI 运行时就隐藏（开源版无 `ai` 能力时按钮与字段不出现，绝不用占位输出冒充结果）。

### 三层落地机制

| 层 | 机制 | 本应用的用法 |
|---|---|---|
| 技能 | skills-only 挂平台 `ask` 助手（ADR-0063，`surface` 绑定），无应用自有 agent | S1–S6 |
| 工具 | 每个 `ai.exposed` 动作即 AI 工具，并经平台 MCP 暴露给外部 agent（Claude、Copilot、客户自己的 agent） | 发起合同、查状态、查到期义务、检索合同、登记偏离，权限按调用用户 |
| 数据 | 合同上四个 `ai_*` 字段只由「采纳建议」动作写入；审计里 AI 建议与人工采纳各一条 | 摘要、风险分与理由、审查时间 |

### 能力地图（按生命周期）

| # | 阶段 | skill / 能力 | 输入 | 输出 | 写入方式 | 版本 |
|---|---|---|---|---|---|---|
| S1 | 导入 / 发起 | `extract_terms` 条款抽取 | 上传的 PDF / DOCX | 相对方、金额、币种、起止、适用法律、付款条款、关键条款摘要 | 人确认后写字段 | M4 |
| S5 | 导入 / 生效 | `extract_obligations` 义务抽取 | 终版文本 | 义务草案（标题、类型、到期、负责人建议） | 人确认后建 `clm_obligation` | M4 |
| S2 | 审查 | `review_summary` 版本变动摘要 | 新版本 vs 上一版 | 按条款类别列出变动，偏离草案 | 人确认后建 `clm_deviation` | M4 |
| S3 | 审查 | `deviation_check` 偏离风险 | 偏离文本 vs 条款标准 / 备选 | 风险级别建议、是否需法务负责人 | 人确认后写偏离字段 | M4 |
| S6 | 审批 | `approver_memo` 审批备忘录 | 合同、偏离、同类合同 | 一页备忘录：金额与阈值、偏离与风险、同类对比、关注点；`ai_risk_score` 与理由 | 备忘录附在审批请求上，标「AI 生成，未经法务复核」；分数经法务采纳才写 | M4 |
| S4 | 检索 | `contract_qa` 合同库问答 | 自然语言 | 答案附合同编号 | 不写 | M4 |
| — | 发起 | 对话式发起 | 助手对话或 MCP 调用 F1 | 同 F1 | 同 F1 校验 | M2（随 F1 的 `ai.exposed`） |
| — | 谈判 | playbook 建议回复 | 对方红线条款 | 备选立场文本 | 不写 | 二期 |
| — | 检索 | 相似合同与条款召回（向量检索，平台 knowledge 服务） | 条款文本 | 相似条款与所在合同 | 不写 | 二期 |
| — | 定制 | 用 AI 改应用：客户经 Claude Code 等改合同类型、矩阵、视图 | 自然语言 | 元数据变更，走同一条 verify 链 | 覆盖层 | 随平台 |

### 治理规则

| 规则 | 内容 |
|---|---|
| 模型无关 | 走平台模型注册表（Anthropic、OpenAI、Bedrock、本地），应用不写任何提供商代码 |
| 数据边界 | 合同文本只送给组织配置的模型端点；自托管可全内网 |
| 提示词版本化 | 提示词在 skill 元数据里，随包版本，可 diff |
| 置信度 | 抽取字段带置信度，低于阈值不展示建议只展示原文 |
| 一键关闭 | 组织级设置关闭全部 AI；关闭后 `ai_*` 字段保留但只读 |
| 审计 | 每次调用一条审计，采纳一条审计，两条互链 |

## 08 集成

| 对象 | 方式 | 现状 |
|---|---|---|
| 电子签 | REST 连接器（DocuSign 首发；Adobe Acrobat Sign、Dropbox Sign 随后；区域提供商如 契约锁 / 法大大 / e签宝 作区域包），提供商与凭证在 `sys_setting`；回调走 api 触发流 | 平台**无**电子签引擎（spec 17 已明示移除），只集成不自建 |
| HotCRM | F15 交接 + F9 回写；跨包 lookup | 组合开关装配，单装 CLM 不含 |
| 相对方筛查 | 制裁名单（OFAC / EU / UK）与公司登记核验（OpenCorporates、Dun & Bradstreet）连接器，区域包接本地登记库；写 `screening_status` 与 `screened_at` | 可选 |
| 通知 | 站内 inbox · email · sms · Slack（平台 `connector-slack`） | Microsoft Teams 与区域即时通讯通道平台未实现（PLATFORM_GAPS #1），只能声明不能承诺 |
| 台账导出 | 平台导出 CSV / XLSX | PDF 打印仍是缺口（#9） |

## 09 分析

Dataset（语义层）：
- `contract_metrics` — 数量与金额，按类型 / 方向 / 状态 / 部门 / 月
- `contract_cycle_time` — 各阶段到达数（`submitted_at` / `review_started_at` / `approved_at` / `signed_at` / `activated_at` 各自的盖戳覆盖数），按类型与法务经办；不含任何时长度量
- `obligation_metrics` — 到期 / 逾期，按 owner 与合同
- `payment_metrics` — 计划与实际，按月；逾期金额

看板三个：
- **法务工作台** — 待受理数 · 审查中 · 审查超 30 天（固定阈值，写进砖的标题）· 谈判停滞 · 审批吞吐（本月 vs 上月，用平台 `compareTo`）· 各阶段合同数（横向条形图，按合同数从多到少排；只画在办的六个阶段）
- **管理层** — 生效合同额 · 90 天内到期 · 高风险合同 · 各台阶路由量（四级台阶各一块砖，读 F2 盖的 `route_*` 标志；是流量，不是停留）· 按方向的合同额趋势
- **财务** — 本月应收 / 应付 · 逾期金额 · 按相对方的未付 top 10

已知限制：分析过滤器不支持公式字段（#10），所以所有看板筛选字段都是持久化字段；周期对比用平台 period-over-period。

**各段时长与按类型的「超 SLA」不在 V1.0 交付面内**（维护者裁定，2026-09-09）。语义层不收 SQL 也不收表达式（ADR-0021），没有地方做时间戳减法；且 `Field.datetime` 在 SQLite 上存 ISO 文本，`AVG()` 打在其上会静默返回平均年份而不是平均日期。两项都等平台的日期能力，跟踪于 `objectstack-ai/objectstack#16737`。在那之前 §09 交付的是：周转以各阶段到达数与审批吞吐如实呈现，SLA 以固定 30 天阈值呈现且阈值写进砖的标题（九种类型的真实 SLA 是 2/3/5/10 天，30 天高于全部，标题自陈阈值就不会被误读成按类型的违约）。§09 原列的「审批瓶颈（各台阶平均停留）」同样不交付，且另有一条独立于平台的原因：审批台阶的起止无处可读——`sys_approval_request` 在标准演示数据下零行，审批阶梯（F5）从未运行——所以即使平台补上日期运算，停留时长仍要先有审批请求记录才算得出来。看板在那个位置交付的是各台阶的路由量。⛔ 不得用应用侧日任务盖戳字段把各段时长与「超 SLA」补出来 —— 那是在应用里复刻平台规则。

**「各阶段合同数」是横向条形图，不是漏斗，且只画在办阶段**（#48 / PR #57 换掉图形，#59 / PR #62 收窄口径，均已合并）。漏斗断言逐级单调递减，而这本合同簿不递减（§10 的分布：draft 10 · submitted 6 · in_review 12 · in_approval 8 · approved 4 · signing 6 · active 60），画成漏斗是在断言数据没说的事。收录判据是**法务在这个阶段是否还有事要做**：`draft` / `submitted` / `in_review` / `in_approval` / `approved` / `signing` 六个在办阶段入图；`active` 与 `rejected` / `expired` / `terminated` / `cancelled` 四种终态都不入图 —— 生效合同簿的规模归管理层看板（生效合同额 · 90 天内到期），不是法务工作台的队列。排序按合同数从多到少（`sortBy: 'contract_count'` / `sortOrder: 'desc'`），⛔ **不承诺可编排的阶段顺序**：console 17.4.0 只有漏斗分支读 `stageOrder`，条形图上静默丢弃，非 `en` 语言下连漏斗分支也因标签不匹配而丢，跟踪于 `objectstack-ai/objectstack#17344`。

## 10 种子数据

一家虚构的跨国集团（美国母公司，欧洲与亚太子公司；合同以 USD / EUR / GBP 计价，适用法律分布在 US-NY、England and Wales、Germany），六个月历史，让每个看板第一屏就有内容。`demo-en` 默认，`demo-zh` 同构。

| 对象 | 条数 | 要点 |
|---|---|---|
| clm_contract_type | 9 | NDA · MSA · SOW · 订单 · 供应商协议 · DPA · 租赁 · 独立承包人 · 补充协议 |
| clm_clause | 30 | 覆盖全部 category，每类至少一条 `high` |
| clm_approval_rule | 6 | 三档金额 × 有无偏离 |
| clm_party | 40 | 客户 / 供应商 / 个人 / 政府各有；2 条 `blocked` |
| clm_contract | 120 | draft 10 · submitted 6 · in_review 12 · in_approval 8 · approved 4 · signing 6 · active 60 · expired 8 · terminated 4 · cancelled 2；其中 10 条 30 天内到期 |
| clm_contract_version | 300 | 谈判中的合同有 3 到 5 版，含对方红线 |
| clm_review · clm_deviation | 60 · 25 | 8 条偏离 `open`，让门槛可演示 |
| clm_signature | 30 | 6 条 `sent`，2 条执行形式未齐 |
| clm_obligation | 200 | 未来 30 天内到期 40 条，逾期 10 条 |
| clm_payment_plan | 300 | 本月到期 30 条，逾期 12 条 |

用户不可种子；各岗位账号在 Setup 建用户后分配 position（法务经办 ×2、法务负责人、财务负责人、分管领导、总经理、档案与记录管理员、CLM 管理员）；业务承办 ×3 不是 position，`clm_requester` 是全员默认集，在 Setup 直接授予。

## 11 仓库与里程碑

从 hotcrm 仓库 fork 骨架，保留 verify 链、token ratchet、docs 站、截图 meta.yaml、feature-inventory、requirements log、e2e、changesets、publish-marketplace，删除 `crm_` 对象。

```
objectstack.config.ts      defineStack；requires: automation · triggers · analytics · auth · ui · approvals · sharing（可选 hierarchy-security）
src/objects/               11 个 *.object.ts + *.hook.ts（状态机守卫、盖戳、display_name 镜像）
src/views/  src/pages/     五个分区的视图；合同详情 slotted 页
src/apps/                  1 个 App，五组受众分区
src/flows/                 F1–F15（F15 受组合开关控制）
src/skills/                S1–S6（§07）
src/datasets/ src/dashboards/  4 dataset · 3 dashboard
src/profiles/ src/sharing/ 5 permission set · 7 position · 6 sharing rule · FLS
src/mappings/              存量合同 / 相对方导入映射
src/translations/          en（默认）· zh-CN
src/data/                  demo-en/ · demo-zh/
content/docs/              产品文档（法务 / 财务 / 管理员 / 发布）
docs/requirements/         客户需求分诊记录（A/B/C/D）
docs/backlog/              派发卡片
```

| 里程碑 | 内容 | 验收 |
|---|---|---|
| M1 数据与权限骨架 | 11 对象 · 状态机守卫 · 7 position / 5 set · 共享与 FLS · 配置域种子 | `validate`/`lint`/`typecheck` 绿；业务承办经 REST 看不到他人合同；财务看不到 `in_review` 合同 |
| M2 发起与审批 | F1 · F2 · F5 · F6 · F7 · 法务工作台 · 详情页 · 全量种子 | 走通 发起→受理→偏离→会签→签署与执行形式→生效，审批记录与审计齐全 |
| M3 签后与分析 | F9–F14 · 履约与收付款 · 4 dataset · 3 看板 · zh/en | 演示数据下无空图；到期、逾期提醒在收件箱可见 |
| M4 集成与可发布 | F8 电子签 · F15 CRM 交接 · S1–S6 与审批备忘录 · MCP 工具面 · 导入映射 · 文档 · 截图 · marketplace 发布 | 陌生人 clone 一条命令跑起；marketplace 一键安装；需求书逐条对应 feature-inventory 与测试 |

一次只做一个里程碑；token ratchet 上限：业务语义 ≤ 60k，交互层 ≤ 30k，M1 起就卡。

## 12 平台缺口与降级（开工前逐条复核）

| 缺口 | 编号 | v1 降级 | 解除后 |
|---|---|---|---|
| 在线红线编辑器 | — | 版本文件 + `kind` 标记；对方红线上传 | 编辑器内比对 |
| 模板填充生成文档 | — | `DocumentTemplate.placeholders` 有 schema 无渲染引擎：下载模板 + 变量清单，法务填后上传 | 一键生成 v1 |
| PDF / 打印 | #9 | 浏览器打印 | 台账与执行单模板打印 |
| 电子签引擎 | — | 连接器集成 | 不自建 |
| 入站邮件 | #39 | 手动上传对方版本 | 邮件附件自动成版本 |
| 外部相对方门户 | #27 | 邮件往来 | 相对方在线红线 |
| IM 通知通道 | #1 | inbox / email / sms / Slack | Teams；区域 IM 由区域包承担 |
| CEL 日期算术 | #7 | 到期、逾期由日任务盖戳字段 | 公式字段 |
| 跨对象公式 | #36 | hook 冗余 `category` / `direction` / `execution_formalities` | 直接引用类型 |

规则：平台能力受限**只上报** objectstack，不在本仓库修平台；应用侧只允许带环境闸门的临时夹具并注明平台 issue；新发现追加到 objectstack 的 `docs/PLATFORM_GAPS_FROM_TEMPLATES.md`。

## 13 裁决记录（2026-09-07，维护者：「16 项全部同意默认」）

设计方案 V1.0 第 13 章 16 项与本节 Q1–Q7 于同日一次裁定，全部采用默认口径。逐条记录，此后改动走新的 Q 编号，不改已裁决项。

| # | 事项 | 裁定 | 落实 |
|---|---|---|---|
| Q1 | 财务对生效合同的写权限 | `edit` + FLS 锁法律字段与 `status` | 卡 04；M1 验证 FLS 能锁 `status` |
| Q2 | 部门内可见性 | 不进标准品，靠 `own_and_reports`；team 规则留客户覆盖层 | 卡 04 |
| Q3 | 审批台阶 | 固定五级，矩阵选台阶 | 卡 06 |
| Q4 | 相对方与 `crm_account` | 永远独立 `clm_party`，可选 lookup | 已落地 |
| Q5 | 合同编号 | hook 生成 `<type.code>-<YYYY>-<0000>`，放弃 autonumber | 卡 02，§03 已改 |
| Q6 | 类别与 HotCRM 类型 | 不对齐，F15 映射 | 卡 12 |
| Q7 | 区域包装配 | marketplace 扩展包，依赖 HotCLM；开关只作过渡 | 2.x |
| Q8 | 补录已签合同（方案第 12 项） | 允许：F16 `executed_upload`，直接 `active`，`is_backfilled` 标记并留审计 | 卡 09 追加 F16 |
| 方案 1–16 | 财务写权限、部门可见性、台阶、相对方、编号、类别、对方红线由法务上传、执行形式按类型、DocuSign 首发、IM 通道本期不承诺、出厂 USD 与英文、补录通道、保留期默认 10 年、补充协议走自己的矩阵、AI 四字段进合同、区域包用扩展包 | 全部默认 | 已分别体现在 §01–§12 |
