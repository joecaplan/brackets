// ─── Pure bracket helpers ─────────────────────────────────────────────────────
let _uid = 0;
export const resetUid = () => { _uid = 0; };
const uid = () => `m${++_uid}`;

export const makeMatch = (a = null, b = null) => ({
  id: uid(),
  contenders: [a, b],
  votes: { ...(a ? { [a]: 0 } : {}), ...(b ? { [b]: 0 } : {}) },
  winner: null,
});

export const pairUp = (items) => {
  const out = [];
  for (let i = 0; i < items.length; i += 2)
    out.push(makeMatch(items[i] ?? null, items[i + 1] ?? null));
  return out;
};

// Build rounds for one side — works for any power-of-2 seed count
export const buildSide = (items) => {
  const rounds = [pairUp(items)]; // R1
  let count = items.length / 2;
  while (count >= 2) {
    count = Math.floor(count / 2);
    rounds.push(Array.from({ length: count }, () => makeMatch()));
  }
  return rounds;
  // 16 items → [8, 4, 2, 1]
  //  8 items → [4, 2, 1]
  //  4 items → [2, 1]
};

export const initBracket = (items) => {
  resetUid();
  const half = Math.floor(items.length / 2);
  return {
    left:  buildSide(items.slice(0, half)),
    right: buildSide(items.slice(half)),
    final: makeMatch(),
  };
};

// After a match is decided, fill in its winner into the correct slot
// in the next round (instead of building a new round array)
export const advance = (bracket, matchId, winner) => {
  // Helper: write winner into the match itself
  const applyWinner = (rounds) =>
    rounds.map((round) =>
      round.map((m) => (m.id === matchId ? { ...m, winner } : m))
    );

  let b = {
    left:  applyWinner(bracket.left),
    right: applyWinner(bracket.right),
    final: bracket.final?.id === matchId ? { ...bracket.final, winner } : bracket.final,
  };

  // Helper: find which round+index the match was in, then fill next round placeholder
  const fillNextRound = (rounds) => {
    for (let rIdx = 0; rIdx < rounds.length - 1; rIdx++) {
      const mIdx = rounds[rIdx].findIndex((m) => m.id === matchId);
      if (mIdx === -1) continue;
      // The winner goes into next round: match mIdx/2, slot mIdx%2
      const nextRound = rIdx + 1;
      const nextMatchIdx = Math.floor(mIdx / 2);
      const nextSlot     = mIdx % 2; // 0 = top, 1 = bottom
      return rounds.map((round, ri) => {
        if (ri !== nextRound) return round;
        return round.map((m, mi) => {
          if (mi !== nextMatchIdx) return m;
          const newContenders = [...m.contenders];
          newContenders[nextSlot] = winner;
          const newVotes = { ...m.votes, [winner]: 0 };
          return { ...m, contenders: newContenders, votes: newVotes };
        });
      });
    }
    return rounds;
  };

  b.left  = fillNextRound(b.left);
  b.right = fillNextRound(b.right);

  // If a side's last round (SF) now has a winner, fill the final placeholder
  const lSF = b.left[b.left.length - 1][0];
  const rSF = b.right[b.right.length - 1][0];

  if (lSF.winner && !b.final.contenders[0]) {
    b.final = { ...b.final, contenders: [lSF.winner, b.final.contenders[1]], votes: { ...b.final.votes, [lSF.winner]: 0 } };
  }
  if (rSF.winner && !b.final.contenders[1]) {
    b.final = { ...b.final, contenders: [b.final.contenders[0], rSF.winner], votes: { ...b.final.votes, [rSF.winner]: 0 } };
  }

  return b;
};

export const allMatches = (b) => [
  ...b.left.flat(),
  ...b.right.flat(),
  b.final,
].filter(Boolean);

export const nextUnplayed = (b) => {
  // Both left and right must finish round R before either enters round R+1
  const numRounds = b.left.length;
  for (let r = 0; r < numRounds; r++) {
    const leftRound  = b.left[r]  ?? [];
    const rightRound = b.right[r] ?? [];

    const unplayedLeft  = leftRound.filter( (m) => !m.winner && m.contenders[0] && m.contenders[1]);
    const unplayedRight = rightRound.filter((m) => !m.winner && m.contenders[0] && m.contenders[1]);

    if (unplayedLeft.length > 0 || unplayedRight.length > 0) {
      return unplayedLeft[0] ?? unplayedRight[0];
    }

    const leftDone  = leftRound.every( (m) => m.winner || !m.contenders[0]);
    const rightDone = rightRound.every((m) => m.winner || !m.contenders[0]);
    if (!leftDone || !rightDone) return null;
  }

  const f = b.final;
  if (f && !f.winner && f.contenders[0] && f.contenders[1]) return f;
  return null;
};

// Apply a single vote to the bracket (increments vote count for choice in the given match)
export const applyVote = (bracket, matchId, choice) => {
  const applyToRounds = (rounds) =>
    rounds.map((r) => r.map((m) =>
      m.id !== matchId ? m : { ...m, votes: { ...m.votes, [choice]: (m.votes[choice] ?? 0) + 1 } }
    ));
  return {
    ...bracket,
    left:  applyToRounds(bracket.left),
    right: applyToRounds(bracket.right),
    final: bracket.final?.id === matchId
      ? { ...bracket.final, votes: { ...bracket.final.votes, [choice]: (bracket.final.votes[choice] ?? 0) + 1 } }
      : bracket.final,
  };
};
