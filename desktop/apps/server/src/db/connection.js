import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { env } from "../config/env.js";

let db;

export function getDb() {
  if (!db) {
    fs.mkdirSync(path.dirname(env.dbPath), { recursive: true });
    db = new Database(env.dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  }

  return db;
}
