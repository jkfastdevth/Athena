/**
 * api.js — Aetheris DB API client
 * Thin wrappers around the SQLite-backed REST endpoints on the backend.
 */

import { API_BASE } from './config/runtime';

async function req(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, opts);
  return res.json();
}

// ── Settings ──────────────────────────────────────────────────────────────────
export const dbGetSettings   = ()           => req('GET',  '/api/db/settings');
export const dbSetSetting    = (key, value) => req('POST', '/api/db/settings', { key, value });
export const dbBulkSettings  = (settings)   => req('POST', '/api/db/settings/bulk', { settings });

// ── Recent Dirs ───────────────────────────────────────────────────────────────
export const dbGetRecentDirs  = ()    => req('GET',    '/api/db/recent-dirs');
export const dbAddRecentDir   = (path) => req('POST',  '/api/db/recent-dirs', { path });
export const dbRemoveRecentDir = (path) => req('DELETE', '/api/db/recent-dirs', { path });

// ── Sessions ──────────────────────────────────────────────────────────────────
export const dbGetSessions   = ()        => req('GET',    '/api/db/sessions');
export const dbUpsertSession = (session) => req('POST',   '/api/db/sessions', session);
export const dbTrashSession  = (id, inTrash) => req('PATCH', `/api/db/sessions/${id}/trash`, { inTrash });
export const dbDeleteSession = (id)      => req('DELETE', `/api/db/sessions/${id}`);

// ── Terminal Blocks ───────────────────────────────────────────────────────────
export const dbGetBlocks    = (sessionId)           => req('GET',    `/api/db/sessions/${sessionId}/blocks`);
export const dbInsertBlock  = (sessionId, block)    => req('POST',   `/api/db/sessions/${sessionId}/blocks`, block);
export const dbUpdateBlock  = (sessionId, blockId, data) => req('PUT', `/api/db/sessions/${sessionId}/blocks/${blockId}`, data);
export const dbDeleteBlock  = (sessionId, blockId)  => req('DELETE', `/api/db/sessions/${sessionId}/blocks/${blockId}`);
export const dbClearBlocks  = (sessionId)           => req('DELETE', `/api/db/sessions/${sessionId}/blocks`);

// ── Managed Session Preview ──────────────────────────────────────────────────
export const previewStatus = (sessionId) => req('GET', `/api/session/${sessionId}/preview`);
export const previewStart  = (sessionId) => req('POST', `/api/session/${sessionId}/preview/start`);
export const previewStop   = (sessionId) => req('POST', `/api/session/${sessionId}/preview/stop`);

// ── Filesystem ────────────────────────────────────────────────────────────────
export const dbBrowseDirectory = (path) => req('GET', `/api/fs/browse?path=${encodeURIComponent(path || '')}`);
