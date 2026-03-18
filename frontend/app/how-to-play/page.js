"use client";

const T = {
  bg: "#030F1C", bgCard: "#091a2e", bgCell: "#0c2240",
  border: "#142d50", borderActive: "#467DFF",
  lavender: "#BFC1FF", blue: "#467DFF",
  pink: "#FE587B", teal: "#2BDEAC",
  text: "#F7F7F8", textDim: "#8094b4", textMuted: "#3d5a80",
  gradient: "linear-gradient(135deg, #BFC1FF, #467DFF)",
};

const Step = ({ number, title, description, icon }) => (
  <div style={{
    display: "flex", gap: 20, alignItems: "flex-start",
    padding: "24px 0", borderBottom: `1px solid ${T.border}`,
  }}>
    <div style={{
      minWidth: 56, height: 56, borderRadius: 14,
      background: `${T.blue}15`, border: `1px solid ${T.blue}30`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 24,
    }}>{icon}</div>
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          color: T.teal, fontWeight: 700,
        }}>STEP {number}</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{title}</span>
      </div>
      <div style={{ fontSize: 14, color: T.textDim, lineHeight: 1.7 }}>{description}</div>
    </div>
  </div>
);

const InfoCard = ({ title, value, sub, color }) => (
  <div style={{
    background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 14,
    padding: "20px 24px", textAlign: "center",
  }}>
    <div style={{ fontSize: 11, color: T.textMuted, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 8 }}>{title}</div>
    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 900, color: color || T.text }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>{sub}</div>}
  </div>
);

export default function HowToPlay() {
  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      {/* Background glow */}
      <div style={{ position: "fixed", top: "-20%", left: "-10%", width: "50%", height: "50%", background: "radial-gradient(circle, rgba(191,193,255,0.08) 0%, transparent 60%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "-20%", right: "-10%", width: "50%", height: "50%", background: "radial-gradient(circle, rgba(70,125,255,0.06) 0%, transparent 60%)", pointerEvents: "none" }} />

      {/* Header */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 24px", borderBottom: `1px solid ${T.border}`,
        background: `${T.bg}ee`, backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: T.gradient,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 900, fontSize: 18, color: "#fff",
            boxShadow: "0 0 20px rgba(70,125,255,0.4)",
          }}>O</div>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: 18, color: T.text, letterSpacing: "-0.5px" }}>
              One<span style={{ color: T.teal }}>Grid</span>
            </div>
            <div style={{ fontSize: 9, color: T.textDim, letterSpacing: "2px", textTransform: "uppercase", marginTop: -2 }}>on OneChain</div>
          </div>
        </a>
        <a href="/" style={{
          background: T.gradient, border: "none", borderRadius: 10,
          padding: "10px 24px", color: "#fff", fontSize: 13, fontWeight: 600,
          textDecoration: "none", transition: "all 0.2s",
        }}>Play Now</a>
      </header>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{
            fontSize: 11, color: T.teal, letterSpacing: "4px", textTransform: "uppercase",
            fontFamily: "'JetBrains Mono', monospace", marginBottom: 12,
          }}>HOW TO PLAY</div>
          <h1 style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 36, fontWeight: 900,
            color: T.text, lineHeight: 1.2, marginBottom: 16,
          }}>
            Claim Cells. Win OCT. Earn <span style={{ color: T.teal }}>$GRID</span>.
          </h1>
          <p style={{ fontSize: 16, color: T.textDim, maxWidth: 500, margin: "0 auto", lineHeight: 1.7 }}>
            OneGrid is a 5×5 on-chain grid game on OneChain. Every 60 seconds, a random cell wins. All players on the winning cell split the pot.
          </p>
        </div>

        {/* Game Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 48 }}>
          <InfoCard title="Entry Fee" value="0.1" sub="OCT per cell" color={T.blue} />
          <InfoCard title="Round" value="60s" sub="per round" color={T.lavender} />
          <InfoCard title="Payout" value="95%" sub="to winners" color={T.teal} />
          <InfoCard title="Reward" value="10" sub="$GRID per win" color={T.pink} />
        </div>

        {/* Steps */}
        <div style={{
          background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 18,
          padding: "8px 32px", marginBottom: 48,
        }}>
          <Step number="01" icon="🔗" title="Connect OneWallet"
            description='Click "Play Now" on the game page. OneWallet — OneChain\'s native browser wallet — will prompt you to connect. Your OCT balance loads instantly. New to OneChain? Download OneWallet from one-wallet.cc and get free testnet OCT from the faucet.' />
          <Step number="02" icon="🎯" title="Pick a Cell"
            description="Choose any cell on the 5×5 grid. Each cell costs 0.1 OCT to claim. You can only pick one cell per round. OneWallet will ask you to approve the transaction — your OCT goes directly into the round's prize pool on-chain." />
          <Step number="03" icon="⏱" title="Wait for the Round to End"
            description="Each round lasts exactly 60 seconds. Watch the countdown timer. Other players can join the same round and pick their cells. The more players, the bigger the pot. Multiple players can pick the same cell." />
          <Step number="04" icon="🎲" title="Random Winner Selection"
            description="When the timer hits zero, our autonomous resolver bot picks the winning cell. The selection uses the transaction digest as a pseudorandom seed — it's on-chain, verifiable, and can't be predicted or manipulated by any player." />
          <Step number="05" icon="💰" title="Collect Winnings"
            description="Winners receive 95% of the prize pool in OCT automatically — no claim button needed. The smart contract pays you directly to your wallet. 5% goes to the protocol treasury. If multiple players picked the winning cell, they split the payout equally." />
          <Step number="06" icon="🏆" title="Earn $GRID Tokens"
            description="Every winner also receives 10 $GRID — OneGrid's native reward token. GRID is minted on-chain by the resolver bot after each round resolution. You can view your GRID balance in OneWallet by adding the custom token." />
        </div>

        {/* Strategy Tips */}
        <div style={{
          background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 18,
          padding: "28px 32px", marginBottom: 48,
        }}>
          <div style={{
            fontSize: 11, color: T.teal, letterSpacing: "3px", textTransform: "uppercase",
            fontFamily: "'JetBrains Mono', monospace", marginBottom: 20,
          }}>STRATEGY TIPS</div>
          {[
            { tip: "Spread or stack?", detail: "If you're the only player, every cell has equal odds. But if others are playing, picking a less popular cell means you don't split the pot if it wins." },
            { tip: "Watch the grid", detail: "Cells show how many players picked them. A cell with 5 players has a higher chance of being picked (since occupied cells are in the pool), but the payout per player is lower." },
            { tip: "Timing matters", detail: "You can pick your cell at any point during the 60-second window. Waiting lets you see where others are going. Acting early commits you before you have full information." },
            { tip: "Stack $GRID", detail: "Even if you lose OCT some rounds, you're earning $GRID every time you win. As the OneGrid ecosystem grows, $GRID becomes more valuable." },
          ].map((item, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.lavender, marginBottom: 4 }}>{item.tip}</div>
              <div style={{ fontSize: 13, color: T.textDim, lineHeight: 1.6 }}>{item.detail}</div>
            </div>
          ))}
        </div>

        {/* Technical Details */}
        <div style={{
          background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 18,
          padding: "28px 32px", marginBottom: 48,
        }}>
          <div style={{
            fontSize: 11, color: T.teal, letterSpacing: "3px", textTransform: "uppercase",
            fontFamily: "'JetBrains Mono', monospace", marginBottom: 20,
          }}>UNDER THE HOOD</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, fontSize: 13, color: T.textDim, lineHeight: 1.7 }}>
            <div>
              <div style={{ fontWeight: 700, color: T.lavender, marginBottom: 6 }}>Smart Contracts</div>
              Two Move contracts deployed on OneChain testnet. <code style={{ color: T.blue, fontSize: 11 }}>game.move</code> handles the grid, rounds, and payouts. <code style={{ color: T.blue, fontSize: 11 }}>grid_token.move</code> manages $GRID minting.
            </div>
            <div>
              <div style={{ fontWeight: 700, color: T.lavender, marginBottom: 6 }}>Resolver Bot</div>
              Autonomous Node.js bot running 24/7 on Railway. Polls the chain every 3 seconds, resolves ended rounds, mints $GRID, and starts new rounds automatically.
            </div>
            <div>
              <div style={{ fontWeight: 700, color: T.lavender, marginBottom: 6 }}>Randomness</div>
              Winner selection uses <code style={{ color: T.blue, fontSize: 11 }}>tx_context::digest</code> as entropy. The digest depends on the resolver's transaction and cannot be predicted or front-run by players.
            </div>
            <div>
              <div style={{ fontWeight: 700, color: T.lavender, marginBottom: 6 }}>Wallet</div>
              OneWallet integration via <code style={{ color: T.blue, fontSize: 11 }}>@onelabs/dapp-kit</code>. All transactions are signed client-side. Your keys never leave your browser.
            </div>
          </div>
        </div>

        {/* Token Info */}
        <div style={{
          background: `${T.teal}08`, border: `1px solid ${T.teal}25`, borderRadius: 18,
          padding: "28px 32px", marginBottom: 48,
        }}>
          <div style={{
            fontSize: 11, color: T.teal, letterSpacing: "3px", textTransform: "uppercase",
            fontFamily: "'JetBrains Mono', monospace", marginBottom: 16,
          }}>$GRID TOKEN</div>
          <div style={{ fontSize: 14, color: T.textDim, lineHeight: 1.7, marginBottom: 16 }}>
            $GRID is OneGrid's native reward token on OneChain. It's minted automatically to winners after each round.
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: T.textMuted,
            background: T.bgCard, borderRadius: 10, padding: "12px 16px", wordBreak: "break-all",
          }}>
            <div style={{ marginBottom: 4 }}>
              <span style={{ color: T.textDim }}>Coin Type: </span>
              <span style={{ color: T.blue }}>0x5f3877b2aa2dcb7e63233b10bcbe0fcfe22e0325ac49da1f33ebd6810af55a87::grid_token::GRID_TOKEN</span>
            </div>
            <div>
              <span style={{ color: T.textDim }}>Decimals: </span>
              <span style={{ color: T.lavender }}>9</span>
              <span style={{ color: T.textDim, marginLeft: 16 }}>Reward: </span>
              <span style={{ color: T.teal }}>10 GRID per win</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <a href="/" style={{
            display: "inline-block", background: T.gradient, border: "none", borderRadius: 14,
            padding: "16px 48px", color: "#fff", fontSize: 16, fontWeight: 700,
            textDecoration: "none", boxShadow: "0 0 30px rgba(70,125,255,0.3)",
            transition: "all 0.2s",
          }}>Start Playing</a>
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 12 }}>
            Free testnet OCT • No deposit required • Instant gameplay
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        borderTop: `1px solid ${T.border}`, padding: "20px 24px",
        textAlign: "center", fontSize: 11, color: T.textMuted,
      }}>
        Built on <span style={{ color: T.blue, fontWeight: 600 }}>OneChain</span> · <a href="https://github.com/penguinpecker/onegrid" target="_blank" rel="noopener" style={{ color: T.blue, textDecoration: "none" }}>GitHub</a> · <a href="https://onescan.cc/testnet" target="_blank" rel="noopener" style={{ color: T.blue, textDecoration: "none" }}>Explorer</a>
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { -webkit-font-smoothing: antialiased; }
        code { background: rgba(70,125,255,0.1); padding: 2px 6px; border-radius: 4px; }
        @media (max-width: 700px) {
          div[style*="repeat(4, 1fr)"] { grid-template-columns: repeat(2, 1fr) !important; }
          div[style*="gridTemplateColumns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
