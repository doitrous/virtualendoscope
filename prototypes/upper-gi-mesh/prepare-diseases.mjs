import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const source='C:/Users/Omar_/OneDrive/Desktop/Gastroenterology sim';
const destination=new URL('./references/diseases/',import.meta.url);fs.mkdirSync(destination,{recursive:true});
const folders=fs.readdirSync(source,{withFileTypes:true}).filter(d=>d.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name));
const manifest=[];
for(const [i,folder] of folders.entries()){
 const id=String(i+1).padStart(2,'0');const images=[];fs.mkdirSync(new URL(id+'/',destination),{recursive:true});
 for(const file of fs.readdirSync(path.join(source,folder.name)).filter(f=>/\.(jpg|png|jpeg)$/i.test(f))){
  const from=path.join(source,folder.name,file),to=new URL(id+'/'+file,destination);fs.copyFileSync(from,to);
  images.push({file:'./references/diseases/'+id+'/'+file,sha256:crypto.createHash('sha256').update(fs.readFileSync(from)).digest('hex')});
 }
 manifest.push({id,folder:folder.name,images});
}
fs.writeFileSync(new URL('manifest.json',destination),JSON.stringify(manifest,null,2));
console.log(manifest.map(d=>`${d.id}: ${d.folder} (${d.images.length})`).join('\n'));
