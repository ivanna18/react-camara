import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';
import { parseStudyNote, type StudyNote } from './study-notes';

export type SavedStudyNote = StudyNote & {
  id: number;
  createdAt: string;
};

type StudyNoteRow = {
  id: number;
  created_at: string;
  note_json: string;
};

const DATABASE_NAME = 'fotoapuntes.db';
const WEB_HISTORY_KEY = 'fotoapuntes.history';

let databasePromise: Promise<SQLiteDatabase> | undefined;

async function getDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openDatabaseAsync(DATABASE_NAME)
      .then(async (database) => {
        await database.execAsync(`
          CREATE TABLE IF NOT EXISTS study_note_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            note_json TEXT NOT NULL
          );
        `);
        return database;
      })
      .catch((error: unknown) => {
        databasePromise = undefined;
        throw error;
      });
  }

  return databasePromise;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseSavedStudyNote(value: unknown): SavedStudyNote {
  if (
    !isRecord(value) ||
    typeof value.id !== 'number' ||
    !Number.isSafeInteger(value.id) ||
    typeof value.createdAt !== 'string'
  ) {
    throw new Error('Un registro del historial no tiene el formato esperado.');
  }

  return {
    ...parseStudyNote(JSON.stringify(value)),
    id: value.id,
    createdAt: value.createdAt,
  };
}

function getWebHistory(): SavedStudyNote[] {
  if (typeof globalThis.localStorage === 'undefined') {
    throw new Error('El almacenamiento local no está disponible en este navegador.');
  }

  const storedHistory = globalThis.localStorage.getItem(WEB_HISTORY_KEY);
  if (!storedHistory) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(storedHistory);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('El historial guardado está dañado y no se pudo leer.');
    }
    throw error;
  }

  if (!Array.isArray(parsed)) {
    throw new Error('El historial guardado no tiene el formato esperado.');
  }

  return parsed.map(parseSavedStudyNote).sort((a, b) => b.id - a.id);
}

function fromRow(row: StudyNoteRow): SavedStudyNote {
  return {
    ...parseStudyNote(row.note_json),
    id: row.id,
    createdAt: row.created_at,
  };
}

export async function saveStudyNote(note: StudyNote): Promise<SavedStudyNote> {
  const createdAt = new Date().toISOString();

  if (Platform.OS === 'web') {
    const history = getWebHistory();
    const previousMaxId = history.reduce((maxId, savedNote) => Math.max(maxId, savedNote.id), 0);
    const savedNote = {
      ...note,
      id: Math.max(Date.now(), previousMaxId + 1),
      createdAt,
    };
    globalThis.localStorage.setItem(WEB_HISTORY_KEY, JSON.stringify([savedNote, ...history]));
    return savedNote;
  }

  const database = await getDatabase();
  const result = await database.runAsync(
    'INSERT INTO study_note_history (created_at, note_json) VALUES (?, ?)',
    createdAt,
    JSON.stringify(note),
  );

  return {
    ...note,
    id: result.lastInsertRowId,
    createdAt,
  };
}

export async function listStudyNotes(): Promise<SavedStudyNote[]> {
  if (Platform.OS === 'web') {
    return getWebHistory();
  }

  const database = await getDatabase();
  const rows = await database.getAllAsync<StudyNoteRow>(
    'SELECT id, created_at, note_json FROM study_note_history ORDER BY id DESC',
  );
  return rows.map(fromRow);
}

export async function getStudyNote(id?: number): Promise<SavedStudyNote | null> {
  if (Platform.OS === 'web') {
    const history = getWebHistory();
    return id === undefined ? (history[0] ?? null) : (history.find((note) => note.id === id) ?? null);
  }

  const database = await getDatabase();
  const row =
    id === undefined
      ? await database.getFirstAsync<StudyNoteRow>(
          'SELECT id, created_at, note_json FROM study_note_history ORDER BY id DESC LIMIT 1',
        )
      : await database.getFirstAsync<StudyNoteRow>(
          'SELECT id, created_at, note_json FROM study_note_history WHERE id = ?',
          id,
        );

  return row ? fromRow(row) : null;
}
