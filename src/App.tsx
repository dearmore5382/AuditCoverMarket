import { useEffect, useRef, useState } from "react";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import type { Hash, CalldataEncodable } from "genlayer-js/types";
import resources from "../samples/resources.json";
import logo from "../logo.png";
import {
  canonical,
  execution,
  expectedReadback,
  gen,
  hashValue,
  parseGEN,
  stage,
  txHash,
  validAddress,
  type Round,
} from "./protocol";

type Provider = {
  request: (a: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (name: string, fn: (a: unknown) => void) => void;
  removeListener?: (name: string, fn: (a: unknown) => void) => void;
};
declare global {
  interface Window {
    ethereum?: Provider;
  }
}
type Journal = {
  hash: string;
  method: string;
  state: string;
  contract: string;
  wallet: string;
  args: unknown[];
  roundId: number;
  returned?: unknown;
};
type Reveal = {
  contract: string;
  roundId: number;
  wallet: string;
  payload: { source_id: string; finding: string; price: string };
  salt: string;
  commitment: string;
  bidId?: number;
};
const shorten = (x: string) =>
  x ? `${x.slice(0, 6)}…${x.slice(-4)}` : "Not connected";
const explorer = "https://explorer-studio.genlayer.com";
const reader = createClient({ chain: studionet });
const rpc = async (method: string, params: unknown[]) => {
  const response = await fetch("https://studio.genlayer.com/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const value = await response.json();
  if (value.error) throw Error(value.error.message);
  return value.result;
};
const safeLoad = <T,>(key: string, fallback: T): T => {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
};
const tag = (x: string) => (
  <span
    className={`tag ${["CLEARED", "PAID"].includes(x) ? "good" : ["UNRESOLVED", "EXPIRED", "NO_COVER"].includes(x) ? "warn" : ""}`}
  >
    {x.replaceAll("_", " ")}
  </span>
);
export default function App() {
  const [address, setAddress] = useState(
    () =>
      localStorage.getItem("auditcover-address") ||
      import.meta.env.VITE_CONTRACT_ADDRESS ||
      "",
  );
  const [wallet, setWallet] = useState("");
  const [tab, setTab] = useState<"board" | "create" | "sources" | "activity">(
    "board",
  );
  const [roundId, setRoundId] = useState(0);
  const [round, setRound] = useState<Round>();
  const [count, setCount] = useState(0);
  const [balance, setBalance] = useState("0");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(
    "Connect your wallet or explore the source library.",
  );
  const [error, setError] = useState("");
  const [synced, setSynced] = useState("");
  const [now, setNow] = useState(Date.now() / 1000);
  const [journal, setJournal] = useState<Journal[]>(() =>
    safeLoad("auditcover-journal", []),
  );
  const [reveals, setReveals] = useState<Reveal[]>(() =>
    safeLoad("auditcover-reveals", []),
  );
  const [title, setTitle] = useState("Governor Bravo · governance research");
  const [questions, setQuestions] = useState(
    "Find a published finding explaining repeated initialization of Governor Bravo.\nFind a published finding explaining missing validation of governance parameters.",
  );
  const [budget, setBudget] = useState("0.001");
  const [commitMinutes, setCommitMinutes] = useState("10");
  const [revealMinutes, setRevealMinutes] = useState("10");
  const [recoveryMinutes, setRecoveryMinutes] = useState("30");
  const [finding, setFinding] = useState("L02");
  const [price, setPrice] = useState("0.0002");
  const [parent, setParent] = useState("");
  const [child, setChild] = useState("");
  const [recipient, setRecipient] = useState("");
  const [revealImport, setRevealImport] = useState("");
  const current = useRef({ address, wallet, roundId });
  current.current = { address, wallet, roundId };
  const updateJournal = (hash: string, data: Partial<Journal>) =>
    setJournal((items) =>
      items.map((x) => (x.hash === hash ? { ...x, ...data } : x)),
    );
  useEffect(() => {
    localStorage.setItem("auditcover-journal", JSON.stringify(journal));
  }, [journal]);
  useEffect(() => {
    localStorage.setItem("auditcover-reveals", JSON.stringify(reveals));
  }, [reveals]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() / 1000), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const provider = window.ethereum;
    if (!provider) return;
    const changed = (accounts: unknown) => {
      setWallet(Array.isArray(accounts) ? String(accounts[0] || "") : "");
      setRound(undefined);
      setSynced("");
      setNotice("Wallet changed. Sync the current round before acting.");
    };
    const network = () => {
      setRound(undefined);
      setSynced("");
      setNotice("Network changed. Reconnect and sync.");
    };
    provider.on?.("accountsChanged", changed);
    provider.on?.("chainChanged", network);
    return () => {
      provider.removeListener?.("accountsChanged", changed);
      provider.removeListener?.("chainChanged", network);
    };
  }, []);
  useEffect(() => {
    setRound(undefined);
    setSynced("");
    setError("");
  }, [address, roundId]);
  async function sync(target = roundId, active = address) {
    if (!validAddress(active))
      throw Error("Enter the deployed StudioNet contract address.");
    const config = (await reader.readContract({
      address: active as `0x${string}`,
      functionName: "get_config",
      args: [],
    })) as { name: string; round_count: number; balance: string };
    if (config.name !== "AuditCover Market")
      throw Error("This address is not AuditCover Market.");
    const value =
      Number(config.round_count) > target
        ? ((await reader.readContract({
            address: active as `0x${string}`,
            functionName: "get_round",
            args: [target],
          })) as Round)
        : undefined;
    if (current.current.address !== active) return value;
    setCount(Number(config.round_count));
    setBalance(config.balance);
    if (current.current.roundId === target) {
      setRound(value);
      setSynced(new Date().toLocaleTimeString());
    }
    localStorage.setItem("auditcover-address", active);
    return value;
  }
  async function connect() {
    try {
      setError("");
      if (!window.ethereum)
        throw Error(
          "Install a browser wallet with an injected Ethereum provider.",
        );
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      if (!accounts[0]) throw Error("No account selected.");
      const client = createClient({
        chain: studionet,
        provider: window.ethereum as never,
        account: accounts[0] as `0x${string}`,
      });
      await client.connect("studionet");
      setWallet(accounts[0]);
      setNotice("Wallet connected to StudioNet. Sync to load your role.");
    } catch (e) {
      setError(String(e));
    }
  }
  async function transact(method: string, args: unknown[], value = 0n) {
    if (busy) return;
    setBusy(true);
    setError("");
    const context = { ...current.current };
    let hash = "";
    try {
      if (!validAddress(context.address) || !context.wallet || !window.ethereum)
        throw Error("Connect a wallet and sync a deployed contract first.");
      if (method !== "create_round" && !round)
        throw Error("Sync this round before writing.");
      const client = createClient({
        chain: studionet,
        provider: window.ethereum as never,
        account: context.wallet as `0x${string}`,
      });
      await client.connect("studionet");
      if (current.current.wallet !== context.wallet)
        throw Error("Wallet changed; reconnect before signing.");
      setNotice("Confirm the transaction in your wallet.");
      hash = txHash(
        await client.writeContract({
          address: context.address as `0x${string}`,
          functionName: method,
          args: args as CalldataEncodable[],
          value,
        }),
      );
      const row: Journal = {
        hash,
        method,
        args,
        state: "SUBMITTED",
        contract: context.address,
        wallet: context.wallet,
        roundId: context.roundId,
      };
      setJournal((x) => [row, ...x]);
      setNotice(
        "Submitted. Waiting for finalized execution and validator consensus.",
      );
      await reader.waitForTransactionReceipt({
        hash: hash as Hash,
        status: TransactionStatus.FINALIZED,
        interval: 5000,
        retries: 240,
      });
      const tx = await reader.getTransaction({ hash: hash as Hash });
      const returned = execution(tx);
      const target =
        method === "create_round" ? Number(returned) : Number(args[0]);
      updateJournal(hash, {
        state: "FINALIZED_NEEDS_READBACK",
        returned,
        roundId: target,
      });
      let state: Round | undefined;
      for (let i = 0; i < 5; i++) {
        state = (await reader.readContract({
          address: context.address as `0x${string}`,
          functionName: "get_round",
          args: [target],
        })) as Round;
        if (expectedReadback(method, args, returned, state, context.wallet))
          break;
        await new Promise((r) => setTimeout(r, 2500));
      }
      if (!expectedReadback(method, args, returned, state, context.wallet))
        throw Error(
          "Finalized, but authoritative state does not match the action. Sync or reconcile; do not resubmit.",
        );
      updateJournal(hash, { state: "VERIFIED", returned, roundId: target });
      if (method === "commit_bid")
        setReveals((x) =>
          x.map((v) =>
            v.commitment === args[1] &&
            v.contract === context.address &&
            v.wallet === context.wallet.toLowerCase()
              ? { ...v, bidId: Number(returned) }
              : v,
          ),
        );
      if (
        current.current.address === context.address &&
        current.current.wallet === context.wallet
      ) {
        current.current.roundId = target;
        setRoundId(target);
        await sync(target, context.address);
        setNotice(
          `${method.replaceAll("_", " ")} · ${String(returned)} · on-chain state verified.`,
        );
        if (method === "create_round") setTab("board");
      }
      return returned;
    } catch (e) {
      if (hash) updateJournal(hash, { state: "NEEDS_RECONCILIATION" });
      setError(String(e));
      setNotice(
        hash
          ? "Transaction recorded. Reconcile its existing hash before any new submission."
          : "Action was not verified.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function reconcile(row: Journal) {
    setBusy(true);
    setError("");
    try {
      const tx = await reader.getTransaction({
        hash: row.hash as Hash,
      });
      const returned = execution(tx);
      const id =
        row.method === "create_round" ? Number(returned) : Number(row.args[0]);
      const state = (await reader.readContract({
        address: row.contract as `0x${string}`,
        functionName: "get_round",
        args: [id],
      })) as Round;
      if (!expectedReadback(row.method, row.args, returned, state, row.wallet))
        throw Error(
          "Historical action no longer matches current state; inspect Explorer. No transaction was resubmitted.",
        );
      updateJournal(row.hash, { state: "VERIFIED", returned, roundId: id });
      if (row.method === "commit_bid")
        setReveals((x) =>
          x.map((v) =>
            v.commitment === row.args[1] && v.contract === row.contract
              ? { ...v, bidId: Number(returned) }
              : v,
          ),
        );
      setNotice("Existing transaction reconciled without resubmitting.");
      if (address === row.contract) await sync();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function create() {
    try {
      const qs = questions
        .split("\n")
        .map((q) => q.trim())
        .filter(Boolean);
      if (
        qs.length < 1 ||
        qs.length > 4 ||
        qs.some((q) => q.length < 10 || q.length > 400)
      )
        throw Error("Use 1–4 questions, one per line, 10–400 characters each.");
      const t = Math.floor(Date.now() / 1000);
      const cm = Number(commitMinutes),
        rm = Number(revealMinutes),
        em = Number(recoveryMinutes);
      if (
        ![cm, rm, em].every((n) => Number.isInteger(n) && n >= 2) ||
        cm + rm + em > 10080
      )
        throw Error(
          "Use integer windows of at least 2 minutes, within 7 days.",
        );
      const terms = {
        title,
        questions: qs,
        sources: { "oz-bravo": resources[0].expected_digest },
        budget: parseGEN(budget),
        commit_end: t + cm * 60,
        reveal_end: t + (cm + rm) * 60,
        expires: t + (cm + rm + em) * 60,
      };
      await transact("create_round", [canonical(terms)]);
    } catch (e) {
      setError(String(e));
    }
  }
  async function commit() {
    try {
      if (!round) throw Error("Sync first.");
      const wei = parseGEN(price);
      if (wei > BigInt(round.terms.budget))
        throw Error("Bid exceeds the budget.");
      if (!/^[CMLNH]\d{2}$/.test(finding))
        throw Error("Use a finding ID such as L02 or M01.");
      const salt = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
      const p = { source_id: "oz-bravo", finding, price: wei };
      const commitment = await hashValue([
        "auditcover-bid-v1",
        round.terms_digest,
        wallet.toLowerCase(),
        p,
        salt,
      ]);
      const backup: Reveal = {
        contract: address,
        roundId,
        wallet: wallet.toLowerCase(),
        payload: { ...p, price: String(wei) },
        salt,
        commitment,
      };
      setReveals((x) => [backup, ...x]);
      localStorage.setItem(
        "auditcover-reveals",
        JSON.stringify([backup, ...reveals]),
      );
      await transact("commit_bid", [roundId, commitment]);
    } catch (e) {
      setError(String(e));
    }
  }
  function exportReveal(v: Reveal) {
    const blob = new Blob([JSON.stringify(v, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `auditcover-round-${v.roundId}-bid-${v.bidId ?? "pending"}-reveal.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
  async function discoverChild() {
    try {
      const t = await rpc("eth_getTransactionByHash", [parent]);
      const children = t?.triggered_transactions;
      if (!Array.isArray(children) || children.length !== 1)
        throw Error("Expected exactly one finalized child transfer.");
      setChild(children[0]);
      setNotice(
        "Child locator loaded. The contract will independently verify its parent, round, recipient, amount and credited status.",
      );
    } catch (e) {
      setError(String(e));
    }
  }
  const active = round ? stage(round, now) : "";
  const sponsor = !!round && wallet.toLowerCase() === round.sponsor;
  const myCredit = round?.credits[wallet.toLowerCase()];
  const mine = reveals.filter(
    (x) =>
      x.contract === address &&
      x.roundId === roundId &&
      x.wallet === wallet.toLowerCase(),
  );
  const canWrite = !!wallet && !busy && !!round;
  return (
    <>
      <header>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setTab("board");
          }}
        >
          <img src={logo} alt="AuditCover audit report and gavel logo" />
          <span>
            AuditCover<small>THE EVIDENCE MARKET</small>
          </span>
        </a>
        <nav aria-label="Main navigation">
          {(
            [
              ["board", "Coverage board"],
              ["create", "New brief"],
              ["sources", "Source library"],
              ["activity", "Activity"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              className={tab === key ? "nav active" : "nav"}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </nav>
        <button className="wallet" onClick={connect}>
          <i />
          {wallet ? shorten(wallet) : "Connect wallet"} <span>↗</span>
        </button>
      </header>
      <main>
        <div className="networkbar">
          <span>
            <i /> STUDIO NET <b>•</b> GENLAYER CONSENSUS
          </span>
          <span>
            {synced ? `Synced ${synced}` : "Awaiting deployment sync"}
          </span>
        </div>
      {tab === "board" && <section className="hero">
          <div>
            <p className="eyebrow">LESS NOISE. MORE PROOF.</p>
            <h1>
              Every question.
              <br />
              <em>Covered.</em>
            </h1>
            <p className="intro">
              Turn a research brief into a funded market.
              <br />
              Find the audit evidence. Clear the smallest sufficient bundle.
            </p>
            <div className="hero-actions">
              <button className="primary" onClick={() => setTab("create")}>
                Create a research brief <span>↗</span>
              </button>
              <button className="text-button" onClick={() => setTab("sources")}>
                Explore trusted sources →
              </button>
            </div>
          </div>
          <div className="hero-art">
            <div className="orbit o1" />
            <div className="orbit o2" />
            <img
              src={logo}
              alt="Audit report with covered findings and research rewards"
            />
            <span className="art-label">SOURCE → COVERAGE → CLEARING</span>
          </div>
      </section>}
        <section className="contractbar">
          <div className="contract-label">
            ACTIVE CONTRACT<small>StudioNet deployment</small>
          </div>
          <input
            aria-label="Contract address"
            placeholder="0x… Paste your deployed contract"
            value={address}
            onChange={(e) => setAddress(e.target.value.trim())}
          />
          <button
            className="outline"
            disabled={busy}
            onClick={() => {
              setError("");
              sync()
                .then(() => setNotice("Authoritative contract state loaded."))
                .catch((e) => setError(String(e)));
            }}
          >
            ↻ Sync
          </button>
          {validAddress(address) && (
            <a
              href={`${explorer}/address/${address}`}
              target="_blank"
              rel="noreferrer"
              aria-label="Contract on Explorer"
            >
              ↗
            </a>
          )}
        </section>
        <div className="statusline" role="status">
          <span className={busy ? "spinner" : "status-dot"} />
          <span>{notice}</span>
          {busy && <strong>Processing</strong>}
        </div>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        {tab === "board" && (
          <>
            <div className="section-heading">
              <div>
                <p className="eyebrow">THE LIVE WORKSPACE</p>
                <h2>Coverage board</h2>
              </div>
              <div className="round-picker">
                <span>{count} briefs</span>
                <label>
                  Round{" "}
                  <input
                    type="number"
                    min="0"
                    value={roundId}
                    onChange={(e) =>
                      setRoundId(Math.max(0, Number(e.target.value)))
                    }
                  />
                </label>
              </div>
            </div>
            {!round ? (
              <div className="empty">
                <span className="empty-icon">▦</span>
                <h3>Your next research decision starts here.</h3>
                <p>
                  Sync a deployed contract to view live briefs, bids and
                  coverage.
                  <br />
                  Anyone can create a brief with their own wallet.
                </p>
                <button className="outline" onClick={() => setTab("create")}>
                  Create the first brief →
                </button>
              </div>
            ) : (
              <>
                <div className="brief-head">
                  <div>
                    <p className="eyebrow">
                      BRIEF {String(roundId).padStart(3, "0")} ·{" "}
                      {sponsor ? "YOU ARE THE SPONSOR" : "OPEN TO CURATORS"}
                    </p>
                    <h3>{round.terms.title}</h3>
                    <p>
                      Sponsor{" "}
                      <a
                        href={`${explorer}/address/${round.sponsor}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {shorten(round.sponsor)}
                      </a>{" "}
                      <span> · </span>Terms{" "}
                      <code title={round.terms_digest}>
                        {round.terms_digest.slice(0, 12)}…
                      </code>
                    </p>
                  </div>
                  {tag(active)}
                </div>
                <div className="stats">
                  {[
                    ["Budget", gen(round.terms.budget) + " GEN"],
                    ["Bids", `${round.bids.length} / 6`],
                    ["In escrow", gen(round.held) + " GEN"],
                    ["Confirmed rewards", gen(round.paid) + " GEN"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
                <div className="coverage-table">
                  <table>
                    <thead>
                      <tr>
                        <th>RESEARCH QUESTION</th>
                        {round.bids.map((b) => (
                          <th key={b.bid_id}>
                            BID {b.bid_id + 1}
                            <small>
                              {b.revealed
                                ? `${b.finding} · ${gen(b.price!)} GEN`
                                : "Sealed commitment"}
                            </small>
                            {round.selected.includes(b.bid_id) && (
                              <b className="selected-label">SELECTED</b>
                            )}
                          </th>
                        ))}
                        {!round.bids.length && <th>AWAITING CURATORS</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {round.terms.questions.map((q, i) => (
                        <tr key={q}>
                          <td>
                            <span className="qnum">Q{i + 1}</span>
                            {q}
                          </td>
                          {round.bids.map((b) => {
                            const row = round.matrix.find(
                              (r) => r.bid_id === b.bid_id,
                            );
                            const covered = row?.coverage.includes(i);
                            return (
                              <td
                                key={b.bid_id}
                                className={covered ? "cell covered" : "cell"}
                                title={
                                  covered
                                    ? row?.quotes[row.coverage.indexOf(i)]
                                    : ""
                                }
                              >
                                {covered ? (
                                  <>
                                    <b>✓</b>
                                    <span>Covered</span>
                                  </>
                                ) : row ? (
                                  <>
                                    <b>−</b>
                                    <span>No match</span>
                                  </>
                                ) : (
                                  <>
                                    <b>·</b>
                                    <span>
                                      {b.revealed
                                        ? "Pending assessment"
                                        : "Sealed"}
                                    </span>
                                  </>
                                )}
                              </td>
                            );
                          })}
                          {!round.bids.length && (
                            <td className="cell">
                              <b>·</b>
                              <span>No bids yet</span>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="workspace-bottom">
                  <section className="action-panel">
                    <p className="eyebrow">YOUR NEXT ACTION</p>
                    {active === "DRAFT" && (
                      <>
                        <h3>Fund the brief</h3>
                        <p>
                          The sponsor deposits exactly {gen(round.terms.budget)}{" "}
                          GEN. Questions and source commitments are already
                          locked.
                        </p>
                        <button
                          className="primary"
                          disabled={!canWrite || !sponsor}
                          onClick={() =>
                            transact(
                              "fund_round",
                              [roundId],
                              BigInt(round.terms.budget),
                            )
                          }
                        >
                          Deposit {gen(round.terms.budget)} GEN →
                        </button>
                      </>
                    )}
                    {active === "COMMIT" && (
                      <>
                        <h3>Offer a finding</h3>
                        <p>
                          Your locator and price stay sealed until reveal.
                          Download the reveal backup after committing.
                        </p>
                        <div className="inline-fields">
                          <label>
                            Finding ID
                            <input
                              value={finding}
                              onChange={(e) =>
                                setFinding(e.target.value.toUpperCase())
                              }
                              placeholder="L02"
                            />
                          </label>
                          <label>
                            Price · GEN
                            <input
                              value={price}
                              onChange={(e) => setPrice(e.target.value)}
                            />
                          </label>
                        </div>
                        <button
                          className="primary"
                          disabled={
                            !canWrite ||
                            sponsor ||
                            round.bids.filter(
                              (b) => b.curator === wallet.toLowerCase(),
                            ).length >= 2
                          }
                          onClick={commit}
                        >
                          Commit sealed bid →
                        </button>
                        {sponsor && (
                          <small>
                            The sponsor cannot bid on their own brief.
                          </small>
                        )}
                      </>
                    )}
                    {active === "REVEAL" && (
                      <>
                        <h3>Reveal your bids</h3>
                        <p>
                          Only your exact committed locator and price can be
                          revealed.
                        </p>
                        {mine.length === 0 && (
                          <p>
                            No reveal backup found for this wallet. Import your
                            saved JSON below.
                          </p>
                        )}
                        {mine.map((v, i) => (
                          <div className="backup" key={i}>
                            <span>
                              {v.payload.finding} ·{" "}
                              {gen(BigInt(v.payload.price))} GEN
                            </span>
                            <button
                              className="outline"
                              disabled={
                                !canWrite ||
                                v.bidId === undefined ||
                                round.bids[v.bidId]?.revealed
                              }
                              onClick={() =>
                                transact("reveal_bid", [
                                  roundId,
                                  v.bidId,
                                  canonical({
                                    ...v.payload,
                                    price: BigInt(v.payload.price),
                                  }),
                                  v.salt,
                                ])
                              }
                            >
                              {v.bidId !== undefined &&
                              round.bids[v.bidId]?.revealed
                                ? "Revealed"
                                : "Reveal →"}
                            </button>
                          </div>
                        ))}
                      </>
                    )}
                    {active === "CLEAR" && (
                      <>
                        <h3>Clear the coverage market</h3>
                        <p>
                          Validators independently assess the frozen findings.
                          Code selects the least-cost complete bundle.
                        </p>
                        <button
                          className="primary"
                          disabled={!canWrite}
                          onClick={() => transact("clear_round", [roundId])}
                        >
                          Assess & clear →
                        </button>
                      </>
                    )}
                    {["UNRESOLVED", "NO_COVER", "EXPIRED"].includes(active) && (
                      <>
                        <h3>
                          {active === "NO_COVER"
                            ? "The brief has a coverage gap."
                            : "No supported clearing result."}
                        </h3>
                        <p>
                          Funds stay reserved. After expiry anyone can make the
                          sponsor refund available.
                        </p>
                        <button
                          className="outline"
                          disabled={!canWrite || now < round.terms.expires}
                          onClick={() => transact("recover_round", [roundId])}
                        >
                          Recover expired budget →
                        </button>
                      </>
                    )}
                    {["CLEARED", "RECOVERED"].includes(active) && (
                      <>
                        <h3>
                          {myCredit
                            ? "Your payment credit"
                            : "The result is locked."}
                        </h3>
                        <p>
                          {myCredit
                            ? `${gen(myCredit.amount)} GEN · ${myCredit.kind.toLowerCase()} · ${myCredit.status.replaceAll("_", " ")}`
                            : "Only the selected curators and the sponsor’s unused budget have withdrawal credits."}
                        </p>
                        <button
                          className="primary"
                          disabled={
                            !canWrite || myCredit?.status !== "AVAILABLE"
                          }
                          onClick={() => transact("request_payout", [roundId])}
                        >
                          Withdraw available credit →
                        </button>
                      </>
                    )}
                  </section>
                  <aside className="timeline">
                    <p className="eyebrow">ROUND SCHEDULE</p>
                    {[
                      ["Commit closes", round.terms.commit_end],
                      ["Reveal closes", round.terms.reveal_end],
                      ["Recovery opens", round.terms.expires],
                    ].map(([label, time]) => (
                      <div key={String(label)}>
                        <i className={now >= Number(time) ? "complete" : ""} />
                        <span>
                          {label}
                          <strong>
                            {new Date(Number(time) * 1000).toLocaleString()}
                          </strong>
                        </span>
                      </div>
                    ))}
                    <small>
                      Windows use the protocol transaction timestamp. Refresh
                      state before signing.
                    </small>
                  </aside>
                </div>
                {mine.length > 0 && (
                  <section className="detail-panel">
                    <h3>Reveal backups</h3>
                    <p>
                      These contain bid secrets, not wallet keys. Keep a backup
                      until reveal completes.
                    </p>
                    {mine.map((v, i) => (
                      <div className="backup" key={i}>
                        <span>
                          {v.payload.finding} · Bid{" "}
                          {v.bidId === undefined ? "pending" : v.bidId + 1}
                        </span>
                        <button
                          className="text-button"
                          onClick={() => exportReveal(v)}
                        >
                          Download JSON ↓
                        </button>
                      </div>
                    ))}
                  </section>
                )}
                <details className="detail-panel">
                  <summary>Import reveal backup</summary>
                  <textarea
                    aria-label="Reveal backup JSON"
                    placeholder="Paste your exported reveal JSON"
                    value={revealImport}
                    onChange={(e) => setRevealImport(e.target.value)}
                  />
                  <button
                    className="outline"
                    onClick={() => {
                      try {
                        const v = JSON.parse(revealImport) as Reveal;
                        if (
                          v.wallet !== wallet.toLowerCase() ||
                          v.contract !== address ||
                          v.roundId !== roundId ||
                          !v.salt ||
                          !v.commitment
                        )
                          throw Error(
                            "Backup belongs to another wallet, contract or round.",
                          );
                        setReveals((x) => [
                          v,
                          ...x.filter((y) => y.commitment !== v.commitment),
                        ]);
                        setRevealImport("");
                        setNotice(
                          "Backup restored. Its commitment will be rechecked by the contract.",
                        );
                      } catch (e) {
                        setError(String(e));
                      }
                    }}
                  >
                    Import
                  </button>
                </details>
                <details className="detail-panel">
                  <summary>Confirm a finalized payout</summary>
                  <p>
                    A sent transfer stays pending until the contract verifies
                    the canonical parent and credited child receipt.
                  </p>
                  <label>
                    Recipient
                    <input
                      value={recipient}
                      placeholder={wallet || "0x…"}
                      onChange={(e) => setRecipient(e.target.value)}
                    />
                  </label>
                  <label>
                    Withdrawal parent transaction
                    <input
                      value={parent}
                      onChange={(e) => setParent(e.target.value)}
                    />
                  </label>
                  <button className="text-button" onClick={discoverChild}>
                    Find child transfer →
                  </button>
                  <label>
                    Child transaction
                    <input
                      value={child}
                      onChange={(e) => setChild(e.target.value)}
                    />
                  </label>
                  <button
                    className="outline"
                    disabled={!canWrite}
                    onClick={() =>
                      transact("confirm_payout", [
                        roundId,
                        recipient || wallet,
                        parent,
                        child,
                      ])
                    }
                  >
                    Verify transfer & confirm
                  </button>
                </details>
              </>
            )}
          </>
        )}
        {tab === "create" && (
          <section className="create-layout">
            <div className="section-heading">
              <div>
                <p className="eyebrow">DEFINE THE WORK, THEN FUND IT</p>
                <h2>A brief worth covering.</h2>
                <p>
                  Lock the questions, source revision and schedule before
                  curators commit.
                </p>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-main">
                <label>
                  Brief title
                  <input
                    value={title}
                    maxLength={120}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </label>
                <label>
                  Research questions <small>One per line · up to 4</small>
                  <textarea
                    rows={5}
                    value={questions}
                    onChange={(e) => setQuestions(e.target.value)}
                  />
                </label>
                <label>
                  Budget · GEN
                  <input
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  />
                </label>
                <div className="inline-fields">
                  <label>
                    Commit · minutes
                    <input
                      type="number"
                      min="2"
                      value={commitMinutes}
                      onChange={(e) => setCommitMinutes(e.target.value)}
                    />
                  </label>
                  <label>
                    Reveal · minutes
                    <input
                      type="number"
                      min="2"
                      value={revealMinutes}
                      onChange={(e) => setRevealMinutes(e.target.value)}
                    />
                  </label>
                  <label>
                    Recovery wait · minutes
                    <input
                      type="number"
                      min="2"
                      value={recoveryMinutes}
                      onChange={(e) => setRecoveryMinutes(e.target.value)}
                    />
                  </label>
                </div>
                <button
                  className="primary"
                  disabled={busy || !wallet || !validAddress(address)}
                  onClick={create}
                >
                  Lock brief terms →
                </button>
                <small>
                  Creation does not deposit GEN. Fund the created round in the
                  next step.
                </small>
              </div>
              <aside className="source-card">
                <span className="source-mark">↗</span>
                <p className="eyebrow">LOCKED SOURCE</p>
                <h3>
                  OpenZeppelin
                  <br />
                  Governor Bravo Audit
                </h3>
                <p>
                  Independent publisher. Exact report snapshot. Curators submit
                  finding IDs, never replacement report text.
                </p>
                <code>{resources[0].expected_digest}</code>
                <a
                  href={resources[0].canonical_url_or_api}
                  target="_blank"
                  rel="noreferrer"
                >
                  Read the source report ↗
                </a>
                <small>
                  Snapshot prepared{" "}
                  {new Date(
                    resources[0].availability_checked_at,
                  ).toLocaleDateString()}
                  . A changed article blocks clearing.
                </small>
              </aside>
            </div>
          </section>
        )}
        {tab === "sources" && (
          <>
            <div className="section-heading">
              <div>
                <p className="eyebrow">AUTHORITY BEFORE INTERPRETATION</p>
                <h2>Know where proof begins.</h2>
                <p>
                  Publisher reports establish published findings in their stated
                  scope.
                </p>
              </div>
            </div>
            <div className="library">
              {resources.map((r, i) => (
                <article key={r.resource_id}>
                  <div className="library-top">
                    <span className="source-mark">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {tag(i === 0 ? "BID SOURCE" : "CROSS OBJECT CONTROL")}
                  </div>
                  <h3>{r.repository_and_object_id}</h3>
                  <p>
                    {r.authoritative_owner} · {r.finding_ids.length} extractable
                    findings
                  </p>
                  <code>{r.expected_digest}</code>
                  <p className="scope-note">
                    {r.what_this_source_cannot_prove}
                  </p>
                  <a
                    href={r.canonical_url_or_api}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Publisher report ↗
                  </a>
                </article>
              ))}
            </div>
            <div className="scope-banner">
              <b>Coverage means the report answers the question.</b>
              <p>
                It does not certify current deployed safety, vulnerability
                status, successful fixes or curator authorship of the audit.
              </p>
            </div>
          </>
        )}
        {tab === "activity" && (
          <>
            <div className="section-heading">
              <div>
                <p className="eyebrow">TRANSACTIONS, WITH RECEIPTS</p>
                <h2>Your activity trail.</h2>
                <p>
                  Stored on this browser. Existing hashes can be reconciled
                  without sending again.
                </p>
              </div>
            </div>
            {!journal.length ? (
              <div className="empty">
                <h3>No signed activity yet.</h3>
                <p>
                  Every contract write will appear here with its transaction
                  link.
                </p>
              </div>
            ) : (
              journal.map((row) => (
                <article className="activity" key={row.hash}>
                  <div>
                    <b>{row.method.replaceAll("_", " ")}</b>
                    <small>
                      Round {row.roundId} · {shorten(row.wallet)} ·{" "}
                      {shorten(row.contract)}
                    </small>
                    <a
                      href={`${explorer}/tx/${row.hash}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {row.hash} ↗
                    </a>
                  </div>
                  {tag(row.state)}
                  <button
                    className="outline"
                    disabled={busy}
                    onClick={() => reconcile(row)}
                  >
                    Reconcile
                  </button>
                </article>
              ))
            )}
          </>
        )}
        <section className="how">
          <div>
            <span>01 / BRIEF</span>
            <h3>Ask precisely.</h3>
            <p>Seal questions, evidence sources and a real GEN budget.</p>
          </div>
          <div>
            <span>02 / COVER</span>
            <h3>Find the substance.</h3>
            <p>
              Curators bid. Validators independently read the audit findings.
            </p>
          </div>
          <div>
            <span>03 / CLEAR</span>
            <h3>Pay for enough.</h3>
            <p>The least-cost complete bundle wins. Unused budget returns.</p>
          </div>
        </section>
        <footer>
          <a
            className="brand small"
            href="#"
            onClick={(e) => e.preventDefault()}
          >
            AuditCover<span className="footer-dot">.</span>
          </a>
          <span>Evidence relevance, settled on-chain.</span>
          <span>Contract balance: {gen(BigInt(balance))} GEN</span>
        </footer>
      </main>
    </>
  );
}
