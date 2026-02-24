// Static preview of every possible PhoneVote screen state — for Figma export only.
// Access at http://localhost:5173?preview=phone

import { RockIcon, PaperIcon, ScissorsIcon, RpsIcon } from "./RpsIcons.jsx";

const FONT = "'PT Mono', monospace";
const GREEN = "#c8f55a";
const DIM = "#2a4a2a";
const MID = "#3a5a3a";
const SOFT = "#7a9a7a";
const BG = "#060e06";
const PANEL = "#0f1f0f";
const BORDER = "#1a2e1a";

const phone = {
  width: 375,
  minHeight: 667,
  background: BG,
  color: GREEN,
  fontFamily: FONT,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "40px 24px 32px",
  boxSizing: "border-box",
  position: "relative",
  gap: 12,
  border: "1px solid #1a2e1a",
};

const label = {
  fontSize: 10, letterSpacing: 4, color: DIM,
  marginBottom: 4, textAlign: "center",
  fontFamily: FONT,
};

const title = {
  fontSize: 36, fontWeight: "bold", letterSpacing: 8,
  textShadow: "0 0 20px #c8f55a44", textAlign: "center",
};

const subtitle = {
  fontSize: 12, letterSpacing: 3, color: SOFT, textAlign: "center",
};

const status = {
  fontSize: 14, letterSpacing: 2, color: MID, textAlign: "center",
};

const bigBtn = {
  width: "100%", maxWidth: 300, padding: "18px 0",
  fontSize: 14, fontWeight: "bold", letterSpacing: 4,
  fontFamily: FONT, background: PANEL, color: GREEN,
  border: `1px solid ${GREEN}`, borderRadius: 4, textAlign: "center",
};

const choiceBtn = {
  width: "100%", maxWidth: 300, padding: "24px 16px",
  fontSize: 22, fontWeight: "bold", letterSpacing: 4,
  fontFamily: FONT, background: PANEL, color: GREEN,
  border: `2px solid ${BORDER}`, borderRadius: 4, textAlign: "center",
};

const muteBtn = {
  position: "absolute", top: 16, right: 16,
  background: "transparent", border: `1px solid ${BORDER}`,
  borderRadius: 6, padding: "6px 10px", fontSize: 20, color: GREEN,
};

const logOffBtn = {
  fontSize: 10, letterSpacing: 4, color: DIM,
  background: "transparent", border: "none",
  fontFamily: FONT, marginTop: 8,
};

const catBox = {
  width: "100%", maxWidth: 300, padding: "14px 16px",
  background: "#0a1a0a", border: `1px solid ${BORDER}`,
  borderRadius: 4, textAlign: "center",
};

const rpsBtn = {
  display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
  padding: "24px 20px", background: PANEL, border: `2px solid ${BORDER}`,
  borderRadius: 12, color: GREEN, fontFamily: FONT, minWidth: 90,
};

const osBigBtn = {
  width: "100%", maxWidth: 300, padding: "28px 0", fontSize: 18,
  fontWeight: "bold", letterSpacing: 4, fontFamily: FONT,
  background: "#0a1f0a", color: GREEN, border: `2px solid ${GREEN}`,
  borderRadius: 8, textAlign: "center",
};

const osStopBtn = {
  ...osBigBtn, background: "#1a0a0a", border: "2px solid #c85a5a", color: "#c85a5a",
};

const osTimerDisplay = {
  fontSize: 72, fontWeight: "bold", letterSpacing: 2, color: GREEN,
  fontVariantNumeric: "tabular-nums", fontFamily: FONT,
  textShadow: "0 0 30px #c8f55a66", lineHeight: 1, margin: "8px 0",
};

const osResultRow = {
  display: "flex", alignItems: "center", gap: 10,
  padding: "10px 14px", background: "#0a140a",
  border: `1px solid ${BORDER}`, borderRadius: 4, width: "100%", maxWidth: 300,
  boxSizing: "border-box",
};

const champName = {
  fontSize: 28, fontWeight: "bold", letterSpacing: 4,
  color: GREEN, textShadow: "0 0 24px #c8f55a",
};

function MuteIcon() {
  return <div style={muteBtn}>🔊</div>;
}

function Screen({ label: lbl, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ fontSize: 9, letterSpacing: 3, color: "#2a3a2a", fontFamily: FONT, textAlign: "center" }}>
        {lbl}
      </div>
      <div style={phone}>
        <MuteIcon />
        {children}
      </div>
    </div>
  );
}

export default function PhonePreview() {
  return (
    <div style={{ background: "#030803", minHeight: "100vh", padding: "40px 32px", fontFamily: FONT }}>
      <div style={{ fontSize: 10, letterSpacing: 6, color: DIM, marginBottom: 32, textAlign: "center" }}>
        PHONE SCREEN STATES
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 32, justifyContent: "center" }}>

        {/* 1 — CONNECTING */}
        <Screen label="01 · CONNECTING">
          <div style={{ width: 36, height: 36, border: `3px solid ${GREEN}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <div style={status}>Connecting…</div>
        </Screen>

        {/* 2 — NAME ENTRY */}
        <Screen label="02 · NAME ENTRY">
          <div style={{ fontSize: 40, fontWeight: "bold", letterSpacing: 8 }}>BRACKET</div>
          <div style={subtitle}>Enter your name (max 6 chars):</div>
          <div style={{ ...choiceBtn, fontSize: 24, color: SOFT, letterSpacing: 6, padding: "16px", textAlign: "center", maxWidth: 300 }}>NAME</div>
          <div style={bigBtn}>JOIN</div>
        </Screen>

        {/* 3 — LOBBY HOST (choose category) */}
        <Screen label="03 · LOBBY · HOST · CHOOSE CATEGORY">
          <div style={{ fontSize: 40, fontWeight: "bold", letterSpacing: 8 }}>BRACKET</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[8, 16, 32].map(n => (
              <div key={n} style={{ flex: 1, padding: "10px 0", fontSize: 18, fontWeight: "bold",
                letterSpacing: 2, background: n === 32 ? PANEL : "#0a140a",
                color: n === 32 ? GREEN : MID, border: n === 32 ? `2px solid ${GREEN}` : `1px solid ${BORDER}`,
                borderRadius: 6, textAlign: "center", minWidth: 72 }}>
                {n}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 9, letterSpacing: 4, color: DIM }}>SEEDS</div>
          <div style={subtitle}>Choose a category:</div>
          {["MOVIES", "FOODS", "SPORTS", "?????", "CUSTOM BRACKET"].map(c => (
            <div key={c} style={{ ...bigBtn, padding: "12px 0", fontSize: 12 }}>{c}</div>
          ))}
          <div style={{ fontSize: 12, color: DIM, letterSpacing: 2 }}>3 players joined</div>
          <div style={logOffBtn}>LOG OFF</div>
        </Screen>

        {/* 4 — LOBBY HOST (category selected) */}
        <Screen label="04 · LOBBY · HOST · READY TO START">
          <div style={{ fontSize: 40, fontWeight: "bold", letterSpacing: 8 }}>BRACKET</div>
          <div style={catBox}>
            <div style={{ fontSize: 9, letterSpacing: 4, color: DIM, marginBottom: 4 }}>CATEGORY</div>
            <div style={{ fontSize: 22, letterSpacing: 4, color: GREEN }}>MOVIES</div>
          </div>
          <div style={{ fontSize: 12, color: DIM, letterSpacing: 2 }}>3 players joined</div>
          <div style={bigBtn}>▶ START GAME</div>
          <div style={{ ...bigBtn, background: "transparent", border: "none", color: DIM, fontSize: 11 }}>← BACK</div>
          <div style={{ fontSize: 11, color: DIM, letterSpacing: 2 }}>Waiting for players to join…</div>
          <div style={logOffBtn}>LOG OFF</div>
        </Screen>

        {/* 5 — LOBBY NON-HOST */}
        <Screen label="05 · LOBBY · NON-HOST · WAITING">
          <div style={{ fontSize: 40, fontWeight: "bold", letterSpacing: 8 }}>BRACKET</div>
          <div style={catBox}>
            <div style={{ fontSize: 9, letterSpacing: 4, color: DIM, marginBottom: 4 }}>CATEGORY</div>
            <div style={{ fontSize: 22, letterSpacing: 4, color: GREEN }}>MOVIES</div>
          </div>
          <div style={{ fontSize: 12, color: DIM, letterSpacing: 2 }}>3 players joined</div>
          <div style={{ fontSize: 11, color: DIM, letterSpacing: 2 }}>Waiting for host to start…</div>
          <div style={logOffBtn}>LOG OFF</div>
        </Screen>

        {/* 6 — LOGGED OFF */}
        <Screen label="06 · LOGGED OFF">
          <div style={{ padding: "24px", border: `1px solid ${BORDER}`, borderRadius: 4, textAlign: "center", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={status}>You have left the game.</div>
            <div style={bigBtn}>REJOIN</div>
          </div>
        </Screen>

        {/* 7 — WAITING FOR MATCH */}
        <Screen label="07 · WAITING FOR NEXT MATCH">
          <div style={{ padding: "24px 32px", border: `1px solid ${BORDER}`, borderRadius: 4, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 20, color: GREEN }}>●</div>
            <div style={status}>Waiting for next match…</div>
          </div>
          <div style={logOffBtn}>LOG OFF</div>
        </Screen>

        {/* 8 — VOTE SCREEN */}
        <Screen label="08 · VOTE · ACTIVE MATCH">
          <div style={{ fontSize: 12, letterSpacing: 4, color: DIM }}>TAP TO VOTE</div>
          <div style={{ ...choiceBtn, border: `2px solid ${GREEN}` }}>INCEPTION</div>
          <div style={{ fontSize: 14, fontWeight: "bold", letterSpacing: 4, color: "#1e3e1e" }}>VS</div>
          <div style={{ ...choiceBtn, border: `2px solid ${GREEN}` }}>THE MATRIX</div>
          <div style={logOffBtn}>LOG OFF</div>
        </Screen>

        {/* 9 — VOTED / WAITING */}
        <Screen label="09 · VOTED · WAITING FOR OTHERS">
          <div style={{ padding: "24px 32px", border: `1px solid ${BORDER}`, borderRadius: 4, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 64, color: GREEN }}>✓</div>
            <div style={{ fontSize: 16, letterSpacing: 4 }}>Vote submitted!</div>
            <div style={{ fontSize: 28, fontWeight: "bold", letterSpacing: 2, color: GREEN }}>2/3</div>
            <div style={{ fontSize: 12, color: MID, letterSpacing: 2 }}>Waiting for others…</div>
          </div>
          <div style={{ ...bigBtn, fontSize: 11 }}>SKIP →</div>
        </Screen>

        {/* 10 — TIEBREAKER HOST */}
        <Screen label="10 · TIEBREAKER · HOST · PICK METHOD">
          <div style={title}>TIE!</div>
          <div style={{ fontSize: 16, letterSpacing: 3, color: SOFT }}>INCEPTION vs THE MATRIX</div>
          <div style={{ fontSize: 12, letterSpacing: 3, color: SOFT }}>How to break the tie?</div>
          <div style={{ ...bigBtn, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><RockIcon size={22} /> ROCK PAPER SCISSORS</div>
          <div style={{ ...bigBtn, marginTop: 0 }}>⏱ ONE SECOND</div>
          <div style={{ fontSize: 12, color: "#6a8a6a", letterSpacing: 4 }}>— OR —</div>
          <div style={subtitle}>Pick the winner:</div>
          <div style={{ ...choiceBtn, padding: "14px 16px", fontSize: 16 }}>INCEPTION</div>
          <div style={{ ...choiceBtn, padding: "14px 16px", fontSize: 16 }}>THE MATRIX</div>
        </Screen>

        {/* 11 — TIEBREAKER NON-HOST */}
        <Screen label="11 · TIEBREAKER · NON-HOST · WAITING">
          <div style={title}>TIE!</div>
          <div style={{ fontSize: 16, letterSpacing: 3, color: SOFT }}>INCEPTION vs THE MATRIX</div>
          <div style={status}>Host is deciding how to break the tie…</div>
        </Screen>

        {/* 12 — RPS CHOOSING */}
        <Screen label="12 · RPS · ACTIVE PLAYER · CHOOSING">
          <div style={title}>ROCK PAPER SCISSORS</div>
          <div style={subtitle}>Round 1 · You're playing for INCEPTION</div>
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            <div style={rpsBtn}><RockIcon size={40} /><span style={{ fontSize: 10, letterSpacing: 3, fontWeight: "bold" }}>ROCK</span></div>
            <div style={rpsBtn}><PaperIcon size={40} /><span style={{ fontSize: 10, letterSpacing: 3, fontWeight: "bold" }}>PAPER</span></div>
            <div style={rpsBtn}><ScissorsIcon size={40} /><span style={{ fontSize: 10, letterSpacing: 3, fontWeight: "bold" }}>SCISSORS</span></div>
          </div>
        </Screen>

        {/* 13 — RPS WAITING FOR OPPONENT */}
        <Screen label="13 · RPS · WAITING FOR OPPONENT">
          <RockIcon size={64} style={{ margin: "0 auto 8px" }} />
          <div style={status}>Waiting for opponent…</div>
        </Screen>

        {/* 14 — RPS RESULT */}
        <Screen label="14 · RPS · RESULT">
          <div style={title}>RPS RESULT</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "center", margin: "12px 0" }}>
            <RockIcon size={48} />
            <span style={{ fontSize: 12, letterSpacing: 4, color: "#7a9a7a" }}>vs</span>
            <ScissorsIcon size={48} />
          </div>
          <div style={champName}>INCEPTION WINS!</div>
        </Screen>

        {/* 15 — RPS DRAW */}
        <Screen label="15 · RPS · DRAW">
          <div style={title}>DRAW!</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "center", margin: "12px 0" }}>
            <RockIcon size={48} />
            <span style={{ fontSize: 12, letterSpacing: 4, color: "#7a9a7a" }}>vs</span>
            <RockIcon size={48} />
          </div>
          <div style={status}>Going again…</div>
        </Screen>

        {/* 16 — RPS SPECTATOR */}
        <Screen label="16 · RPS · SPECTATOR">
          <div style={title}>ROCK PAPER SCISSORS</div>
          <div style={{ fontSize: 16, letterSpacing: 3, color: SOFT }}>INCEPTION vs THE MATRIX</div>
          <div style={subtitle}>Round 1</div>
          <div style={status}>Two players are battling it out…</div>
        </Screen>

        {/* 17 — ONE SECOND · ACTIVE · WAITING */}
        <Screen label="17 · ONE SECOND · ACTIVE · PRESS TO START">
          <div style={title}>ONE SECOND</div>
          <div style={subtitle}>You're playing for</div>
          <div style={{ fontSize: 20, letterSpacing: 3, color: GREEN, marginBottom: 8 }}>INCEPTION</div>
          <div style={{ fontSize: 11, letterSpacing: 3, color: DIM, textAlign: "center", maxWidth: 280, marginBottom: 16 }}>
            Press START, then press again to stop as close to 1.000s as possible
          </div>
          <div style={osBigBtn}>PRESS TO START</div>
        </Screen>

        {/* 18 — ONE SECOND · ACTIVE · RUNNING */}
        <Screen label="18 · ONE SECOND · ACTIVE · TIMER RUNNING">
          <div style={title}>ONE SECOND</div>
          <div style={osTimerDisplay}>0.532</div>
          <div style={osStopBtn}>PRESS TO STOP</div>
        </Screen>

        {/* 19 — ONE SECOND · ACTIVE · DONE (P1, WAITING FOR P2) */}
        <Screen label="19 · ONE SECOND · ACTIVE P1 · DONE">
          <div style={title}>ONE SECOND</div>
          <div style={subtitle}>Your time</div>
          <div style={{ fontSize: 48, fontWeight: "bold", letterSpacing: 2, color: GREEN, fontVariantNumeric: "tabular-nums" }}>
            0.847s
          </div>
          <div style={{ fontSize: 12, letterSpacing: 3, color: MID }}>±0.153s from 1.000</div>
          <div style={status}>Waiting for ALEX…</div>
        </Screen>

        {/* 20 — ONE SECOND · SPECTATOR · RUNNING */}
        <Screen label="20 · ONE SECOND · SPECTATOR · LIVE TIMER">
          <div style={title}>ONE SECOND</div>
          <div style={{ fontSize: 16, letterSpacing: 3, color: SOFT }}>INCEPTION vs THE MATRIX</div>
          <div style={osTimerDisplay}>0.532</div>
          <div style={status}>JAMIE is timing!</div>
        </Screen>

        {/* 21 — ONE SECOND · SPECTATOR · WAITING */}
        <Screen label="21 · ONE SECOND · SPECTATOR · WAITING">
          <div style={title}>ONE SECOND</div>
          <div style={{ fontSize: 16, letterSpacing: 3, color: SOFT }}>INCEPTION vs THE MATRIX</div>
          <div style={status}>JAMIE getting ready…</div>
        </Screen>

        {/* 22 — ONE SECOND · RESULT */}
        <Screen label="22 · ONE SECOND · RESULT">
          <div style={title}>ONE SECOND</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
            <div style={osResultRow}>
              <span style={{ flex: 1, fontSize: 12, letterSpacing: 2, color: SOFT }}>JAMIE</span>
              <span style={{ fontSize: 20, fontWeight: "bold", color: GREEN, fontVariantNumeric: "tabular-nums" }}>0.847s</span>
              <span style={{ fontSize: 11, color: DIM }}>±0.153s</span>
            </div>
            <div style={osResultRow}>
              <span style={{ flex: 1, fontSize: 12, letterSpacing: 2, color: SOFT }}>ALEX</span>
              <span style={{ fontSize: 20, fontWeight: "bold", color: MID, fontVariantNumeric: "tabular-nums" }}>1.124s</span>
              <span style={{ fontSize: 11, color: DIM }}>±0.124s</span>
            </div>
          </div>
          <div style={champName}>THE MATRIX WINS!</div>
        </Screen>

        {/* 23 — CHAMPION */}
        <Screen label="23 · CHAMPION · GAME OVER">
          <div style={{ fontSize: 48 }}>🏆</div>
          <div style={{ fontSize: 12, letterSpacing: 4, color: SOFT }}>WINNER</div>
          <div style={champName}>INCEPTION</div>
          <div style={{ fontSize: 11, letterSpacing: 3, color: DIM }}>Thanks for playing!</div>
        </Screen>

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
