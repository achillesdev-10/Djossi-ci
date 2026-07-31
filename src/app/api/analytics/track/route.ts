import { NextResponse } from "next/server";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const DB_PATH = path.join(process.cwd(), "data", "djossi-ci.sqlite3");

export const dynamic = "force-dynamic";

function ensureTable(db: InstanceType<typeof DatabaseSync>) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS site_visits (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
      path TEXT NOT NULL,
      ip_hash TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_visits_created_at ON site_visits (created_at DESC);
  `);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const pagePath = String(body.path || "/");

    // Ignore admin routes or bots if desired
    if (pagePath.startsWith("/admin")) {
      return NextResponse.json({ tracked: false });
    }

    const userAgent = request.headers.get("user-agent") || "";
    if (/bot|crawl|spider|slurp|lighthouse/i.test(userAgent)) {
      return NextResponse.json({ tracked: false, bot: true });
    }

    mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const db = new DatabaseSync(DB_PATH);
    ensureTable(db);

    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const ipHash = Buffer.from(ip).toString("base64").slice(0, 16);

    const stmt = db.prepare(
      "INSERT INTO site_visits (path, ip_hash, user_agent) VALUES (?, ?, ?)"
    );
    stmt.run(pagePath, ipHash, userAgent.slice(0, 255));
    db.close();

    return NextResponse.json({ tracked: true });
  } catch (err) {
    return NextResponse.json({ tracked: false, error: String(err) }, { status: 500 });
  }
}
