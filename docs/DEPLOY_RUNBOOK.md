# StudioNet deployment and live execution

1. Open GenLayer Studio on StudioNet using the main deployment wallet.
2. Load the complete `contracts/AuditCoverMarket.py`. Preserve the exact two-line runner header.
3. Deploy `AuditCoverMarket` with **no constructor arguments**. Record address, deployment tx and source SHA-256. The constructor grants no operational role to the deployer.
4. Return the deployment address. Check `gen_getContractCode` byte-for-byte against local source and inspect schema/config before auxiliary wallets send any funds.
5. Configure `deployments/studionet.json` and `VITE_CONTRACT_ADDRESS`. Rebuild frontend and reopen production to verify its active address.
6. Run auxiliary-wallet `happy`, `guards` and `recovery` scripts with sufficient faucet balances. Private keys stay in shell memory or ignored local `.env`; never frontend configuration, evidence or Git history.
7. Verify complete coverage, winning bid IDs, exact payouts, credited child receipts, authoritative post-state and value conservation. Verify failed writes by complete pre/post state equality.
8. Perform a separate manual browser-wallet journey from the deployed frontend. Programmatic SDK signers alone do not establish wallet popup/account/network behavior. The user may sign manually; the assistant keeps its use of the main wallet limited to deployment.

Browser path: connect wallet → paste active contract → Sync → New brief → lock terms → sponsor funds → curator commits both L02/M01 bids and downloads backups → after commit close reveal → after reveal close assess/clear → curator withdraw → sponsor withdraws change → each confirms parent/child payout receipts. The Activity tab stores existing hashes and offers reconciliation after reload.

Dates are protocol transaction timestamps, not a host-time oracle. The UI estimates phase from local time for convenience; contract guards are authoritative. The last-mile parent/child receipt proof is specific to the documented StudioNet RPC schema and must be verified on this exact deployment.

Do not declare submission-ready until the pending rows in `EVIDENCE_PACKET.md` have actual transaction/readback evidence. An asynchronously failed child cannot be called paid or automatically retried; preserve the pending liability and report it as a release blocker.
