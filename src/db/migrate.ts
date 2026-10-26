import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Schema migrations, tracked with SQLite's built in `user_version`.
 * To change the schema: append a new entry. Never edit an old one, because
 * teammates' phones already ran it.
 */
const MIGRATIONS: string[] = [
  // 1: first schema
  `
  CREATE TABLE subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    merchant_id TEXT,
    amount_paise INTEGER NOT NULL,
    max_amount_paise INTEGER,
    cycle TEXT NOT NULL,
    status TEXT NOT NULL,
    trial_end_at TEXT,
    next_charge_at TEXT NOT NULL,
    upi_app TEXT NOT NULL,
    umn TEXT,
    source TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX subscriptions_umn ON subscriptions (umn);

  CREATE TABLE decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscription_id INTEGER NOT NULL REFERENCES subscriptions (id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    usage_answer TEXT,
    saved_paise INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE pasted_sms (
    sms_hash TEXT PRIMARY KEY,
    subscription_id INTEGER REFERENCES subscriptions (id) ON DELETE SET NULL,
    pasted_at TEXT NOT NULL
  );

  CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,
];

export async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    const sql = MIGRATIONS[version];
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
    });
    version += 1;
    await db.execAsync(`PRAGMA user_version = ${version}`);
  }
}
