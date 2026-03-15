// Shape Halving minigame utilities
// All coordinates are in a virtual 400×400 space centered at (200, 200)

const VIRTUAL_SIZE = 400;
const CENTER = 200;

// Seeded PRNG (mulberry32)
export function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Generate a random organic shape
// Returns { svgPath, polyApprox, bbox }
// svgPath: SVG path d-string
// polyApprox: dense polygon approximation [{x,y}] for intersection math
export function generateShape(seed) {
  const rand = mulberry32(seed);

  const numVerts = 7 + Math.floor(rand() * 3); // 7–9 vertices
  const vertices = [];

  for (let i = 0; i < numVerts; i++) {
    const angle = (i / numVerts) * Math.PI * 2 - Math.PI / 2;
    const radius = 80 + rand() * 80; // 80–160px from center
    vertices.push({
      x: CENTER + Math.cos(angle) * radius,
      y: CENTER + Math.sin(angle) * radius,
    });
  }

  // Each edge is either a straight line or a cubic bezier (outward bulge)
  const edgeTypes = vertices.map(() => (rand() < 0.5 ? "curve" : "line"));

  // Build SVG path
  let d = `M ${vertices[0].x.toFixed(2)} ${vertices[0].y.toFixed(2)}`;
  const polySegments = []; // each segment is [{x,y}] dense points

  for (let i = 0; i < numVerts; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % numVerts];
    const type = edgeTypes[i];

    if (type === "line") {
      d += ` L ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
      polySegments.push([a, b]);
    } else {
      // Cubic bezier with control points that bulge outward from center
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      const dx = midX - CENTER;
      const dy = midY - CENTER;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const bulge = 20 + rand() * 30; // 20–50px outward
      const cpX = midX + (dx / len) * bulge;
      const cpY = midY + (dy / len) * bulge;

      // Use quadratic bezier (single control point for simplicity)
      d += ` Q ${cpX.toFixed(2)} ${cpY.toFixed(2)} ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
      polySegments.push(approximateBezier(a, { x: cpX, y: cpY }, b, 40));
    }
  }
  d += " Z";

  // Build dense polygon approximation
  const polyApprox = [];
  for (const seg of polySegments) {
    // Add all but last point (avoid duplicates)
    for (let i = 0; i < seg.length - 1; i++) {
      polyApprox.push(seg[i]);
    }
  }

  return { svgPath: d, polyApprox };
}

// Approximate a quadratic bezier with N points
function approximateBezier(p0, p1, p2, steps) {
  const pts = [];
  for (let t = 0; t <= steps; t++) {
    const u = t / steps;
    const x = (1 - u) * (1 - u) * p0.x + 2 * (1 - u) * u * p1.x + u * u * p2.x;
    const y = (1 - u) * (1 - u) * p0.y + 2 * (1 - u) * u * p1.y + u * u * p2.y;
    pts.push({ x, y });
  }
  return pts;
}

// Line segment intersection test
// Returns the intersection point if segments (p1,p2) and (p3,p4) cross, else null
function segmentsIntersect(p1, p2, p3, p4) {
  const d1x = p2.x - p1.x;
  const d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x;
  const d2y = p4.y - p3.y;
  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 1e-10) return null; // parallel

  const dx = p3.x - p1.x;
  const dy = p3.y - p1.y;
  const t = (dx * d2y - dy * d2x) / cross;
  const u = (dx * d1y - dy * d1x) / cross;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return { x: p1.x + t * d1x, y: p1.y + t * d1y, t };
  }
  return null;
}

// Find all intersections between a line (infinite) and the shape boundary polygon
// line defined by two points (lx1,ly1) and (lx2,ly2)
// Returns array of intersection points, sorted by t parameter
export function lineShapeIntersections(lx1, ly1, lx2, ly2, polyApprox) {
  // Extend line far beyond shape to make it "infinite" within our 400x400 space
  const dx = lx2 - lx1;
  const dy = ly2 - ly1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const far = 800;
  const ex1 = { x: lx1 - (dx / len) * far, y: ly1 - (dy / len) * far };
  const ex2 = { x: lx2 + (dx / len) * far, y: ly2 + (dy / len) * far };

  const hits = [];
  const n = polyApprox.length;
  for (let i = 0; i < n; i++) {
    const a = polyApprox[i];
    const b = polyApprox[(i + 1) % n];
    const pt = segmentsIntersect(ex1, ex2, a, b);
    if (pt) {
      // Deduplicate very close intersections
      const dup = hits.some((h) => Math.abs(h.x - pt.x) < 1 && Math.abs(h.y - pt.y) < 1);
      if (!dup) hits.push(pt);
    }
  }
  // Sort by parameter along the extended line
  hits.sort((a, b) => a.t - b.t);
  return hits;
}

// Check if a point is strictly inside the polyApprox polygon (ray casting)
export function pointInPolygon(px, py, poly) {
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// Validate that a drag line makes a valid cut:
// - The user drew from outside, through, to outside
// - Exactly 2 boundary intersections
export function validateCut(lx1, ly1, lx2, ly2, polyApprox) {
  const hits = lineShapeIntersections(lx1, ly1, lx2, ly2, polyApprox);
  return hits.length === 2;
}

// Compute how well a line divides the shape.
// Returns |fraction - 0.5| — lower is better (0 = perfect halves)
// Uses offscreen canvas pixel counting for accuracy with curved shapes.
export function computeAreaRatio(lx1, ly1, lx2, ly2, svgPath, polyApprox) {
  const SIZE = VIRTUAL_SIZE;

  // We need to count pixels on each side of the cut line.
  // Strategy: pixel-count the full shape, then pixel-count one half
  // (shape clipped to one side of the line).

  // Create offscreen canvas
  const canvas = new OffscreenCanvas(SIZE, SIZE);
  const ctx = canvas.getContext("2d");

  // Parse and draw shape path
  const p2d = new Path2D(svgPath);

  // Count total shape pixels
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = "#fff";
  ctx.fill(p2d);
  const totalData = ctx.getImageData(0, 0, SIZE, SIZE).data;
  let total = 0;
  for (let i = 3; i < totalData.length; i += 4) total += totalData[i] > 0 ? 1 : 0;

  if (total === 0) return 0.5; // fallback

  // Extend the cut line far beyond canvas bounds
  const dx = lx2 - lx1;
  const dy = ly2 - ly1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const far = SIZE * 2;
  const ex1x = lx1 - (dx / len) * far;
  const ex1y = ly1 - (dy / len) * far;
  const ex2x = lx2 + (dx / len) * far;
  const ex2y = ly2 + (dy / len) * far;

  // Clip to one side of the line using a large clipping polygon
  // The "left" side of the directed line (ex1→ex2)
  const normalX = -dy / len;
  const normalY = dx / len;
  const clipOffsetX = normalX * far;
  const clipOffsetY = normalY * far;

  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.save();
  // Build clipping region: half-plane to the left of the line
  ctx.beginPath();
  ctx.moveTo(ex1x, ex1y);
  ctx.lineTo(ex2x, ex2y);
  ctx.lineTo(ex2x + clipOffsetX, ex2y + clipOffsetY);
  ctx.lineTo(ex1x + clipOffsetX, ex1y + clipOffsetY);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = "#fff";
  ctx.fill(p2d);
  ctx.restore();

  const sideData = ctx.getImageData(0, 0, SIZE, SIZE).data;
  let sideA = 0;
  for (let i = 3; i < sideData.length; i += 4) sideA += sideData[i] > 0 ? 1 : 0;

  const fraction = sideA / total;
  return Math.abs(fraction - 0.5); // 0 = perfect, 0.5 = worst
}

// Convert normalized line coords (0-1 in 400x400 space) to display coords
export function lineToDisplay(line, displaySize) {
  const scale = displaySize / VIRTUAL_SIZE;
  return {
    x1: line.x1 * scale,
    y1: line.y1 * scale,
    x2: line.x2 * scale,
    y2: line.y2 * scale,
  };
}

// Convert display coords to virtual space coords
export function displayToVirtual(x, y, displaySize) {
  const scale = VIRTUAL_SIZE / displaySize;
  return { x: x * scale, y: y * scale };
}

// Feedback message based on how well the cut was
export function splitFeedback(ratio) {
  if (ratio < 0.01) return "PERFECT! You've got an eye for halves!";
  if (ratio < 0.05) return "So close! Nearly perfect!";
  if (ratio < 0.1) return "Nice cut! That's pretty even.";
  if (ratio < 0.2) return "Not bad. Could be more precise.";
  return "Oof, that was lopsided.";
}

// Format ratio as a readable split percentage (e.g., "47.32% / 52.68%")
// ratio = Math.abs(fraction - 0.5), so 0 = perfect halves, 0.5 = worst
export function formatSplit(ratio) {
  const lo = ((0.5 - ratio) * 100).toFixed(2);
  const hi = ((0.5 + ratio) * 100).toFixed(2);
  return `${lo}% / ${hi}%`;
}
