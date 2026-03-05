import { useState, useEffect, useRef } from "react";
import { ref, onValue, update, remove, get, set } from "firebase/database";
import { db } from "./firebase.js";
import { safeKey } from "./useGameState.js";

const PASSWORD = "brackets2026";
const _mono = "'PT Mono', 'Courier New', monospace";
const TAGS = ["Nature", "Food", "Sports", "Media", "Arts", "Things", "Misc"];

// ── Password Screen ──────────────────────────────────────────────────────────
function PasswordScreen({ onSuccess }) {
  const [val, setVal] = useState("");
  const [err, setErr] = useState(false);

  const submit = () => {
    if (val === PASSWORD) {
      onSuccess();
    } else {
      setErr(true);
      setTimeout(() => setErr(false), 1500);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0a140a", fontFamily: _mono }}>
      <div style={{ background: "#0f1f0f", border: "2px solid #c8f55a", borderRadius: 12, padding: "48px 56px", display: "flex", flexDirection: "column", gap: 16, alignItems: "center", minWidth: 360 }}>
        <div style={{ color: "#c8f55a", fontSize: 28, fontWeight: "bold", letterSpacing: 4, marginBottom: 4 }}>ADMIN</div>
        <div style={{ color: "#4a7a2a", fontSize: 12, letterSpacing: 3, marginBottom: 12 }}>BRACKET EDITOR</div>
        <input
          type="password"
          placeholder="Password"
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          style={{ width: "100%", padding: "12px 16px", fontSize: 16, fontFamily: _mono, background: "#0a140a", color: "#c8f55a", border: `2px solid ${err ? "#ff4444" : "#3a5a1a"}`, borderRadius: 6, outline: "none", letterSpacing: 2, boxSizing: "border-box" }}
          autoFocus
        />
        {err && <div style={{ color: "#ff4444", fontSize: 12, letterSpacing: 1 }}>WRONG PASSWORD</div>}
        <button
          onClick={submit}
          style={{ width: "100%", padding: "12px 0", fontSize: 14, fontWeight: "bold", letterSpacing: 3, fontFamily: _mono, background: "#1a3a0a", color: "#c8f55a", border: "2px solid #c8f55a", borderRadius: 6, cursor: "pointer", marginTop: 4 }}>
          ENTER
        </button>
      </div>
    </div>
  );
}

// ── Item count badge ─────────────────────────────────────────────────────────
function ItemCountBadge({ count }) {
  const color = count >= 32 ? "#4cff80" : count >= 16 ? "#ffcc00" : "#ff4444";
  return (
    <span style={{ fontSize: 12, fontFamily: _mono, color, border: `1px solid ${color}`, borderRadius: 4, padding: "2px 8px", marginLeft: 10 }}>
      {count} items
    </span>
  );
}

// ── Editor ───────────────────────────────────────────────────────────────────
function Editor() {
  const [brackets, setBrackets] = useState({});
  const [searchQ, setSearchQ] = useState("");
  const [selectedKey, setSelectedKey] = useState(null);
  const [name, setName] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [hiddenTagsStr, setHiddenTagsStr] = useState("");
  const [itemsText, setItemsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const [botw, setBotw] = useState(null);
  const [randomCat, setRandomCat] = useState(null);
  const originalKeyRef = useRef(null);

  useEffect(() => {
    const unsub = onValue(ref(db, "customCategories"), (snap) => {
      setBrackets(snap.val() || {});
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onValue(ref(db, "bracketOfTheWeek"), (snap) => {
      setBotw(snap.val() || null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onValue(ref(db, "randomCategory"), (snap) => {
      setRandomCat(snap.val() || null);
    });
    return () => unsub();
  }, []);

  function toggleTag(tag) {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }

  const parsedItems = itemsText.split("\n").map(s => s.trim()).filter(Boolean);
  const displayCount = parsedItems.length;
  const activeKey = name.trim() ? safeKey(name.trim()) : null;

  function loadBracket(key, b) {
    setSelectedKey(key);
    originalKeyRef.current = key;
    setName(b.name || "");
    setSelectedTags(b.tags || []);
    setHiddenTagsStr((b.hiddenTags || []).join(", "));
    setItemsText((b.items || []).join("\n"));
    setStatus(null);
  }

  function newBracket() {
    setSelectedKey(null);
    originalKeyRef.current = null;
    setName("");
    setSelectedTags([]);
    setHiddenTagsStr("");
    setItemsText("");
    setStatus(null);
  }

  async function save() {
    if (!name.trim()) { setStatus({ msg: "Name is required.", ok: false }); return; }
    if (parsedItems.length < 2) { setStatus({ msg: "Need at least 2 items.", ok: false }); return; }

    const key = safeKey(name.trim());
    const existing = brackets[key];
    const now = Date.now();
    const hiddenTags = hiddenTagsStr.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
    const items = parsedItems;

    setSaving(true);
    setStatus(null);
    try {
      if (originalKeyRef.current && originalKeyRef.current !== key && brackets[originalKeyRef.current]) {
        await remove(ref(db, "customCategories/" + originalKeyRef.current));
      }
      await update(ref(db, "customCategories"), {
        [key]: {
          name: name.trim(),
          items,
          tags: selectedTags,
          hiddenTags,
          createdAt: existing?.createdAt || now,
          updatedAt: now,
        }
      });
      originalKeyRef.current = key;
      setSelectedKey(key);
      setStatus({ msg: "Saved!", ok: true });
    } catch (e) {
      setStatus({ msg: "Error: " + e.message, ok: false });
    } finally {
      setSaving(false);
    }
  }

  async function deleteBracket() {
    const key = selectedKey || activeKey;
    if (!key || !brackets[key]) { setStatus({ msg: "Nothing to delete.", ok: false }); return; }
    if (!window.confirm(`Delete "${brackets[key]?.name || key}"? This cannot be undone.`)) return;
    await remove(ref(db, "customCategories/" + key));
    newBracket();
    setStatus({ msg: "Deleted.", ok: true });
  }

  const canDelete = !!(selectedKey || (activeKey && brackets[activeKey]));

  const filteredBrackets = Object.entries(brackets)
    .filter(([, b]) => {
      if (!searchQ) return true;
      const q = searchQ.toLowerCase();
      return b.name?.toLowerCase().includes(q)
        || (b.tags || []).some(t => t.toLowerCase().includes(q))
        || (b.hiddenTags || []).some(t => t.toLowerCase().includes(q));
    })
    .sort((a, b) => (a[1].name || "").localeCompare(b[1].name || ""));

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0a140a", fontFamily: _mono, color: "#c8f55a" }}>

      {/* Left: bracket list */}
      <div style={{ width: 290, minWidth: 220, borderRight: "2px solid #1a3a0a", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #1a3a0a", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 13, letterSpacing: 3, color: "#4a7a2a" }}>BRACKETS</span>
          <button
            onClick={newBracket}
            style={{ fontSize: 12, letterSpacing: 2, padding: "6px 12px", background: "#1a3a0a", color: "#c8f55a", border: "1px solid #c8f55a", borderRadius: 4, cursor: "pointer", fontFamily: _mono }}>
            + NEW
          </button>
        </div>
        {/* Search */}
        <div style={{ padding: "10px 12px", borderBottom: "1px solid #0f1f0f", flexShrink: 0 }}>
          <input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Search..."
            style={{ width: "100%", padding: "7px 10px", fontSize: 13, fontFamily: _mono, background: "#0f1f0f", color: "#c8f55a", border: "1px solid #2a4a1a", borderRadius: 4, outline: "none", boxSizing: "border-box" }}
          />
        </div>
        {/* List */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {filteredBrackets.length === 0 && (
            <div style={{ padding: "14px 16px", color: "#2a4a1a", fontSize: 12, letterSpacing: 1 }}>
              {searchQ ? "No matches." : "No brackets yet."}
            </div>
          )}
          {filteredBrackets.map(([key, b]) => {
            const isActive = key === selectedKey;
            const isBotw = key === botw;
            const isRandom = key === randomCat;
            return (
              <div
                key={key}
                onClick={() => loadBracket(key, b)}
                style={{ padding: "11px 16px", cursor: "pointer", borderBottom: "1px solid #0f1f0f", background: isActive ? "#1a3a0a" : "transparent" }}>
                <div style={{ fontSize: 14, fontWeight: "bold", letterSpacing: 1, marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
                  {isBotw && <span title="Bracket of the Week" style={{ color: "#ffd700" }}>★</span>}
                  {isRandom && <span title="Random Category" style={{ color: "#4cffb0" }}>⟳</span>}
                  {b.name}
                </div>
                {b.tags?.length > 0 && (
                  <div style={{ fontSize: 11, color: "#4a7a2a", letterSpacing: 1 }}>{b.tags.join(", ")}</div>
                )}
                <div style={{ fontSize: 11, color: "#3a5a1a", marginTop: 2 }}>{(b.items || []).length} items</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: editor form */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", padding: "28px 40px" }}>
        <div style={{ fontSize: 13, letterSpacing: 3, color: "#4a7a2a", marginBottom: 24, borderBottom: "1px solid #1a3a0a", paddingBottom: 12, display: "flex", alignItems: "baseline", gap: 16 }}>
          {selectedKey ? "EDIT BRACKET" : "NEW BRACKET"}
          {activeKey && <span style={{ fontSize: 11, color: "#2a4a1a" }}>key: {activeKey}</span>}
        </div>

        <label style={{ fontSize: 12, letterSpacing: 2, color: "#4a7a2a", marginBottom: 4, display: "block" }}>NAME</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Disney Songs"
          style={{ width: "100%", padding: "10px 12px", fontSize: 15, fontFamily: _mono, background: "#0f1f0f", color: "#c8f55a", border: "1px solid #2a4a1a", borderRadius: 6, outline: "none", marginBottom: 20, boxSizing: "border-box" }}
        />

        <label style={{ fontSize: 12, letterSpacing: 2, color: "#4a7a2a", marginBottom: 8, display: "block" }}>TAGS</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {TAGS.map(tag => {
            const active = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                style={{ padding: "7px 16px", fontSize: 12, letterSpacing: 2, fontFamily: _mono, background: active ? "#1a3a0a" : "#0a140a", color: active ? "#c8f55a" : "#4a7a2a", border: `1px solid ${active ? "#c8f55a" : "#2a4a1a"}`, borderRadius: 4, cursor: "pointer" }}>
                {tag}
              </button>
            );
          })}
        </div>

        <label style={{ fontSize: 12, letterSpacing: 2, color: "#4a7a2a", marginBottom: 4, display: "block" }}>SEARCH KEYWORDS <span style={{ color: "#2a4a1a", fontSize: 10, letterSpacing: 1 }}>(hidden — users can find this bracket by these terms)</span></label>
        <input
          value={hiddenTagsStr}
          onChange={e => setHiddenTagsStr(e.target.value)}
          placeholder="e.g. plants, greens, vegetables"
          style={{ width: "100%", padding: "10px 12px", fontSize: 14, fontFamily: _mono, background: "#0f1f0f", color: "#c8f55a", border: "1px solid #2a4a1a", borderRadius: 6, outline: "none", marginBottom: 20, boxSizing: "border-box" }}
        />

        <label style={{ fontSize: 12, letterSpacing: 2, color: "#4a7a2a", marginBottom: 4, display: "flex", alignItems: "center" }}>
          ITEMS (one per line)
          {parsedItems.length > 0 && <ItemCountBadge count={displayCount} />}
        </label>
        <div style={{ fontSize: 11, color: "#3a5a1a", marginBottom: 10, lineHeight: 1.7 }}>
          Paste or type items — one per line. At least 32 recommended. If more than the bracket size, items are chosen randomly each game.
        </div>
        <textarea
          value={itemsText}
          onChange={e => setItemsText(e.target.value)}
          placeholder={"Let It Go\nBe Our Guest\nHakuna Matata\n..."}
          style={{ width: "100%", height: 320, padding: "10px 12px", fontSize: 14, fontFamily: _mono, background: "#0f1f0f", color: "#c8f55a", border: "1px solid #2a4a1a", borderRadius: 6, outline: "none", marginBottom: 10, resize: "vertical", boxSizing: "border-box", lineHeight: 1.6 }}
        />

        <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
          <button
            onClick={save}
            disabled={saving}
            style={{ padding: "12px 36px", fontSize: 14, fontWeight: "bold", letterSpacing: 3, fontFamily: _mono, background: saving ? "#0f1f0f" : "#1a3a0a", color: "#c8f55a", border: "2px solid #c8f55a", borderRadius: 6, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "SAVING..." : "SAVE"}
          </button>
          {canDelete && (
            <button
              onClick={deleteBracket}
              style={{ padding: "12px 36px", fontSize: 14, fontWeight: "bold", letterSpacing: 2, fontFamily: _mono, background: "#1a0a0a", color: "#ff4444", border: "2px solid #ff4444", borderRadius: 6, cursor: "pointer" }}>
              DELETE
            </button>
          )}
          {canDelete && (() => {
            const key = selectedKey || activeKey;
            const isBotw = key === botw;
            const isRandKey = key === randomCat;
            return (<>
              {isBotw ? (
                <button
                  onClick={() => set(ref(db, "bracketOfTheWeek"), null)}
                  style={{ padding: "12px 24px", fontSize: 14, fontWeight: "bold", letterSpacing: 2, fontFamily: _mono, background: "#1a1500", color: "#ffd700", border: "2px solid #ffd700", borderRadius: 6, cursor: "pointer" }}>
                  ★ CLEAR WEEK
                </button>
              ) : (
                <button
                  onClick={() => set(ref(db, "bracketOfTheWeek"), key)}
                  style={{ padding: "12px 24px", fontSize: 14, fontWeight: "bold", letterSpacing: 2, fontFamily: _mono, background: "#0f1f0f", color: "#ffd700", border: "2px solid #ffd700", borderRadius: 6, cursor: "pointer" }}>
                  ★ SET AS WEEK
                </button>
              )}
              {isRandKey ? (
                <button
                  onClick={() => set(ref(db, "randomCategory"), null)}
                  style={{ padding: "12px 24px", fontSize: 14, fontWeight: "bold", letterSpacing: 2, fontFamily: _mono, background: "#001a12", color: "#4cffb0", border: "2px solid #4cffb0", borderRadius: 6, cursor: "pointer" }}>
                  ⟳ CLEAR RANDOM
                </button>
              ) : (
                <button
                  onClick={() => set(ref(db, "randomCategory"), key)}
                  style={{ padding: "12px 24px", fontSize: 14, fontWeight: "bold", letterSpacing: 2, fontFamily: _mono, background: "#0f1f0f", color: "#4cffb0", border: "2px solid #4cffb0", borderRadius: 6, cursor: "pointer" }}>
                  ⟳ SET AS RANDOM
                </button>
              )}
            </>);
          })()}
        </div>
        {status && (
          <div style={{ marginTop: 12, fontSize: 13, color: status.ok ? "#4cff80" : "#ff4444", letterSpacing: 1 }}>
            {status.msg}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────
export default function AdminApp() {
  const [authed, setAuthed] = useState(false);
  if (!authed) return <PasswordScreen onSuccess={() => setAuthed(true)} />;
  return <Editor />;
}
