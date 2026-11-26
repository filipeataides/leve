/* leve — núcleo: banco local, utilidades, estimativa de alimentos, cálculos */
'use strict';

/* ---------- banco local (IndexedDB) ---------- */
const DB = (() => {
  let dbp = null;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open('leve', 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
        if (!d.objectStoreNames.contains('rec')) {
          const s = d.createObjectStore('rec', { keyPath: 'id' });
          s.createIndex('type', 'type');
          s.createIndex('date', 'date');
        }
        if (!d.objectStoreNames.contains('blob')) d.createObjectStore('blob');
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  async function tx(store, mode, fn) {
    const d = await open();
    return new Promise((res, rej) => {
      const t = d.transaction(store, mode);
      const s = t.objectStore(store);
      let out;
      Promise.resolve(fn(s)).then((v) => { out = v; });
      t.oncomplete = () => res(out);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    });
  }
  const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  return {
    get: (k) => tx('kv', 'readonly', (s) => req(s.get(k))),
    set: (k, v) => tx('kv', 'readwrite', (s) => { s.put(v, k); }),
    all: () => tx('rec', 'readonly', (s) => req(s.getAll())),
    rec: (id) => tx('rec', 'readonly', (s) => req(s.get(id))),
    put: (r) => tx('rec', 'readwrite', (s) => { s.put(r); }),
    del: (id) => tx('rec', 'readwrite', (s) => { s.delete(id); }),
    putBlob: (id, b) => tx('blob', 'readwrite', (s) => { s.put(b, id); }),
    getBlob: (id) => tx('blob', 'readonly', (s) => req(s.get(id))),
    delBlob: (id) => tx('blob', 'readwrite', (s) => { s.delete(id); }),
    blobKeys: () => tx('blob', 'readonly', (s) => req(s.getAllKeys())),
    clearAll: async () => {
      await tx('kv', 'readwrite', (s) => { s.clear(); });
      await tx('rec', 'readwrite', (s) => { s.clear(); });
      await tx('blob', 'readwrite', (s) => { s.clear(); });
    }
  };
})();

/* ---------- utilidades ---------- */
const IS_ART = !!window.__LEVE_ARTIFACT;
/* confirmação dentro do app (no lugar do confirm do navegador) */
function confirmar(msg, sim = 'Sim, apagar', nao = 'Cancelar') {
  return new Promise((res) => {
    const o = document.createElement('div');
    o.className = 'overlay';
    o.innerHTML = `<div class="sheet" role="alertdialog" aria-label="Confirmação" style="gap:16px"><span class="grab"></span><b style="font-size:17px;line-height:1.4"></b><div class="grid2"><button class="btn ghost" data-r="0"></button><button class="btn dark" data-r="1"></button></div></div>`;
    o.querySelector('b').textContent = msg;
    o.querySelector('[data-r="0"]').textContent = nao;
    o.querySelector('[data-r="1"]').textContent = sim;
    o.addEventListener('click', (e) => { const b = e.target.closest('[data-r]'); if (b || e.target === o) { e.stopPropagation(); o.remove(); res(!!(b && b.dataset.r === '1')); } });
    document.body.appendChild(o);
  });
}
/* entrega um arquivo: compartilhar no celular, baixar no navegador ou salvar pelo Claude */
async function salvarArquivo(blob, nome, tipo) {
  if (IS_ART) {
    try {
      const dl = window.claude && (await window.claude.use('downloads'));
      if (dl) { await dl.save({ filename: nome, data: blob }); toast('Arquivo salvo'); return; }
    } catch (e) { if (e && e.code === 'declined') return; }
    toast('Não foi possível salvar aqui'); return;
  }
  const file = new File([blob], nome, { type: tipo || blob.type });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  toast('Arquivo salvo');
}
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const num = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : null; };
const f1 = (n) => (n == null || !isFinite(n) ? '—' : String(Math.round(n * 10) / 10).replace('.', ','));
const f0 = (n) => (n == null || !isFinite(n) ? '—' : Math.round(n).toLocaleString('pt-BR'));
const pad = (n) => String(n).padStart(2, '0');
const dayKey = (d) => { d = new Date(d); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const fromKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const today = () => dayKey(new Date());
const ddmm = (d) => { d = new Date(d); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1); };
const ddmmyy = (d) => { d = new Date(d); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); };
const hhmm = (d) => { d = new Date(d); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const DIAS_C = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const daysBetween = (a, b) => Math.round((fromKey(dayKey(b)) - fromKey(dayKey(a))) / 86400000);
const toLocalInput = (d) => { d = new Date(d); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
function diaLabel(k) {
  const t = today();
  if (k === t) return 'Hoje';
  if (k === dayKey(addDays(new Date(), -1))) return 'Ontem';
  const d = fromKey(k);
  return DIAS[d.getDay()].replace(/^./, (c) => c.toUpperCase()) + ', ' + ddmm(d);
}

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

/* reduz e comprime a foto no próprio celular */
async function compressImage(file, max = 1280, q = 0.82) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * s), h = Math.round(img.naturalHeight * s);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', q));
    return { blob, w, h };
  } finally { URL.revokeObjectURL(url); }
}
const blobUrls = new Map();
async function photoUrl(id) {
  if (!id) return null;
  if (blobUrls.has(id)) return blobUrls.get(id);
  const b = await DB.getBlob(id);
  if (!b) return null;
  const u = URL.createObjectURL(b);
  blobUrls.set(id, u);
  return u;
}

/* ---------- ícones (traço) ---------- */
const IC = {
  home: 'M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  curve: 'M3 6c6 0 7 12 18 12',
  pen: 'M18 2l4 4M15 5l4 4M17 7L7 17l-4 1 1-4L14 4',
  share: 'M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13',
  plus: 'M12 5v14M5 12h14',
  cam: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  drop: 'M12 2.7l5.7 5.7a8 8 0 1 1-11.4 0z',
  cup: 'M17 8h1a4 4 0 0 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z',
  scale: 'M3 21h18M6 21V8a6 6 0 0 1 12 0v13M12 8v4',
  run: 'M13 4a2 2 0 1 0 0-.01M10 22l2-7 3 3v4M8 12l2-4h4l3 4M6 22l4-8',
  photo: 'M4 7h3l2-3h6l2 3h3v13H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  back: 'M15 18l-6-6 6-6',
  next: 'M9 18l6-6-6-6',
  x: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12l5 5 9-10',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14',
  cart: 'M9 21a1 1 0 1 0 0-.01M20 21a1 1 0 1 0 0-.01M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6',
  cal: 'M4 5h16v16H4zM4 10h16M8 3v4M16 3v4',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'
};
const icon = (k, s = 22, w = 2) => `<svg aria-hidden="true" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"><path d="${IC[k] || k}"></path></svg>`;
const LOGO = (s = 36, bg = '#FF7A45', fg = '#1D1B3A') => `<svg aria-hidden="true" width="${s}" height="${s}" viewBox="0 0 32 32"><rect width="32" height="32" rx="10" fill="${bg}"></rect><path d="M7 10.5C13 10.5 14.5 21.5 23.5 21.5" fill="none" stroke="${fg}" stroke-width="3" stroke-linecap="round"></path><circle cx="24" cy="21.5" r="2.6" fill="#FFF6EA"></circle></svg>`;

/* ---------- grupos e estimativa de alimentos (tudo no celular) ---------- */
const GRUPOS = {
  vermelha: { nome: 'Carne vermelha', macro: 'Proteína', cor: '#B42318', soft: '#FCE4E1', fg: '#7A1A12' },
  branca: { nome: 'Carne branca', macro: 'Proteína', cor: '#FF7A45', soft: '#FFE6DA', fg: '#9A3412' },
  peixe: { nome: 'Peixe', macro: 'Proteína', cor: '#3B82C4', soft: '#E3EEF8', fg: '#1F4E79' },
  ovos: { nome: 'Ovos', macro: 'Proteína', cor: '#D08A00', soft: '#FBF0CF', fg: '#7A5600' },
  carbo: { nome: 'Carboidrato', macro: 'Carboidrato', cor: '#E0A100', soft: '#FBF0CF', fg: '#7A5600' },
  legumes: { nome: 'Legumes', macro: 'Vegetais', cor: '#1E8A6A', soft: '#DDF1E8', fg: '#145C46' },
  salada: { nome: 'Salada', macro: 'Vegetais', cor: '#2F6E3B', soft: '#E3F0DC', fg: '#2F5E2A' },
  fruta: { nome: 'Fruta', macro: 'Fruta', cor: '#C2366B', soft: '#FBE3EC', fg: '#7A1F43' },
  laticinio: { nome: 'Laticínio', macro: 'Proteína', cor: '#7B6FB0', soft: '#ECE9F3', fg: '#4A4470' },
  gordura: { nome: 'Gordura', macro: 'Gordura', cor: '#8C86B5', soft: '#ECE9F3', fg: '#4A4470' },
  doce: { nome: 'Doce', macro: 'Doce', cor: '#A855F7', soft: '#F3E8FF', fg: '#6B21A8' },
  bebida: { nome: 'Bebida', macro: 'Bebida', cor: '#64748B', soft: '#E2E8F0', fg: '#334155' },
  outro: { nome: 'Outro', macro: 'Outro', cor: '#94A3B8', soft: '#EEF2F6', fg: '#475569' }
};
/* kcal médias aproximadas — g: kcal por grama; u: kcal por unidade/porção comum; pd: porção padrão em g */
const ALIMENTOS = [
  ['vermelha', ['bife', 'gado', 'carne vermelha', 'carne moída', 'carne moida', 'alcatra', 'patinho', 'picanha', 'maminha', 'costela', 'contrafilé', 'contrafile', 'filé mignon', 'file mignon', 'acém', 'acem', 'cupim', 'fraldinha', 'carne de panela', 'hambúrguer', 'hamburguer', 'carne'], { g: 2.4, pd: 120 }],
  ['vermelha', ['porco', 'lombo', 'bisteca', 'pernil', 'linguiça', 'linguica', 'bacon', 'calabresa'], { g: 2.9, pd: 100 }],
  ['branca', ['frango', 'peito de frango', 'sobrecoxa', 'coxa', 'peru', 'chester', 'galinha'], { g: 1.7, pd: 100 }],
  ['peixe', ['peixe', 'tilápia', 'tilapia', 'salmão', 'salmao', 'atum', 'sardinha', 'merluza', 'bacalhau', 'camarão', 'camarao'], { g: 1.5, pd: 120 }],
  ['ovos', ['ovo', 'omelete', 'omelet'], { u: 75 }],
  ['laticinio', ['queijo', 'muçarela', 'mussarela', 'requeijão', 'requeijao', 'ricota', 'cottage'], { u: 70 }],
  ['laticinio', ['iogurte', 'leite', 'whey'], { u: 110 }],
  ['carbo', ['arroz'], { u: 45 }],
  ['carbo', ['feijão', 'feijao', 'lentilha', 'grão de bico', 'grao de bico'], { u: 70 }],
  ['carbo', ['batata doce', 'batata-doce'], { u: 150 }],
  ['carbo', ['batata', 'purê', 'pure', 'mandioca', 'aipim', 'macaxeira', 'inhame'], { u: 170 }],
  ['carbo', ['macarrão', 'macarrao', 'massa', 'espaguete', 'lasanha', 'nhoque'], { g: 1.6, pd: 150 }],
  ['carbo', ['pão', 'pao', 'torrada', 'tapioca', 'cuscuz', 'wrap', 'bisnaguinha'], { u: 140 }],
  ['carbo', ['farofa', 'farinha', 'aveia', 'granola', 'cereal'], { u: 90 }],
  ['carbo', ['milho', 'polenta'], { u: 90 }],
  ['legumes', ['brócolis', 'brocolis', 'couve-flor', 'couve flor', 'cenoura', 'abobrinha', 'abóbora', 'abobora', 'chuchu', 'vagem', 'beterraba', 'berinjela', 'legume', 'quiabo', 'pimentão', 'pimentao', 'cogumelo'], { u: 12 }],
  ['salada', ['alface', 'salada', 'tomate', 'rúcula', 'rucula', 'pepino', 'agrião', 'agriao', 'repolho', 'couve', 'espinafre', 'cebola'], { u: 15 }],
  ['fruta', ['banana'], { u: 90 }],
  ['fruta', ['maçã', 'maca ', 'maçãs', 'pera', 'laranja', 'mexerica', 'bergamota', 'tangerina', 'mamão', 'mamao', 'manga', 'melão', 'melao', 'melancia', 'abacaxi', 'uva', 'morango', 'kiwi', 'goiaba', 'ameixa', 'fruta', 'açaí', 'acai', 'abacate'], { u: 70 }],
  ['gordura', ['azeite', 'óleo', 'oleo', 'manteiga', 'margarina', 'maionese'], { u: 90 }],
  ['gordura', ['castanha', 'amendoim', 'nozes', 'amêndoa', 'amendoa', 'pasta de amendoim'], { u: 160 }],
  ['doce', ['chocolate', 'bolo', 'doce', 'sorvete', 'pudim', 'brigadeiro', 'biscoito', 'bolacha', 'torta'], { u: 220 }],
  ['bebida', ['refrigerante', 'suco', 'cerveja', 'vinho', 'chopp', 'chope'], { u: 120 }],
  ['bebida', ['café com leite', 'cafe com leite', 'cappuccino', 'capuccino'], { u: 90 }],
  ['bebida', ['café', 'cafe', 'chá', 'cha ', 'água', 'agua'], { u: 3 }]
];
function estimar(texto) {
  const s0 = ' ' + String(texto || '').toLowerCase().normalize('NFC') + ' ';
  if (!s0.trim()) return { grupo: null, kcal: null };
  let hit = null;
  for (const [g, keys, info] of ALIMENTOS) {
    if (keys.some((k) => s0.indexOf(k) >= 0)) { hit = { g, info }; break; }
  }
  const gm = s0.match(/(\d+[.,]?\d*)\s*(g\b|gr\b|gramas?|grs?)/);
  const kgm = s0.match(/(\d+[.,]?\d*)\s*(kg|quilo)/);
  const mlm = s0.match(/(\d+[.,]?\d*)\s*ml/);
  const nm = s0.match(/(\d+[.,]?\d*)/);
  const metade = /\bmeia\b|\bmeio\b|metade/.test(s0);
  let qtd = nm ? num(nm[1]) : (metade ? 0.5 : 1);
  if (/\bum\b|\buma\b/.test(s0) && !nm) qtd = 1;
  if (/\bdois\b|\bduas\b/.test(s0) && !nm) qtd = 2;
  if (/\btrês\b|\btres\b/.test(s0) && !nm) qtd = 3;
  if (!hit) return { grupo: 'outro', kcal: null };
  const { info } = hit;
  let kcal;
  if (info.g) {
    let gramas = gm ? num(gm[1]) : kgm ? num(kgm[1]) * 1000 : null;
    if (gramas == null) gramas = info.pd * (nm ? qtd : (metade ? 0.5 : 1));
    kcal = gramas * info.g;
  } else {
    let q = qtd;
    if (gm && info.u) q = num(gm[1]) / 100;
    if (mlm) q = num(mlm[1]) / 200;
    if (/média|media/.test(s0)) q = q * 1;
    if (/grande/.test(s0)) q = q * 1.4;
    if (/pequen/.test(s0)) q = q * 0.7;
    if (/frit/.test(s0) || /refogad/.test(s0)) q = q * 1.25;
    kcal = q * info.u;
  }
  return { grupo: hit.g, kcal: Math.round(kcal / 5) * 5 };
}

/* ---------- cálculos ---------- */
function pctMeta(perfil, atual) {
  if (!perfil) return 0;
  const ini = num(perfil.pesoInicial), meta = num(perfil.meta);
  if (ini == null || meta == null || atual == null || ini === meta) return 0;
  return Math.max(0, Math.min(100, Math.round((ini - atual) / (ini - meta) * 100)));
}
function pesosOrdenados(recs) {
  return recs.filter((r) => r.type === 'peso' && num(r.kg) != null).sort((a, b) => new Date(a.date) - new Date(b.date));
}
function pesoAtual(recs, perfil) {
  const p = pesosOrdenados(recs);
  return p.length ? num(p[p.length - 1].kg) : num(perfil && perfil.pesoInicial);
}
function contador(recs, k) {
  return recs.find((r) => r.id === 'cnt-' + k) || { id: 'cnt-' + k, type: 'contador', date: fromKey(k).toISOString(), day: k, agua: 0, cafe: 0 };
}
function kcalDia(recs, k) {
  let inn = 0, out = 0;
  for (const r of recs) {
    if (dayKey(r.date) !== k) continue;
    if (r.type === 'refeicao') inn += num(r.kcalTotal) || 0;
    if (r.type === 'atividade') out += num(r.kcal) || 0;
  }
  return { inn, out };
}
/* simula o estoque de doses da casa dia a dia */
function preverCaneta(caneta, desde = new Date()) {
  const pessoas = (caneta && caneta.pessoas) || [];
  if (!pessoas.length) return null;
  const por = Math.max(1, num(caneta.dosesPorAmpola) || 1);
  const sim = { fechadas: Math.max(0, num(caneta.fechadas) || 0) };
  pessoas.forEach((p) => { sim[p.id] = Math.max(0, num(p.aberta) || 0); });
  const fila = [];
  let falta = null;
  const d = new Date(desde); d.setHours(12, 0, 0, 0);
  for (let i = 0; i < 730 && !falta; i++) {
    d.setDate(d.getDate() + 1);
    for (const p of pessoas) {
      if (Number(p.dia) !== d.getDay()) continue;
      if (sim[p.id] > 0) sim[p.id]--;
      else if (sim.fechadas > 0) { sim.fechadas--; sim[p.id] = por - 1; }
      else { falta = { p, dt: new Date(d) }; break; }
      fila.push({ p, dt: new Date(d) });
    }
  }
  const total = pessoas.reduce((a, p) => a + (num(p.aberta) || 0), 0) + (num(caneta.fechadas) || 0) * por;
  return { fila, falta, total, ultimo: fila.length ? fila[fila.length - 1].dt : null };
}
function proximaAplicacao(p, desde = new Date()) {
  const d = new Date(desde); d.setHours(12, 0, 0, 0);
  for (let i = 0; i < 8; i++) { if (d.getDay() === Number(p.dia)) return new Date(d); d.setDate(d.getDate() + 1); }
  return null;
}

/* curva da jornada: linha do início até hoje, tracejado até a meta */
function curvaPath(serie, perfil, W, H, opt = {}) {
  const top = opt.top ?? 22, bottom = opt.bottom ?? 24, x0 = opt.x0 ?? 6, gx = W - (opt.right ?? 14);
  const ini = num(perfil.pesoInicial), meta = num(perfil.meta);
  const span = Math.max(0.1, Math.abs(ini - meta));
  const y = (w) => top + Math.max(-0.05, Math.min(1.05, (ini - w) / span)) * (H - top - bottom);
  const atual = serie.length ? serie[serie.length - 1].kg : ini;
  const pct = pctMeta(perfil, atual) / 100;
  const xc = x0 + (gx - x0) * pct;
  let pts;
  if (serie.length >= 2) {
    const t0 = new Date(serie[0].date).getTime(), t1 = new Date(serie[serie.length - 1].date).getTime();
    pts = serie.map((s) => [x0 + (xc - x0) * (t1 > t0 ? (new Date(s.date).getTime() - t0) / (t1 - t0) : 1), y(s.kg)]);
  } else {
    pts = [[x0, y(ini)], [Math.max(xc, x0 + 1), y(atual)]];
  }
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const last = pts[pts.length - 1];
  const base = H - bottom + 4;
  return {
    line, area: line + ` L${last[0].toFixed(1)} ${base} L${pts[0][0].toFixed(1)} ${base} Z`,
    cx: last[0], cy: last[1], gx, gy: y(meta),
    rest: `M${last[0].toFixed(1)} ${last[1].toFixed(1)} L${gx} ${y(meta).toFixed(1)}`
  };
}
