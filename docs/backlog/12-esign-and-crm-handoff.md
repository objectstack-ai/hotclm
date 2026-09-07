# F8 e-signature connector · F15 HotCRM hand-off behind `CLM_COMPOSITION`

Milestone: M4 · Labels: `pm:queue` · Blocked-by: 06, 09

## Scope
`src/flows/esign-dispatch.flow.ts`, `esign-callback.flow.ts`, a declarative REST connector per provider
(`src/connectors/`), `sys_setting` keys for provider + credentials; `src/flows/crm-handoff.flow.ts` and a
`resolveComposition()` knob (`CLM_COMPOSITION=standalone|with-hotcrm`, default `standalone`) mirroring
HotCRM's `HOTCRM_COMPOSITION` — filtered by identity, with a test asserting the filter removed exactly
one flow.

## Spec — DESIGN.md §06 F8/F15, §08
F8 dispatch: durable `http` node (`durable: true`) posting the current `clean` version and the signers
to the configured provider; callback is an `api`-triggered flow that maps envelope status to
`esign_status`, creates the `final_signed` version and stamps `signed_at` on completion. No e-signature
engine is built here — the platform has none (spec 17). Providers: Docusign first; 契约锁 / 法大大 /
e签宝 as further connector definitions with the same contract.
F15: `record_change` on `crm_contract` entering `in_approval` creates `clm_contract` (direction `sales`,
party find-or-create from `crm_account`, amount/dates pre-filled, `crm_contract` back-link).

## Acceptance
- Gates green in both compositions; `test/composition.test.ts` pins the flow filter.
- Against a provider sandbox, a contract goes `signing → active` with the signed PDF attached.

## Out of scope
Counterparty portal (platform gap #27).
