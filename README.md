# AuditCover Market

AuditCover lets a DAO fund a research brief and pay for the least-cost bundle of independently published audit findings that GenLayer validators establish answers the brief's questions.

The contract performs a bounded coverage auction, not an assessment of current protocol safety. Curators bid on finding locators, validators independently retrieve publisher reports and evaluate relevance, and deterministic code enumerates every candidate bundle before reserving payment credits.

## Scope

| Implemented | Not established by this release |
|---|---|
| Up to four immutable questions and six sealed bids | Current safety of Compound or any deployed protocol |
| Independent publisher article/subject/finding binding | A vulnerability still exists, or a published fix is deployed |
| Exact normalized-article SHA-256 verification | Complete repository/release integrity or continuous monitoring |
| Independent semantic coverage verification | Curator authored the original audit |
| Exact attached-value funding and credit reservation | Live GEN custody/settlement, until exact-deployment tests run |
| Pending transfers and independently verified parent/child receipts | Automatic retry or fund recovery after an asynchronously failed native message |
| Wallet-connected coverage board and transaction reconciliation | Production browser-wallet E2E, until a deployment is supplied |

No operator role is assigned to the deployer. Any external wallet may create a round; only its authenticated sponsor can fund it. The sponsor cannot bid in that round. The main wallet is reserved for deployment; lifecycle tests use auxiliary wallets.

## Evidence and judgment

Source IDs map to compiled OpenZeppelin publisher URLs and report subjects. The primary source also binds the full audited commit stated in the report. Sponsors seal the normalized article digest before bids. Curators supply only a source ID, finding ID and price. A later source change, missing section or fetch failure cannot produce coverage.

Validators independently fetch the report, recompute the article digest, locate each finding and derive substantive question coverage. Each accepted mapping must have a literal supporting quote. Coverage identities must agree; different grounded quote wording does not change clearing. AI cannot select arbitrary payout amounts. The complete search is at most 64 subsets, with deterministic ties by total cost, number of bids and bid ID tuple.

The secondary report is a cross-object acquisition control. Its current article has no headings supported by the v1 finding extractor and it is not offered as a positive bid source in the UI. These limits are exposed, rather than silently treating unparsed text as coverage.

See [source manifest](docs/TEST_RESOURCE_MANIFEST.md), [architecture](docs/ARCHITECTURE.md), [threat model](docs/THREAT_MODEL.md) and [originality comparison](docs/ORIGINALITY.md).

## Lifecycle

```text
create_round (immutable terms, no deposit)
  → fund_round (exact GEN)
  → commit_bid (before commit_end)
  → reveal_bid (commit_end <= timestamp < reveal_end)
  → clear_round (reveal_end <= timestamp < expires)
       ├─ CLEARED → reserved curator credits + sponsor change
       ├─ NO_COVER → no credits until expiry
       └─ UNRESOLVED → no credits until expiry
  → request_payout → TRANSFER_PENDING
  → confirm_payout → PAID / REFUNDED

funded, uncleared round after expires
  → recover_round → sponsor refund credit
```

Only one substantive assessment is recorded per round. No reroll follows an accepted unresolved verdict. Clearing and expiry recovery cannot both allocate the same funds. A cleared winner's credit cannot be reclaimed by the sponsor.

Amounts satisfy `held + pending + paid + refunded == deposited budget`. A pending emitted transfer is not described as payment received. `confirm_payout` independently checks the StudioNet canonical RPC, finalized parent method/round/signer, exact child linkage, contract sender, recipient, amount, transfer type and `value_credited`. A used child receipt cannot confirm another payment. The application verifies recipient/contract balances in its live evidence runner as a separate check.

## Local verification

```powershell
npm ci --ignore-scripts
python -m pip install -r requirements-dev.txt
npm run verify
```

`verify` fails fast through Direct Mode tests, GenVM lint/semantic validation, frontend tests and production build, saving command output and source SHA-256 in `verification/LOCAL_VERIFICATION.json`.

Direct Mode calls the submitted contract's public methods and executes its actual acquisition/parser/validator code against controlled HTTP/LLM mocks. Its synthetic fixture is explicitly labeled. It does not prove live consensus, transfer execution or runtime rollback of attached value.

Optional publisher preflight: `npm run sources` performs two independent public fetches per source, verifies normalized-body stability, and regenerates `samples/resources.json`. Full publisher pages stay in ignored local cache rather than being redistributed. Re-run local verification and rebuild after changing this release input. Expected semantic controls are recorded separately before AI execution in the manifest.

## Frontend

```powershell
npm run dev
```

The logo supplied for this project is used in the header and introduction. The coverage board reads contract state, locks actions to phases, separates sponsor/curator roles and shows grounded coverage. A browser-local bid backup must be downloaded before clearing browser storage. It contains bid secrets, not private wallet keys.

Every signed write waits for finalization, checks execution and validator votes, then verifies the exact returned round/bid ID against authoritative state. Existing transaction hashes can be reconciled without resending. `TRANSFER_PENDING` is never shown as `PAID`.

## Deploy and verify

Deploy **[contracts/AuditCoverMarket.py](contracts/AuditCoverMarket.py)** in StudioNet with **no constructor arguments**, using the main deployment wallet. See [deployment runbook](docs/DEPLOY_RUNBOOK.md). The active address remains unset until that step; the UI accepts an explicit deployed address.

After source parity is checked, use two auxiliary wallets with faucet GEN:

```powershell
# Set AUDITCOVER_ADDRESS, AUDITCOVER_SPONSOR_KEY and AUDITCOVER_CURATOR_KEY
# in the local shell. Do not put private keys into frontend variables.
npm run live -- happy
npm run live -- guards
npm run live -- recovery
```

The runner checkpoints every send, preserves existing hashes, and refuses an ambiguous resend. Standard auction windows are 15 minutes commit, 15 minutes reveal and 15 minutes recovery wait to accommodate StudioNet finality. Evidence includes source parity, exact actor/inputs, parent and child receipts, consensus, complete readbacks and balance changes. A failed semantic expectation remains a failure; the script does not change expected mappings or shop for a verdict.

## Readiness

Current ladder: **local verification**, with public-source acquisition preflight. Deployment address, live semantic branches, real transfers and production browser-wallet journeys are still pending. [Evidence packet](docs/EVIDENCE_PACKET.md) keeps those gates separate. Repository publication or a hosted UI alone does not make this build submission-ready.
