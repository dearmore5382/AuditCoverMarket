# Test resource manifest

Machine-readable source acquisition metadata: [samples/resources.json](../samples/resources.json). No secret is stored there. Each entry records purpose, authoritative owner, canonical origin/URL, subject, revision/commit scope, content type, raw/normalized digests, controller, beneficiary, stability and availability observation.

## Expected controls — declared before live AI

| Resource | Claim/scope | Purpose | Expected effect |
|---|---|---|---|
| `oz-bravo`, finding L02 | Publisher's repeated-initialization finding, exact report snapshot | Question 0 positive | Covers repeated-initialization question only |
| `oz-bravo`, finding M01 | Publisher's governance input-validation finding | Question 1 positive | Covers parameter-validation question only |
| `oz-bravo`, finding L03 | Documentation topic | Semantic negative | Does not satisfy repeated-initialization or parameter-validation question |
| `oz-bravo`, nonexistent H99 | No supported section boundary | Missing finding | UNRESOLVED; no credit |
| `oz-compound` body as `oz-bravo` | Real report, wrong subject/commit | Cross-object | Subject/digest failure; no credit |
| Correct source + zero digest | Wrong normalized-content commitment | Integrity | UNRESOLVED; no credit |
| Same source, changed bytes | Pin no longer matches | Mutable-source control | UNRESOLVED; no credit |
| Official URL returning 404/429/503/timeout | No usable publisher observation | Availability | No fabricated finding; no credit |
| Synthetic fixture in `tests/fixtures/` | Invented report-like paragraphs | Direct Mode only | Exercises parser/guards with HTTP/LLM mocks; never live evidence |

The real OpenZeppelin page is mutable. Its published audited commit identifies the report's declared audited code revision; it does not make the report itself immutable. SHA-256 binds the exact normalized article text, using `_article` and `_text` in the submitted contract. Raw response hash is diagnostic; the adjudicated commitment is the normalized article hash. Two consecutive public fetches were required to agree during preflight. Authority is the publisher for the fact “this finding was published,” not an authority for present deployed security.

Only the v1 primary report has supported finding headings for positive bids. The secondary report's current headings are not parsed by this extractor; that limit is visible in `finding_ids` and the UI. Future report support requires an explicit source/parser revision and relevant retest.

Local fixtures isolate malformed schema, wrong object, wrong digest, unavailable response and ungrounded/mismatched model output. These are controlled inputs, not public live resources or evidence of third-party observations. Full downloaded pages live only in ignored cache; the acquisition script allows independent reproduction.

Live plan: two auxiliary wallets, 0.001 faucet GEN sponsor budget per round, curator prices 0.0002 + 0.0003 GEN, expected curator payout 0.0005 GEN and sponsor change 0.0005 GEN. Deployer performs no lifecycle actions. If these expected semantics fail, retain the failure and investigate the proof mechanism; do not change the expected answer or reroll AI.
