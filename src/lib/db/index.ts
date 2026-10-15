import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { DB_FILE } from "@/lib/paths";
import * as schema from "./schema";

type DB = BetterSQLite3Database<typeof schema>;

// One connection per server process; the dev server reloads modules, so keep it on globalThis.
const g = globalThis as unknown as { __smpDb?: DB };

function open(): DB {
  const sqlite = new Database(DB_FILE);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(/* turbopackIgnore: true */ process.cwd(), "drizzle") });
  return db;
}

export const db: DB = g.__smpDb ?? (g.__smpDb = open());
export { schema };
