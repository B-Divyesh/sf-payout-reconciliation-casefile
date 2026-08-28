import type { WorkspaceState } from './types';

const DB_NAME = 'casefile-local-v1';
const STORE = 'workspace';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadWorkspace(): Promise<WorkspaceState | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).get('current');
    request.onsuccess = () => resolve(request.result as WorkspaceState | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function saveWorkspace(state: WorkspaceState): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(state, 'current');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearWorkspace(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete('current');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export interface ArchiveItem { id: string; name: string; savedAt: string; state: WorkspaceState }

export async function archiveWorkspace(state: WorkspaceState): Promise<ArchiveItem> {
  const item = { id: crypto.randomUUID(), name: state.name, savedAt: new Date().toISOString(), state };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(item, `archive:${item.id}`);
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  });
  return item;
}

export async function loadArchives(): Promise<ArchiveItem[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).openCursor();
    const items: ArchiveItem[] = [];
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) { resolve(items.sort((a, b) => b.savedAt.localeCompare(a.savedAt))); return; }
      if (String(cursor.key).startsWith('archive:')) items.push(cursor.value as ArchiveItem);
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  });
}
