import { db } from 'sdk';
import { eq, sql } from 'sdk/db';
import { botSettings } from '../schema.js';

// In-memory fallback cache
const memorySettings = new Map();

// Default values
const DEFAULTS = {
  force_join_enabled: 'false',
  force_join_channel: '', // e.g. '@VoidMarket'
  force_join_title: 'کانال رسمی The Void',
};

/**
 * Initializes the bot_settings table if it doesn't already exist in the database.
 */
async function ensureSettingsTable() {
  try {
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS bot_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE,
        value TEXT,
        updated_at INTEGER DEFAULT (unixepoch())
      )
    `);
  } catch (err) {
    // Ignore if table creation is restricted or already exists
  }
}

/**
 * Gets a setting value by key.
 */
export async function getSetting(key) {
  await ensureSettingsTable();
  try {
    const row = await db.select().from(botSettings).where(eq(botSettings.key, key)).get();
    if (row && row.value !== undefined && row.value !== null) {
      memorySettings.set(key, row.value);
      return row.value;
    }
  } catch (err) {
    // Fallback to in-memory cache if query fails before migration
  }

  if (memorySettings.has(key)) {
    return memorySettings.get(key);
  }

  return DEFAULTS[key] ?? null;
}

/**
 * Sets a setting value by key.
 */
export async function setSetting(key, value) {
  const strVal = String(value);
  memorySettings.set(key, strVal);
  await ensureSettingsTable();

  try {
    const existing = await db.select().from(botSettings).where(eq(botSettings.key, key)).get();
    if (existing) {
      await db.update(botSettings)
        .set({ value: strVal, updatedAt: Math.floor(Date.now() / 1000) })
        .where(eq(botSettings.key, key))
        .run();
    } else {
      await db.insert(botSettings)
        .values({ key, value: strVal, updatedAt: Math.floor(Date.now() / 1000) })
        .run();
    }
  } catch (err) {
    console.warn(`[settings] Could not persist setting ${key} to DB, kept in memory:`, err.message);
  }

  return strVal;
}

/**
 * Returns forced join settings.
 */
export async function getForceJoinConfig() {
  const enabledStr = await getSetting('force_join_enabled');
  const channel = (await getSetting('force_join_channel')) || '';
  const title = (await getSetting('force_join_title')) || 'کانال رسمی The Void';

  return {
    enabled: enabledStr === 'true',
    channel: channel.trim(),
    title: title.trim(),
  };
}

/**
 * Updates forced join settings.
 */
export async function setForceJoinConfig({ enabled, channel, title }) {
  if (enabled !== undefined) {
    await setSetting('force_join_enabled', enabled ? 'true' : 'false');
  }
  if (channel !== undefined) {
    // Normalize channel handle (ensure @ if username or leave negative number if chat ID)
    let cleaned = channel.trim();
    if (cleaned && !cleaned.startsWith('@') && !cleaned.startsWith('-') && isNaN(Number(cleaned))) {
      cleaned = `@${cleaned}`;
    }
    await setSetting('force_join_channel', cleaned);
  }
  if (title !== undefined) {
    await setSetting('force_join_title', title.trim());
  }

  return getForceJoinConfig();
}
