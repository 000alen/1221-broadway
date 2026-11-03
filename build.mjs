import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {build} from 'esbuild';
const root=new URL('./',import.meta.url),read=path=>readFile(new URL(path,root),'utf8');
const [template,css,js,worker]=await Promise.all([read('template.html'),read('node_modules/leaflet/dist/leaflet.css'),read('node_modules/leaflet/dist/leaflet.js'),build({entryPoints:[new URL('src/worker.mjs',root).pathname],bundle:true,write:false,format:'iife',target:'es2022'})]);
const modelHash=createHash('sha256').update(await read('src/engine.mjs')).update(await read('src/priors.mjs')).digest('hex');
const app=await build({entryPoints:[new URL('src/app.mjs',root).pathname],bundle:true,write:false,format:'iife',target:'es2022',define:{__WORKER_SOURCE__:JSON.stringify(worker.outputFiles[0].text),__MODEL_HASH__:JSON.stringify(modelHash)}});
let html=template;
for(const [marker,value] of Object.entries({'/*LEAFLET_CSS*/':css,'/*LEAFLET_JS*/':js,'/*APP_JS*/':app.outputFiles[0].text})){if(!html.includes(marker))throw Error('Missing '+marker);html=html.replace(marker,()=>value.replaceAll('</script','<\\/script'));}
await mkdir(new URL('dist/',root),{recursive:true});await writeFile(new URL('dist/index.html',root),html);console.log(`Built dist/index.html (${Buffer.byteLength(html)} bytes)`);
