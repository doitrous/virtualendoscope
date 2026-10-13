import {normalizeScopeSnapshot} from './endoscope-state.mjs';

// Orientation practice always uses normal anatomy at a fixed gastric position.
export const DEMO_CHECKPOINT=Object.freeze({progress:.52,pitch:0,yaw:0,roll:0,retroflex:false,gas:.62,fluid:0,lens:0,time:0});
export function demoCanStart(session,{loading=false,photosLoading=false}={}){
  return !loading&&!photosLoading&&!session?.emergency&&(!session?.biopsy||session.biopsy.stage==='idle');
}
export function demoReturnState({session,checkpoint,room,view,showIntro,startAfter=false}){
  return {sessionId:session?.id??null,checkpoint:checkpoint?normalizeScopeSnapshot(checkpoint):null,room,view,showIntro:!!showIntro,startAfter:!!startAfter};
}
export function caseCheckpoint({demo,scopeReady,scopeSnapshot,pendingScopeCheckpoint,pendingScopeSessionId,sessionId}){
  // Even during an interrupted demo/restore, never write its gastric pose into a case save.
  if(demo)return demo.returnState.sessionId===sessionId?structuredClone(demo.returnState.checkpoint):null;
  return scopeReady?scopeSnapshot:pendingScopeSessionId===sessionId?pendingScopeCheckpoint:null;
}
export function demoBlocksAction(action){return !(action.type==='PAUSE'&&action.value===true);}
