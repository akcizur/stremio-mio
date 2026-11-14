export type LibraryMediaType = "movie" | "series" | "episode" | "channel";

export interface LibraryEntry {
  id: string;
  title: string;
  subtitle: string;
  mediaType: LibraryMediaType;
  addedAt: number;
  isFavorite: boolean;
  playbackPositionSeconds: number;
}

export interface PlaybackHistoryEntry {
  id: string;
  title: string;
  uri: string;
  kind: "hls" | "dash" | "file";
  lastPlayedAt: number;
  positionSeconds: number;
  durationSeconds: number | null;
}

export interface LibraryRepository {
  list(): Promise<LibraryEntry[]>;
  put(entry: LibraryEntry): Promise<void>;
  remove(id: string): Promise<void>;
  listHistory(): Promise<PlaybackHistoryEntry[]>;
  putHistory(entry: PlaybackHistoryEntry): Promise<void>;
  removeHistory(id: string): Promise<void>;
  clearHistory(): Promise<void>;
}

const DATABASE_NAME = "mio-local";
const DATABASE_VERSION = 2;
const STORE_NAME = "library-items";
const HISTORY_STORE_NAME = "playback-history";

export function sortLibraryEntries(entries: LibraryEntry[]): LibraryEntry[] {
  return [...entries].sort((left, right) => right.addedAt - left.addedAt);
}

export function sortPlaybackHistory(entries: PlaybackHistoryEntry[]): PlaybackHistoryEntry[] {
  return [...entries].sort((left, right) => right.lastPlayedAt - left.lastPlayedAt);
}

export class IndexedDbLibraryRepository implements LibraryRepository {
  private databasePromise: Promise<IDBDatabase> | null = null;

  async list(): Promise<LibraryEntry[]> {
    const entries = await this.execute<LibraryEntry[]>(STORE_NAME, "readonly", (store) => store.getAll());
    return sortLibraryEntries(entries);
  }

  async put(entry: LibraryEntry): Promise<void> {
    await this.execute<IDBValidKey>(STORE_NAME, "readwrite", (store) => store.put(entry));
  }

  async remove(id: string): Promise<void> {
    await this.execute<undefined>(STORE_NAME, "readwrite", (store) => store.delete(id));
  }

  async listHistory(): Promise<PlaybackHistoryEntry[]> {
    const entries = await this.execute<PlaybackHistoryEntry[]>(HISTORY_STORE_NAME, "readonly", (store) => store.getAll());
    return sortPlaybackHistory(entries);
  }

  async putHistory(entry: PlaybackHistoryEntry): Promise<void> {
    await this.execute<IDBValidKey>(HISTORY_STORE_NAME, "readwrite", (store) => store.put(entry));
  }

  async removeHistory(id: string): Promise<void> {
    await this.execute<undefined>(HISTORY_STORE_NAME, "readwrite", (store) => store.delete(id));
  }

  async clearHistory(): Promise<void> {
    await this.execute<undefined>(HISTORY_STORE_NAME, "readwrite", (store) => store.clear());
  }

  private database(): Promise<IDBDatabase> {
    if (typeof indexedDB === "undefined") {
      return Promise.reject(new Error("Toto prostředí nepodporuje IndexedDB."));
    }

    if (this.databasePromise) return this.databasePromise;

    this.databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
        if (!database.objectStoreNames.contains(HISTORY_STORE_NAME)) {
          database.createObjectStore(HISTORY_STORE_NAME, { keyPath: "id" });
        }
      };

      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => database.close();
        resolve(database);
      };

      request.onerror = () => {
        this.databasePromise = null;
        reject(request.error ?? new Error("Databázi MIO se nepodařilo otevřít."));
      };

      request.onblocked = () => {
        this.databasePromise = null;
        reject(new Error("Databázi MIO blokuje jiná otevřená verze aplikace."));
      };
    });

    return this.databasePromise;
  }

  private async execute<T>(
    storeName: string,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    const database = await this.database();

    return new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(storeName, mode);
      const request = operation(transaction.objectStore(storeName));
      let result: T;

      request.onsuccess = () => {
        result = request.result;
      };

      request.onerror = () => {
        reject(request.error ?? new Error("Operace nad knihovnou MIO selhala."));
      };

      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => {
        reject(transaction.error ?? new Error("Transakce knihovny MIO selhala."));
      };
      transaction.onabort = () => {
        reject(transaction.error ?? new Error("Transakce knihovny MIO byla přerušena."));
      };
    });
  }
}
