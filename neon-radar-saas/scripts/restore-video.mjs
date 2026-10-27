import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
const root=process.cwd(); const dest=path.join(root,'dist');
await mkdir(dest,{recursive:true});
const primary=path.join(root,'public','intro.mp4');
const secondary=path.join(root,'..','neon-radar-site','assets');
if(existsSync(primary))await copyFile(primary,path.join(dest,'intro.mp4'));
else if(existsSync(secondary)){
 let arr=[];
 for(let i=0;i<28;i++){
  const shard=path.join(secondary,`intro-part-${String(i).padStart(2,'0')}.txt`);
  if(!existsSync(shard)){arr=[];break;}
  arr.push(Buffer.from((await readFile(shard,'utf8')).replace(/\s/g,''),'base64'));
 }
 if(arr.length===28)await writeFile(path.join(dest,'intro.mp4'),Buffer.concat(arr));
 const poster=path.join(secondary,'poster.jpg');if(existsSync(poster))await copyFile(poster,path.join(dest,'poster.jpg'));
}
console.log('Intro original: ',existsSync(path.join(dest,'intro.mp4'))?'incluída':'sem arquivo de vídeo');