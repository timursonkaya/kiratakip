import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const CURRENT_SCHEMA_VERSION = 2; // bump this every time you change schema.prisma

function getDataDir(): string {
  if (process.env.NODE_ENV === 'production') {
    const appData = process.env.APPDATA || process.env.HOME || '';
    return path.join(appData, 'kira-app', 'kira-takip');
  }
  return path.join(process.cwd(), 'prisma');
}

export function getUserDbPath(userId: number): string {
  return path.join(getDataDir(), `user-${userId}.db`);
}

function getTemplatePath(): string {
  return path.join(process.cwd(), 'prisma', 'user-template.db');
}

/**
 * Apply the current Prisma schema to a specific SQLite file.
 * Used both when copying the template and when upgrading an existing DB.
 */
function pushSchemaTo(dbPath: string): void {
  execSync(
    `npx prisma db push --url "file:${dbPath}" --accept-data-loss --skip-generate 2>&1 || ` +
    `npx prisma db push --url "file:${dbPath}" --accept-data-loss`,
    { cwd: process.cwd(), stdio: 'pipe' }
  );
}

/**
 * Reads the schema version baked into a DB file.
 * Returns 0 if the marker table doesn't exist (pre-versioning DBs).
 */
function readSchemaVersion(dbPath: string): number {
  try {
    const BetterSqlite3 = require('better-sqlite3');
    const db = new BetterSqlite3(dbPath, { readonly: true });
    try {
      const row = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='_schema_meta'`)
        .get() as { name: string } | undefined;
      if (!row) return 0;
      const v = db
        .prepare(`SELECT version FROM _schema_meta WHERE id = 1`)
        .get() as { version: number } | undefined;
      return v?.version ?? 0;
    } finally {
      db.close();
    }
  } catch {
    return 0;
  }
}

/**
 * Writes the schema version marker into a DB file.
 */
function writeSchemaVersion(dbPath: string, version: number): void {
  const BetterSqlite3 = require('better-sqlite3');
  const db = new BetterSqlite3(dbPath);
  try {
    db.prepare(
      `CREATE TABLE IF NOT EXISTS _schema_meta (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        version INTEGER NOT NULL,
        updated_at TEXT NOT NULL
      )`
    ).run();
    db.prepare(
      `INSERT INTO _schema_meta (id, version, updated_at)
       VALUES (1, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET version = excluded.version, updated_at = excluded.updated_at`
    ).run(version);
  } finally {
    db.close();
  }
}

export function ensureUserDb(userId: number): void {
  const dbPath = getUserDbPath(userId);

  // Case 1: brand-new user → copy template, then verify its schema is current
  if (!fs.existsSync(dbPath)) {
    const template = getTemplatePath();
    if (!fs.existsSync(template)) {
      throw new Error(`user-template.db bulunamadı: ${template}`);
    }
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(template, dbPath);

    // If the template is stale, push current schema into the copy and stamp it
    const templateVersion = readSchemaVersion(dbPath);
    if (templateVersion < CURRENT_SCHEMA_VERSION) {
      console.log(`[user-db] Migrating new DB (v${templateVersion} → v${CURRENT_SCHEMA_VERSION}): ${dbPath}`);
      pushSchemaTo(dbPath);
      writeSchemaVersion(dbPath, CURRENT_SCHEMA_VERSION);
    }
    return;
  }

  // Case 2: existing user DB → migrate if its schema version is behind
  const version = readSchemaVersion(dbPath);
  if (version < CURRENT_SCHEMA_VERSION) {
    console.log(`[user-db] Upgrading DB (v${version} → v${CURRENT_SCHEMA_VERSION}): ${dbPath}`);

    // Safety net: back up the DB before pushing destructive changes
    const backup = `${dbPath}.backup-v${version}-${Date.now()}`;
    try {
      fs.copyFileSync(dbPath, backup);
    } catch (e) {
      console.warn('[user-db] Backup failed:', e);
    }

    pushSchemaTo(dbPath);
    writeSchemaVersion(dbPath, CURRENT_SCHEMA_VERSION);
  }
}

// Cache: one PrismaClient per userId, stored on globalThis for HMR stability
const globalForUserDbs = globalThis as unknown as { userDbs: Map<number, PrismaClient> };
if (!globalForUserDbs.userDbs) globalForUserDbs.userDbs = new Map();

export function getUserDb(userId: number): PrismaClient {
  const cache = globalForUserDbs.userDbs;
  if (!cache.has(userId)) {
    ensureUserDb(userId);
    const dbPath = getUserDbPath(userId);
    const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
    cache.set(userId, new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    }));
  }
  return cache.get(userId)!;
}