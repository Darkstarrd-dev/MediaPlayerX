#!/usr/bin/env node

import { parentPort, workerData } from 'node:worker_threads'

if (!parentPort) {
  throw new Error('benchmark-db-worker requires worker_threads parentPort')
}

const { default: BetterSqlite3 } = await import('better-sqlite3')

const db = new BetterSqlite3(workerData.dbPath)
db.pragma('journal_mode = WAL')
db.pragma('synchronous = NORMAL')
db.exec(`
  CREATE TABLE IF NOT EXISTS package_item (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    absolute_path TEXT NOT NULL,
    status TEXT NOT NULL,
    discovered_at_ms INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS image_item (
    id TEXT PRIMARY KEY,
    package_id TEXT NOT NULL,
    source_kind TEXT NOT NULL,
    source_path TEXT NOT NULL,
    archive_entry_name TEXT,
    thumb_path TEXT,
    status TEXT NOT NULL,
    ordinal INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_image_pkg_ordinal ON image_item(package_id, ordinal);
  CREATE TABLE IF NOT EXISTS video_item (
    id TEXT PRIMARY KEY,
    absolute_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    duration_sec REAL,
    width INTEGER,
    height INTEGER,
    status TEXT NOT NULL,
    discovered_at_ms INTEGER NOT NULL,
    updated_at_ms INTEGER NOT NULL
  );
`)

const insertPackageStmt = db.prepare(
  'INSERT OR REPLACE INTO package_item(id,kind,absolute_path,status,discovered_at_ms) VALUES(?,?,?,?,?)',
)
const insertImageStmt = db.prepare(
  'INSERT OR REPLACE INTO image_item(id,package_id,source_kind,source_path,archive_entry_name,thumb_path,status,ordinal) VALUES(?,?,?,?,?,?,?,?)',
)
const updateImageThumbStmt = db.prepare('UPDATE image_item SET thumb_path = ?, status = ? WHERE id = ?')
const insertVideoStmt = db.prepare(
  'INSERT OR REPLACE INTO video_item(id,absolute_path,file_name,duration_sec,width,height,status,discovered_at_ms,updated_at_ms) VALUES(?,?,?,?,?,?,?,?,?)',
)
const updateVideoMetaStmt = db.prepare(
  'UPDATE video_item SET duration_sec = ?, width = ?, height = ?, status = ?, updated_at_ms = ? WHERE id = ?',
)

function applyWrite(type, payload) {
  switch (type) {
    case 'insertPackage':
      insertPackageStmt.run(payload.id, payload.kind, payload.absolutePath, payload.status, payload.discoveredAtMs)
      return
    case 'insertImage':
      insertImageStmt.run(
        payload.id,
        payload.packageId,
        payload.sourceKind,
        payload.sourcePath,
        payload.archiveEntryName,
        payload.thumbPath,
        payload.status,
        payload.ordinal,
      )
      return
    case 'updateImageThumb':
      updateImageThumbStmt.run(payload.thumbPath, payload.status, payload.id)
      return
    case 'insertVideo':
      insertVideoStmt.run(
        payload.id,
        payload.absolutePath,
        payload.fileName,
        payload.durationSec,
        payload.width,
        payload.height,
        payload.status,
        payload.discoveredAtMs,
        payload.updatedAtMs,
      )
      return
    case 'updateVideoMeta':
      updateVideoMetaStmt.run(payload.durationSec, payload.width, payload.height, payload.status, payload.updatedAtMs, payload.id)
      return
    default:
      throw new Error(`unknown_db_write_type:${type}`)
  }
}

parentPort.postMessage({ type: 'ready' })

parentPort.on('message', (message) => {
  if (!message || typeof message !== 'object') {
    return
  }

  const requestId = typeof message.requestId === 'number' ? message.requestId : null
  const respond = (ok, payload, error) => {
    if (requestId === null) {
      return
    }
    parentPort.postMessage({
      type: 'response',
      requestId,
      ok,
      payload,
      error,
    })
  }

  try {
    if (message.type === 'flush') {
      respond(true, null, null)
      return
    }

    if (message.type === 'close') {
      db.close()
      respond(true, null, null)
      return
    }

    applyWrite(message.type, message.payload)
    respond(true, null, null)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    respond(false, null, reason)
  }
})
