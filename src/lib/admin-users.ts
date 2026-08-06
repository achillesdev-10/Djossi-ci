import { existsSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  getSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase";

export type AdminUserRole = "candidate" | "company" | "admin" | "unknown";

export type AdminUser = {
  id: string;
  email: string;
  role: AdminUserRole;
  /** Nom complet (candidat) ou nom d'entreprise (employeur). */
  name: string | null;
  phone: string | null;
  headline: string | null;
  website: string | null;
  created_at: string | null;
};

export type AdminUsersData = {
  users: AdminUser[];
  total: number;
  candidates: number;
  companies: number;
  admins: number;
  /** "supabase" | "sqlite" | "empty" selon la source réelle. */
  source: "supabase" | "sqlite" | "empty";
  note: string | null;
};

const DB_PATH = path.join(process.cwd(), "data", "travaillerenci.sqlite3");

function asIsoDate(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toISOString();
}

function stringFromUnknown(value: unknown, fallback: string): string;
function stringFromUnknown(value: unknown, fallback: string | null): string | null;
function stringFromUnknown(value: unknown, fallback: string | null = null) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function normaliseRole(raw: unknown): AdminUserRole {
  const value = String(raw ?? "").trim().toLowerCase();
  if (["candidate", "candidat", "jobseeker"].includes(value)) return "candidate";
  if (["company", "employer", "entreprise", "recruteur"].includes(value)) return "company";
  if (value === "admin") return "admin";
  return "unknown";
}

function countRoles(users: AdminUser[]) {
  return {
    total: users.length,
    candidates: users.filter((u) => u.role === "candidate").length,
    companies: users.filter((u) => u.role === "company").length,
    admins: users.filter((u) => u.role === "admin").length,
  };
}

function emptyUsers(note: string): AdminUsersData {
  return {
    users: [],
    total: 0,
    candidates: 0,
    companies: 0,
    admins: 0,
    source: "empty",
    note,
  };
}

/**
 * Lecture des inscrits côté Supabase (production).
 * `profiles` + tables satellites `profiles_candidate` / `profiles_company`.
 */
async function fromSupabase(): Promise<AdminUsersData> {
  const supabase = getSupabaseClient();
  if (!supabase) return emptyUsers("Supabase non configuré.");

  const [profilesRes, candidatesRes, companiesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,email,role,created_at")
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase
      .from("profiles_candidate")
      .select("id,full_name,phone_whatsapp,headline")
      .limit(2000),
    supabase
      .from("profiles_company")
      .select("id,company_name,website")
      .limit(2000),
  ]);

  const profilesError = profilesRes.error;
  if (profilesError) {
    return emptyUsers(
      /relation|does not exist/i.test(profilesError.message)
        ? "Table profiles absente côté Supabase (migration 0002 non appliquée)."
        : `Erreur de lecture des utilisateurs : ${profilesError.message}`,
    );
  }

  const candidates = new Map<string, { name: string | null; phone: string | null; headline: string | null }>();
  for (const row of candidatesRes.data || []) {
    candidates.set(String(row.id), {
      name: stringFromUnknown(row.full_name, null),
      phone: stringFromUnknown(row.phone_whatsapp, null),
      headline: stringFromUnknown(row.headline, null),
    });
  }

  const companies = new Map<string, { name: string | null; website: string | null }>();
  for (const row of companiesRes.data || []) {
    companies.set(String(row.id), {
      name: stringFromUnknown(row.company_name, null),
      website: stringFromUnknown(row.website, null),
    });
  }

  const users: AdminUser[] = (profilesRes.data || []).map((row) => {
    const id = String(row.id);
    const candidate = candidates.get(id);
    const company = companies.get(id);
    const role = normaliseRole(row.role);

    return {
      id,
      email: stringFromUnknown(row.email, "email inconnu"),
      role,
      name:
        role === "company"
          ? company?.name ?? null
          : candidate?.name ?? null,
      phone: candidate?.phone ?? null,
      headline: candidate?.headline ?? null,
      website: company?.website ?? null,
      created_at: asIsoDate(row.created_at),
    };
  });

  return {
    users,
    ...countRoles(users),
    source: "supabase",
    note: null,
  };
}

/**
 * Lecture des inscrits côté SQLite (dev local).
 * La table `profiles` peut ne pas exister → liste vide avec note explicative.
 */
function fromSqlite(): AdminUsersData {
  if (!existsSync(DB_PATH)) {
    return emptyUsers(
      "Aucune base locale : les inscrits sont gérés côté Supabase en production.",
    );
  }

  try {
    const db = new DatabaseSync(DB_PATH);
    const table = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('profiles','users','auth_users') ORDER BY name LIMIT 1",
      )
      .get() as { name: string } | undefined;

    if (!table) {
      db.close();
      return emptyUsers(
        "Aucune table d'utilisateurs en local — les inscrits sont gérés côté Supabase.",
      );
    }

    const cols = db
      .prepare(`PRAGMA table_info(${table.name})`)
      .all() as Array<{ name: string }>;
    const columnNames = new Set(cols.map((c) => c.name));

    const idCol = ["id", "user_id"].find((c) => columnNames.has(c)) || "id";
    const emailCol = ["email", "email_address"].find((c) => columnNames.has(c));
    const roleCol = ["role", "user_role"].find((c) => columnNames.has(c));
    const nameCol = ["full_name", "name", "company_name", "username"].find((c) =>
      columnNames.has(c),
    );
    const createdAtCol = ["created_at", "registered_at", "createdAt"].find((c) =>
      columnNames.has(c),
    );

    const emailSql = emailCol ? `, ${emailCol} AS email` : "";
    const roleSql = roleCol ? `, ${roleCol} AS role` : "";
    const nameSql = nameCol ? `, ${nameCol} AS name` : "";
    const createdAtSql = createdAtCol ? `, ${createdAtCol} AS created_at` : "";

    const rows = db
      .prepare(
        `SELECT ${idCol} AS id${emailSql}${roleSql}${nameSql}${createdAtSql} FROM ${table.name}`,
      )
      .all() as Array<Record<string, unknown>>;
    db.close();

    const users: AdminUser[] = rows.map((row) => ({
      id: String(row.id ?? ""),
      email: stringFromUnknown(row.email, "email inconnu"),
      role: normaliseRole(row.role),
      name: stringFromUnknown(row.name, null),
      phone: null,
      headline: null,
      website: null,
      created_at: asIsoDate(row.created_at),
    }));

    return {
      users,
      ...countRoles(users),
      source: "sqlite",
      note: null,
    };
  } catch {
    return emptyUsers("Impossible de lire les utilisateurs en local.");
  }
}

/**
 * Liste des utilisateurs inscrits pour le dashboard admin.
 * Priorité : Supabase si configuré (production), sinon SQLite local.
 */
export async function getAdminUsersData(): Promise<AdminUsersData> {
  if (isSupabaseConfigured()) {
    return fromSupabase();
  }
  return fromSqlite();
}
