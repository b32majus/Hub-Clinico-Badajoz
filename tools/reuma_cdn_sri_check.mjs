// Tramo 3 (seguridad Reuma): sin SheetJS por CDN; todo recurso externo restante lleva SRI. Solo lectura.
import fs from 'node:fs';
const root = new URL('../', import.meta.url);
const fails = [];
const REUMA = ['dashboard_paciente', 'dashboard_search', 'estadisticas', 'manage_professionals', 'primera_visita', 'reuma_index', 'seguimiento'];
for (const p of REUMA) {
  const h = fs.readFileSync(new URL(p + '.html', root), 'utf8');
  for (const tag of h.match(/<(script|link)\b[^>]*>/g) || []) {
    const url = (tag.match(/(?:src|href)="(https?:[^"]+)"/) || [])[1];
    if (!url) continue;
    if (/xlsx/.test(url)) fails.push(p + ': SheetJS por CDN (' + url + ')');
    else if (!/integrity="sha384-[A-Za-z0-9+/=]+"/.test(tag) || !/crossorigin="anonymous"/.test(tag)) fails.push(p + ': sin SRI/crossorigin (' + url + ')');
  }
  if (/xlsx/.test(h) && !/src="vendor\/sheetjs\/xlsx\.full\.min\.js/.test(h)) fails.push(p + ': no carga vendor/sheetjs');
}
const v = fs.readFileSync(new URL('vendor/sheetjs/xlsx.full.min.js', root), 'utf8');
if (!/version="0\.18\.5"/.test(v)) fails.push('vendor/sheetjs no es 0.18.5');
if (fails.length) { console.error('FALLA:\n- ' + fails.join('\n- ')); process.exit(1); }
console.log('reuma_cdn_sri_check OK');
