# Build readiness — 2026-10-15

Current state: LOCALLY VERIFIED. No AuditCover Market contract address has been supplied and no live test transaction is claimed.

- Clean `npm ci --ignore-scripts`: passed after stopping a development-server process holding esbuild.exe on Windows.
- `npm run verify`: passed. Exact command output and source SHA-256 are in `LOCAL_VERIFICATION.json`.
- Actual-contract Direct Mode suite: 28 passed; HTTP and LLM are controlled mocks using an explicitly synthetic fixture.
- GenVM lint: 3 checks passed; schema/semantic validation passed, 10 public methods (2 view, 8 write).
- Frontend tests: 8 passed.
- TypeScript + production build: passed.
- Dependency audit following clean install: 0 vulnerabilities reported.
- Official publisher preflight: two consecutive normalized article snapshots matched per source. Metadata/digests are in `samples/resources.json`; full downloaded pages are ignored local cache.
- Browser read-only QA: header logo, board, new-brief form and source library observed. Writes correctly unavailable without a wallet/deployment. Screenshot: `screenshots/frontend-preview.png`.

Warnings: installed transitive eslint is deprecated; pinned runner has a newer available version; Node warns about shell command launching in the local verification script. These warnings are retained in the logs. No skipped or failed verification gate was silently converted to success.

Hosted publication did not proceed: automatic approval review rejected uploading project source to the external Sites repository because that source-export destination was not explicitly authorized. A Site identity was provisioned, but no source synchronization/version/deployment is claimed. The local folder remains the deliverable.

Next: main wallet deploys `contracts/AuditCoverMarket.py` with no arguments. Then bind exact address/source, use only auxiliary wallets for programmatic lifecycle testing, verify custody/coverage/transfer/rollback on StudioNet, configure production frontend, and conduct a separate browser-wallet journey. Reviewer-owned wallets may create/fund their own independent rounds; the deployer is not a constructor-appointed administrator.
