# Proof and consequence

Proof obligation: a publisher's specific finding, in a sealed article snapshot and audited subject scope, substantively answers a sponsor's immutable research question. A mismatched subject, missing finding, unsupported relation or changed source falsifies the offered coverage.

Evidence authority is the compiled publisher origin and report subject. Judgment authority belongs to independent GenLayer validator executions. Execution authority belongs to deterministic contract code. A literal quote proves grounding, while validators must still establish relevance; a quote alone cannot unlock payment.

The sponsor has authority to define the desired research brief and commit its own funds, not to manufacture the auditor's findings. Curators have authority over their bids and withdrawal accounts, not the report content. Sources cannot be replaced with a curator repository or JSON manifest. The release deliberately does not claim code changes, CI success or deployed safety.

## Persistent structure

Each bounded round stores immutable terms and a domain-separated digest (chain, contract, round ID, sponsor and complete terms), at most six commitments/reveals, the accepted coverage matrix, the selected bundle and per-recipient payment credits. Each wallet can commit two bids per round; this is not Sybil protection. Cross-round replay is blocked by the terms digest. Replay checks are bounded to six bids or use a receipt index.

Coverage is established for the entire frozen bid set. Deterministic set-cover enumeration chooses the cheapest complete subset. No subset can include two offers for the same exact report/finding. Equal cost prefers fewer bids, then the lexicographically smaller ID tuple. Total winners' prices never exceed the deposited budget.

## Failure and time

The clock is `gl.message_raw['datetime']` from the pinned transaction context, parsed to Unix seconds. Windows are half-open. A source/model failure records `UNRESOLVED` with no allocation. Lack of semantic coverage records `NO_COVER`. Both wait until the fixed expiry before permissionless recovery to the sponsor. The source need not be available for recovery. A draft has no custody and cannot be funded after commit closes; it remains an inert historical draft.

An accepted assessment is single-attempt. Failed network consensus may revert the transaction, leaving no accepted assessment, and does not create a positive effect. Consensus validation compares only coverage identities after independent acquisition and grounding, not free-form reasons.

## Payment

Funding receives exact native GEN through a payable entrypoint. Clearing reserves credits without emitting payments. Recipient-triggered withdrawals emit an EOA value message and move its liability from held to pending. A caller cannot withdraw another recipient's credit. A synchronous emission failure leaves credit and round accounting unchanged. No credit can be emitted twice.

On StudioNet, confirmation relies on its canonical RPC's transfer-specific `value_credited` flag, not an IC result-name field, and binds the child to the exact parent `request_payout(round_id)`. This RPC trust model is specific to StudioNet, not an EVM inclusion proof. SDK schema, source fetches, clock behavior and receipt confirmation still require live verification on the eventual deployment.

Asynchronous delivery failure has no documented automatic value return in the pinned runtime. The application preserves pending liability and does not emit a second payment or forge a refund. Automatic recovery of that external-message failure is out of scope and must not be advertised. The live settlement release gate must establish successful EOA delivery; a failed child is a release blocker, not an allegedly recovered payment.
