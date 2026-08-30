const DATABASE_NAME = "destiny-beyond-game";
const STORE_NAME = "game-state";
const SAVE_ID = "current";

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("indexeddb_request_failed"));
  });
}

export function createIndexedDbSaveRepository({ indexedDBImpl = globalThis.indexedDB } = {}) {
  let databasePromise = null;

  function openDatabase() {
    if (!indexedDBImpl || typeof indexedDBImpl.open !== "function") {
      return Promise.reject(new Error("indexeddb_unavailable"));
    }
    if (databasePromise) return databasePromise;
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDBImpl.open(DATABASE_NAME, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("indexeddb_open_failed"));
      request.onblocked = () => reject(new Error("indexeddb_blocked"));
    });
    return databasePromise;
  }

  async function store(mode) {
    const database = await openDatabase();
    return database.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
  }

  return Object.freeze({
    async load() {
      const saved = await requestToPromise((await store("readonly")).get(SAVE_ID));
      return saved == null ? null : structuredClone(saved);
    },
    async save(gameState) {
      if (!gameState || typeof gameState !== "object") throw new Error("invalid_game_state");
      await requestToPromise((await store("readwrite")).put(structuredClone(gameState), SAVE_ID));
    },
    async clear() {
      await requestToPromise((await store("readwrite")).delete(SAVE_ID));
    },
  });
}
