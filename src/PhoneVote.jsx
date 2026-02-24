import { useState, useEffect, useRef } from "react";
import { useGameState } from "./useGameState.js";
import { RockIcon, PaperIcon, ScissorsIcon, RpsIcon } from "./RpsIcons.jsx";
import { allMatches } from "./bracketLogic.js";
import { CATEGORY_NAMES } from "./categories.js";
import chooseAnswerSrc from "./assets/audio/ChooseAnswer.wav";
import RiveTextButton from "./RiveTextButton.jsx";
import cursorPointerRaw    from "./assets/SVG/Cursor_Pointer.svg?raw";
import cursorDragRaw       from "./assets/SVG/cursorDrag.svg?raw";
import cursorHoverRaw      from "./assets/SVG/Cursor_Hover.svg?raw";
import cursorRightClickRaw from "./assets/SVG/Cursor_RightClick.svg?raw";
const cursorPointerSrc    = `data:image/svg+xml,${encodeURIComponent(cursorPointerRaw)}`;
const cursorDragSrc       = `data:image/svg+xml,${encodeURIComponent(cursorDragRaw)}`;
const cursorHoverSrc      = `data:image/svg+xml,${encodeURIComponent(cursorHoverRaw)}`;
const cursorRightClickSrc = `data:image/svg+xml,${encodeURIComponent(cursorRightClickRaw)}`;

// ─── Slur / profanity filter ──────────────────────────────────────────────────
const BLOCKED = [
  "nigga","nigge","nigg","niga","n1g","n1gg","negro","negr",
  "fag","fagg","faggo","f4g",
  "kike","k1ke",
  "spic","sp1c",
  "chink","ch1nk",
  "gook","g00k",
  "wetba","wetb",
  "coon","c00n",
  "darki","darky",
  "dyke","dyk3",
  "trann","tr4nn",
  "retrd","retar","r3tar",
  "twat",
  "slut","whore","wh0re",
  "nazi","n4zi",
  "rape","r4pe",
];
function isSlur(name) {
  const lower = name.toLowerCase().replace(/[\s_\-\.]/g, "");
  return BLOCKED.some((w) => lower.includes(w));
}

export default function PhoneVote() {
  const playerId = useRef(
    localStorage.getItem("bracket_pid") || crypto.randomUUID()
  );

  const {
    phase, category, bracketSize, playerCount, totalPlayers, isHost,
    bracket, currentMatchId, champion, votedCount, tiebreaker,
    connected, playerNames,
    joinGame, leaveGame, selectCategory, setBracketSize, startGame, setCustomItems,
    vote: firebaseVote, skip, hostPickWinner, startRPS, submitRPS,
    startOneSecond, startOSTimer, stopOSTimer,
  } = useGameState(playerId.current);

  const [voted, setVoted] = useState(false);
  const [rpsChosen, setRpsChosen] = useState(false);
  const [loggedOff, setLoggedOff] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customItems, setCustomItemsLocal] = useState(Array(32).fill(""));
  const [randomMode, setRandomMode] = useState(false);
  const [customError, setCustomError] = useState("");
  const [playerName, setPlayerName] = useState(
    localStorage.getItem("bracket_name") || ""
  );
  const [nameInput, setNameInput] = useState("");
  const [nameError, setNameError] = useState("");
  const [muted, setMuted] = useState(false);
  const [osDisplayMs, setOsDisplayMs] = useState(0);
  const osStartRef = useRef(null); // local capture of Date.now() at START press for accurate elapsed
  const lastMatchId = useRef(null);

  useEffect(() => {
    localStorage.setItem("bracket_pid", playerId.current);
  }, []);

  useEffect(() => {
    const CLICKABLE_HOVER = "button:hover, button:hover *, a:hover, a:hover *, [role='button']:hover, [role='button']:hover *, select:hover, select:hover *, input[type='range']:hover, input[type='checkbox']:hover, input[type='radio']:hover, label:hover, label:hover *";
    const style = document.createElement("style");
    style.id = "bracket-cursor";
    document.head.appendChild(style);
    const setNormal = () => {
      style.textContent = `
        * { cursor: url(${cursorPointerSrc}) 2 3, default !important; }
        ${CLICKABLE_HOVER} { cursor: url(${cursorHoverSrc}) 13 2, pointer !important; }
      `;
    };
    const setDrag = () => {
      style.textContent = `*, *:hover { cursor: url(${cursorDragSrc}) 16 14, grabbing !important; }`;
    };
    const setRightClick = () => {
      style.textContent = `*, *:hover { cursor: url(${cursorRightClickSrc}) 14 0, context-menu !important; }`;
    };
    const onDown = (e) => { if (e.button === 2) setRightClick(); else setDrag(); };
    const onUp   = () => setNormal();
    setNormal();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("mouseup",   onUp);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("mouseup",   onUp);
      style.remove();
    };
  }, []);

  // Reset custom item slots when host changes bracket size
  useEffect(() => {
    setCustomItemsLocal(Array(bracketSize).fill(""));
  }, [bracketSize]);

  // Auto-join when connected and has name (unless logged off)
  useEffect(() => {
    if (connected && !loggedOff && playerName)
      joinGame(playerId.current, playerName);
  }, [connected, joinGame, loggedOff, playerName]);

  // Detect host reset: if playerNames drops to empty after having entries, reset to name screen
  const prevPlayerNamesCount = useRef(null);
  useEffect(() => {
    if (!playerName || loggedOff || !connected) return;
    const count = playerNames ? Object.keys(playerNames).length : 0;
    // Only reset if we previously saw players and now there are none (host cleared)
    if (prevPlayerNamesCount.current > 0 && count === 0) {
      setPlayerName("");
      setNameInput("");
      localStorage.removeItem("bracket_name");
    }
    prevPlayerNamesCount.current = count;
  }, [playerNames, playerName, loggedOff, connected]);

  // Reset voted flag when match changes
  useEffect(() => {
    if (currentMatchId !== lastMatchId.current) {
      lastMatchId.current = currentMatchId;
      setVoted(false);
    }
  }, [currentMatchId]);

  // Reset rpsChosen when RPS round changes
  useEffect(() => {
    if (tiebreaker && tiebreaker.rps) {
      setRpsChosen(false);
    }
  }, [tiebreaker && tiebreaker.rps && tiebreaker.rps.round]); // eslint-disable-line

  // Live timer for One Second — drives display on all phones while timer is running
  useEffect(() => {
    if (phase !== "oneSecond" || !tiebreaker?.oneSecond) return;
    const os = tiebreaker.oneSecond;
    const isRunning = os.osPhase === "running_p1" || os.osPhase === "running_p2";
    const startTs = os.osPhase === "running_p1" ? os.startTs1 : os.osPhase === "running_p2" ? os.startTs2 : null;
    if (!isRunning || !startTs) { setOsDisplayMs(0); return; }
    const id = setInterval(() => setOsDisplayMs(Date.now() - startTs), 33);
    return () => clearInterval(id);
  }, [phase, tiebreaker?.oneSecond?.osPhase]); // eslint-disable-line

  const chooseAnswerSfx = useRef(null);
  const audioCtxRef = useRef(null);

  // Init SFX with Web Audio reverb
  useEffect(() => {
    // @ts-ignore — webkitAudioContext is a Safari fallback
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = ctx;
    const rate = ctx.sampleRate;
    const len  = rate * 1.5;           // 1.5 s decay
    const impulse = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = impulse.getChannelData(ch);
      for (let i = 0; i < len; i++)
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    }
    const convolver = ctx.createConvolver();
    convolver.buffer = impulse;
    const dryGain = ctx.createGain();
    dryGain.gain.value = 0.7;          // 70 % dry
    const wetGain = ctx.createGain();
    wetGain.gain.value = 0.3;          // 30 % wet
    convolver.connect(wetGain);
    wetGain.connect(ctx.destination);
    dryGain.connect(ctx.destination);

    const a = new Audio(chooseAnswerSrc);
    a.volume = 0.5;                    // 50 % quieter
    const node = ctx.createMediaElementSource(a);
    node.connect(dryGain);
    node.connect(convolver);
    chooseAnswerSfx.current = a;

    // Unlock AudioContext on first interaction
    const unlock = () => ctx.resume();
    document.addEventListener("click", unlock, { once: true });
    document.addEventListener("touchstart", unlock, { once: true });
    return () => {
      document.removeEventListener("click", unlock);
      document.removeEventListener("touchstart", unlock);
      ctx.close();
    };
  }, []);

  const toggleMute = () => setMuted((m) => !m);

  const vote = (choice) => {
    if (voted) return;
    setVoted(true);
    if (!muted && chooseAnswerSfx.current) {
      chooseAnswerSfx.current.currentTime = 0;
      chooseAnswerSfx.current.play().catch(() => {});
    }
    firebaseVote(playerId.current, choice);
  };

  // Mute toggle button rendered in every screen
  const muteButton = (
    <button style={{ ...vs.muteBtn, color: muted ? "#bb6666" : "#c8f55a", borderColor: muted ? "#bb6666" : "#1a2e1a" }} onClick={toggleMute} title={muted ? "Unmute" : "Mute"}>
      {muted ? "🔇" : "🔊"}
    </button>
  );

  const handleLogOff = () => {
    leaveGame(playerId.current);
    setLoggedOff(true);
    setPlayerName("");
    localStorage.removeItem("bracket_name");
  };

  const handleRejoin = () => {
    setLoggedOff(false);
    // Name was cleared, so the name input screen will show
  };

  // ── Loading ──
  if (!connected) {
    return (
      <div style={vs.root}>
        {muteButton}
        <div style={vs.spinner} />
        <div style={vs.status}>Connecting…</div>
      </div>
    );
  }

  // ── Name input ──
  if (!playerName) {
    const submitName = () => {
      const name = nameInput.trim().slice(0, 6).toUpperCase();
      if (!name) return;
      if (isSlur(name)) {
        setNameError("do better.");
        setNameInput("");
        return;
      }
      // Check for duplicate name among active players
      const taken = Object.values(playerNames || {}).some(
        (n) => n.toUpperCase() === name
      );
      if (taken) {
        setNameError("Name already taken.");
        return;
      }
      setNameError("");
      localStorage.setItem("bracket_name", name);
      setPlayerName(name);
    };
    return (
      <div style={vs.root}>
        {muteButton}
        <div style={vs.lobbyTitle}>BRACKET</div>
        <div style={vs.lobbySubtitle}>Enter your name (max 6 chars):</div>
        {nameError && <div style={vs.nameError}>{nameError}</div>}
        <input
          style={vs.nameInput}
          type="text"
          maxLength={6}
          placeholder="NAME"
          value={nameInput}
          onChange={(e) => { setNameInput(e.target.value.slice(0, 6)); setNameError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") submitName(); }}
          autoFocus
        />
        <button style={vs.startGameBtn} onClick={submitName}>
          JOIN
        </button>
      </div>
    );
  }

  // ── Logged off ──
  if (loggedOff) {
    return (
      <div style={vs.root}>
        {muteButton}
        <div style={vs.waitBox}>
          <div style={vs.status}>You have left the game.</div>
          <button style={vs.startGameBtn} onClick={handleRejoin}>
            REJOIN
          </button>
        </div>
      </div>
    );
  }

  // ── Lobby Phase ──
  if (phase === "lobby") {
    // ── Custom bracket input screen ──
    if (isHost && showCustomInput) {
      const filledCount = customItems.filter(s => s.trim()).length;
      const canStart = filledCount === bracketSize;
      const handleCustomItemChange = (idx, val) => {
        const next = [...customItems];
        next[idx] = val;
        setCustomItemsLocal(next);
      };
      const submitCustom = async () => {
        const items = customItems.map(s => s.trim()).filter(Boolean);
        if (items.length !== bracketSize) return;
        // Check for duplicates
        const unique = new Set(items.map(s => s.toLowerCase()));
        if (unique.size < bracketSize) {
          setCustomError("looks like you doubled up some entries, friend");
          return;
        }
        setCustomError("");
        await setCustomItems(items);
        setShowCustomInput(false);
      };
      return (
        <div style={vs.root}>
          {muteButton}
          <div style={vs.lobbyTitle}>CUSTOM</div>
          <div style={vs.lobbySubtitle}>Enter {bracketSize} options ({filledCount}/{bracketSize}):</div>
          {customError && <div style={vs.nameError}>{customError}</div>}
          <div style={vs.customGrid}>
            {customItems.map((val, i) => (
              <input
                key={i}
                style={vs.customItemInput}
                type="text"
                maxLength={20}
                placeholder={`#${i + 1}`}
                value={val}
                onChange={(e) => handleCustomItemChange(i, e.target.value)}
              />
            ))}
          </div>
          <button
            style={{ ...vs.startGameBtn, opacity: canStart ? 1 : 0.3 }}
            onClick={canStart ? submitCustom : undefined}
          >
            SET BRACKET
          </button>
          <button style={vs.backBtn} onClick={() => setShowCustomInput(false)}>
            {"\u2190"} BACK
          </button>
          <button style={vs.logOffBtn} onClick={handleLogOff}>LOG OFF</button>
        </div>
      );
    }

    if (isHost && !category) {
      return (
        <div style={{ ...vs.root, justifyContent: "flex-start", overflowY: "auto" }}>
          {muteButton}
          <div style={vs.lobbyTitle}>BRACKET</div>
          <div style={vs.sizeRow}>
            {[8, 16, 32].map(n => (
              <button key={n}
                style={bracketSize === n ? vs.sizeBtnActive : vs.sizeBtn}
                onClick={() => setBracketSize(n)}>
                {n}
              </button>
            ))}
          </div>
          <div style={vs.sizeLabel}>SEEDS</div>
          <div style={vs.lobbySubtitle}>Choose a category:</div>
          {CATEGORY_NAMES.filter(name => name !== "random").map(name => (
            <RiveTextButton key={name} label={name.toUpperCase()}
              onClick={() => { setRandomMode(false); selectCategory(name); }}
              onTouchEnd={(e) => { e.preventDefault(); setRandomMode(false); selectCategory(name); }} />
          ))}
          <RiveTextButton label="?????" onClick={() => selectCategory("?????")}
            onTouchEnd={(e) => { e.preventDefault(); selectCategory("?????"); }} />
          <RiveTextButton label="CUSTOM BRACKET" onClick={() => setShowCustomInput(true)}
            onTouchEnd={(e) => { e.preventDefault(); setShowCustomInput(true); }} />
          <div style={vs.playerCountLobby}>
            {playerCount} player{playerCount !== 1 ? "s" : ""} joined
          </div>
          <button style={vs.logOffBtn} onClick={handleLogOff}>LOG OFF</button>
        </div>
      );
    }

    if (isHost && category) {
      // Show 'RANDOM' as the label if randomMode is true and category is Custom
      const displayCategory = randomMode && category === "Custom" ? "RANDOM" : category;
      return (
        <div style={vs.root}>
          {muteButton}
          <div style={vs.lobbyTitle}>BRACKET</div>
          <div style={vs.categorySelected}>
            <div style={vs.catLabel}>CATEGORY</div>
            <div style={vs.catName}>{displayCategory.toUpperCase()}</div>
          </div>
          <div style={vs.playerCountLobby}>
            {playerCount} player{playerCount !== 1 ? "s" : ""} joined
          </div>
          <button style={vs.startGameBtn} onClick={startGame}>
            ▶ START GAME
          </button>
          <button style={vs.backBtn} onClick={() => { setRandomMode(false); selectCategory(null); }}>
            ← BACK
          </button>
          <div style={vs.waitNote}>Waiting for players to join…</div>
          <button style={vs.logOffBtn} onClick={handleLogOff}>LOG OFF</button>
        </div>
      );
    }

    // Non-host lobby
    return (
      <div style={vs.root}>
        {muteButton}
        <div style={vs.lobbyTitle}>BRACKET</div>
        {category ? (
          <div style={vs.categorySelected}>
            <div style={vs.catLabel}>CATEGORY</div>
            <div style={vs.catName}>{category.toUpperCase()}</div>
          </div>
        ) : (
          <div style={vs.status}>Waiting for host to choose…</div>
        )}
        <div style={vs.playerCountLobby}>
          {playerCount} player{playerCount !== 1 ? "s" : ""} joined
        </div>
        <div style={vs.waitNote}>Waiting for host to start…</div>
        <button style={vs.logOffBtn} onClick={handleLogOff}>LOG OFF</button>
      </div>
    );
  }

  // ── Champion ──
  if (champion || phase === "finished") {
    return (
      <div style={vs.root}>
        {muteButton}
        <div style={vs.champBox}>
          <div style={vs.champEmoji}>🏆</div>
          <div style={vs.champLabel}>CHAMPION</div>
          <div style={vs.champName}>{champion}</div>
        </div>
        <div style={vs.waitNote}>Host can start a new round…</div>
        <button style={vs.logOffBtn} onClick={handleLogOff}>LOG OFF</button>
      </div>
    );
  }

  // ── Tiebreaker — host picks method ──
  if (phase === "tiebreaker" && tiebreaker && isHost) {
    return (
      <div style={vs.root}>
        {muteButton}
        <div style={vs.tiebreakerTitle}>TIE!</div>
        <div style={vs.tiebreakerVs}>{tiebreaker.c0} vs {tiebreaker.c1}</div>
        <div style={vs.lobbySubtitle}>How to break the tie?</div>
        <button style={{ ...vs.startGameBtn, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={startRPS}>
          <RockIcon size={22} /> ROCK PAPER SCISSORS
        </button>
        <button style={{ ...vs.startGameBtn, marginTop: 8 }} onClick={startOneSecond}>
          ⏱ ONE SECOND
        </button>
        <div style={vs.tiebreakerOr}>— OR —</div>
        <div style={vs.lobbySubtitle}>Pick the winner:</div>
        <RiveTextButton label={tiebreaker.c0} onClick={() => hostPickWinner(tiebreaker.c0)}
          onTouchEnd={(e) => { e.preventDefault(); hostPickWinner(tiebreaker.c0); }} />
        <RiveTextButton label={tiebreaker.c1} onClick={() => hostPickWinner(tiebreaker.c1)}
          onTouchEnd={(e) => { e.preventDefault(); hostPickWinner(tiebreaker.c1); }} />
      </div>
    );
  }

  // ── Tiebreaker — non-host waiting ──
  if (phase === "tiebreaker" && tiebreaker && !isHost) {
    return (
      <div style={vs.root}>
        {muteButton}
        <div style={vs.tiebreakerTitle}>TIE!</div>
        <div style={vs.tiebreakerVs}>{tiebreaker.c0} vs {tiebreaker.c1}</div>
        <div style={vs.status}>Host is deciding how to break the tie…</div>
      </div>
    );
  }

  // ── RPS Phase ──
  if (phase === "rps" && tiebreaker && tiebreaker.rps) {
    const rps = tiebreaker.rps;
    const amPlayer1 = playerId.current === rps.player1;
    const amPlayer2 = playerId.current === rps.player2;
    const amInRPS = amPlayer1 || amPlayer2;
    const mySide = amPlayer1 ? tiebreaker.c0 : tiebreaker.c1;

    // Show result briefly
    if (rps.result && rps.result !== "draw") {
      const rpsWinnerName = rps.result === "p1" ? tiebreaker.c0 : tiebreaker.c1;
      return (
        <div style={vs.root}>
          {muteButton}
          <div style={vs.tiebreakerTitle}>RPS RESULT</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "center", margin: "12px 0" }}>
            <RpsIcon choice={rps.choice1} size={48} />
            <span style={{ fontSize: 12, letterSpacing: 4, color: "#7a9a7a" }}>vs</span>
            <RpsIcon choice={rps.choice2} size={48} />
          </div>
          <div style={vs.champName}>{rpsWinnerName} WINS!</div>
        </div>
      );
    }

    if (rps.result === "draw") {
      return (
        <div style={vs.root}>
          {muteButton}
          <div style={vs.tiebreakerTitle}>DRAW!</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "center", margin: "12px 0" }}>
            <RpsIcon choice={rps.choice1} size={48} />
            <span style={{ fontSize: 12, letterSpacing: 4, color: "#7a9a7a" }}>vs</span>
            <RpsIcon choice={rps.choice2} size={48} />
          </div>
          <div style={vs.status}>Going again…</div>
        </div>
      );
    }

    if (amInRPS && !rpsChosen) {
      return (
        <div style={vs.root}>
          {muteButton}
          <div style={vs.tiebreakerTitle}>ROCK PAPER SCISSORS</div>
          <div style={vs.lobbySubtitle}>Round {rps.round} · You're playing for {mySide}</div>
          <div style={vs.rpsRow}>
            <button style={vs.rpsBtn} onClick={() => { setRpsChosen(true); submitRPS(playerId.current, "rock"); }}>
              <RockIcon size={40} />
              <span style={vs.rpsBtnLabel}>ROCK</span>
            </button>
            <button style={vs.rpsBtn} onClick={() => { setRpsChosen(true); submitRPS(playerId.current, "paper"); }}>
              <PaperIcon size={40} />
              <span style={vs.rpsBtnLabel}>PAPER</span>
            </button>
            <button style={vs.rpsBtn} onClick={() => { setRpsChosen(true); submitRPS(playerId.current, "scissors"); }}>
              <ScissorsIcon size={40} />
              <span style={vs.rpsBtnLabel}>SCISSORS</span>
            </button>
          </div>
        </div>
      );
    }

    if (amInRPS && rpsChosen) {
      return (
        <div style={vs.root}>
          {muteButton}
          <RockIcon size={56} style={{ margin: "0 auto 8px" }} />
          <div style={vs.status}>Waiting for opponent…</div>
        </div>
      );
    }

    // Spectator during RPS
    return (
      <div style={vs.root}>
        <div style={vs.tiebreakerTitle}>ROCK PAPER SCISSORS</div>
        <div style={vs.tiebreakerVs}>{tiebreaker.c0} vs {tiebreaker.c1}</div>
        <div style={vs.lobbySubtitle}>Round {rps.round}</div>
        <div style={vs.status}>Two players are battling it out…</div>
      </div>
    );
  }

  // ── One Second Phase ──
  if (phase === "oneSecond" && tiebreaker?.oneSecond) {
    const os = tiebreaker.oneSecond;
    const amP1 = playerId.current === os.player1;
    const amP2 = playerId.current === os.player2;
    const amActive = amP1 || amP2;
    const mySide = amP1 ? tiebreaker.c0 : tiebreaker.c1;
    const fmtMs = (ms) => (ms / 1000).toFixed(3);
    const p1Name = (playerNames && playerNames[os.player1]) || "Player 1";
    const p2Name = (playerNames && playerNames[os.player2]) || "Player 2";

    // ── Final result ──
    if (os.osPhase === "done") {
      const d1 = Math.abs(os.elapsed1 - 1000);
      const d2 = Math.abs(os.elapsed2 - 1000);
      const winnerName = os.winner === "p1" ? tiebreaker.c0 : tiebreaker.c1;
      return (
        <div style={vs.root}>
          {muteButton}
          <div style={vs.tiebreakerTitle}>ONE SECOND</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 300 }}>
            <div style={vs.osResultRow}>
              <span style={vs.osResultName}>{p1Name}</span>
              <span style={{ ...vs.osResultTime, color: os.winner === "p1" ? "#c8f55a" : "#3a5a3a" }}>{fmtMs(os.elapsed1)}s</span>
              <span style={vs.osResultDiff}>±{fmtMs(d1)}s</span>
            </div>
            <div style={vs.osResultRow}>
              <span style={vs.osResultName}>{p2Name}</span>
              <span style={{ ...vs.osResultTime, color: os.winner === "p2" ? "#c8f55a" : "#3a5a3a" }}>{fmtMs(os.elapsed2)}s</span>
              <span style={vs.osResultDiff}>±{fmtMs(d2)}s</span>
            </div>
          </div>
          <div style={vs.champName}>{winnerName} WINS!</div>
        </div>
      );
    }

    // ── Active player — waiting to start ──
    if (amActive && (os.osPhase === "waiting_p1" && amP1 || os.osPhase === "waiting_p2" && amP2)) {
      return (
        <div style={vs.root}>
          {muteButton}
          <div style={vs.tiebreakerTitle}>ONE SECOND</div>
          <div style={vs.lobbySubtitle}>You're playing for</div>
          <div style={{ fontSize: 20, letterSpacing: 3, color: "#c8f55a", marginBottom: 24 }}>{mySide}</div>
          <div style={{ fontSize: 11, letterSpacing: 3, color: "#2a4a2a", marginBottom: 16 }}>
            Press START, then press again to stop as close to 1.000s as possible
          </div>
          <button
            style={vs.osBigBtn}
            onClick={() => {
              osStartRef.current = Date.now();
              startOSTimer(playerId.current);
            }}
          >
            PRESS TO START
          </button>
        </div>
      );
    }

    // ── Active player — timer running ──
    if (amActive && (os.osPhase === "running_p1" && amP1 || os.osPhase === "running_p2" && amP2)) {
      return (
        <div style={vs.root}>
          {muteButton}
          <div style={vs.tiebreakerTitle}>ONE SECOND</div>
          <div style={vs.osTimerDisplay}>{fmtMs(osDisplayMs)}</div>
          <button
            style={{ ...vs.osBigBtn, background: "#1a0a0a", borderColor: "#c85a5a", color: "#c85a5a" }}
            onClick={() => {
              const elapsed = osStartRef.current ? Date.now() - osStartRef.current : osDisplayMs;
              stopOSTimer(playerId.current, elapsed);
            }}
          >
            PRESS TO STOP
          </button>
        </div>
      );
    }

    // ── Active player — done, waiting for P2 ──
    if (amP1 && (os.osPhase === "done_p1" || os.osPhase === "waiting_p2")) {
      return (
        <div style={vs.root}>
          {muteButton}
          <div style={vs.tiebreakerTitle}>ONE SECOND</div>
          <div style={vs.lobbySubtitle}>Your time</div>
          <div style={{ fontSize: 48, fontWeight: "bold", letterSpacing: 2, color: "#c8f55a", fontVariantNumeric: "tabular-nums" }}>
            {fmtMs(os.elapsed1)}s
          </div>
          <div style={{ fontSize: 12, letterSpacing: 3, color: "#3a5a3a" }}>
            ±{fmtMs(Math.abs(os.elapsed1 - 1000))}s from 1.000
          </div>
          <div style={vs.status}>Waiting for {p2Name}…</div>
        </div>
      );
    }

    // ── Spectator / observer — show live timer or results ──
    const isRunning = os.osPhase === "running_p1" || os.osPhase === "running_p2";
    return (
      <div style={vs.root}>
        {muteButton}
        <div style={vs.tiebreakerTitle}>ONE SECOND</div>
        <div style={vs.tiebreakerVs}>{tiebreaker.c0} vs {tiebreaker.c1}</div>
        {isRunning && (
          <div style={vs.osTimerDisplay}>{fmtMs(osDisplayMs)}</div>
        )}
        {os.elapsed1 != null && !isRunning && (
          <div style={{ fontSize: 13, letterSpacing: 2, color: "#3a5a3a", marginTop: 8 }}>
            {p1Name}: {fmtMs(os.elapsed1)}s
          </div>
        )}
        <div style={vs.status}>
          {os.osPhase === "waiting_p1" && `${p1Name} getting ready…`}
          {os.osPhase === "running_p1" && `${p1Name} is timing!`}
          {os.osPhase === "done_p1" && `${p1Name} stopped · ${p2Name} up next…`}
          {os.osPhase === "waiting_p2" && `${p2Name} getting ready…`}
          {os.osPhase === "running_p2" && `${p2Name} is timing!`}
        </div>
      </div>
    );
  }

  // ── Waiting for match ──
  if (!currentMatchId || !bracket) {
    return (
      <div style={vs.root}>
        {muteButton}
        <div style={vs.waitBox}>
          <div style={vs.waitDot}>●</div>
          <div style={vs.status}>Waiting for next match…</div>
        </div>
        <button style={vs.logOffBtn} onClick={handleLogOff}>LOG OFF</button>
      </div>
    );
  }

  const match = allMatches(bracket).find((m) => m.id === currentMatchId);
  if (!match) {
    return (
      <div style={vs.root}>
        {muteButton}
        <div style={vs.status}>Waiting…</div>
      </div>
    );
  }

  const [c0, c1] = match.contenders;

  // ── Already voted ──
  if (voted) {
    return (
      <div style={vs.root}>
        {muteButton}
        <div style={vs.votedBox}>
          <div style={vs.votedCheck}>✓</div>
          <div style={vs.votedText}>Vote submitted!</div>
          <div style={vs.votedCount}>
            {votedCount}/{totalPlayers} voted
          </div>
          <div style={vs.waitingNote}>Waiting for others…</div>
        </div>
        {isHost && (
          <button style={vs.skipBtn} onClick={skip}>SKIP →</button>
        )}
      </div>
    );
  }

  // ── Vote screen ──
  return (
    <div style={vs.root}>
      {muteButton}
      <div style={vs.header}>TAP TO VOTE</div>
      <RiveTextButton label={c0}
        onClick={() => vote(c0)}
        onTouchEnd={(e) => { e.preventDefault(); vote(c0); }} />
      <div style={vs.vsLabel}>VS</div>
      <RiveTextButton label={c1}
        onClick={() => vote(c1)}
        onTouchEnd={(e) => { e.preventDefault(); vote(c1); }} />
      <div style={vs.footer}>
        {votedCount}/{totalPlayers} voted
      </div>
      {isHost && (
        <button style={vs.skipBtn} onClick={skip}>SKIP →</button>
      )}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const _mono = "'PT Mono', monospace";
const _tap  = { WebkitTapHighlightColor: "transparent", touchAction: "manipulation" };
const _col  = { textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 };

const _sizeBtnBase = {
  flex: 1, maxWidth: 90, padding: "10px 0", fontSize: 18, fontWeight: "bold",
  letterSpacing: 2, fontFamily: _mono, borderRadius: 6, cursor: "pointer", ..._tap,
};
const _navBtnBase = {
  fontSize: 12, letterSpacing: 3, fontFamily: _mono, background: "transparent",
  color: "#7a9a7a", border: "1px solid #3a5a3a", borderRadius: 6, cursor: "pointer", ..._tap,
};

const vs = {
  root: {
    minHeight: "100dvh", background: "#060e06", color: "#c8f55a", fontFamily: _mono,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: 24, boxSizing: "border-box", gap: 16,
    userSelect: "none", position: "relative", WebkitUserSelect: "none",
  },
  header:      { fontSize: 12, letterSpacing: 6, color: "#7a9a7a", marginBottom: 8 },
  choiceBtn: {
    width: "100%", maxWidth: 340, padding: "36px 20px", fontSize: 22,
    fontWeight: "bold", letterSpacing: 3, fontFamily: _mono,
    background: "#0f1f0f", color: "#c8f55a", border: "2px solid #1a2e1a",
    borderRadius: 8, cursor: "pointer", transition: "all 0.15s", ..._tap,
  },
  vsLabel:     { fontSize: 16, fontWeight: "bold", color: "#6a8a6a", letterSpacing: 4 },
  footer:      { marginTop: 12, fontSize: 12, color: "#7a9a7a", letterSpacing: 2 },
  status:      { fontSize: 14, color: "#7a9a7a", letterSpacing: 2, textAlign: "center" },
  spinner: {
    width: 24, height: 24, border: "2px solid #1a2e1a",
    borderTop: "2px solid #c8f55a", borderRadius: "50%",
    animation: "spin 1s linear infinite", marginBottom: 12,
  },
  lobbyTitle:    { fontSize: 32, fontWeight: "bold", letterSpacing: 10, textShadow: "0 0 20px #c8f55a44", marginBottom: 8 },
  lobbySubtitle: { fontSize: 12, color: "#7a9a7a", letterSpacing: 3, marginBottom: 12 },
  // ── Original category button design (kept for reference) ──
  categoryBtn: {
    width: "100%", maxWidth: 300, padding: "18px 20px", fontSize: 16,
    fontWeight: "bold", letterSpacing: 4, fontFamily: _mono,
    background: "#0f1f0f", color: "#c8f55a", border: "1px solid #1a2e1a",
    borderRadius: 6, cursor: "pointer", transition: "all 0.15s", ..._tap,
  },
  categorySelected: {
    textAlign: "center", padding: "16px 28px",
    border: "1px solid #c8f55a", boxShadow: "0 0 20px #c8f55a22", marginBottom: 8,
  },
  catLabel:        { fontSize: 10, letterSpacing: 4, color: "#7a9a7a", marginBottom: 6 },
  catName:         { fontSize: 22, fontWeight: "bold", letterSpacing: 4 },
  playerCountLobby:{ fontSize: 14, color: "#7a9a7a", letterSpacing: 2 },
  startGameBtn: {
    padding: "16px 36px", fontSize: 18, fontWeight: "bold", letterSpacing: 4,
    fontFamily: _mono, background: "#0f1f0f", color: "#c8f55a",
    border: "2px solid #c8f55a", borderRadius: 6, cursor: "pointer",
    boxShadow: "0 0 16px #c8f55a22", ..._tap,
  },
  backBtn:  { ..._navBtnBase, padding: "10px 24px" },
  skipBtn:  { ..._navBtnBase, padding: "10px 28px", marginTop: 8 },
  logOffBtn: {
    marginTop: 16, padding: "8px 20px", fontSize: 10, letterSpacing: 3,
    fontFamily: _mono, background: "transparent",
    color: "#bb6666", border: "1px solid #bb6666", borderRadius: 4,
    cursor: "pointer", ..._tap,
  },
  waitNote:     { fontSize: 11, color: "#6a8a6a", letterSpacing: 2 },
  waitingNote:  { fontSize: 11, color: "#6a8a6a", letterSpacing: 2, marginTop: 8 },
  votedBox:     _col,
  waitBox:      _col,
  champBox:     { ..._col, padding: "28px 36px", border: "1px solid #c8f55a", boxShadow: "0 0 40px #c8f55a22" },
  votedCheck:   { fontSize: 56, color: "#c8f55a", textShadow: "0 0 20px #c8f55a44" },
  votedText:    { fontSize: 18, letterSpacing: 3 },
  votedCount:   { fontSize: 14, color: "#7a9a7a", letterSpacing: 2 },
  waitDot:      { fontSize: 24, color: "#6a8a6a", animation: "pulse 2s ease-in-out infinite" },
  champEmoji:   { fontSize: 48 },
  champLabel:   { fontSize: 12, letterSpacing: 4, color: "#7a9a7a" },
  champName:    { fontSize: 28, fontWeight: "bold", letterSpacing: 4, color: "#c8f55a", textShadow: "0 0 24px #c8f55a" },
  // ── Tiebreaker ──
  tiebreakerTitle: { fontSize: 36, fontWeight: "bold", letterSpacing: 8, textShadow: "0 0 20px #c8f55a44" },
  tiebreakerVs:    { fontSize: 16, letterSpacing: 3, color: "#7a9a7a" },
  tiebreakerOr:    { fontSize: 12, color: "#6a8a6a", letterSpacing: 4, margin: "4px 0" },
  // ── RPS ──
  rpsRow: { display: "flex", gap: 16, marginTop: 8 },
  rpsBtn: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
    padding: "24px 20px", background: "#0f1f0f", border: "2px solid #1a2e1a",
    borderRadius: 12, cursor: "pointer", color: "#c8f55a",
    fontFamily: _mono, transition: "all 0.15s", minWidth: 90, ..._tap,
  },
  rpsBtnLabel: { fontSize: 10, letterSpacing: 3, fontWeight: "bold" },
  // ── One Second ──
  osTimerDisplay: {
    fontSize: 72, fontWeight: "bold", letterSpacing: 2, color: "#c8f55a",
    fontVariantNumeric: "tabular-nums", fontFamily: _mono,
    textShadow: "0 0 30px #c8f55a66", lineHeight: 1, margin: "16px 0",
  },
  osBigBtn: {
    width: "100%", maxWidth: 300, padding: "28px 0", fontSize: 18,
    fontWeight: "bold", letterSpacing: 4, fontFamily: _mono,
    background: "#0a1f0a", color: "#c8f55a", border: "2px solid #c8f55a",
    borderRadius: 8, cursor: "pointer", ..._tap,
  },
  osResultRow:  { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#0a140a", border: "1px solid #1a2e1a", borderRadius: 4 },
  osResultName: { flex: 1, fontSize: 12, letterSpacing: 2, color: "#7a9a7a" },
  osResultTime: { fontSize: 20, fontWeight: "bold", letterSpacing: 1, fontVariantNumeric: "tabular-nums" },
  osResultDiff: { fontSize: 11, letterSpacing: 1, color: "#2a4a2a" },
  // ── Name entry ──
  nameInput: {
    width: "100%", maxWidth: 280, padding: "16px 20px", fontSize: 24,
    fontWeight: "bold", letterSpacing: 6, fontFamily: _mono,
    background: "#0f1f0f", color: "#c8f55a", border: "2px solid #1a2e1a",
    borderRadius: 8, textAlign: "center", outline: "none", textTransform: "uppercase",
  },
  nameError: { fontSize: 16, color: "#ff4444", letterSpacing: 3, fontWeight: "bold", textAlign: "center", padding: "8px 0" },
  muteBtn: {
    position: "absolute", top: 16, right: 16, zIndex: 10,
    background: "transparent", border: "1px solid #1a2e1a", borderRadius: 6,
    padding: "6px 10px", fontSize: 20, cursor: "pointer", color: "#c8f55a", lineHeight: 1, ..._tap,
  },
  // ── Custom bracket ──
  customGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr",
    gap: 6, width: "100%", maxWidth: 340, maxHeight: "45vh", overflowY: "auto", padding: "4px 0",
  },
  customItemInput: {
    width: "100%", padding: 8, fontSize: 12, fontFamily: _mono,
    background: "#0f1f0f", color: "#c8f55a", border: "1px solid #1a2e1a",
    borderRadius: 4, outline: "none", textAlign: "center", boxSizing: "border-box",
  },
  // ── Bracket size selector ──
  sizeRow:      { display: "flex", gap: 8, marginTop: 8 },
  sizeLabel:    { fontSize: 9, letterSpacing: 4, color: "#2a4a2a", marginTop: -4, marginBottom: 4 },
  sizeBtn:      { ..._sizeBtnBase, background: "#0a140a", color: "#3a5a3a", border: "1px solid #1a2e1a" },
  sizeBtnActive:{ ..._sizeBtnBase, background: "#0f1f0f", color: "#c8f55a", border: "2px solid #c8f55a" },
};
