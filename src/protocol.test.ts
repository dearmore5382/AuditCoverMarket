import { describe, expect, it } from "vitest";
import {
  canonical,
  execution,
  expectedReadback,
  parseGEN,
  stage,
  txHash,
  type Round,
} from "./protocol";
const round = {
  round_id: 2,
  sponsor: "0x" + "a".repeat(40),
  phase: "COMMIT",
  terms: { budget: 100n, commit_end: 10, reveal_end: 20, expires: 30 },
  bids: [
    { curator: "0x" + "b".repeat(40), commitment: "abc", revealed: false },
  ],
  credits: {},
} as unknown as Round;
describe("exact amounts and commitment bytes", () => {
  it("preserves wei without float rounding", () => {
    expect(parseGEN("0.000000000000000001")).toBe(1n);
    expect(parseGEN("1.123456789012345678")).toBe(1123456789012345678n);
    expect(
      canonical({ price: 1123456789012345678n, source_id: "oz-bravo" }),
    ).toBe('{"price":1123456789012345678,"source_id":"oz-bravo"}');
  });
  it("rejects unsafe or malformed amounts", () => {
    for (const v of ["0", "-1", "1e18", "0.1234567890123456789"])
      expect(() => parseGEN(v)).toThrow();
    expect(() => canonical(Number.MAX_SAFE_INTEGER + 1)).toThrow();
  });
});
describe("transaction authority", () => {
  it("normalizes both SDK response shapes", () => {
    const h = "0x" + "a".repeat(64);
    expect(txHash(h)).toBe(h);
    expect(txHash({ txId: h })).toBe(h);
    expect(() => txHash({})).toThrow();
  });
  it("finality alone cannot imply execution or consensus", () => {
    expect(() =>
      execution({ status: "FINALIZED", consensus_data: {} }),
    ).toThrow();
    expect(() => execution({ status: "ACCEPTED" })).toThrow();
  });
  it("requires successful GenVM return and votes", () => {
    const tx = {
      status: "FINALIZED",
      consensus_data: {
        leader_receipt: [
          {
            mode: "leader",
            execution_result: "SUCCESS",
            result: { status: "return", payload: { readable: '"CLEARED"' } },
          },
        ],
        votes: { a: "agree", b: "agree", c: "agree" },
      },
    };
    expect(execution(tx)).toBe("CLEARED");
    expect(() =>
      execution({
        ...tx,
        consensus_data: { ...tx.consensus_data, votes: { a: "agree" } },
      }),
    ).toThrow();
  });
  it("requires exact readback ID and role", () => {
    expect(expectedReadback("create_round", [], 3, round, round.sponsor)).toBe(
      false,
    );
    expect(
      expectedReadback(
        "commit_bid",
        [2, "abc"],
        0,
        round,
        "0x" + "b".repeat(40),
      ),
    ).toBe(true);
    expect(
      expectedReadback("commit_bid", [2, "abc"], 0, round, round.sponsor),
    ).toBe(false);
  });
  it("uses half-open auction windows and expiry", () => {
    expect(stage(round, 9)).toBe("COMMIT");
    expect(stage(round, 10)).toBe("REVEAL");
    expect(stage(round, 20)).toBe("CLEAR");
    expect(stage(round, 30)).toBe("EXPIRED");
    expect(stage({ ...round, phase: "CLEARED" }, 31)).toBe("CLEARED");
  });
  it("does not equate emitted transfer with paid credit", () => {
    const r = {
      ...round,
      credits: {
        [round.sponsor]: {
          status: "TRANSFER_PENDING",
          amount: 100,
          kind: "PAYOUT",
        },
      },
    };
    expect(
      expectedReadback(
        "confirm_payout",
        [2, round.sponsor],
        "PAID",
        r,
        round.sponsor,
      ),
    ).toBe(false);
  });
});
