// ─── Shared Firebase game-state hook ──────────────────────────────────────────
// Manages the full game lifecycle: lobby → playing → tiebreaker/rps → finished

import { useState, useEffect, useRef, useCallback } from "react";
import { ref, onValue, set, update, get, remove } from "firebase/database";
import { db } from "./firebase.js";
import {
  initBracket, allMatches, nextUnplayed, applyVote, advance,
} from "./bracketLogic.js";
import { CATEGORIES, getAllOptions, pickRandom } from "./categories.js";

const GAME_REF = ref(db, "game");

// Firebase strips null values and can mangle arrays.
function sanitize(obj) {
  if (obj === null || obj === undefined) return "__null__";
  if (Array.isArray(obj)) return obj.map(sanitize);
  if (typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = sanitize(v);
    return out;
  }
  return obj;
}

function desanitize(obj) {
  if (obj === "__null__") return null;
  if (Array.isArray(obj)) return obj.map(desanitize);
  if (typeof obj === "object" && obj !== null) {
    const keys = Object.keys(obj);
    const isArray = keys.length > 0 && keys.every((k) => /^\d+$/.test(k));
    if (isArray) {
      const arr = [];
      for (const k of keys) arr[Number(k)] = desanitize(obj[k]);
      return arr;
    }
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = desanitize(v);
    return out;
  }
  return obj;
}

async function firebaseSet(r, data) { await set(r, sanitize(data)); }
async function firebaseUpdate(r, data) { await update(r, sanitize(data)); }
function firebaseDeserialize(data) { return desanitize(data); }

function initialGameState() {
  return {
    phase: "lobby",
    category: null,
    bracketSize: 32,
    players: {},
    totalPlayers: 0,
    hostId: null,
    bracket: null,
    currentMatchId: null,
    champion: null,
    voters: {},
    tiebreaker: null,
    scores: {},
  };
}

async function ensureGameExists() {
  try {
    const snap = await get(GAME_REF);
    if (!snap.exists() || !snap.val().phase) {
      await firebaseSet(GAME_REF, initialGameState());
    }
  } catch (err) {
    console.error("Firebase ensureGameExists error:", err);
  }
}

// Determine winner of RPS. Returns "p1", "p2", or "draw".
function rpsWinner(c1, c2) {
  if (c1 === c2) return "draw";
  if ((c1 === "rock" && c2 === "scissors") ||
      (c1 === "scissors" && c2 === "paper") ||
      (c1 === "paper" && c2 === "rock")) return "p1";
  return "p2";
}

export function useGameState(playerId = null) {
  const [phase, setPhase]                   = useState("lobby");
  const [category, setCategory]             = useState(null);
  const [bracketSize, setBracketSizeState]  = useState(32);
  const [playerCount, setPlayerCount]       = useState(0);
  const [totalPlayers, setTotalPlayers]     = useState(0);
  const [hostId, setHostId]                 = useState(null);
  const [bracket, setBracket]               = useState(null);
  const [currentMatchId, setCurrentMatchId] = useState(null);
  const [champion, setChampion]             = useState(null);
  const [votedCount, setVotedCount]         = useState(0);
  const [connected, setConnected]           = useState(false);
  const [tiebreaker, setTiebreaker]         = useState(null);
  const [playerNames, setPlayerNames]       = useState({});
  const [scores, setScores]                 = useState({});
  const resolveTimer = useRef(null);

  const isHost = !!(hostId && playerId && hostId === playerId);

  useEffect(() => {
    let cancelled = false;
    const unsub = onValue(GAME_REF, (snap) => {
      const raw = snap.val();
      setConnected(true);
      if (!raw || !raw.phase) {
        if (!cancelled) ensureGameExists();
        return;
      }
      const data = firebaseDeserialize(raw);
      setPhase(data.phase || "lobby");
      setCategory(data.category || null);
      setBracketSizeState(data.bracketSize || 32);
      const players = data.players || {};
      setPlayerCount(Object.keys(players).length);
      setTotalPlayers(data.totalPlayers || 0);
      setHostId(data.hostId || null);
      setBracket(data.bracket || null);
      setCurrentMatchId(data.currentMatchId || null);
      setChampion(data.champion || null);
      setTiebreaker(data.tiebreaker || null);
      setPlayerNames(data.players || {});
      setScores(data.scores || {});
      const voters = data.voters || {};
      setVotedCount(Object.keys(voters).length);
    }, (err) => {
      console.error("Firebase onValue error:", err);
    });
    return () => { cancelled = true; unsub(); };
  }, []);

  // ── Join game ──
  const joinGame = useCallback(async (pid, name) => {
    const snap = await get(GAME_REF);
    let data = firebaseDeserialize(snap.val());
    if (!data) return;
    // If game is finished, reset to fresh lobby so old data is cleared
    if (data.phase === "finished") {
      await firebaseSet(GAME_REF, initialGameState());
      data = initialGameState();
    }
    if (data.phase !== "lobby") return;          // only join during lobby
    const players = data.players || {};
    if (players[pid]) return;
    const updates = {};
    updates["players/" + pid] = name || "ANON";
    if (!data.hostId) updates.hostId = pid;
    await firebaseUpdate(GAME_REF, updates);
  }, []);

  // ── Leave game ──
  const leaveGame = useCallback(async (pid) => {
    const playerRef = ref(db, "game/players/" + pid);
    await remove(playerRef);
    // Update totalPlayers if in playing phase
    const snap = await get(GAME_REF);
    const data = firebaseDeserialize(snap.val());
    if (!data) return;
    const players = data.players || {};
    const remaining = Object.keys(players).length;
    const updates = {};
    if (data.phase === "playing" || data.phase === "tiebreaker" || data.phase === "rps") {
      updates.totalPlayers = Math.max(remaining, 1);
    }
    // If this was the host, reassign
    if (data.hostId === pid) {
      const others = Object.keys(players).filter(k => k !== pid);
      updates.hostId = others.length > 0 ? others[0] : "__null__";
    }
    if (Object.keys(updates).length > 0) {
      await firebaseUpdate(GAME_REF, updates);
    }
  }, []);

  // ── Select category ──
  const selectCategory = useCallback(async (cat) => {
    await firebaseUpdate(GAME_REF, { category: cat === null ? "__null__" : cat });
  }, []);

  // ── Set bracket size ──
  const setBracketSize = useCallback(async (size) => {
    await firebaseUpdate(GAME_REF, { bracketSize: size });
  }, []);

  // ── Start game ──
  const startGame = useCallback(async () => {
    const snap = await get(GAME_REF);
    const data = firebaseDeserialize(snap.val());
    if (!data || !data.category || data.phase !== "lobby") return;
    const size = data.bracketSize || 32;
    let items;
    if (data.category === "?????") {
      items = pickRandom(getAllOptions(), size);
    } else if (data.category === "Custom") {
      items = data.customItems;
      if (!items || items.length !== size) return;
    } else {
      items = CATEGORIES[data.category]?.slice(0, size);
    }
    if (!items) return;
    const players = data.players || {};
    const numPlayers = Math.max(Object.keys(players).length, 1);
    const b = initBracket(items);
    const first = nextUnplayed(b);
    await firebaseSet(GAME_REF, {
      phase: "playing",
      category: data.category,
      players: data.players || {},
      totalPlayers: numPlayers,
      hostId: data.hostId,
      bracket: b,
      currentMatchId: first ? first.id : null,
      champion: null,
      voters: {},
      tiebreaker: null,
      scores: {},
    });
  }, []);

  // ── Set custom items (for Custom category) ──
  const setCustomItems = useCallback(async (items) => {
    await firebaseUpdate(GAME_REF, {
      category: "Custom",
      customItems: items,
    });
  }, []);

  // Helper: advance the bracket after a match is decided
  const advanceAfterWin = useCallback(async (curBracket, matchId, winner) => {
    // Update player scores based on who voted correctly
    const scoreSnap = await get(GAME_REF);
    const scoreData = firebaseDeserialize(scoreSnap.val());
    const voters = scoreData ? (scoreData.voters || {}) : {};
    const updatedScores = scoreData ? { ...(scoreData.scores || {}) } : {};
    for (const [pid, choice] of Object.entries(voters)) {
      if (!updatedScores[pid]) updatedScores[pid] = { correct: 0, total: 0 };
      updatedScores[pid].total += 1;
      if (choice === winner) updatedScores[pid].correct += 1;
    }

    const resolved = advance(curBracket, matchId, winner);
    if (resolved.final && resolved.final.winner) {
      await firebaseUpdate(GAME_REF, {
        bracket: resolved,
        currentMatchId: null,
        champion: resolved.final.winner,
        phase: "finished",
        voters: {},
        tiebreaker: null,
        scores: updatedScores,
      });
    } else {
      const nxt = nextUnplayed(resolved);
      await firebaseUpdate(GAME_REF, {
        bracket: resolved,
        currentMatchId: nxt ? nxt.id : null,
        phase: "playing",
        voters: {},
        tiebreaker: null,
        scores: updatedScores,
      });
    }
  }, []);

  // ── Vote ──
  const vote = useCallback(async (pid, choice) => {
    const voterRef = ref(db, "game/voters/" + pid);
    await set(voterRef, choice);

    const snap = await get(GAME_REF);
    const data = firebaseDeserialize(snap.val());
    if (!data || !data.currentMatchId) return;

    const updated = applyVote(data.bracket, data.currentMatchId, choice);
    await firebaseUpdate(GAME_REF, { bracket: updated });

    const voters = data.voters || {};
    voters[pid] = choice;
    const count = Object.keys(voters).length;
    const needed = data.totalPlayers || 1;

    if (count >= needed) {
      // Check for tie
      const m = allMatches(updated).find(x => x.id === data.currentMatchId);
      if (m) {
        const [c0, c1] = m.contenders;
        const v0 = (c0 && m.votes[c0]) || 0;
        const v1 = (c1 && m.votes[c1]) || 0;
        if (v0 === v1 && c0 && c1) {
          // TIE — enter tiebreaker phase, host decides
          if (resolveTimer.current) clearTimeout(resolveTimer.current);
          await firebaseUpdate(GAME_REF, {
            phase: "tiebreaker",
            tiebreaker: { matchId: data.currentMatchId, c0: c0, c1: c1 },
          });
          return;
        }
      }
      // Not a tie — auto resolve
      if (resolveTimer.current) clearTimeout(resolveTimer.current);
      resolveTimer.current = setTimeout(async () => {
        const freshSnap = await get(GAME_REF);
        const fresh = firebaseDeserialize(freshSnap.val());
        if (!fresh || !fresh.currentMatchId) return;
        const fm = allMatches(fresh.bracket).find(x => x.id === fresh.currentMatchId);
        if (!fm) return;
        const [fc0, fc1] = fm.contenders;
        const fv0 = (fc0 && fm.votes[fc0]) || 0;
        const fv1 = (fc1 && fm.votes[fc1]) || 0;
        const winner = fv0 >= fv1 ? fc0 : fc1;
        await advanceAfterWin(fresh.bracket, fresh.currentMatchId, winner);
        resolveTimer.current = null;
      }, 800);
    }
  }, [advanceAfterWin]);

  // ── Start next match ──
  const startNext = useCallback(async () => {
    const snap = await get(GAME_REF);
    const data = firebaseDeserialize(snap.val());
    if (!data || data.currentMatchId || data.champion) return;
    const nxt = nextUnplayed(data.bracket);
    if (nxt) {
      await firebaseUpdate(GAME_REF, { currentMatchId: nxt.id, voters: {}, phase: "playing", tiebreaker: null });
    }
  }, []);

  // ── Skip / force result (picks first contender on tie) ──
  const skip = useCallback(async () => {
    const snap = await get(GAME_REF);
    const data = firebaseDeserialize(snap.val());
    if (!data || !data.currentMatchId) return;
    if (resolveTimer.current) clearTimeout(resolveTimer.current);
    const m = allMatches(data.bracket).find(x => x.id === data.currentMatchId);
    if (!m) return;
    const [c0, c1] = m.contenders;
    const v0 = (c0 && m.votes[c0]) || 0;
    const v1 = (c1 && m.votes[c1]) || 0;
    const winner = v0 >= v1 ? c0 : c1;
    await advanceAfterWin(data.bracket, data.currentMatchId, winner);
  }, [advanceAfterWin]);

  // ── Host picks tiebreaker winner ──
  const hostPickWinner = useCallback(async (winner) => {
    const snap = await get(GAME_REF);
    const data = firebaseDeserialize(snap.val());
    if (!data || !data.currentMatchId) return;
    await advanceAfterWin(data.bracket, data.currentMatchId, winner);
  }, [advanceAfterWin]);

  // ── Start RPS tiebreaker ──
  const startRPS = useCallback(async () => {
    const snap = await get(GAME_REF);
    const data = firebaseDeserialize(snap.val());
    if (!data || !data.tiebreaker) return;
    const tb = data.tiebreaker;
    const voters = data.voters || {};
    // Separate voters by side
    const side0 = []; // voted for c0
    const side1 = []; // voted for c1
    for (const [pid, choice] of Object.entries(voters)) {
      if (choice === tb.c0) side0.push(pid);
      else if (choice === tb.c1) side1.push(pid);
    }
    // Pick one random player from each side. If a side has nobody, use the host.
    const p1 = side0.length > 0 ? side0[Math.floor(Math.random() * side0.length)] : data.hostId;
    const p2 = side1.length > 0 ? side1[Math.floor(Math.random() * side1.length)] : data.hostId;
    await firebaseUpdate(GAME_REF, {
      phase: "rps",
      tiebreaker: {
        matchId: tb.matchId,
        c0: tb.c0,
        c1: tb.c1,
        rps: {
          player1: p1,
          player2: p2,
          choice1: null,
          choice2: null,
          round: 1,
          result: null,
        },
      },
    });
  }, []);

  // ── Submit RPS choice ──
  const submitRPS = useCallback(async (pid, choice) => {
    const snap = await get(GAME_REF);
    const data = firebaseDeserialize(snap.val());
    if (!data || !data.tiebreaker || !data.tiebreaker.rps) return;
    const rps = data.tiebreaker.rps;
    const updates = {};
    if (pid === rps.player1 && !rps.choice1) {
      updates["tiebreaker/rps/choice1"] = choice;
    } else if (pid === rps.player2 && !rps.choice2) {
      updates["tiebreaker/rps/choice2"] = choice;
    } else {
      return; // not this player's turn or already chosen
    }
    await firebaseUpdate(GAME_REF, updates);

    // Re-read to check if both have chosen
    const snap2 = await get(GAME_REF);
    const data2 = firebaseDeserialize(snap2.val());
    if (!data2 || !data2.tiebreaker || !data2.tiebreaker.rps) return;
    const rps2 = data2.tiebreaker.rps;
    if (rps2.choice1 && rps2.choice2) {
      const result = rpsWinner(rps2.choice1, rps2.choice2);
      if (result === "draw") {
        // Show draw result immediately
        await firebaseUpdate(GAME_REF, { "tiebreaker/rps/result": "draw" });
        // After a brief delay, reset for next round
        setTimeout(async () => {
          await firebaseUpdate(GAME_REF, {
            "tiebreaker/rps/choice1": "__null__",
            "tiebreaker/rps/choice2": "__null__",
            "tiebreaker/rps/round": (rps2.round || 1) + 1,
            "tiebreaker/rps/result": "__null__",
          });
        }, 1500);
      } else {
        // We have a winner
        const tb = data2.tiebreaker;
        const bracketWinner = result === "p1" ? tb.c0 : tb.c1;
        // Show result briefly then advance
        await firebaseUpdate(GAME_REF, { "tiebreaker/rps/result": result });
        setTimeout(async () => {
          const snap3 = await get(GAME_REF);
          const data3 = firebaseDeserialize(snap3.val());
          if (!data3 || !data3.currentMatchId) return;
          await advanceAfterWin(data3.bracket, data3.currentMatchId, bracketWinner);
        }, 2000);
      }
    }
  }, [advanceAfterWin]);

  // ── Start One Second tiebreaker ──
  const startOneSecond = useCallback(async () => {
    const snap = await get(GAME_REF);
    const data = firebaseDeserialize(snap.val());
    if (!data || !data.tiebreaker) return;
    const tb = data.tiebreaker;
    const voters = data.voters || {};
    const side0 = [];
    const side1 = [];
    for (const [pid, choice] of Object.entries(voters)) {
      if (choice === tb.c0) side0.push(pid);
      else if (choice === tb.c1) side1.push(pid);
    }
    const p1 = side0.length > 0 ? side0[Math.floor(Math.random() * side0.length)] : data.hostId;
    const p2 = side1.length > 0 ? side1[Math.floor(Math.random() * side1.length)] : data.hostId;
    await firebaseUpdate(GAME_REF, {
      phase: "oneSecond",
      tiebreaker: {
        matchId: tb.matchId,
        c0: tb.c0,
        c1: tb.c1,
        oneSecond: {
          player1: p1,
          player2: p2,
          osPhase: "waiting_p1",
          startTs1: null,
          elapsed1: null,
          startTs2: null,
          elapsed2: null,
          winner: null,
        },
      },
    });
  }, []);

  // ── One Second: player presses START ──
  const startOSTimer = useCallback(async (pid) => {
    const snap = await get(GAME_REF);
    const data = firebaseDeserialize(snap.val());
    if (!data?.tiebreaker?.oneSecond) return;
    const os = data.tiebreaker.oneSecond;
    if (os.osPhase === "waiting_p1" && pid === os.player1) {
      await firebaseUpdate(GAME_REF, {
        "tiebreaker/oneSecond/osPhase": "running_p1",
        "tiebreaker/oneSecond/startTs1": Date.now(),
      });
    } else if (os.osPhase === "waiting_p2" && pid === os.player2) {
      await firebaseUpdate(GAME_REF, {
        "tiebreaker/oneSecond/osPhase": "running_p2",
        "tiebreaker/oneSecond/startTs2": Date.now(),
      });
    }
  }, []);

  // ── One Second: player presses STOP ──
  // elapsed is computed by the calling client (Date.now() - local start capture) for accuracy
  const stopOSTimer = useCallback(async (pid, elapsed) => {
    const snap = await get(GAME_REF);
    const data = firebaseDeserialize(snap.val());
    if (!data?.tiebreaker?.oneSecond) return;
    const os = data.tiebreaker.oneSecond;
    if (os.osPhase === "running_p1" && pid === os.player1) {
      await firebaseUpdate(GAME_REF, {
        "tiebreaker/oneSecond/osPhase": "done_p1",
        "tiebreaker/oneSecond/elapsed1": elapsed,
      });
      // Auto-advance to player 2 after showing result
      setTimeout(async () => {
        const s2 = await get(GAME_REF);
        const d2 = firebaseDeserialize(s2.val());
        if (d2?.tiebreaker?.oneSecond?.osPhase === "done_p1") {
          await firebaseUpdate(GAME_REF, { "tiebreaker/oneSecond/osPhase": "waiting_p2" });
        }
      }, 3000);
    } else if (os.osPhase === "running_p2" && pid === os.player2) {
      const diff1 = Math.abs(os.elapsed1 - 1000);
      const diff2 = Math.abs(elapsed - 1000);
      const winner = diff1 <= diff2 ? "p1" : "p2";
      const winnerContender = winner === "p1" ? data.tiebreaker.c0 : data.tiebreaker.c1;
      await firebaseUpdate(GAME_REF, {
        "tiebreaker/oneSecond/osPhase": "done",
        "tiebreaker/oneSecond/elapsed2": elapsed,
        "tiebreaker/oneSecond/winner": winner,
      });
      // Auto-advance bracket after displaying results
      setTimeout(async () => {
        const s2 = await get(GAME_REF);
        const d2 = firebaseDeserialize(s2.val());
        if (!d2?.currentMatchId) return;
        await advanceAfterWin(d2.bracket, d2.currentMatchId, winnerContender);
      }, 4000);
    }
  }, [advanceAfterWin]);

  // ── Play again ──
  const playAgain = useCallback(async () => {
    if (resolveTimer.current) clearTimeout(resolveTimer.current);
    await firebaseSet(GAME_REF, initialGameState());
  }, []);

  // ── Clear all players (manual reset) ──
  const clearPlayers = useCallback(async () => {
    if (resolveTimer.current) clearTimeout(resolveTimer.current);
    await firebaseSet(GAME_REF, initialGameState());
  }, []);

  return {
    phase, category, bracketSize, playerCount, totalPlayers, hostId, isHost,
    bracket, currentMatchId, champion, votedCount, connected, tiebreaker,
    playerNames, scores,
    joinGame, leaveGame, selectCategory, setBracketSize, startGame, setCustomItems,
    vote, startNext, skip, hostPickWinner, startRPS, submitRPS,
    startOneSecond, startOSTimer, stopOSTimer,
    playAgain, clearPlayers,
  };
}
