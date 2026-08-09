/* ==========================================================================
   db.js — IndexedDB 轻封装（存放知识库原始文件 Blob / 拍照原图）
   localStorage 只存元数据，二进制走 IndexedDB，避免 5MB 配额瓶颈。
   不支持 IndexedDB 时自动降级为内存 Map（刷新后丢失，但功能不报错）。
   ========================================================================== */
(function (global) {
  'use strict';
  const App = global.App = global.App || {};

  const DB_NAME = 'aigk_files';
  const DB_VER = 1;
  const STORE = 'blobs';

  let dbPromise = null;
  const memory = new Map();
  let useMemory = false;

  function open() {
    if (useMemory) return Promise.reject(new Error('memory-mode'));
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!global.indexedDB) { useMemory = true; return reject(new Error('no-idb')); }
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => { useMemory = true; reject(req.error); };
    });
    return dbPromise;
  }

  function tx(mode) {
    return open().then(db => db.transaction(STORE, mode).objectStore(STORE));
  }

  function put(key, value) {
    return tx('readwrite').then(store => new Promise((res, rej) => {
      const r = store.put(value, key);
      r.onsuccess = () => res(key); r.onerror = () => rej(r.error);
    })).catch(() => { memory.set(key, value); return key; });
  }

  function get(key) {
    return tx('readonly').then(store => new Promise((res, rej) => {
      const r = store.get(key);
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    })).catch(() => memory.get(key));
  }

  function del(key) {
    return tx('readwrite').then(store => new Promise((res, rej) => {
      const r = store.delete(key);
      r.onsuccess = () => res(true); r.onerror = () => rej(r.error);
    })).catch(() => { memory.delete(key); return true; });
  }

  function clear() {
    return tx('readwrite').then(store => new Promise((res, rej) => {
      const r = store.clear();
      r.onsuccess = () => res(true); r.onerror = () => rej(r.error);
    })).catch(() => { memory.clear(); return true; });
  }

  /** 估算已用空间（浏览器支持时） */
  function estimate() {
    if (navigator.storage && navigator.storage.estimate) return navigator.storage.estimate();
    return Promise.resolve({ usage: 0, quota: 0 });
  }

  App.db = { put, get, del, clear, estimate };
})(window);
