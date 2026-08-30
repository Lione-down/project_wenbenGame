import test from "node:test";
import assert from "node:assert/strict";

import { createIndexedDbSaveRepository } from "../public/indexeddb-save-repository.mjs";

function request(result) {
  const value = {};
  queueMicrotask(() => {
    value.result = result;
    value.onsuccess?.();
  });
  return value;
}

function fakeIndexedDb() {
  const records = new Map();
  const database = {
    objectStoreNames: { contains: () => true },
    createObjectStore() {},
    transaction() {
      return {
        objectStore() {
          return {
            get: (key) => request(records.get(key)),
            put: (value, key) => {
              records.set(key, structuredClone(value));
              return request(key);
            },
            delete: (key) => {
              records.delete(key);
              return request(undefined);
            },
          };
        },
      };
    },
  };
  return {
    open() {
      return request(database);
    },
  };
}

test("P1-A IndexedDB repository saves, loads and clears the authoritative GameState", async () => {
  const repository = createIndexedDbSaveRepository({ indexedDBImpl: fakeIndexedDb() });
  const game = { schemaVersion: 3, player: { name: "沈砚" }, meta: { turn: 7 } };

  await repository.save(game);
  const loaded = await repository.load();
  assert.deepEqual(loaded, game);
  loaded.player.name = "篡改副本";
  assert.equal((await repository.load()).player.name, "沈砚");

  await repository.clear();
  assert.equal(await repository.load(), null);
});

test("P1-A IndexedDB repository fails explicitly when browser storage is unavailable", async () => {
  const repository = createIndexedDbSaveRepository({ indexedDBImpl: null });
  await assert.rejects(() => repository.load(), /indexeddb_unavailable/);
});
