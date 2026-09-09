// Reproducible local media intake. Originals are never modified or uploaded.
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const run=promisify(execFile);
const sourceArg=process.argv[2];
if(!sourceArg)throw Error('Usage: node prepare-videos.mjs <video-directory> [--encode]');
const source=path.resolve(sourceArg);
const root=fileURLToPath(new URL('.',import.meta.url));
const dest=path.join(root,'references/videos');
const executable=name=>process.env.FFMPEG_DIR?path.join(process.env.FFMPEG_DIR,process.platform==='win32'?name+'.exe':name):name;
await fs.access(source).catch(()=>{throw Error(`Source directory not found: ${source}`);});
await fs.mkdir(dest,{recursive:true});
const names=(await fs.readdir(source)).filter(n=>n.toLowerCase().endsWith('.mkv')).sort();
const manifest=[];const hashes=new Map();
for(const [i,name] of names.entries()){
 const input=path.join(source,name),hash=createHash('sha256').update(await fs.readFile(input)).digest('hex');
 const probe=JSON.parse((await run(executable('ffprobe'),['-v','error','-show_format','-show_streams','-of','json',input])).stdout);
 const stream=probe.streams.find(s=>s.codec_type==='video'),duration=Number(probe.format.duration);
 const id=String(i+1).padStart(2,'0'),duplicate=hashes.get(hash);
 const entry={id,title:name.replace(/\.mkv$/i,''),original:name,sha256:hash,duration,width:stream.width,height:stream.height,frameRate:stream.avg_frame_rate,duplicateOf:duplicate||null,board:`./references/videos/${duplicate||id}-board.jpg`,video:`./references/videos/${duplicate||id}.mp4`,sampleTimes:Array.from({length:10},(_,i)=>+(i*duration/10).toFixed(2))};
 if(!duplicate){hashes.set(hash,id);
  await run(executable('ffmpeg'),['-hide_banner','-loglevel','error','-i',input,'-vf',`fps=${10/duration},scale=320:-1,tile=5x2`,'-frames:v','1','-y',path.join(dest,id+'-board.jpg')]);
  if(process.argv.includes('--encode'))await run(executable('ffmpeg'),['-hide_banner','-loglevel','error','-i',input,'-c:v','libx264','-preset','fast','-crf','22','-an','-movflags','+faststart','-y',path.join(dest,id+'.mp4')]);
 }
 manifest.push(entry);console.log(JSON.stringify(entry));
}
await fs.writeFile(path.join(dest,'manifest.json'),JSON.stringify(manifest,null,2));
