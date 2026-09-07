# HotCLM Roadmap

> Direction, not a commitment. Each release lists what it ships, what it unlocks for a buyer, and what it depends on. Items move between releases by a dated entry in the log at the bottom; the design documents change first, this file second.

## Releases

| Release | Theme | Ships | Buyer can now | Depends on |
|---|---|---|---|---|
| **0.1** | Skeleton | 11 objects, state machine guards, positions and permission sets, sharing and FLS, configuration seeds (M1) | Load a contract register with correct visibility | — |
| **0.2** | Launch to approval | Intake screen flow, routing, five-rung approval ladder with 会签, signature record and execution formalities, legal workbench, contract page, full demo data (M2) | Run intake → review → deviation → approval → execution → active end to end | 0.1 |
| **0.3** | After signature | Obligations, payment schedules, renewal and expiry sweeps, archive, four datasets, three dashboards, `en` + `zh-CN` (M3) | Manage the live book: what is due, what is late, what renews | 0.2 |
| **1.0** | Marketplace GA | E-signature (DocuSign first), HotCRM hand-off, AI participation (six skills, approver memo, MCP tool surface), legacy import, docs site, screenshots, marketplace listing (M4) | Install with one click and sell it as a standalone CLM | 0.3 · cloud AI tier for AI features |
| **1.x** | Widen the core | Adobe Acrobat Sign and Dropbox Sign connectors; sanctions and registry screening connectors; Slack notifications; Salesforce contract hand-off; self-serve report views | Fit more stacks without custom work | Platform connectors as they land |
| **2.0** | Document layer | Template-driven generation, redline comparison, print and PDF, inbound email to version | Draft and negotiate inside the product, not in Word attachments | Platform: document generation and editor, PDF (#9), inbound channels (#39) |
| **2.x** | Outside the wall | Counterparty portal, external auditor read-only access, first region pack (China: regional e-sign providers, local registry screening, seal circulation) | Let the other side and outside reviewers in; sell in a region with its own formalities | Platform: external portal (#27); extension-package install (ADR-0126) |

## How items move

1. A capability enters the roadmap only with a named buyer outcome and a named dependency.
2. Anything whose dependency is a **platform gap** stays in 2.0/2.x until the gap closes upstream; the gap is reported once to objectstack-ai/objectstack and referenced here, never patched in this repo.
3. A customer ask (`docs/requirements/`) with disposition **B** may pull an item forward; disposition **C** never touches the roadmap.
4. AI capabilities ship only when they run for real on the cloud tier and degrade honestly elsewhere; no roadmap item is "AI-ready" or "scaffolded".

## Log

- 2026-09-07 — Created. Global-first revision folded in: execution formalities replace the sealing module, DocuSign leads e-signature, region packs move to 2.x.
