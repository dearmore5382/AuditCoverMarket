export type Integer = number | bigint;
export type Bid = {
  bid_id: number;
  curator: string;
  commitment: string;
  revealed: boolean;
  source_id?: string;
  finding?: string;
  price?: Integer;
};
export type Credit = {
  amount: Integer;
  status: string;
  kind: string;
  parent_hash?: string;
  child_hash?: string;
};
export type Round = {
  round_id: number;
  sponsor: string;
  terms_digest: string;
  phase: string;
  terms: {
    title: string;
    questions: string[];
    sources: Record<string, string>;
    budget: Integer;
    commit_end: number;
    reveal_end: number;
    expires: number;
  };
  bids: Bid[];
  matrix: { bid_id: number; coverage: number[]; quotes: string[] }[];
  selected: number[];
  credits: Record<string, Credit>;
  held: Integer;
  pending: Integer;
  paid: Integer;
  refunded: Integer;
  attempted: boolean;
};
export function canonical(x: unknown): string {
  if (typeof x === "bigint") return String(x);
  if (typeof x === "number") {
    if (!Number.isSafeInteger(x)) throw Error("Unsafe integer");
    return String(x);
  }
  if (x === null || typeof x === "boolean" || typeof x === "string")
    return JSON.stringify(x);
  if (Array.isArray(x)) return "[" + x.map(canonical).join(",") + "]";
  if (typeof x === "object")
    return (
      "{" +
      Object.keys(x as object)
        .sort()
        .map(
          (k) =>
            JSON.stringify(k) +
            ":" +
            canonical((x as Record<string, unknown>)[k]),
        )
        .join(",") +
      "}"
    );
  throw Error("Unsupported value");
}
export const validAddress = (x: string) =>
  /^0x[0-9a-fA-F]{40}$/.test(x) && !/^0x0{40}$/.test(x);
export function parseGEN(text: string): bigint {
  if (!/^(0|[1-9]\d{0,3})(\.\d{1,18})?$/.test(text))
    throw Error("Enter a positive GEN amount with up to 18 decimals.");
  const [a, b = ""] = text.split(".");
  const n = BigInt(a) * 10n ** 18n + BigInt(b.padEnd(18, "0"));
  if (n <= 0n) throw Error("Amount must be positive.");
  return n;
}
export function gen(n: Integer): string {
  const v = BigInt(n),
    a = v / 10n ** 18n,
    b = (v % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, "");
  return a + (b ? "." + b : "");
}
export function hashValue(x: unknown): Promise<string> {
  return crypto.subtle
    .digest("SHA-256", new TextEncoder().encode(canonical(x)))
    .then((buf) =>
      Array.from(new Uint8Array(buf), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join(""),
    );
}
export function stage(round: Round, now: number): string {
  if (round.phase !== "COMMIT") return round.phase;
  if (now < round.terms.commit_end) return "COMMIT";
  if (now < round.terms.reveal_end) return "REVEAL";
  if (now >= round.terms.expires) return "EXPIRED";
  return "CLEAR";
}
export function txHash(value: unknown): `0x${string}` {
  const hash =
    typeof value === "string" ? value : (value as { txId?: unknown })?.txId;
  if (typeof hash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(hash))
    throw Error("Wallet returned an invalid transaction hash.");
  return hash as `0x${string}`;
}
export function execution(tx: unknown): unknown {
  const t = tx as {
    status?: string | number;
    consensus_data?: {
      leader_receipt?: {
        mode?: string;
        execution_result?: string;
        result?: { status?: string; payload?: { readable?: string } };
      }[];
      votes?: Record<string, string>;
    };
  };
  if (t.status !== "FINALIZED" && t.status !== 7)
    throw Error("Transaction has not finalized.");
  const receipts = t.consensus_data?.leader_receipt || [];
  const leader = [...receipts].reverse().find((x) => x.mode !== "validator");
  const last = leader || receipts.at(-1);
  if (
    !last ||
    last.execution_result !== "SUCCESS" ||
    last.result?.status !== "return"
  )
    throw Error(
      last?.result?.payload?.readable || "GenVM execution did not succeed.",
    );
  if (
    Object.values(t.consensus_data?.votes || {}).filter((v) => v === "agree")
      .length < 3
  )
    throw Error("Validator consensus is not established.");
  const value = last.result.payload?.readable;
  if (value === undefined) throw Error("Missing authoritative return value.");
  return JSON.parse(value);
}
export function expectedReadback(
  method: string,
  args: unknown[],
  result: unknown,
  round: Round | undefined,
  wallet: string,
): boolean {
  if (!round) return false;
  if (method !== "create_round" && Number(args[0]) !== Number(round.round_id)) return false;
  if (method === "create_round")
    return (
      Number(result) === round.round_id &&
      round.sponsor === wallet.toLowerCase()
    );
  if (method === "fund_round")
    return (
      result === "FUNDED" &&
      round.phase === "COMMIT" &&
      BigInt(round.held) === BigInt(round.terms.budget)
    );
  if (method === "commit_bid")
    return (
      typeof result === "number" &&
      round.bids[result]?.commitment === args[1] &&
      round.bids[result]?.curator === wallet.toLowerCase()
    );
  if (method === "reveal_bid")
    return result === "REVEALED" && round.bids[Number(args[1])]?.revealed;
  if (method === "clear_round")
    return (
      ["CLEARED", "UNRESOLVED", "NO_COVER"].includes(String(result)) &&
      round.phase === result
    );
  if (method === "recover_round")
    return result === "REFUND_AVAILABLE" && round.phase === "RECOVERED";
  if (method === "request_payout")
    return (
      result === "TRANSFER_PENDING" &&
      round.credits[wallet.toLowerCase()]?.status === "TRANSFER_PENDING"
    );
  if (method === "confirm_payout")
    return (
      ["PAID", "REFUNDED"].includes(String(result)) &&
      round.credits[String(args[1]).toLowerCase()]?.status === "PAID"
    );
  return false;
}
