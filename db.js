/**
 * db.js — Aetheris SQLite WAL Database Module
 * All persistent data lives here: settings, recent dirs, sessions, terminal blocks.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store DB next to server.js in a data/ subdirectory
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'aetheris.db');

const db = new Database(DB_PATH);

// ── Enable WAL mode for performance + concurrent reads ──────────────────────
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

// ── Schema ───────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY NOT NULL,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS recent_dirs (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    path     TEXT UNIQUE NOT NULL,
    used_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id           TEXT PRIMARY KEY NOT NULL,
    name         TEXT NOT NULL DEFAULT 'Agent',
    llm          TEXT NOT NULL DEFAULT 'Claude-Code',
    reviewer     TEXT NOT NULL DEFAULT 'Gemini-CLI',
    operator     TEXT NOT NULL DEFAULT 'Codex',
    llm_model      TEXT,
    reviewer_model TEXT,
    operator_model TEXT,
    framework    TEXT NOT NULL DEFAULT 'thclaws',
    initial_goal TEXT,
    project_dir  TEXT,
    current_dir  TEXT,
    in_trash     INTEGER NOT NULL DEFAULT 0,
    created_at   INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS terminal_blocks (
    id             TEXT PRIMARY KEY NOT NULL,
    session_id     TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    command        TEXT NOT NULL,
    output         TEXT NOT NULL DEFAULT '',
    status         TEXT NOT NULL DEFAULT 'running',
    time           TEXT,
    dir            TEXT,
    ai_explanation TEXT,
    created_at     INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_blocks_session ON terminal_blocks(session_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_recent_dirs_used ON recent_dirs(used_at DESC);
`);

const sessionColumns = new Set(db.prepare('PRAGMA table_info(sessions)').all().map(column => column.name));
if (!sessionColumns.has('project_dir')) db.exec('ALTER TABLE sessions ADD COLUMN project_dir TEXT');
if (!sessionColumns.has('current_dir')) db.exec('ALTER TABLE sessions ADD COLUMN current_dir TEXT');
if (!sessionColumns.has('operator')) db.exec("ALTER TABLE sessions ADD COLUMN operator TEXT NOT NULL DEFAULT 'Codex'");
if (!sessionColumns.has('llm_model')) db.exec('ALTER TABLE sessions ADD COLUMN llm_model TEXT');
if (!sessionColumns.has('reviewer_model')) db.exec('ALTER TABLE sessions ADD COLUMN reviewer_model TEXT');
if (!sessionColumns.has('operator_model')) db.exec('ALTER TABLE sessions ADD COLUMN operator_model TEXT');

console.log(`[DB] SQLite WAL database ready at: ${DB_PATH}`);

// ── Helpers: Settings ────────────────────────────────────────────────────────
const stmtGetSetting  = db.prepare('SELECT value FROM settings WHERE key = ?');
const stmtSetSetting  = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
const stmtGetAllSettings = db.prepare('SELECT key, value FROM settings');

export function getSetting(key, defaultValue = null) {
  const row = stmtGetSetting.get(key);
  return row ? row.value : defaultValue;
}

export function setSetting(key, value) {
  stmtSetSetting.run(key, value == null ? null : String(value));
}

export function getAllSettings() {
  const rows = stmtGetAllSettings.all();
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

// ── Helpers: Recent Dirs ─────────────────────────────────────────────────────
const stmtGetRecents  = db.prepare('SELECT path FROM recent_dirs ORDER BY used_at DESC LIMIT 10');
const stmtUpsertRecent = db.prepare(`
  INSERT INTO recent_dirs (path, used_at) VALUES (?, unixepoch())
  ON CONFLICT(path) DO UPDATE SET used_at = unixepoch()
`);
const stmtDeleteRecent = db.prepare('DELETE FROM recent_dirs WHERE path = ?');

export function getRecentDirs() {
  return stmtGetRecents.all().map(r => r.path);
}

export function addRecentDir(dirPath) {
  stmtUpsertRecent.run(dirPath);
}

export function removeRecentDir(dirPath) {
  stmtDeleteRecent.run(dirPath);
}

// ── Helpers: Sessions ────────────────────────────────────────────────────────
const stmtGetSessions = db.prepare('SELECT * FROM sessions ORDER BY created_at ASC');
const stmtGetSession  = db.prepare('SELECT * FROM sessions WHERE id = ?');
const stmtUpsertSession = db.prepare(`
  INSERT INTO sessions (id, name, llm, reviewer, operator, llm_model, reviewer_model, operator_model, framework, initial_goal, project_dir, current_dir, in_trash)
  VALUES (@id, @name, @llm, @reviewer, @operator, @llm_model, @reviewer_model, @operator_model, @framework, @initial_goal, @project_dir, @current_dir, @in_trash)
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    llm = excluded.llm,
    reviewer = excluded.reviewer,
    operator = excluded.operator,
    llm_model = excluded.llm_model,
    reviewer_model = excluded.reviewer_model,
    operator_model = excluded.operator_model,
    framework = excluded.framework,
    initial_goal = excluded.initial_goal,
    project_dir = excluded.project_dir,
    current_dir = excluded.current_dir,
    in_trash = excluded.in_trash
`);
const stmtDeleteSession = db.prepare('DELETE FROM sessions WHERE id = ?');
const stmtTrashSession  = db.prepare('UPDATE sessions SET in_trash = ? WHERE id = ?');

export function getSessions() {
  return stmtGetSessions.all().map(rowToSession);
}

export function getSession(id) {
  const row = stmtGetSession.get(id);
  return row ? rowToSession(row) : null;
}

export function upsertSession(session) {
  stmtUpsertSession.run({
    id: session.id,
    name: session.name || 'Agent',
    llm: session.llm || 'Claude-Code',
    reviewer: session.reviewer || 'Gemini-CLI',
    operator: session.operator || session.operator_model || 'Codex',
    llm_model: session.llmModel || session.llm_model || null,
    reviewer_model: session.reviewerModel || session.reviewer_model || null,
    operator_model: session.operatorModel || session.operator_model || null,
    framework: session.framework || 'thclaws',
    initial_goal: session.initialGoal || session.initial_goal || '',
    project_dir: session.projectDir || session.project_dir || null,
    current_dir: session.currentDir || session.current_dir || null,
    in_trash: session.inTrash || session.in_trash ? 1 : 0,
  });
}

export function deleteSession(id) {
  stmtDeleteSession.run(id);
}

export function trashSession(id, inTrash) {
  stmtTrashSession.run(inTrash ? 1 : 0, id);
}

function rowToSession(row) {
  return {
    id: row.id,
    name: row.name,
    llm: row.llm,
    reviewer: row.reviewer,
    operator: row.operator,
    llmModel: row.llm_model,
    reviewerModel: row.reviewer_model,
    operatorModel: row.operator_model,
    framework: row.framework,
    initialGoal: row.initial_goal,
    projectDir: row.project_dir,
    currentDir: row.current_dir,
    inTrash: row.in_trash === 1,
    createdAt: row.created_at,
  };
}

// ── Helpers: Terminal Blocks ─────────────────────────────────────────────────
const stmtGetBlocks    = db.prepare('SELECT * FROM terminal_blocks WHERE session_id = ? ORDER BY created_at ASC');
const stmtInsertBlock  = db.prepare(`
  INSERT OR IGNORE INTO terminal_blocks (id, session_id, command, output, status, time, dir)
  VALUES (@id, @session_id, @command, @output, @status, @time, @dir)
`);
const stmtUpdateBlock  = db.prepare(`
  UPDATE terminal_blocks
  SET output = @output, status = @status, dir = @dir, ai_explanation = @ai_explanation
  WHERE id = @id
`);
const stmtDeleteBlock  = db.prepare('DELETE FROM terminal_blocks WHERE id = ?');
const stmtDeleteAllBlocks = db.prepare('DELETE FROM terminal_blocks WHERE session_id = ?');

export function getBlocks(sessionId) {
  return stmtGetBlocks.all(sessionId).map(rowToBlock);
}

export function insertBlock(block) {
  stmtInsertBlock.run({
    id: block.id,
    session_id: block.sessionId || block.session_id,
    command: block.command,
    output: block.output || '',
    status: block.status || 'running',
    time: block.time || null,
    dir: block.dir || null,
  });
}

export function updateBlock(block) {
  stmtUpdateBlock.run({
    id: block.id,
    output: block.output || '',
    status: block.status || 'running',
    dir: block.dir || null,
    ai_explanation: block.aiExplanation ? JSON.stringify(block.aiExplanation) : null,
  });
}

export function deleteBlock(blockId) {
  stmtDeleteBlock.run(blockId);
}

export function clearBlocks(sessionId) {
  stmtDeleteAllBlocks.run(sessionId);
}

function rowToBlock(row) {
  return {
    id: row.id,
    command: row.command,
    output: row.output,
    status: row.status,
    time: row.time,
    dir: row.dir,
    aiExplanation: row.ai_explanation ? JSON.parse(row.ai_explanation) : null,
    createdAt: row.created_at,
  };
}

export default db;
