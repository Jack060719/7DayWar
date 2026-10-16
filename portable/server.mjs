// Dependency-free, read-only static server. It never reads or writes game saves.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
const directory=path.dirname(fileURLToPath(import.meta.url)),rootIndex=process.argv.indexOf('--root');
if(rootIndex>=0&&(!process.argv[rootIndex+1]||process.argv[rootIndex+1].startsWith('--')))throw Error('Missing --root directory');
const root=fs.realpathSync(path.resolve(directory,rootIndex<0?'site':process.argv[rootIndex+1]));
if(!fs.statSync(root).isDirectory())throw Error('Static root must be a directory');
const lan=process.argv.includes('--lan'),host=lan?'0.0.0.0':'127.0.0.1';
const index=process.argv.indexOf('--port'),port=index<0?8080:Number(process.argv[index+1]);
if(!Number.isInteger(port)||port<0||port>65535)throw Error('Invalid port');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff','.otf':'font/otf','.mp3':'audio/mpeg','.ogg':'audio/ogg','.opus':'audio/ogg','.wav':'audio/wav','.m4a':'audio/mp4'};
const server=http.createServer((req,res)=>{
  const fail=(status,message)=>{res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end(message)};
  if(req.method!=='GET'&&req.method!=='HEAD')return fail(405,'Read-only server');
  let file;
  try{
    const requestUrl=new URL(req.url,'http://localhost'),pathname=decodeURIComponent(requestUrl.pathname);
    if(pathname.includes('\0')||pathname.includes('\\'))return fail(400,'Invalid path');
    file=path.resolve(root,'.'+pathname);
    if(file!==root&&!file.startsWith(root+path.sep))return fail(403,'Forbidden');
    file=fs.realpathSync(file);
    if(file!==root&&!file.startsWith(root+path.sep))return fail(403,'Forbidden');
    if(fs.statSync(file).isDirectory()){
      if(!requestUrl.pathname.endsWith('/')){
        res.writeHead(301,{'Location':requestUrl.pathname.replace(/^\/+/, '/')+'/'+requestUrl.search,'Cache-Control':'no-cache'});
        return res.end();
      }
      file=fs.realpathSync(path.join(file,'index.html'));
    }
    if(!file.startsWith(root+path.sep))return fail(403,'Forbidden');
  }catch{return fail(404,'Not found')}
  const stat=fs.statSync(file);if(!stat.isFile())return fail(404,'Not found');
  let start=0,end=stat.size-1,status=200;
  if(req.headers.range){
    const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if(!match||(!match[1]&&!match[2]))return fail(416,'Invalid range');
    if(!match[1])start=Math.max(0,stat.size-Number(match[2]));
    else start=Number(match[1]);
    if(match[1]&&match[2])end=Math.min(end,Number(match[2]));
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=stat.size){res.setHeader('Content-Range',`bytes */${stat.size}`);return fail(416,'Range outside file')}
    status=206;
  }
  const headers={'Content-Type':mime[path.extname(file).toLowerCase()]||'application/octet-stream','Content-Length':Math.max(0,end-start+1),'Accept-Ranges':'bytes','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'};
  if(status===206)headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;
  res.writeHead(status,headers);
  if(req.method==='HEAD'||!stat.size)return res.end();
  const stream=fs.createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'Port is already in use. Close the other game server, then retry.':error.message);process.exitCode=1});
server.listen(port,host,()=>{
  const actual=server.address().port;
  console.log(`Local game: http://localhost:${actual}/full/`);
  if(lan)for(const rows of Object.values(os.networkInterfaces()))for(const row of rows||[])if(row.family==='IPv4'&&!row.internal)console.log(`LAN candidate: http://${row.address}:${actual}/full/`);
  console.log(lan?'LAN mode: use only a trusted private network. No firewall settings were changed.':'Local-only mode. Use START-LAN.cmd for a phone on the same trusted network.');
  console.log('Keep this window open. Ctrl+C stops the server. Saves stay in each browser.');
});
