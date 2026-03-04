import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRive, Layout, Fit, Alignment } from "@rive-app/react-webgl2";
import bracketBotMainRiv     from "./assets/rive/bracketbot_main.riv";
import bracketBotMapRiv      from "./assets/rive/bracketbot_map.riv";
import bracketBotVerticalRiv from "./assets/rive/bracketbot_vertical.riv";
import { allMatches } from "./bracketLogic.js";
import { useGameState } from "./useGameState.js";
import { PLAYER_COLORS } from "./categories.js";
import { RockIcon, RpsIcon, ReactionIcon } from "./RpsIcons.jsx";
import { QRCodeSVG } from "qrcode.react";

// Audio & video assets
import menuSongSrc from "./assets/audio/Music/Menu_SongLoop.wav";
import gameSongSrc from "./assets/audio/Music/Game_Song.wav";
import endSongSrc from "./assets/audio/Music/End_Song.wav";
import rpsBeatSrc from "./assets/audio/Music/RPS-Beat.wav";
import oneSecondMusicSrc from "./assets/audio/Music/OneSecond_Music_01.wav";
import startSfxSrc from "./assets/audio/SFX/Start.wav";
import startAgainSrc from "./assets/audio/SFX/StartAgain.wav";
import playerAddSrc from "./assets/audio/SFX/PlayerAdd.wav";
import resetPlayersSrc from "./assets/audio/SFX/ResetPlayers.wav";
import choiceMadeSrc from "./assets/audio/SFX/ChoiceMade.wav";
import zoomInSrc from "./assets/audio/SFX/ZoomIn.wav";
import rockSfxSrc from "./assets/audio/SFX/Rock.wav";
import paperSfxSrc from "./assets/audio/SFX/Paper.wav";
import scissorsSfxSrc from "./assets/audio/SFX/Scissors.wav";
import titleVideoSrc from "./assets/footage/finalCards/Brackets_Title_Comp_V3.mp4";
import bumperRound01Src  from "./assets/footage/finalCards/Brackets_Round01_Comp_V1.mp4";
import bumperRound02Src  from "./assets/footage/finalCards/Brackets_Round02_Comp_V1.mp4";
import bumperRound03Src  from "./assets/footage/finalCards/Brackets_Round03_Comp_V1.mp4";
import bumperQFSrc       from "./assets/footage/finalCards/Brackets_Quarterfinals_Comp_V1.mp4";
import bumperSFSrc       from "./assets/footage/finalCards/Brackets_Semifinals_Comp_V1.mp4";
import bumperFinalSrc    from "./assets/footage/finalCards/Brackets_FinalRound_Comp_V1.mp4";
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

function IconTrophy({ color = "#c8f55a", size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ display: "block", flexShrink: 0 }}>
      <path d="M19 5h-2V3H7v2H5C3.9 5 3 5.9 3 7v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V18H8v2h8v-2h-3v-2.1a5.01 5.01 0 0 0 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.86 10.4 5 9.3 5 8zm14 0c0 1.3-.86 2.4-2 2.82V7h2v1z"/>
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
  const fg       = isWinner ? "#060e06" : isLoser ? "#7a9a7a" : isEmpty ? "#1a2a1a" : "#c8f55a";
  const stroke   = !isEmpty && (isWinner || isActive) ? "#c8f55a" : "#1a2e1a";
  const text     = isEmpty ? "" : (label.length > 15 ? label.slice(0, 14) + "\u2026" : label);
  const opacity  = dimmed && !isEmpty ? 0.25 : 1;

  return (
    <g opacity={opacity} style={{ transition: "opacity 0.5s" }}>
      <rect
        x={x} y={y} width={SLOT_W} height={SLOT_H} rx={3}
        fill={bg} stroke={stroke} strokeWidth={!isEmpty && (isActive || isWinner) ? 1.5 : 1}
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
          fill={isWinner ? "#060e0699" : "#7a9a7a"} fontSize={10}
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
      const color = ready ? "#c8f55a" : "#304830";
      const sw    = 2;
      if (side === "left") {
        const ex = xFn(r - 1) + SLOT_W + 18;
        lines.push(
          <g key={"L" + r + "-" + mIdx}>
            <path d={`M ${xFn(r-1)+SLOT_W} ${topCY} H ${ex} V ${botCY} H ${xFn(r-1)+SLOT_W}`} stroke={color} strokeWidth={sw} fill="none" strokeLinejoin="miter"/>
            <line x1={ex} y1={midY} x2={xFn(r)} y2={midY} stroke={color} strokeWidth={sw}/>
          </g>
        );
      } else {
        const ex = xFn(r - 1) - 18;
        lines.push(
          <g key={"R" + r + "-" + mIdx}>
            <path d={`M ${xFn(r-1)} ${topCY} H ${ex} V ${botCY} H ${xFn(r-1)}`} stroke={color} strokeWidth={sw} fill="none" strokeLinejoin="miter"/>
            <line x1={ex} y1={midY} x2={xFn(r)+SLOT_W} y2={midY} stroke={color} strokeWidth={sw}/>
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
  const lc    = lWon ? "#c8f55a" : "#304830";
  const rc    = rWon ? "#c8f55a" : "#304830";
  return (
    <>
      <path d={`M ${leftX(lR)+SLOT_W} ${lCY} H ${lEx} V ${finCY-SLOT_H-SLOT_GAP/2} H ${finX}`}               stroke={lc} strokeWidth={2} fill="none" strokeLinejoin="miter"/>
      <path d={`M ${rightX(rR)} ${rCY} H ${rEx} V ${finCY+SLOT_GAP/2+SLOT_H} H ${finX+SLOT_W}`}              stroke={rc} strokeWidth={2} fill="none" strokeLinejoin="miter"/>
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
          <text x={leftX(i)  + SLOT_W/2} y={PAD_TOP-8} fill="#c8f55a" fillOpacity={0.5} fontSize={13} fontWeight="bold" textAnchor="middle" fontFamily="'PT Mono', monospace" letterSpacing={3}>{lbl}</text>
          <text x={rightX(i) + SLOT_W/2} y={PAD_TOP-8} fill="#c8f55a" fillOpacity={0.5} fontSize={13} fontWeight="bold" textAnchor="middle" fontFamily="'PT Mono', monospace" letterSpacing={3}>{lbl}</text>
        </g>
      ))}
      <text x={centerX} y={PAD_TOP-8} fill="#c8f55a" fillOpacity={0.5} fontSize={13} fontWeight="bold" textAnchor="middle" fontFamily="'PT Mono', monospace" letterSpacing={3}>FINAL</text>

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── Confetti ─────────────────────────────────────────────────────────────────
function Confetti({ active }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const colors = [...PLAYER_COLORS, "#ffffff"];
    const particles = Array.from({ length: 200 }, () => ({
      x:    Math.random() * canvas.width,
      y:    -20 - Math.random() * canvas.height * 0.4,
      vx:   (Math.random() - 0.5) * 6,
      vy:   Math.random() * 4 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      w:    Math.random() * 12 + 4,
      h:    Math.random() * 6 + 3,
      rot:  Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.18,
    }));
    let animId;
    let stopped = false;
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let allGone = true;
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        p.vy += 0.07; p.vx *= 0.999;
        p.rot += p.rotV;
        if (p.y < canvas.height + 40) allGone = false;
        const fade = Math.min(1, Math.max(0, 1 - (p.y / canvas.height) * 0.6));
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (!allGone && !stopped) animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => { stopped = true; cancelAnimationFrame(animId); };
  }, [active]);
  if (!active) return null;
  return (
    <canvas ref={canvasRef} style={{
      position: "fixed", inset: 0, zIndex: 195, pointerEvents: "none",
      width: "100%", height: "100%",
    }} />
  );
}

// ─── Match status panel ──────────────────────────────────────────────────────
function MatchStatus({ match, votedCount, totalPlayers, voters, playerNames, playerColors, matchNote, setMatchNote, isHost }) {
  const [c0, c1] = match.contenders;
  const v0    = (c0 && match.votes[c0]) || 0;
  const v1    = (c1 && match.votes[c1]) || 0;
  const total = v0 + v1;
  const [noteInput, setNoteInput] = useState(matchNote || "");
  const voterPids   = Object.keys(voters || {});
  const playerPids  = Object.keys(playerNames || {});

  // Reset input when match changes
  useEffect(() => { setNoteInput(matchNote || ""); }, [match.id]); // eslint-disable-line

  return (
    <div style={s.panel}>
      <div style={s.panelInner}>
        <div style={s.matchTag}>NOW VOTING</div>
        <div style={s.vsRow}>
          {/* Left contender */}
          <div style={{ ...s.statusContender, background: v0 > v1 && total > 0 ? "#0c1d0c" : "#0f1f0f" }}>
            <span style={{ fontSize: 13, letterSpacing: 2 }}>{c0}</span>
            {v0 > 0 && <span style={{ fontSize: 20, fontWeight: "bold", color: "#c8f55a", lineHeight: 1 }}>{v0}</span>}
          </div>
          {/* Center */}
          <div style={s.vsCenter}>
            <div style={s.vsWord}>VS</div>
            <div style={s.voteCount}>
              {votedCount}<span style={{ color: "#6a8a6a" }}>/{totalPlayers}</span>
              <div style={{ fontSize: 9, color: "#6a8a6a", letterSpacing: 2 }}>VOTED</div>
            </div>
          </div>
          {/* Right contender */}
          <div style={{ ...s.statusContender, background: v1 > v0 && total > 0 ? "#0c1d0c" : "#0f1f0f" }}>
            <span style={{ fontSize: 13, letterSpacing: 2 }}>{c1}</span>
            {v1 > 0 && <span style={{ fontSize: 20, fontWeight: "bold", color: "#c8f55a", lineHeight: 1 }}>{v1}</span>}
          </div>
        </div>

        {/* Vote split bar */}
        {total > 0 && (
          <div style={s.voteBarTrack}>
            <div style={{ ...s.voteBarFill, width: (v0/total)*100 + "%" }} />
          </div>
        )}

        {/* Player vote dots — glow in their color when they've voted */}
        {playerPids.length > 0 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 7, marginTop: 7, flexWrap: "wrap" }}>
            {playerPids.map(pid => {
              const colorIdx = playerColors?.[pid] ?? 0;
              const color    = PLAYER_COLORS[colorIdx % PLAYER_COLORS.length];
              const hasVoted = voterPids.includes(pid);
              return (
                <div key={pid} title={playerNames[pid]} style={{
                  width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                  background:  hasVoted ? color : "transparent",
                  border:      `2px solid ${hasVoted ? color : "#1a2e1a"}`,
                  boxShadow:   hasVoted ? `0 0 8px ${color}99` : "none",
                  transition:  "background 0.25s, border-color 0.25s, box-shadow 0.25s",
                  animation:   hasVoted ? "voteDotIn 0.25s cubic-bezier(0.22,1,0.36,1) both" : "none",
                }} />
              );
            })}
          </div>
        )}

        {/* Commentary display */}
        {matchNote && (
          <div style={{
            textAlign: "center", fontSize: 13, letterSpacing: 2, color: "#c8f55a",
            padding: "5px 8px 2px", borderTop: "1px solid #0f1f0f", marginTop: 5,
          }}>{matchNote}</div>
        )}

        {/* Commentary input — host only */}
        {isHost && (
          <input
            style={{
              width: "100%", boxSizing: "border-box", display: "block",
              background: "#080f08", border: "none", borderTop: "1px solid #0d180d",
              color: "#7a9a7a", fontFamily: "'PT Mono',monospace", fontSize: 10,
              letterSpacing: 2, padding: "5px 8px", outline: "none", marginTop: 4,
            }}
            placeholder="add commentary… (enter to save)"
            maxLength={60}
            value={noteInput}
            onChange={e => setNoteInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") setMatchNote(noteInput || null); }}
            onBlur={() => setMatchNote(noteInput || null)}
          />
        )}
      </div>
    </div>
  );
}

// ─── Main app ────────────────────────────────────────────────────────────────
// ─── One Second — big fullscreen panel (replaces bracket map) ────────────────
function BigOneSecondPanel({ tiebreaker, playerNames, playerColors, preMatch }) {
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
  const c0Color = PLAYER_COLORS[(playerColors?.[os.player1] ?? 0) % PLAYER_COLORS.length];
  const c1Color = PLAYER_COLORS[(playerColors?.[os.player2] ?? 0) % PLAYER_COLORS.length];
  const isRunning = os.osPhase === "running_p1" || os.osPhase === "running_p2";

  let statusText = "";
  if (os.osPhase === "waiting_p1") statusText = `${p1Name} getting ready\u2026`;
  else if (os.osPhase === "running_p1") statusText = `${p1Name} is timing!`;
  else if (os.osPhase === "done_p1") statusText = `${p1Name}: ${fmtMs(os.elapsed1)}s \u00B7 ${p2Name} up next\u2026`;
  else if (os.osPhase === "waiting_p2") statusText = `${p2Name} getting ready\u2026`;
  else if (os.osPhase === "running_p2") statusText = `${p2Name} is timing!`;
  else if (os.osPhase === "done") {
    if (preMatch) {
      const winnerName = os.winner === "p1" ? p1Name : p2Name;
      statusText = `${winnerName} VOTES DOUBLE!`;
    } else {
      const w = os.winner === "p1" ? tiebreaker.c0 : tiebreaker.c1;
      statusText = `${w} WINS!`;
    }
  }

  const catBox = {
    flex: 1, maxWidth: 260, padding: "18px 24px",
    background: "#0f1f0f", border: "1px solid #1a2e1a",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
    fontFamily: "'PT Mono', monospace",
  };

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 28, padding: "24px 48px",
      position: "relative", overflow: "hidden",
    }}>
      {/* Header */}
      {preMatch && (
        <div style={{ fontSize: 11, letterSpacing: 6, color: "#c8f55a", background: "#0a1f0a",
          border: "1px solid #c8f55a", borderRadius: 20, padding: "4px 16px" }}>
          ⚡ PRE-MATCH CHALLENGE
        </div>
      )}
      <div style={{ fontSize: 30, fontWeight: "bold", letterSpacing: 8, color: "#c8f55a",
        textAlign: "center", textShadow: "0 0 20px #c8f55a44" }}>
        ONE SECOND CHALLENGE
      </div>

      {/* Player names */}
      <div style={{ fontSize: 22, letterSpacing: 4, fontWeight: "bold", textAlign: "center" }}>
        <span style={{ color: c0Color }}>{p1Name}</span>&nbsp;&nbsp;<span style={{ color: "#1e3e1e" }}>vs</span>&nbsp;&nbsp;<span style={{ color: c1Color }}>{p2Name}</span>
      </div>

      {/* Category boxes */}
      <div style={{ display: "flex", gap: 32, width: "100%", maxWidth: 640, justifyContent: "center" }}>
        <div style={{
          ...catBox,
          border: `1px solid ${os.winner === "p1" ? c0Color : "#1a2e1a"}`,
          boxShadow: os.winner === "p1" ? `0 0 32px ${c0Color}44` : "none",
        }}>
          <div style={{ fontSize: 13, letterSpacing: 2, color: c0Color, textAlign: "center" }}>{tiebreaker.c0}</div>
          {os.elapsed1 != null && (
            <div style={{ fontSize: 34, fontWeight: "bold", color: os.winner === "p1" ? "#c8f55a" : "#7a9a7a",
              fontVariantNumeric: "tabular-nums" }}>
              {fmtMs(os.elapsed1)}s
            </div>
          )}
          {os.elapsed1 != null && (
            <div style={{ fontSize: 11, color: "#6a8a6a", letterSpacing: 1 }}>
              {fmtMs(Math.abs(os.elapsed1 - 1000))}s from 1s
            </div>
          )}
        </div>
        <div style={{
          ...catBox,
          border: `1px solid ${os.winner === "p2" ? c1Color : "#1a2e1a"}`,
          boxShadow: os.winner === "p2" ? `0 0 32px ${c1Color}44` : "none",
        }}>
          <div style={{ fontSize: 13, letterSpacing: 2, color: c1Color, textAlign: "center" }}>{tiebreaker.c1}</div>
          {os.elapsed2 != null && (
            <div style={{ fontSize: 34, fontWeight: "bold", color: os.winner === "p2" ? "#c8f55a" : "#7a9a7a",
              fontVariantNumeric: "tabular-nums" }}>
              {fmtMs(os.elapsed2)}s
            </div>
          )}
          {os.elapsed2 != null && (
            <div style={{ fontSize: 11, color: "#6a8a6a", letterSpacing: 1 }}>
              {fmtMs(Math.abs(os.elapsed2 - 1000))}s from 1s
            </div>
          )}
        </div>
      </div>

      {/* Big live timer */}
      <div style={{ minHeight: 110, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
        {isRunning && (
          <>
            <div style={{ fontSize: 11, letterSpacing: 5, color: "#6a8a6a" }}>\u23F1 TIMING</div>
            <div style={{
              fontSize: 96, fontWeight: "bold", color: "#c8f55a",
              fontFamily: "'PT Mono', monospace", letterSpacing: 4,
              textShadow: "0 0 60px #c8f55a66, 0 0 120px #c8f55a22",
              fontVariantNumeric: "tabular-nums", lineHeight: 1,
            }}>
              {fmtMs(displayMs)}
            </div>
          </>
        )}
      </div>

      {/* Status */}
      <div style={{
        fontSize: os.osPhase === "done" ? 22 : 15, letterSpacing: 3,
        color: os.osPhase === "done" ? "#c8f55a" : "#6a8a6a",
        textAlign: "center", minHeight: 28,
        textShadow: os.osPhase === "done" ? "0 0 24px #c8f55a66" : "none",
      }}>
        {statusText}
      </div>
    </div>
  );
}

// ─── RPS — big fullscreen panel with shoot animation ─────────────────────────
function BigRpsPanel({ tiebreaker, playerNames, playerColors, onWinnerRevealed, onDrawRevealed, preMatch }) {
  const rps = tiebreaker.rps;
  const [animPhase, setAnimPhase] = useState("waiting"); // "waiting"|"bouncing"|"revealed"|"winner"
  const revealedRef = useRef(false);
  const roundKeyRef = useRef(null);
  const drawRevealedRef = useRef(false);

  const name1 = (playerNames && playerNames[rps.player1]) || "Player 1";
  const name2 = (playerNames && playerNames[rps.player2]) || "Player 2";
  const c0Color = PLAYER_COLORS[(playerColors?.[rps.player1] ?? 0) % PLAYER_COLORS.length];
  const c1Color = PLAYER_COLORS[(playerColors?.[rps.player2] ?? 0) % PLAYER_COLORS.length];
  const bothChose = !!(rps.choice1 && rps.choice2);
  const isWin = !!(rps.result && rps.result !== "draw");
  const roundKey = `${rps.round}-${rps.choice1}-${rps.choice2}`;

  const isDraw = rps.result === "draw";

  // Call onDrawRevealed when the bounce animation finishes showing a draw
  useEffect(() => {
    if (animPhase !== "revealed" || !isDraw || drawRevealedRef.current) return;
    drawRevealedRef.current = true;
    onDrawRevealed?.();
  }, [animPhase, isDraw]); // eslint-disable-line

  // Start bounce when both choices arrive for this round
  useEffect(() => {
    if (!bothChose) {
      setAnimPhase("waiting");
      revealedRef.current = false;
      drawRevealedRef.current = false;
      roundKeyRef.current = null;
      return;
    }
    if (roundKeyRef.current === roundKey) return; // already handled this round
    roundKeyRef.current = roundKey;
    setAnimPhase("bouncing");
    revealedRef.current = false;
    const t = setTimeout(() => {
      setAnimPhase("revealed");
      revealedRef.current = true;
    }, 1350); // 3 bounces × 0.42s = 1.26s, slight buffer
    return () => clearTimeout(t);
  }, [bothChose, roundKey]); // eslint-disable-line

  // Transition to winner once revealed and result is set
  useEffect(() => {
    if (animPhase !== "revealed" || !isWin) return;
    const t = setTimeout(() => {
      setAnimPhase("winner");
      onWinnerRevealed?.(rps.result === "p1" ? rps.choice1 : rps.choice2);
    }, 450);
    return () => clearTimeout(t);
  }, [animPhase, isWin]); // eslint-disable-line

  // If result arrives after reveal already happened
  useEffect(() => {
    if (!isWin || !revealedRef.current || animPhase === "winner") return;
    const t = setTimeout(() => {
      setAnimPhase("winner");
      onWinnerRevealed?.(rps.result === "p1" ? rps.choice1 : rps.choice2);
    }, 300);
    return () => clearTimeout(t);
  }, [isWin]); // eslint-disable-line

  const winner = rps.result;
  const revealed = animPhase === "winner";
  const p1Winner = revealed && winner === "p1";
  const p1Loser  = revealed && winner === "p2";
  const p2Winner = revealed && winner === "p2";
  const p2Loser  = revealed && winner === "p1";

  // Icons: show rock during bounce/waiting, reveal actual choice after
  const p1Icon = (animPhase === "bouncing" || animPhase === "waiting") ? "rock" : (rps.choice1 || "rock");
  const p2Icon = (animPhase === "bouncing" || animPhase === "waiting") ? "rock" : (rps.choice2 || "rock");

  // Positions during winner phase
  const p1Left  = (animPhase === "winner" && p1Winner) ? "50%" : "25%";
  const p2Left  = (animPhase === "winner" && p2Winner) ? "50%" : "75%";
  const p1Scale = animPhase === "winner" ? (p1Winner ? 1.6 : p1Loser ? 0 : 1) : 1;
  const p2Scale = animPhase === "winner" ? (p2Winner ? 1.6 : p2Loser ? 0 : 1) : 1;
  const p1Opac  = (animPhase === "winner" && p1Loser) ? 0 : 1;
  const p2Opac  = (animPhase === "winner" && p2Loser) ? 0 : 1;
  const winTx   = "all 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275)";

  let statusText = "Waiting for choices\u2026";
  if (animPhase === "bouncing") statusText = "ROCK\u2026 PAPER\u2026 SCISSORS\u2026 SHOOT!";
  else if (rps.result === "draw") statusText = "DRAW \u2014 going again\u2026";
  else if (rps.result === "p1") statusText = preMatch ? name1 + " VOTES DOUBLE!" : tiebreaker.c0 + " WINS!";
  else if (rps.result === "p2") statusText = preMatch ? name2 + " VOTES DOUBLE!" : tiebreaker.c1 + " WINS!";
  else if (rps.choice1 && !rps.choice2) statusText = name1 + " is ready\u2026";
  else if (!rps.choice1 && rps.choice2) statusText = name2 + " is ready\u2026";

  const catBox = {
    flex: 1, maxWidth: 220, padding: "14px 20px",
    background: "#0f1f0f",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
    fontFamily: "'PT Mono', monospace",
  };

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 22, padding: "20px 48px",
      position: "relative", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        {preMatch && (
          <div style={{ fontSize: 11, letterSpacing: 6, color: "#c8f55a", background: "#0a1f0a",
            border: "1px solid #c8f55a", borderRadius: 20, padding: "4px 16px", marginBottom: 2 }}>
            ⚡ PRE-MATCH CHALLENGE
          </div>
        )}
        <div style={{ fontSize: 30, fontWeight: "bold", letterSpacing: 8, color: "#c8f55a",
          textAlign: "center", textShadow: "0 0 20px #c8f55a44" }}>
          ROCK PAPER SCISSORS
        </div>
        <div style={{ fontSize: 10, letterSpacing: 4, color: "#6a8a6a" }}>ROUND {rps.round}</div>
      </div>

      {/* Player names */}
      <div style={{ fontSize: 22, letterSpacing: 4, fontWeight: "bold", textAlign: "center" }}>
        <span style={{ color: c0Color }}>{name1}</span>&nbsp;&nbsp;<span style={{ color: "#1e3e1e" }}>vs</span>&nbsp;&nbsp;<span style={{ color: c1Color }}>{name2}</span>
      </div>

      {/* Category boxes */}
      <div style={{ display: "flex", gap: 32, width: "100%", maxWidth: 560, justifyContent: "center" }}>
        <div style={{
          ...catBox,
          border: `1px solid ${p1Winner ? c0Color : "#1a2e1a"}`,
          boxShadow: p1Winner ? `0 0 32px ${c0Color}44` : "none",
        }}>
          <div style={{ fontSize: 12, letterSpacing: 2, color: c0Color, textAlign: "center" }}>{tiebreaker.c0}</div>
          {p1Winner && rps.choice1 && (
            <div style={{ fontSize: 11, letterSpacing: 2, color: c0Color }}>{rps.choice1.toUpperCase()}</div>
          )}
        </div>
        <div style={{
          ...catBox,
          border: `1px solid ${p2Winner ? c1Color : "#1a2e1a"}`,
          boxShadow: p2Winner ? `0 0 32px ${c1Color}44` : "none",
        }}>
          <div style={{ fontSize: 12, letterSpacing: 2, color: c1Color, textAlign: "center" }}>{tiebreaker.c1}</div>
          {p2Winner && rps.choice2 && (
            <div style={{ fontSize: 11, letterSpacing: 2, color: c1Color }}>{rps.choice2.toUpperCase()}</div>
          )}
        </div>
      </div>

      {/* Icon zone — position:relative so icons can be absolutely placed */}
      <div style={{ position: "relative", width: "100%", maxWidth: 720, height: 220 }}>
        {/* p1 icon */}
        <div style={{
          position: "absolute", left: p1Left, top: "50%",
          transform: `translate(-50%, -50%) scale(${p1Scale})`,
          opacity: p1Opac,
          transition: animPhase === "winner" ? winTx : "none",
          zIndex: p1Winner ? 2 : 1,
        }}>
          <div className={animPhase === "bouncing" ? "anim-rps-bounce" : ""}>
            <RpsIcon choice={p1Icon} size={140}
              color={(animPhase === "winner" && p1Loser) ? "#1a3a1a" : c0Color} />
          </div>
        </div>

        {/* p2 icon */}
        <div style={{
          position: "absolute", left: p2Left, top: "50%",
          transform: `translate(-50%, -50%) scale(${p2Scale})`,
          opacity: p2Opac,
          transition: animPhase === "winner" ? winTx : "none",
          zIndex: p2Winner ? 2 : 1,
        }}>
          <div className={animPhase === "bouncing" ? "anim-rps-bounce" : ""}>
            <RpsIcon choice={p2Icon} size={140}
              color={(animPhase === "winner" && p2Loser) ? "#1a3a1a" : c1Color} />
          </div>
        </div>

        {/* VS — hidden once winner is determined */}
        {animPhase !== "winner" && (
          <div style={{
            position: "absolute", left: "50%", top: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: 20, fontWeight: "bold", color: "#1e3e1e", letterSpacing: 3,
            pointerEvents: "none",
          }}>VS</div>
        )}
      </div>

      {/* Status */}
      <div style={{
        fontSize: isWin ? 22 : 14, letterSpacing: 3,
        color: isWin ? "#c8f55a" : "#6a8a6a",
        textShadow: isWin ? "0 0 24px #c8f55a66" : "none",
        textAlign: "center", minHeight: 28,
        transition: "font-size 0.3s ease",
      }}>
        {statusText}
      </div>
    </div>
  );
}

// ─── Tiebreaker decision panel (host picks method) ────────────────────────────
function TiebreakerPanel({ tiebreaker, isHost, hostPickWinner, startRPS, startOneSecond, voters, playerColors }) {
  if (!tiebreaker) return null;
  const c0Pid = Object.entries(voters || {}).find(([, v]) => v === tiebreaker.c0)?.[0];
  const c1Pid = Object.entries(voters || {}).find(([, v]) => v === tiebreaker.c1)?.[0];
  const c0Color = c0Pid ? PLAYER_COLORS[(playerColors?.[c0Pid] ?? 0) % PLAYER_COLORS.length] : "#c8f55a";
  const c1Color = c1Pid ? PLAYER_COLORS[(playerColors?.[c1Pid] ?? 0) % PLAYER_COLORS.length] : "#c8f55a";
  return (
    <div style={s.panel}>
      <div style={s.panelInner}>
        <div style={s.matchTag}>TIE DETECTED</div>
        <div style={s.vsRow}>
          <div style={s.statusContender}>
            <span style={{ fontSize: 13, letterSpacing: 2, color: c0Color }}>{tiebreaker.c0}</span>
          </div>
          <div style={s.vsCenter}>
            <div style={s.vsWord}>TIE</div>
          </div>
          <div style={s.statusContender}>
            <span style={{ fontSize: 13, letterSpacing: 2, color: c1Color }}>{tiebreaker.c1}</span>
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
          <div style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: "#6a8a6a", letterSpacing: 2 }}>Host is deciding\u2026</div>
        )}
      </div>
    </div>
  );
}

// ─── PlayerRobot — tiny colored robot head per player ────────────────────────
function PlayerRobot({ color, size = 16, volume = 1 }) {
  const vmRef = useRef(null);

  const { rive, RiveComponent } = useRive({
    src: bracketBotVerticalRiv,
    artboard: "Artboard",
    stateMachines: "bracketBot",
    autoplay: true,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
  });

  useEffect(() => {
    if (!rive) return;
    const vm = rive.viewModelByName("ViewModel1");
    if (!vm) return;
    const vmi = vm.defaultInstance();
    if (!vmi) return;
    vmRef.current = vmi;
    try { rive.bindViewModelInstance(vmi); } catch {}
    if (color && color.length >= 7) {
      const cp = vmi.color("colorProperty");
      if (cp) cp.rgb(parseInt(color.slice(1,3),16), parseInt(color.slice(3,5),16), parseInt(color.slice(5,7),16));
    }
  }, [rive]); // eslint-disable-line

  useEffect(() => {
    const vmi = vmRef.current;
    if (!vmi || !color || color.length < 7) return;
    const cp = vmi.color("colorProperty");
    if (cp) cp.rgb(parseInt(color.slice(1,3),16), parseInt(color.slice(3,5),16), parseInt(color.slice(5,7),16));
  }, [color]);

  useEffect(() => {
    if (rive) rive.volume = volume;
  }, [rive, volume]);

  return (
    <div style={{ width: size, height: size, flexShrink: 0 }}>
      <RiveComponent style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}

// ─── BracketBot ───────────────────────────────────────────────────────────────
function BracketBot({ width, height, src = bracketBotMainRiv, artboard = "Artboard", stateMachine = "bracketBot", volume = 1 }) {
  const wrapRef    = useRef(null);
  const xInputRef  = useRef(null);
  const yInputRef  = useRef(null);
  const triggerRef = useRef(null);

  const riveConfig = {
    src,
    artboard,
    autoplay: true,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
  };
  if (stateMachine) riveConfig.stateMachines = stateMachine;

  const { rive, RiveComponent } = useRive(riveConfig);

  // Grab state machine inputs once Rive loads
  useEffect(() => {
    if (!rive || !stateMachine) return;
    const inputs = rive.stateMachineInputs(stateMachine);
    if (!inputs || !inputs.length) return;
    const lc = (s) => s.toLowerCase().replace(/\s/g, "");
    const find = (...names) => inputs.find(i => names.some(n => lc(i.name) === lc(n)));
    xInputRef.current  = find("mouseX", "x", "cursorX", "lookX", "eyeX", "posX");
    yInputRef.current  = find("mouseY", "y", "cursorY", "lookY", "eyeY", "posY");
    triggerRef.current = find("click", "Click", "tap", "Tap", "speak", "Speak", "talk", "Talk", "pressed", "Pressed");
  }, [rive]);

  // Suppress false pointerleave/mouseleave on the canvas.
  // When the cursor moves over a higher z-index element (lobbyContentWrap etc.) the
  // browser fires pointerleave on the canvas, making Rive think the cursor left the
  // 1920×1080 hitbox. We intercept in capture phase (before Rive's listener) and
  // cancel the event as long as the cursor is still anywhere inside the viewport.
  useEffect(() => {
    if (!rive) return;
    const canvas = wrapRef.current?.querySelector("canvas");
    if (!canvas) return;
    const suppress = (e) => {
      if (e.clientX >= 0 && e.clientX <= window.innerWidth &&
          e.clientY >= 0 && e.clientY <= window.innerHeight) {
        e.stopImmediatePropagation();
      }
    };
    canvas.addEventListener("pointerleave", suppress, true);
    canvas.addEventListener("mouseleave",   suppress, true);
    return () => {
      canvas.removeEventListener("pointerleave", suppress, true);
      canvas.removeEventListener("mouseleave",   suppress, true);
    };
  }, [rive]);

  // Global mouse → forward to Rive canvas so eye tracking works even when the cursor
  // is over a higher z-index element (lobbyContentWrap etc.)
  const handleMouseMove = useCallback((e) => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    // Update JS state-machine inputs if they exist
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top)  / rect.height));
    if (xInputRef.current) xInputRef.current.value = nx * 100;
    if (yInputRef.current) yInputRef.current.value = ny * 100;
    // Dispatch a synthetic pointermove directly on the canvas so Rive's internal
    // cursor-follow receives the event regardless of z-index stacking
    const canvas = wrapRef.current.querySelector("canvas");
    if (canvas) {
      canvas.dispatchEvent(new PointerEvent("pointermove", {
        clientX: e.clientX, clientY: e.clientY,
        pointerId: 1, bubbles: false, cancelable: true,
      }));
    }
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  const handleClick = useCallback((e) => {
    if (triggerRef.current) {
      try { triggerRef.current.fire(); } catch { try { triggerRef.current.value = true; } catch {} }
    }
    // Also dispatch synthetic pointer events directly on the canvas so Rive's
    // internal audio/state machine responds natively (same pattern as pointermove)
    const canvas = wrapRef.current?.querySelector("canvas");
    if (canvas) {
      canvas.dispatchEvent(new PointerEvent("pointerdown", {
        clientX: e.clientX, clientY: e.clientY,
        pointerId: 1, bubbles: false, cancelable: true,
      }));
      canvas.dispatchEvent(new PointerEvent("pointerup", {
        clientX: e.clientX, clientY: e.clientY,
        pointerId: 1, bubbles: false, cancelable: true,
      }));
    }
  }, []);

  useEffect(() => {
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [handleClick]);

  useEffect(() => {
    if (rive) rive.volume = volume;
  }, [rive, volume]);

  const wrapStyle = width != null
    ? { width, height, display: "block", flexShrink: 0 }
    : { position: "absolute", inset: 0, zIndex: 100 };

  return (
    <div ref={wrapRef} style={wrapStyle}>
      <RiveComponent style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars (0/O, 1/I)
  return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function BracketApp() {
  // Room code — read from URL or auto-generate and persist to URL
  const [roomCode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const existing = params.get("room");
    if (existing) return existing.toUpperCase();
    const code = generateRoomCode();
    const url = new URL(window.location.href);
    url.searchParams.set("room", code);
    window.history.replaceState({}, "", url.toString());
    return code;
  });

  const {
    phase, category, playerCount, totalPlayers, isHost,
    bracket, currentMatchId: currentMatch, champion, votedCount,
    tiebreaker, playerNames, scores, connected, globalStats,
    voters, playerColors, matchNote, setMatchNote, doubleVoter, liveReactions,
    startNext, skip, playAgain, hostPickWinner, startRPS, startOneSecond, clearPlayers, setRpsRevealed, setMinigameSettings
  } = useGameState(null, roomCode);

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
  const [showHallOfFame, setShowHallOfFame] = useState(false);
  const [musicVolume,  setMusicVolume]  = useState(1);
  const [sfxVolume,    setSfxVolume]    = useState(1);
  const [randomTiebreaker, setRandomTiebreaker] = useState(false);
  const [autoAdvanceDelay, setAutoAdvanceDelay] = useState(3);
  const [minigamesEnabled,       setMinigamesEnabled]       = useState(true);
  const [minigameAllowRps,       setMinigameAllowRps]       = useState(true);
  const [minigameAllowOneSecond, setMinigameAllowOneSecond] = useState(true);
  const [minigameFrequency,      setMinigameFrequency]      = useState("medium");
  const [showBumpers, setShowBumpers] = useState(true); // seconds; 0 = off
  const [autoAdvanceRemaining, setAutoAdvanceRemaining] = useState(null);
  const [chatLog, setChatLog] = useState([]);
  const chatEndRef = useRef(null);
  const seenReactionIds = useRef(new Set());
  const reactionXRef = useRef({});

  // Capture text reactions into persistent chat log
  useEffect(() => {
    liveReactions.forEach(r => {
      if (r.type === "text" && !seenReactionIds.current.has(r.localId)) {
        seenReactionIds.current.add(r.localId);
        setChatLog(prev => [...prev.slice(-49), r]);
      }
    });
  }, [liveReactions]);

  // Clear chat log when the active match changes (new bracket, or bracket ends early)
  useEffect(() => {
    setChatLog([]);
    seenReactionIds.current.clear();
  }, [currentMatch]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog]);
  const [showUnanimous, setShowUnanimous]   = useState(false);
  const unanimousKeyRef = useRef(0);
  const [carouselPage, setCarouselPage]     = useState(0);
  const [carouselBracketTf, setCarouselBracketTf] = useState({ tx: 0, ty: 0, zoom: 1 });
  const carouselBracketTfRef   = useRef({ tx: 0, ty: 0, zoom: 1 });
  const carouselBracketDragRef = useRef(null);
  const [confettiActive, setConfettiActive] = useState(false);
  const autoAdvanceTimerRef   = useRef(null);
  const autoAdvanceCountRef   = useRef(null);
  const prevChampionRef       = useRef(null);
  const rpsLingerDataRef    = useRef(null);  // saved tiebreaker data for linger
  const rpsPhaseActiveRef   = useRef(false); // true while in "rps" phase
  const rpsPhaseEndTimeRef  = useRef(null);  // linger expiry timestamp (ms)
  const [, setRpsLingerTick] = useState(0);  // bumped to force re-render when linger expires

  // ── Audio management ──
  const menuAudio = useRef(null);
  const gameAudio = useRef(null);
  const endAudio  = useRef(null);
  const rpsAudio        = useRef(null);
  const oneSecondAudio  = useRef(null);
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
    rpsAudio.current         = makeLoop(rpsBeatSrc, 0.45);
    oneSecondAudio.current   = makeLoop(oneSecondMusicSrc, 0.5);
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
      oneSecondAudio.current?.pause();
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
        stop(gameAudio); stop(endAudio); stop(rpsAudio); stop(oneSecondAudio);
        menuAudio.current?.play().catch(() => {});
      } else if (phase === "finished" || champion) {
        stop(menuAudio); stop(gameAudio); stop(rpsAudio); stop(oneSecondAudio);
        endAudio.current?.play().catch(() => {});
      } else if (phase === "rps") {
        stop(menuAudio); stop(endAudio); stop(gameAudio); stop(oneSecondAudio);
        rpsAudio.current?.play().catch(() => {});
      } else if (phase === "oneSecond") {
        stop(menuAudio); stop(endAudio); stop(rpsAudio);
        if (gameAudio.current) gameAudio.current.pause();
        oneSecondAudio.current?.play().catch(() => {});
      } else {
        stop(menuAudio); stop(endAudio); stop(rpsAudio); stop(oneSecondAudio);
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

  // Switch music based on phase (including RPS / One Second)
  useEffect(() => {
    const stop = (a) => { if (a.current) { a.current.pause(); a.current.currentTime = 0; } };
    if (phase === "lobby") {
      stop(gameAudio); stop(endAudio); stop(rpsAudio); stop(oneSecondAudio);
      menuAudio.current?.play().catch(() => {});
    } else if (phase === "finished" || champion) {
      stop(menuAudio); stop(gameAudio); stop(rpsAudio); stop(oneSecondAudio);
      endAudio.current?.play().catch(() => {});
    } else if (phase === "rps") {
      stop(menuAudio); stop(endAudio); stop(gameAudio); stop(oneSecondAudio);
      rpsAudio.current?.play().catch(() => {});
    } else if (phase === "oneSecond") {
      stop(menuAudio); stop(endAudio); stop(rpsAudio);
      if (gameAudio.current) gameAudio.current.pause(); // pause without reset — resumes when oneSecond ends
      oneSecondAudio.current?.play().catch(() => {});
    } else {
      // playing / tiebreaker
      stop(menuAudio); stop(endAudio); stop(rpsAudio); stop(oneSecondAudio);
      gameAudio.current?.play().catch(() => {});
    }
  }, [phase, champion]);

  // Play RPS winning choice SFX — called by BigRpsPanel when the winner is visually revealed
  const handleRpsWinnerRevealed = useCallback((winningChoice) => {
    // Signal to phones that the result is now visible on the main screen
    setRpsRevealed();
    const buf = rpsSfxBufs.current[winningChoice];
    const ctx = audioCtxRef.current;
    if (!buf || !ctx || muted) return;
    if (rpsAudio.current) rpsAudio.current.pause();
    const source = ctx.createBufferSource();
    source.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = 1.0;
    source.connect(gain);
    if (zoomDryGain.current) gain.connect(zoomDryGain.current);
    if (zoomConvolver.current) gain.connect(zoomConvolver.current);
    source.start();
  }, [muted, setRpsRevealed]);

  // Play start SFX once on lobby → playing transition; also show blackout so bracket
  // never flashes before the round bumper appears (only on a real game start, not refresh)
  useEffect(() => {
    if (phase === "lobby") {
      lastBumperRoundRef.current = null; // reset so next game always triggers bumpers
    }
    if (prevPhase.current === "lobby" && phase !== "lobby") {
      if (!muted) startSfx.current?.play().catch(() => {});
      if (firebaseBootstrappedRef.current) setShowBlackout(true);
    }
    prevPhase.current = phase;
  }, [phase]); // eslint-disable-line

  // Unanimous detection — flash overlay when all players vote the same way
  useEffect(() => {
    if (votedCount < 2 || votedCount < totalPlayers) return;
    const choices = Object.values(voters);
    if (choices.length < totalPlayers) return;
    if (choices.every(c => c === choices[0])) {
      unanimousKeyRef.current += 1;
      setShowUnanimous(true);
      const t = setTimeout(() => setShowUnanimous(false), 2800);
      return () => { clearTimeout(t); setShowUnanimous(false); };
    }
  }, [votedCount]); // eslint-disable-line

  // Confetti — trigger once when champion is first set
  useEffect(() => {
    if (champion && !prevChampionRef.current) {
      setConfettiActive(true);
      const t = setTimeout(() => setConfettiActive(false), 7000);
      return () => clearTimeout(t);
    }
    prevChampionRef.current = champion;
  }, [champion]);

  // Final carousel — reset to page 0 when a new game starts
  useEffect(() => {
    if (!champion) setCarouselPage(0);
  }, [champion]);

  // Reset bracket pan/zoom whenever carousel page changes
  useEffect(() => {
    const tf = { tx: 0, ty: 0, zoom: 1 };
    carouselBracketTfRef.current = tf;
    setCarouselBracketTf(tf);
  }, [carouselPage]);

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
    [menuAudio, gameAudio, endAudio, rpsAudio, oneSecondAudio, startSfx, startAgainSfx, playerAddSfx, resetPlayersSfx, choiceMadeSfx].forEach((a) => {
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
    if (rpsAudio.current)        rpsAudio.current.volume        = 0.45 * musicVolume;
    if (oneSecondAudio.current)  oneSecondAudio.current.volume  = 0.5  * musicVolume;
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

  // Sync minigame settings into useGameState ref whenever they change
  useEffect(() => {
    setMinigameSettings({
      enabled: minigamesEnabled,
      allowRps: minigameAllowRps,
      allowOneSecond: minigameAllowOneSecond,
      frequency: minigameFrequency,
    });
  }, [minigamesEnabled, minigameAllowRps, minigameAllowOneSecond, minigameFrequency]); // eslint-disable-line

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
    setChatLog([]);
    seenReactionIds.current.clear();
    playAgain();
  };

  const handleClearPlayers = () => {
    resetPlayersSfx.current.currentTime = 0;
    resetPlayersSfx.current.play().catch(() => {});
    clearPlayers();
  };

  // Auto-advance to next match after a configurable delay
  useEffect(() => {
    clearTimeout(autoAdvanceTimerRef.current);
    clearInterval(autoAdvanceCountRef.current);
    setAutoAdvanceRemaining(null);

    if (phase !== "playing" || currentMatch || champion || autoAdvanceDelay === 0 || bumperSrc) return;

    let remaining = autoAdvanceDelay;
    setAutoAdvanceRemaining(remaining);

    autoAdvanceCountRef.current = setInterval(() => {
      remaining -= 1;
      setAutoAdvanceRemaining(remaining);
      if (remaining <= 0) clearInterval(autoAdvanceCountRef.current);
    }, 1000);

    autoAdvanceTimerRef.current = setTimeout(() => {
      setAutoAdvanceRemaining(null);
      startNext();
    }, autoAdvanceDelay * 1000);

    return () => {
      clearTimeout(autoAdvanceTimerRef.current);
      clearInterval(autoAdvanceCountRef.current);
    };
  }, [phase, currentMatch, champion, autoAdvanceDelay, bumperSrc]); // eslint-disable-line

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
    if (!isNewRound) { setShowBlackout(false); return; }
    // Always update lastBumperRoundRef so toggling bumpers back on doesn't replay old rounds
    lastBumperRoundRef.current = { rIdx: curr.rIdx, isFinal: curr.isFinal };
    // Suppress bumper if we just resolved a pre-match challenge (doubleVoter is set)
    if (doubleVoter) { setShowBlackout(false); return; }
    if (!showBumpers) { setShowBlackout(false); return; }
    const src = pickBumperSrc(bracket, curr.rIdx, curr.isFinal);
    if (src) {
      bumperFadingRef.current = false;
      setBumperFading(false);
      setBumperSrc(src);
    } else {
      setShowBlackout(false);
    }
  }, [currentMatch, phase, showBumpers]); // eslint-disable-line

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
        {/* BracketBot — full-screen z100; lobby UI at z150 sits above it */}
        <BracketBot volume={sfxVolume} />
        <div style={{ position: "absolute", top: 16, right: 16, zIndex: 150, display: "flex", gap: 8, pointerEvents: "none" }}>
          <button className="reset-btn-outer" onClick={handleClearPlayers} style={{ ...s.clearBtnSmall, pointerEvents: "auto" }}>
            <span className="reset-arrow" style={{ display: "inline-flex", width: 16, height: 16 }}><IconReset /></span>
            {" RESET"}
          </button>
          <button className="settings-btn-outer" style={{ ...s.settingsBtn, pointerEvents: "auto" }} onClick={() => setShowSettings(true)} title="Settings">
            <span className="settings-gear" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16 }}><IconGear /></span>
          </button>
          {globalStats && globalStats.length > 0 && (
            <button style={{ ...s.settingsBtn, pointerEvents: "auto" }} onClick={() => setShowHallOfFame(true)} title="Hall of Fame">
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16 }}><IconTrophy /></span>
            </button>
          )}
        </div>
        <div style={s.lobbyContentWrap}>
          <div style={s.lobbyInfo}>
            <div style={s.lobbyPlayers}>
              {playerCount} PLAYER{playerCount !== 1 ? "S" : ""} JOINED
            </div>
            {Object.keys(playerNames).length > 0 && (
              <div style={s.lobbyNamesList}>
                {Object.entries(playerNames).map(([pid, name], i) => {
                  const color = PLAYER_COLORS[(playerColors?.[pid] ?? i) % PLAYER_COLORS.length];
                  return (
                    <span key={pid} className="anim-nameTagIn" style={{
                      ...s.lobbyNameTag,
                      animationDelay: `${i * 60}ms`,
                      color,
                      borderColor: color,
                      boxShadow: `0 0 8px ${color}44`,
                    }}>{name}</span>
                  );
                })}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginTop: 4 }}>
              <div style={{ fontFamily: "'PT Mono',monospace", fontSize: 9, letterSpacing: 4, color: "#6a8a6a" }}>ROOM CODE</div>
              <div style={{ fontFamily: "'PT Mono',monospace", fontSize: 36, fontWeight: 700, letterSpacing: 10, color: "#c8f55a", lineHeight: 1 }}>{roomCode}</div>
              <div style={s.lobbyUrl}>
                <span style={{ color: "#7a9a7a" }}>{window.location.host}/vote</span>
              </div>
            </div>
            <div style={{ padding: 6, background: "#0a140a", border: "1px solid #1a2e1a", marginTop: 4 }}>
              <QRCodeSVG
                value={`${window.location.origin}/vote?room=${roomCode}`}
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

        {/* Hall of Fame popup */}
        {showHallOfFame && (
          <div
            style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => setShowHallOfFame(false)}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: "#060e06", border: "1px solid #1a2e1a", borderRadius: 6,
                padding: "24px 28px", minWidth: 260, maxWidth: 340,
                animation: "settings-open 0.15s ease-out",
              }}
            >
              <div style={{ fontSize: 11, letterSpacing: 5, color: "#c8f55a", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <IconTrophy size={14} /> ALL-TIME CHAMPIONS
              </div>
              {globalStats.slice(0, 15).map((entry, i) => (
                <div key={entry.name} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "5px 0",
                  borderBottom: i < Math.min(globalStats.length, 15) - 1 ? "1px solid #0d1a0d" : "none",
                }}>
                  <span style={{ fontSize: 11, color: i === 0 ? "#c8f55a" : "#6a8a6a", width: 20, textAlign: "right", flexShrink: 0 }}>
                    {i === 0 ? "★" : `${i + 1}.`}
                  </span>
                  <span style={{ fontSize: 13, letterSpacing: 1, color: i === 0 ? "#c8f55a" : "#7a9a7a", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {entry.name}
                  </span>
                  <span style={{ fontSize: 11, letterSpacing: 1, color: "#7a9a7a", flexShrink: 0 }}>
                    ×{entry.wins}
                  </span>
                </div>
              ))}
              <button onClick={() => setShowHallOfFame(false)} style={{
                marginTop: 18, width: "100%", padding: "8px 0", fontFamily: "'PT Mono',monospace",
                fontSize: 10, letterSpacing: 4, color: "#7a9a7a", background: "transparent",
                border: "1px solid #1a2e1a", borderRadius: 4, cursor: "pointer",
              }}>CLOSE</button>
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
                  <span style={{ fontFamily: "'PT Mono',monospace", fontSize: 10, letterSpacing: 3, color: "#6a8a6a" }}>MUSIC</span>
                  <span style={{ fontFamily: "'PT Mono',monospace", fontSize: 10, letterSpacing: 2, color: "#c8f55a" }}>
                    {Math.round(musicVolume * 100)}%
                  </span>
                </div>
                <input type="range" className="s-slider" min={0} max={1} step={0.01}
                  value={musicVolume} onChange={e => setMusicVolume(Number(e.target.value))} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "'PT Mono',monospace", fontSize: 10, letterSpacing: 3, color: "#6a8a6a" }}>SFX</span>
                  <span style={{ fontFamily: "'PT Mono',monospace", fontSize: 10, letterSpacing: 2, color: "#c8f55a" }}>
                    {Math.round(sfxVolume * 100)}%
                  </span>
                </div>
                <input type="range" className="s-slider" min={0} max={1} step={0.01}
                  value={sfxVolume} onChange={e => setSfxVolume(Number(e.target.value))} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span style={{ fontFamily: "'PT Mono',monospace", fontSize: 10, letterSpacing: 3, color: "#6a8a6a" }}>TIEBREAKER</span>
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
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span style={{ fontFamily: "'PT Mono',monospace", fontSize: 10, letterSpacing: 3, color: "#6a8a6a" }}>AUTO-ADVANCE</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {[0, 2, 3, 5].map(sec => (
                    <button key={sec}
                      style={{
                        flex: 1, padding: "10px 0", fontFamily: "'PT Mono',monospace", fontSize: 10,
                        letterSpacing: 2, cursor: "pointer", borderRadius: 3,
                        background: autoAdvanceDelay === sec ? "#0f1f0f" : "#0a140a",
                        color: autoAdvanceDelay === sec ? "#c8f55a" : "#2a5a2a",
                        border: autoAdvanceDelay === sec ? "2px solid #c8f55a" : "1px solid #1a2e1a",
                      }}
                      onClick={() => setAutoAdvanceDelay(sec)}
                    >
                      {sec === 0 ? "OFF" : `${sec}S`}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span style={{ fontFamily: "'PT Mono',monospace", fontSize: 10, letterSpacing: 3, color: "#6a8a6a" }}>ROUND VIDEOS</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {[true, false].map(on => (
                    <button key={String(on)}
                      style={{
                        flex: 1, padding: "10px 0", fontFamily: "'PT Mono',monospace", fontSize: 10,
                        letterSpacing: 2, cursor: "pointer", borderRadius: 3,
                        background: showBumpers === on ? "#0f1f0f" : "#0a140a",
                        color: showBumpers === on ? "#c8f55a" : "#2a5a2a",
                        border: showBumpers === on ? "2px solid #c8f55a" : "1px solid #1a2e1a",
                      }}
                      onClick={() => setShowBumpers(on)}
                    >
                      {on ? "ON" : "OFF"}
                    </button>
                  ))}
                </div>
              </div>
              {/* Pre-match minigames */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span style={{ fontFamily: "'PT Mono',monospace", fontSize: 10, letterSpacing: 3, color: "#6a8a6a" }}>PRE-MATCH MINIGAMES</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {[true, false].map(on => (
                    <button key={String(on)}
                      style={{
                        flex: 1, padding: "10px 0", fontFamily: "'PT Mono',monospace", fontSize: 10,
                        letterSpacing: 2, cursor: "pointer", borderRadius: 3,
                        background: minigamesEnabled === on ? "#0f1f0f" : "#0a140a",
                        color: minigamesEnabled === on ? "#c8f55a" : "#2a5a2a",
                        border: minigamesEnabled === on ? "2px solid #c8f55a" : "1px solid #1a2e1a",
                      }}
                      onClick={() => setMinigamesEnabled(on)}
                    >{on ? "ON" : "OFF"}</button>
                  ))}
                </div>
                <div style={{ opacity: minigamesEnabled ? 1 : 0.3, pointerEvents: minigamesEnabled ? "auto" : "none", display: "flex", flexDirection: "column", gap: 10 }}>
                  <span style={{ fontFamily: "'PT Mono',monospace", fontSize: 9, letterSpacing: 3, color: "#6a8a6a" }}>INCLUDE</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[["rps", "RPS", minigameAllowRps, setMinigameAllowRps], ["os", "ONE SEC", minigameAllowOneSecond, setMinigameAllowOneSecond]].map(([key, label, val, setter]) => (
                      <button key={key}
                        style={{
                          flex: 1, padding: "10px 0", fontFamily: "'PT Mono',monospace", fontSize: 10,
                          letterSpacing: 2, cursor: "pointer", borderRadius: 3,
                          background: val ? "#0f1f0f" : "#0a140a",
                          color: val ? "#c8f55a" : "#2a5a2a",
                          border: val ? "2px solid #c8f55a" : "1px solid #1a2e1a",
                        }}
                        onClick={() => setter(v => !v)}
                      >{label}</button>
                    ))}
                  </div>
                  <span style={{ fontFamily: "'PT Mono',monospace", fontSize: 9, letterSpacing: 3, color: "#6a8a6a" }}>FREQUENCY</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[["low", "LOW"], ["medium", "MED"], ["high", "HIGH"]].map(([val, label]) => (
                      <button key={val}
                        style={{
                          flex: 1, padding: "10px 0", fontFamily: "'PT Mono',monospace", fontSize: 10,
                          letterSpacing: 2, cursor: "pointer", borderRadius: 3,
                          background: minigameFrequency === val ? "#0f1f0f" : "#0a140a",
                          color: minigameFrequency === val ? "#c8f55a" : "#2a5a2a",
                          border: minigameFrequency === val ? "2px solid #c8f55a" : "1px solid #1a2e1a",
                        }}
                        onClick={() => setMinigameFrequency(val)}
                      >{label}</button>
                    ))}
                  </div>
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
        <div style={{ color: "#6a8a6a", letterSpacing: 2, fontSize: 14 }}>
          Loading…
        </div>
      </div>
    );
  }

  // ── RPS panel linger — computed synchronously during render so the panel never
  //    unmounts between phase leaving "rps" and the linger window opening.
  //    (useEffect fires after render, which would let the component unmount for
  //    one frame and reset animPhase inside BigRpsPanel back to "waiting".)
  if (phase === "rps") {
    rpsPhaseActiveRef.current  = true;
    rpsPhaseEndTimeRef.current = null;
    if (tiebreaker?.rps) rpsLingerDataRef.current = tiebreaker;
  } else if (rpsPhaseActiveRef.current && !rpsPhaseEndTimeRef.current) {
    // Phase JUST left "rps" in this render — open the linger window immediately
    rpsPhaseActiveRef.current  = false;
    rpsPhaseEndTimeRef.current = Date.now() + 1100;
    setTimeout(() => setRpsLingerTick(n => n + 1), 1150);
  }
  const showRpsPanel = phase === "rps" ||
    !!(rpsPhaseEndTimeRef.current && Date.now() < rpsPhaseEndTimeRef.current);

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
        {!champion && <button
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
        </button>}
        <button className="settings-btn-outer" style={s.settingsBtn} onClick={() => setShowSettings(true)} title="Settings"><span className="settings-gear" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20 }}><IconGear size={20} /></span></button>
        <ExitButton onExit={handlePlayAgain} style={s.exitBtn} />
      </div>

      {/* Player list - top left */}
      {Object.keys(playerNames).length > 0 && !champion && (
        <div style={s.playerListBox}>
          <div style={s.playerListTitle}>PLAYERS</div>
          {Object.entries(playerNames).map(([pid, name], i) => {
            const color = PLAYER_COLORS[(playerColors?.[pid] ?? i) % PLAYER_COLORS.length];
            return (
              <div key={pid} style={{ ...s.playerListItem, color, display: "flex", alignItems: "center", gap: 6 }}>
                <PlayerRobot color={color} size={42} volume={sfxVolume} />
                <span style={{ lineHeight: 1, alignSelf: "center", position: "relative", top: 5 }}>{name}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* BracketBot — top-right corner box (hidden on champion screen) */}
      {!champion && (
        <div style={{
          position: "absolute", top: 68, right: 16, zIndex: 20,
          border: "1px solid #1a2e1a", background: "#060e06",
          borderRadius: 4, overflow: "hidden",
        }}>
          <BracketBot width={220} height={124} src={bracketBotMapRiv} volume={sfxVolume} />
        </div>
      )}

      {champion && (
        <div className="anim-champReveal" style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <div style={s.champion}>
            {"\uD83C\uDFC6"}&nbsp; CHAMPION &mdash;&nbsp;
            <span className="anim-glowPulse" style={{ color: "#c8f55a", textShadow: "0 0 24px #c8f55a" }}>{champion}</span>
          </div>
        </div>
      )}

      {champion && bracket && (() => {
        // -- vote totals data --
        const voteTotals = {};
        allMatches(bracket).forEach((m) => {
          const [c0, c1] = m.contenders;
          if (c0) voteTotals[c0] = (voteTotals[c0] || 0) + ((m.votes && m.votes[c0]) || 0);
          if (c1) voteTotals[c1] = (voteTotals[c1] || 0) + ((m.votes && m.votes[c1]) || 0);
        });
        const sorted = Object.entries(voteTotals).sort((a, b) => b[1] - a[1]);
        const half = Math.ceil(sorted.length / 2);
        const col1 = sorted.slice(0, half);
        const col2 = sorted.slice(half);

        // -- leaderboard data --
        const lbEntries = scores && Object.keys(scores).length > 0
          ? Object.entries(scores)
              .map(([pid, sc]) => ({
                pid,
                name: playerNames[pid] || "???",
                pct: sc.total > 0 ? Math.round((sc.correct / sc.total) * 100) : 0,
                correct: sc.correct,
                total: sc.total,
              }))
              .sort((a, b) => b.pct - a.pct)
          : [];

        // -- bracket scale --
        const bLayout = getLayout(bracket);
        const bContainerW = Math.min(window.innerWidth * 0.88, 1100);
        const bContainerH = Math.round(window.innerHeight * 0.58);
        const bScale = Math.min(bContainerW / bLayout.totalW, bContainerH / SVG_H);
        const bRenderW = bLayout.totalW * bScale;
        const bRenderH = SVG_H * bScale;

        const pageTitles = ["OPTIONS BY TOTAL VOTES", "USER LEADERBOARD", "FILLED BRACKET"];
        const arrowBtn = {
          background: "transparent", border: "1px solid #1a2e1a", color: "#c8f55a",
          fontSize: 28, width: 36, height: 36, display: "flex", alignItems: "center",
          justifyContent: "center", cursor: "pointer", borderRadius: 3,
          fontFamily: "sans-serif", lineHeight: 1, padding: 0, flexShrink: 0,
        };

        return (
          <div style={{ width: "100%", maxWidth: bContainerW + 80, marginBottom: 0 }}>
            {/* Nav row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <button style={arrowBtn} onClick={() => setCarouselPage(p => (p + 2) % 3)}>&#8249;</button>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <div style={{ fontSize: 10, letterSpacing: 4, color: "#4a7a40" }}>{pageTitles[carouselPage]}</div>
                <div style={{ display: "flex", gap: 7 }}>
                  {[0, 1, 2].map(i => (
                    <button key={i} onClick={() => setCarouselPage(i)} style={{
                      width: 8, height: 8, borderRadius: "50%", border: "none", cursor: "pointer", padding: 0,
                      background: i === carouselPage ? "#c8f55a" : "#1a2e1a",
                      boxShadow: i === carouselPage ? "0 0 6px #c8f55a" : "none",
                      transition: "background 0.25s, box-shadow 0.25s",
                    }} />
                  ))}
                </div>
              </div>
              <button style={arrowBtn} onClick={() => setCarouselPage(p => (p + 1) % 3)}>&#8250;</button>
            </div>

            {/* Page content */}
            <div style={{ border: "1px solid #1a2e1a", background: "#080f08", padding: carouselPage === 2 ? "12px 16px" : "12px 16px", minHeight: carouselPage === 2 ? bContainerH + 24 : 280, overflow: "hidden" }}>
              {carouselPage === 0 && (
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
              )}

              {carouselPage === 1 && (
                lbEntries.length > 0
                  ? lbEntries.map((entry, i) => (
                      <div key={i} style={s.leaderboardRow}>
                        <span style={s.leaderboardRank}>{i + 1}.</span>
                        <span style={{ ...s.leaderboardName, color: PLAYER_COLORS[(playerColors?.[entry.pid] ?? i) % PLAYER_COLORS.length] }}>{entry.name}</span>
                        <span style={s.leaderboardPct}>{entry.pct}%</span>
                        <span style={s.leaderboardDetail}>{entry.correct}/{entry.total}</span>
                      </div>
                    ))
                  : <div style={{ color: "#6a8a6a", textAlign: "center", paddingTop: 60, letterSpacing: 3, fontSize: 12 }}>NO SCORES RECORDED</div>
              )}

              {carouselPage === 2 && (
                <div
                  style={{ width: bContainerW, height: bContainerH, overflow: "hidden", position: "relative", margin: "0 auto", cursor: carouselBracketDragRef.current ? "grabbing" : "grab", userSelect: "none" }}
                  onWheel={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const cx = e.clientX - rect.left;
                    const cy = e.clientY - rect.top;
                    const prev = carouselBracketTfRef.current;
                    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
                    const newZoom = Math.min(Math.max(prev.zoom * factor, 1), 8);
                    const newTf = newZoom === 1 ? { zoom: 1, tx: 0, ty: 0 } : (() => {
                      const baseX = (bContainerW - bRenderW) / 2;
                      const baseY = (bContainerH - bRenderH) / 2;
                      const svgX = (cx - baseX - prev.tx) / (bScale * prev.zoom);
                      const svgY = (cy - baseY - prev.ty) / (bScale * prev.zoom);
                      return { zoom: newZoom, tx: cx - baseX - svgX * bScale * newZoom, ty: cy - baseY - svgY * bScale * newZoom };
                    })();
                    carouselBracketTfRef.current = newTf;
                    setCarouselBracketTf(newTf);
                  }}
                  onMouseDown={(e) => { e.preventDefault(); carouselBracketDragRef.current = { startX: e.clientX, startY: e.clientY, startTx: carouselBracketTfRef.current.tx, startTy: carouselBracketTfRef.current.ty }; }}
                  onMouseMove={(e) => {
                    if (!carouselBracketDragRef.current) return;
                    const { startX, startY, startTx, startTy } = carouselBracketDragRef.current;
                    const newTf = { ...carouselBracketTfRef.current, tx: startTx + e.clientX - startX, ty: startTy + e.clientY - startY };
                    carouselBracketTfRef.current = newTf;
                    setCarouselBracketTf(newTf);
                  }}
                  onMouseUp={() => { carouselBracketDragRef.current = null; }}
                  onMouseLeave={() => { carouselBracketDragRef.current = null; }}
                  onDoubleClick={() => { const tf = { tx: 0, ty: 0, zoom: 1 }; carouselBracketTfRef.current = tf; setCarouselBracketTf(tf); }}
                >
                  <div style={{ transformOrigin: "0 0", transform: `translate(${(bContainerW - bRenderW) / 2 + carouselBracketTf.tx}px, ${(bContainerH - bRenderH) / 2 + carouselBracketTf.ty}px) scale(${bScale * carouselBracketTf.zoom})` }}>
                    <BracketSVG bracket={bracket} currentMatchId={null} zoomed={false} />
                  </div>
                  <div style={{ position: "absolute", bottom: 6, right: 8, fontSize: 9, letterSpacing: 2, color: "#6a8a6a" }}>SCROLL TO ZOOM · DRAG TO PAN · DBL-CLICK TO RESET</div>
                </div>
              )}
            </div>

            {/* Play Again — centered below carousel */}
            <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
              <button style={s.playAgainBtn} onClick={handlePlayAgain}>{"\u21BA"} PLAY AGAIN</button>
            </div>
          </div>
        );
      })()}

      {phase === "tiebreaker" && (
        <TiebreakerPanel tiebreaker={tiebreaker} isHost={isHost}
          hostPickWinner={hostPickWinner} startRPS={startRPS} startOneSecond={startOneSecond}
          voters={voters} playerColors={playerColors} />
      )}

      {doubleVoter && liveMatch && !champion && !showRpsPanel && phase !== "tiebreaker" && phase !== "rps" && phase !== "oneSecond" && (
        <div style={{
          position: "absolute", top: 62, left: "50%", transform: "translateX(-50%)",
          zIndex: 30, background: "#1a2e00", border: "1px solid #c8f55a",
          borderRadius: 20, padding: "4px 16px", fontSize: 11, letterSpacing: 3,
          color: "#c8f55a", textShadow: "0 0 10px #c8f55a88",
          boxShadow: "0 0 12px #c8f55a33", whiteSpace: "nowrap",
        }}>
          ⚡ {playerNames[doubleVoter] || "?"} VOTES DOUBLE
        </div>
      )}
      {liveMatch && !champion && !showRpsPanel && phase !== "tiebreaker" && phase !== "rps" && phase !== "oneSecond" && (
        <MatchStatus
          match={liveMatch} votedCount={votedCount} totalPlayers={totalPlayers}
          voters={voters} playerNames={playerNames} playerColors={playerColors}
          matchNote={matchNote} setMatchNote={setMatchNote} isHost={isHost}
        />
      )}

      {!currentMatch && !champion && (
        <div style={s.hint}>
          <button
            style={s.startBtn}
            onClick={() => {
              clearTimeout(autoAdvanceTimerRef.current);
              clearInterval(autoAdvanceCountRef.current);
              setAutoAdvanceRemaining(null);
              startNext();
            }}
          >
            {autoAdvanceRemaining != null
              ? `▶ NEXT IN ${autoAdvanceRemaining}…`
              : "▶ START NEXT MATCH"}
          </button>
        </div>
      )}

      {liveMatch && !champion && !showRpsPanel && phase !== "rps" && phase !== "oneSecond" && (
        <div style={s.hint}>
          <button style={Object.assign({}, s.startBtn, { fontSize: 10, padding: "6px 16px", opacity: 0.4 })}
            onClick={skip}>
            SKIP / FORCE RESULT
          </button>
        </div>
      )}

      {/* Big tiebreaker panels — replace the bracket map */}
      {showRpsPanel && rpsLingerDataRef.current && (
        <BigRpsPanel
          tiebreaker={phase === "rps" && tiebreaker?.rps ? tiebreaker : rpsLingerDataRef.current}
          playerNames={playerNames}
          playerColors={playerColors}
          onWinnerRevealed={handleRpsWinnerRevealed}
          onDrawRevealed={setRpsRevealed}
          preMatch={!!(phase === "rps" && tiebreaker?.rps ? tiebreaker?.preMatch : rpsLingerDataRef.current?.preMatch)} />
      )}
      {phase === "oneSecond" && tiebreaker?.oneSecond && (
        <BigOneSecondPanel tiebreaker={tiebreaker} playerNames={playerNames} playerColors={playerColors} preMatch={!!tiebreaker?.preMatch} />
      )}

      {/* Camera viewport — hidden during big tiebreaker panels and on champion screen */}
      {!champion && !showRpsPanel && phase !== "oneSecond" && <div
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
      </div>}

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
            {/* Header */}
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

            {/* Music Volume */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "'PT Mono',monospace", fontSize: 10, letterSpacing: 3, color: "#6a8a6a" }}>MUSIC</span>
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
                <span style={{ fontFamily: "'PT Mono',monospace", fontSize: 10, letterSpacing: 3, color: "#6a8a6a" }}>SFX</span>
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
              <span style={{ fontFamily: "'PT Mono',monospace", fontSize: 10, letterSpacing: 3, color: "#6a8a6a" }}>TIEBREAKER</span>
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

            {/* Auto-advance delay */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ fontFamily: "'PT Mono',monospace", fontSize: 10, letterSpacing: 3, color: "#6a8a6a" }}>AUTO-ADVANCE</span>
              <div style={{ display: "flex", gap: 8 }}>
                {[0, 2, 3, 5].map(sec => (
                  <button key={sec}
                    style={{
                      flex: 1, padding: "10px 0", fontFamily: "'PT Mono',monospace", fontSize: 10,
                      letterSpacing: 2, cursor: "pointer", borderRadius: 3,
                      background: autoAdvanceDelay === sec ? "#0f1f0f" : "#0a140a",
                      color: autoAdvanceDelay === sec ? "#c8f55a" : "#2a5a2a",
                      border: autoAdvanceDelay === sec ? "2px solid #c8f55a" : "1px solid #1a2e1a",
                    }}
                    onClick={() => setAutoAdvanceDelay(sec)}
                  >
                    {sec === 0 ? "OFF" : `${sec}S`}
                  </button>
                ))}
              </div>
            </div>

            {/* Pre-match minigames */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ fontFamily: "'PT Mono',monospace", fontSize: 10, letterSpacing: 3, color: "#6a8a6a" }}>PRE-MATCH MINIGAMES</span>
              <div style={{ display: "flex", gap: 8 }}>
                {[true, false].map(on => (
                  <button key={String(on)}
                    style={{
                      flex: 1, padding: "10px 0", fontFamily: "'PT Mono',monospace", fontSize: 10,
                      letterSpacing: 2, cursor: "pointer", borderRadius: 3,
                      background: minigamesEnabled === on ? "#0f1f0f" : "#0a140a",
                      color: minigamesEnabled === on ? "#c8f55a" : "#2a5a2a",
                      border: minigamesEnabled === on ? "2px solid #c8f55a" : "1px solid #1a2e1a",
                    }}
                    onClick={() => setMinigamesEnabled(on)}
                  >{on ? "ON" : "OFF"}</button>
                ))}
              </div>
              <div style={{ opacity: minigamesEnabled ? 1 : 0.3, pointerEvents: minigamesEnabled ? "auto" : "none", display: "flex", flexDirection: "column", gap: 10 }}>
                <span style={{ fontFamily: "'PT Mono',monospace", fontSize: 9, letterSpacing: 3, color: "#6a8a6a" }}>INCLUDE</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {[["rps", "RPS", minigameAllowRps, setMinigameAllowRps], ["os", "ONE SEC", minigameAllowOneSecond, setMinigameAllowOneSecond]].map(([key, label, val, setter]) => (
                    <button key={key}
                      style={{
                        flex: 1, padding: "10px 0", fontFamily: "'PT Mono',monospace", fontSize: 10,
                        letterSpacing: 2, cursor: "pointer", borderRadius: 3,
                        background: val ? "#0f1f0f" : "#0a140a",
                        color: val ? "#c8f55a" : "#2a5a2a",
                        border: val ? "2px solid #c8f55a" : "1px solid #1a2e1a",
                      }}
                      onClick={() => setter(v => !v)}
                    >{label}</button>
                  ))}
                </div>
                <span style={{ fontFamily: "'PT Mono',monospace", fontSize: 9, letterSpacing: 3, color: "#6a8a6a" }}>FREQUENCY</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {[["low", "LOW"], ["medium", "MED"], ["high", "HIGH"]].map(([val, label]) => (
                    <button key={val}
                      style={{
                        flex: 1, padding: "10px 0", fontFamily: "'PT Mono',monospace", fontSize: 10,
                        letterSpacing: 2, cursor: "pointer", borderRadius: 3,
                        background: minigameFrequency === val ? "#0f1f0f" : "#0a140a",
                        color: minigameFrequency === val ? "#c8f55a" : "#2a5a2a",
                        border: minigameFrequency === val ? "2px solid #c8f55a" : "1px solid #1a2e1a",
                      }}
                      onClick={() => setMinigameFrequency(val)}
                    >{label}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Unanimous flash overlay */}
      {showUnanimous && (
        <div key={unanimousKeyRef.current} style={{
          position: "fixed", inset: 0, zIndex: 190, pointerEvents: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            fontFamily: "'PT Mono', monospace",
            fontSize: 68, fontWeight: "bold", letterSpacing: 16,
            color: "#c8f55a",
            textShadow: "0 0 60px #c8f55a, 0 0 120px #c8f55a55",
            animation: "unanimousFlash 2.8s ease-in-out both",
          }}>
            UNANIMOUS
          </div>
        </div>
      )}

      {/* Floating icon reactions — random X within middle 60% of screen */}
      {liveReactions.filter(r => r.type !== "text").map(r => {
        if (!reactionXRef.current[r.localId]) {
          reactionXRef.current[r.localId] = 20 + Math.random() * 60;
        }
        const xPct = reactionXRef.current[r.localId];
        const colorIdx = (playerColors?.[r.pid] ?? 0) % PLAYER_COLORS.length;
        const color = PLAYER_COLORS[colorIdx];
        return (
          <div key={r.localId} className="anim-reactionFloat" style={{
            position: "fixed", bottom: 100, left: `${xPct}vw`,
            zIndex: 600, pointerEvents: "none",
          }}>
            <ReactionIcon type={r.type} size={r.type === "hourglass" ? 44 : 88} color={color} />
          </div>
        );
      })}

      {/* Persistent chat log — lower-left */}
      {chatLog.length > 0 && (
        <div style={{
          position: "fixed", bottom: 8, left: 8, zIndex: 600, pointerEvents: "none",
          width: 320, maxHeight: 220, overflowY: "auto",
          display: "flex", flexDirection: "column", gap: 2,
          maskImage: "linear-gradient(to bottom, transparent 0%, black 20%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 20%)",
        }}>
          {chatLog.map(r => {
            const colorIdx = (playerColors?.[r.pid] ?? 0) % PLAYER_COLORS.length;
            const color = PLAYER_COLORS[colorIdx];
            const name = playerNames?.[r.pid] || "?";
            return (
              <div key={r.localId} style={{
                fontFamily: "'PT Mono', monospace", fontSize: 13, lineHeight: 1.4,
                background: "rgba(6,14,6,0.7)", borderRadius: 4, padding: "2px 8px",
                whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>
                <span style={{ color, fontWeight: "bold" }}>{name}: </span>
                <span style={{ color: "#c8f55a" }}>{r.text}</span>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>
      )}

      {/* Confetti on champion reveal */}
      <Confetti active={confettiActive} />


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
    zIndex: 150,
    paddingBottom: 32,
    pointerEvents: "none",
  },
  titleVideo: {
    position: "absolute",
    top: "calc(35% - 40px)",
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
    color: "#6a8a6a",
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
    color: "#6a8a6a",
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
  subtitle: { fontSize: 10, color: "#6a8a6a", letterSpacing: 3, flex: 1 },
  voteUrl: { fontSize: 10, color: "#6a8a6a", letterSpacing: 1, marginRight: 8 },
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
  matchTag: { fontSize: 9, letterSpacing: 4, color: "#6a8a6a", marginBottom: 4, textAlign: "center" },
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
    fontSize: 9, letterSpacing: 3, color: "#6a8a6a", marginBottom: 6,
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
    fontSize: 10, letterSpacing: 4, color: "#6a8a6a", marginBottom: 10,
    textAlign: "center",
  },
  leaderboardRow: {
    display: "flex", alignItems: "center", gap: 10, padding: "4px 0",
    borderBottom: "1px solid #0f1f0f",
  },
  leaderboardRank: {
    fontSize: 12, color: "#6a8a6a", width: 20, textAlign: "right",
  },
  leaderboardName: {
    fontSize: 14, letterSpacing: 3, color: "#c8f55a", flex: 1,
  },
  leaderboardPct: {
    fontSize: 16, fontWeight: "bold", color: "#c8f55a", letterSpacing: 2,
  },
  leaderboardDetail: {
    fontSize: 10, color: "#6a8a6a", letterSpacing: 1, width: 40, textAlign: "right",
  },
  twoColGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px",
  },
  rpsPlayerNames: {
    textAlign: "center", fontSize: 16, letterSpacing: 4, fontWeight: "bold",
    color: "#c8f55a", marginBottom: 10,
  },
  muteBtn: {
    position: "absolute", top: 16, right: 20, zIndex: 150, pointerEvents: "auto",
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
