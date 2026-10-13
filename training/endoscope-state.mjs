export const scopeControlCodes=Object.freeze(['KeyW','KeyS','KeyA','KeyD','KeyQ','KeyE','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyI','KeyJ','KeyK','KeyL','KeyC']);
export const scopeToolStages=Object.freeze(['idle','introduced','opened','sampled','retracted']);
const limits={progress:[0,1,0],yaw:[-1.5,1.5,0],pitch:[-1.5,1.5,0],roll:[-Math.PI,Math.PI,0],gas:[0,1,.36],fluid:[0,1,.08],lens:[0,.65,0],time:[0,86400,0]};

// Old checkpoints may lack obscuration/time fields. Invalid values use safe defaults.
export function normalizeScopeSnapshot(value){
 const input=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
 const state={};
 for(const [key,[min,max,fallback]] of Object.entries(limits))state[key]=Number.isFinite(input[key])?Math.max(min,Math.min(max,input[key])):fallback;
 state.retroflex=input.retroflex===true;
 return state;
}
export function scopeAngle(axis,value){
 if(!['yaw','pitch','roll'].includes(axis)||!Number.isFinite(value))return null;
 const [min,max]=limits[axis];return Math.max(min,Math.min(max,value));
}
export function scopeKeyAllowed(event){
 const editing=['INPUT','TEXTAREA','SELECT'].includes(event.target?.tagName)||event.target?.isContentEditable;
 return !editing&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&scopeControlCodes.includes(event.code);
}
export function scopeAdvanceBlocked({yaw,pitch,gas,viewClearance,nextClearance}){
 return ![yaw,pitch,gas,viewClearance,nextClearance].every(Number.isFinite)||Math.abs(yaw)>.95||Math.abs(pitch)>.95||gas<.09||viewClearance>-.05||nextClearance>-.05;
}
