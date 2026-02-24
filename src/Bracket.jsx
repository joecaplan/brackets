import { useState, useEffect, useRef, useMemo } from "react";
import { allMatches } from "./bracketLogic.js";
import { useGameState } from "./useGameState.js";
import { RockIcon, RpsIcon } from "./RpsIcons.jsx";
import { QRCodeSVG } from "qrcode.react";

// Audio & video assets
import menuSongSrc from "./assets/audio/Menu_SongLoop.wav";
import gameSongSrc from "./assets/audio/Game_Song.wav";
import endSongSrc from "./assets/audio/End_Song.wav";
import startSfxSrc from "./assets/audio/Start.wav";
import rpsBeatSrc from "./assets/audio/RPS-Beat.wav";
import startAgainSrc from "./assets/audio/StartAgain.wav";
import playerAddSrc from "./assets/audio/PlayerAdd.wav";
import resetPlayersSrc from "./assets/audio/ResetPlayers.wav";
import choiceMadeSrc from "./assets/audio/ChoiceMade.wav";
import zoomInSrc from "./assets/audio/ZoomIn.wav";
import rockSfxSrc from "./assets/audio/Rock.wav";
import paperSfxSrc from "./assets/audio/Paper.wav";
import scissorsSfxSrc from "./assets/audio/Scissors.wav";
import titleVideoSrc from "./assets/footage/Brackets_Title_V1.mp4";
import bumperRound01Src  from "./assets/footage/finalCards/Brackets_Round01_12fps_V1.mp4";
import bumperRound02Src  from "./assets/footage/finalCards/Brackets_Round02_12fps_V1.mp4";
import bumperRound03Src  from "./assets/footage/finalCards/Brackets_Round03_12fps_V1.mp4";
import bumperQFSrc       from "./assets/footage/finalCards/Brackets_Quarterfinals_12fps_V1.mp4";
import bumperSFSrc       from "./assets/footage/finalCards/Brackets_Semifinals_12fps_V1.mp4";
import bumperFinalSrc    from "./assets/footage/finalCards/Brackets_FinalRound_12fps_V1.mp4";
import cursorPointerRaw    from "./assets/SVG/Cursor_Pointer.svg?raw";
import cursorDragRaw       from "./assets/SVG/cursorDrag.svg?raw";
import cursorHoverRaw      from "./assets/SVG/Cursor_Hover.svg?raw";
import cursorRightClickRaw from "./assets/SVG/Cursor_RightClick.svg?raw";
// Chrome requires data: URLs for SVG cursors — file:// / asset URLs don't work
const cursorPointerSrc    = `data:image/svg+xml,${encodeURIComponent(cursorPointerRaw)}`;
const cursorDragSrc       = `data:image/svg+xml,${encodeURIComponent(cursorDragRaw)}`;
const cursorHoverSrc      = `data:image/svg+xml,${encodeURIComponent(cursorHoverRaw)}`;
const cursorRightClickSrc = `data:image/svg+xml,${encodeURIComponent(cursorRightClickRaw)}`;


// ─── Icon components ──────────────────────────────────────────────────────────
function IconVideo({ color = "#c8f55a", size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 1200 1200" fill={color} style={{ display: "block", flexShrink: 0 }}>
      <path d="m925.69 435.71-103.69 82.453v163.69l103.69 82.453c13.922 11.062 34.312 1.2188 34.312-16.547v-295.45c0-17.766-20.531-27.609-34.312-16.547z"/>
      <path d="m731.06 370.08h-431.06c-33 0-60 27-60 60v340.08c0 33 26.766 59.766 59.766 59.766h431.29c33 0 60-27 60-60v-339.94c0-33-27-60-60-60z"/>
    </svg>
  );
}

function IconReset({ color = "#cc4444", size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ display: "block" }}>
      <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
    </svg>
  );
}

function IconGear({ color = "#c8f55a", size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ display: "block" }}>
      <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1s.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.58 1.69-.98l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/>
    </svg>
  );
}

// ExitButton — person slides through door opening on hover/click
// Door frame acts as natural matte: door walls cover person; only the transparent
// opening reveals the person. Person layer is drawn BELOW door frame in SVG z-order.
function ExitButton({ onExit, style }) {
  const [phase, setPhase] = useState("idle"); // "idle" | "hover" | "click"

  // translateX in CSS pixels (SVG rendered at 29×20, scale ≈ 0.305 px/SVG-unit)
  // idle  → person off-screen left  (behind/past left door wall)
  // hover → person visible in door opening
  // click → person exits right      (behind right door wall)
  const tx = phase === "click" ? 13 : phase === "hover" ? 0 : -15;

  return (
    <button
      style={style}
      onMouseEnter={() => setPhase(p => p === "click" ? "click" : "hover")}
      onMouseLeave={() => setPhase(p => p === "click" ? "click" : "idle")}
      onClick={() => { setPhase("click"); if (onExit) onExit(); }}
      title="Exit"
    >
      {/* SVG coordinate space matches iconExitDoor: 95 × 65 units */}
      <svg
        width={29} height={20}
        viewBox="0 0 95 65"
        fill="currentColor"
        style={{ display: "block", flexShrink: 0, overflow: "hidden" }}
      >
        {/* ── Person layer (below door frame = matte'd by door walls) ── */}
        <g style={{
          transform: `translateX(${tx}px)`,
          transition: "transform 0.4s ease-out",
        }}>
          {/* Nested SVG positions person in door's coordinate space.
              Door opening ≈ x 12..47, y 9..55.  Person is 35 × 39 units.
              Placed at (12, 11): right edge lands exactly at door right wall. */}
          <svg x="12" y="11" width="35" height="39" viewBox="0 0 35 39">
            {/* head */}
            <path d="M27.0058 8.91956C29.3059 10.3196 32.2056 9.61943 33.6057 7.31964C35.0058 5.01948 34.3056 2.11981 32.0058 0.719726C29.7056 -0.680357 26.8059 0.01986 25.4059 2.31964C24.1057 4.51948 24.8056 7.51948 27.0058 8.91956Z"/>
            {/* body */}
            <path d="M32.8056 16.9197L29.6058 16.5196L28.2057 12.5196C27.9056 11.7195 27.4056 10.9197 26.7057 10.3198L24.5059 8.31976C24.1058 7.9197 23.6058 7.6199 23.1058 7.41968L17.5059 4.91968C16.906 4.61955 16.3061 4.61955 15.7057 4.91968L10.9056 7.01959C9.80564 7.51959 9.20573 8.81976 9.70573 10.0196C10.2057 11.1195 11.5059 11.7194 12.7057 11.2194L16.6058 9.5196L18.6058 10.4197C17.1058 12.0196 15.1058 14.4197 13.5059 16.5196C12.6058 17.6195 11.906 19.4197 12.406 21.7194L9.30606 24.6195L2.70614 24.2194C1.30606 24.1195 0.106226 25.2194 0.00630891 26.6195C-0.0936244 28.0196 1.00631 29.2194 2.40639 29.3194L10.1062 29.8194H10.4064C11.0063 29.8194 11.6062 29.5192 12.0063 29.1195L16.0063 25.4197L20.2061 29.0196L20.1062 35.7194C20.1062 37.1195 21.2061 38.3193 22.6062 38.3193H22.7061C24.0063 38.2194 25.1062 37.1195 25.1062 35.8193L25.2061 27.9192C25.2061 27.1191 24.906 26.4192 24.306 25.9192L19.6062 21.9192L24.806 16.8193L25.806 19.5192C26.1062 20.3193 26.806 20.9192 27.7061 21.0192L32.406 21.5192H32.7061C33.806 21.5192 34.7061 20.6191 34.806 19.5192C34.9059 18.1194 34.0058 17.0196 32.8056 16.9197Z"/>
          </svg>
        </g>

        {/* ── Door frame layer (on top = acts as matte over person) ── */}
        {/* Left/right walls are solid; door opening is transparent — only the
            opening reveals the person beneath. */}
        <path d="M90.2002 7.6294e-06H4.80017C2.10033 7.6294e-06 0 2.19984 0 4.80018V59.6002C0 60.4003 0.199867 61.1002 0.5 61.7001L10.6 56.7001C11.0001 56.5002 11.1999 56.1002 11.1999 55.7001V11.5001C11.1999 10.4002 12.1 9.60001 13.1 9.60001L45.5 9.60034C46.5999 9.60034 47.4001 10.5004 47.4001 11.5004V55.3004C47.4001 56.0003 47 56.7005 46.3002 57.0003L31.2002 64.6002H90.0002C92.7 64.6002 94.8003 62.4003 94.8003 59.7001L94.8 4.90008C94.9999 2.20025 92.8 0 90.1998 0L90.2002 7.6294e-06ZM70.0002 44.1V36.9002L58.3002 36.8999V27.6999H70.0002V20.5L84.2002 32.3L70.0002 44.1Z"/>
      </svg>
    </button>
  );
}

// ─── SVG Layout constants ─────────────────────────────────────────────────────
const SLOT_W     = 148;
const SLOT_H     = 48;
const SLOT_GAP   = 8;
const ROUND_W    = 190;
const SVG_H   = 960;
const PAD_TOP = 30;

function getLayout(bracket) {
  const numRounds = bracket?.left?.length ?? 4;
  const r1Matches = bracket?.left?.[0]?.length ?? 8;
  const totalW    = numRounds * ROUND_W * 2 + SLOT_W + 40;
  const centerX   = totalW / 2;
  return {
    numRounds, totalW, centerX,
    matchCount: (r) => r1Matches >> r,
    matchCY: (r, mIdx) => {
      const spacing = (SVG_H - PAD_TOP * 2) / (r1Matches >> r);
      return PAD_TOP + spacing * mIdx + spacing / 2;
    },
    leftX:  (r) => 20 + r * ROUND_W,
    rightX: (r) => totalW - 20 - SLOT_W - r * ROUND_W,
    labels: numRounds === 4 ? ["R1", "R2", "QF", "SF"]
          : numRounds === 3 ? ["R1", "QF", "SF"]
          :                   ["R1", "SF"],
  };
}

// ─── Free-mode pan/zoom limits ────────────────────────────────────────────────
const MAX_SCALE = 2.56;  // matches camera zoom-in scale
const X_SLACK = 0;      // locked at min zoom; expands with overflow as user zooms in
const Y_SLACK = 0;

// minScale: matches the camera's fit-all (zoomed-out) scale
const minScale = (totalW) => Math.min(
  window.innerWidth  / totalW,
  window.innerHeight * 0.624 / SVG_H,
  1.2
);

// Clamp tx/ty so the bracket can't be panned beyond its overflow area.
// viewportH should be the actual height of the viewport div (not window.innerHeight)
// so the bottom of the SVG is fully reachable when zoomed in.
function clampTransform(tx, ty, scale, totalW, viewportH) {
  const vw = window.innerWidth;
  const vh = viewportH ?? window.innerHeight;
  const sw = totalW * scale;
  const sh = SVG_H   * scale;

  // x: natural center is (vw-sw)/2; range expands by overflow on each side
  const txCenter  = (vw - sw) / 2;
  const xOverflow = Math.max(0, sw - vw);
  const txMin = txCenter - xOverflow / 2 - X_SLACK;
  const txMax = txCenter + xOverflow / 2 + X_SLACK;

  // y: natural position is 0; range expands downward by overflow
  const yOverflow = Math.max(0, sh - vh);
  const tyMin = -yOverflow - Y_SLACK;
  const tyMax = Y_SLACK;

  return {
    tx: Math.max(txMin, Math.min(txMax, tx)),
    ty: Math.max(tyMin, Math.min(tyMax, ty)),
  };
}

// ─── Bumper helpers ───────────────────────────────────────────────────────────
// Returns { rIdx, isFinal } for a given matchId within the bracket
function getRoundInfo(bracket, matchId) {
  if (!bracket || !matchId) return null;
  for (let rIdx = 0; rIdx < bracket.left.length; rIdx++) {
    if (bracket.left[rIdx].some(m => m.id === matchId)) return { rIdx, isFinal: false };
    if (bracket.right[rIdx].some(m => m.id === matchId)) return { rIdx, isFinal: false };
  }
  if (bracket.final?.id === matchId) return { rIdx: bracket.left.length, isFinal: true };
  return null;
}

// Returns the bumper video src for the given round, based on round label
function pickBumperSrc(bracket, rIdx, isFinal) {
  if (isFinal) return bumperFinalSrc;
  const numRounds = bracket.left.length;
  const labels = numRounds === 4 ? ["R1", "R2", "QF", "SF"]
               : numRounds === 3 ? ["R1", "QF", "SF"]
               :                   ["R1", "SF"];
  switch (labels[rIdx]) {
    case "R1": return bumperRound01Src;
    case "R2": return bumperRound02Src;
    case "R3": return bumperRound03Src;
    case "QF": return bumperQFSrc;
    case "SF": return bumperSFSrc;
    default:   return null;
  }
}

const getMatchPosition = (bracket, matchId, layout) => {
  const { leftX, rightX, matchCY, centerX } = layout;
  for (let rIdx = 0; rIdx < bracket.left.length; rIdx++) {
    const mIdx = bracket.left[rIdx].findIndex((m) => m.id === matchId);
    if (mIdx !== -1) return { x: leftX(rIdx) + SLOT_W / 2, cy: matchCY(rIdx, mIdx) };
  }
  for (let rIdx = 0; rIdx < bracket.right.length; rIdx++) {
    const mIdx = bracket.right[rIdx].findIndex((m) => m.id === matchId);
    if (mIdx !== -1) return { x: rightX(rIdx) + SLOT_W / 2, cy: matchCY(rIdx, mIdx) };
  }
  if (bracket.final && bracket.final.id === matchId) return { x: centerX, cy: SVG_H / 2 };
  return null;
};

// ─── Camera hook ──────────────────────────────────────────────────────────────
function useCamera(targetX, targetY, zoomed, totalW) {
  const vw = typeof window !== "undefined" ? window.innerWidth  : 1440;
  const vh = typeof window !== "undefined" ? window.innerHeight : 900;

  if (!zoomed || targetX == null) {
    const scaleX = vw / totalW;
    const scaleY = (vh * 0.624) / SVG_H;
    const scale  = Math.min(scaleX, scaleY, 1.2);
    const tx     = (vw - totalW * scale) / 2;
    return {
      transform: "translate(" + tx + "px, 0px) scale(" + scale + ")",
      transformOrigin: "0 0",
      transition: "transform 0.9s cubic-bezier(0.4, 0, 0.2, 1)",
    };
  }

  const scale = 2.56;
  const tx    = vw / 2 - targetX * scale;
  const ty    = vh * 0.28 - targetY * scale;
  return {
    transform: "translate(" + tx + "px, " + ty + "px) scale(" + scale + ")",
    transformOrigin: "0 0",
    transition: "transform 0.9s cubic-bezier(0.4, 0, 0.2, 1)",
  };
}

// ─── SVG primitives ───────────────────────────────────────────────────────────
function Slot({ x, y, label, isWinner, isLoser, isActive, pct, showPct, dimmed }) {
  const isEmpty  = !label;
  const bg       = isEmpty ? "#0d180d" : isWinner ? "#c8f55a" : isLoser ? "#090f09" : isActive ? "#122012" : "#0d180d";
  const fg       = isWinner ? "#060e06" : isLoser ? "#283828" : isEmpty ? "#1a2a1a" : "#c8f55a";
  const stroke   = isEmpty ? "#111c11" : isWinner || isActive ? "#c8f55a" : "#1a2e1a";
  const text     = isEmpty ? "" : (label.length > 15 ? label.slice(0, 14) + "\u2026" : label);
  const opacity  = dimmed ? 0.25 : 1;

  return (
    <g opacity={opacity} style={{ transition: "opacity 0.5s" }}>
      <rect
        x={x} y={y} width={SLOT_W} height={SLOT_H} rx={3}
        fill={bg} stroke={stroke} strokeWidth={isActive || isWinner ? 1.5 : 1}
        filter={!isEmpty && isWinner ? "url(#wglow)" : !isEmpty && isActive ? "url(#aglow)" : ""}
      />
      {showPct && pct > 0 && (
        <rect
          x={x + 1} y={y + SLOT_H - 5}
          width={Math.max(0, (SLOT_W - 2) * pct / 100)} height={4} rx={1}
          fill={isWinner ? "#060e0660" : "#c8f55a"} opacity={0.6}
        />
      )}
      {!isEmpty && (
        <text
          x={x + 10} y={y + SLOT_H / 2 + 5}
          fill={fg} fontSize={12} fontFamily="'PT Mono', monospace"
          fontWeight={isWinner ? "bold" : "normal"}
        >
          {isWinner ? "\u25B6 " : "  "}{text}
        </text>
      )}
      {showPct && !isEmpty && (
        <text
          x={x + SLOT_W - 8} y={y + SLOT_H / 2 + 5}
          fill={isWinner ? "#060e0699" : "#3a5a3a"} fontSize={10}
          fontFamily="'PT Mono', monospace" textAnchor="end"
        >
          {Math.round(pct)}%
        </text>
      )}
    </g>
  );
}

function MatchGroup({ match, x, cy, isActive, dimmed }) {
  const [c0, c1] = match.contenders;
  const v0       = (c0 && match.votes[c0]) || 0;
  const v1       = (c1 && match.votes[c1]) || 0;
  const total    = v0 + v1;
  const showPct  = !!match.winner;

  return (
    <g>
      <Slot
        x={x} y={cy - SLOT_H - SLOT_GAP / 2} label={c0}
        isWinner={match.winner === c0} isLoser={!!(match.winner && match.winner !== c0)}
        isActive={isActive} pct={total > 0 ? (v0 / total) * 100 : 0} showPct={showPct}
        dimmed={dimmed}
      />
      <Slot
        x={x} y={cy + SLOT_GAP / 2} label={c1}
        isWinner={match.winner === c1} isLoser={!!(match.winner && match.winner !== c1)}
        isActive={isActive} pct={total > 0 ? (v1 / total) * 100 : 0} showPct={showPct}
        dimmed={dimmed}
      />
    </g>
  );
}

function SideLines({ rounds, side, layout }) {
  const { leftX, rightX, matchCY } = layout;
  const xFn  = side === "left" ? leftX : rightX;
  const lines = [];
  for (let r = 1; r < rounds.length; r++) {
    rounds[r].forEach((_, mIdx) => {
      const topCY = matchCY(r - 1, mIdx * 2);
      const botCY = matchCY(r - 1, mIdx * 2 + 1);
      const midY  = (topCY + botCY) / 2;
      const ready = rounds[r - 1][mIdx * 2] && rounds[r - 1][mIdx * 2].winner
                 && rounds[r - 1][mIdx * 2 + 1] && rounds[r - 1][mIdx * 2 + 1].winner;
      const color = ready ? "#c8f55a" : "#1a2e1a";
      const sw    = ready ? 1.5 : 1;
      const fil   = ready ? "url(#aglow)" : "";
      if (side === "left") {
        const ex = xFn(r - 1) + SLOT_W + 18;
        lines.push(
          <g key={"L" + r + "-" + mIdx}>
            <line x1={xFn(r-1)+SLOT_W} y1={topCY} x2={ex}     y2={topCY} stroke={color} strokeWidth={sw} filter={fil}/>
            <line x1={xFn(r-1)+SLOT_W} y1={botCY} x2={ex}     y2={botCY} stroke={color} strokeWidth={sw} filter={fil}/>
            <line x1={ex}              y1={topCY}  x2={ex}     y2={botCY} stroke={color} strokeWidth={sw} filter={fil}/>
            <line x1={ex}              y1={midY}   x2={xFn(r)} y2={midY}  stroke={color} strokeWidth={sw} filter={fil}/>
          </g>
        );
      } else {
        const ex = xFn(r - 1) - 18;
        lines.push(
          <g key={"R" + r + "-" + mIdx}>
            <line x1={xFn(r-1)}   y1={topCY} x2={ex}            y2={topCY} stroke={color} strokeWidth={sw} filter={fil}/>
            <line x1={xFn(r-1)}   y1={botCY} x2={ex}            y2={botCY} stroke={color} strokeWidth={sw} filter={fil}/>
            <line x1={ex}         y1={topCY}  x2={ex}           y2={botCY} stroke={color} strokeWidth={sw} filter={fil}/>
            <line x1={ex}         y1={midY}   x2={xFn(r)+SLOT_W} y2={midY} stroke={color} strokeWidth={sw} filter={fil}/>
          </g>
        );
      }
    });
  }
  return <>{lines}</>;
}

function FinalLines({ leftRounds, rightRounds, layout }) {
  const { leftX, rightX, matchCY, centerX } = layout;
  const lR    = leftRounds.length  - 1;
  const rR    = rightRounds.length - 1;
  const lWon  = !!(leftRounds[lR] && leftRounds[lR][0] && leftRounds[lR][0].winner);
  const rWon  = !!(rightRounds[rR] && rightRounds[rR][0] && rightRounds[rR][0].winner);
  const lCY   = matchCY(lR, 0);
  const rCY   = matchCY(rR, 0);
  const finCY = SVG_H / 2;
  const finX  = centerX - SLOT_W / 2;
  const lEx   = leftX(lR)  + SLOT_W + 18;
  const rEx   = rightX(rR) - 18;
  const lc    = lWon ? "#c8f55a" : "#1a2e1a";
  const rc    = rWon ? "#c8f55a" : "#1a2e1a";
  const lf    = lWon ? "url(#aglow)" : "";
  const rf    = rWon ? "url(#aglow)" : "";

  return (
    <>
      <line x1={leftX(lR)+SLOT_W} y1={lCY}  x2={lEx} y2={lCY}                           stroke={lc} strokeWidth={lWon?1.5:1} filter={lf}/>
      <line x1={lEx}              y1={lCY}  x2={lEx} y2={finCY-SLOT_H-SLOT_GAP/2}        stroke={lc} strokeWidth={lWon?1.5:1} filter={lf}/>
      <line x1={lEx}              y1={finCY-SLOT_H-SLOT_GAP/2} x2={finX} y2={finCY-SLOT_H-SLOT_GAP/2} stroke={lc} strokeWidth={lWon?1.5:1} filter={lf}/>
      <line x1={rightX(rR)}       y1={rCY}  x2={rEx} y2={rCY}                            stroke={rc} strokeWidth={rWon?1.5:1} filter={rf}/>
      <line x1={rEx}              y1={rCY}  x2={rEx} y2={finCY+SLOT_GAP/2+SLOT_H}        stroke={rc} strokeWidth={rWon?1.5:1} filter={rf}/>
      <line x1={rEx}              y1={finCY+SLOT_GAP/2+SLOT_H} x2={finX+SLOT_W} y2={finCY+SLOT_GAP/2+SLOT_H} stroke={rc} strokeWidth={rWon?1.5:1} filter={rf}/>
    </>
  );
}

function BracketSVG({ bracket, currentMatchId, zoomed }) {
  if (!bracket || !Array.isArray(bracket.left) || !Array.isArray(bracket.right)) {
    return null;
  }
  const layout = getLayout(bracket);
  const { totalW, centerX, labels, leftX, rightX, matchCY } = layout;
  const finX  = centerX - SLOT_W / 2;
  const finCY = SVG_H / 2;

  const isDimmed = (matchId) => zoomed && currentMatchId && matchId !== currentMatchId;

  return (
    <svg width={totalW} height={SVG_H} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <filter id="aglow">
          <feGaussianBlur stdDeviation="2" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="wglow">
          <feGaussianBlur stdDeviation="5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {labels.map((lbl, i) => (
        <g key={lbl}>
          <text x={leftX(i)  + SLOT_W/2} y={PAD_TOP-10} fill="#2a4a2a" fontSize={9} textAnchor="middle" fontFamily="'PT Mono', monospace" letterSpacing={2}>{lbl}</text>
          <text x={rightX(i) + SLOT_W/2} y={PAD_TOP-10} fill="#2a4a2a" fontSize={9} textAnchor="middle" fontFamily="'PT Mono', monospace" letterSpacing={2}>{lbl}</text>
        </g>
      ))}
      <text x={centerX} y={PAD_TOP-10} fill="#2a4a2a" fontSize={9} textAnchor="middle" fontFamily="'PT Mono', monospace" letterSpacing={2}>FINAL</text>

      <SideLines rounds={bracket.left}  side="left"  layout={layout} />
      <SideLines rounds={bracket.right} side="right" layout={layout} />
      <FinalLines leftRounds={bracket.left} rightRounds={bracket.right} layout={layout} />

      {bracket.left.map((round, rIdx) =>
        round.map((match, mIdx) => (
          <MatchGroup key={match.id} match={match}
            x={leftX(rIdx)} cy={matchCY(rIdx, mIdx)}
            isActive={match.id === currentMatchId}
            dimmed={isDimmed(match.id)}
          />
        ))
      )}

      {bracket.right.map((round, rIdx) =>
        round.map((match, mIdx) => (
          <MatchGroup key={match.id} match={match}
            x={rightX(rIdx)} cy={matchCY(rIdx, mIdx)}
            isActive={match.id === currentMatchId}
            dimmed={isDimmed(match.id)}
          />
        ))
      )}

      <MatchGroup
        match={bracket.final} x={finX} cy={finCY}
        isActive={bracket.final && bracket.final.id === currentMatchId}
        dimmed={isDimmed(bracket.final && bracket.final.id)}
      />
    </svg>
  );
}

// ─── Match status panel ──────────────────────────────────────────────────────
function MatchStatus({ match, votedCount, totalPlayers }) {
  const [c0, c1] = match.contenders;
  const v0    = (c0 && match.votes[c0]) || 0;
  const v1    = (c1 && match.votes[c1]) || 0;
  const total = v0 + v1;

  return (
    <div style={s.panel}>
      <div style={s.panelInner}>
        <div style={s.matchTag}>NOW VOTING</div>
        <div style={s.vsRow}>
          <div style={s.statusContender}>
            <span style={{ fontSize: 13, letterSpacing: 2 }}>{c0}</span>
          </div>
          <div style={s.vsCenter}>
            <div style={s.vsWord}>VS</div>
            <div style={s.voteCount}>
              {votedCount}<span style={{ color: "#2a4a2a" }}>/{totalPlayers}</span>
              <div style={{ fontSize: 9, color: "#2a4a2a", letterSpacing: 2 }}>VOTED</div>
            </div>
          </div>
          <div style={s.statusContender}>
            <span style={{ fontSize: 13, letterSpacing: 2 }}>{c1}</span>
          </div>
        </div>
        {total > 0 && (
          <div style={s.voteBarTrack}>
            <div style={{ ...s.voteBarFill, width: (v0/total)*100 + "%" }} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main app ────────────────────────────────────────────────────────────────
// ─── Tiebreaker / RPS panel ──────────────────────────────────────────────────
// ─── One Second live panel ─────────────────────────────────────────────────────
function OneSecondPanel({ tiebreaker, playerNames }) {
  const [displayMs, setDisplayMs] = useState(0);
  const os = tiebreaker.oneSecond;

  useEffect(() => {
    const isRunning = os.osPhase === "running_p1" || os.osPhase === "running_p2";
    const startTs = os.osPhase === "running_p1" ? os.startTs1 : os.osPhase === "running_p2" ? os.startTs2 : null;
    if (!isRunning || !startTs) { setDisplayMs(0); return; }
    const id = setInterval(() => setDisplayMs(Date.now() - startTs), 33);
    return () => clearInterval(id);
  }, [os.osPhase]); // eslint-disable-line

  const fmtMs = (ms) => (ms / 1000).toFixed(3);
  const p1Name = (playerNames && playerNames[os.player1]) || "Player 1";
  const p2Name = (playerNames && playerNames[os.player2]) || "Player 2";
  const isRunning = os.osPhase === "running_p1" || os.osPhase === "running_p2";

  let statusText = "";
  if (os.osPhase === "waiting_p1") statusText = `${p1Name} getting ready\u2026`;
  else if (os.osPhase === "running_p1") statusText = `${p1Name} is timing!`;
  else if (os.osPhase === "done_p1") statusText = `${p1Name}: ${fmtMs(os.elapsed1)}s \u00B7 ${p2Name} up next\u2026`;
  else if (os.osPhase === "waiting_p2") statusText = `${p2Name} getting ready\u2026`;
  else if (os.osPhase === "running_p2") statusText = `${p2Name} is timing!`;
  else if (os.osPhase === "done") {
    const w = os.winner === "p1" ? tiebreaker.c0 : tiebreaker.c1;
    statusText = `${w} WINS!`;
  }

  return (
    <div style={s.panel}>
      <div style={s.panelInner}>
        <div style={s.matchTag}>ONE SECOND CHALLENGE</div>
        <div style={s.rpsPlayerNames}>{p1Name} vs {p2Name}</div>
        <div style={s.vsRow}>
          {/* Left contender */}
          <div style={s.statusContender}>
            <span style={{ fontSize: 13, letterSpacing: 2 }}>{tiebreaker.c0}</span>
            {os.elapsed1 != null && (
              <span style={{ fontSize: 22, fontWeight: "bold", color: os.winner === "p1" ? "#c8f55a" : "#3a5a3a",
                fontVariantNumeric: "tabular-nums" }}>
                {fmtMs(os.elapsed1)}s
              </span>
            )}
            {os.elapsed1 != null && (
              <span style={{ fontSize: 10, color: "#2a4a2a", letterSpacing: 1 }}>
                \u00B1{fmtMs(Math.abs(os.elapsed1 - 1000))}s
              </span>
            )}
          </div>
          {/* Center — live timer */}
          <div style={{ ...s.vsCenter, minWidth: 100 }}>
            <div style={s.vsWord}>VS</div>
            {isRunning && (
              <div style={{ fontSize: 32, fontWeight: "bold", color: "#c8f55a", letterSpacing: 1,
                fontVariantNumeric: "tabular-nums", fontFamily: "'PT Mono', monospace",
                textShadow: "0 0 20px #c8f55a66", lineHeight: 1.1, marginTop: 6 }}>
                {fmtMs(displayMs)}
              </div>
            )}
          </div>
          {/* Right contender */}
          <div style={s.statusContender}>
            <span style={{ fontSize: 13, letterSpacing: 2 }}>{tiebreaker.c1}</span>
            {os.elapsed2 != null && (
              <span style={{ fontSize: 22, fontWeight: "bold", color: os.winner === "p2" ? "#c8f55a" : "#3a5a3a",
                fontVariantNumeric: "tabular-nums" }}>
                {fmtMs(os.elapsed2)}s
              </span>
            )}
            {os.elapsed2 != null && (
              <span style={{ fontSize: 10, color: "#2a4a2a", letterSpacing: 1 }}>
                \u00B1{fmtMs(Math.abs(os.elapsed2 - 1000))}s
              </span>
            )}
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: 10, fontSize: 14, letterSpacing: 3 }}>{statusText}</div>
      </div>
    </div>
  );
}

function TiebreakerPanel({ phase, tiebreaker, isHost, hostPickWinner, startRPS, startOneSecond, playerNames }) {
  if (!tiebreaker) return null;

  // One Second phase
  if (phase === "oneSecond" && tiebreaker.oneSecond) {
    return <OneSecondPanel tiebreaker={tiebreaker} playerNames={playerNames} />;
  }

  // RPS phase
  if (phase === "rps" && tiebreaker.rps) {
    const rps = tiebreaker.rps;
    const name1 = (playerNames && playerNames[rps.player1]) || "Player 1";
    const name2 = (playerNames && playerNames[rps.player2]) || "Player 2";
    let statusText = "Waiting for choices\u2026";
    if (rps.result === "draw") statusText = "DRAW \u2014 going again\u2026";
    else if (rps.result === "p1") statusText = tiebreaker.c0 + " WINS!";
    else if (rps.result === "p2") statusText = tiebreaker.c1 + " WINS!";
    else if (rps.choice1 && !rps.choice2) statusText = name1 + " is ready\u2026";
    else if (!rps.choice1 && rps.choice2) statusText = name2 + " is ready\u2026";

    return (
      <div style={s.panel}>
        <div style={s.panelInner}>
          <div style={s.matchTag}>ROCK PAPER SCISSORS \u00B7 ROUND {rps.round}</div>
          <div style={s.rpsPlayerNames}>{name1} vs {name2}</div>
          <div style={s.vsRow}>
            <div style={s.statusContender}>
              <span style={{ fontSize: 13, letterSpacing: 2 }}>{tiebreaker.c0}</span>
              {rps.choice1 && rps.choice2 && <RpsIcon choice={rps.choice1} size={32} />}
            </div>
            <div style={s.vsCenter}>
              <div style={s.vsWord}>VS</div>
            </div>
            <div style={s.statusContender}>
              <span style={{ fontSize: 13, letterSpacing: 2 }}>{tiebreaker.c1}</span>
              {rps.choice1 && rps.choice2 && <RpsIcon choice={rps.choice2} size={32} />}
            </div>
          </div>
          <div style={{ textAlign: "center", marginTop: 10, fontSize: 14, letterSpacing: 3 }}>{statusText}</div>
        </div>
      </div>
    );
  }

  // Tiebreaker decision phase (host picks method)
  if (phase === "tiebreaker") {
    return (
      <div style={s.panel}>
        <div style={s.panelInner}>
          <div style={s.matchTag}>TIE DETECTED</div>
          <div style={s.vsRow}>
            <div style={s.statusContender}>
              <span style={{ fontSize: 13, letterSpacing: 2 }}>{tiebreaker.c0}</span>
            </div>
            <div style={s.vsCenter}>
              <div style={s.vsWord}>TIE</div>
            </div>
            <div style={s.statusContender}>
              <span style={{ fontSize: 13, letterSpacing: 2 }}>{tiebreaker.c1}</span>
            </div>
          </div>
          {isHost && (
            <div style={{ display: "flex", gap: 10, marginTop: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button style={{ ...s.startBtn, display: "inline-flex", alignItems: "center", gap: 6 }} onClick={startRPS}><RockIcon size={18} /> RPS</button>
              <button style={s.startBtn} onClick={startOneSecond}>\u23F1 ONE SECOND</button>
              <button style={s.startBtn} onClick={() => hostPickWinner(tiebreaker.c0)}>{tiebreaker.c0}</button>
              <button style={s.startBtn} onClick={() => hostPickWinner(tiebreaker.c1)}>{tiebreaker.c1}</button>
            </div>
          )}
          {!isHost && (
            <div style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: "#2a4a2a", letterSpacing: 2 }}>Host is deciding\u2026</div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

export default function BracketApp() {
  const {
    phase, category, playerCount, totalPlayers, isHost,
    bracket, currentMatchId: currentMatch, champion, votedCount,
    tiebreaker, playerNames, scores, connected,
    startNext, skip, playAgain, hostPickWinner, startRPS, startOneSecond, clearPlayers
  } = useGameState();

  const [cameraTarget, setCameraTarget] = useState(null);
  const [zoomed,       setZoomed]       = useState(false);
  const [muted,        setMuted]        = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [cameraMode,   setCameraMode]   = useState(true);
  const [camTypeText,  setCamTypeText]  = useState("");
  const [freeTransform, setFreeTransform] = useState({ scale: 1, tx: 0, ty: 0 });
  const [isDragging,   setIsDragging]   = useState(false);
  const [freeSnapping, setFreeSnapping] = useState(false);
  const [bumperSrc,    setBumperSrc]    = useState(null);
  const [bumperFading, setBumperFading] = useState(false);
  const [showBlackout, setShowBlackout] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [musicVolume,  setMusicVolume]  = useState(1);
  const [sfxVolume,    setSfxVolume]    = useState(1);
  const [randomTiebreaker, setRandomTiebreaker] = useState(false);

  // ── Audio management ──
  const menuAudio = useRef(null);
  const gameAudio = useRef(null);
  const endAudio  = useRef(null);
  const rpsAudio  = useRef(null);
  const startSfx  = useRef(null);
  const startAgainSfx  = useRef(null);
  const playerAddSfx   = useRef(null);
  const resetPlayersSfx = useRef(null);
  const choiceMadeSfx  = useRef(null);
  const audioCtxRef    = useRef(null);
  const zoomBufFwd     = useRef(null);  // AudioBuffer forward
  const zoomBufRev     = useRef(null);  // AudioBuffer reversed
  const zoomDryGain    = useRef(null);
  const zoomConvolver  = useRef(null);
  const rpsSfxBufs     = useRef({});    // { rock, paper, scissors } AudioBuffers
  const prevPhase = useRef(phase);
  const prevPlayerCount = useRef(playerCount);
  const prevMatchId = useRef(currentMatch);
  const dragRef      = useRef(null);
  const viewportRef  = useRef(null);
  const cameraModeRef = useRef(true);
  const lastBumperRoundRef      = useRef(null);  // { rIdx, isFinal } of last shown bumper
  const bumperFadingRef         = useRef(false); // sync flag for use inside video callbacks
  const firebaseBootstrappedRef = useRef(false); // true after first Firebase data load
  const camTypeInitRef = useRef(false);          // skip first render for typing animation
  const camTypeTimersRef = useRef({});           // holds interval/timeout for cleanup
  const sfxMasterGainRef   = useRef(null);  // Web Audio master gain for all SFX
  const bumperVideoRef     = useRef(null);  // current bumper <video> element

  const layout = useMemo(() => getLayout(bracket), [bracket]);
  const layoutRef = useRef(layout);
  layoutRef.current = layout; // always current inside non-React listeners

  // Create Audio objects once with seamless looping
  useEffect(() => {
    const makeLoop = (src, vol) => {
      const a = new Audio(src);
      a.loop = true;
      a.volume = vol;
      a.addEventListener("timeupdate", () => {
        if (a.duration && a.currentTime > a.duration - 0.1) {
          a.currentTime = 0;
          a.play().catch(() => {});
        }
      });
      return a;
    };
    menuAudio.current = makeLoop(menuSongSrc, 0.6);      // 40% lower
    gameAudio.current = makeLoop(gameSongSrc, 0.3);      // 40% lower
    endAudio.current  = makeLoop(endSongSrc, 0.6);       // 40% lower
    rpsAudio.current  = makeLoop(rpsBeatSrc, 0.45);      // 40% lower
    // ── Web Audio reverb chain for SFX ──
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
    const sfxMaster = ctx.createGain();
    sfxMaster.gain.value = 1.0;
    sfxMasterGainRef.current = sfxMaster;
    convolver.connect(wetGain);
    wetGain.connect(sfxMaster);
    dryGain.connect(sfxMaster);
    sfxMaster.connect(ctx.destination);

    const makeSfx = (src) => {
      const a = new Audio(src);
      a.volume = 0.5;                  // 50 % quieter
      const node = ctx.createMediaElementSource(a);
      node.connect(dryGain);
      node.connect(convolver);
      return a;
    };

    startSfx.current        = makeSfx(startSfxSrc);
    startAgainSfx.current   = makeSfx(startAgainSrc);
    playerAddSfx.current    = makeSfx(playerAddSrc);
    resetPlayersSfx.current = makeSfx(resetPlayersSrc);
    choiceMadeSfx.current   = makeSfx(choiceMadeSrc);

    // Decode ZoomIn.wav – trim to first 1 s, build forward + reversed buffers
    fetch(zoomInSrc)
      .then(r => r.arrayBuffer())
      .then(buf => ctx.decodeAudioData(buf))
      .then(decoded => {
        const oneSec = Math.min(decoded.length, decoded.sampleRate); // 1 s of samples
        // Forward buffer (first 1 s only)
        const fwd = ctx.createBuffer(decoded.numberOfChannels, oneSec, decoded.sampleRate);
        for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
          const src = decoded.getChannelData(ch);
          fwd.getChannelData(ch).set(src.subarray(0, oneSec));
        }
        zoomBufFwd.current = fwd;
        // Reversed buffer (first 0.75 s reversed – trims 0.25 s of quiet tail)
        const revLen = Math.min(oneSec, Math.round(decoded.sampleRate * 0.75));
        const rev = ctx.createBuffer(decoded.numberOfChannels, revLen, decoded.sampleRate);
        for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
          const s = fwd.getChannelData(ch);
          const d = rev.getChannelData(ch);
          // Reverse from sample (revLen-1) down to 0 of the forward buffer
          for (let i = 0; i < revLen; i++) d[i] = s[revLen - 1 - i];
        }
        zoomBufRev.current = rev;
        zoomDryGain.current = dryGain;
        zoomConvolver.current = convolver;
      })
      .catch(() => {});

    // Decode Rock / Paper / Scissors SFX
    [['rock', rockSfxSrc], ['paper', paperSfxSrc], ['scissors', scissorsSfxSrc]].forEach(([key, src]) => {
      fetch(src)
        .then(r => r.arrayBuffer())
        .then(buf => ctx.decodeAudioData(buf))
        .then(decoded => { rpsSfxBufs.current[key] = decoded; })
        .catch(() => {});
    });

    // Try to autoplay menu song immediately
    menuAudio.current.play().catch(() => {});
    return () => {
      menuAudio.current?.pause();
      gameAudio.current?.pause();
      endAudio.current?.pause();
      rpsAudio.current?.pause();
      audioCtxRef.current?.close();
    };
  }, []);

  // Unlock audio on first user interaction (browser autoplay policy)
  useEffect(() => {
    if (audioUnlocked) return;
    const unlock = () => {
      setAudioUnlocked(true);
      audioCtxRef.current?.resume();
      // Play the right track for current phase
      const stop = (a) => { if (a.current) { a.current.pause(); a.current.currentTime = 0; } };
      if (phase === "lobby") {
        stop(gameAudio); stop(endAudio); stop(rpsAudio);
        menuAudio.current?.play().catch(() => {});
      } else if (phase === "finished" || champion) {
        stop(menuAudio); stop(gameAudio); stop(rpsAudio);
        endAudio.current?.play().catch(() => {});
      } else if (phase === "rps") {
        stop(menuAudio); stop(endAudio); stop(gameAudio);
        rpsAudio.current?.play().catch(() => {});
      } else {
        stop(menuAudio); stop(endAudio); stop(rpsAudio);
        gameAudio.current?.play().catch(() => {});
      }
    };
    document.addEventListener("click", unlock, { once: true });
    document.addEventListener("touchstart", unlock, { once: true });
    document.addEventListener("keydown", unlock, { once: true });
    return () => {
      document.removeEventListener("click", unlock);
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, [audioUnlocked, phase, champion]);

  // Switch music based on phase (including RPS)
  useEffect(() => {
    const stop = (a) => { if (a.current) { a.current.pause(); a.current.currentTime = 0; } };
    if (phase === "lobby") {
      stop(gameAudio); stop(endAudio); stop(rpsAudio);
      menuAudio.current?.play().catch(() => {});
    } else if (phase === "finished" || champion) {
      stop(menuAudio); stop(gameAudio); stop(rpsAudio);
      endAudio.current?.play().catch(() => {});
    } else if (phase === "rps") {
      stop(menuAudio); stop(endAudio); stop(gameAudio);
      rpsAudio.current?.play().catch(() => {});
    } else {
      // playing / tiebreaker
      stop(menuAudio); stop(endAudio); stop(rpsAudio);
      gameAudio.current?.play().catch(() => {});
    }
  }, [phase, champion]);

  // Play RPS winning choice SFX when result is determined
  useEffect(() => {
    if (!tiebreaker?.rps) return;
    const { result, choice1, choice2 } = tiebreaker.rps;
    if (!result || result === "draw") return;
    const winningChoice = result === "p1" ? choice1 : choice2;
    const buf = rpsSfxBufs.current[winningChoice];
    const ctx = audioCtxRef.current;
    if (!buf || !ctx || muted) return;
    // Pause RPS music right before the SFX
    if (rpsAudio.current) rpsAudio.current.pause();
    const source = ctx.createBufferSource();
    source.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = 1.0;
    source.connect(gain);
    if (zoomDryGain.current) gain.connect(zoomDryGain.current);
    if (zoomConvolver.current) gain.connect(zoomConvolver.current);
    source.start();
  }, [tiebreaker?.rps?.result]);

  // Play start SFX once on lobby → playing transition; also show blackout so bracket
  // never flashes before the round bumper appears (only on a real game start, not refresh)
  useEffect(() => {
    if (prevPhase.current === "lobby" && phase !== "lobby") {
      if (!muted) startSfx.current?.play().catch(() => {});
      if (firebaseBootstrappedRef.current) setShowBlackout(true);
    }
    prevPhase.current = phase;
  }, [phase]); // eslint-disable-line

  // Play PlayerAdd SFX when a new player joins
  useEffect(() => {
    if (playerCount > prevPlayerCount.current && prevPlayerCount.current >= 0) {
      playerAddSfx.current.currentTime = 0;
      playerAddSfx.current.play().catch(() => {});
    }
    prevPlayerCount.current = playerCount;
  }, [playerCount]);

  // Play ChoiceMade SFX when a match advances (currentMatchId changes during play)
  useEffect(() => {
    if (prevMatchId.current != null && currentMatch !== prevMatchId.current && phase !== "lobby") {
      choiceMadeSfx.current.currentTime = 0;
      choiceMadeSfx.current.play().catch(() => {});
    }
    prevMatchId.current = currentMatch;
  }, [currentMatch, phase]);

  // Sync muted state to all audio objects
  useEffect(() => {
    [menuAudio, gameAudio, endAudio, rpsAudio, startSfx, startAgainSfx, playerAddSfx, resetPlayersSfx, choiceMadeSfx].forEach((a) => {
      if (a.current) a.current.muted = muted;
    });
  }, [muted]);

  const toggleMute = () => setMuted((m) => !m);

  // Camera mode typing animation (type on → hold → backspace off)
  useEffect(() => {
    if (!camTypeInitRef.current) { camTypeInitRef.current = true; return; }
    const t = camTypeTimersRef.current;
    clearInterval(t.iv); clearInterval(t.iv2); clearTimeout(t.ht);

    const msg = cameraMode ? "Camera mode: on" : "Camera mode: off";
    setCamTypeText("");

    let i = 0;
    const iv = setInterval(() => {
      i++;
      setCamTypeText(msg.slice(0, i));
      if (i >= msg.length) {
        clearInterval(iv);
        // hold, then backspace
        const ht = setTimeout(() => {
          const iv2 = setInterval(() => {
            i--;
            setCamTypeText(msg.slice(0, i));
            if (i <= 0) { clearInterval(iv2); setCamTypeText(""); }
          }, 36);
          camTypeTimersRef.current.iv2 = iv2;
        }, 700);
        camTypeTimersRef.current.ht = ht;
      }
    }, 48);
    camTypeTimersRef.current = { iv, iv2: null, ht: null };
    return () => {
      clearInterval(camTypeTimersRef.current.iv);
      clearInterval(camTypeTimersRef.current.iv2);
      clearTimeout(camTypeTimersRef.current.ht);
    };
  }, [cameraMode]); // eslint-disable-line

  // Music volume — scales each track relative to its designed base level
  useEffect(() => {
    if (menuAudio.current) menuAudio.current.volume = 0.6  * musicVolume;
    if (gameAudio.current) gameAudio.current.volume = 0.3  * musicVolume;
    if (endAudio.current)  endAudio.current.volume  = 0.6  * musicVolume;
    if (rpsAudio.current)  rpsAudio.current.volume  = 0.45 * musicVolume;
    if (bumperVideoRef.current) bumperVideoRef.current.volume = 0.6 * musicVolume;
  }, [musicVolume, bumperSrc]);

  // SFX volume — controls master gain for all Web Audio SFX
  useEffect(() => {
    if (sfxMasterGainRef.current) sfxMasterGainRef.current.gain.value = sfxVolume;
  }, [sfxVolume]);

  // Auto-resolve tiebreaker randomly when that setting is on
  useEffect(() => {
    if (phase !== "tiebreaker" || !tiebreaker || !randomTiebreaker) return;
    const roll = Math.random();
    if (roll < 1 / 3) {
      startRPS();
    } else if (roll < 2 / 3) {
      startOneSecond();
    } else {
      const winner = Math.random() < 0.5 ? tiebreaker.c0 : tiebreaker.c1;
      hostPickWinner(winner);
    }
  }, [phase, tiebreaker?.matchId, randomTiebreaker]); // eslint-disable-line

  // Play zoom SFX (forward for zoom-in, reversed for zoom-out)
  const playZoomSfx = (reversed) => {
    const ctx = audioCtxRef.current;
    const buf = reversed ? zoomBufRev.current : zoomBufFwd.current;
    if (!ctx || !buf || muted) return;
    const source = ctx.createBufferSource();
    source.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = 0.5;
    source.connect(gain);
    if (zoomDryGain.current) gain.connect(zoomDryGain.current);
    if (zoomConvolver.current) gain.connect(zoomConvolver.current);
    source.start();
  };

  // Wrapped handlers with SFX
  const handlePlayAgain = () => {
    startAgainSfx.current.currentTime = 0;
    startAgainSfx.current.play().catch(() => {});
    playAgain();
  };

  const handleClearPlayers = () => {
    resetPlayersSfx.current.currentTime = 0;
    resetPlayersSfx.current.play().catch(() => {});
    clearPlayers();
  };

  const liveMatch = currentMatch && bracket
    ? allMatches(bracket).find((m) => m.id === currentMatch)
    : null;

  // Keep cameraModeRef in sync for use inside non-React listeners
  useEffect(() => { cameraModeRef.current = cameraMode; }, [cameraMode]);

  // Global custom cursor — 4 states: default, hover-over-clickable, left-drag, right-click.
  // Uses a <style> tag with !important to beat inline cursor styles on buttons etc.
  // button:hover etc. has higher specificity than *:hover so hover state wins in normal mode.
  // Drag/right-click use blanket * rule to override everything.
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

  // Non-passive wheel listener for free-mode zoom anchored at cursor
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (cameraModeRef.current) return;
      e.preventDefault();
      setFreeSnapping(false);
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const tw = layoutRef.current.totalW;
      const vph = el.clientHeight;
      setFreeTransform(prev => {
        const newScale = Math.max(minScale(tw), Math.min(MAX_SCALE, prev.scale * factor));
        const svgX = (cx - prev.tx) / prev.scale;
        const svgY = (cy - prev.ty) / prev.scale;
        const rawTx = cx - svgX * newScale;
        const rawTy = cy - svgY * newScale;
        return { scale: newScale, ...clampTransform(rawTx, rawTy, newScale, tw, vph) };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [phase]); // eslint-disable-line — re-run when viewport mounts (lobby→playing)

  // Camera effect — only runs in camera mode
  useEffect(() => {
    if (!bracket || !cameraMode) return;
    if (bumperSrc) {
      // Hold at zoomed-out while bumper is playing so bracket is revealed at full view
      setZoomed(false);
      setCameraTarget(null);
      return;
    }
    if (currentMatch) {
      const pos = getMatchPosition(bracket, currentMatch, layout);
      setCameraTarget(pos);
      // Delay zoom-in so user sees the full bracket briefly after bumper fades
      const t = setTimeout(() => setZoomed(true), bumperFading ? 600 : 80);
      return () => clearTimeout(t);
    } else {
      setZoomed(false);
      const t = setTimeout(() => setCameraTarget(null), 950);
      return () => clearTimeout(t);
    }
  }, [currentMatch, cameraMode, bumperSrc]); // eslint-disable-line

  // Keep bumperFadingRef in sync for use inside video onTimeUpdate callback
  useEffect(() => { bumperFadingRef.current = bumperFading; }, [bumperFading]);

  // On first Firebase load, silently mark the current round so a page-refresh mid-game
  // doesn't re-show the round bumper. Must run before the bumper trigger effect.
  useEffect(() => {
    if (!connected || firebaseBootstrappedRef.current) return;
    firebaseBootstrappedRef.current = true;
    if (phase === "playing" && currentMatch && bracket) {
      const curr = getRoundInfo(bracket, currentMatch);
      if (curr) lastBumperRoundRef.current = { rIdx: curr.rIdx, isFinal: curr.isFinal };
    }
  }, [connected, phase, currentMatch, bracket]); // eslint-disable-line

  // Show the correct bumper video when entering a new round
  useEffect(() => {
    if (phase !== "playing" || !currentMatch || !bracket) return;
    const curr = getRoundInfo(bracket, currentMatch);
    if (!curr) return;
    const last = lastBumperRoundRef.current;
    const isNewRound = !last
      || (curr.isFinal !== last.isFinal)
      || (!curr.isFinal && curr.rIdx !== last.rIdx);
    if (!isNewRound) return;
    const src = pickBumperSrc(bracket, curr.rIdx, curr.isFinal);
    if (src) {
      lastBumperRoundRef.current = { rIdx: curr.rIdx, isFinal: curr.isFinal };
      bumperFadingRef.current = false;
      setBumperFading(false);
      setBumperSrc(src);
    } else {
      setShowBlackout(false); // no bumper for this round, clear the blackout
    }
  }, [currentMatch, phase]); // eslint-disable-line

  // Auto-dismiss bumper after fade animation completes (~8 frames at 12fps)
  useEffect(() => {
    if (!bumperFading) return;
    const t = setTimeout(() => {
      setBumperSrc(null);
      setBumperFading(false);
      setShowBlackout(false);
    }, 800);
    return () => clearTimeout(t);
  }, [bumperFading]);

  // Pause game music while bumper plays, resume when it clears
  useEffect(() => {
    if (bumperSrc) {
      gameAudio.current?.pause();
    } else if (phase === "playing" && !muted) {
      gameAudio.current?.play().catch(() => {});
    }
  }, [bumperSrc]); // eslint-disable-line

  const cameraStyle = useCamera(cameraTarget ? cameraTarget.x : null, cameraTarget ? cameraTarget.cy : null, zoomed, layout.totalW);

  const zoomOut = () => {
    playZoomSfx(true);
    setZoomed(false);
    setTimeout(() => setCameraTarget(null), 950);
  };

  const zoomIn = () => {
    playZoomSfx(false);
    const pos = getMatchPosition(bracket, currentMatch, layout);
    setCameraTarget(pos);
    setTimeout(() => setZoomed(true), 80);
  };

  const snapFreeToFit = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const fitScale = Math.min(vw / layout.totalW, (vh * 0.624) / SVG_H, 1.2);
    const fitTx = (vw - layout.totalW * fitScale) / 2;
    setFreeSnapping(true);
    setFreeTransform({ scale: fitScale, tx: fitTx, ty: 0 });
  };

  const toggleCameraMode = () => {
    if (cameraMode) {
      // Switch to free mode: initialise to current fit view
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const fitScale = Math.min(vw / layout.totalW, (vh * 0.624) / SVG_H, 1.2);
      const fitTx    = (vw - layout.totalW * fitScale) / 2;
      setFreeTransform({ scale: fitScale, tx: fitTx, ty: 0 });
      setCameraMode(false);
    } else {
      setCameraMode(true);
    }
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    if (cameraMode) return;
    setFreeSnapping(false);
    e.preventDefault(); // prevent browser text-selection drag
    dragRef.current = {
      startX: e.clientX, startY: e.clientY,
      startTx: freeTransform.tx, startTy: freeTransform.ty,
    };
  };

  const handleMouseMove = (e) => {
    if (!dragRef.current) return;
    // Capture ref values immediately — the functional state updater runs
    // asynchronously and dragRef.current may be null by then (mouseup race).
    const { startX, startY, startTx, startTy } = dragRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const vph = viewportRef.current?.clientHeight;
    setFreeTransform(prev => {
      return { scale: prev.scale, ...clampTransform(startTx + dx, startTy + dy, prev.scale, layoutRef.current.totalW, vph) };
    });
  };

  const handleMouseUp = () => {
    dragRef.current = null;
    setIsDragging(false);
  };

  const freeStyle = {
    transform: `translate(${freeTransform.tx}px, ${freeTransform.ty}px) scale(${freeTransform.scale})`,
    transformOrigin: "0 0",
    transition: freeSnapping ? "transform 0.9s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
  };

  // ── Lobby Screen ──
  if (phase === "lobby") {
    return (
      <div style={s.root}>
        <style>{`
          @keyframes gear-spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
          .settings-btn-outer:hover .settings-gear { animation: gear-spin 2.5s linear infinite; }
          @keyframes reset-spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
          .reset-btn-outer:hover .reset-arrow { animation: reset-spin 2.67s linear infinite; }
        `}</style>
        {/* Title video background */}
        <video
          src={titleVideoSrc}
          autoPlay
          loop
          muted
          playsInline
          style={s.titleVideo}
        />
        <div style={{ position: "absolute", top: 16, right: 16, zIndex: 10, display: "flex", gap: 8 }}>
          <button className="reset-btn-outer" onClick={handleClearPlayers} style={s.clearBtnSmall}>
            <span className="reset-arrow" style={{ display: "inline-flex", width: 16, height: 16 }}><IconReset /></span>
            {" RESET"}
          </button>
          <button className="settings-btn-outer" style={s.settingsBtn} onClick={() => setShowSettings(true)} title="Settings">
            <span className="settings-gear" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16 }}><IconGear /></span>
          </button>
        </div>
        <div style={s.lobbyContentWrap}>
          <div style={s.lobbyInfo}>
            <div style={s.lobbyPlayers}>
              {playerCount} PLAYER{playerCount !== 1 ? "S" : ""} JOINED
            </div>
            {Object.keys(playerNames).length > 0 && (
              <div style={s.lobbyNamesList}>
                {Object.values(playerNames).map((name, i) => (
                  <span key={i} style={s.lobbyNameTag}>{name}</span>
                ))}
              </div>
            )}
            <div style={s.lobbyUrl}>
              <span style={{ color: "#c8f55a" }}>JOIN AT: {window.location.host}/vote</span>
            </div>
            <div style={{ padding: 6, background: "#0a140a", border: "1px solid #1a2e1a", marginTop: 8 }}>
              <QRCodeSVG
                value={`${window.location.origin}/vote`}
                size={60}
                bgColor="#0a140a"
                fgColor="#c8f55a"
                level="M"
              />
            </div>
            <div style={s.lobbyStatus}>
              Waiting for host to select category
            </div>
          </div>
        </div>

        {/* Settings overlay */}
        {showSettings && (
          <div
            style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => setShowSettings(false)}
          >
            <style>{`
              @keyframes settings-open {
                from { transform: scale(0); opacity: 0; }
                to   { transform: scale(1); opacity: 1; }
              }
              @keyframes settings-gear-spin {
                from { transform: rotate(0deg); }
                to   { transform: rotate(360deg); }
              }
              .settings-header-gear { animation: settings-gear-spin 2.5s linear infinite; }
              .s-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 4px;
                background: #1a2e1a; outline: none; border-radius: 2px; cursor: pointer; }
              .s-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px;
                background: #c8f55a; border-radius: 2px; cursor: pointer; }
              .s-slider::-moz-range-thumb { width: 16px; height: 16px; background: #c8f55a;
                border-radius: 2px; border: none; cursor: pointer; }
            `}</style>
            <div
              style={{
                background: "rgba(6,14,6,0.95)", border: "1px solid #1a2e1a", borderRadius: 3,
                padding: "42px 48px", minWidth: 480, display: "flex", flexDirection: "column", gap: 24,
                animation: "settings-open 0.18s ease-out both",
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "'PT Mono',monospace", fontSize: 12, letterSpacing: 4, color: "#c8f55a", display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="settings-header-gear" style={{ display: "inline-flex", width: 16, height: 16 }}><IconGear /></span>
                  SETTINGS
                </span>
                <button
                  style={{ background: "none", border: "none", color: "#c8f55a", cursor: "pointer", fontSize: 16, fontFamily: "'PT Mono',monospace" }}
                  onClick={() => setShowSettings(false)}
                >✕</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "'PT Mono',monospace", fontSize: 10, letterSpacing: 3, color: "#2a4a2a" }}>MUSIC</span>
                  <span style={{ fontFamily: "'PT Mono',monospace", fontSize: 10, letterSpacing: 2, color: "#c8f55a" }}>
                    {Math.round(musicVolume * 100)}%
                  </span>
                </div>
                <input type="range" className="s-slider" min={0} max={1} step={0.01}
                  value={musicVolume} onChange={e => setMusicVolume(Number(e.target.value))} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "'PT Mono',monospace", fontSize: 10, letterSpacing: 3, color: "#2a4a2a" }}>SFX</span>
                  <span style={{ fontFamily: "'PT Mono',monospace", fontSize: 10, letterSpacing: 2, color: "#c8f55a" }}>
                    {Math.round(sfxVolume * 100)}%
                  </span>
                </div>
                <input type="range" className="s-slider" min={0} max={1} step={0.01}
                  value={sfxVolume} onChange={e => setSfxVolume(Number(e.target.value))} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span style={{ fontFamily: "'PT Mono',monospace", fontSize: 10, letterSpacing: 3, color: "#2a4a2a" }}>TIEBREAKER</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    style={{
                      flex: 1, padding: "10px 0", fontFamily: "'PT Mono',monospace", fontSize: 10,
                      letterSpacing: 2, cursor: "pointer", borderRadius: 3,
                      background: !randomTiebreaker ? "#0f1f0f" : "#0a140a",
                      color: !randomTiebreaker ? "#c8f55a" : "#2a5a2a",
                      border: !randomTiebreaker ? "2px solid #c8f55a" : "1px solid #1a2e1a",
                    }}
                    onClick={() => setRandomTiebreaker(false)}
                  >HOST DECIDES</button>
                  <button
                    style={{
                      flex: 1, padding: "10px 0", fontFamily: "'PT Mono',monospace", fontSize: 10,
                      letterSpacing: 2, cursor: "pointer", borderRadius: 3,
                      background: randomTiebreaker ? "#0f1f0f" : "#0a140a",
                      color: randomTiebreaker ? "#c8f55a" : "#2a5a2a",
                      border: randomTiebreaker ? "2px solid #c8f55a" : "1px solid #1a2e1a",
                    }}
                    onClick={() => setRandomTiebreaker(true)}
                  >RANDOM</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Loading ──
  if (!bracket) {
    return (
      <div style={s.root}>
        <div style={{ color: "#2a4a2a", letterSpacing: 2, fontSize: 14 }}>
          Loading…
        </div>
      </div>
    );
  }

  // ── Playing / Finished ──
  return (
    <div style={s.root}>
      <style>{`
        @keyframes gear-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .settings-btn-outer:hover .settings-gear { animation: gear-spin 2.5s linear infinite; }
        @keyframes reset-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .reset-btn-outer:hover .reset-arrow { animation: reset-spin 2.67s linear infinite; }
      `}</style>
      {/* Header */}
      <div style={s.header}>
        <div style={s.title}>BRACKETS</div>
        <div style={s.subtitle}>
          {category ? "CATEGORY: " + category.toUpperCase() : ""}
        </div>
        <div style={s.voteUrl}>
          VOTE: <span style={{ color: "#c8f55a" }}>{window.location.host}/vote</span>
        </div>
        <button
          style={s.cameraBtn}
          onClick={toggleCameraMode}
          title={cameraMode ? "Disable auto-camera" : "Enable auto-camera"}
        >
          <IconVideo color={cameraMode ? "#c8f55a" : "#2a5a2a"} size={21} />
          <div style={{
            width: 35, height: 18, borderRadius: 9, flexShrink: 0,
            background: cameraMode ? "#1a3a1a" : "#0d180d",
            border: `1px solid ${cameraMode ? "#c8f55a" : "#1a2e1a"}`,
            position: "relative", transition: "background 0.2s, border-color 0.2s",
          }}>
            <div style={{
              position: "absolute", width: 13, height: 13, borderRadius: "50%",
              background: cameraMode ? "#c8f55a" : "#2a5a2a",
              top: 2, left: cameraMode ? 20 : 2,
              transition: "left 0.2s, background 0.2s",
              boxShadow: cameraMode ? "0 0 4px #c8f55a88" : "none",
            }} />
          </div>
        </button>
        <button className="settings-btn-outer" style={s.settingsBtn} onClick={() => setShowSettings(true)} title="Settings"><span className="settings-gear" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20 }}><IconGear size={20} /></span></button>
        <ExitButton onExit={handlePlayAgain} style={s.exitBtn} />
      </div>

      {/* Player list - top left */}
      {Object.keys(playerNames).length > 0 && !champion && (
        <div style={s.playerListBox}>
          <div style={s.playerListTitle}>PLAYERS</div>
          {Object.values(playerNames).map((name, i) => (
            <div key={i} style={s.playerListItem}>{name}</div>
          ))}
        </div>
      )}

      {champion && (
        <div style={s.championRow}>
          <div style={s.champion}>
            {"\uD83C\uDFC6"}&nbsp; CHAMPION &mdash;&nbsp;
            <span style={{ color: "#c8f55a", textShadow: "0 0 24px #c8f55a" }}>{champion}</span>
          </div>
          <button style={s.playAgainBtn} onClick={handlePlayAgain}>
            {"\u21BA"} PLAY AGAIN
          </button>
        </div>
      )}

      {champion && scores && Object.keys(scores).length > 0 && (
        <div style={s.leaderboard}>
          <div style={s.leaderboardTitle}>LEADERBOARD</div>
          {Object.entries(scores)
            .map(([pid, sc]) => ({
              name: playerNames[pid] || "???",
              pct: sc.total > 0 ? Math.round((sc.correct / sc.total) * 100) : 0,
              correct: sc.correct,
              total: sc.total,
            }))
            .sort((a, b) => b.pct - a.pct)
            .map((entry, i) => (
              <div key={i} style={s.leaderboardRow}>
                <span style={s.leaderboardRank}>{i + 1}.</span>
                <span style={s.leaderboardName}>{entry.name}</span>
                <span style={s.leaderboardPct}>{entry.pct}%</span>
                <span style={s.leaderboardDetail}>{entry.correct}/{entry.total}</span>
              </div>
            ))
          }
        </div>
      )}

      {champion && bracket && (() => {
        const voteTotals = {};
        allMatches(bracket).forEach((m) => {
          const [c0, c1] = m.contenders;
          if (c0) voteTotals[c0] = (voteTotals[c0] || 0) + ((m.votes && m.votes[c0]) || 0);
          if (c1) voteTotals[c1] = (voteTotals[c1] || 0) + ((m.votes && m.votes[c1]) || 0);
        });
        const sorted = Object.entries(voteTotals)
          .sort((a, b) => b[1] - a[1]);
        const half = Math.ceil(sorted.length / 2);
        const col1 = sorted.slice(0, half);
        const col2 = sorted.slice(half);
        return (
          <div style={{ ...s.leaderboard, maxWidth: 680 }}>
            <div style={s.leaderboardTitle}>OPTIONS BY TOTAL VOTES</div>
            <div style={s.twoColGrid}>
              <div>
                {col1.map(([name, votes], i) => (
                  <div key={i} style={s.leaderboardRow}>
                    <span style={s.leaderboardRank}>{i + 1}.</span>
                    <span style={s.leaderboardName}>{name}</span>
                    <span style={s.leaderboardPct}>{votes}</span>
                  </div>
                ))}
              </div>
              <div>
                {col2.map(([name, votes], i) => (
                  <div key={i} style={s.leaderboardRow}>
                    <span style={s.leaderboardRank}>{half + i + 1}.</span>
                    <span style={s.leaderboardName}>{name}</span>
                    <span style={s.leaderboardPct}>{votes}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {(phase === "tiebreaker" || phase === "rps" || phase === "oneSecond") && (
        <TiebreakerPanel phase={phase} tiebreaker={tiebreaker} isHost={isHost}
          hostPickWinner={hostPickWinner} startRPS={startRPS} startOneSecond={startOneSecond}
          playerNames={playerNames} />
      )}

      {liveMatch && !champion && phase !== "tiebreaker" && phase !== "rps" && phase !== "oneSecond" && (
        <MatchStatus match={liveMatch} votedCount={votedCount} totalPlayers={totalPlayers} />
      )}

      {!currentMatch && !champion && (
        <div style={s.hint}>
          <button style={s.startBtn} onClick={startNext}>{"\u25B6"} START NEXT MATCH</button>
        </div>
      )}

      {liveMatch && !champion && (
        <div style={s.hint}>
          <button style={Object.assign({}, s.startBtn, { fontSize: 10, padding: "6px 16px", opacity: 0.4 })}
            onClick={skip}>
            SKIP / FORCE RESULT
          </button>
        </div>
      )}

      {/* Camera viewport */}
      <div
        style={{ ...s.viewport, background: "#060e06", userSelect: "none" }}
        ref={viewportRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={() => {
          if (cameraMode) {
            if (zoomed) zoomOut();
            else if (currentMatch && !champion) zoomIn();
          } else {
            snapFreeToFit();
          }
        }}
      >
        <div style={{
          width: "100%", height: "100%",
          transform: bumperSrc && !bumperFading ? "scale(0.85)" : "scale(1)",
          transition: bumperFading ? "transform 0.667s ease-out" : "none",
          transformOrigin: "50% 50%",
        }}>
          <div style={cameraMode ? cameraStyle : freeStyle}>
            <BracketSVG bracket={bracket} currentMatchId={currentMatch} zoomed={cameraMode && zoomed} />
          </div>
        </div>
      </div>

      {/* Round bumper overlay — also covers the bracket during the gap between game-start and bumper load */}
      {(bumperSrc || showBlackout) && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "#000",
          opacity: bumperFading ? 0 : 1,
          transition: bumperFading ? "opacity 0.667s linear" : "none",
          pointerEvents: bumperFading ? "none" : "all",
        }}>
          {bumperSrc && <video
            ref={bumperVideoRef}
            key={bumperSrc}
            src={bumperSrc}
            autoPlay
            playsInline
            muted={muted}
            onLoadedMetadata={(e) => { e.target.volume = 0.6 * musicVolume; }}
            style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
            onTimeUpdate={(e) => {
              const v = e.target;
              if (!v.duration || bumperFadingRef.current) return;
              if (v.duration - v.currentTime <= 8 / 12) {
                bumperFadingRef.current = true;
                setBumperFading(true);
              }
            }}
            onEnded={() => {
              if (!bumperFadingRef.current) {
                bumperFadingRef.current = true;
                setBumperFading(true);
              }
            }}
          />}
        </div>
      )}

      {/* Camera mode typing overlay */}
      {camTypeText && (
        <div style={{
          position: "fixed", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 50, pointerEvents: "none",
          background: "rgba(0,0,0,0.88)",
          border: "1px solid #1a2e1a",
          borderRadius: 3,
          padding: "14px 24px",
        }}>
          <style>{`
            @keyframes cursor-blink {
              0%, 49% { opacity: 1; }
              50%, 100% { opacity: 0; }
            }
            .typing-cursor { animation: cursor-blink 0.7s step-end infinite; }
          `}</style>
          <div style={{
            fontFamily: "'PT Mono', monospace",
            fontSize: 18, color: "#c8f55a",
            letterSpacing: 3,
            textShadow: "0 0 20px #c8f55a88",
            whiteSpace: "nowrap",
          }}>
            {camTypeText}<span className="typing-cursor">|</span>
          </div>
        </div>
      )}

      {/* Settings overlay */}
      {showSettings && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setShowSettings(false)}
        >
          <style>{`
            .s-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 4px;
              background: #1a2e1a; outline: none; border-radius: 2px; cursor: pointer; }
            .s-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px;
              background: #c8f55a; border-radius: 2px; cursor: pointer; }
            .s-slider::-moz-range-thumb { width: 16px; height: 16px; background: #c8f55a;
              border-radius: 2px; border: none; cursor: pointer; }
          `}</style>
          <div
            style={{
              background: "rgba(6,14,6,0.95)", border: "1px solid #1a2e1a", borderRadius: 3,
              padding: "42px 48px", minWidth: 480, display: "flex", flexDirection: "column", gap: 24,
              animation: "settings-open 0.18s ease-out both",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "'PT Mono',monospace", fontSize: 12, letterSpacing: 4, color: "#c8f55a" }}>
                ⚙ SETTINGS
              </span>
              <button
                style={{ background: "none", border: "none", color: "#c8f55a", cursor: "pointer", fontSize: 16, fontFamily: "'PT Mono',monospace" }}
                onClick={() => setShowSettings(false)}
              >✕</button>
            </div>

            {/* Music Volume */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "'PT Mono',monospace", fontSize: 10, letterSpacing: 3, color: "#2a4a2a" }}>MUSIC</span>
                <span style={{ fontFamily: "'PT Mono',monospace", fontSize: 10, letterSpacing: 2, color: "#c8f55a" }}>
                  {Math.round(musicVolume * 100)}%
                </span>
              </div>
              <input
                type="range" className="s-slider"
                min={0} max={1} step={0.01}
                value={musicVolume}
                onChange={e => setMusicVolume(Number(e.target.value))}
              />
            </div>

            {/* SFX Volume */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "'PT Mono',monospace", fontSize: 10, letterSpacing: 3, color: "#2a4a2a" }}>SFX</span>
                <span style={{ fontFamily: "'PT Mono',monospace", fontSize: 10, letterSpacing: 2, color: "#c8f55a" }}>
                  {Math.round(sfxVolume * 100)}%
                </span>
              </div>
              <input
                type="range" className="s-slider"
                min={0} max={1} step={0.01}
                value={sfxVolume}
                onChange={e => setSfxVolume(Number(e.target.value))}
              />
            </div>

            {/* Tiebreaker toggle */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ fontFamily: "'PT Mono',monospace", fontSize: 10, letterSpacing: 3, color: "#2a4a2a" }}>TIEBREAKER</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  style={{
                    flex: 1, padding: "10px 0", fontFamily: "'PT Mono',monospace", fontSize: 10,
                    letterSpacing: 2, cursor: "pointer", borderRadius: 3,
                    background: !randomTiebreaker ? "#0f1f0f" : "#0a140a",
                    color: !randomTiebreaker ? "#c8f55a" : "#2a5a2a",
                    border: !randomTiebreaker ? "2px solid #c8f55a" : "1px solid #1a2e1a",
                  }}
                  onClick={() => setRandomTiebreaker(false)}
                >
                  HOST DECIDES
                </button>
                <button
                  style={{
                    flex: 1, padding: "10px 0", fontFamily: "'PT Mono',monospace", fontSize: 10,
                    letterSpacing: 2, cursor: "pointer", borderRadius: 3,
                    background: randomTiebreaker ? "#0f1f0f" : "#0a140a",
                    color: randomTiebreaker ? "#c8f55a" : "#2a5a2a",
                    border: randomTiebreaker ? "2px solid #c8f55a" : "1px solid #1a2e1a",
                  }}
                  onClick={() => setRandomTiebreaker(true)}
                >
                  RANDOM
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  root: {
    height: "100vh",
    background: "#060e06",
    color: "#c8f55a",
    fontFamily: "'PT Mono', monospace",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "16px 0 0",
    boxSizing: "border-box",
    overflow: "hidden",
    position: "relative",
  },
  // Lobby
  lobbyWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    gap: 24,
    width: "100%",
    maxWidth: 800,
  },
  lobbyContentWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    maxWidth: 800,
    flex: 1,
    position: "relative",
    zIndex: 1,
    paddingBottom: 32,
  },
  titleVideo: {
    position: "absolute",
    top: "calc(50% - 40px)",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "auto",
    height: "93.6vh",
    objectFit: "contain",
    zIndex: 0,
    pointerEvents: "none",
  },
  lobbyTitle: {
    fontSize: 48,
    fontWeight: "bold",
    letterSpacing: 16,
    textShadow: "0 0 30px #c8f55a44",
  },
  lobbySubtitle: {
    fontSize: 12,
    color: "#2a4a2a",
    letterSpacing: 4,
    marginTop: -12,
  },
  categoryGrid: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
    width: "100%",
    marginTop: 12,
  },
  categoryCard: {
    width: 200,
    padding: "28px 16px",
    background: "#0a160a",
    border: "1px solid #1a2e1a",
    borderRadius: 6,
    textAlign: "center",
    transition: "all 0.4s",
  },
  categoryCardActive: {
    border: "2px solid #c8f55a",
    boxShadow: "0 0 24px #c8f55a33, inset 0 0 20px #c8f55a11",
    background: "#0f1f0f",
  },
  categoryCardName: {
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 4,
  },
  lobbyInfo: {
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    position: "absolute",
    top: "66%",
    left: "50%",
    transform: "translateX(-50%)",
  },
  lobbyPlayers: {
    fontSize: 18,
    letterSpacing: 4,
  },
  lobbyUrl: {
    fontSize: 12,
    color: "#2a4a2a",
    letterSpacing: 2,
  },
  lobbyStatus: {
    fontSize: 12,
    color: "#6a8a6a",
    letterSpacing: 2,
  },
  clearBtn: {
    marginTop: 16,
    padding: "8px 20px",
    fontSize: 11,
    letterSpacing: 3,
    fontFamily: "'PT Mono', monospace",
    background: "#060e06",
    color: "#bb6666",
    border: "1px solid #bb6666",
    borderRadius: 3,
    cursor: "pointer",
  },
  clearBtnSmall: {
    padding: "0 12px",
    fontSize: 11,
    letterSpacing: 2,
    fontFamily: "'PT Mono', monospace",
    background: "#060e06",
    color: "#cc4444",
    border: "1px solid #cc4444",
    borderRadius: 3,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    height: 35,
  },
  // Header
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
    borderBottom: "1px solid #1a2e1a",
    padding: "0 20px 12px",
    width: "100%",
    maxWidth: 1700,
    boxSizing: "border-box",
  },
  title:    { fontSize: 26, fontWeight: "bold", letterSpacing: 8, textShadow: "0 0 20px #c8f55a44" },
  subtitle: { fontSize: 10, color: "#2a4a2a", letterSpacing: 3, flex: 1 },
  voteUrl: { fontSize: 10, color: "#2a4a2a", letterSpacing: 1, marginRight: 8 },
  statusContender: {
    flex: 1, padding: "5px 10px",
    background: "#0f1f0f", border: "1px solid #1a2e1a", color: "#c8f55a",
    fontFamily: "'PT Mono', monospace", letterSpacing: 1,
    display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
    minHeight: 36, justifyContent: "center",
  },
  exitBtn: {
    background: "#060e06", border: "1px solid #cc4444",
    padding: 0, cursor: "pointer", transition: "all 0.2s", marginLeft: "auto",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 42, height: 35, borderRadius: 3,
    color: "#cc4444",
  },
  champion: {
    fontSize: 20, letterSpacing: 4,
    padding: "10px 28px", border: "1px solid #c8f55a", boxShadow: "0 0 40px #c8f55a22",
  },
  championRow: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginBottom: 14,
  },
  playAgainBtn: {
    background: "#0f1f0f",
    border: "1px solid #c8f55a",
    color: "#c8f55a",
    padding: "10px 24px",
    cursor: "pointer",
    fontFamily: "'PT Mono', monospace",
    fontSize: 14,
    letterSpacing: 3,
    fontWeight: "bold",
    boxShadow: "0 0 16px #c8f55a22",
    transition: "all 0.2s",
    borderRadius: 3,
  },
  hint: { marginBottom: 4 },
  startBtn: {
    background: "#0f1f0f", border: "1px solid #c8f55a", color: "#c8f55a",
    padding: "8px 28px", cursor: "pointer", fontFamily: "'PT Mono', monospace",
    fontSize: 12, letterSpacing: 3, borderRadius: 3,
  },
  panel: {
    width: "100%", maxWidth: 680, marginBottom: 6,
    border: "1px solid #1a2e1a", background: "#080f08", overflow: "hidden",
  },
  panelInner: { padding: "6px 12px 8px" },
  matchTag: { fontSize: 9, letterSpacing: 4, color: "#2a4a2a", marginBottom: 4, textAlign: "center" },
  vsRow: { display: "flex", alignItems: "center", gap: 10 },
  vsCenter: { display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flexShrink: 0, width: 64 },
  vsWord: { fontSize: 12, fontWeight: "bold", color: "#1e3e1e", letterSpacing: 2 },
  voteCount: { fontSize: 16, color: "#c8f55a", textAlign: "center", lineHeight: 1.2 },
  voteBarTrack: { marginTop: 4, height: 3, background: "#0f1f0f", borderRadius: 3, overflow: "hidden" },
  voteBarFill: { height: "100%", background: "#c8f55a", transition: "width 0.4s ease", boxShadow: "0 0 6px #c8f55a" },
  viewport: {
    width: "100%", flex: 1, overflow: "hidden", position: "relative", minHeight: 300,
  },
  // Player list
  playerListBox: {
    position: "absolute", top: 64, left: 16, background: "#080f08ee",
    border: "1px solid #1a2e1a", padding: "8px 14px", borderRadius: 3,
    zIndex: 10, minWidth: 90,
  },
  playerListTitle: {
    fontSize: 9, letterSpacing: 3, color: "#2a4a2a", marginBottom: 6,
  },
  playerListItem: {
    fontSize: 12, letterSpacing: 2, color: "#c8f55a", padding: "2px 0",
  },
  // Lobby names
  lobbyNamesList: {
    display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center",
  },
  lobbyNameTag: {
    fontSize: 12, letterSpacing: 2, color: "#c8f55a", background: "#0f1f0f",
    border: "1px solid #1a2e1a", padding: "4px 10px", borderRadius: 3,
  },
  // Leaderboard
  leaderboard: {
    width: "100%", maxWidth: 480, marginBottom: 12,
    border: "1px solid #1a2e1a", background: "#080f08", padding: "12px 16px",
  },
  leaderboardTitle: {
    fontSize: 10, letterSpacing: 4, color: "#2a4a2a", marginBottom: 10,
    textAlign: "center",
  },
  leaderboardRow: {
    display: "flex", alignItems: "center", gap: 10, padding: "4px 0",
    borderBottom: "1px solid #0f1f0f",
  },
  leaderboardRank: {
    fontSize: 12, color: "#2a4a2a", width: 20, textAlign: "right",
  },
  leaderboardName: {
    fontSize: 14, letterSpacing: 3, color: "#c8f55a", flex: 1,
  },
  leaderboardPct: {
    fontSize: 16, fontWeight: "bold", color: "#c8f55a", letterSpacing: 2,
  },
  leaderboardDetail: {
    fontSize: 10, color: "#2a4a2a", letterSpacing: 1, width: 40, textAlign: "right",
  },
  twoColGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px",
  },
  rpsPlayerNames: {
    textAlign: "center", fontSize: 16, letterSpacing: 4, fontWeight: "bold",
    color: "#c8f55a", marginBottom: 10,
  },
  muteBtn: {
    position: "absolute", top: 16, right: 20, zIndex: 10,
    background: "transparent", border: "1px solid #1a2e1a", borderRadius: 3,
    padding: "6px 10px", fontSize: 20, cursor: "pointer",
    color: "#c8f55a", lineHeight: 1,
  },
  muteHeaderBtn: {
    background: "transparent", border: "1px solid #1a2e1a",
    padding: "4px 10px", fontSize: 16, cursor: "pointer",
    color: "#c8f55a", lineHeight: 1, borderRadius: 3,
    fontFamily: "'PT Mono', monospace",
  },
  cameraBtn: {
    background: "#060e06", border: "1px solid #c8f55a",
    padding: "0 13px", cursor: "pointer", gap: 8,
    display: "inline-flex", alignItems: "center", height: 35, borderRadius: 3,
  },
  settingsBtn: {
    background: "#0f1f0f", border: "1px solid #c8f55a", color: "#c8f55a",
    padding: 0, cursor: "pointer",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 42, height: 35, borderRadius: 3,
  },
};
