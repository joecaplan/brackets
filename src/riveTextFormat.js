// Formats a label for Rive text buttons.
// Returns { text, fontSize } where:
//   text     — the string to set on buttonText (may contain \n for 2 lines)
//   fontSize — number to set on the Rive fontSize property, or null to leave default
//
// Thresholds (in artboard character units, assuming ~14 chars fill one line):
//   ≤ MAX_SINGLE  → single line, default size
//   ≤ MAX_DOUBLE  → split into 2 lines at best word boundary, default size
//   >  MAX_DOUBLE → split into 2 lines AND reduce font size proportionally

const MAX_SINGLE = 14;   // chars that comfortably fit on one line
const MAX_DOUBLE = 28;   // chars that comfortably fit across two lines
const DEFAULT_FONT_SIZE = 24;  // the default font size set in Rive
const MIN_FONT_SIZE = 8;

function bestSplit(label) {
  const words = label.split(" ");
  if (words.length < 2) return null; // single word — can't split by space

  const mid = label.length / 2;
  let bestLine1 = words[0];
  let bestLine2 = words.slice(1).join(" ");
  let bestDist = Math.abs(bestLine1.length - mid);

  let acc = words[0];
  for (let i = 1; i < words.length - 1; i++) {
    acc += " " + words[i];
    const dist = Math.abs(acc.length - mid);
    if (dist < bestDist) {
      bestDist = dist;
      bestLine1 = acc;
      bestLine2 = words.slice(i + 1).join(" ");
    }
  }
  return { line1: bestLine1, line2: bestLine2 };
}

export function formatButtonLabel(label) {
  if (!label) return { text: "", fontSize: null };

  // Fits on one line — no changes needed
  if (label.length <= MAX_SINGLE) {
    return { text: label, fontSize: null };
  }

  const split = bestSplit(label);
  const line1 = split ? split.line1 : label;
  const line2 = split ? split.line2 : "";
  const twoLine = line2 ? line1 + "\n" + line2 : line1;
  const longestLine = Math.max(line1.length, line2.length);

  // Fits across two lines at default size
  if (longestLine <= MAX_SINGLE) {
    return { text: twoLine, fontSize: null };
  }

  // Too long — reduce font size proportionally
  const scale = MAX_SINGLE / longestLine;
  const fontSize = Math.max(MIN_FONT_SIZE, Math.round(DEFAULT_FONT_SIZE * scale));
  return { text: twoLine, fontSize };
}
