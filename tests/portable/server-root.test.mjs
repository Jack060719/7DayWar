import {fileURLToPath} from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,copyFileSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';

const roots=[['default',()=>[]],['script-relative',()=>['--root','site']],['absolute Chinese/spaces',dir=>['--root',path.join(dir,'site')]]];

async function setup(args,prepare=()=>{}) {
  const dir=mkdtempSync(path.join(tmpdir(),'ashen root 中文 '));
  let child;
  async function close() {
    if(child?.pid&&child.exitCode===null&&child.signalCode===null){
      const stopped=new Promise(resolve=>child.once('exit',resolve));
      child.kill();
      await stopped;
    }
    rmSync(dir,{recursive:true,force:true});
  }
  try{
    mkdirSync(path.join(dir,'site/full'),{recursive:true});
    mkdirSync(path.join(dir,'site/中文 空白'));
    writeFileSync(path.join(dir,'site/index.html'),'inside');
    writeFileSync(path.join(dir,'site/full/index.html'),'<script type="module" src="./probe.mjs"></script>');
    writeFileSync(path.join(dir,'site/full/probe.mjs'),'export const full=true;');
    writeFileSync(path.join(dir,'site/中文 空白/index.html'),'encoded directory');
    writeFileSync(path.join(dir,'site/probe.mjs'),'export const x=1;');
    writeFileSync(path.join(dir,'site/probe.opus'),'OggS');
    writeFileSync(path.join(dir,'secret'),'outside');
    prepare(dir);
    copyFileSync(new URL('../../portable/server.mjs',import.meta.url),path.join(dir,'server.mjs'));
    child=spawn(process.execPath,[path.join(dir,'server.mjs'),'--port','0',...args(dir)],{cwd:tmpdir(),windowsHide:true});
    let text='',timer;
    const url=await new Promise((resolve,reject)=>{
      timer=setTimeout(()=>reject(Error('Static server startup timed out')),10000);
      child.stdout.on('data',buffer=>{
        text+=buffer;
        const match=/localhost:(\d+)/.exec(text);
        if(match)resolve('http://127.0.0.1:'+match[1]);
      });
      child.stderr.on('data',buffer=>reject(Error(String(buffer))));
      child.once('error',reject);
      child.once('exit',code=>reject(Error('Server exited before ready: '+code)));
    }).finally(()=>clearTimeout(timer));
    return {url,close};
  }catch(error){
    await close();
    throw error;
  }
}

for(const [title,args] of roots){
  test(title+' root serves modules/audio and rejects traversal/write/missing paths',async()=>{
    const server=await setup(args);
    try{
      assert.equal(await(await fetch(server.url+'/')).text(),'inside');
      assert.match((await fetch(server.url+'/probe.mjs')).headers.get('content-type'),/javascript/);
      const audio=await fetch(server.url+'/probe.opus',{method:'HEAD'});
      assert.equal(audio.status,200);
      assert.equal(audio.headers.get('content-type'),'audio/ogg');
      const range=await fetch(server.url+'/probe.opus',{headers:{Range:'bytes=1-2'}});
      assert.equal(range.status,206);
      assert.equal(range.headers.get('content-range'),'bytes 1-2/4');
      assert.equal(await range.text(),'gg');
      for(const target of ['/%2e%2e%2fsecret','/..%5csecret','/%00','/missing']){
        const response=await fetch(server.url+target);
        assert(response.status>=400);
        assert.notEqual(await response.text(),'outside');
      }
      assert.equal((await fetch(server.url+'/',{method:'POST'})).status,405);
    }finally{await server.close()}
  });

  test(title+' directory redirect preserves query, encoded names and relative module loading',async()=>{
    const server=await setup(args);
    try{
      for(const directory of ['/full','/'+encodeURIComponent('中文 空白')]){
        const response=await fetch(server.url+directory+'?mode=test',{redirect:'manual'});
        assert.equal(response.status,301);
        assert.equal(response.headers.get('location'),directory+'/?mode=test');
        const head=await fetch(server.url+directory,{method:'HEAD',redirect:'manual'});
        assert.equal(head.status,301);
        assert.equal(await head.text(),'');
      }
      const page=await fetch(server.url+'/full?mode=test');
      assert.equal(page.status,200);
      assert.equal(page.url,server.url+'/full/?mode=test');
      assert.match(await page.text(),/src=".\/probe.mjs"/);
      assert.equal(await(await fetch(new URL('./probe.mjs',page.url))).text(),'export const full=true;');
    }finally{await server.close()}
  });

  test(title+' root refuses file/directory symlinks outside static root',async t=>{
    let server;
    try{
      server=await setup(args,dir=>{
        symlinkSync(path.join(dir,'secret'),path.join(dir,'site/escape'),'file');
        symlinkSync(dir,path.join(dir,'site/escape-dir'),'dir');
      });
    }catch(error){
      if(['EPERM','EACCES','ENOTSUP'].includes(error.code)){
        t.skip('Environment cannot create symbolic links: '+error.code);
        return;
      }
      throw error;
    }
    try{
      for(const target of ['/escape','/escape-dir','/escape-dir/','/escape-dir/secret']){
        const response=await fetch(server.url+target,{redirect:'manual'});
        assert.equal(response.status,403);
        assert.notEqual(await response.text(),'outside');
      }
    }finally{await server.close()}
  });
}

test('directory link outside root is forbidden before redirect, including Windows junctions',async()=>{
  const server=await setup(()=>[],dir=>symlinkSync(dir,path.join(dir,'site/escape-dir'),process.platform==='win32'?'junction':'dir'));
  try{
    for(const target of ['/escape-dir','/escape-dir/','/escape-dir/secret']){
      const response=await fetch(server.url+target,{redirect:'manual'});
      assert.equal(response.status,403);
      assert.notEqual(await response.text(),'outside');
    }
  }finally{await server.close()}
});

test('missing static root exits before listen with explicit error',async()=>{
  const child=spawn(process.execPath,[fileURLToPath(new URL('../../portable/server.mjs',import.meta.url)),'--root','missing-static-root'],{cwd:tmpdir(),windowsHide:true});
  let text='';
  child.stderr.on('data',buffer=>text+=buffer);
  const code=await new Promise((resolve,reject)=>{child.once('exit',resolve);child.once('error',reject)});
  assert.notEqual(code,0);
  assert.match(text,/ENOENT|Missing|directory/);
});
