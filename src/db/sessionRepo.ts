import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import type { Tariff } from '../lib/tariffMath';
import type { ParkSession } from '../state/sessionStore';

// Veri cihazda yaşar (CLAUDE.md: sunucu DB yok). Tek tablo: sessions.
// Aktif oturum = endedAtMs IS NULL; tek aktif oturum kuralını store korur.
// Şema sürümü PRAGMA user_version ile taşınır — cihazdaki eski kayıtlar korunur.

const SCHEMA_VERSION = 5;

let db: SQLiteDatabase | null = null;

function migrate(database: SQLiteDatabase): void {
  const row = database.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current >= SCHEMA_VERSION) return;

  if (current < 1) {
    database.execSync(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        startedAtMs INTEGER NOT NULL,
        endedAtMs INTEGER,
        floor TEXT NOT NULL DEFAULT '',
        note TEXT NOT NULL DEFAULT '',
        tariffJson TEXT
      );
    `);
  }

  if (current < 2) {
    // v1 tablosu cihazda olabilir; kolonlar yoksa ekle.
    const columns = database.getAllSync<{ name: string }>('PRAGMA table_info(sessions)');
    const has = (name: string) => columns.some((c) => c.name === name);
    if (!has('latitude')) database.execSync('ALTER TABLE sessions ADD COLUMN latitude REAL');
    if (!has('longitude')) database.execSync('ALTER TABLE sessions ADD COLUMN longitude REAL');
    if (!has('placeName')) database.execSync('ALTER TABLE sessions ADD COLUMN placeName TEXT');
  }

  if (current < 3) {
    database.execSync(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  if (current < 4) {
    const columns = database.getAllSync<{ name: string }>('PRAGMA table_info(sessions)');
    const has = (name: string) => columns.some((c) => c.name === name);
    if (!has('photoUri')) database.execSync('ALTER TABLE sessions ADD COLUMN photoUri TEXT');
    if (!has('reminderAtMs')) database.execSync('ALTER TABLE sessions ADD COLUMN reminderAtMs INTEGER');
    if (!has('recordedAtMs')) {
      database.execSync('ALTER TABLE sessions ADD COLUMN recordedAtMs INTEGER');
      // Eski kayıtlarda kayıt anı = başlangıç anı (backdate yoktu).
      database.execSync('UPDATE sessions SET recordedAtMs = startedAtMs WHERE recordedAtMs IS NULL');
    }
  }

  if (current < 5) {
    // Bir yere park etmeden de tarife kaydedilebilsin (harita üzerindeki otopark
    // kartından). Oturum geçmişinden türeyen hafızanın önüne geçer.
    database.execSync(`
      CREATE TABLE IF NOT EXISTS place_tariffs (
        id TEXT PRIMARY KEY,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        tariffJson TEXT NOT NULL,
        updatedAtMs INTEGER NOT NULL
      );
    `);
  }

  database.execSync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

/** Ayarlar aynı cihaz veritabanında yaşar — ayrı depolama bağımlılığı yok. */
export function readSetting(key: string): string | null {
  const row = getDb().getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  return row?.value ?? null;
}

export function writeSetting(key: string, value: string): void {
  getDb().runSync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
}

/** Ayarlar > Veri: tüm oturumları siler (ayarlar korunur). */
export function deleteAllSessions(): void {
  getDb().runSync('DELETE FROM sessions');
}

/** §7.4b yanlış oto-algılama: tek kaydı tamamen siler. */
export function deleteSession(id: string): void {
  getDb().runSync('DELETE FROM sessions WHERE id = ?', [id]);
}

function getDb(): SQLiteDatabase {
  if (!db) {
    db = openDatabaseSync('parkiq.db');
    migrate(db);
  }
  return db;
}

interface SessionRow {
  id: string;
  startedAtMs: number;
  endedAtMs: number | null;
  floor: string;
  note: string;
  tariffJson: string | null;
  latitude: number | null;
  longitude: number | null;
  placeName: string | null;
  photoUri: string | null;
  reminderAtMs: number | null;
  recordedAtMs: number | null;
}

function rowToSession(row: SessionRow): ParkSession {
  let tariff: Tariff | null = null;
  if (row.tariffJson) {
    try {
      tariff = JSON.parse(row.tariffJson) as Tariff;
    } catch {
      tariff = null;
    }
  }
  return {
    id: row.id,
    startedAtMs: row.startedAtMs,
    recordedAtMs: row.recordedAtMs ?? row.startedAtMs,
    endedAtMs: row.endedAtMs,
    floor: row.floor,
    note: row.note,
    tariff,
    latitude: row.latitude,
    longitude: row.longitude,
    placeName: row.placeName,
    photoUri: row.photoUri,
    reminderAtMs: row.reminderAtMs,
  };
}

export function saveSession(session: ParkSession): void {
  getDb().runSync(
    `INSERT OR REPLACE INTO sessions
       (id, startedAtMs, recordedAtMs, endedAtMs, floor, note, tariffJson,
        latitude, longitude, placeName, photoUri, reminderAtMs)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      session.id,
      session.startedAtMs,
      session.recordedAtMs,
      session.endedAtMs,
      session.floor,
      session.note,
      session.tariff ? JSON.stringify(session.tariff) : null,
      session.latitude,
      session.longitude,
      session.placeName,
      session.photoUri,
      session.reminderAtMs,
    ],
  );
}

export function getActiveSession(): ParkSession | null {
  const row = getDb().getFirstSync<SessionRow>(
    'SELECT * FROM sessions WHERE endedAtMs IS NULL ORDER BY startedAtMs DESC LIMIT 1',
  );
  return row ? rowToSession(row) : null;
}

export function listEndedSessions(): ParkSession[] {
  const rows = getDb().getAllSync<SessionRow>(
    'SELECT * FROM sessions WHERE endedAtMs IS NOT NULL ORDER BY startedAtMs DESC',
  );
  return rows.map(rowToSession);
}

/**
 * Aynı yere tekrar park edildiğinde önceki tarifeyi önerir (§7.3 tarife hafızası).
 * Eşleşme yarıçapı ~120m — kaba kare kutu yeterli, hassasiyet gerekmiyor.
 */
export function findRememberedTariff(latitude: number, longitude: number): Tariff | null {
  const deltaLat = 0.0011; // ~120m
  const deltaLng = 0.0011 / Math.max(0.2, Math.cos((latitude * Math.PI) / 180));

  // Elle girilen yer tarifesi önceliklidir: kullanıcı panoyu okuyup kaydetmişse
  // eski bir oturumdan kalan tahminden daha günceldir.
  const place = getDb().getFirstSync<{ tariffJson: string }>(
    `SELECT tariffJson FROM place_tariffs
      WHERE latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?
      ORDER BY updatedAtMs DESC LIMIT 1`,
    [latitude - deltaLat, latitude + deltaLat, longitude - deltaLng, longitude + deltaLng],
  );
  if (place) {
    try {
      return JSON.parse(place.tariffJson) as Tariff;
    } catch {
      /* bozuk kayıt: oturum geçmişine düş */
    }
  }

  const row = getDb().getFirstSync<SessionRow>(
    `SELECT * FROM sessions
      WHERE tariffJson IS NOT NULL
        AND latitude BETWEEN ? AND ?
        AND longitude BETWEEN ? AND ?
      ORDER BY startedAtMs DESC LIMIT 1`,
    [latitude - deltaLat, latitude + deltaLat, longitude - deltaLng, longitude + deltaLng],
  );
  return row ? rowToSession(row).tariff : null;
}

/** Harita kartından girilen yer tarifesi — park etmeden kaydedilir. */
export function savePlaceTariff(latitude: number, longitude: number, tariff: Tariff): void {
  getDb().runSync(
    `INSERT OR REPLACE INTO place_tariffs (id, latitude, longitude, tariffJson, updatedAtMs)
     VALUES (?, ?, ?, ?, ?)`,
    [
      `${latitude.toFixed(5)},${longitude.toFixed(5)}`,
      latitude,
      longitude,
      JSON.stringify(tariff),
      Date.now(),
    ],
  );
}
