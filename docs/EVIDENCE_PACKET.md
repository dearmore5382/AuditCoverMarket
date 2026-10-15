# AuditCover Market — evidence packet

Status: **local verification; not deployed**. This file deliberately contains no fabricated address or transaction hash.

| Requirement | Local evidence | Exact deployment evidence |
|---|---|---|
| Runner header, schema and SDK compatibility | `verification/LOCAL_VERIFICATION.json` | Pending deployment and actual execution |
| Source provenance and reproducible extraction | `samples/resources.json`; acquisition script; direct HTTP controls | Pending validator-network fetch |
| Independent semantic verification | Direct `_coverage` + actual custom validator tests | Pending live coverage consensus |
| Commit/reveal and sender authorization | Actual public entrypoints and state comparisons | Pending auxiliary-wallet transactions |
| Minimum-cost coverage clearing | Solver boundary tests + public clearing lifecycle | Pending selected IDs and matrix readback |
| Exact payable funding | Direct guards; simulated Direct Mode balance | Pending actual custody increase and wrong-value rollback |
| Credits cannot be reclaimed after clearing | Public recovery rejection and no-mutation | Pending terminal-state adversarial tx |
| Payout not confused with emission | Pending-status and confirmation parser tests | Pending credited child, recipient/contract balance changes |
| Cross-round/recipient/amount receipt attacks | Actual public confirmation rejects controlled receipts | Pending relevant live controls |
| Browser UI and logo | Local browser navigation/screenshot | Pending deployed browser-wallet signing journey |

## Quick path

Read scope in README → run `npm run verify` → inspect contract authority and clearing → inspect `TEST_RESOURCE_MANIFEST.md` → after deployment inspect source parity, parent/child transactions and complete post-state → repeat a browser-wallet lifecycle with an independent wallet.

## What is not claimed

- No live contract has yet been supplied for this project.
- Direct Mode mocks HTTP and LLM; it does not establish multi-validator network consensus.
- Publisher preflight runs from the development machine, not from validators.
- The synthetic fixture is not an auditor attestation or live payout evidence.
- Local tests do not prove actual native transfers or payable rollback on StudioNet.
- Programmatic lifecycle scripts do not replace the browser-wallet journey.
- Payout receipt verification trusts StudioNet's canonical RPC and transfer-credit flag.
- Network redirect enforcement, Sybil resistance, third-party audit and automatic recovery of a failed external native transfer are not claimed.
- No claim is made about current safety, remediation or deployment of the audited protocols.
