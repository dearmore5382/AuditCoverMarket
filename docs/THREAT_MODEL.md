# Threat model and checks

Attackers control curator wallets, bid prices, locator choice, salts, timing and external transaction hashes. They can create multiple wallets; the two-bid quota is per wallet, not per human. They cannot rewrite the compiled publisher registry, another sender's commitment, immutable round terms or canonical StudioNet transaction records within this trust model.

| Attack | Critical-path enforcement | Test/evidence |
|---|---|---|
| Substitute a self-authored report | Source ID resolves to compiled origin and subject | source bounds + wrong-source controls |
| Valid digest of different bytes | Recompute exact normalized fetched article digest | HTTP digest mismatch |
| Finding belongs to another report | Per-round source digest and exact section lookup | wrong finding/source controls |
| Leader proposes plausible wrong coverage | Validator independently reacquires and derives coverage | validator falsification test |
| Evidence prompt injection | Evidence marked as data; hard binding and quote predicates | additional controls; live model resistance pending |
| Change bid price after seeing bids | Sender/round/terms/payload/salt commitment | reveal mismatch no-mutation |
| Reveal someone else's bid | Authenticated curator sender | wrong-actor rollback |
| Recover after winners allocated | Recovery excludes CLEARED | terminal transition rollback |
| Repeat withdrawal | AVAILABLE → TRANSFER_PENDING exactly once | duplicate payout no-mutation |
| Fake/other-round child receipt | Parent calldata round/method, signer, recipient, amount and linkage | receipt parser and public confirmation tests |
| Source unavailable or changed | No positive matrix; fixed-expiry recovery | public clear returns UNRESOLVED |

Full page bytes are not a complete Git snapshot. Publication provenance does not certify current protocol behavior. Source reachability is rechecked by validators; local fetch success is not proof of validator-network reachability.

Remaining boundaries: SDK web responses do not expose a final redirect URL or a configurable redirect policy. The acquisition script rejects redirects locally; contract URLs are compiled and exact, but network-level redirect enforcement is not claimed. A changed-page digest cannot be overridden by the model. A malicious or compromised recognized publisher remains inside the publisher trust boundary. No third-party security audit is claimed.

Funding rollback, complete native delivery failure behavior, protocol clock execution and receipt APIs must be exercised on the exact deployed runtime before live-readiness claims. An exhausted bid cap can be griefed by Sybil wallets; it never authorizes a bad payout and fixed expiry restores the sponsor's unused funds, but availability/fair participation is not guaranteed.
