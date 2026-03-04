// Runs daily at 4am PT (12:00 UTC).
// Deletes any room that has no lastActivity timestamp or whose lastActivity
// is older than 2 hours, protecting games still in progress late at night.

const DB_URL = "https://brackets-11789-default-rtdb.firebaseio.com";

export default async () => {
  const secret = process.env.FIREBASE_DATABASE_SECRET;
  if (!secret) {
    console.error("[cleanup-rooms] Missing FIREBASE_DATABASE_SECRET env var");
    return new Response("Missing FIREBASE_DATABASE_SECRET", { status: 500 });
  }

  // Fetch all room keys without pulling full room data
  const roomsRes = await fetch(`${DB_URL}/rooms.json?auth=${secret}&shallow=true`);
  if (!roomsRes.ok) {
    console.error("[cleanup-rooms] Failed to fetch rooms:", roomsRes.status);
    return new Response("Failed to fetch rooms", { status: 500 });
  }

  const rooms = await roomsRes.json();
  if (!rooms) {
    console.log("[cleanup-rooms] No rooms found, nothing to clean");
    return new Response("No rooms", { status: 200 });
  }

  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;

  const results = await Promise.all(
    Object.keys(rooms).map(async (code) => {
      const actRes = await fetch(`${DB_URL}/rooms/${code}/lastActivity.json?auth=${secret}`);
      const lastActivity = await actRes.json();

      // Keep rooms active within the last 2 hours
      if (lastActivity && lastActivity >= twoHoursAgo) return null;

      await fetch(`${DB_URL}/rooms/${code}.json?auth=${secret}`, { method: "DELETE" });
      return code;
    })
  );

  const deleted = results.filter(Boolean);
  console.log(`[cleanup-rooms] Deleted ${deleted.length} room(s):`, deleted);
  return new Response(`Deleted ${deleted.length} room(s): ${deleted.join(", ")}`, { status: 200 });
};

export const config = {
  schedule: "0 12 * * *", // 4am PST (UTC-8) / 5am PDT (UTC-7)
};
