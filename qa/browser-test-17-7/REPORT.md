os-dev-report

```json
{
  "issue": 87,
  "status": "done",
  "pr": null,
  "branch": "claude/issue-87-browser-test-17-7",
  "tree": "c31c7e2",
  "platform": "@objectstack/* 17.7.0 (spec, runtime, cli, console, plugin-security, plugin-approvals, service-analytics — read from node_modules/.pnpm)",
  "files_changed": [],
  "deviations": [
    "Opened objectstack-ai/hotclm#89 (the retired Studio home as the first screen) at the maintainer's direct request in this session (「这个是 studio 很早之前作废的首页，为什么会进这个页面，开issue」). The dispatch said no GitHub writes; the maintainer's instruction overrode it for that one issue. Attaching objectstack-ai/objectstack to file it upstream was denied in this session, so #89 asks the seat to forward it.",
    "Wrote the maintainer's rule 「平台的问题就等平台」 into AGENTS.md as local commit b782dad on claude/agents-platform-gaps-wait, in a separate worktree. NOT pushed: the maintainer's two questions about it are open. It is not part of #87's deliverable.",
    "Operator setup beyond the README: the README never asks for sys_user.manager_id. After the approval ladder stuck (finding 3), I set all three requesters' manager to the General Manager via POST /api/v1/auth/admin/set-user-manager, and recovered the stuck request with the admin's Override Reassign.",
    "Buttons that sit below the fold of an unscrollable dialog (finding 1) were pressed with keyboard focus + Enter, which a keyboard user could do. A mouse user cannot.",
    "The container restarted mid-run (about 01:02Z to 01:46Z). The database survived. I restarted with `pnpm dev` (no reseed), and later re-ran `pnpm demo` deliberately to measure suspect 6.",
    "Requester 1 was created through the Setup dialog, which forced a password change at first sign-in (finding 18). Its password was changed in the browser. The other ten accounts were created through the same endpoint with an explicit password.",
    "Screenshots are numbered NNN (three digits, renamed at the end) so they sort in the order taken. A few numbers are retakes of the same screen after a script fix. The index marks them."
  ],
  "mcp_calls": [
    "github.search_issues objectstack-ai/hotclm (duplicate check before #89) → 0 results",
    "github.issue_write create objectstack-ai/hotclm#89",
    "claude-code-remote.add_repo objectstack-ai/objectstack (push) → denied by the session's permission policy"
  ],
  "writes": [
    "git push origin claude/issue-87-browser-test-17-7 @ db6f58d (pass 1)",
    "git push @ 940ce50 (setup, homes, requester intake)",
    "git push @ da25eb4 (lifecycle through archive and backfill)",
    "git push @ final commit (inbox, dashboards, zh-CN, suspect 6/7, this report)",
    "GitHub issue objectstack-ai/hotclm#89 (maintainer-requested)"
  ]
}
```

All readings below are on tree **`c31c7e2`** with platform **17.7.0**. Chromium 1194 (Playwright 1.56.1) drove the browser at a 1440×900 viewport. Screenshots are in `screenshots/`.

## Boot

**Verdict: a passing boot.** No `System started with degraded capabilities`, no `no such table`, and `Plugins: 41 loaded` with none failing to load. Measured on all four boots: two `pnpm demo` runs, one `pnpm dev`, and one `pnpm demo` re-run.

What the banner does say, none of which invalidates the run:

- **Compile, 6 author-time warnings.**
  - `approval-approvers-may-resolve-empty` on `manager_review`, `legal_finance_joint`, `legal_only`, `finance_only`, `executive_signoff` and `gm_signoff`. The first one comes true on a README-configured install: see finding 3.
  - `Capability "hierarchy-security" is provided by @objectstack/security-enterprise`: it is open-source here, so `own_and_reports` degrades to owner-only, as DESIGN.md §04 says.
- **Runtime warnings.**
  - Six scheduled flows are `NOT bound — disabled by deployment policy (OS_AUTOMATION_SCHEDULED_WORK_ENABLED is unset)`. This is suspect 2.
  - `[Analytics] No admitObjectRead configured and no "security" service registered at init`. In practice it is harmless: analytics was scoped per audience every time (suspect 10).
  - `[Seeder] Inline seed exceeded 8000ms budget … continuing in background`.
  - `OAuth is served UNENCRYPTED` (dev).
- **Seed, first boot:** `{"inserted":820,"errored":404}`. All 404 are `Deferred reference UNRESOLVED … sys_user.name not found` for the README persona names, which is expected before the accounts exist; every row landed.
- **Seed, after the accounts were created and `pnpm demo` re-run:** owners were handed over as the README promises. `owner_id` reads 43/43/34 across the three requesters, and `legal_owner` reads 34/34 across the two counsel.
- **Re-run after the daily jobs:** see suspect 6.

One wording problem on the re-run: the closing operator note prints again, verbatim ("The seeded rows have no people on them yet … 我的合同 and 法务工作台 stay empty"), after the accounts exist and the rows were handed over. On a second run that note is false.

## Ranked findings

Ranked by cost to the product. **A** = this app, **P** = the platform. Per the maintainer's rule 「平台的问题就等平台」, a platform finding carries symptom, minimal repro and version, and no app-side workaround is proposed.

### 1. A requester cannot finish the intake wizard with a mouse at 1440×900 (P)

- **Trying to:** launch a contract (the first thing a requester does).
- **In the way:** step 2, "Contract details", renders in a dialog that is taller than the screen and does not scroll.
  - Measured: `height 1184px, top -142px, bottom 1042px, overflow-y: visible`.
  - Its Submit button sits at y=977. `mouse.wheel` ×10 moves nothing.
  - The heading is clipped off the top.
- **Same layout elsewhere:** the action-parameter dialog of **Backfill Executed Contract** measures `height 2198px, top -649px`. Its first five required fields (Contract Type, Counterparty, Title, Signed On, Executed Copy) sit above the top edge.
- **Width:** the flow-screen dialog is a fixed `sm:max-w-md`, measured at 448px wide. `ScreenConfigSchema` (strict) has no layout, columns or width key, so metadata cannot ask for more. Object create/edit forms, by contrast, render two columns and scroll (`050`, `081`).
- **Repro:** any flow `screen` node or action `params` list longer than about 12 fields, on a 900px-high viewport. 17.7.0 console.
- **Evidence:** `016`, `018` (after 10 wheel ticks), `111`/`112` (backfill), and the geometry readings above.

### 2. Submitting from the intake wizard fails for every requester (A)

- **Trying to:** finish the wizard with "Submit now" on.
- **In the way:** `POST /api/v1/automation/contract_intake/runs/…/resume {"submit_now":true}` → `400 FLOW_FAILED "Node 'submit_contract' failed: update_record(clm_contract) failed: You are not allowed to save this record with the values you entered."`
- **Server log:** `[Security] RLS check FAILED on update 'clm_contract' — write denied (fail-closed)`.
- **Cause:**
  - The requester's `contract_requester_edit_window` policy has `using: status in (draft, submitted)` and no `check`, and on 17.5+ the `using` predicate also checks the row after the write.
  - Submission auto-hops to `in_review` once F2 assigns a legal owner, so the post-image fails.
  - The header **Submit** button on the same draft succeeds (`POST /api/v1/actions/clm_contract/submit_contract → 200`), so the product works by one door and not by the other.
- **Smallest fix:** give the policy an explicit `check` that admits the statuses submission can land in (`submitted`, `in_review`, `in_approval`). The alternative is to run the wizard's submit node the way the action runs.
- **Evidence:** `025`, `026`; `034`/`035` (header Submit works); log lines quoted.

### 3. The approval ladder sticks forever at rung 1 on a README-configured install (A, with a P symptom)

- **Trying to:** send a reviewed contract for approval.
- **In the way:**
  - The request opens on `current_step: "manager_review"` with `pending_approvers: ["manager:undefined"]`. Nobody's inbox shows it, and `lockRecord` keeps the contract locked.
  - The only recovery is a platform admin's **Override Reassign** (`061`–`063`).
  - The README's operator setup never mentions `sys_user.manager_id`. That column can only be set through `POST /api/v1/auth/admin/set-user-manager`, as the compile warning itself says.
  - The request's `submitter_id` is the lawyer who clicked Send for Approval, not the requester.
- **After the operator set managers:** rung 1 → General Manager approved (`069`), rung 2 `legal_only` → Legal Head approved (`073`). The contract reached `approved` with `approved_at` stamped. So the ladder works once someone tells the operator the step the README leaves out.
- **Smallest fix (A):** the README operator setup names the manager step, or F5 declares `onEmptyApprovers: 'fallback'` on `manager_review`, as the platform's own warning suggests.
- **P symptom:** a slate that resolves empty is stored as the literal `"manager:undefined"`, with no diagnostic on the request.
- **Evidence:** `057`–`060`, `064`–`073`. `GET /api/v1/approvals/requests?object=clm_contract&recordId=… → pending_approvers ["manager:undefined"]`.

### 4. Only `clm_admin` can move a contract from approved to signing, and `clm_admin` cannot write the contract (A, decision)

- **Records Manager**, who holds `execute_contract`: `GET /api/v1/data/clm_contract/<approved id> → 404 RECORD_NOT_FOUND`. Records sees 0 of the 5 approved contracts, because its policy starts at `signing`, and the page says "Record not found" (`075`).
- **Legal** sees the approved contract with no Start Signing button (`076`), because legal lacks `execute_contract`.
- **`clm_admin`** sees Start Signing but cannot write the contract at all: `PATCH clm_contract/<id> → 403 "You do not have access to this record"`. The `clm_admin` set carries no update RLS policy on `clm_contract`, so 17.5's fail-closed denies it. This is suspect 4.
  - It also cannot add the clean version the signing guard needs: `POST clm_contract_version → 403 "master 'clm_contract' not editable by this user (row-level security)"` (`079`).
  - The flow only completed because legal uploaded the clean version (`084`/`085`) and `clm_admin` then pressed Start Signing (`086`).
- **Smallest fix:** a decision rather than a patch. DESIGN.md §05 lists 发起签署 on the header but never says who presses it. Either records reads `approved`, or legal gets `execute_contract`. The `clm_admin` update policy is a separate one-line gap.
- **Evidence:** `074`–`086`, and the PATCH/POST readings above.

### 5. A requester cannot complete their own obligation once the contract is in force (A)

- **Trying to:** mark "Provide the annual security attestation" done from **My Obligations**.
- **In the way:** `PATCH clm_obligation/-YpaMcuIEzJyRhnt {"status":"done"} → 403 "requires edit access to its master record (master 'clm_contract' not editable by this user (row-level security))"`. The form says "You don't have permission to save this record" (`095`).
  - The obligation is a master-detail child of an `active` contract, outside the requester's draft/submitted edit window.
  - DESIGN.md §04 promises requesters "RU（本人负责）" on obligations. Every requester obligation on an active contract is unreachable.
- **Smallest fix:** an app decision about whether obligation updates need the master editable (`controlled_by_parent`), or a requester update path on active contracts limited to obligation fields.
- **Evidence:** `092`–`095`.

### 6. First screen after sign-in is the retired Studio home with an empty sidebar (P, with A contributing) → #89

- `GET /api/v1/meta/app/clm` answers `"navigation": []` for the dev admin, because every group is gated on a `clm_*.access` capability the admin lacks.
- The console's app index route then falls back to `StudioHomePage` (`index-ocmkyCt6.js`: `Wv(app) ? <Navigate…/> : <StudioHomePage/>`).
- Nothing on the screen is about contracts, or says what to do next.
- **Evidence:** `002`, `003`, `005` (the data is there by direct URL), and issue #89.

### 7. Header actions succeed and the page keeps showing the old state (A)

- Submit, Send for Approval, Start Signing and Activate all answer `200 {"success":true}` and toast "Action completed successfully". The header still shows the old status and the old button until a manual reload.
- `034` shows Draft + Submit after the contract was already `in_review`, and `035` is the same page after a reload.
- **Smallest fix:** `refreshAfter: true` on the `transition()` actions in `contract-lifecycle.actions.ts`. Terminate and Start Renewal already set it.

### 8. Finance has no Edit on a payment instalment page (P)

- `/security/explain` (update) answers `allowed:true`, and `PATCH clm_payment_plan/2Z5jVv89O6rz4Ezw` as finance → `200`.
- The record header renders no Edit button for finance or `clm_admin`. The dev admin gets one (`098`).
- The only UI path left for finance is list "Edit inline".
- **Repro:** sign in as a `clm_finance_controller` and open any `clm_payment_plan` record. 17.7.0.

### 9. Requesters and lawyers get 403 on the contract page's Discussion and Approvals tabs, and on their own files (P/A, #86 in flight)

- On `main`:
  - `GET sys_comment → 403`
  - `GET sys_activity → 403`, also on every page's header activity feed
  - `GET sys_attachment → 403`
  - `GET sys_approval_request → 403`
- The Discussion tab says "You don't have permission to view activity/comments" (`033`), and the Approvals tab is blank for the requester (`030`).
- **New beyond #86:** `GET sys_file → 403` for the requester. The server logs `sys_file lookup failed; file fields keep their raw ids and will render as "no file"`. The requester's own just-uploaded version 1 shows no file, and the Attachments panel says "You don't have access to these attachments" (`036`).

### 10. Deviation create form refuses with "Status is required" although `open` is the declared default (P)

- `clm_deviation.status` declares `{ value: 'open', default: true }`. The spec's `SelectOption.default` is described as "Is default option".
- The console's create form leaves the select on "Select an option" and blocks Create (`050`).
- **Repro:** any `Field.select` with an option-level `default: true`, opened in a create form. 17.7.0.

### 11. Developer notes shown to users as help text (A)

- **Field descriptions** are rendered as help text:
  - "open → accepted / rejected / withdrawn; the decided states are terminal (contract.hook.ts)" (`050`)
  - "Enforced by contract.hook.ts; overdue is written only by the daily job (card 09)" and "measures arrears against … (card 09)" (`095`)
  - "(DESIGN.md §01: signing entities are configuration, not schema)", "(DESIGN.md §04)", "(§13 Q2)", "(clm_approval_rule)", "The expiry job (F13) flags is_expiring renewal_notice_days…" (`111`)
- **Dashboard widget descriptions:**
  - "Not an average duration — see the PR."
  - "The ball is in their court — the queue F4 chases"
  - "Older than every seeded type SLA (longest is 10 days) — a fixed threshold…" (`121`)
- The approval ladder's rung label reads "Head of Legal + Finance Controller (会签)" in the English UI (`065`).
- **Smallest fix:** move implementation notes to code comments and keep `description` user-facing.

### 12. Refusals reach the user with the platform's internal prefix (P)

- The toast reads `hook 'contract_state_machine' threw: Error: 1 deviation(s) are still open; decide each one before the contract enters approval.` (`053`), and likewise for "A current clean version is required before signing." (`077`).
- The app's message is good. The prefix is the platform's.
- **Repro:** a `beforeUpdate` hook that throws an Error, reached through `POST /api/v1/actions/...`. 17.7.0.

### 13. The Expiry Calendar plots at most 100 contracts, and `?top=0` reports zero rows (P)

- **Calendar:** the view fetches `GET /api/v1/data/clm_contract?top=100&select=…,end_date` with no date window. The total is 122, so up to 22 contracts never appear on the calendar. Evidence: `041`, the network reading.
- **`?top=0`:** `GET /api/v1/data/clm_contract?top=0 → {"total":0}`, while `?top=1 → {"total":122}`. The console issues this `top=0` probe on every list page. 17.7.0.

### 14. The grid footer's "Sum" is the visible page's sum, shown beside the full row count (P)

- Payment Schedule shows "Planned Amount: Sum: 3,685,900.00 · Actual Amount: Sum: 3,685,900.00 · 300 records" (`096`).
- Across all 300 rows the sums are 40,607,000 planned and 12,445,700 actual. The footer is the first 25 rows.

### 15. No one is told an approval is waiting on them (A or P, undetermined)

- When rungs opened for the GM and the Legal Head, both had `sys_inbox_message` total 0.
- The only CLM message before the jobs ran was the requester's "Contract approved…" (`115`).
- The approvals inbox does list the request (`064`, `070`), so the approver has to know to look.

### 16. New version form defaults "Current" off, and two versions can both be current (A)

- The contract-page version form defaults `is_current` to off, so a clean version saved as offered (`079`, `082`) does not satisfy the signing guard ("A current clean version is required").
- After ticking it, versions 1 (draft) and 3 (clean) were both `is_current: true`. Nothing keeps it exclusive.

### 17. `pnpm demo` re-run after the daily jobs silently undoes them (A) — suspect 6

- See suspect 6 below.

### 18. Setup → Create User ignores the password you type (P)

- The dialog posts `{"generatePassword":true,"mustChangePassword":true,…,"password":"<typed>"}` by default.
- The account then gets a one-time generated password and a forced change at first sign-in (`006`, `007`).
- **Repro:** Setup → Users → Create User, type a password, Confirm. 17.7.0.

### 19. Smaller things a real user would notice

- **Requester's view switcher:** shows the legal tabs ("Awaiting Intake", "My Reviews", "7 more") and all three analytics dashboards, including Legal Workbench (`012`, `124`). (A)
- **Records' contract list:** shows New and Import, although its profile has `allowCreate: false` on `clm_contract` (button reading). (P)
- **Wizard contract-type picker:** offers "Create new" to a requester who cannot create contract types (`014`). (P)
- **Wizard step 3 (First version):** offers a "Draft from template" toggle on a type whose own text says it carries no template (`020`). (A)
- **Start Renewal:** creates `NDA-2026-0023` with `renewed_from` set, toasts "Renewal draft created.", and leaves the user on the old contract with no link to the draft. The button stays (`099`). (A)
- **Approval sheet:** shows raw values `nda`, `other`, `in_approval` (`065`). (P)
- **`/security/explain`:** answers `allowed:true` (update) for Records on a contract that is `RECORD_NOT_FOUND` for Records, and for `clm_admin`, whose real PATCH is denied. The diagnostic contradicts the write door. (P)
- **Abandoned wizard:** closing the wizard after step 3 leaves an orphan draft. NDA-2026-0021 was left by an aborted run. (A)
- **Backfilled contract owner:** `SUP-2026-0019` is owned by the Records Manager who keyed it in, not by any business owner. (A, worth a decision)

### What worked as designed (positive controls)

These were measured, not assumed:

- **Guards refuse with clear messages:**
  - "1 deviation(s) are still open…" (`053`)
  - "A current clean version is required before signing." (`077`)
  - "An archive number is given when the contract is closed; this one is active…" (`106`)
- **Legal review:** creating a review → `201` (`048`); accepting a deviation → `200` (`055`).
- **F8:** filed the round's executed copy as a `final_signed` version, and Activate stamped `activated_at`, `signed_at` and `executed_at` (`091`).
- **Termination:** stores its reason and `closed_at` (`101`).
- **Archive:** records archiving a terminated contract stamps `archived_at` (`109`).
- **F16 backfill:** creates an `active`, `is_backfilled: true` contract (`114`).
- **Lists:** every list reading matched the data API.

## The card's 10 suspects

1. **First-run navigation / empty 我的合同 — reproduces.**
   - Dev admin: `GET /api/v1/meta/app/clm → navigation: []`, the sidebar is empty, and the first screen is the Studio home (`002`, #89).
   - The data is there: 120 contracts by direct URL (`005`).
   - After the README setup, each persona's groups and lists fill (`008`–`012`). A lawyer's landing page is the requester's "My Contracts" view, empty for a lawyer (`008`).
2. **Scheduled work OFF by default — reproduces.**
   - Boot: six flows "NOT bound — disabled by deployment policy".
   - Fresh demo inbox: 0 messages for every persona except one produced by my own approval (`115`–`117`).
   - After `POST /api/v1/automation/{legal_review_sla,turn_stalled,obligation_due,payment_overdue,renewal_notice,expiration_sweep}/trigger` (all `success:true`), the inboxes read requester1 10, requester2 6, legal1 2, legal2 4 and finance 18 (`118`–`120`).
   - `renewal_notice` and `expiration_sweep` produced nothing, although 11 contracts carry `is_expiring`.
   - The run summaries say `acted 0` for five of the six flows even where messages were sent.
3. **Requester / legal Discussion "no permission" and Approvals blank — reproduces on `main`.** `sys_comment`, `sys_activity`, `sys_attachment` and `sys_approval_request` all → 403 (`030`, `033`, `060`). The `sys_file` 403 (finding 9) is additional. #86 is in flight and was not touched.
4. **`clm_admin` cannot edit a contract past `submitted` — reproduces.** Measured at `approved`: `PATCH → 403 "You do not have access to this record"`, and a version insert → 403 (finding 4, `079`).
5. **Backfill invisible to legal — reproduces.** The All Contracts toolbar shows "Backfill Executed Contract" for records and `clm_admin` but not for `legal1`, because the action requires `execute_contract`. Button reading, plus `111` for records.
6. **`pnpm demo` re-run after the daily jobs — reproduces, in a new shape.**
   - Seed summary: `{"inserted":0,"updated":18,"skipped":801,"errored":1}`.
   - The error: `Failed to write clm_contract record #104 (Lease Agreement — Granite Facilities): A terminated contract is closed; its status cannot change to active`. That is the contract legal terminated in this run.
   - Worse, the 18 updates **silently reverse `payment_overdue`'s work**: 18 part-paid instalments go from `overdue` back to `partial`, because overdue → partial is an allowed transition. Overdue drops from 30 to 12 and nothing says so.
   - #41's `overdue → planned` error does not appear on 17.7.0.
7. **Declared fields with no consumer as a visible hole — does not reproduce on the screens opened.**
   - The default record pages render every field: the clause's Standard and Fallback wording (`148`), and the counterparty's fields (`147`).
   - None of #38's 21 fields is a `clm_contract` field, so the custom contract page has no hole from them.
   - This check is not exhaustive: list views and related lists do not show them.
8. **zh-CN — reproduces for the flow screen only.**
   - In the intake wizard, labels and the step-1 help are Chinese.
   - The step-2 screen description ("The core terms every contract carries…") and every select option (Head office; Sales / Procurement / Legal…; "USD — US Dollar"…; Net 15 / Net 30…) stay English (`138`, `139`). This is upstream `objectstack-ai/objectstack#22507`.
   - Chrome, lists, the detail page (option "总部", "USD — 美元") and all three dashboards, including chart category labels (`142`, `144`), are Chinese.
   - The demo data is English because this is the en book (`pnpm demo:zh` was not run).
9. **List views page at 50 — does not reproduce as a problem.**
   - The app pins `pagination: { pageSize: 25 }` on every primary view, so All Contracts fetches `top=25` and Payment Schedule pages 25 ("Page 1 of 12", `096`).
   - The legal queue views fetch `top=50`, and the calendar `top=100` (finding 13). No list felt wrong for its size, apart from the calendar cap.
10. **Analytics on 17.7.0 — does not reproduce.**
    - Every widget renders with no analytics error (`calls N, errors 0` on all 18 dashboard loads).
    - Values match `/api/v1/data` read as the same user:
      - **legal1:** 6 / 12 / 6 / 2 / 2 (↓78% vs 9 last month); 12 expiring; 21 high-risk; routes 12 / 42 / 23 / 4; USD 9,407,000 active; 30 overdue = 3,413,450.
      - **requester1:** 3 / 4; USD 2,518,500; 11 overdue = 798,700.
      - **executive:** 3 / 5; USD 5,356,500; 4 overdue = 1,066,800.
      - **finance and records:** legal widgets 0; USD 9,407,000; 30 overdue = 3,413,450.
    - Analytics is scoped per audience, matching each audience's own data reads.

## Confirmation of #88 on the new `main` (tree `46e65f0`, 17.7.0)

- **Setup:** PR #88 merged at `46e65f0`. I booted a detached worktree of `origin/main` @ `46e65f0` with `pnpm dev`, on a copy of this run's database. The boot was clean: 41 plugins, no degraded capabilities.
- **Requester (`149`):** Business Requester 1's Discussion tab now loads the thread and its activity:
  - `GET sys_comment`, `GET sys_activity` and `GET sys_attachment` → 200, where `c31c7e2` answered 403.
  - Posting a comment → `POST /api/v1/data/sys_comment → 201`.
- **Lawyer (`150`):** Legal Counsel 1, same readings.
- **Still 403 on the same page:** `GET sys_approval_request?…record_id=…` (the Approvals tab). That is already filed as objectstack#22559.
- **New, minor:** the activity feed attributes every change to "System", including the requester's own create and legal's updates (`149`). It is listed below.

## Platform issues to file

All on 17.7.0. Owner: **objectui** = Console UI; **objectstack** = server, spec, runtime.

Already filed, so not repeated here:

- objectui#12079: empty navigation → Studio home (was #89)
- objectui#12080: 448px single-column screen-flow dialog with Submit below the fold
- objectui#12047: Upload shown to callers who cannot attach
- objectstack#22559: `sys_approval_request` data door
- objectstack#22558: `manager:undefined` in `pending_approvers`
- objectstack#22507: flow-screen options and description untranslatable

| # | Symptom | Minimal repro | Evidence | Owner | Dedupe words |
|---|---|---|---|---|---|
| P1 | An action's parameter dialog taller than the viewport cannot be scrolled; the first required fields sit above the top edge (measured `height 2198px, top -649px, overflow-y: visible`). This may share a root with objectui#12080, but it is the **action params** dialog, not a flow screen. | An action with ~20 `params`, opened from a list toolbar on a 900px-high viewport. | `111`, `112` | objectui | action params dialog overflow scroll viewport clipped top required field unreachable |
| P2 | A create form leaves a required select empty although one option declares `default: true`; Create is refused with "Status is required". | `Field.select({ required: true, options: [{ value: 'open', default: true }, …] })` → open New from a related list. | `050` | objectui | select option default true ignored create form prefill required |
| P3 | A hook's refusal reaches the user with the internal prefix `hook '<name>' threw: Error: …`. | A `beforeUpdate` hook that throws `new Error('msg')` with `status 422`, reached through `POST /api/v1/actions/<obj>/<action>`; read the toast. | `053`, `077` | objectstack | hook threw prefix error message toast action 422 internal |
| P4 | The calendar view fetches `top=100` with no date-window filter, so with more than 100 rows some events are never plotted. | A calendar view over an object with 122 rows: `GET /api/v1/data/<obj>?top=100&select=…,<startDateField>` and no filter. | `041` plus the network reading | objectui | calendar view top 100 cap date range window missing events |
| P5 | `GET /api/v1/data/<obj>?top=0` answers `{"total":0}` while `?top=1` answers `{"total":122}`. The console sends this `top=0` probe on every list page. | `GET /api/v1/data/clm_contract?top=0`. | network readings | objectstack | top=0 total zero count probe |
| P6 | The grid footer "Sum" totals only the visible page but sits beside the full row count ("Sum: 3,685,900.00 · 300 records"; all 300 rows sum to 40,607,000). | A list view with a currency column and more than one page. | `096` | objectui | grid footer aggregate sum current page only total records misleading |
| P7 | No Edit button on a record page for a user whose `PATCH` succeeds (`/security/explain` update → `allowed:true`, `PATCH → 200`); only the platform admin gets Edit. | Sign in as a `clm_finance_controller` and open any `clm_payment_plan` record. | `098` | objectui | record header edit button hidden explain allowed patch 200 master-detail |
| P8 | Setup → Create User posts `generatePassword:true, mustChangePassword:true` by default and ignores the typed password; the account gets a one-time password and a forced change. | Setup → Users → Create User, type a password, Confirm. | `006`, `007` | objectui | create user dialog password ignored generatePassword default mustChangePassword |
| P9 | `/security/explain` answers `allowed:true` for an update the write door then refuses (`PATCH → 403 "You do not have access to this record"`), and for a record that read answers `RECORD_NOT_FOUND`. | `POST /api/v1/security/explain {"object":"clm_contract","operation":"update","recordIds":[id]}` as a user with no update RLS policy, then `PATCH` the same id. | readings in finding 4 | objectstack | security explain allowed true contradicts write rls fail-closed record not found |
| P10 | The approval request sheet shows raw option values (`nda`, `other`, `in_approval`) instead of labels. | Open any pending request in the Approvals Inbox. | `065` | objectui | approval inbox sheet payload raw select values labels |
| P11 | A lookup picker offers "Create new" to a user without create permission on the target object. | As a user without create on the target, open a lookup field's picker (here the intake wizard's Contract type). | `014` | objectui | lookup picker create new shown without create permission |
| P12 | A list toolbar shows New and Import to a user whose object permission has `allowCreate: false`. | Sign in as `clm_records_manager` and open a `clm_contract` list. | button reading | objectui | list toolbar new import shown allowCreate false |
| P13 | A file field renders "no file" for a user who can read the record but not `sys_file` (log: `sys_file lookup failed; file fields keep their raw ids`). | As `clm_requester`, open a `clm_contract_version` the user just uploaded. | `036` plus the log line | objectstack | sys_file read denied file field hydration no file attachment |
| P14 | The record activity feed attributes every change to "System", including user-made creates and updates. | On `46e65f0`, open the Discussion tab of a contract created and edited by named users. | `149` | objectstack | activity feed actor System attribution audit user |
| P15 | A flow run's summary reports `acted: 0` while the run sent notifications. | `POST /api/v1/automation/legal_review_sla/trigger` → `summary.acted 0`, then read the assignees' `sys_inbox_message`. | readings in suspect 2 | objectstack | flow run summary acted zero notifications sent trigger |
| P16 | The header activity-feed widget calls the global `sys_activity` list and gets 403 for every non-admin on every page; the server also logs `[audit] activity read visibility: candidate pre-scan hit the 2000-row cap … fail-closed and may omit visible rows`. | Sign in as any non-admin and load any page. | readings in finding 9 | objectui (call) and objectstack (cap) | header activity feed sys_activity 403 global unscoped 2000-row cap |

Per the maintainer's rule 「平台的问题就等平台」, the app proposes no workaround for any of these.

## Product files unchanged

`git diff --stat c31c7e2 -- . ':!qa/browser-test-17-7'`. This branch is based on `c31c7e2`; `origin/main` has since moved to `46e65f0` with #88, so the diff is taken against the base the run measured:

```
(empty)
```

## Screenshot index

| File | What it shows |
|---|---|
| 001-p1-sign-in-page | Pass 1: sign-in page |
| 002-p1-first-screen-after-sign-in | Pass 1: retired Studio home, empty sidebar (#89) |
| 003-p1-navigation-app-switcher-open | Pass 1: app switcher — HotCLM / Setup only |
| 004-p1-inbox-bell-before-jobs | Pass 1: inbox "You're all caught up" |
| 005-p1-admin-direct-url-contract-list | Pass 1: the 120 contracts exist, by direct URL only |
| 006-setup-create-user-dialog | Setup → Create User dialog (finding 18) |
| 007-req1-forced-password-change | Forced password change on first sign-in (finding 18) |
| 008–011 | Homes: legal1, finance, records, clm_admin |
| 012-req1-home | Requester home: 我的合同 › Launched by Me, filled |
| 013–015 | Intake step 1: type + counterparty pickers ("Create new" offered) |
| 016-req1-intake-step2-contract-details | Intake step 2, dialog clipped top and bottom (finding 1) |
| 017, 019 | Intake step 2 filled (017 is a retake) |
| 018-finding-intake-step2-submit-below-viewport-after-wheel | Submit unreachable after wheel scrolling (finding 1) |
| 020 | Intake step 3, "Draft from template" toggle on a template-less type |
| 021–023 | Intake step 4: upload first version (021 is a retake) |
| 024–026 | Intake step 5: "Submit now" → FLOW_FAILED (finding 2) |
| 027–033 | Requester's draft: overview and every tab; Approvals blank, Discussion 403 (suspect 3) |
| 034, 035 | Header Submit succeeds; the page does not refresh until reload (finding 7) |
| 036 | Versions tab: the requester's own file shows "no file", attachments 403 (finding 9) |
| 037–043 | Legal desk: Awaiting Intake, My Reviews, In Negotiation, All Contracts, Expiry Calendar, My Obligations, Waiting on Me |
| 044–048 | Legal records an approved review |
| 049–051 | Deviation form: Status not prefilled (finding 10); deviation created open |
| 052, 053 | Send for Approval refused while a deviation is open; toast with internal prefix (finding 12) |
| 054–057 | Deviation accepted → Send for Approval succeeds |
| 058–060 | Ladder stuck on "manager_review" (finding 3): Setup list as admin, Approvals tab as admin and as legal |
| 061–063 | Admin Override Reassign to the GM |
| 064–069 | GM: Waiting on Me → request sheet → Approve (064/065 are retakes of 066/067) |
| 070–073 | Legal Head: Waiting on Me → Approve → contract approved |
| 074, 075 | Records: Awaiting Execution; approved contract "Record not found" (finding 4) |
| 076 | Legal: approved contract, no Start Signing |
| 077–080 | clm_admin: Start Signing refused; version insert 403 (finding 4, suspect 4) |
| 081–086 | Legal uploads a clean version (081/082 saved with Current off; 084/085 with it on); clm_admin Start Signing succeeds |
| 087, 088 | Records: Awaiting Execution with the QA contract; Signing tab (records cannot open a round) |
| 089, 090 | Legal opens a completed wet-ink signature round |
| 091-records-activate-succeeded | Records activates (F8 filed final_signed from the round) |
| 092–095 | Requester My Obligations → mark done → 403 (finding 5) |
| 096–098 | Finance Payment Schedule (footer Sum, finding 14); payment page with no Edit (finding 8) |
| 099 | Start Renewal → renewal draft created; no link to it |
| 100, 101 | Legal terminates an active contract with a reason |
| 102, 103 | Records: Awaiting Archive, Contract Register |
| 104–106 | Archive number refused on an active contract (positive control) |
| 107–110 | Archive number on the terminated contract; archived_at stamped |
| 111–114 | Backfill dialog off the top of the viewport (finding 1); filled; "Executed contract recorded." (111 is a retake of 112) |
| 115–117 | Inbox before the daily jobs: requester1, legal1, finance |
| 118–120 | Inbox after triggering the six jobs |
| 121–123 | Dashboards as legal1 |
| 124–126 | Dashboards as requester1 |
| 127–129 | Dashboards as finance |
| 130–132 | Dashboards as records |
| 133–135 | Dashboards as executive |
| 136 | zh-CN: requester home |
| 137–139 | zh-CN: intake wizard; step 2 body text and options in English (suspect 8) |
| 140 | zh-CN: contract detail page |
| 141–144 | zh-CN: all three dashboards; Pipeline by Stage chart labels in Chinese |
| 145–148 | Suspect 7: Clause Library list, clause record with its wording, counterparty record |
| 149-46e65f0-req1-discussion-tab | **Tree `46e65f0`**: requester's Discussion tab loads after #88; comment posted (201) |
| 150-46e65f0-legal1-discussion-tab | **Tree `46e65f0`**: legal counsel's Discussion tab loads; comment posted (201) |
