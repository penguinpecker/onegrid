"use client";
import { useState, useEffect, useCallback, useRef } from "react";

// ═══════════════════════════════════════════════════════════════════
// CONTRACT CONFIG
// ═══════════════════════════════════════════════════════════════════
const RPC_URL = "https://rpc-testnet.onelabs.cc:443";
const FAUCET_URL = "https://faucet-testnet.onelabs.cc:443/gas";
const PACKAGE_ID = "0x5046a46898293f47c591502e57c1132910e11775ac9eaf39c09b39e0125b7d3e";
const GRID_OBJECT_ID = "0xd66135557caab54c0ab9e656e61a62f78f33a608c51ef6e26f98b5482e6f897e";
const CLOCK_ID = "0x6";
const MODULE = `${PACKAGE_ID}::game`;
const GRID_SIZE = 25;
const ENTRY_FEE = 100_000_000; // 0.1 OCT in MIST
const POLL_INTERVAL = 3000;

// ═══════════════════════════════════════════════════════════════════
// THEME — OneChain brand palette (from media kit)
// ═══════════════════════════════════════════════════════════════════
const T = {
  bg: "#030F1C",
  bgCard: "#091a2e",
  bgCell: "#0c2240",
  bgCellHover: "#12305a",
  border: "#142d50",
  borderActive: "#467DFF",
  lavender: "#BFC1FF",
  blue: "#467DFF",
  blueDark: "#2F2585",
  pink: "#FE587B",
  magenta: "#F028FD",
  teal: "#2BDEAC",
  tealDark: "#1fac88",
  text: "#F7F7F8",
  textDim: "#8094b4",
  textMuted: "#3d5a80",
  gradient: "linear-gradient(135deg, #BFC1FF, #467DFF)",
  gradientPink: "linear-gradient(135deg, #FE587B, #F028FD)",
  gradientTeal: "linear-gradient(135deg, #2BDEAC, #1fac88)",
};

// ═══════════════════════════════════════════════════════════════════
// SDK — dynamic import to avoid SSR issues
// ═══════════════════════════════════════════════════════════════════
let SuiClient, Transaction, Ed25519Keypair, fromBase64, toBase64;
const sdkReady = (typeof window !== "undefined")
  ? Promise.all([
      import("@onelabs/sui/client"),
      import("@onelabs/sui/transactions"),
      import("@onelabs/sui/keypairs/ed25519"),
      import("@onelabs/sui/utils"),
    ]).then(([clientMod, txMod, kpMod, utilsMod]) => {
      SuiClient = clientMod.SuiClient;
      Transaction = txMod.Transaction;
      Ed25519Keypair = kpMod.Ed25519Keypair;
      fromBase64 = utilsMod.fromBase64;
      toBase64 = utilsMod.toBase64;
    })
  : Promise.resolve();

// ═══════════════════════════════════════════════════════════════════
// WALLET — burner keypair in localStorage
// ═══════════════════════════════════════════════════════════════════
function getOrCreateWallet() {
  const stored = localStorage.getItem("onegrid_wallet");
  if (stored) {
    try {
      const raw = fromBase64(stored);
      const kp = Ed25519Keypair.fromSecretKey(raw);
      return kp;
    } catch (e) {
      localStorage.removeItem("onegrid_wallet");
    }
  }
  const kp = new Ed25519Keypair();
  localStorage.setItem("onegrid_wallet", toBase64(kp.getSecretKey()));
  return kp;
}

async function requestFaucet(address) {
  try {
    const res = await fetch(FAUCET_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ FixedAmountRequest: { recipient: address } }),
    });
    const data = await res.json();
    return !data.error;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// RPC HELPERS
// ═══════════════════════════════════════════════════════════════════
async function readGridState(client) {
  try {
    const obj = await client.getObject({
      id: GRID_OBJECT_ID,
      options: { showContent: true },
    });
    const f = obj.data?.content?.fields;
    if (!f) return null;
    return {
      currentRoundId: Number(f.current_round_id),
      roundStartMs: Number(f.round_start_ms),
      roundEndMs: Number(f.round_end_ms),
      roundResolved: f.round_resolved,
      totalPlayers: Number(f.total_players),
      poolValue: Number(f.pool),
      totalRounds: Number(f.total_rounds),
      totalVolume: Number(f.total_volume),
      entryFee: Number(f.entry_fee),
    };
  } catch (e) {
    console.error("readGridState error:", e);
    return null;
  }
}

async function readCellCounts(client, sender) {
  try {
    const tx = new Transaction();
    tx.moveCall({
      target: `${MODULE}::get_cell_counts`,
      arguments: [tx.object(GRID_OBJECT_ID)],
    });
    const result = await client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender,
    });
    const returnValues = result?.results?.[0]?.returnValues;
    if (returnValues && returnValues.length > 0) {
      const bytes = returnValues[0][0];
      // BCS decode vector<u64>: first byte is length, then u64 little-endian
      const arr = new Uint8Array(bytes);
      const count = arr[0]; // ULEB128 but for 25 it's just 1 byte
      const counts = [];
      for (let i = 0; i < count; i++) {
        let val = 0;
        for (let b = 0; b < 8; b++) {
          val += arr[1 + i * 8 + b] * (256 ** b);
        }
        counts.push(val);
      }
      return counts;
    }
    return Array(25).fill(0);
  } catch (e) {
    console.error("readCellCounts error:", e);
    return Array(25).fill(0);
  }
}

async function readPlayerCell(client, sender, playerAddress) {
  try {
    const tx = new Transaction();
    tx.moveCall({
      target: `${MODULE}::get_player_cell`,
      arguments: [tx.object(GRID_OBJECT_ID), tx.pure.address(playerAddress)],
    });
    const result = await client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender,
    });
    const returnValues = result?.results?.[0]?.returnValues;
    if (returnValues && returnValues.length > 0) {
      const bytes = new Uint8Array(returnValues[0][0]);
      let val = 0;
      for (let b = 0; b < 8; b++) val += bytes[b] * (256 ** b);
      return val >= GRID_SIZE ? null : val;
    }
    return null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════

const Logo = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <div style={{
      width: 36, height: 36, borderRadius: 8,
      background: T.gradient,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 900, fontSize: 18, color: "#fff",
      boxShadow: "0 0 20px rgba(70,125,255,0.4)",
    }}>O</div>
    <div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 800, fontSize: 18, color: T.text,
        letterSpacing: "-0.5px",
      }}>
        One<span style={{ color: T.teal }}>Grid</span>
      </div>
      <div style={{
        fontSize: 9, color: T.textDim,
        letterSpacing: "2px", textTransform: "uppercase",
        marginTop: -2,
      }}>on OneChain</div>
    </div>
  </div>
);

const StatPill = ({ label, value, color, icon }) => (
  <div style={{
    background: T.bgCard,
    border: `1px solid ${T.border}`,
    borderRadius: 12, padding: "10px 16px",
    display: "flex", alignItems: "center", gap: 10,
    minWidth: 130,
  }}>
    <div style={{
      width: 32, height: 32, borderRadius: 8,
      background: `${color}15`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 16,
    }}>{icon}</div>
    <div>
      <div style={{ fontSize: 10, color: T.textDim, letterSpacing: "1px", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: color || T.text, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
    </div>
  </div>
);

const Timer = ({ seconds }) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const isUrgent = seconds <= 10;
  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 42, fontWeight: 900,
      color: isUrgent ? T.pink : T.text,
      textShadow: isUrgent ? "0 0 30px rgba(254,88,123,0.6)" : "0 0 20px rgba(70,125,255,0.3)",
      transition: "color 0.3s, text-shadow 0.3s",
      letterSpacing: "-2px",
      animation: isUrgent ? "pulse 1s ease-in-out infinite" : "none",
    }}>
      {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
    </div>
  );
};

const Cell = ({ index, players, isMine, isWinner, onClick, disabled }) => {
  const row = Math.floor(index / 5);
  const col = index % 5;
  const hasPlayers = players > 0;

  let bg = T.bgCell;
  let borderColor = T.border;
  let shadow = "none";
  let textColor = T.textMuted;

  if (isWinner) {
    bg = `${T.teal}20`;
    borderColor = T.teal;
    shadow = `0 0 20px ${T.teal}40, inset 0 0 20px ${T.teal}10`;
    textColor = T.teal;
  } else if (isMine) {
    bg = `${T.blue}25`;
    borderColor = T.blue;
    shadow = `0 0 15px ${T.blue}30`;
    textColor = T.blue;
  } else if (hasPlayers) {
    const intensity = Math.min(players / 5, 1);
    bg = `rgba(70, 125, 255, ${0.08 + intensity * 0.15})`;
    borderColor = `rgba(70, 125, 255, ${0.3 + intensity * 0.4})`;
    textColor = T.lavender;
  }

  return (
    <button
      onClick={() => !disabled && onClick(index)}
      style={{
        width: "100%", aspectRatio: "1",
        background: bg,
        border: `1.5px solid ${borderColor}`,
        borderRadius: 10,
        cursor: disabled ? "default" : "pointer",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 2,
        transition: "all 0.2s ease",
        boxShadow: shadow,
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        if (!disabled && !isMine && !isWinner) {
          e.currentTarget.style.background = T.bgCellHover;
          e.currentTarget.style.borderColor = T.borderActive;
          e.currentTarget.style.transform = "scale(1.03)";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !isMine && !isWinner) {
          e.currentTarget.style.background = bg;
          e.currentTarget.style.borderColor = borderColor;
          e.currentTarget.style.transform = "scale(1)";
        }
      }}
    >
      {isMine && (
        <div style={{
          position: "absolute", top: 4, right: 4,
          width: 6, height: 6, borderRadius: "50%",
          background: T.blue,
          boxShadow: `0 0 8px ${T.blue}`,
        }} />
      )}
      {isWinner && (
        <div style={{
          position: "absolute", inset: 0,
          background: `radial-gradient(circle, ${T.teal}10 0%, transparent 70%)`,
          animation: "winGlow 2s ease-in-out infinite",
        }} />
      )}
      <div style={{
        fontSize: 11, fontWeight: 600, color: textColor,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {hasPlayers ? players : ""}
      </div>
      <div style={{
        fontSize: 8, color: T.textMuted,
        letterSpacing: "0.5px",
      }}>
        {row},{col}
      </div>
    </button>
  );
};

// ═══════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════
export default function Page() {
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [address, setAddress] = useState(null);
  const [balance, setBalance] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const [funding, setFunding] = useState(false);
  const [claiming, setClaiming] = useState(false);

  // Grid state
  const [roundId, setRoundId] = useState(0);
  const [roundEndMs, setRoundEndMs] = useState(0);
  const [roundResolved, setRoundResolved] = useState(true);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [totalPot, setTotalPot] = useState(0);
  const [cellCounts, setCellCounts] = useState(Array(25).fill(0));
  const [myCell, setMyCell] = useState(null);
  const [winningCell, setWinningCell] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalRounds, setTotalRounds] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [lastResolvedRound, setLastResolvedRound] = useState(0);
  const [recentRounds, setRecentRounds] = useState([]);

  const clientRef = useRef(null);
  const prevRoundRef = useRef(0);

  // Load SDK
  useEffect(() => {
    sdkReady.then(() => {
      setSdkLoaded(true);
      clientRef.current = new SuiClient({ url: RPC_URL });
    });
  }, []);

  // Connect wallet
  const connectWallet = useCallback(async () => {
    if (!sdkLoaded) return;
    setConnecting(true);
    try {
      const kp = getOrCreateWallet();
      const addr = kp.getPublicKey().toSuiAddress();
      setWallet(kp);
      setAddress(addr);

      // Check balance
      const bal = await clientRef.current.getBalance({ owner: addr });
      const octBalance = Number(bal.totalBalance);
      setBalance(octBalance);

      // Auto-fund if low
      if (octBalance < ENTRY_FEE * 2) {
        setFunding(true);
        await requestFaucet(addr);
        // Recheck balance
        const bal2 = await clientRef.current.getBalance({ owner: addr });
        setBalance(Number(bal2.totalBalance));
        setFunding(false);
      }
    } catch (e) {
      console.error("connect error:", e);
    }
    setConnecting(false);
  }, [sdkLoaded]);

  // Poll grid state
  useEffect(() => {
    if (!sdkLoaded || !clientRef.current) return;

    const dummySender = "0x0000000000000000000000000000000000000000000000000000000000000000";

    const poll = async () => {
      const state = await readGridState(clientRef.current);
      if (!state) return;

      // Detect round change — if previous round was active and now resolved, show result
      if (prevRoundRef.current === state.currentRoundId && !roundResolved && state.roundResolved) {
        // Round just resolved — read winning cell from events
        // For now we detect it from cell counts (the occupied cells)
        setShowResult(true);
        setTimeout(() => setShowResult(false), 5000);
      }

      if (state.currentRoundId !== prevRoundRef.current) {
        // New round started
        setMyCell(null);
        setWinningCell(null);
        setShowResult(false);
        prevRoundRef.current = state.currentRoundId;
      }

      setRoundId(state.currentRoundId);
      setRoundEndMs(state.roundEndMs);
      setRoundResolved(state.roundResolved);
      setTotalPlayers(state.totalPlayers);
      setTotalPot(state.poolValue);
      setTotalRounds(state.totalRounds);
      setTotalVolume(state.totalVolume);

      // Read cell counts
      const counts = await readCellCounts(clientRef.current, dummySender);
      setCellCounts(counts);

      // Read player's cell if connected
      if (address) {
        const pc = await readPlayerCell(clientRef.current, dummySender, address);
        setMyCell(pc);

        // Refresh balance
        try {
          const bal = await clientRef.current.getBalance({ owner: address });
          setBalance(Number(bal.totalBalance));
        } catch {}
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [sdkLoaded, address, roundResolved]);

  // Countdown timer
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((roundEndMs - now) / 1000));
      setTimeLeft(remaining);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [roundEndMs]);

  // Pick cell transaction
  const handleCellClick = useCallback(async (cellIndex) => {
    if (!wallet || !clientRef.current || myCell !== null || roundResolved || timeLeft <= 0 || claiming) return;
    setClaiming(true);

    try {
      const tx = new Transaction();
      // Split entry fee from gas coin — SDK handles coin selection automatically
      const [paymentCoin] = tx.splitCoins(tx.gas, [ENTRY_FEE]);

      tx.moveCall({
        target: `${MODULE}::pick_cell`,
        arguments: [
          tx.object(GRID_OBJECT_ID),
          tx.pure.u64(cellIndex),
          paymentCoin,
          tx.object(CLOCK_ID),
        ],
      });
      tx.setGasBudget(10_000_000);

      const result = await clientRef.current.signAndExecuteTransaction({
        signer: wallet,
        transaction: tx,
        options: { showEffects: true, showEvents: true },
      });

      if (result.effects?.status?.status === "success") {
        setMyCell(cellIndex);
        setCellCounts(prev => {
          const next = [...prev];
          next[cellIndex] = (next[cellIndex] || 0) + 1;
          return next;
        });
        // Refresh balance
        const bal = await clientRef.current.getBalance({ owner: address });
        setBalance(Number(bal.totalBalance));
      } else {
        console.error("pick_cell failed:", result.effects?.status);
        alert("Transaction failed: " + (result.effects?.status?.error || "unknown error"));
      }
    } catch (e) {
      console.error("pick_cell error:", e);
      alert("Error: " + e.message);
    }

    setClaiming(false);
  }, [wallet, address, myCell, roundResolved, timeLeft, claiming]);

  const phase = roundResolved ? "waiting" : timeLeft <= 0 ? "resolving" : "active";
  const potOCT = (totalPot / 1_000_000_000).toFixed(2);
  const balOCT = (balance / 1_000_000_000).toFixed(2);
  const volOCT = (totalVolume / 1_000_000_000).toFixed(1);

  return (
    <div style={{
      minHeight: "100vh",
      background: T.bg,
      color: T.text,
      fontFamily: "'DM Sans', -apple-system, sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background glow */}
      <div style={{
        position: "fixed", top: "-20%", left: "-10%",
        width: "50%", height: "50%",
        background: "radial-gradient(circle, rgba(191,193,255,0.08) 0%, transparent 60%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "fixed", bottom: "-20%", right: "-10%",
        width: "50%", height: "50%",
        background: "radial-gradient(circle, rgba(70,125,255,0.06) 0%, transparent 60%)",
        pointerEvents: "none",
      }} />

      {/* Header */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 24px",
        borderBottom: `1px solid ${T.border}`,
        background: `${T.bg}ee`,
        backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <Logo />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {address && (
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13, color: T.teal,
              padding: "6px 12px",
              background: `${T.teal}10`,
              borderRadius: 8,
              border: `1px solid ${T.teal}30`,
            }}>
              {balOCT} OCT
            </div>
          )}
          <button
            onClick={address ? null : connectWallet}
            disabled={connecting || funding}
            style={{
              background: address ? `${T.teal}15` : T.gradient,
              border: address ? `1px solid ${T.teal}40` : "none",
              borderRadius: 10,
              padding: "8px 18px",
              color: address ? T.teal : "#fff",
              fontSize: 13, fontWeight: 600,
              cursor: address ? "default" : "pointer",
              transition: "all 0.2s",
              opacity: connecting || funding ? 0.6 : 1,
            }}
          >
            {connecting ? "Connecting..." : funding ? "Funding..." : address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Play Now"}
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "28px 24px",
        display: "grid",
        gridTemplateColumns: "1fr 380px",
        gap: 24,
      }}>
        {/* Left — Game Area */}
        <div>
          {/* Round Info */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 20,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{
                background: `${T.blue}15`,
                border: `1px solid ${T.blue}30`,
                borderRadius: 8, padding: "4px 12px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12, color: T.blue,
              }}>
                Round #{roundId}
              </div>
              <div style={{ fontSize: 12, color: T.textDim }}>
                {phase === "resolving" ? "Resolving..." : phase === "waiting" ? "Starting next round..." : `${totalPlayers} players`}
              </div>
            </div>
            <div style={{
              fontSize: 11, color: T.textMuted,
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {totalRounds} rounds · {volOCT} OCT vol
            </div>
          </div>

          {/* Timer + Pot */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 24,
            padding: "20px 28px",
            background: T.bgCard,
            border: `1px solid ${T.border}`,
            borderRadius: 16,
          }}>
            <div>
              <div style={{ fontSize: 10, color: T.textDim, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 4 }}>
                {phase === "active" ? "Time Remaining" : phase === "resolving" ? "Picking Winner..." : "Next Round Soon"}
              </div>
              {phase === "resolving" ? (
                <div style={{
                  fontSize: 42, fontWeight: 900,
                  background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  animation: "pulse 1s ease-in-out infinite",
                }}>···</div>
              ) : (
                <Timer seconds={timeLeft} />
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: T.textDim, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 4 }}>
                Prize Pool
              </div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 32, fontWeight: 900,
                color: T.teal,
                textShadow: `0 0 30px ${T.teal}30`,
              }}>
                {potOCT} <span style={{ fontSize: 16, color: T.textDim }}>OCT</span>
              </div>
            </div>
          </div>

          {/* Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 6,
            padding: 16,
            background: T.bgCard,
            border: `1px solid ${T.border}`,
            borderRadius: 16,
            position: "relative",
          }}>
            {cellCounts.map((count, i) => (
              <Cell
                key={i}
                index={i}
                players={count}
                isMine={myCell === i}
                isWinner={winningCell === i}
                onClick={handleCellClick}
                disabled={!address || myCell !== null || phase !== "active" || timeLeft <= 0 || claiming}
              />
            ))}

            {/* Claiming overlay */}
            {claiming && (
              <div style={{
                position: "absolute", inset: 0,
                background: "rgba(3,15,28,0.7)",
                backdropFilter: "blur(2px)",
                borderRadius: 16,
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 10,
              }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 14, color: T.lavender,
                  animation: "pulse 1s ease-in-out infinite",
                }}>Claiming cell...</div>
              </div>
            )}

            {/* Result overlay */}
            {showResult && (
              <div style={{
                position: "absolute", inset: 0,
                background: "rgba(3,15,28,0.85)",
                backdropFilter: "blur(4px)",
                borderRadius: 16,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                animation: "fadeIn 0.3s ease",
                zIndex: 10,
              }}>
                <div style={{
                  fontSize: 11, color: T.textDim, letterSpacing: "3px",
                  textTransform: "uppercase", marginBottom: 8,
                }}>Round Resolved</div>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 20, fontWeight: 700,
                  color: T.teal,
                }}>
                  Winners paid automatically!
                </div>
              </div>
            )}
          </div>

          {/* Status message */}
          <div style={{
            textAlign: "center", marginTop: 12,
            fontSize: 11, color: T.textDim,
          }}>
            {!address
              ? 'Click "Play Now" to get a burner wallet + free testnet OCT'
              : phase === "active" && myCell === null && !claiming
              ? `Click a cell to enter · 0.1 OCT per cell`
              : myCell !== null
              ? `You picked cell (${Math.floor(myCell / 5)},${myCell % 5}) — waiting for round to end`
              : phase === "resolving"
              ? "Resolver bot is picking the winner..."
              : "Next round starting soon..."}
          </div>
        </div>

        {/* Right Sidebar */}
        <div>
          {/* Stats */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: 8, marginBottom: 20,
          }}>
            <StatPill label="Entry Fee" value="0.1 OCT" color={T.blue} icon="◆" />
            <StatPill label="Round" value="60s" color={T.lavender} icon="◷" />
            <StatPill label="Players" value={totalPlayers} color={T.teal} icon="◉" />
            <StatPill label="Fee" value="5%" color={T.pink} icon="%" />
          </div>

          {/* How It Works */}
          <div style={{
            background: T.bgCard,
            border: `1px solid ${T.border}`,
            borderRadius: 14, padding: 18,
            marginBottom: 20,
          }}>
            <div style={{
              fontSize: 11, color: T.textDim, letterSpacing: "2px",
              textTransform: "uppercase", marginBottom: 14,
            }}>How It Works</div>
            {[
              { step: "01", text: "Click 'Play Now' — instant burner wallet + free OCT", color: T.blue },
              { step: "02", text: "Pick any cell on the 5×5 grid (0.1 OCT)", color: T.blue },
              { step: "03", text: "Wait for the 60s round to end", color: T.lavender },
              { step: "04", text: "Random occupied cell wins — pot auto-paid!", color: T.teal },
            ].map((item) => (
              <div key={item.step} style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                marginBottom: 10,
              }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10, fontWeight: 700,
                  color: item.color, opacity: 0.7,
                  minWidth: 20,
                }}>{item.step}</div>
                <div style={{ fontSize: 12, color: T.textDim, lineHeight: 1.4 }}>
                  {item.text}
                </div>
              </div>
            ))}
          </div>

          {/* Contract Info */}
          <div style={{
            background: T.bgCard,
            border: `1px solid ${T.border}`,
            borderRadius: 14, padding: 18,
          }}>
            <div style={{
              fontSize: 11, color: T.textDim, letterSpacing: "2px",
              textTransform: "uppercase", marginBottom: 14,
            }}>Contract</div>
            <div style={{ fontSize: 11, color: T.textMuted, fontFamily: "'JetBrains Mono', monospace", wordBreak: "break-all", lineHeight: 1.6 }}>
              <div style={{ color: T.textDim, marginBottom: 4 }}>Package</div>
              <a href={`https://onescan.cc/testnet/object/${PACKAGE_ID}`} target="_blank" rel="noopener" style={{ color: T.blue, textDecoration: "none" }}>
                {PACKAGE_ID.slice(0, 16)}...{PACKAGE_ID.slice(-8)}
              </a>
              <div style={{ color: T.textDim, marginBottom: 4, marginTop: 10 }}>Grid Object</div>
              <a href={`https://onescan.cc/testnet/object/${GRID_OBJECT_ID}`} target="_blank" rel="noopener" style={{ color: T.blue, textDecoration: "none" }}>
                {GRID_OBJECT_ID.slice(0, 16)}...{GRID_OBJECT_ID.slice(-8)}
              </a>
            </div>
          </div>

          {/* OneChain badge */}
          <div style={{
            marginTop: 16, textAlign: "center",
            padding: "12px",
            borderRadius: 10,
            border: `1px solid ${T.border}`,
            background: `${T.bgCard}80`,
          }}>
            <div style={{ fontSize: 10, color: T.textMuted, letterSpacing: "1px" }}>
              Built on <span style={{ color: T.blue, fontWeight: 600 }}>OneChain</span> · Move Smart Contracts
            </div>
            <div style={{ fontSize: 9, color: T.textMuted, marginTop: 2 }}>
              Testnet · onescan.cc
            </div>
          </div>
        </div>
      </div>

      {/* Global Styles */}
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { -webkit-font-smoothing: antialiased; }
        button { font-family: inherit; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes winGlow { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.8; } }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${T.bg}; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
        @media (max-width: 800px) {
          div[style*="gridTemplateColumns: 1fr 380px"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
