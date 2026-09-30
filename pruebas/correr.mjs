// Ejecuta pruebas/pruebas.html en Chrome headless e imprime el resultado.
// Uso: node pruebas/correr.mjs [--capturas]
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const conCapturas = process.argv.includes('--capturas');
const pagina = pathToFileURL(path.join(aqui, 'pruebas.html')).href + (conCapturas ? '?capturas' : '');
const candidatos = [
  process.env.NAVEGADOR,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
].filter(Boolean);
const navegador = candidatos.find(p => fs.existsSync(p));
if(!navegador){ console.error('No encontré Chrome ni Edge (define NAVEGADOR)'); process.exit(2); }

const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'miniaturas-'));
const html = execFileSync(navegador, [
  '--headless=new', '--disable-gpu', '--allow-file-access-from-files',
  '--user-data-dir=' + perfil, '--virtual-time-budget=30000', '--dump-dom', pagina
], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
try{ fs.rmSync(perfil, { recursive: true, force: true }); }catch{}

const desescapar = s => s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&amp;/g,'&');
const m = html.match(/<pre id="resultado">([\s\S]*?)<\/pre>/);
const texto = m ? desescapar(m[1]) : 'sin resultado\n1 FALLA(S)';
console.log(texto);

if(conCapturas){
  const c = html.match(/<pre id="capturas">([\s\S]*?)<\/pre>/);
  if(c && c[1].trim()){
    const dir = path.join(aqui, 'capturas');
    fs.mkdirSync(dir, { recursive: true });
    for(const [nombre, url] of Object.entries(JSON.parse(desescapar(c[1])))){
      fs.writeFileSync(path.join(dir, nombre + '.png'), Buffer.from(url.split(',')[1], 'base64'));
      console.log('captura: pruebas/capturas/' + nombre + '.png');
    }
  }
}
process.exit(/TODO OK\s*$/.test(texto) ? 0 : 1);
