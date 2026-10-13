/** Save an independent checkpoint; live session mutations must not change it. */
export function savedCheckpoint(session,scope,savedAt=Date.now()){
 return structuredClone({session,scope:scope??null,savedAt});
}

/** A cached view cannot authorize new examination evidence after renderer loss. */
export function needsLiveView(action){
 return ['OBSERVE','PHOTO','FINDING','BIOPSY'].includes(action.type)||(action.type==='PAUSE'&&action.value===false);
}

/** Only complete JPEG captures can enter the image record. */
export function validCapture(pixels){
 if(typeof pixels!=='string'||pixels.length>4000000||!pixels.startsWith('data:image/jpeg;base64,'))return false;
 const payload=pixels.slice('data:image/jpeg;base64,'.length);
 return payload.length>=8&&payload.length%4===0&&/^\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(payload);
}

// Resolve storage errors as data so a parallel scope load never leaves an
// unhandled rejection; the host commits only when its session generation matches.
export async function loadSessionImages(load,sessionId){
 try{
  const stored=await load(sessionId);
  if(!(stored instanceof Map))throw Error('Invalid photo storage');
  const photos=new Map([...stored].filter(([id,pixels])=>typeof id==='string'&&/^photo-\d{1,2}$/.test(id)&&validCapture(pixels)).slice(0,50));
  return {photos,error:null};
 }
 catch(error){return {photos:new Map(),error};}
}
