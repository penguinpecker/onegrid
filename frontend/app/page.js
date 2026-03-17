"use client";
import { useState, useEffect, useCallback, useRef } from "react";

// ═══════════════════════════════════════════════════════════════════
// THEME — OneChain brand palette
// ═══════════════════════════════════════════════════════════════════
const T = {
  // OneChain official brand — from docs.onelabs.cc/MediaMaterial
  bg: "#030F1C",
  bgCard: "#091a2e",
  bgCell: "#0c2240",
  bgCellHover: "#12305a",
  bgCellClaimed: "#1a3f78",
  bgCellWin: "#2BDEAC",
  bgCellMine: "#467DFF",
  border: "#142d50",
  borderActive: "#467DFF",
  // Brand primaries
  lavender: "#BFC1FF",    // OneChain primary 1
  blue: "#467DFF",        // OneChain primary 2
  blueDark: "#2F2585",    // Dark purple from their palette
  // Accents from their site CSS
  pink: "#FE587B",
  magenta: "#F028FD",
  teal: "#2BDEAC",
  tealDark: "#1fac88",
  // Text
  text: "#F7F7F8",
  textDim: "#8094b4",
  textMuted: "#3d5a80",
  // Brand gradients (from media kit radial gradient)
  gradient: "linear-gradient(135deg, #BFC1FF, #467DFF)",
  gradientPink: "linear-gradient(135deg, #FE587B, #F028FD)",
  gradientTeal: "linear-gradient(135deg, #2BDEAC, #1fac88)",
};

// ═══════════════════════════════════════════════════════════════════
// MOCK DATA — will be replaced with @onelabs/sui SDK calls
// ═══════════════════════════════════════════════════════════════════
const GRID_SIZE = 25;
const ENTRY_FEE = 0.1; // OCT
const ROUND_DURATION = 60; // seconds

const generateMockCells = () => {
  return Array.from({ length: GRID_SIZE }, () => ({
    players: Math.random() > 0.6 ? Math.floor(Math.random() * 5) + 1 : 0,
  }));
};

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
      textShadow: isUrgent
        ? "0 0 30px rgba(254,88,123,0.6)"
        : "0 0 20px rgba(117,75,230,0.3)",
      transition: "color 0.3s, text-shadow 0.3s",
      letterSpacing: "-2px",
      animation: isUrgent ? "pulse 1s ease-in-out infinite" : "none",
    }}>
      {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
    </div>
  );
};

const Cell = ({ index, players, isSelected, isMine, isWinner, onClick, disabled }) => {
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
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
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

const RecentRound = ({ round }) => (
  <div style={{
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 14px",
    background: T.bgCard,
    border: `1px solid ${T.border}`,
    borderRadius: 10,
    marginBottom: 6,
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11, color: T.textDim,
      }}>#{round.id}</div>
      <div style={{
        width: 20, height: 20, borderRadius: 5,
        background: `${T.teal}20`,
        border: `1px solid ${T.teal}40`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, color: T.teal, fontWeight: 700,
        fontFamily: "'JetBrains Mono', monospace",
      }}>{round.winningCell}</div>
    </div>
    <div style={{
      fontSize: 12, fontWeight: 700, color: T.teal,
      fontFamily: "'JetBrains Mono', monospace",
    }}>{round.pot} OCT</div>
    <div style={{
      fontSize: 10, color: T.textDim,
    }}>{round.players}p</div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════
export default function Page() {
  const [timeLeft, setTimeLeft] = useState(47);
  const [roundId, setRoundId] = useState(12);
  const [cells, setCells] = useState(() => generateMockCells());
  const [myCell, setMyCell] = useState(null);
  const [winningCell, setWinningCell] = useState(null);
  const [totalPot, setTotalPot] = useState(2.4);
  const [totalPlayers, setTotalPlayers] = useState(8);
  const [connected, setConnected] = useState(false);
  const [balance, setBalance] = useState(4.82);
  const [showResult, setShowResult] = useState(false);
  const [phase, setPhase] = useState("active"); // active | resolving | result

  // Mock recent rounds
  const recentRounds = [
    { id: 11, winningCell: 14, pot: "3.2", players: 12 },
    { id: 10, winningCell: 7, pot: "1.8", players: 6 },
    { id: 9, winningCell: 22, pot: "5.1", players: 18 },
    { id: 8, winningCell: 3, pot: "2.0", players: 8 },
    { id: 7, winningCell: 19, pot: "4.5", players: 15 },
  ];

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          // Simulate round resolution
          setPhase("resolving");
          setTimeout(() => {
            const occupiedCells = cells
              .map((c, i) => (c.players > 0 ? i : -1))
              .filter((i) => i >= 0);
            const winner = occupiedCells[Math.floor(Math.random() * occupiedCells.length)];
            setWinningCell(winner);
            setPhase("result");
            setShowResult(true);

            // Start new round after 5s
            setTimeout(() => {
              setShowResult(false);
              setWinningCell(null);
              setMyCell(null);
              setCells(generateMockCells());
              setRoundId((r) => r + 1);
              setTotalPot(0);
              setTotalPlayers(0);
              setPhase("active");
            }, 5000);
          }, 2000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cells]);

  // Reset timer on new round
  useEffect(() => {
    if (phase === "active") setTimeLeft(ROUND_DURATION);
  }, [phase]);

  const handleCellClick = (index) => {
    if (myCell !== null || phase !== "active" || timeLeft <= 0) return;
    if (!connected) {
      setConnected(true);
      setBalance(4.82);
    }
    setMyCell(index);
    setCells((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], players: next[index].players + 1 };
      return next;
    });
    setTotalPot((p) => +(p + ENTRY_FEE).toFixed(1));
    setTotalPlayers((p) => p + 1);
  };

  const totalCellPlayers = cells.reduce((sum, c) => sum + c.players, 0);

  return (
    <div style={{
      minHeight: "100vh",
      background: T.bg,
      color: T.text,
      fontFamily: "'DM Sans', -apple-system, sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background glow effects */}
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
          {connected && (
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13, color: T.teal,
              padding: "6px 12px",
              background: `${T.teal}10`,
              borderRadius: 8,
              border: `1px solid ${T.teal}30`,
            }}>
              {balance.toFixed(2)} OCT
            </div>
          )}
          <button
            onClick={() => setConnected(!connected)}
            style={{
              background: connected ? `${T.teal}15` : T.gradient,
              border: connected ? `1px solid ${T.teal}40` : "none",
              borderRadius: 10,
              padding: "8px 18px",
              color: connected ? T.teal : "#fff",
              fontSize: 13, fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {connected ? "0x8f...3a2b" : "Play Now"}
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
          {/* Round Info Bar */}
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
              <div style={{
                fontSize: 12, color: T.textDim,
              }}>
                {phase === "resolving" ? "Resolving..." : phase === "result" ? "Round Complete" : `${totalPlayers} players`}
              </div>
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
                {phase === "active" ? "Time Remaining" : phase === "resolving" ? "Picking Winner..." : "Winner Found!"}
              </div>
              {phase === "resolving" ? (
                <div style={{
                  fontSize: 42, fontWeight: 900,
                  background: T.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  animation: "pulse 1s ease-in-out infinite",
                }}>
                  ···
                </div>
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
                {totalPot.toFixed(1)} <span style={{ fontSize: 16, color: T.textDim }}>OCT</span>
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
            {cells.map((cell, i) => (
              <Cell
                key={i}
                index={i}
                players={cell.players}
                isSelected={false}
                isMine={myCell === i}
                isWinner={winningCell === i}
                onClick={handleCellClick}
                disabled={myCell !== null || phase !== "active" || timeLeft <= 0}
              />
            ))}

            {/* Result overlay */}
            {showResult && winningCell !== null && (
              <div style={{
                position: "absolute", inset: 0,
                background: "rgba(2,10,24,0.85)",
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
                }}>Winning Cell</div>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 56, fontWeight: 900,
                  background: T.gradientTeal,
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  textShadow: "none",
                }}>
                  {Math.floor(winningCell / 5)},{winningCell % 5}
                </div>
                <div style={{
                  marginTop: 12,
                  padding: "6px 16px",
                  borderRadius: 8,
                  background: myCell === winningCell ? `${T.teal}20` : `${T.pink}20`,
                  border: `1px solid ${myCell === winningCell ? T.teal : T.pink}40`,
                  color: myCell === winningCell ? T.teal : T.pink,
                  fontSize: 14, fontWeight: 700,
                }}>
                  {myCell === null
                    ? "You didn't play"
                    : myCell === winningCell
                    ? `YOU WON ${totalPot.toFixed(1)} OCT!`
                    : "Better luck next round"}
                </div>
              </div>
            )}
          </div>

          {/* Entry fee notice */}
          <div style={{
            textAlign: "center", marginTop: 12,
            fontSize: 11, color: T.textDim,
          }}>
            {phase === "active" && myCell === null
              ? `Click a cell to enter · ${ENTRY_FEE} OCT per cell`
              : myCell !== null
              ? `You picked cell (${Math.floor(myCell / 5)},${myCell % 5})`
              : ""}
          </div>
        </div>

        {/* Right Sidebar */}
        <div>
          {/* Stats Grid */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: 8, marginBottom: 20,
          }}>
            <StatPill label="Entry Fee" value={`${ENTRY_FEE} OCT`} color={T.blue} icon="◆" />
            <StatPill label="Round" value={`${ROUND_DURATION}s`} color={T.lavender} icon="◷" />
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
              { step: "01", text: "Pick any cell on the 5×5 grid", color: T.blue },
              { step: "02", text: "Pay 0.1 OCT entry fee", color: T.blue },
              { step: "03", text: "Wait for the 60s round to end", color: T.lavender },
              { step: "04", text: "Random occupied cell wins the pot", color: T.teal },
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

          {/* Recent Rounds */}
          <div style={{
            background: T.bgCard,
            border: `1px solid ${T.border}`,
            borderRadius: 14, padding: 18,
          }}>
            <div style={{
              fontSize: 11, color: T.textDim, letterSpacing: "2px",
              textTransform: "uppercase", marginBottom: 14,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span>Recent Rounds</span>
              <span style={{ fontSize: 9, color: T.textMuted }}>CELL · POT · PLAYERS</span>
            </div>
            {recentRounds.map((round) => (
              <RecentRound key={round.id} round={round} />
            ))}
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
              onescan.cc · Testnet
            </div>
          </div>
        </div>
      </div>

      {/* Global Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body { 
          background: ${T.bg}; 
          margin: 0;
          -webkit-font-smoothing: antialiased;
        }
        
        button { font-family: inherit; }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        
        @keyframes winGlow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${T.bg}; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
        
        /* Mobile responsive */
        @media (max-width: 800px) {
          div[style*="gridTemplateColumns: 1fr 380px"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
