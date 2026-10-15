# AuditCover Market — StudioNet E2E evidence

Verified on 2026-10-15 against contract `0xC5ccC356d222b5f0cD7540c993e10aB3895391B2`.

## Identity and source binding

- Deployer: deployment only; it did not create, fund, bid, reveal, clear, recover, or withdraw in these scenarios.
- Sponsor: `0x736A168247e3f0C52F7907c9a8fDac572DF9c8bB`.
- Curator / permissionless recovery caller: `0xA63DE24e30C88FB1019E8956654730316e36eDBE`.
- Deployed source SHA-256: `a6c0ac9aecfd706489027db0455f2baee7687dea7bca2d5d8049b0efb3db9fef`.
- The byte-for-byte deployed source check passed at the start of every scenario.
- The private keys are not present in this report, repository, frontend, screenshots, or JSON evidence.

Explorer base: <https://explorer-studio.genlayer.com>

## Scenario A — happy path (round 0)

The sponsor created and funded a 0.001 GEN brief. The curator committed and revealed two source-bound bids. Validators fetched the pinned OpenZeppelin report, returned coverage `[[0],[1]]`, and the contract selected bids `[0,1]`. The curator received 0.0005 GEN and the sponsor received the unused 0.0005 GEN. Exact recipient balance deltas, exact contract outflows, receipt linkage, double-withdrawal rejection, and value conservation passed.

| Step | Expected result | Transaction |
|---|---|---|
| Create brief | round `0` | [0x978d…c508](https://explorer-studio.genlayer.com/tx/0x978d0c2260285a5022d8acf2bbc59e3ec0ba6a90a69e5e31d34cc401a4dac508) |
| Fund exact budget | `FUNDED` | [0x52c1…9bda](https://explorer-studio.genlayer.com/tx/0x52c12acce271c0b075f88d67e02110664d479e99465a762986d53be9d9279bda) |
| Commit bid 0 | bid `0` | [0xacb9…9207](https://explorer-studio.genlayer.com/tx/0xacb994d2bec4494c3a99aa76a6ce2686a69e12f770b74a4c2a385d14559a9207) |
| Commit bid 1 | bid `1` | [0xe1f7…df0c](https://explorer-studio.genlayer.com/tx/0xe1f7a5455762b5e76888549b85d766811d51e2311ef8f32c7499075d110bdf0c) |
| Reveal bid 0 | `REVEALED` | [0x3bc9…792e](https://explorer-studio.genlayer.com/tx/0x3bc94a4a82d95e5ae708fcba63d500d515b59f05de836b95945f01d8ac81792e) |
| Reveal bid 1 | `REVEALED` | [0x83fe…158d](https://explorer-studio.genlayer.com/tx/0x83fe326d052e7a8e6059dc1a3d75905142656c601060a1134a7ed4710dfb158d) |
| Semantic coverage and clearing | `CLEARED`; `[[0],[1]]`; selected `[0,1]` | [0x6b9c…366c](https://explorer-studio.genlayer.com/tx/0x6b9c487dbb8cb5496c284c13d9eb41f905c91de89f5a4d4275d9f1f13433366c) |
| Request curator reward | `TRANSFER_PENDING` | [0x7c33…fceb](https://explorer-studio.genlayer.com/tx/0x7c3332bbef567e46ad8294627f95223008752dec75ae06761744efb8f035fceb) |
| Native reward child | credited to curator | [0x4ad1…51f2](https://explorer-studio.genlayer.com/tx/0x4ad17650beda6b50ccdb8940023a7d18284517097ae1a7d372c5d62f48c451f2) |
| Confirm curator reward | `PAID` | [0xd5a9…05b9](https://explorer-studio.genlayer.com/tx/0xd5a9b6c6c198e3e0882071a8ae3843176b4121011bf26b47c938380e3fe705b9) |
| Request sponsor change | `TRANSFER_PENDING` | [0xf417…c641](https://explorer-studio.genlayer.com/tx/0xf4170e7fbc853d7d32a0f9869d07b663bcfcfadbc44f88434c41e99b65e2c641) |
| Native refund child | credited to sponsor | [0x5b1c…05b3](https://explorer-studio.genlayer.com/tx/0x5b1c97c00680f1bd98e84527fdd6731c7d3ca0aa347f4ec92f147e3ec93105b3) |
| Confirm sponsor change | `REFUNDED` | [0xdbe9…8e2d](https://explorer-studio.genlayer.com/tx/0xdbe9c95a2670075ecdd165613881c6ed5cc8cb7792d5f154965945404b918e2d) |
| Replay payout | rejected; no mutation | [0x2920…dafe](https://explorer-studio.genlayer.com/tx/0x2920d07403567de333e9755c72a54c24704277952fa0f9eba04fb3244e23dafe) |

Machine-readable evidence: [`LIVE_HAPPY.json`](./LIVE_HAPPY.json).

## Scenario B — permission and conflict guards (round 3)

Every rejected transaction finalized with unsuccessful GenVM execution and an exact pre/post-state equality check. The same round then completed normally, showing that rejected calls did not corrupt its state.

| Step | Expected result | Transaction |
|---|---|---|
| Create brief | round `3` | [0xa83c…7b08](https://explorer-studio.genlayer.com/tx/0xa83cebc1f29b7a4adb06fe4754520b9a9981f1ef418104f8b0837f8d31c97b08) |
| Curator attempts funding | rejected; wrong wallet; no mutation | [0x34e9…e5fa](https://explorer-studio.genlayer.com/tx/0x34e970a2c81992519d772a31ba09cac09f41e20604c0ce3e9b01c2718160e5fa) |
| Sponsor underfunds by 1 wei | rejected; no mutation | [0x75e8…6c7d](https://explorer-studio.genlayer.com/tx/0x75e82e2f3a22a4c7e699be522995934642da667f3fcc4f372e790ef013c06c7d) |
| Exact sponsor funding | `FUNDED` | [0xf415…3c5a](https://explorer-studio.genlayer.com/tx/0xf4158ecd7515f0f6c0efbddbdb299c44003289506d89a7d456917d86500a3c5a) |
| Sponsor attempts bid | rejected; no mutation | [0x3525…b545](https://explorer-studio.genlayer.com/tx/0x352530684e4cb4587f5f44cc72b068e5f156e65bdc998702b23f77a7ac65b545) |
| Curator commit 0 | bid `0` | [0xd5bb…41f6](https://explorer-studio.genlayer.com/tx/0xd5bb1647c81ee4e8871ae9010501191ebf1a29febb0c8146f8fc185789ee41f6) |
| Duplicate commitment | rejected; no mutation | [0x0a6d…73a2](https://explorer-studio.genlayer.com/tx/0x0a6d99f4a18d751e9012f105d22cc84e8ce4fcf4c76eb7dadb6f0dfb74c973a2) |
| Curator commit 1 | bid `1` | [0x87ac…ae2d](https://explorer-studio.genlayer.com/tx/0x87ac1baaef72faf76ecafdcdbb1aa0264f0371ad2981839e661e6ca8e2b0ae2d) |
| Sponsor attempts curator reveal | rejected; no mutation | [0x5ef7…e8cc](https://explorer-studio.genlayer.com/tx/0x5ef7b9fbbde1b36c2a3cb45eae5443cea8f63620b3aad05c9e1ae017e865e8cc) |
| Curator reveal 0 | `REVEALED` | [0xb4ef…34aa](https://explorer-studio.genlayer.com/tx/0xb4ef3ad832b27d8ff357aac7af922c05ce3f33a4bb508629103b93b99a7c34aa) |
| Curator reveal 1 | `REVEALED` | [0x90d0…2a90](https://explorer-studio.genlayer.com/tx/0x90d08931d1d9c83bd14570e93082c76d8afe8a31ffde3d014a3b29c5b79b2a90) |
| Semantic clearing | `CLEARED`; expected matrix and selection | [0x4577…02be](https://explorer-studio.genlayer.com/tx/0x457781b4731fdd5821c0905926bd57523f6f695c2369969750a175589b7902be) |
| Curator reward parent | `TRANSFER_PENDING` | [0x933b…1279](https://explorer-studio.genlayer.com/tx/0x933b8f8956324c5f3452004c46d1610fcdfeaf690af8918b204eef3ee3481279) |
| Curator reward child | credited | [0xa8ed…e27b](https://explorer-studio.genlayer.com/tx/0xa8ed1b950ff08bc123497472665b38e709b23468e1156b013d99eab25f9fe27b) |
| Confirm curator reward | `PAID` | [0xb2d9…d451](https://explorer-studio.genlayer.com/tx/0xb2d920d05c8b9cb656a8d7423a7a3e600554f635e17ee2d46ebfb17440acd451) |
| Sponsor change parent | `TRANSFER_PENDING` | [0x28ec…8c72](https://explorer-studio.genlayer.com/tx/0x28ec93d81155c32cfa0b6379b4bc882c3d4f1869766e9e75abefd0ce485d8c72) |
| Sponsor change child | credited | [0xf8c0…18d4](https://explorer-studio.genlayer.com/tx/0xf8c04a4653c896e3088918f272160f1761fc8f2f111f04b360a71c1663b018d4) |
| Confirm sponsor change | `REFUNDED` | [0xc686…0f97](https://explorer-studio.genlayer.com/tx/0xc686771221024ac5fdf7a1ebbd8c861058cb9453eff03762aabd98419acd0f97) |
| Replay payout | rejected; no mutation | [0xa738…b74b](https://explorer-studio.genlayer.com/tx/0xa7388c14b31fc07ca108183ef091b61b10836793b88bd2c339c33ea38840b74b) |

Machine-readable evidence: [`LIVE_GUARDS.json`](./LIVE_GUARDS.json).

## Scenario C — expiry and permissionless recovery (round 4)

The sponsor funded the round but no bid was cleared. After the fixed expiry, the curator triggered permissionless recovery. The credit belonged to the sponsor, not the caller. The sponsor then received the full 0.001 GEN. Exact recipient delta, exact contract outflow, receipt linkage, and value conservation passed.

| Step | Expected result | Transaction |
|---|---|---|
| Create brief | round `4` | [0x8f6c…99b2](https://explorer-studio.genlayer.com/tx/0x8f6c0b924d9ed47ffb8bc175eb0bc0008ee2f307c73f329184d2d1b1475899b2) |
| Fund exact budget | `FUNDED` | [0xed2e…1ca9](https://explorer-studio.genlayer.com/tx/0xed2e54527cc58601db1835c75d6a7dd0358ce255bc3aa8efee41123efdcd1ca9) |
| Curator triggers recovery after expiry | `REFUND_AVAILABLE` | [0xec14…7f87](https://explorer-studio.genlayer.com/tx/0xec149b117bc1f28c8ce448f8c4761346b488059681a5ae3122a688e58ddd7f87) |
| Sponsor refund parent | `TRANSFER_PENDING` | [0xa09f…a25b](https://explorer-studio.genlayer.com/tx/0xa09fb2a701d9f4e160931700a2026cbad65d9e9414789b3f8a909f730562a25b) |
| Sponsor refund child | credited | [0x9154…082c](https://explorer-studio.genlayer.com/tx/0x91542965591c8f64f8c209469478f7c86c4a80d123682d7aaf9dcbeaf01d082c) |
| Confirm refund | `REFUNDED` | [0xf9e1…1944](https://explorer-studio.genlayer.com/tx/0xf9e114db76e56c8c5b02678fb791a207bd9ed737a01bf66d3cd5213bc6861944) |

Machine-readable evidence: [`LIVE_RECOVERY.json`](./LIVE_RECOVERY.json).

## Timing attempts retained, not counted as passes

Two earlier guards attempts used commit windows that were too short for the observed StudioNet finalization latency. Their successful negative calls remain real transactions, but the rounds did not complete because the later valid funding/commit reached the contract after `commit_end`. They are retained as `LIVE_GUARDS_SHORT_DEADLINE_FAILED.json` and `LIVE_GUARDS_300S_DEADLINE_FAILED.json`. Neither is counted as successful E2E evidence.

## Verification boundary

These results prove the deployed source, configured StudioNet contract behavior, fixed source-bound semantic flow, role guards, exact-value funding, commitment replay protection, receipt-confirmed native transfers, expiry recovery, and accounting conservation for the recorded rounds. They do not claim that every future publisher page, model response, network condition, or asynchronous native transfer will succeed. A failed child transfer remains a pending liability under the documented threat model.
