// ─── Shared Firebase game-state hook ──────────────────────────────────────────
// Manages the full game lifecycle: lobby → playing → tiebreaker/rps → finished

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ref, onValue, set, update, get, remove, push, onChildAdded, query, orderByChild, startAt } from "firebase/database";
import { db } from "./firebase.js";
import {
  initBracket, allMatches, nextUnplayed, applyVote, advance,
} from "./bracketLogic.js";
import { getAllOptions, pickRandom } from "./categories.js";

const GLOBAL_STATS_REF = ref(db, "globalStats");

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Make a Firebase-safe key from any option name
export function safeKey(name) {
  return name.replace(/[.#$[\]/\s]/g, "_").replace(/_+/g, "_").toLowerCase().slice(0, 60);
}

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
async function firebaseUpdate(r, data) { await update(r, sanitize({ ...data, lastActivity: Date.now() })); }
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
    playerColors: {},
    matchNote: null,
    tiebreakerCounts: {},
    doubleVoter: null,
    minigamesEnabled: false,
    minigameMatchIds: [],
    simpleUX: false,
  };
}

async function ensureGameExists(gameRef) {
  try {
    const snap = await get(gameRef);
    if (!snap.exists() || !snap.val().phase) {
      await firebaseSet(gameRef, initialGameState());
    }
  } catch (err) {
    console.error("Firebase ensureGameExists error:", err);
  }
}

// Weighted random pick from a pool. Players with more tiebreakerCounts get lower odds.
function weightedPick(pool, counts) {
  if (pool.length === 0) return null;
  const weights = pool.map(pid => 1 / ((counts[pid] || 0) + 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

// Pick N random non-final match IDs for minigames.
// 32-bracket → 5, 16-bracket → 4, 8-bracket → 3.
function pickMinigameMatchIds(bracket, bracketSize) {
  const finalId = bracket.final?.id;
  const nonFinal = allMatches(bracket).filter(m => m.id !== finalId);
  const count = bracketSize >= 32 ? 5 : bracketSize >= 16 ? 4 : 3;
  return shuffle(nonFinal).slice(0, Math.min(count, nonFinal.length)).map(m => m.id);
}

// Determine winner of RPS. Returns "p1", "p2", or "draw".
function rpsWinner(c1, c2) {
  if (c1 === c2) return "draw";
  if ((c1 === "rock" && c2 === "scissors") ||
      (c1 === "scissors" && c2 === "paper") ||
      (c1 === "paper" && c2 === "rock")) return "p1";
  return "p2";
}

export function useGameState(playerId = null, roomCode = null) {
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
  const [globalStats, setGlobalStats]       = useState([]);
  const [voters, setVoters]                 = useState({});
  const [playerColors, setPlayerColors]     = useState({});
  const [matchNote, setMatchNoteState]      = useState(null);
  const [doubleVoter, setDoubleVoter]       = useState(null);
  const [customCategories, setCustomCategories] = useState({});
  const customCategoriesRef = useRef({});
  const [bracketOfTheWeek, setBracketOfTheWeek] = useState(null);
  const [randomCategory, setRandomCategory] = useState(null);
  const [minigamesEnabled, setMinigamesEnabledState] = useState(false);
  const [sequentialVoting, setSequentialVotingState] = useState(false);
  const [simpleUX, setSimpleUXState] = useState(false);
  const [votingQueue, setVotingQueue]       = useState([]);
  const [votingQueueIndex, setVotingQueueIndex] = useState(0);
  const [liveReactions, setLiveReactions]   = useState([]);
  const resolveTimer = useRef(null);

  const isHost = !!(hostId && playerId && hostId === playerId);

  // Dynamic Firebase ref based on roomCode
  const basePath = roomCode ? "rooms/" + roomCode : "game";
  const gameRef = useMemo(() => ref(db, basePath), [basePath]);

  useEffect(() => {
    let cancelled = false;
    const unsub = onValue(gameRef, (snap) => {
      const raw = snap.val();
      setConnected(true);
      if (!raw || !raw.phase) {
        if (!cancelled) ensureGameExists(gameRef);
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
      setVoters(voters);
      setPlayerColors(data.playerColors || {});
      setMatchNoteState(data.matchNote || null);
      setDoubleVoter(data.doubleVoter || null);
      setMinigamesEnabledState(data.minigamesEnabled === true);
      setSequentialVotingState(data.sequentialVoting === true);
      setSimpleUXState(data.simpleUX === true);
      setVotingQueue(data.votingQueue || []);
      setVotingQueueIndex(data.votingQueueIndex || 0);
    }, (err) => {
      console.error("Firebase onValue error:", err);
    });
    return () => { cancelled = true; unsub(); };
  }, [gameRef]);

  // ── Global Hall of Fame subscription ──
  useEffect(() => {
    const unsub = onValue(GLOBAL_STATS_REF, (snap) => {
      const raw = snap.val();
      if (!raw) { setGlobalStats([]); return; }
      const entries = Object.values(raw)
        .filter(e => e && e.name)
        .sort((a, b) => b.wins - a.wins)
        .slice(0, 25);
      setGlobalStats(entries);
    });
    return () => unsub();
  }, []);

  // ── Custom categories subscription (global, not room-scoped) ──
  useEffect(() => {
    const unsub = onValue(ref(db, "customCategories"), (snap) => {
      const data = snap.val() || {};
      customCategoriesRef.current = data;
      setCustomCategories(data);
    });
    return () => unsub();
  }, []);

  // ── Bracket of the week subscription (global) ──
  useEffect(() => {
    const unsub = onValue(ref(db, "bracketOfTheWeek"), (snap) => {
      setBracketOfTheWeek(snap.val() || null);
    });
    return () => unsub();
  }, []);

  // ── Random category subscription (global) ──
  useEffect(() => {
    const unsub = onValue(ref(db, "randomCategory"), (snap) => {
      setRandomCategory(snap.val() || null);
    });
    return () => unsub();
  }, []);

  // ── Join game ──
  const joinGame = useCallback(async (pid, name, colorIndex) => {
    const snap = await get(gameRef);
    let data = firebaseDeserialize(snap.val());
    if (!data) return;
    // If game is finished, reset to fresh lobby so old data is cleared
    if (data.phase === "finished") {
      await firebaseSet(gameRef, initialGameState());
      data = initialGameState();
    }
    if (data.phase !== "lobby") return;          // only join during lobby
    const players = data.players || {};
    if (players[pid]) return;
    const updates = {};
    updates["players/" + pid] = name || "ANON";
    updates["playerColors/" + pid] = colorIndex ?? Object.keys(players).length;
    if (!data.hostId) updates.hostId = pid;
    await firebaseUpdate(gameRef, updates);
  }, [gameRef]);

  // ── Leave game ──
  const leaveGame = useCallback(async (pid) => {
    const playerRef = ref(db, basePath + "/players/" + pid);
    await remove(playerRef);
    // Update totalPlayers if in playing phase
    const snap = await get(gameRef);
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
      await firebaseUpdate(gameRef, updates);
    }
  }, [gameRef, basePath]);

  // ── Select category ──
  const selectCategory = useCallback(async (cat) => {
    await firebaseUpdate(gameRef, { category: cat === null ? "__null__" : cat });
  }, [gameRef]);

  // ── Set bracket size ──
  const setBracketSize = useCallback(async (size) => {
    await firebaseUpdate(gameRef, { bracketSize: size });
  }, [gameRef]);

  // ── Start game ──
  const startGame = useCallback(async () => {
    const snap = await get(gameRef);
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
      const customCat = customCategoriesRef.current[data.category];
      if (customCat?.items) items = pickRandom(customCat.items, size);
    }
    if (!items) return;
    const players = data.players || {};
    const numPlayers = Math.max(Object.keys(players).length, 1);
    const b = initBracket(shuffle(items));
    const first = nextUnplayed(b);
    const minigamesOn = data.minigamesEnabled === true;
    const minigameMatchIds = minigamesOn ? pickMinigameMatchIds(b, size) : [];
    const seqOn = data.sequentialVoting === true;
    const initQueue = seqOn ? shuffle(Object.keys(data.players || {})) : [];
    await firebaseSet(gameRef, {
      phase: "playing",
      category: data.category,
      players: data.players || {},
      playerColors: data.playerColors || {},
      totalPlayers: numPlayers,
      hostId: data.hostId,
      bracket: b,
      currentMatchId: first ? first.id : null,
      champion: null,
      voters: {},
      tiebreaker: null,
      scores: {},
      tiebreakerCounts: {},
      doubleVoter: null,
      minigamesEnabled: minigamesOn,
      minigameMatchIds,
      sequentialVoting: seqOn,
      votingQueue: initQueue,
      votingQueueIndex: 0,
    });
  }, [gameRef]);

  // ── Set custom items (for Custom category) ──
  const setCustomItems = useCallback(async (items) => {
    await firebaseUpdate(gameRef, {
      category: "Custom",
      customItems: items,
    });
  }, [gameRef]);

  // Helper: advance the bracket after a match is decided
  const advanceAfterWin = useCallback(async (curBracket, matchId, winner) => {
    // Update player scores based on who voted correctly
    const scoreSnap = await get(gameRef);
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
      // Update global Hall of Fame stats
      try {
        const champName = resolved.final.winner;
        const champKey = safeKey(champName);
        const statRef = ref(db, "globalStats/" + champKey);
        const statSnap = await get(statRef);
        const existing = statSnap.val();
        await set(statRef, {
          name: champName,
          category: scoreData?.category || "Unknown",
          wins: (existing?.wins || 0) + 1,
          lastWon: Date.now(),
        });
      } catch (e) { /* non-critical */ }

      await firebaseUpdate(gameRef, {
        bracket: resolved,
        currentMatchId: null,
        champion: resolved.final.winner,
        phase: "finished",
        voters: {},
        tiebreaker: null,
        doubleVoter: null,
        scores: updatedScores,
        matchNote: "__null__",
      });
    } else {
      const nxt = nextUnplayed(resolved);
      const totalP = scoreData?.totalPlayers || 0;
      const tc = scoreData?.tiebreakerCounts || {};
      const minigameMatchIds = scoreData?.minigameMatchIds || [];
      const _r0 = Math.random();
      const challengeType = (nxt && minigameMatchIds.includes(nxt.id))
        ? (_r0 < 0.333 ? "rps" : _r0 < 0.667 ? "oneSecond" : "shapeHalve")
        : null;

      if (challengeType) {
        const type = challengeType;
        const allPids = Object.keys(scoreData?.players || {});
        const p1 = weightedPick(allPids, tc);
        const remainingPids = allPids.filter(p => p !== p1);
        const p2 = remainingPids.length > 0 ? weightedPick(remainingPids, tc) : p1;
        const matchObj = allMatches(resolved).find(m => m.id === nxt.id);
        const [c0, c1] = matchObj?.contenders || ["???", "???"];
        let tbObj;
        if (type === "rps") {
          tbObj = { matchId: nxt.id, c0, c1, preMatch: true, rps: { player1: p1, player2: p2, choice1: null, choice2: null, round: 1, result: null } };
        } else if (type === "oneSecond") {
          tbObj = { matchId: nxt.id, c0, c1, preMatch: true, oneSecond: { player1: p1, player2: p2, osPhase: "waiting_p1", startTs1: null, elapsed1: null, startTs2: null, elapsed2: null, winner: null } };
        } else {
          tbObj = { matchId: nxt.id, c0, c1, preMatch: true, shapeHalve: { player1: p1, player2: p2, shPhase: "cutting", seed: Math.floor(Math.random() * 1000000), line1: null, line2: null, ratio1: null, ratio2: null, winner: null } };
        }
        const challengeUpdates = {
          bracket: resolved,
          phase: type === "rps" ? "rps" : type === "oneSecond" ? "oneSecond" : "shapeHalve",
          currentMatchId: null,
          voters: {},
          tiebreaker: tbObj,
          doubleVoter: null,
          scores: updatedScores,
          matchNote: "__null__",
        };
        await firebaseUpdate(gameRef, challengeUpdates);
        const countUpdates = {};
        countUpdates["tiebreakerCounts/" + p1] = (tc[p1] || 0) + 1;
        if (p2 !== p1) countUpdates["tiebreakerCounts/" + p2] = (tc[p2] || 0) + 1;
        await firebaseUpdate(gameRef, countUpdates);
      } else {
        const seqQueue = scoreData?.sequentialVoting ? shuffle(Object.keys(scoreData?.players || {})) : [];
        await firebaseUpdate(gameRef, {
          bracket: resolved,
          currentMatchId: nxt ? nxt.id : null,
          phase: "playing",
          voters: {},
          tiebreaker: null,
          doubleVoter: null,
          scores: updatedScores,
          matchNote: "__null__",
          votingQueue: seqQueue,
          votingQueueIndex: 0,
        });
      }
    }
  }, [gameRef]);

  // ── Vote ──
  const vote = useCallback(async (pid, choice) => {
    const snap = await get(gameRef);
    const data = firebaseDeserialize(snap.val());
    if (!data || !data.currentMatchId) return;
    if (data.phase !== "playing") return; // ignore votes during tiebreaker / minigame phases

    // Sequential voting: only the current player in the queue can vote
    if (data.sequentialVoting) {
      const queue = data.votingQueue || [];
      const idx = data.votingQueueIndex || 0;
      if (!queue.length || queue[idx] !== pid) return;
    }

    const voterRef = ref(db, basePath + "/voters/" + pid);
    await set(voterRef, choice);

    // Apply vote — doubleVoter's choice counts twice
    let updated = applyVote(data.bracket, data.currentMatchId, choice);
    if (data.doubleVoter === pid) {
      updated = applyVote(updated, data.currentMatchId, choice);
    }
    const queueUpdates = data.sequentialVoting
      ? { votingQueueIndex: (data.votingQueueIndex || 0) + 1 }
      : {};
    await firebaseUpdate(gameRef, { bracket: updated, ...queueUpdates });

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
          await firebaseUpdate(gameRef, {
            phase: "tiebreaker",
            tiebreaker: { matchId: data.currentMatchId, c0: c0, c1: c1 },
          });
          return;
        }
      }
      // Not a tie — auto resolve
      const matchIdAtSet = data.currentMatchId;
      if (resolveTimer.current) clearTimeout(resolveTimer.current);
      resolveTimer.current = setTimeout(async () => {
        const freshSnap = await get(gameRef);
        const fresh = firebaseDeserialize(freshSnap.val());
        if (!fresh || !fresh.currentMatchId) return;
        if (fresh.phase !== "playing") return; // tiebreaker was set concurrently; don't clobber it
        if (fresh.currentMatchId !== matchIdAtSet) return; // another client already advanced this match
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
  }, [gameRef, basePath, advanceAfterWin]);

  // ── Start next match ──
  const startNext = useCallback(async () => {
    const snap = await get(gameRef);
    const data = firebaseDeserialize(snap.val());
    if (!data || data.currentMatchId || data.champion) return;
    const nxt = nextUnplayed(data.bracket);
    if (!nxt) return;

    const totalP = data.totalPlayers || 0;
    const tc = data.tiebreakerCounts || {};

    const minigameMatchIds = data.minigameMatchIds || [];
    const _r1 = Math.random();
    const challengeType = minigameMatchIds.includes(nxt.id)
      ? (_r1 < 0.333 ? "rps" : _r1 < 0.667 ? "oneSecond" : "shapeHalve")
      : null;
    if (challengeType) {
      const type = challengeType;
      const allPids = Object.keys(data.players || {});
      const p1 = weightedPick(allPids, tc);
      const remainingPids = allPids.filter(p => p !== p1);
      const p2 = remainingPids.length > 0 ? weightedPick(remainingPids, tc) : p1;
      const matchObj = allMatches(data.bracket).find(m => m.id === nxt.id);
      const [c0, c1] = matchObj?.contenders || ["???", "???"];

      const challengeUpdates = {
        phase: type === "rps" ? "rps" : type === "oneSecond" ? "oneSecond" : "shapeHalve",
        currentMatchId: null,
        voters: {},
        matchNote: "__null__",
      };
      if (type === "rps") {
        challengeUpdates.tiebreaker = {
          matchId: nxt.id, c0, c1, preMatch: true,
          rps: { player1: p1, player2: p2, choice1: null, choice2: null, round: 1, result: null },
        };
      } else if (type === "oneSecond") {
        challengeUpdates.tiebreaker = {
          matchId: nxt.id, c0, c1, preMatch: true,
          oneSecond: { player1: p1, player2: p2, osPhase: "waiting_p1",
            startTs1: null, elapsed1: null, startTs2: null, elapsed2: null, winner: null },
        };
      } else {
        challengeUpdates.tiebreaker = {
          matchId: nxt.id, c0, c1, preMatch: true,
          shapeHalve: { player1: p1, player2: p2, shPhase: "cutting",
            seed: Math.floor(Math.random() * 1000000), line1: null, line2: null, ratio1: null, ratio2: null, winner: null },
        };
      }
      await firebaseUpdate(gameRef, challengeUpdates);
      const countUpdates = {};
      countUpdates["tiebreakerCounts/" + p1] = (tc[p1] || 0) + 1;
      if (p2 !== p1) countUpdates["tiebreakerCounts/" + p2] = (tc[p2] || 0) + 1;
      await firebaseUpdate(gameRef, countUpdates);
      return;
    }

    const seqQueue = data.sequentialVoting ? shuffle(Object.keys(data.players || {})) : [];
    await firebaseUpdate(gameRef, { currentMatchId: nxt.id, voters: {}, phase: "playing", tiebreaker: null, matchNote: "__null__", votingQueue: seqQueue, votingQueueIndex: 0 });
  }, [gameRef]);

  // ── Skip / force result (picks first contender on tie) ──
  const skip = useCallback(async () => {
    const snap = await get(gameRef);
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
  }, [gameRef, advanceAfterWin]);

  // ── Host picks tiebreaker winner ──
  const hostPickWinner = useCallback(async (winner) => {
    const snap = await get(gameRef);
    const data = firebaseDeserialize(snap.val());
    if (!data || !data.currentMatchId) return;
    await advanceAfterWin(data.bracket, data.currentMatchId, winner);
  }, [gameRef, advanceAfterWin]);

  // ── Resolve pre-match challenge: mark winner as doubleVoter, start the match ──
  const resolvePreChallenge = useCallback(async (winnerPid, matchId) => {
    const snap = await get(gameRef);
    const data = firebaseDeserialize(snap.val());
    const seqQueue = data?.sequentialVoting ? shuffle(Object.keys(data?.players || {})) : [];
    await firebaseUpdate(gameRef, {
      phase: "playing",
      currentMatchId: matchId,
      doubleVoter: winnerPid,
      tiebreaker: null,
      voters: {},
      votingQueue: seqQueue,
      votingQueueIndex: 0,
    });
  }, [gameRef]);

  // ── Start RPS tiebreaker ──
  const startRPS = useCallback(async () => {
    const snap = await get(gameRef);
    const data = firebaseDeserialize(snap.val());
    if (!data || !data.tiebreaker) return;
    const tb = data.tiebreaker;
    const voters = data.voters || {};
    const tc = data.tiebreakerCounts || {};
    // Separate voters by side
    const side0 = []; // voted for c0
    const side1 = []; // voted for c1
    for (const [pid, choice] of Object.entries(voters)) {
      if (choice === tb.c0) side0.push(pid);
      else if (choice === tb.c1) side1.push(pid);
    }
    // Weighted pick from each side; fall back to host if side is empty
    const p1 = side0.length > 0 ? weightedPick(side0, tc) : data.hostId;
    const p2 = side1.length > 0 ? weightedPick(side1, tc) : data.hostId;
    await firebaseUpdate(gameRef, {
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
    // Increment tiebreakerCounts for chosen players
    const countUpdates = {};
    countUpdates["tiebreakerCounts/" + p1] = (tc[p1] || 0) + 1;
    if (p2 !== p1) countUpdates["tiebreakerCounts/" + p2] = (tc[p2] || 0) + 1;
    await firebaseUpdate(gameRef, countUpdates);
  }, [gameRef]);

  // ── Submit RPS choice ──
  const submitRPS = useCallback(async (pid, choice) => {
    const snap = await get(gameRef);
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
    await firebaseUpdate(gameRef, updates);

    // Re-read to check if both have chosen
    const snap2 = await get(gameRef);
    const data2 = firebaseDeserialize(snap2.val());
    if (!data2 || !data2.tiebreaker || !data2.tiebreaker.rps) return;
    const rps2 = data2.tiebreaker.rps;
    if (rps2.choice1 && rps2.choice2) {
      const result = rpsWinner(rps2.choice1, rps2.choice2);
      if (result === "draw") {
        // Show draw result immediately
        await firebaseUpdate(gameRef, { "tiebreaker/rps/result": "draw" });
        // After a 2s delay, reset for next round (only if still in rps phase)
        setTimeout(async () => {
          const dCheck = firebaseDeserialize((await get(gameRef)).val());
          if (dCheck?.phase !== "rps") return;
          await firebaseUpdate(gameRef, {
            "tiebreaker/rps/choice1": "__null__",
            "tiebreaker/rps/choice2": "__null__",
            "tiebreaker/rps/round": (rps2.round || 1) + 1,
            "tiebreaker/rps/result": "__null__",
            "tiebreaker/rps/revealed": false,
          });
        }, 2000);
      } else {
        // We have a winner
        const tb = data2.tiebreaker;
        const winnerPid = result === "p1" ? tb.rps.player1 : tb.rps.player2;
        // Show result — main screen animation takes ~1800ms to reveal,
        // then phones get ~1s to see the result before advancing.
        await firebaseUpdate(gameRef, { "tiebreaker/rps/result": result });
        if (tb.preMatch) {
          // Pre-match challenge: set the winner as doubleVoter and start the match
          setTimeout(async () => {
            await resolvePreChallenge(winnerPid, tb.matchId);
          }, 3500);
        } else {
          const bracketWinner = result === "p1" ? tb.c0 : tb.c1;
          setTimeout(async () => {
            const snap3 = await get(gameRef);
            const data3 = firebaseDeserialize(snap3.val());
            if (!data3 || !data3.currentMatchId) return;
            await advanceAfterWin(data3.bracket, data3.currentMatchId, bracketWinner);
          }, 3500);
        }
      }
    }
  }, [gameRef, advanceAfterWin, resolvePreChallenge]);

  // ── Start One Second tiebreaker ──
  const startOneSecond = useCallback(async () => {
    const snap = await get(gameRef);
    const data = firebaseDeserialize(snap.val());
    if (!data || !data.tiebreaker) return;
    const tb = data.tiebreaker;
    const voters = data.voters || {};
    const tc = data.tiebreakerCounts || {};
    const side0 = [];
    const side1 = [];
    for (const [pid, choice] of Object.entries(voters)) {
      if (choice === tb.c0) side0.push(pid);
      else if (choice === tb.c1) side1.push(pid);
    }
    // Weighted pick from each side; fall back to host if side is empty
    const p1 = side0.length > 0 ? weightedPick(side0, tc) : data.hostId;
    const p2 = side1.length > 0 ? weightedPick(side1, tc) : data.hostId;
    await firebaseUpdate(gameRef, {
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
    // Increment tiebreakerCounts for chosen players
    const countUpdates = {};
    countUpdates["tiebreakerCounts/" + p1] = (tc[p1] || 0) + 1;
    if (p2 !== p1) countUpdates["tiebreakerCounts/" + p2] = (tc[p2] || 0) + 1;
    await firebaseUpdate(gameRef, countUpdates);
  }, [gameRef]);

  // ── One Second: player presses START ──
  const startOSTimer = useCallback(async (pid) => {
    const snap = await get(gameRef);
    const data = firebaseDeserialize(snap.val());
    if (!data?.tiebreaker?.oneSecond) return;
    const os = data.tiebreaker.oneSecond;
    if (os.osPhase === "waiting_p1" && pid === os.player1) {
      await firebaseUpdate(gameRef, {
        "tiebreaker/oneSecond/osPhase": "running_p1",
        "tiebreaker/oneSecond/startTs1": Date.now(),
      });
    } else if (os.osPhase === "waiting_p2" && pid === os.player2) {
      await firebaseUpdate(gameRef, {
        "tiebreaker/oneSecond/osPhase": "running_p2",
        "tiebreaker/oneSecond/startTs2": Date.now(),
      });
    }
  }, [gameRef]);

  // ── One Second: player presses STOP ──
  // elapsed is computed by the calling client (Date.now() - local start capture) for accuracy
  const stopOSTimer = useCallback(async (pid, elapsed) => {
    const snap = await get(gameRef);
    const data = firebaseDeserialize(snap.val());
    if (!data?.tiebreaker?.oneSecond) return;
    const os = data.tiebreaker.oneSecond;
    if (os.osPhase === "running_p1" && pid === os.player1) {
      await firebaseUpdate(gameRef, {
        "tiebreaker/oneSecond/osPhase": "done_p1",
        "tiebreaker/oneSecond/elapsed1": elapsed,
      });
      // Auto-advance to player 2 after showing result (only if still in oneSecond phase)
      setTimeout(async () => {
        const s2 = await get(gameRef);
        const d2 = firebaseDeserialize(s2.val());
        if (d2?.phase === "oneSecond" && d2?.tiebreaker?.oneSecond?.osPhase === "done_p1") {
          await firebaseUpdate(gameRef, { "tiebreaker/oneSecond/osPhase": "waiting_p2" });
        }
      }, 3000);
    } else if (os.osPhase === "running_p2" && pid === os.player2) {
      const diff1 = Math.abs(os.elapsed1 - 1000);
      const diff2 = Math.abs(elapsed - 1000);
      const winner = diff1 <= diff2 ? "p1" : "p2";
      const winnerPid = winner === "p1" ? os.player1 : os.player2;
      const winnerContender = winner === "p1" ? data.tiebreaker.c0 : data.tiebreaker.c1;
      const isPreMatch = !!data.tiebreaker.preMatch;
      const matchId = data.tiebreaker.matchId;
      await firebaseUpdate(gameRef, {
        "tiebreaker/oneSecond/osPhase": "done",
        "tiebreaker/oneSecond/elapsed2": elapsed,
        "tiebreaker/oneSecond/winner": winner,
      });
      // Auto-advance after displaying results
      setTimeout(async () => {
        if (isPreMatch) {
          await resolvePreChallenge(winnerPid, matchId);
        } else {
          const s2 = await get(gameRef);
          const d2 = firebaseDeserialize(s2.val());
          if (!d2?.currentMatchId) return;
          await advanceAfterWin(d2.bracket, d2.currentMatchId, winnerContender);
        }
      }, 4000);
    }
  }, [gameRef, advanceAfterWin, resolvePreChallenge]);

  // ── Start Shape Halve tiebreaker ──
  const startShapeHalve = useCallback(async () => {
    const snap = await get(gameRef);
    const data = firebaseDeserialize(snap.val());
    if (!data || !data.tiebreaker) return;
    const tb = data.tiebreaker;
    const voters = data.voters || {};
    const tc = data.tiebreakerCounts || {};
    const side0 = [];
    const side1 = [];
    for (const [pid, choice] of Object.entries(voters)) {
      if (choice === tb.c0) side0.push(pid);
      else if (choice === tb.c1) side1.push(pid);
    }
    const p1 = side0.length > 0 ? weightedPick(side0, tc) : data.hostId;
    const p2 = side1.length > 0 ? weightedPick(side1, tc) : data.hostId;
    await firebaseUpdate(gameRef, {
      phase: "shapeHalve",
      tiebreaker: {
        matchId: tb.matchId,
        c0: tb.c0,
        c1: tb.c1,
        shapeHalve: {
          player1: p1,
          player2: p2,
          shPhase: "cutting",
          seed: Math.floor(Math.random() * 1000000),
          line1: null,
          line2: null,
          ratio1: null,
          ratio2: null,
          winner: null,
        },
      },
    });
    const countUpdates = {};
    countUpdates["tiebreakerCounts/" + p1] = (tc[p1] || 0) + 1;
    if (p2 !== p1) countUpdates["tiebreakerCounts/" + p2] = (tc[p2] || 0) + 1;
    await firebaseUpdate(gameRef, countUpdates);
  }, [gameRef]);

  // ── Shape Halve: player submits their cut line ──
  const submitShapeHalve = useCallback(async (pid, lineData, ratio) => {
    const snap = await get(gameRef);
    const data = firebaseDeserialize(snap.val());
    if (!data?.tiebreaker?.shapeHalve) return;
    const sh = data.tiebreaker.shapeHalve;
    if (sh.shPhase !== "cutting") return;

    // Write this player's cut (only if not already submitted)
    if (pid === sh.player1 && sh.ratio1 == null) {
      await firebaseUpdate(gameRef, {
        "tiebreaker/shapeHalve/line1": lineData,
        "tiebreaker/shapeHalve/ratio1": ratio,
      });
    } else if (pid === sh.player2 && sh.ratio2 == null) {
      await firebaseUpdate(gameRef, {
        "tiebreaker/shapeHalve/line2": lineData,
        "tiebreaker/shapeHalve/ratio2": ratio,
      });
    } else {
      return;
    }

    // Re-read to check if both have now submitted
    const snap2 = await get(gameRef);
    const data2 = firebaseDeserialize(snap2.val());
    const sh2 = data2?.tiebreaker?.shapeHalve;
    if (!sh2 || sh2.ratio1 == null || sh2.ratio2 == null) return;

    // Both done — determine winner and reveal
    const winner = sh2.ratio1 <= sh2.ratio2 ? "p1" : "p2";
    const winnerPid = winner === "p1" ? sh2.player1 : sh2.player2;
    const winnerContender = winner === "p1" ? data2.tiebreaker.c0 : data2.tiebreaker.c1;
    const isPreMatch = !!data2.tiebreaker.preMatch;
    const matchId = data2.tiebreaker.matchId;
    await firebaseUpdate(gameRef, {
      "tiebreaker/shapeHalve/shPhase": "done",
      "tiebreaker/shapeHalve/winner": winner,
    });
    // Delay long enough for both players' reveal animations to finish (P1: 4.1s + P2: 4.1s + winner: ~2s)
    setTimeout(async () => {
      if (isPreMatch) {
        await resolvePreChallenge(winnerPid, matchId);
      } else {
        const s2 = await get(gameRef);
        const d2 = firebaseDeserialize(s2.val());
        if (!d2?.currentMatchId) return;
        await advanceAfterWin(d2.bracket, d2.currentMatchId, winnerContender);
      }
    }, 11000);
  }, [gameRef, advanceAfterWin, resolvePreChallenge]);

  // ── Live reactions (ephemeral, not persisted to game state) ──
  useEffect(() => {
    if (!basePath) return;
    const mountTs = Date.now();
    const reactionsQ = query(
      ref(db, basePath + "/reactions"),
      orderByChild("ts"),
      startAt(mountTs - 1000)
    );
    const unsub = onChildAdded(reactionsQ, (snap) => {
      const r = snap.val();
      if (!r || r.ts < mountTs - 500) return;
      const localId = snap.key;
      setLiveReactions(prev => [...prev, { ...r, localId }]);
      setTimeout(() => setLiveReactions(prev => prev.filter(x => x.localId !== localId)), 3500);
      setTimeout(() => remove(ref(db, basePath + "/reactions/" + snap.key)).catch(() => {}), 15000);
    });
    return () => unsub();
  }, [basePath]);

  const sendReaction = useCallback(async (type, text) => {
    if (!playerId) return;
    await push(ref(db, basePath + "/reactions"), {
      pid: playerId, type, text: text || null, ts: Date.now(),
    });
  }, [basePath, playerId]);

  // ── Set match commentary note ──
  const setMatchNote = useCallback(async (note) => {
    await firebaseUpdate(gameRef, { matchNote: note || "__null__" });
  }, [gameRef]);

  // ── Play again ──
  const playAgain = useCallback(async () => {
    if (resolveTimer.current) clearTimeout(resolveTimer.current);
    const snap = await get(gameRef);
    const data = firebaseDeserialize(snap.val());
    const newState = initialGameState();
    // Preserve players so phones don't get kicked back to the name screen
    if (data?.players)      newState.players      = data.players;
    if (data?.playerColors) newState.playerColors = data.playerColors;
    if (data?.hostId)       newState.hostId       = data.hostId;
    if (data?.minigamesEnabled) newState.minigamesEnabled = data.minigamesEnabled;
    if (data?.simpleUX)     newState.simpleUX     = data.simpleUX;
    newState.totalPlayers = Object.keys(newState.players).length;
    await firebaseSet(gameRef, newState);
  }, [gameRef]);

  // ── Clear all players (manual reset) ──
  const clearPlayers = useCallback(async () => {
    if (resolveTimer.current) clearTimeout(resolveTimer.current);
    await firebaseSet(gameRef, initialGameState());
  }, [gameRef]);

  // ── Toggle sequential voting ──
  const setSequentialVoting = useCallback(async (enabled) => {
    await firebaseUpdate(gameRef, { sequentialVoting: enabled });
  }, [gameRef]);

  // ── Toggle simple UX ──
  const setSimpleUX = useCallback(async (enabled) => {
    await firebaseUpdate(gameRef, { simpleUX: enabled });
  }, [gameRef]);

  // ── Toggle minigames setting (writes to Firebase so all clients see it) ──
  const setMinigamesEnabled = useCallback(async (enabled) => {
    const updates = { minigamesEnabled: enabled };
    if (enabled) {
      const snap = await get(gameRef);
      const data = firebaseDeserialize(snap.val());
      if (data?.bracket) {
        updates.minigameMatchIds = pickMinigameMatchIds(data.bracket, data.bracketSize || 32);
      }
    } else {
      updates.minigameMatchIds = [];
    }
    await firebaseUpdate(gameRef, updates);
  }, [gameRef]);

  // ── Mark RPS result as visually revealed on the main screen ──
  const setRpsRevealed = useCallback(async () => {
    await firebaseUpdate(gameRef, { "tiebreaker/rps/revealed": true });
  }, [gameRef]);

  return {
    phase, category, bracketSize, playerCount, totalPlayers, hostId, isHost,
    bracket, currentMatchId, champion, votedCount, connected, tiebreaker,
    playerNames, scores, globalStats, voters, playerColors, matchNote,
    doubleVoter, liveReactions, customCategories, bracketOfTheWeek, randomCategory,
    joinGame, leaveGame, selectCategory, setBracketSize, startGame, setCustomItems,
    vote, startNext, skip, hostPickWinner, startRPS, submitRPS,
    startOneSecond, startOSTimer, stopOSTimer, resolvePreChallenge,
    startShapeHalve, submitShapeHalve,
    playAgain, clearPlayers, setMatchNote, setRpsRevealed, sendReaction,
    minigamesEnabled, setMinigamesEnabled,
    sequentialVoting, votingQueue, votingQueueIndex, setSequentialVoting,
    simpleUX, setSimpleUX,
  };
}
