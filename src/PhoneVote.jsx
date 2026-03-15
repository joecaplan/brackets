import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRive, Layout, Fit, Alignment } from "@rive-app/react-webgl2";
import bracketBotRiv from "./assets/rive/bracketbot_vertical.riv";
import { useGameState } from "./useGameState.js";
import { RockIcon, PaperIcon, ScissorsIcon, RpsIcon, SmileIcon, FrownIcon, PoopIcon, SkullIcon, HourglassIcon } from "./RpsIcons.jsx";
import { allMatches } from "./bracketLogic.js";
import { PLAYER_COLORS } from "./categories.js";
import { ShapeHalveRevealSequence } from "./ShapeHalveReveal.jsx";

const CATEGORY_TAGS_LIST = ["Nature", "Food", "Sports", "Media", "Arts", "Things", "Misc"];

// ─── Round helpers ─────────────────────────────────────────────────────────────
function getRoundLabel(bracket, matchId) {
  if (!bracket || !matchId) return null;
  const numRounds = bracket.left.length;
  const labels = numRounds === 4
    ? ["ROUND 1", "ROUND 2", "QUARTERFINALS", "SEMIFINALS"]
    : numRounds === 3
    ? ["ROUND 1", "QUARTERFINALS", "SEMIFINALS"]
    : ["ROUND 1", "SEMIFINALS"];
  for (let rIdx = 0; rIdx < bracket.left.length; rIdx++) {
    if (bracket.left[rIdx].some(m => m.id === matchId)) return labels[rIdx];
    if (bracket.right[rIdx].some(m => m.id === matchId)) return labels[rIdx];
  }
  if (bracket.final?.id === matchId) return "THE FINAL";
  return null;
}

function getRoundInfo(bracket, matchId) {
  if (!bracket || !matchId) return null;
  for (let rIdx = 0; rIdx < bracket.left.length; rIdx++) {
    if (bracket.left[rIdx].some(m => m.id === matchId)) return { rIdx, isFinal: false };
    if (bracket.right[rIdx].some(m => m.id === matchId)) return { rIdx, isFinal: false };
  }
  if (bracket.final?.id === matchId) return { rIdx: bracket.left.length, isFinal: true };
  return null;
}

import chooseAnswerSrc from "./assets/audio/SFX/ChooseAnswer.wav";
import iconPencilUrl            from "./assets/SVG/iconPencil.svg";
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

// ─── Bracket text formatter ───────────────────────────────────────────────────
function formatBracketText(bracket, category, champion) {
  const numRounds = bracket.left.length;
  const labels = numRounds === 4 ? ["R1","R2","QF","SF"]
               : numRounds === 3 ? ["R1","QF","SF"]
               :                   ["R1","SF"];
  const lines = [];
  lines.push(`🏆 BRACKETS${category ? ` — ${category.toUpperCase()}` : ""}`);
  lines.push(`CHAMPION: ${champion || "TBD"}`);
  lines.push("");
  const f = bracket.final;
  if (f && f.contenders[0] && f.contenders[1]) {
    lines.push("── FINAL ──");
    lines.push(`${f.contenders[0]} vs ${f.contenders[1]}${f.winner ? ` → ${f.winner}` : ""}`);
    lines.push("");
  }
  for (let r = numRounds - 1; r >= 0; r--) {
    lines.push(`── ${labels[r]} ──`);
    const lRound = bracket.left[r] || [];
    const rRound = bracket.right[r] || [];
    [...lRound, ...rRound].forEach(m => {
      if (m.contenders[0] && m.contenders[1])
        lines.push(`${m.contenders[0]} vs ${m.contenders[1]}${m.winner ? ` → ${m.winner}` : ""}`);
    });
    lines.push("");
  }
  return lines.join("\n");
}

// ─── Bracket text display component ──────────────────────────────────────────
function BracketTextView({ bracket }) {
  const numRounds = bracket.left.length;
  const labels = numRounds === 4 ? ["R1","R2","QF","SF"]
               : numRounds === 3 ? ["R1","QF","SF"]
               :                   ["R1","SF"];
  const _mono = "'PT Mono', monospace";
  const sections = [];
  const f = bracket.final;
  if (f && f.contenders[0] && f.contenders[1]) {
    sections.push({ label: "FINAL", matches: [f] });
  }
  for (let r = numRounds - 1; r >= 0; r--) {
    const matches = [...(bracket.left[r] || []), ...(bracket.right[r] || [])]
      .filter(m => m.contenders[0] && m.contenders[1]);
    if (matches.length) sections.push({ label: labels[r], matches });
  }
  return (
    <div style={{ width: "100%", marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      {sections.map(({ label, matches }) => (
        <div key={label}>
          <div style={{ fontFamily: _mono, fontSize: 9, letterSpacing: 4, color: "#6a8a6a", marginBottom: 6 }}>{label}</div>
          {matches.map((m, i) => (
            <div key={i} style={{ fontFamily: _mono, fontSize: 12, letterSpacing: 1, color: "#7a9a7a",
              padding: "6px 10px", background: "#0a140a", borderRadius: 3, marginBottom: 4,
              display: "flex", alignItems: "center", gap: 6 }}>
              {m.winner === m.contenders[0] && <span style={{ color: "#c8f55a", fontSize: 10 }}>✓</span>}
              <span style={{ flex: 1, textAlign: "right", color: m.winner === m.contenders[0] ? "#c8f55a" : "#7a9a7a" }}>{m.contenders[0]}</span>
              <span style={{ color: "#6a8a6a", fontSize: 10 }}>vs</span>
              <span style={{ flex: 1, color: m.winner === m.contenders[1] ? "#c8f55a" : "#7a9a7a" }}>{m.contenders[1]}</span>
              {m.winner === m.contenders[1] && <span style={{ color: "#c8f55a", fontSize: 10 }}>✓</span>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Shape Halve helper: renders the shape SVG with optional cut lines ────────
function ShapeDisplay({ seed, line, lineColor, size = 260, line2, line2Color }) {
  const [shape, setShape] = useState(null);
  useEffect(() => {
    import("./shapeHalveUtils.js").then(m => setShape(m.generateShape(seed)));
  }, [seed]);

  // Lines are stored in 0-400 virtual space; SVG viewBox is also 0-400
  return (
    <div style={{ width: size, height: size, flexShrink: 0, borderRadius: 8, overflow: "hidden" }}>
      {shape ? (
        <svg width={size} height={size} viewBox="0 0 400 400" style={{ display: "block" }}>
          <path d={shape.svgPath} fill="#0f2e0f" stroke="#2a4a2a" strokeWidth={2} />
          {line && <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke={lineColor || "#c8f55a"} strokeWidth={4} strokeLinecap="round" />}
          {line2 && <line x1={line2.x1} y1={line2.y1} x2={line2.x2} y2={line2.y2} stroke={line2Color || "#88aabb"} strokeWidth={4} strokeLinecap="round" />}
        </svg>
      ) : (
        <div style={{ width: size, height: size, background: "#0a1a0a" }} />
      )}
    </div>
  );
}

// ─── Interactive cut screen for active Shape Halve player ─────────────────────
function ShapeHalveCutScreen({ seed, myColor, onSubmit, muteButton, reactionBar, preMatch }) {
  const [shape, setShape] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const svgRef = useRef(null);
  const SIZE = 280;

  useEffect(() => {
    import("./shapeHalveUtils.js").then(m => setShape(m.generateShape(seed)));
  }, [seed]);

  const getSvgPoint = (e) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const clientX = e.touches ? e.touches[0]?.clientX : e.clientX;
    const clientY = e.touches ? e.touches[0]?.clientY : e.clientY;
    if (clientX == null) return null;
    const x = ((clientX - rect.left) / rect.width) * 400;
    const y = ((clientY - rect.top) / rect.height) * 400;
    return { x, y };
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    const pt = getSvgPoint(e);
    if (!pt) return;
    setDragStart(pt);
    setDragEnd(pt);
    setErrorMsg("");
  };

  const handlePointerMove = (e) => {
    if (!dragStart) return;
    e.preventDefault();
    const pt = getSvgPoint(e);
    if (pt) setDragEnd(pt);
  };

  const handlePointerUp = async (e) => {
    e.preventDefault();
    if (!dragStart || !dragEnd || !shape || submitted) return;
    const dx = dragEnd.x - dragStart.x;
    const dy = dragEnd.y - dragStart.y;
    if (Math.sqrt(dx * dx + dy * dy) < 20) {
      setDragStart(null); setDragEnd(null);
      return;
    }

    const utils = await import("./shapeHalveUtils.js");
    // Both endpoints must be outside the shape (drag fully through it)
    const startInside = utils.pointInPolygon(dragStart.x, dragStart.y, shape.polyApprox);
    const endInside   = utils.pointInPolygon(dragEnd.x,   dragEnd.y,   shape.polyApprox);
    if (startInside || endInside) {
      setErrorMsg("Draw your line from outside the shape, all the way through to the other side!");
      setDragStart(null); setDragEnd(null);
      return;
    }
    const hits = utils.lineShapeIntersections(dragStart.x, dragStart.y, dragEnd.x, dragEnd.y, shape.polyApprox);
    if (hits.length !== 2) {
      setErrorMsg("Your line must cross through the shape! Try again.");
      setDragStart(null); setDragEnd(null);
      return;
    }

    const ratio = utils.computeAreaRatio(dragStart.x, dragStart.y, dragEnd.x, dragEnd.y, shape.svgPath, shape.polyApprox);
    const lineData = { x1: dragStart.x, y1: dragStart.y, x2: dragEnd.x, y2: dragEnd.y };
    setSubmitted(true);
    await onSubmit(lineData, ratio);
  };

  return (
    <div style={{ ...vs.root, gap: 14 }}>
      {muteButton}
      <div style={{ fontSize: 11, letterSpacing: 5, color: myColor, textAlign: "center" }}>
        {preMatch ? "PRE-MATCH CHALLENGE" : "TIEBREAKER"}
      </div>
      <div style={{ fontSize: 20, fontWeight: "bold", letterSpacing: 6, color: "#c8f55a", textAlign: "center" }}>
        SHAPE HALVING
      </div>
      <div style={{ fontSize: 11, letterSpacing: 3, color: myColor, textAlign: "center" }}>
        ★ YOUR TURN — DRAG TO CUT ★
      </div>

      {/* Interactive SVG */}
      <div style={{ position: "relative", touchAction: "none", cursor: "crosshair", userSelect: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {shape ? (
          <svg
            ref={svgRef}
            width={SIZE} height={SIZE}
            viewBox="0 0 400 400"
            style={{ display: "block", border: `1px solid ${myColor}44`, borderRadius: 8 }}
          >
            <path d={shape.svgPath} fill="#0f2e0f" stroke="#2a5a2a" strokeWidth={2} />
            {dragStart && dragEnd && (
              <line x1={dragStart.x} y1={dragStart.y} x2={dragEnd.x} y2={dragEnd.y}
                stroke={myColor} strokeWidth={3} strokeLinecap="round" opacity={0.85} />
            )}
          </svg>
        ) : (
          <div style={{ width: SIZE, height: SIZE, background: "#0a1a0a", borderRadius: 8 }} />
        )}
      </div>

      {errorMsg && (
        <div style={{ fontSize: 11, letterSpacing: 2, color: "#cc5555", textAlign: "center", padding: "4px 12px",
          background: "#1a0a0a", border: "1px solid #cc5555", borderRadius: 4 }}>
          {errorMsg}
        </div>
      )}
      {submitted && (
        <div style={{ fontSize: 11, letterSpacing: 3, color: "#c8f55a" }}>Cut submitted!</div>
      )}
      <div style={{ fontSize: 10, letterSpacing: 2, color: "#4a6a4a", textAlign: "center" }}>
        Drag a line across the shape to split it in half
      </div>
      {reactionBar}
    </div>
  );
}

// ─── Shape Halve results screen ───────────────────────────────────────────────
function ShapeHalveResultScreen({ sh, p1Name, p2Name, p1Color, p2Color, winnerName, preMatch, p1Option, p2Option, muteButton, reactionBar }) {
  return (
    <div style={{ ...vs.root, paddingBottom: "max(180px, calc(env(safe-area-inset-bottom) + 160px))" }}>
      {muteButton}
      <div style={vs.tiebreakerTitle}>SHAPE HALVING</div>
      <ShapeHalveRevealSequence
        sh={sh} p1Name={p1Name} p2Name={p2Name}
        p1Color={p1Color} p2Color={p2Color}
        winnerName={winnerName} preMatch={preMatch}
        p1Option={p1Option} p2Option={p2Option}
        compact
      />
      {reactionBar}
    </div>
  );
}

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
    const particles = Array.from({ length: 120 }, () => ({
      x:    Math.random() * canvas.width,
      y:    -10 - Math.random() * canvas.height * 0.3,
      vx:   (Math.random() - 0.5) * 5,
      vy:   Math.random() * 3 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      w:    Math.random() * 10 + 4,
      h:    Math.random() * 5 + 3,
      rot:  Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.18,
    }));
    let animId;
    let stopped = false;
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let allGone = true;
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.07; p.rot += p.rotV;
        if (p.y < canvas.height + 30) allGone = false;
        ctx.save();
        ctx.globalAlpha = Math.min(1, Math.max(0, 1 - p.y / canvas.height * 0.5));
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
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
      position: "fixed", inset: 0, zIndex: 900, pointerEvents: "none",
      width: "100%", height: "100%",
    }} />
  );
}

// ─── ReactionBar ─────────────────────────────────────────────────────────────
function ReactionBar({ sendReaction, myColor }) {
  const [text, setText] = useState("");
  const [bottom, setBottom] = useState(0);
  const _mono = "'PT Mono', monospace";

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      // How far the visual viewport's bottom is from the layout viewport's bottom
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setBottom(kb);
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  const send = (type, textVal) => {
    sendReaction(type, textVal || null);
  };

  const handleSubmit = () => {
    const trimmed = text.trim().slice(0, 20);
    if (!trimmed || isSlur(trimmed)) { setText(""); return; }
    send("text", trimmed);
    setText("");
  };

  const iconBtn = { background: "transparent", border: "none", cursor: "pointer", padding: "0.3px 0",
    display: "flex", alignItems: "center", justifyContent: "center",
    flex: 1, minWidth: 0,
    WebkitTapHighlightColor: "transparent", touchAction: "manipulation" };
  const iconSz = "clamp(32px, calc(20vw - 6px), 104px)";
  const iconSzHalf = "clamp(16px, calc(10vw - 3px), 52px)";

  return createPortal(
    <div style={{ position: "fixed", bottom, left: 0, right: 0, zIndex: 500,
      background: "#060e06", borderTop: "1px solid #1a2e1a",
      padding: bottom > 0 ? "0px 12px 8px" : "0px 12px max(32px, calc(env(safe-area-inset-bottom) + 20px))", boxSizing: "border-box" }}>
      <div style={{ display: "flex", gap: 0, marginBottom: -5 }}>
        <button style={iconBtn} onClick={() => send("smile")} onTouchEnd={(e) => { e.preventDefault(); send("smile"); }}>
          <div style={{ width: iconSz, height: iconSz, display: "flex" }}><SmileIcon size="100%" color={myColor} /></div>
        </button>
        <button style={iconBtn} onClick={() => send("frown")} onTouchEnd={(e) => { e.preventDefault(); send("frown"); }}>
          <div style={{ width: iconSz, height: iconSz, display: "flex" }}><FrownIcon size="100%" color={myColor} /></div>
        </button>
        <button style={iconBtn} onClick={() => send("poop")} onTouchEnd={(e) => { e.preventDefault(); send("poop"); }}>
          <div style={{ width: iconSz, height: iconSz, display: "flex" }}><PoopIcon size="100%" color={myColor} /></div>
        </button>
        <button style={iconBtn} onClick={() => send("skull")} onTouchEnd={(e) => { e.preventDefault(); send("skull"); }}>
          <div style={{ width: iconSz, height: iconSz, display: "flex" }}><SkullIcon size="100%" color={myColor} /></div>
        </button>
        <button style={iconBtn} onClick={() => send("hourglass")} onTouchEnd={(e) => { e.preventDefault(); send("hourglass"); }}>
          <div style={{ width: iconSzHalf, height: iconSzHalf, display: "flex" }}><HourglassIcon size="100%" color={myColor} /></div>
        </button>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={text}
          maxLength={50}
          placeholder="CHAT..."
          onChange={(e) => setText(e.target.value.toUpperCase().slice(0, 50))}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          style={{ flex: 1, background: "#0a1a0a", border: "1px solid #1a2e1a", borderRadius: 4,
            padding: "8px 12px", color: "#c8f55a", fontFamily: _mono, fontSize: 12,
            letterSpacing: 2, outline: "none", minWidth: 0 }}
        />
        <button onClick={handleSubmit}
          onTouchEnd={(e) => { e.preventDefault(); handleSubmit(); }}
          style={{ background: myColor, border: "none", borderRadius: 4, padding: "8px 14px",
            color: "#040e04", fontFamily: _mono, fontSize: 12, fontWeight: "bold",
            cursor: "pointer", flexShrink: 0, WebkitTapHighlightColor: "transparent" }}>
          SEND
        </button>
      </div>
    </div>,
    document.body
  );
}

// ─── BracketBotVertical ──────────────────────────────────────────────────────
function BracketBotVertical({ color }) {
  const wrapRef       = useRef(null);
  const xInputRef     = useRef(null);
  const yInputRef     = useRef(null);
  const triggerRef    = useRef(null);
  const vmInstanceRef = useRef(null);

  const { rive, RiveComponent } = useRive({
    src: bracketBotRiv,
    artboard: "Artboard",
    stateMachines: "bracketBot",
    autoplay: true,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
  });

  useEffect(() => {
    if (!rive) return;
    const inputs = rive.stateMachineInputs("bracketBot");
    if (!inputs || !inputs.length) return;
    const lc = (s) => s.toLowerCase().replace(/\s/g, "");
    const find = (...names) => inputs.find(i => names.some(n => lc(i.name) === lc(n)));
    xInputRef.current   = find("mouseX", "x", "cursorX", "lookX", "eyeX", "posX");
    yInputRef.current   = find("mouseY", "y", "cursorY", "lookY", "eyeY", "posY");
    triggerRef.current  = find("click", "Click", "tap", "Tap", "speak", "Speak", "talk", "Talk", "pressed", "Pressed");
  }, [rive]);

  // Convert hex string to r/g/b and apply to a color property
  const applyHexColor = useCallback((colorProp, hex) => {
    if (!colorProp || !hex || hex.length < 7) return;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    colorProp.rgb(r, g, b);
  }, []);

  // Bind ViewModel and set initial color
  useEffect(() => {
    if (!rive) return;
    const vm = rive.viewModelByName("ViewModel1");
    if (!vm) return;
    const vmi = vm.defaultInstance();
    if (!vmi) return;
    vmInstanceRef.current = vmi;
    try { rive.bindViewModelInstance(vmi); } catch {}
    if (color) {
      const colorProp = vmi.color("colorProperty");
      applyHexColor(colorProp, color);
    }
  }, [rive]); // eslint-disable-line

  // Update color whenever it changes
  useEffect(() => {
    const vmi = vmInstanceRef.current;
    if (!vmi || !color) return;
    const colorProp = vmi.color("colorProperty");
    applyHexColor(colorProp, color);
  }, [color, applyHexColor]);

  // Touch → eye tracking (relative to full viewport) + synthetic pointermove
  const handleTouch = useCallback((e) => {
    if (!wrapRef.current) return;
    const touch = e.touches[0] || e.changedTouches[0];
    if (!touch) return;
    const nx = Math.max(0, Math.min(1, touch.clientX / window.innerWidth));
    const ny = Math.max(0, Math.min(1, touch.clientY / window.innerHeight));
    if (xInputRef.current) xInputRef.current.value = nx * 100;
    if (yInputRef.current) yInputRef.current.value = ny * 100;
    const canvas = wrapRef.current.querySelector("canvas");
    if (canvas) {
      canvas.dispatchEvent(new PointerEvent("pointermove", {
        clientX: touch.clientX, clientY: touch.clientY,
        pointerId: 1, bubbles: false, cancelable: true,
      }));
    }
  }, []);

  useEffect(() => {
    window.addEventListener("touchmove", handleTouch, { passive: true });
    window.addEventListener("touchstart", handleTouch, { passive: true });
    return () => {
      window.removeEventListener("touchmove", handleTouch);
      window.removeEventListener("touchstart", handleTouch);
    };
  }, [handleTouch]);

  // Tap on robot → trigger talk
  const handleTap = useCallback(() => {
    if (triggerRef.current) {
      try { triggerRef.current.fire(); } catch { try { triggerRef.current.value = true; } catch {} }
    }
  }, []);

  return (
    <div ref={wrapRef} onClick={handleTap}
      style={{ width: "clamp(60px, 15dvh, 110px)", height: "clamp(60px, 15dvh, 110px)", flexShrink: 0, cursor: "pointer" }}>
      <RiveComponent style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}

export default function PhoneVote() {
  const playerId = useRef(
    localStorage.getItem("bracket_pid") || crypto.randomUUID()
  );

  // Room code — read from URL param or require manual entry
  const [roomCode, setRoomCode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("room")?.toUpperCase() || null;
  });
  const [roomInput, setRoomInput] = useState("");
  const [roomError, setRoomError] = useState("");

  const {
    phase, category, bracketSize, playerCount, totalPlayers, isHost,
    bracket, currentMatchId, champion, votedCount, tiebreaker,
    connected, playerNames, scores, playerColors, voters, doubleVoter,
    customCategories, bracketOfTheWeek, randomCategory,
    joinGame, leaveGame, selectCategory, setBracketSize, startGame, setCustomItems,
    vote: firebaseVote, skip, hostPickWinner, startRPS, submitRPS,
    startOneSecond, startOSTimer, stopOSTimer, playAgain, sendReaction,
    startShapeHalve, submitShapeHalve,
    minigamesEnabled, setMinigamesEnabled,
    sequentialVoting, setSequentialVoting, votingQueue, votingQueueIndex,
    simpleUX, setSimpleUX,
  } = useGameState(playerId.current, roomCode);

  const myColorHex = PLAYER_COLORS[(playerColors?.[playerId.current] ?? 0) % PLAYER_COLORS.length];
  const reactionBar = !simpleUX && (phase === "playing" || phase === "tiebreaker" || phase === "rps" || phase === "oneSecond" || phase === "shapeHalve")
    ? <ReactionBar sendReaction={sendReaction} myColor={myColorHex} />
    : null;

  const [voted, setVoted] = useState(false);
  const [rpsChosen, setRpsChosen] = useState(false);
  const [loggedOff, setLoggedOff] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const prevChampionRef = useRef(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [hostSettingsConfirmed, setHostSettingsConfirmed] = useState(false);
  const [minigameRuleExpanded, setMinigameRuleExpanded] = useState(false);
  const [customItems, setCustomItemsLocal] = useState(Array(32).fill(""));
  const [randomMode, setRandomMode] = useState(false);
  const [customError, setCustomError] = useState("");
  const [playerName, setPlayerName] = useState(localStorage.getItem("bracket_name") || "");
  const [nameInput, setNameInput] = useState(localStorage.getItem("bracket_name") || "");
  const [nameError, setNameError] = useState("");
  const [pickedColorIdx, setPickedColorIdx] = useState(null);
  const [muted, setMuted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [osDisplayMs, setOsDisplayMs] = useState(0);
  const [selectedTag, setSelectedTag] = useState(null); // null = show all
  const [searchQuery, setSearchQuery] = useState("");
  const osStartRef = useRef(null); // local capture of Date.now() at START press for accurate elapsed
  const lastMatchId = useRef(null);
  const firebaseBootstrappedRef = useRef(false);
  const rpsChosenRoundRef = useRef(null); // which RPS round the player submitted in
  const categoryScrollRef = useRef(null);
  const rpsLingerDataRef    = useRef(null);   // saved tiebreaker when result was revealed
  const rpsLingerActiveRef  = useRef(false);  // true while in "rps" phase with revealed result
  const rpsLingerEndRef     = useRef(null);   // linger expiry timestamp (ms)
  const [, setRpsLingerTick] = useState(0);   // bumped to force re-render when linger expires
  const [tutorialDismissed, setTutorialDismissed] = useState(false);
  const [tutorialTimerMs, setTutorialTimerMs] = useState(0);
  const [tutorialIdx, setTutorialIdx] = useState(0);
  const lastMinigamePhaseRef = useRef(null);
  const [showPhoneIntro, setShowPhoneIntro] = useState(false);
  const [phoneIntroTyped, setPhoneIntroTyped] = useState("");
  const phoneIntroHasFinishedRef = useRef(false);
  const prevPhaseRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("bracket_pid", playerId.current);
  }, []);

  // Scroll category screen to top when it becomes visible
  useEffect(() => {
    if (isHost && !category && categoryScrollRef.current) {
      categoryScrollRef.current.scrollTop = 0;
    }
  }, [isHost, category]);

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
      joinGame(playerId.current, playerName, pickedColorIdx);
  }, [connected, joinGame, loggedOff, playerName, pickedColorIdx]); // eslint-disable-line

  // Confetti — trigger when champion first set
  useEffect(() => {
    if (champion && !prevChampionRef.current) {
      setConfettiActive(true);
      const t = setTimeout(() => setConfettiActive(false), 5000);
      return () => clearTimeout(t);
    }
    prevChampionRef.current = champion;
  }, [champion]);

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

  // Sync voted flag from Firebase voters — handles refresh AND match transitions.
  // voters resets to {} when a new match starts, and contains pid→choice when voted.
  useEffect(() => {
    setVoted(!!(voters && voters[playerId.current]));
  }, [voters]); // eslint-disable-line

  // Track match changes
  useEffect(() => {
    lastMatchId.current = currentMatchId;
  }, [currentMatchId]);

  // Reset rpsChosen when RPS round changes
  useEffect(() => {
    if (tiebreaker && tiebreaker.rps) {
      setRpsChosen(false);
    }
  }, [tiebreaker && tiebreaker.rps && tiebreaker.rps.round]); // eslint-disable-line


  // Phone intro typewriter — trigger on lobby→playing transition
  useEffect(() => {
    if (prevPhaseRef.current === "lobby" && phase === "playing") {
      phoneIntroHasFinishedRef.current = false;
      setShowPhoneIntro(true);
      setPhoneIntroTyped("");
    }
    if (phase === "lobby") phoneIntroHasFinishedRef.current = false;
    prevPhaseRef.current = phase;
  }, [phase]); // eslint-disable-line

  useEffect(() => {
    if (!showPhoneIntro || !category) return;
    const catDisplay = category === "?????" ? "something" : category;
    const fullText = `Welcome, bracketeers.\n\nYour task at hand is to work together to determine the best ${catDisplay}.\n\nThis is important work so take your time to discuss, argue, and make your voices heard.\n\nDon't forget—this is the real world. Winning is more important than having fun.`;
    let i = 0;
    setPhoneIntroTyped("");
    const interval = setInterval(() => {
      i++;
      setPhoneIntroTyped(fullText.slice(0, i));
      if (i >= fullText.length) {
        clearInterval(interval);
        setTimeout(() => {
          phoneIntroHasFinishedRef.current = true;
          setShowPhoneIntro(false);
        }, 5000);
      }
    }, 28);
    return () => clearInterval(interval);
  }, [showPhoneIntro]); // eslint-disable-line

  // Reset tutorial dismissed state when entering a new minigame phase
  useEffect(() => {
    if (phase === "rps" || phase === "oneSecond") {
      if (phase !== lastMinigamePhaseRef.current) {
        lastMinigamePhaseRef.current = phase;
        setTutorialDismissed(false);
        setTutorialTimerMs(0);
        setTutorialIdx(0);
      }
    }
  }, [phase]);

  // Animate the One Second demo timer in the tutorial — cycles through 4 target times
  useEffect(() => {
    if (phase !== "oneSecond" || tutorialDismissed) return;
    const TARGETS = [1150, 873, 1048, 758];
    let idx = 0;
    let cycleMs = 0;
    const id = setInterval(() => {
      cycleMs += 33;
      const cycleDuration = TARGETS[idx] + 1950; // 600 pre + T + 1350 post
      if (cycleMs >= cycleDuration) {
        cycleMs = 0;
        idx = (idx + 1) % TARGETS.length;
        setTutorialIdx(idx);
      }
      setTutorialTimerMs(cycleMs);
    }, 33);
    return () => clearInterval(id);
  }, [phase, tutorialDismissed]);

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
    navigator.vibrate?.(50);
    if (!muted && chooseAnswerSfx.current) {
      chooseAnswerSfx.current.currentTime = 0;
      chooseAnswerSfx.current.play().catch(() => {});
    }
    firebaseVote(playerId.current, choice);
  };

  // Mute toggle button rendered in every screen
  const _iconColor = muted ? "#bb6666" : "#c8f55a";
  const muteButton = (
    <button style={{ ...vs.muteBtn, color: _iconColor, borderColor: muted ? "#bb6666" : "#1a2e1a" }} onClick={toggleMute} title={muted ? "Unmute" : "Mute"}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill={_iconColor} style={{ display: "block" }}>
        {muted ? (
          // Speaker with X (muted)
          <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0 0 17.73 18L19 19.27 20.27 18 5.27 3 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
        ) : (
          // Speaker with waves (unmuted)
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
        )}
      </svg>
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

  // ── Room code entry (if not provided via URL) — shown before connecting ──
  if (!roomCode) {
    const submitRoom = () => {
      const code = roomInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (code.length < 4) { setRoomError("Enter a valid room code."); return; }
      const url = new URL(window.location.href);
      url.searchParams.set("room", code);
      window.history.replaceState({}, "", url.toString());
      setRoomError("");
      setRoomCode(code);
    };
    return (
      <div style={vs.root}>
        {muteButton}
        <div style={vs.lobbyTitle}>BRACKETS</div>
        <div style={vs.lobbySubtitle}>Enter room code:</div>
        {roomError && <div style={vs.nameError}>{roomError}</div>}
        <input
          style={{ ...vs.nameInput, fontSize: 28, letterSpacing: 8, textAlign: "center", textTransform: "uppercase" }}
          type="text"
          maxLength={6}
          placeholder="XXXXX"
          value={roomInput}
          onChange={(e) => { setRoomInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")); setRoomError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") submitRoom(); }}
          autoFocus
        />
        <button style={{ ...vs.startGameBtn, width: 280 }} onClick={submitRoom}>
          JOIN ROOM
        </button>
      </div>
    );
  }

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
    const takenColorIdxs = new Set(Object.values(playerColors || {}));
    const submitName = () => {
      const name = nameInput.trim().slice(0, 6).toUpperCase();
      if (!name) return;
      if (pickedColorIdx === null) { setNameError("Pick a color first."); return; }
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
        <div style={vs.lobbyTitle}>BRACKETS</div>
        <div style={vs.lobbySubtitle}>Enter your name (max 6 chars):</div>
        {nameError && <div style={vs.nameError}>{nameError}</div>}
        <input
          style={vs.nameInput}
          type="text"
          maxLength={6}
          placeholder="NAME"
          value={nameInput}
          onChange={(e) => { setNameInput(e.target.value.slice(0, 6).toUpperCase()); setNameError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") submitName(); }}
          autoFocus
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", maxWidth: 280, margin: "8px 0" }}>
          {PLAYER_COLORS.map((color, idx) => {
            const isTaken = takenColorIdxs.has(idx);
            const isPicked = pickedColorIdx === idx;
            return (
              <div
                key={idx}
                onClick={() => { if (!isTaken) setPickedColorIdx(idx); }}
                style={{
                  width: 36, height: 36, borderRadius: 6,
                  background: isTaken ? "#1a2a1a" : color,
                  border: isPicked ? `3px solid #fff` : `2px solid ${isTaken ? "#1a2a1a" : color}`,
                  opacity: isTaken ? 0.25 : 1,
                  cursor: isTaken ? "not-allowed" : "pointer",
                  boxShadow: isPicked ? `0 0 12px ${color}` : "none",
                  flexShrink: 0,
                  transition: "box-shadow 0.15s",
                }}
              />
            );
          })}
        </div>
        <button style={{ ...vs.startGameBtn, width: 280 }} onClick={submitName}>
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

  // ── RPS result linger — keep showing the result briefly after phase leaves "rps",
  //    matching the main screen's 1100ms linger window so both transition together.
  if (phase === "rps" && tiebreaker?.rps?.revealed) {
    rpsLingerActiveRef.current = true;
    rpsLingerEndRef.current    = null;
    rpsLingerDataRef.current   = tiebreaker;
  } else if (rpsLingerActiveRef.current && phase !== "rps" && !rpsLingerEndRef.current) {
    rpsLingerActiveRef.current = false;
    rpsLingerEndRef.current    = Date.now() + 1100;
    setTimeout(() => setRpsLingerTick(n => n + 1), 1150);
  }
  const showRpsLinger = !!(rpsLingerEndRef.current && Date.now() < rpsLingerEndRef.current);

  // ── Phone intro overlay ──
  const phoneIntroCatDisplay = category === "?????" ? "something" : (category || "");
  const phoneIntroFullText = phoneIntroCatDisplay
    ? `Welcome, bracketeers.\n\nYour task at hand is to work together to determine the best ${phoneIntroCatDisplay}.\n\nThis is important work so take your time to discuss, argue, and make your voices heard.\n\nDon't forget—this is the real world. Winning is more important than having fun.`
    : "";
  const showPhoneIntroOverlay = !simpleUX && !phoneIntroHasFinishedRef.current && (
    showPhoneIntro ||
    (phase === "playing" && prevPhaseRef.current === "lobby")
  );
  if (showPhoneIntroOverlay) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 800, background: "#060e06",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "48px 28px", boxSizing: "border-box",
      }}>
        <style>{`@keyframes blinkPhone { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }`}</style>
        <div style={{ position: "relative", width: "100%", fontFamily: "'PT Mono', monospace", fontSize: 15, lineHeight: 1.9 }}>
          <div style={{ visibility: "hidden", whiteSpace: "pre-wrap", userSelect: "none" }}>
            {phoneIntroFullText}{"▌"}
          </div>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, color: "#c8f55a", textShadow: "0 0 20px #c8f55a44", whiteSpace: "pre-wrap" }}>
            {phoneIntroTyped}
            {showPhoneIntro && <span style={{ animation: "blinkPhone 0.9s step-end infinite" }}>▌</span>}
          </div>
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
        <div ref={categoryScrollRef} style={{ ...vs.root, height: "100dvh", minHeight: "unset", justifyContent: "flex-start", overflowY: "auto" }}>
          {muteButton}
          <div style={vs.lobbyTitle}>BRACKETS</div>
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

          {/* Search box */}
          <div style={{ position: "relative", width: "100%", maxWidth: 320, marginBottom: 8 }}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); if (e.target.value) setSelectedTag(null); }}
              placeholder="Search brackets..."
              style={{ width: "100%", padding: "10px 36px 10px 14px", fontSize: 14, fontFamily: "'PT Mono','Courier New',monospace", background: "#0f1f0f", color: "#c8f55a", border: "1px solid #2a4a1a", borderRadius: 6, outline: "none", boxSizing: "border-box", letterSpacing: 1 }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#4a7a2a", fontSize: 16, cursor: "pointer", padding: 0, lineHeight: 1 }}>
                ✕
              </button>
            )}
          </div>

          {/* Tag filter row — hidden while searching */}
          {!searchQuery && (
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginBottom: 4 }}>
              <button
                style={selectedTag === null ? vs.tagBtnActive : vs.tagBtn}
                onClick={() => setSelectedTag(null)}>
                ALL
              </button>
              {CATEGORY_TAGS_LIST.map(tag => (
                <button key={tag}
                  style={selectedTag === tag ? vs.tagBtnActive : vs.tagBtn}
                  onClick={() => setSelectedTag(tag)}>
                  {tag.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          {/* Category list — from Firebase only */}
          {(() => {
            const allCustom = Object.entries(customCategories || {});
            const isPinned = (key) => key === bracketOfTheWeek || key === randomCategory;
            const filtered = searchQuery
              ? allCustom.filter(([key, c]) => {
                  if (isPinned(key)) return false;
                  const q = searchQuery.toLowerCase();
                  return c.name?.toLowerCase().includes(q)
                    || (c.tags || []).some(t => t.toLowerCase().includes(q))
                    || (c.hiddenTags || []).some(t => t.toLowerCase().includes(q));
                })
              : allCustom.filter(([key, c]) => !isPinned(key) && (selectedTag === null || (c.tags || []).includes(selectedTag)));
            filtered.sort((a, b) => (a[1].name || "").localeCompare(b[1].name || ""));
            const botwCat = bracketOfTheWeek && customCategories?.[bracketOfTheWeek];
            return (
              <>
                {botwCat && !searchQuery && selectedTag === null && (
                  <button
                    style={{
                      width: "100%", maxWidth: 320, padding: "14px 16px", marginBottom: 4,
                      background: "linear-gradient(135deg, #1a1500 0%, #0f1f0f 100%)",
                      border: "2px solid #ffd700", borderRadius: 8, cursor: "pointer",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                      fontFamily: "'PT Mono','Courier New',monospace", textAlign: "center",
                    }}
                    onClick={() => { setRandomMode(false); selectCategory(bracketOfTheWeek); }}>
                    <div style={{ fontSize: 9, letterSpacing: 3, color: "#ffd700" }}>★ BRACKET OF THE WEEK ★</div>
                    <div style={{ fontSize: 16, fontWeight: "bold", letterSpacing: 2, color: "#ffd700" }}>
                      {botwCat.name?.toUpperCase()}
                    </div>
                  </button>
                )}
                {!searchQuery && selectedTag === null && (
                  <button
                    style={{
                      ...vs.categoryBtn,
                      background: "linear-gradient(135deg, #0a1a2a 0%, #0f1f2f 100%)",
                      border: "2px solid #4a9eff",
                      color: "#4a9eff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                    onClick={() => setShowCustomInput(true)}>
                    <img src={iconPencilUrl} alt="" style={{ width: 16, height: 16, marginRight: 6, flexShrink: 0,
                      filter: "brightness(0) saturate(100%) invert(60%) sepia(80%) saturate(400%) hue-rotate(185deg) brightness(110%)" }} />
                    CUSTOM
                  </button>
                )}
                {randomCategory && customCategories?.[randomCategory] && !searchQuery &&
                  (selectedTag === null || (customCategories[randomCategory].tags || []).includes(selectedTag)) && (
                  <button
                    style={{
                      ...vs.categoryBtn,
                      background: "linear-gradient(135deg, #1a0a2a 0%, #1f0f2f 100%)",
                      border: "2px solid #c084fc",
                      color: "#c084fc",
                      letterSpacing: 0,
                    }}
                    onClick={() => { setRandomMode(false); selectCategory(randomCategory); }}>
                    {customCategories[randomCategory].name?.toUpperCase()}
                  </button>
                )}
                {filtered.length === 0 && (
                  <div style={{ color: "#3a5a1a", fontSize: 13, letterSpacing: 1, padding: "8px 0" }}>
                    {searchQuery ? `No results for "${searchQuery}"` : "No brackets for this tag."}
                  </div>
                )}
                {filtered.map(([key, c], i) => (
                  <button
                    key={key + "-" + (searchQuery || selectedTag)}
                    style={{ ...vs.categoryBtn, animation: `categoryBtnIn 0.22s cubic-bezier(0.22,1,0.36,1) ${i * 35}ms both` }}
                    onClick={() => { setRandomMode(false); selectCategory(key); }}>
                    {c.name.toUpperCase()}
                  </button>
                ))}
              </>
            );
          })()}
          <div style={vs.playerCountLobby}>
            {playerCount} player{playerCount !== 1 ? "s" : ""} joined
          </div>
          <button style={vs.logOffBtn} onClick={handleLogOff}>LOG OFF</button>
        </div>
      );
    }

    if (isHost && category && !hostSettingsConfirmed) {
      // ── Settings page (between category select and start game) ──
      const displayCategory = randomMode && category === "Custom" ? "RANDOM" : category;
      return (
        <div style={vs.root}>
          {muteButton}
          <div style={vs.lobbyTitle}>BRACKETS</div>
          <div style={vs.categorySelected}>
            <div style={vs.catLabel}>CATEGORY</div>
            <div style={vs.catName}>{displayCategory.toUpperCase()}</div>
          </div>

          <div style={{ width: 280, display: "flex", flexDirection: "column", gap: 20, marginTop: 8 }}>
            <div style={{ fontSize: 10, letterSpacing: 4, color: "#7a9a7a", textAlign: "left", borderBottom: "1px solid #1a2e1a", paddingBottom: 10 }}>
              GAME SETTINGS
            </div>

            {/* Pre-match minigames toggle */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Main row: label + arrow + pill */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                {/* Label + expand arrow — tapping this expands/collapses */}
                <div
                  style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", flex: 1 }}
                  onClick={() => setMinigameRuleExpanded(e => !e)}
                >
                  <div style={{ fontSize: 12, letterSpacing: 2, color: minigamesEnabled ? "#c8f55a" : "#4a6a4a" }}>
                    PRE-MATCH MINIGAMES
                  </div>
                  <span style={{
                    fontSize: 10, color: "#4a6a4a",
                    display: "inline-block",
                    transform: minigameRuleExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                    lineHeight: 1,
                  }}>▼</span>
                </div>
                {/* Pill toggle */}
                <div
                  style={{
                    width: 44, height: 24, borderRadius: 12, flexShrink: 0, cursor: "pointer",
                    background: minigamesEnabled ? "#1a3a1a" : "#0d180d",
                    border: `1px solid ${minigamesEnabled ? "#c8f55a" : "#1a2e1a"}`,
                    position: "relative", transition: "background 0.2s, border-color 0.2s",
                  }}
                  onClick={() => setMinigamesEnabled(!minigamesEnabled)}
                >
                  <div style={{
                    position: "absolute", width: 17, height: 17, borderRadius: "50%",
                    background: minigamesEnabled ? "#c8f55a" : "#2a5a2a",
                    top: 3, left: minigamesEnabled ? 24 : 3,
                    transition: "left 0.2s, background 0.2s",
                    boxShadow: minigamesEnabled ? "0 0 4px #c8f55a88" : "none",
                  }} />
                </div>
              </div>
              {/* Expandable subtext */}
              {minigameRuleExpanded && (
                <div style={{ fontSize: 11, color: "#4a6a4a", letterSpacing: 0.5, lineHeight: 1.5, textAlign: "left" }}>
                  {`If turned on, ${bracketSize >= 32 ? 5 : bracketSize >= 16 ? 4 : 3} random matchups will start with pre-match minigames between two randomly selected players. The winner of the minigame will get a double-vote on the following matchup. Note: pre-match minigames cannot happen on the final vote because a true champion should earn its trophy.`}
                </div>
              )}
            </div>

            {/* One at a time toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ fontSize: 12, letterSpacing: 2, color: sequentialVoting ? "#c8f55a" : "#4a6a4a" }}>
                ONE AT A TIME
              </div>
              <div
                style={{
                  width: 44, height: 24, borderRadius: 12, flexShrink: 0, cursor: "pointer",
                  background: sequentialVoting ? "#1a3a1a" : "#0d180d",
                  border: `1px solid ${sequentialVoting ? "#c8f55a" : "#1a2e1a"}`,
                  position: "relative", transition: "background 0.2s, border-color 0.2s",
                }}
                onClick={() => setSequentialVoting(!sequentialVoting)}
              >
                <div style={{
                  position: "absolute", width: 17, height: 17, borderRadius: "50%",
                  background: sequentialVoting ? "#c8f55a" : "#2a5a2a",
                  top: 3, left: sequentialVoting ? 24 : 3,
                  transition: "left 0.2s, background 0.2s",
                  boxShadow: sequentialVoting ? "0 0 4px #c8f55a88" : "none",
                }} />
              </div>
            </div>

            {/* Simple UX toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ fontSize: 12, letterSpacing: 2, color: simpleUX ? "#c8f55a" : "#4a6a4a" }}>
                SIMPLE UX
              </div>
              <div
                style={{
                  width: 44, height: 24, borderRadius: 12, flexShrink: 0, cursor: "pointer",
                  background: simpleUX ? "#1a3a1a" : "#0d180d",
                  border: `1px solid ${simpleUX ? "#c8f55a" : "#1a2e1a"}`,
                  position: "relative", transition: "background 0.2s, border-color 0.2s",
                }}
                onClick={() => setSimpleUX(!simpleUX)}
              >
                <div style={{
                  position: "absolute", width: 17, height: 17, borderRadius: "50%",
                  background: simpleUX ? "#c8f55a" : "#2a5a2a",
                  top: 3, left: simpleUX ? 24 : 3,
                  transition: "left 0.2s, background 0.2s",
                  boxShadow: simpleUX ? "0 0 4px #c8f55a88" : "none",
                }} />
              </div>
            </div>
          </div>

          <button
            style={{ ...vs.startGameBtn, width: 280, marginTop: 8 }}
            onClick={() => setHostSettingsConfirmed(true)}
          >
            LOOKS GOOD →
          </button>
          <button style={vs.backBtn} onClick={() => { setRandomMode(false); selectCategory(null); }}>
            ← BACK
          </button>
          <button style={vs.logOffBtn} onClick={handleLogOff}>LOG OFF</button>
        </div>
      );
    }

    if (isHost && category && hostSettingsConfirmed) {
      // ── Start game page ──
      const displayCategory = randomMode && category === "Custom" ? "RANDOM" : category;
      return (
        <div style={vs.root}>
          {muteButton}
          <div style={vs.lobbyTitle}>BRACKETS</div>
          <div style={vs.categorySelected}>
            <div style={vs.catLabel}>CATEGORY</div>
            <div style={vs.catName}>{displayCategory.toUpperCase()}</div>
          </div>
          <div style={vs.playerCountLobby}>
            {playerCount} player{playerCount !== 1 ? "s" : ""} joined
          </div>
          <button style={{ ...vs.startGameBtn, width: 280 }} onClick={startGame}>
            ▶ START GAME
          </button>
          <button style={vs.backBtn} onClick={() => setHostSettingsConfirmed(false)}>
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
        <div style={vs.lobbyTitle}>BRACKETS</div>
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
        {!simpleUX && playerNames && Object.keys(playerNames).length > 0 && (
          <div style={vs.lobbyNamesList}>
            {Object.entries(playerNames).map(([pid, name], i) => {
              const isMe    = pid === playerId.current;
              const colorIdx = playerColors?.[pid] ?? i;
              const color    = PLAYER_COLORS[colorIdx % PLAYER_COLORS.length];
              return (
                <span key={pid} className="anim-nameTagIn" style={{
                  ...vs.lobbyNameTag,
                  animationDelay: `${i * 50}ms`,
                  color,
                  background: isMe ? "#0f2a0f" : "#0a140a",
                  border: `1px solid ${isMe ? color : "#1a2e1a"}`,
                  boxShadow: isMe ? `0 0 10px ${color}55` : "none",
                  fontWeight: isMe ? "bold" : "normal",
                }}>{name}</span>
              );
            })}
          </div>
        )}
        <div style={vs.waitNote}>Waiting for host to start…</div>
        <button style={vs.logOffBtn} onClick={handleLogOff}>LOG OFF</button>
      </div>
    );
  }

  // ── Champion ──
  if (champion || phase === "finished") {
    const bracketText = bracket ? formatBracketText(bracket, category, champion) : null;
    const handleCopy = () => {
      if (!bracketText) return;
      navigator.clipboard.writeText(bracketText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    };
    return (
      <div style={{ ...vs.root, justifyContent: "flex-start", overflowY: "auto", paddingTop: 48 }}>
        {muteButton}
        <div className="anim-champReveal" style={vs.champBox}>
          <div className="anim-trophyBounce" style={vs.champEmoji}>🏆</div>
          <div style={vs.champLabel}>CHAMPION</div>
          <div className="anim-glowPulse" style={vs.champName}>{champion}</div>
        </div>
        {!simpleUX && bracketText && (
          <button style={vs.copyBtn} onClick={handleCopy}>
            {copied ? "COPIED!" : "COPY BRACKET"}
          </button>
        )}
        {!simpleUX && bracket && <BracketTextView bracket={bracket} />}
        {isHost
          ? <button style={vs.skipBtn} onClick={playAgain}>↺ PLAY AGAIN</button>
          : <div style={{ ...vs.waitNote, marginTop: 16 }}>Host can start a new round</div>
        }
        <button style={vs.logOffBtn} onClick={handleLogOff}>LOG OFF</button>

        <Confetti active={confettiActive} />
      </div>
    );
  }

  // ── Tiebreaker — host picks method ──
  if (phase === "tiebreaker" && tiebreaker && isHost) {
    return (
      <div style={{ ...vs.root, paddingBottom: "max(180px, calc(env(safe-area-inset-bottom) + 160px))" }}>
        {muteButton}
        <div style={vs.tiebreakerTitle}>TIE!</div>
        <div style={vs.tiebreakerVs}>{tiebreaker.c0} vs {tiebreaker.c1}</div>
        {!simpleUX && (
          <>
            <div style={vs.lobbySubtitle}>How to break the tie?</div>
            <button style={{ ...vs.startGameBtn, width: 280, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={startRPS}>
              <RockIcon size={22} /> ROCK PAPER SCISSORS
            </button>
            <button style={{ ...vs.startGameBtn, width: 280, marginTop: 8 }} onClick={startOneSecond}>
              ⏱ ONE SECOND
            </button>
            <button style={{ ...vs.startGameBtn, width: 280, marginTop: 8 }} onClick={startShapeHalve}>
              ✂ SHAPE HALVING
            </button>
            <div style={vs.tiebreakerOr}>— OR —</div>
          </>
        )}
        <div style={vs.lobbySubtitle}>Pick the winner:</div>
        <button style={vs.choiceBtn} onClick={() => hostPickWinner(tiebreaker.c0)}
          onTouchEnd={(e) => { e.preventDefault(); hostPickWinner(tiebreaker.c0); }}>
          {tiebreaker.c0}
        </button>
        <button style={vs.choiceBtn} onClick={() => hostPickWinner(tiebreaker.c1)}
          onTouchEnd={(e) => { e.preventDefault(); hostPickWinner(tiebreaker.c1); }}>
          {tiebreaker.c1}
        </button>
        {!simpleUX && reactionBar}
      </div>
    );
  }

  // ── Tiebreaker — non-host waiting ──
  if (phase === "tiebreaker" && tiebreaker && !isHost) {
    return (
      <div style={{ ...vs.root, paddingBottom: "max(180px, calc(env(safe-area-inset-bottom) + 160px))" }}>
        {muteButton}
        <div style={vs.tiebreakerTitle}>TIE!</div>
        <div style={vs.tiebreakerVs}>{tiebreaker.c0} vs {tiebreaker.c1}</div>
        <div style={vs.status}>Host is deciding…</div>
        {!simpleUX && reactionBar}
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

    // Show result only after the main screen has revealed it
    if (rps.result && rps.result !== "draw" && rps.revealed) {
      const rpsWinnerName = rps.result === "p1" ? tiebreaker.c0 : tiebreaker.c1;
      return (
        <div style={{ ...vs.root, paddingBottom: "max(180px, calc(env(safe-area-inset-bottom) + 160px))" }}>
          {muteButton}
          <div style={vs.tiebreakerTitle}>RPS RESULT</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "center", margin: "-15px 0" }}>
            <RpsIcon choice={rps.choice1} size={48} />
            <span style={{ fontSize: 12, letterSpacing: 4, color: "#7a9a7a" }}>vs</span>
            <RpsIcon choice={rps.choice2} size={48} />
          </div>
          <div style={vs.champName}>{rpsWinnerName} WINS!</div>
          {reactionBar}
        </div>
      );
    }

    if (rps.result === "draw" && rps.revealed) {
      return (
        <div style={{ ...vs.root, paddingBottom: "max(180px, calc(env(safe-area-inset-bottom) + 160px))" }}>
          {muteButton}
          <div style={vs.tiebreakerTitle}>DRAW!</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "center", margin: "-15px 0" }}>
            <RpsIcon choice={rps.choice1} size={48} />
            <span style={{ fontSize: 12, letterSpacing: 4, color: "#7a9a7a" }}>vs</span>
            <RpsIcon choice={rps.choice2} size={48} />
          </div>
          <div style={vs.status}>Going again…</div>
          {reactionBar}
        </div>
      );
    }

    // effectivelyChosen: player clicked in THIS round (not a stale value from a previous draw round)
    const effectivelyChosen = rpsChosen && rpsChosenRoundRef.current === rps.round;

    if (amInRPS && !effectivelyChosen) {
      return (
        <div style={{ ...vs.root, paddingBottom: "max(180px, calc(env(safe-area-inset-bottom) + 160px))" }}>
          {muteButton}
          <div style={vs.tiebreakerTitle}>ROCK PAPER SCISSORS</div>
          <div style={vs.lobbySubtitle}>Round {rps.round} · You're playing for {mySide}</div>
          <div style={vs.rpsRow}>
            <button style={vs.rpsBtn} onClick={() => { rpsChosenRoundRef.current = rps.round; setRpsChosen(true); submitRPS(playerId.current, "rock"); }}>
              <RockIcon size={40} />
              <span style={vs.rpsBtnLabel}>ROCK</span>
            </button>
            <button style={vs.rpsBtn} onClick={() => { rpsChosenRoundRef.current = rps.round; setRpsChosen(true); submitRPS(playerId.current, "paper"); }}>
              <PaperIcon size={40} />
              <span style={vs.rpsBtnLabel}>PAPER</span>
            </button>
            <button style={vs.rpsBtn} onClick={() => { rpsChosenRoundRef.current = rps.round; setRpsChosen(true); submitRPS(playerId.current, "scissors"); }}>
              <ScissorsIcon size={40} />
              <span style={vs.rpsBtnLabel}>SCISSORS</span>
            </button>
          </div>
          {reactionBar}
          {!tutorialDismissed && (
            <div
              onClick={() => setTutorialDismissed(true)}
              style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px" }}
            >
              <style>{`
                @keyframes rpsPopIn { 0% { transform: scale(0) rotate(-20deg); opacity: 0; } 70% { transform: scale(1.12) rotate(4deg); } 100% { transform: scale(1) rotate(0deg); opacity: 1; } }
                @keyframes tapPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
              `}</style>
              <div style={{ background: "#060e06", border: "1px solid #2a4a2a", borderRadius: 16, padding: "28px 24px", maxWidth: 320, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
                <div style={{ fontSize: 10, letterSpacing: 4, color: "#4a6a4a" }}>{tiebreaker?.preMatch ? "PRE-MATCH CHALLENGE" : "TIEBREAKER"}</div>
                <div style={{ fontSize: 20, letterSpacing: 3, color: "#c8f55a", fontFamily: _mono }}>ROCK PAPER SCISSORS</div>
                <div style={{ display: "flex", gap: 28 }}>
                  {[{ Icon: RockIcon, label: "ROCK", delay: "0.1s" }, { Icon: PaperIcon, label: "PAPER", delay: "0.25s" }, { Icon: ScissorsIcon, label: "SCISSORS", delay: "0.4s" }].map(({ Icon, label, delay }) => (
                    <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, animation: `rpsPopIn 0.45s ${delay} both` }}>
                      <Icon size={48} />
                      <span style={{ fontSize: 9, letterSpacing: 3, color: "#7a9a7a" }}>{label}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12, letterSpacing: 1.5, color: "#7a9a7a", textAlign: "center", lineHeight: 1.9 }}>
                  {tiebreaker?.preMatch
                    ? "You've been selected to compete!\nPick your move.\nThe winner gets a double vote."
                    : `You've been selected to compete for ${mySide}!\nWin the tiebreaker to move ${mySide} into the next round.`}
                </div>
                <div style={{ fontSize: 10, letterSpacing: 4, color: "#4a6a4a", animation: "tapPulse 1.5s ease-in-out infinite" }}>
                  TAP TO CONTINUE
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (amInRPS && effectivelyChosen) {
      return (
        <div style={{ ...vs.root, paddingBottom: "max(180px, calc(env(safe-area-inset-bottom) + 160px))" }}>
          {muteButton}
          <RockIcon size={56} style={{ margin: "0 auto 8px" }} />
          <div style={vs.status}>Waiting for opponent…</div>
          {reactionBar}
        </div>
      );
    }

    // Spectator during RPS
    return (
      <div style={{ ...vs.root, paddingBottom: "max(180px, calc(env(safe-area-inset-bottom) + 160px))" }}>
        <div style={vs.tiebreakerTitle}>ROCK PAPER SCISSORS</div>
        <div style={vs.tiebreakerVs}>{tiebreaker.c0} vs {tiebreaker.c1}</div>
        <div style={vs.lobbySubtitle}>Round {rps.round}</div>
        <div style={vs.status}>Two players are battling it out…</div>
        {reactionBar}
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

    const osPrompt = (elapsed) => {
      const diff = Math.abs(elapsed - 1000);
      if (diff === 0) return "PERFECT! All glory to the timer god!";
      if (diff <= 100) return "Nice job! That's pretty good!";
      if (diff <= 200) return "Solid! I think you can do better though.";
      if (diff <= 300) return "Not bad. Not great, but not bad.";
      return "Oof better luck next time";
    };

    // ── Final result ──
    if (os.osPhase === "done") {
      const d1 = Math.abs(os.elapsed1 - 1000);
      const d2 = Math.abs(os.elapsed2 - 1000);
      const winnerName = os.winner === "p1" ? tiebreaker.c0 : tiebreaker.c1;
      return (
        <div style={{ ...vs.root, paddingBottom: "max(180px, calc(env(safe-area-inset-bottom) + 160px))" }}>
          {muteButton}
          <div style={vs.tiebreakerTitle}>ONE SECOND</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 300 }}>
            <div style={vs.osResultRow}>
              <span style={vs.osResultName}>{p1Name}</span>
              <span style={{ ...vs.osResultTime, color: os.winner === "p1" ? "#c8f55a" : "#7a9a7a" }}>{fmtMs(os.elapsed1)}s</span>
              <span style={vs.osResultDiff}>±{fmtMs(d1)}s</span>
            </div>
            <div style={vs.osResultRow}>
              <span style={vs.osResultName}>{p2Name}</span>
              <span style={{ ...vs.osResultTime, color: os.winner === "p2" ? "#c8f55a" : "#7a9a7a" }}>{fmtMs(os.elapsed2)}s</span>
              <span style={vs.osResultDiff}>±{fmtMs(d2)}s</span>
            </div>
          </div>
          <div style={vs.champName}>{winnerName} WINS!</div>
          {(amP1 || amP2) && (
            <div style={{ fontSize: 12, letterSpacing: 2, color: "#7a9a7a", textAlign: "center", marginTop: 4 }}>
              {osPrompt(amP1 ? os.elapsed1 : os.elapsed2)}
            </div>
          )}
          {reactionBar}
        </div>
      );
    }

    // Tutorial cursor computation — hoisted so spectator (P2) can also use it
    const OS_TARGETS = [1150, 873, 1048, 758];
    const T = OS_TARGETS[tutorialIdx] ?? 1150;
    const cycleMs = tutorialTimerMs;
    const TIMER_START = 600;
    const TRAVEL = 250;
    const STOP_ARRIVE = TIMER_START + T;
    const MOVE_START = STOP_ARRIVE - TRAVEL;
    const timerDisplayMs = Math.max(0, Math.min(cycleMs - TIMER_START, T));
    const cursorX = cycleMs < MOVE_START ? -58 : cycleMs >= STOP_ARRIVE ? 58 : -58 + ((cycleMs - MOVE_START) / TRAVEL) * 116;
    const cursorScale = (cycleMs >= 500 && cycleMs < 600) || (cycleMs >= STOP_ARRIVE && cycleMs < STOP_ARRIVE + 50) ? 0.6 : 1;
    const fadeStart = STOP_ARRIVE + 500;
    const cursorOpacity = cycleMs < 200 ? 0 : cycleMs < 400 ? (cycleMs - 200) / 200 : cycleMs < fadeStart ? 1 : Math.max(0, 1 - (cycleMs - fadeStart) / 300);
    const startBtnActive = cycleMs < TIMER_START + 100;
    const stopBtnActive = cycleMs >= TIMER_START && cycleMs < STOP_ARRIVE + 150;
    const osTutorialOverlay = !tutorialDismissed && (
      <div
        onClick={() => setTutorialDismissed(true)}
        style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px" }}
      >
        <style>{`@keyframes tapPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }`}</style>
        <div style={{ background: "#060e06", border: "1px solid #2a4a2a", borderRadius: 16, padding: "28px 24px", maxWidth: 320, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 10, letterSpacing: 4, color: "#4a6a4a" }}>{tiebreaker?.preMatch ? "PRE-MATCH CHALLENGE" : "TIEBREAKER"}</div>
          <div style={{ fontSize: 20, letterSpacing: 3, color: "#c8f55a", fontFamily: _mono }}>ONE SECOND</div>
          <div style={{ fontSize: 52, fontWeight: "bold", letterSpacing: 2, color: "#c8f55a", fontFamily: _mono, fontVariantNumeric: "tabular-nums", textShadow: "0 0 20px #c8f55a55" }}>
            {(timerDisplayMs / 1000).toFixed(3)}s
          </div>
          <div style={{ width: 220, height: 3, background: "#1a2e1a", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", background: "#c8f55a", borderRadius: 2, width: `${T > 0 ? Math.min(timerDisplayMs / T * 100, 100) : 0}%` }} />
          </div>
          <div style={{ position: "relative", display: "flex", gap: 12, width: 220 }}>
            <div style={{ flex: 1, padding: "14px 0", textAlign: "center", fontFamily: _mono, fontSize: 13, letterSpacing: 3, fontWeight: "bold", color: "#c8f55a", background: "#0a1f0a", border: "2px solid #c8f55a", borderRadius: 8, opacity: startBtnActive ? 1 : 0.25 }}>START</div>
            <div style={{ flex: 1, padding: "14px 0", textAlign: "center", fontFamily: _mono, fontSize: 13, letterSpacing: 3, fontWeight: "bold", color: "#c85a5a", background: "#1a0a0a", border: "2px solid #c85a5a", borderRadius: 8, opacity: stopBtnActive ? 1 : 0.25 }}>STOP</div>
            <div style={{ position: "absolute", width: 16, height: 16, borderRadius: "50%", background: "rgba(255,255,255,0.95)", boxShadow: "0 0 10px rgba(200,245,90,0.9)", top: "50%", left: "50%", marginLeft: -8, marginTop: -8, transform: `translateX(${cursorX}px) scale(${cursorScale})`, opacity: cursorOpacity, pointerEvents: "none", zIndex: 2 }} />
          </div>
          <div style={{ fontSize: 12, letterSpacing: 1.5, color: "#7a9a7a", textAlign: "center", lineHeight: 1.9 }}>
            {tiebreaker?.preMatch
              ? "You've been selected to compete!\nPress START then STOP\nas close to 1.000 seconds as possible.\nClosest to 1.000s wins!"
              : `You've been selected to compete for ${mySide}!\nWin the tiebreaker to move ${mySide} into the next round.\nPress START then STOP as close to 1.000s as possible.`}
          </div>
          <div style={{ fontSize: 10, letterSpacing: 4, color: "#4a6a4a", animation: "tapPulse 1.5s ease-in-out infinite" }}>
            TAP TO CONTINUE
          </div>
        </div>
      </div>
    );

    // ── Active player — waiting to start or timer running ──
    if (amActive && (
      (os.osPhase === "waiting_p1" && amP1) || (os.osPhase === "waiting_p2" && amP2) ||
      (os.osPhase === "running_p1" && amP1) || (os.osPhase === "running_p2" && amP2)
    )) {
      const isRunning = os.osPhase === "running_p1" || os.osPhase === "running_p2";
      return (
        <div style={{ ...vs.root, paddingBottom: "max(180px, calc(env(safe-area-inset-bottom) + 160px))" }}>
          {muteButton}
          <div style={vs.tiebreakerTitle}>ONE SECOND</div>
          <div style={vs.lobbySubtitle}>You're playing for</div>
          <div style={{ fontSize: 20, letterSpacing: 3, color: "#c8f55a" }}>{mySide}</div>
          <div style={vs.osTimerDisplay}>{isRunning ? fmtMs(osDisplayMs) : "0.000"}</div>
          <div style={{ display: "flex", gap: 12, width: "100%", maxWidth: 280 }}>
            <button
              style={{ ...vs.osHalfBtn, opacity: isRunning ? 0.25 : 1 }}
              disabled={isRunning}
              onClick={() => { osStartRef.current = Date.now(); startOSTimer(playerId.current); }}
            >
              START
            </button>
            <button
              style={{ ...vs.osHalfBtn, background: "#1a0a0a", borderColor: "#c85a5a", color: "#c85a5a", opacity: isRunning ? 1 : 0.25 }}
              disabled={!isRunning}
              onClick={() => { const elapsed = osStartRef.current ? Date.now() - osStartRef.current : osDisplayMs; stopOSTimer(playerId.current, elapsed); }}
            >
              STOP
            </button>
          </div>
          {reactionBar}
          {osTutorialOverlay}
        </div>
      );
    }

    // ── Active player — done, waiting for P2 ──
    if (amP1 && (os.osPhase === "done_p1" || os.osPhase === "waiting_p2")) {
      return (
        <div style={{ ...vs.root, paddingBottom: "max(180px, calc(env(safe-area-inset-bottom) + 160px))" }}>
          {muteButton}
          <div style={vs.tiebreakerTitle}>ONE SECOND</div>
          <div style={vs.lobbySubtitle}>Your time</div>
          <div style={{ fontSize: 48, fontWeight: "bold", letterSpacing: 2, color: "#c8f55a", fontVariantNumeric: "tabular-nums" }}>
            {fmtMs(os.elapsed1)}s
          </div>
          <div style={{ fontSize: 12, letterSpacing: 3, color: "#7a9a7a" }}>
            ±{fmtMs(Math.abs(os.elapsed1 - 1000))}s from 1.000
          </div>
          <div style={{ fontSize: 12, letterSpacing: 2, color: "#7a9a7a", textAlign: "center", marginTop: 4 }}>
            {osPrompt(os.elapsed1)}
          </div>
          <div style={vs.status}>Waiting for {p2Name}…</div>
          {reactionBar}
        </div>
      );
    }

    // ── Spectator / observer — show live timer or results ──
    const isRunning = os.osPhase === "running_p1" || os.osPhase === "running_p2";
    return (
      <div style={{ ...vs.root, paddingBottom: "max(180px, calc(env(safe-area-inset-bottom) + 160px))" }}>
        {muteButton}
        <div style={vs.tiebreakerTitle}>ONE SECOND</div>
        <div style={vs.tiebreakerVs}>{tiebreaker.c0} vs {tiebreaker.c1}</div>
        {isRunning && (
          <div style={vs.osTimerDisplay}>{fmtMs(osDisplayMs)}</div>
        )}
        {os.elapsed1 != null && !isRunning && (
          <div style={{ fontSize: 13, letterSpacing: 2, color: "#7a9a7a", marginTop: 8 }}>
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
        {reactionBar}
        {amP2 && osTutorialOverlay}
      </div>
    );
  }

  // ── Shape Halve Phase ──
  if (phase === "shapeHalve" && tiebreaker?.shapeHalve) {
    const sh = tiebreaker.shapeHalve;
    const amP1 = playerId.current === sh.player1;
    const amP2 = playerId.current === sh.player2;
    const amActive = amP1 || amP2;
    const p1Name = (playerNames && playerNames[sh.player1]) || "Player 1";
    const p2Name = (playerNames && playerNames[sh.player2]) || "Player 2";
    const p1Color = PLAYER_COLORS[(playerColors?.[sh.player1] ?? 0) % PLAYER_COLORS.length];
    const p2Color = PLAYER_COLORS[(playerColors?.[sh.player2] ?? 0) % PLAYER_COLORS.length];
    const myColor = amP1 ? p1Color : amP2 ? p2Color : "#c8f55a";


    // ── Done — results screen ──
    if (sh.shPhase === "done") {
      const winnerName = sh.winner === "p1"
        ? (tiebreaker.preMatch ? p1Name : tiebreaker.c0)
        : (tiebreaker.preMatch ? p2Name : tiebreaker.c1);
      return (
        <ShapeHalveResultScreen
          sh={sh} p1Name={p1Name} p2Name={p2Name} p1Color={p1Color} p2Color={p2Color}
          winnerName={winnerName} preMatch={!!tiebreaker.preMatch}
          p1Option={tiebreaker.c0} p2Option={tiebreaker.c1}
          muteButton={muteButton} reactionBar={reactionBar}
        />
      );
    }

    // ── Cutting phase ──
    if (sh.shPhase === "cutting") {
      const mySubmitted = (amP1 && sh.ratio1 != null) || (amP2 && sh.ratio2 != null);
      const otherName = amP1 ? p2Name : p1Name;

      // Active player who hasn't cut yet — show interactive canvas
      if (amActive && !mySubmitted) {
        return (
          <ShapeHalveCutScreen
            seed={sh.seed} myColor={myColor}
            onSubmit={(lineData, ratio) => submitShapeHalve(playerId.current, lineData, ratio)}
            muteButton={muteButton} reactionBar={reactionBar}
            preMatch={!!tiebreaker.preMatch}
          />
        );
      }

      // Active player who already submitted — show their cut + waiting
      if (amActive && mySubmitted) {
        const myLine = amP1 ? sh.line1 : sh.line2;
        const myRatio = amP1 ? sh.ratio1 : sh.ratio2;
        return (
          <div style={{ ...vs.root, gap: 16 }}>
            {muteButton}
            <div style={vs.tiebreakerTitle}>SHAPE HALVING</div>
            <ShapeDisplay seed={sh.seed} line={myLine} lineColor={myColor} size={240} />
            <div style={{ textAlign: "center", fontFamily: "'PT Mono', monospace" }}>
              <div style={{ fontSize: 11, letterSpacing: 3, color: "#6a8a6a", marginBottom: 4 }}>YOUR CUT</div>
              <div style={{ fontSize: 18, color: "#c8f55a", letterSpacing: 1 }}>{(myRatio * 100).toFixed(1)}% off center</div>
            </div>
            <div style={{ fontSize: 11, letterSpacing: 3, color: "#6a8a6a" }}>
              Waiting for {otherName}…
            </div>
            {reactionBar}
          </div>
        );
      }

      // Spectator — show shape with no lines (both cutting simultaneously)
      return (
        <div style={{ ...vs.root, gap: 16 }}>
          {muteButton}
          <div style={vs.tiebreakerTitle}>SHAPE HALVING</div>
          <ShapeDisplay seed={sh.seed} size={240} />
          <div style={{ fontSize: 13, letterSpacing: 3, color: "#6a8a6a", textAlign: "center" }}>
            {p1Name} &amp; {p2Name} are cutting…
          </div>
          {reactionBar}
        </div>
      );
    }
  }

  // ── RPS result linger screen — must come before all vote-screen guards so
  //    stale voted/match state can't flash through on the first render after
  //    phase changes to "playing".
  if (showRpsLinger && rpsLingerDataRef.current) {
    const lingerRps = rpsLingerDataRef.current.rps;
    const isPreMatchLinger = !!rpsLingerDataRef.current?.preMatch;
    const winnerPid = lingerRps.result === "p1" ? lingerRps.player1 : lingerRps.player2;
    const rpsWinnerName = isPreMatchLinger
      ? (playerNames?.[winnerPid] || "?")
      : (lingerRps.result === "p1" ? rpsLingerDataRef.current.c0 : rpsLingerDataRef.current.c1);
    return (
      <div style={vs.root}>
        {muteButton}
        <div style={vs.tiebreakerTitle}>{isPreMatchLinger ? "PRE-MATCH CHALLENGE" : "RPS RESULT"}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "center", margin: "-15px 0" }}>
          <RpsIcon choice={lingerRps.choice1} size={48} />
          <span style={{ fontSize: 12, letterSpacing: 4, color: "#7a9a7a" }}>vs</span>
          <RpsIcon choice={lingerRps.choice2} size={48} />
        </div>
        <div style={vs.champName}>
          {isPreMatchLinger ? `${rpsWinnerName}'S VOTE COUNTS DOUBLE!` : `${rpsWinnerName} WINS!`}
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
    // Live vote split for the current match
    const votedMatch = bracket && currentMatchId
      ? allMatches(bracket).find(m => m.id === currentMatchId)
      : null;
    const [vc0, vc1] = votedMatch ? votedMatch.contenders : [null, null];
    const vv0 = (vc0 && votedMatch?.votes?.[vc0]) || 0;
    const vv1 = (vc1 && votedMatch?.votes?.[vc1]) || 0;
    const vvTotal = vv0 + vv1;
    const myScore = scores && scores[playerId.current];
    const roundLabelV = getRoundLabel(bracket, currentMatchId);
    return (
      <div style={{ ...vs.root, paddingBottom: "max(180px, calc(env(safe-area-inset-bottom) + 160px))" }}>
        {muteButton}
        <div style={vs.votedBox}>
          <div className="anim-voteCheckIn" style={vs.votedCheck}>✓</div>
          <div className="anim-slideUp" style={{ ...vs.votedText, animationDelay: "80ms" }}>Vote submitted!</div>
          {!simpleUX && roundLabelV && (
            <div className={roundLabelV === "THE FINAL" ? "anim-finalGlow" : ""} style={{
              ...vs.roundBadge,
              marginBottom: 0,
              ...(roundLabelV === "THE FINAL" ? { fontSize: 11, letterSpacing: 6, color: "#c8f55a", padding: "6px 20px" } : {}),
            }}>{roundLabelV}</div>
          )}
          {!simpleUX && vvTotal > 0 && vc0 && vc1 && (
            <div style={{ width: "100%", marginTop: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, letterSpacing: 2, color: "#7a9a7a", marginBottom: 4 }}>
                <span>{vc0}</span>
                <span>{vc1}</span>
              </div>
              <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", background: "#0a140a" }}>
                <div style={{ width: `${(vv0 / vvTotal) * 100}%`, background: "#c8f55a", transition: "width 0.4s ease" }} />
                <div style={{ flex: 1, background: "#1a4a1a" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, letterSpacing: 1, color: "#7a9a7a", marginTop: 3 }}>
                <span>{Math.round((vv0 / vvTotal) * 100)}%</span>
                <span>{Math.round((vv1 / vvTotal) * 100)}%</span>
              </div>
            </div>
          )}
          <div style={vs.votedCount}>
            {votedCount}/{totalPlayers} voted
          </div>
          {!simpleUX && myScore && myScore.total > 0 && (
            <div style={{ fontSize: 10, letterSpacing: 2, color: "#7a9a7a", marginTop: 4 }}>
              YOUR ACCURACY: <span style={{ color: "#c8f55a" }}>{Math.round((myScore.correct / myScore.total) * 100)}%</span>
              {" "}<span style={{ color: "#6a8a6a" }}>({myScore.correct}/{myScore.total})</span>
            </div>
          )}
          <div style={vs.waitingNote}>Waiting for others…</div>
        </div>
        {isHost && (
          <button style={vs.skipBtn} onClick={skip}>SKIP →</button>
        )}
        {!simpleUX && reactionBar}
      </div>
    );
  }

  // ── Sequential voting: not my turn yet ──
  const isMyTurn = !sequentialVoting || votingQueue[votingQueueIndex] === playerId.current;
  if (sequentialVoting && !isMyTurn) {
    const currentVoterPid  = votingQueue[votingQueueIndex];
    const currentVoterName = playerNames?.[currentVoterPid] || "?";
    const currentVoterColor = PLAYER_COLORS[(playerColors?.[currentVoterPid] ?? 0) % PLAYER_COLORS.length];
    const myQueuePos = votingQueue.indexOf(playerId.current);
    const turnsLeft  = myQueuePos >= 0 ? myQueuePos - votingQueueIndex : votingQueue.length - votingQueueIndex;
    return (
      <div style={{ ...vs.root, justifyContent: "center", gap: 20 }}>
        {muteButton}
        {!simpleUX && <div style={{ fontSize: 9, letterSpacing: 5, color: "#4a6a4a" }}>SEQUENTIAL VOTING</div>}
        {/* Current voter spotlight */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
          background: "#060e06", border: `2px solid ${currentVoterColor}`,
          borderRadius: 16, padding: "24px 32px",
          boxShadow: `0 0 24px ${currentVoterColor}44` }}>
          <div style={{ fontSize: 11, letterSpacing: 4, color: "#6a8a6a" }}>NOW VOTING</div>
          <div style={{ fontSize: 28, letterSpacing: 2, color: currentVoterColor, fontWeight: "bold",
            animation: "blink 1.4s step-end infinite" }}>
            {currentVoterName}
          </div>
          {!simpleUX && (
            <div style={{ fontSize: 10, letterSpacing: 2, color: "#6a8a6a" }}>
              {votingQueueIndex + 1} of {votingQueue.length}
            </div>
          )}
        </div>
        {/* My position in queue */}
        {myQueuePos >= 0 && (
          <div style={{ fontSize: 11, letterSpacing: 3, color: "#4a6a4a" }}>
            YOUR TURN IN <span style={{ color: myColorHex }}>{turnsLeft}</span>
          </div>
        )}
        {/* Queue list */}
        {!simpleUX && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", maxWidth: 240 }}>
            {votingQueue.map((pid, i) => {
              const color   = PLAYER_COLORS[(playerColors?.[pid] ?? 0) % PLAYER_COLORS.length];
              const isCur   = i === votingQueueIndex;
              const isDone  = i < votingQueueIndex;
              const isMe    = pid === playerId.current;
              return (
                <div key={pid} style={{ display: "flex", alignItems: "center", gap: 10,
                  opacity: isDone ? 0.4 : isCur ? 1 : 0.6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                    background: isCur ? color : isDone ? color : "transparent",
                    border: `2px solid ${color}`,
                    boxShadow: isCur ? `0 0 8px ${color}` : "none" }} />
                  <span style={{ fontSize: 12, letterSpacing: 1, color: isCur ? color : "#6a8a6a",
                    fontWeight: isCur || isMe ? "bold" : "normal" }}>
                    {playerNames?.[pid] || "?"}
                    {isMe ? " (you)" : ""}
                  </span>
                  {isDone && <span style={{ marginLeft: "auto", fontSize: 10, color: "#4a6a4a" }}>✓</span>}
                  {isCur && <span style={{ marginLeft: "auto", fontSize: 9, color, animation: "blink 0.9s step-end infinite" }}>●</span>}
                </div>
              );
            })}
          </div>
        )}
        {!simpleUX && reactionBar}
      </div>
    );
  }

  // ── Vote screen ──
  const roundLabel = getRoundLabel(bracket, currentMatchId);
  const isFinal = roundLabel === "THE FINAL";
  return (
    <div style={{ ...vs.root, paddingBottom: "max(180px, calc(env(safe-area-inset-bottom) + 160px))" }}>
      {!simpleUX && <BracketBotVertical color={myColorHex} />}
      {muteButton}
      {!simpleUX && roundLabel && (
        <div className={isFinal ? "anim-finalGlow" : ""} style={{
          ...vs.roundBadge,
          ...(isFinal ? { fontSize: 11, letterSpacing: 6, color: "#c8f55a", padding: "6px 20px" } : {}),
        }}>{roundLabel}</div>
      )}
      {/* Sequential: YOUR TURN banner */}
      {sequentialVoting && (
        <div style={{ fontSize: 13, letterSpacing: 5, color: myColorHex, background: "#060e06",
          border: `2px solid ${myColorHex}`, borderRadius: 20, padding: "6px 20px",
          boxShadow: `0 0 16px ${myColorHex}66`, animation: "voteDotIn 0.3s ease both" }}>
          ★ YOUR TURN ★
        </div>
      )}
      {doubleVoter === playerId.current && (
        <div style={{ fontSize: 11, letterSpacing: 4, color: "#c8f55a", background: "#0a1f0a",
          border: "1px solid #c8f55a", borderRadius: 20, padding: "5px 16px",
          boxShadow: "0 0 10px #c8f55a33" }}>
          ⚡ YOUR VOTE COUNTS DOUBLE!
        </div>
      )}
      {!simpleUX && doubleVoter && doubleVoter !== playerId.current && (
        <div style={{ fontSize: 10, letterSpacing: 3, color: "#7a9a7a", background: "#0a1a0a",
          border: "1px solid #1a2e1a", borderRadius: 20, padding: "4px 14px" }}>
          ⚡ {playerNames?.[doubleVoter] || "?"} votes double this round
        </div>
      )}
      {!simpleUX && <div style={vs.header}>TAP TO VOTE</div>}
      <button style={vs.choiceBtn} onClick={() => vote(c0)}
        onTouchEnd={(e) => { e.preventDefault(); vote(c0); }}>
        {c0}
      </button>
      <div style={vs.vsLabel}>VS</div>
      <button style={vs.choiceBtn} onClick={() => vote(c1)}
        onTouchEnd={(e) => { e.preventDefault(); vote(c1); }}>
        {c1}
      </button>
      <div style={vs.footer}>
        {votedCount}/{totalPlayers} voted
      </div>
      {isHost && (
        <button style={vs.skipBtn} onClick={skip}>SKIP →</button>
      )}
      {!simpleUX && reactionBar}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const _mono = "'PT Mono', monospace";
const _tap  = { WebkitTapHighlightColor: "transparent", touchAction: "manipulation" };
const _col  = { textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 };

const _sizeBtnBase = {
  width: 80, padding: "10px 20px", fontSize: 18, fontWeight: "bold",
  letterSpacing: 2, fontFamily: _mono, borderRadius: 6, cursor: "pointer", ..._tap,
};
const _navBtnBase = {
  fontSize: 12, letterSpacing: 3, fontFamily: _mono, background: "transparent",
  color: "#7a9a7a", border: "1px solid #7a9a7a", borderRadius: 6, cursor: "pointer", ..._tap,
};

const vs = {
  root: {
    height: "100dvh", background: "#060e06", color: "#c8f55a", fontFamily: _mono,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
    padding: "max(56px, calc(env(safe-area-inset-top) + 32px)) 20px max(24px, env(safe-area-inset-bottom))",
    boxSizing: "border-box", gap: 10,
    userSelect: "none", position: "relative", WebkitUserSelect: "none",
    textAlign: "center", overflowY: "auto", WebkitOverflowScrolling: "touch",
  },
  roundBadge:  { fontSize: 9, letterSpacing: 5, color: "#c8f55a", background: "#0a1f0a", border: "1px solid #1a3a1a", padding: "4px 14px", borderRadius: 20, marginBottom: -4 },
  header:      { fontSize: 12, letterSpacing: 6, color: "#7a9a7a", marginBottom: 8 },
  choiceBtn: {
    width: 280, padding: "20px 20px", fontSize: 20,
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
  categorySelected: {
    width: 280, boxSizing: "border-box", textAlign: "center", padding: "16px 28px",
    border: "1px solid #c8f55a", boxShadow: "0 0 20px #c8f55a22", marginBottom: 8,
  },
  catLabel:        { fontSize: 10, letterSpacing: 4, color: "#7a9a7a", marginBottom: 6 },
  catName:         { fontSize: 22, fontWeight: "bold", letterSpacing: 4 },
  playerCountLobby:{ fontSize: 14, color: "#7a9a7a", letterSpacing: 2 },
  startGameBtn: {
    width: "100%", padding: "16px 20px", fontSize: 18, fontWeight: "bold", letterSpacing: 4,
    fontFamily: _mono, background: "#0f1f0f", color: "#c8f55a",
    border: "2px solid #c8f55a", borderRadius: 6, cursor: "pointer",
    boxShadow: "0 0 16px #c8f55a22", ..._tap,
  },
  categoryBtn: {
    width: 280, padding: "14px 24px", fontSize: 16, fontWeight: "bold", letterSpacing: 3,
    fontFamily: _mono, background: "#0f1f0f", color: "#c8f55a",
    border: "2px solid #c8f55a", borderRadius: 6, cursor: "pointer",
    boxShadow: "0 0 16px #c8f55a22", textAlign: "center", ..._tap,
  },
  tagBtn: {
    padding: "6px 14px", fontSize: 10, fontWeight: "bold", letterSpacing: 3,
    fontFamily: _mono, background: "transparent", color: "#7a9a7a",
    border: "1px solid #2a3a2a", borderRadius: 20, cursor: "pointer", ..._tap,
  },
  tagBtnActive: {
    padding: "6px 14px", fontSize: 10, fontWeight: "bold", letterSpacing: 3,
    fontFamily: _mono, background: "#0f1f0f", color: "#c8f55a",
    border: "1px solid #c8f55a", borderRadius: 20, cursor: "pointer",
    boxShadow: "0 0 8px #c8f55a22", ..._tap,
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
  rpsRow: { display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginTop: 8 },
  rpsBtn: {
    display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14,
    width: 280, padding: "18px 24px", background: "#0f1f0f", border: "2px solid #1a2e1a",
    borderRadius: 8, cursor: "pointer", color: "#c8f55a",
    fontFamily: _mono, transition: "all 0.15s", ..._tap,
  },
  rpsBtnLabel: { fontSize: 14, letterSpacing: 4, fontWeight: "bold" },
  // ── One Second ──
  osTimerDisplay: {
    fontSize: 72, fontWeight: "bold", letterSpacing: 2, color: "#c8f55a",
    fontVariantNumeric: "tabular-nums", fontFamily: _mono,
    textShadow: "0 0 30px #c8f55a66", lineHeight: 1, margin: "16px 0",
  },
  osBigBtn: {
    width: 280, padding: "28px 0", fontSize: 18,
    fontWeight: "bold", letterSpacing: 4, fontFamily: _mono,
    background: "#0a1f0a", color: "#c8f55a", border: "2px solid #c8f55a",
    borderRadius: 8, cursor: "pointer", ..._tap,
  },
  osHalfBtn: {
    flex: 1, padding: "22px 0", fontSize: 16,
    fontWeight: "bold", letterSpacing: 4, fontFamily: _mono,
    background: "#0a1f0a", color: "#c8f55a", border: "2px solid #c8f55a",
    borderRadius: 8, cursor: "pointer", ..._tap,
  },
  osResultRow:  { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#0a140a", border: "1px solid #1a2e1a", borderRadius: 4 },
  osResultName: { flex: 1, fontSize: 12, letterSpacing: 2, color: "#7a9a7a" },
  osResultTime: { fontSize: 20, fontWeight: "bold", letterSpacing: 1, fontVariantNumeric: "tabular-nums" },
  osResultDiff: { fontSize: 11, letterSpacing: 1, color: "#6a8a6a" },
  // ── Name entry ──
  nameInput: {
    width: "100%", maxWidth: 280, padding: "16px 20px", fontSize: 24,
    fontWeight: "bold", letterSpacing: 6, fontFamily: _mono,
    background: "#0f1f0f", color: "#c8f55a", border: "2px solid #1a2e1a",
    borderRadius: 8, textAlign: "center", outline: "none", textTransform: "uppercase",
  },
  nameError: { fontSize: 16, color: "#ff4444", letterSpacing: 3, fontWeight: "bold", textAlign: "center", padding: "8px 0" },
  muteBtn: {
    position: "fixed", top: "max(16px, env(safe-area-inset-top))", right: 16, zIndex: 10,
    background: "transparent", border: "1px solid #1a2e1a", borderRadius: 6,
    padding: "6px 10px", fontSize: 20, cursor: "pointer", color: "#c8f55a", lineHeight: 1, ..._tap,
  },
  // ── Custom bracket ──
  customGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr",
    gap: 6, width: "100%", maxHeight: "45vh", overflowY: "auto", padding: "4px 0",
  },
  customItemInput: {
    width: "100%", padding: 8, fontSize: 12, fontFamily: _mono,
    background: "#0f1f0f", color: "#c8f55a", border: "1px solid #1a2e1a",
    borderRadius: 4, outline: "none", textAlign: "center", boxSizing: "border-box",
  },
  // ── Lobby player names ──
  lobbyNamesList: {
    display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center",
    maxWidth: 320, marginTop: -4,
  },
  lobbyNameTag: {
    fontSize: 11, letterSpacing: 2, color: "#c8f55a",
    padding: "3px 10px", borderRadius: 3,
  },
  // ── Copy bracket ──
  copyBtn: {
    padding: "12px 28px", fontSize: 13, fontWeight: "bold", letterSpacing: 4,
    fontFamily: _mono, background: "#0a140a", color: "#c8f55a",
    border: "1px solid #c8f55a", borderRadius: 6, cursor: "pointer", ..._tap,
    marginTop: 8,
  },
  // ── Bracket size selector ──
  sizeRow:      { display: "flex", gap: 8, marginTop: 8 },
  sizeLabel:    { fontSize: 9, letterSpacing: 4, color: "#6a8a6a", marginTop: -4, marginBottom: 4 },
  sizeBtn:      { ..._sizeBtnBase, background: "#0a140a", color: "#7a9a7a", border: "1px solid #1a2e1a" },
  sizeBtnActive:{ ..._sizeBtnBase, background: "#0f1f0f", color: "#c8f55a", border: "2px solid #c8f55a" },
};
