/** Browser-local photo storage; no patient data or network transmission. */
let opening;
function database() {
  opening ??= new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(Error('Photo storage unavailable')); return; }
    const request = indexedDB.open('lumen-learning-records', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('photos', {keyPath:'key'});
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(Error('Close older training tabs to enable photo saving.'));
  }).catch(error => { opening = null; throw error; });
  return opening;
}
export async function savePhoto(sessionId, id, pixels) {
  if (typeof pixels !== 'string' || !pixels.startsWith('data:image/jpeg;base64,') || pixels.length > 4000000) throw Error('Image could not be stored');
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos','readwrite');
    tx.objectStore('photos').put({key:`${sessionId}/${id}`,sessionId,id,pixels});
    tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
  });
}
export async function loadPhotos(sessionId) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos','readonly'), rows = [];
    const request = tx.objectStore('photos').openCursor();
    request.onsuccess = () => {const cursor=request.result;if(cursor){if(cursor.value.sessionId===sessionId)rows.push([cursor.value.id,cursor.value.pixels]);cursor.continue();}else resolve(new Map(rows));};
    request.onerror = () => reject(request.error);
  });
}
export async function retainSessionPhotos(sessionId) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos','readwrite'), request=tx.objectStore('photos').openCursor();
    request.onsuccess = () => {const c=request.result;if(c){if(c.value.sessionId!==sessionId)c.delete();c.continue();}};
    tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
  });
}
