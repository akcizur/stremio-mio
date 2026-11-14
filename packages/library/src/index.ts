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

export interface LibraryRepository {
  list(): Promise<LibraryEntry[]>;
  put(entry: LibraryEntry): Promise<void>;
  remove(id: string): Promise<void>;
}

const DATABASE_NAME = "mio-local";
const DATABASE_VERSION = 1;
const STORE_NAME = "library-items";

export function sortLibraryEntries(entries: LibraryEntry[]): LibraryEntry[] {
  return [...entries].sort((left, right) => right.addedAt - left.addedAt);
}

export class IndexedDbLibraryRepository implements LibraryRepository {
  private databasePromise: Promise<IDBDatabase> | null = null;

  async list(): Promise<LibraryEntry[]> {
    const entries = await this.execute<LibraryEntry[]>("readonly", (store) => store.getAll());
    return sortLibraryEntries(entries);
  }

  async put(entry: LibraryEntry): Promise<void> {
    await this.execute<IDBValidKey>("readwrite", (store) => store.put(entry));
  }

  async remove(id: string): Promise<void> {
    await this.execute<undefined>("readwrite", (store) => store.delete(id));
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
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    const database = await this.database();

    return new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const request = operation(transaction.objectStore(STORE_NAME));
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
