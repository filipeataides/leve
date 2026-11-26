/* leve — app: estado, rotas, ações, tela inicial, lançar, perfil */
'use strict';

const S = { perfil: null, caneta: null, recs: [], tema: 'light', ui: {} };
const ACT = {};   // ações de clique: data-act
const INP = {};   // ações de digitação/mudança: data-in
const VIEWS = {}; // rotas

async function load() {
  S.perfil = (await DB.get('perfil')) || null;
  S.caneta = (await DB.get('caneta')) || null;
  S.tema = (await DB.get('tema')) || 'light';
  S.recs = await DB.all();
  applyTheme();
}
async function reloadRecs() { S.recs = await DB.all(); }
function applyTheme() {
  document.documentElement.dataset.theme = S.tema === 'dark' ? 'dark' : 'light';
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.content = S.tema === 'dark' ? '#121124' : '#F6F1E9';
}
function go(h) { if (IS_ART) { S.curRoute = h; render(); return; } if (location.hash === h) render(); else location.hash = h; }
function back(fallback = '#/hoje') { if (history.length > 1 && S.ui.navCount > 1) history.back(); else go(fallback); }

function parseRoute() {
  const h = ((IS_ART ? S.curRoute : location.hash) || '#/hoje').slice(2);
  const [path, qs] = h.split('?');
  const parts = path.split('/').filter(Boolean);
  const q = Object.fromEntries(new URLSearchParams(qs || ''));
  return { parts, q };
}
let lastKey = '';
async function render(keepScroll) {
  const { parts, q } = parseRoute();
  if (!S.perfil && parts[0] !== 'inicio') { if (IS_ART) { S.curRoute = '#/inicio'; return render(); } location.replace('#/inicio'); return; }
  const name = parts[0] || 'hoje';
  const view = VIEWS[name] || VIEWS.hoje;
  const key = IS_ART ? S.curRoute : location.hash;
  const y = window.scrollY;
  const app = $('#app');
  const out = await view(parts.slice(1), q);
  app.innerHTML = out.html + (out.nav === false ? '' : navHtml(out.tab || name));
  if (out.after) await out.after(app);
  if (keepScroll && key === lastKey) window.scrollTo(0, y); else if (key !== lastKey) window.scrollTo(0, 0);
  lastKey = key;
}
const rerender = () => render(true);
window.addEventListener('hashchange', () => { S.ui.navCount = (S.ui.navCount || 0) + 1; render(); });

document.addEventListener('click', (e) => {
  if (IS_ART) { const a = e.target.closest('a[href^="#/"]'); if (a && !e.target.closest('[data-act]')) { e.preventDefault(); go(a.getAttribute('href')); return; } }
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = ACT[el.dataset.act];
  if (fn) { const r = fn(el, e); if (r !== 'pass') e.preventDefault(); }
});
['input', 'change'].forEach((ev) => document.addEventListener(ev, (e) => {
  const el = e.target.closest('[data-in]');
  if (!el) return;
  const fn = INP[el.dataset.in];
  if (fn) fn(el, e);
}));

function navHtml(tab) {
  const items = [['hoje', 'Hoje', 'home'], ['jornada', 'Jornada', 'curve'], ['lancar', '', 'plus'], ['caneta', 'Caneta', 'pen'], ['postar', 'Postar', 'share']];
  return `<nav class="nav" aria-label="Menu principal"><div class="in">${items.map(([k, l, ic]) => k === 'lancar'
    ? `<a href="#/lancar" class="plus" aria-label="Lançar"><span>${icon('plus', 28, 3)}</span></a>`
    : `<a href="#/${k}" class="${tab === k ? 'on' : ''}" ${tab === k ? 'aria-current="page"' : ''}>${icon(ic)}${l}</a>`).join('')}</div></nav>`;
}
function topBar(title, sub, backHref, right = '') {
  return `<header class="top">
    ${backHref ? `<a class="iconbtn" href="${backHref}" aria-label="Voltar">${icon('back', 18, 2.2)}</a>` : ''}
    <div class="col" style="flex:1;min-width:0;${backHref ? 'align-items:center;text-align:center' : ''}">
      ${sub ? `<span class="small muted" style="font-weight:600">${esc(sub)}</span>` : ''}
      <h1 style="${backHref ? 'font-size:22px' : ''}">${esc(title)}</h1>
    </div>
    ${right || (backHref ? '<span style="width:44px"></span>' : '')}
  </header>`;
}
const themeBtn = () => `<button class="iconbtn" data-act="tema" aria-label="Alternar modo escuro">${icon(S.tema === 'dark' ? 'sun' : 'moon', 20)}</button>`;
ACT.tema = async () => { S.tema = S.tema === 'dark' ? 'light' : 'dark'; await DB.set('tema', S.tema); applyTheme(); rerender(); };

/* ---------------- TELA INICIAL ---------------- */
function saudacao() { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; }
function primeiroNome() { return ((S.perfil && S.perfil.nome) || '').trim().split(/\s+/)[0] || ''; }

function heroHtml(compact) {
  const p = S.perfil;
  const atual = pesoAtual(S.recs, p);
  const pct = pctMeta(p, atual);
  const ini = num(p.pesoInicial), meta = num(p.meta);
  const perdidos = ini != null && atual != null ? Math.max(0, ini - atual) : 0;
  const faltam = atual != null && meta != null ? Math.max(0, atual - meta) : null;
  const dias = p.inicio ? Math.max(0, daysBetween(fromKey(p.inicio), new Date())) : 0;
  const serie = pesosOrdenados(S.recs).map((r) => ({ date: r.date, kg: num(r.kg) }));
  if (p.inicio && ini != null && (!serie.length || dayKey(serie[0].date) > p.inicio)) serie.unshift({ date: fromKey(p.inicio).toISOString(), kg: ini });
  const c = curvaPath(serie, p, 326, 112);
  return `<section class="hero" aria-label="Sua jornada">
    <div class="row between"><span class="small sub" style="font-weight:600;font-size:13px">Sua jornada</span><span class="pill light">Dia ${dias}</span></div>
    <div class="row" style="align-items:flex-end;gap:10px">
      <span class="big" style="font-size:84px">${pct}<span style="color:var(--coral)">%</span></span>
      <span class="sub" style="font-size:15px;font-weight:600;padding-bottom:10px;line-height:1.3">da meta<br>atingida</span>
    </div>
    <svg role="img" aria-label="Curva do peso até a meta" viewBox="0 0 326 112" style="width:100%;height:auto;display:block;margin-top:4px">
      <path d="${c.area}" fill="#FF7A45" fill-opacity=".16"></path>
      <path d="${c.line}" fill="none" stroke="#FF7A45" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="${c.rest}" fill="none" stroke="#FFF6EA" stroke-opacity=".45" stroke-width="2" stroke-dasharray="3 6" stroke-linecap="round"></path>
      <line x1="${c.gx}" y1="${(c.gy - 22).toFixed(1)}" x2="${c.gx}" y2="${c.gy.toFixed(1)}" stroke="#FFF6EA" stroke-width="2"></line>
      <path d="M${c.gx} ${(c.gy - 22).toFixed(1)} L${c.gx - 13} ${(c.gy - 17).toFixed(1)} L${c.gx} ${(c.gy - 12).toFixed(1)} Z" fill="#FFF6EA"></path>
      <circle cx="${c.cx.toFixed(1)}" cy="${c.cy.toFixed(1)}" r="8" fill="#FF7A45" stroke="#FFF6EA" stroke-width="3"></circle>
      <text x="4" y="12" fill="#C9C3DC" font-size="11" font-weight="600" font-family="Figtree,sans-serif">${f1(ini)} kg</text>
      <text x="322" y="108" fill="#C9C3DC" font-size="11" font-weight="600" text-anchor="end" font-family="Figtree,sans-serif">meta ${f1(meta)} kg</text>
    </svg>
    <div class="grid3" style="margin-top:6px;padding-top:14px;border-top:1px solid rgba(255,246,234,.14)">
      <div class="col" style="gap:2px"><span class="num" style="font-size:22px;color:var(--coral)">-${f1(perdidos)} kg</span><span class="small sub">perdidos</span></div>
      <div class="col" style="gap:2px"><span class="num" style="font-size:22px">${f1(faltam)} kg</span><span class="small sub">para a meta</span></div>
      <a href="#/peso/novo" class="col" style="gap:2px;text-decoration:none;color:inherit"><span class="num" style="font-size:22px">${f1(atual)} kg</span><span class="small sub" style="text-decoration:underline">hoje · pesar</span></a>
    </div>
  </section>`;
}

function quickHtml() {
  const c = contador(S.recs, today());
  const dots = Array.from({ length: 8 }, (_, i) => `<i style="flex:1;height:6px;border-radius:3px;background:${i < c.agua ? '#3B82C4' : 'var(--line)'}"></i>`).join('');
  return `<section class="grid2" aria-label="Lançamento rápido">
    <div class="card tight" style="flex-direction:row;align-items:center;gap:10px;padding:12px">
      <span class="ico" style="width:38px;height:38px;background:var(--waterSoft);color:#3B82C4">${icon('drop', 20, 2.2)}</span>
      <div class="col" style="flex:1;min-width:0;gap:6px"><span style="font-size:13px;font-weight:800">Água ${c.agua}/8</span><span style="display:flex;gap:3px">${dots}</span></div>
      <div class="col" style="gap:4px;align-items:center">
        <button data-act="qa" data-k="agua" data-d="1" aria-label="Mais um copo de água" style="width:34px;height:34px;border:0;border-radius:17px;background:#1F4E79;color:#fff;font-size:20px;font-weight:700;cursor:pointer">+</button>
        ${c.agua > 0 ? `<button data-act="qa" data-k="agua" data-d="-1" aria-label="Um copo a menos" style="border:0;background:none;color:var(--muted);font-size:12px;font-weight:700;cursor:pointer;padding:2px 6px">−1</button>` : ''}
      </div>
    </div>
    <div class="card tight" style="flex-direction:row;align-items:center;gap:10px;padding:12px">
      <span class="ico" style="width:38px;height:38px;background:var(--coffeeSoft);color:#A86B3C">${icon('cup', 20, 2.2)}</span>
      <div class="col" style="flex:1;min-width:0;gap:2px"><span style="font-size:13px;font-weight:800">Café</span><span class="small muted">${c.cafe} hoje</span></div>
      <div class="col" style="gap:4px;align-items:center">
        <button data-act="qa" data-k="cafe" data-d="1" aria-label="Mais um café" style="width:34px;height:34px;border:0;border-radius:17px;background:#6B3E1F;color:#fff;font-size:20px;font-weight:700;cursor:pointer">+</button>
        ${c.cafe > 0 ? `<button data-act="qa" data-k="cafe" data-d="-1" aria-label="Um café a menos" style="border:0;background:none;color:var(--muted);font-size:12px;font-weight:700;cursor:pointer;padding:2px 6px">−1</button>` : ''}
      </div>
    </div>
  </section>`;
}
ACT.qa = async (el) => {
  const c = contador(S.recs, today());
  c[el.dataset.k] = Math.max(0, (c[el.dataset.k] || 0) + Number(el.dataset.d));
  await DB.put(c); await reloadRecs(); rerender();
  if (Number(el.dataset.d) > 0) toast(el.dataset.k === 'agua' ? 'Mais um copo de água' : 'Mais um café');
};

function conquistasHtml() {
  const p = S.perfil, atual = pesoAtual(S.recs, p);
  const perd = Math.max(0, (num(p.pesoInicial) || 0) - (atual || 0));
  const ms = [5, 10, 15].map((k) => ({ l: '-' + k, ok: perd >= k }));
  ms.push({ l: 'Meta', ok: atual != null && num(p.meta) != null && atual <= num(p.meta) });
  return `<section class="col" style="gap:8px" aria-label="Conquistas"><span class="small muted" style="font-weight:700;font-size:13px">Conquistas</span>
    <div class="grid4">${ms.map((m) => `<div class="num" style="height:50px;border-radius:16px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:15px;background:${m.ok ? 'var(--coralSoft)' : 'transparent'};color:${m.ok ? 'var(--coralText)' : 'var(--muted)'};border:1px solid ${m.ok ? 'var(--coralSoft)' : 'var(--line)'}">${m.ok ? icon('check', 16, 3) : ''}${m.l}</div>`).join('')}</div></section>`;
}

async function refeicoesDoDia(k) {
  return S.recs.filter((r) => r.type === 'refeicao' && dayKey(r.date) === k).sort((a, b) => new Date(a.date) - new Date(b.date));
}
const TIPOS_REF = { cafe: 'Café da manhã', almoco: 'Almoço', lanche: 'Lanche', jantar: 'Jantar', ceia: 'Ceia' };
function resumoItens(r) { return (r.itens || []).map((i) => i.texto).filter(Boolean).join(', ') || 'Sem descrição'; }

async function canetaAvisoHtml() {
  const c = S.caneta;
  if (!c || !c.pessoas || !c.pessoas.length) {
    return `<a class="listbtn" href="#/caneta" style="background:var(--violetSoft);border-color:var(--violetSoft);color:var(--violetText)"><span class="ico" style="background:var(--card);color:var(--violet)">${icon('pen')}</span><span class="col" style="flex:1"><b style="font-size:14px">Configurar a caneta</b><span class="small">Dose, dia e estoque da casa</span></span>${icon('next', 18)}</a>`;
  }
  const prev = preverCaneta(c);
  const hojeDow = new Date().getDay();
  const hojeAplicou = (pid) => S.recs.some((r) => r.type === 'aplicacao' && r.pessoaId === pid && dayKey(r.date) === today());
  const pend = c.pessoas.filter((p) => Number(p.dia) === hojeDow && !hojeAplicou(p.id));
  const prox = c.pessoas.map((p) => ({ p, d: proximaAplicacao(p, addDays(new Date(), hojeAplicou(p.id) ? 1 : 0)) })).sort((a, b) => a.d - b.d)[0];
  return `${pend.map((p) => `<div class="card tight" style="background:var(--coralSoft);border-color:var(--coralSoft);flex-direction:row;align-items:center;gap:12px">
      <span class="ico" style="background:var(--coral);color:#1D1B3A">${icon('pen')}</span>
      <div class="col" style="flex:1;color:var(--coralDeep)"><b style="font-size:14px">Hoje é dia de aplicar · ${esc(p.nome)}</b><span class="small">${esc(p.dose || '')}</span></div>
      <button class="btn dark" style="min-height:42px;padding:0 14px;font-size:13px" data-act="aplicar" data-p="${p.id}">Apliquei</button></div>`).join('')}
    <a class="listbtn" href="#/caneta" style="background:var(--violetSoft);border-color:var(--violetSoft);color:var(--violetText)">
      <span class="ico" style="background:var(--card);color:var(--violet)">${icon('pen')}</span>
      <span class="col" style="flex:1;min-width:0;gap:2px"><b style="font-size:14px">Caneta${prox ? ' · ' + esc(prox.p.nome) + ' ' + esc(prox.p.dose || '') : ''}</b><span class="small">${prox ? 'Próxima: ' + DIAS[prox.d.getDay()] + ', ' + ddmm(prox.d) : ''}${prev && prev.ultimo ? ' · dura até ' + ddmm(prev.ultimo) : ''}</span></span>
      <span class="col" style="align-items:flex-end;gap:0"><span class="num" style="font-size:24px;line-height:1">${prev ? prev.total : 0}</span><span style="font-size:11px;font-weight:700">doses</span></span>
    </a>`;
}

VIEWS.hoje = async () => {
  const k = today();
  const refs = await refeicoesDoDia(k);
  const { inn, out } = kcalDia(S.recs, k);
  const ativ = S.recs.filter((r) => r.type === 'atividade' && dayKey(r.date) === k);
  const thumbs = await Promise.all(refs.map((r) => photoUrl(r.photoId)));
  const html = `<div class="screen">
    <header class="top">
      <div class="brand">${LOGO(36)}<div class="col" style="gap:3px"><span class="word">leve<b>.</b></span><span class="small muted" style="font-weight:600">${saudacao()}${primeiroNome() ? ', ' + esc(primeiroNome()) : ''}</span></div></div>
      <div class="row" style="gap:8px"><a href="#/perfil" class="iconbtn round" aria-label="Meu perfil" style="background:var(--ink);color:#FFF6EA;border:0;font-family:var(--display);font-weight:800;font-size:17px">${esc((primeiroNome()[0] || 'L').toUpperCase())}</a>${themeBtn()}</div>
    </header>
    ${heroHtml()}
    ${quickHtml()}
    ${conquistasHtml()}
    <section class="card" aria-label="Refeições de hoje">
      <div class="row between" style="align-items:baseline"><h2>Hoje no prato</h2><span class="small muted" style="font-size:13px"><b style="color:var(--text)">${f0(inn)}</b> kcal estimadas</span></div>
      ${refs.length ? refs.map((r, i) => `<a href="#/refeicao/${r.id}" class="row" style="text-decoration:none;color:inherit;gap:12px">
        <span style="width:50px;height:50px;border-radius:14px;overflow:hidden;background:var(--soft);flex:none;display:flex;align-items:center;justify-content:center;color:var(--muted)">${thumbs[i] ? `<img src="${thumbs[i]}" alt="" style="width:100%;height:100%;object-fit:cover">` : icon('cup', 20)}</span>
        <span class="col" style="flex:1;min-width:0;gap:2px"><b style="font-size:14px">${esc(TIPOS_REF[r.tipo] || 'Refeição')} · ${hhmm(r.date)}</b><span class="small muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(resumoItens(r))}</span></span>
        <span class="num" style="font-size:16px">${f0(r.kcalTotal)}</span></a>`).join('') : `<div class="empty">Nenhuma refeição lançada hoje.</div>`}
      <a class="btn primary block" href="#/refeicao/nova">${icon('cam', 22, 2.2)} Fotografar o prato</a>
    </section>
    <section class="card tight" aria-label="Atividade de hoje">
      <div class="row between"><h3>Atividade de hoje</h3><a href="#/atividade/nova" style="font-size:13px;font-weight:800">+ Lançar</a></div>
      ${ativ.length ? ativ.map((a) => `<a href="#/atividade/${a.id}" class="row" style="text-decoration:none;color:inherit;gap:12px"><span class="ico" style="background:var(--mintSoft);color:var(--mint)">${icon('run')}</span><span class="col" style="flex:1;gap:2px"><b style="font-size:14px">${esc(a.nome || 'Atividade')} · ${hhmm(a.date)}</b><span class="small muted">${f0(a.minutos)} min${num(a.distancia) ? ' · ' + f1(num(a.distancia)) + ' km' : ''}</span></span><span class="num" style="font-size:16px">${f0(a.kcal)} kcal</span></a>`).join('') : `<span class="small muted">Nada lançado ainda. Caminhou? Lance aqui.</span>`}
      ${out ? `<div class="row between small" style="padding-top:8px;border-top:1px solid var(--line)"><span class="muted" style="font-weight:600">Balanço do dia</span><span><b>${f0(inn)}</b> ingeridas · <b style="color:var(--mint)">${f0(out)}</b> gastas em exercício</span></div>` : ''}
    </section>
    ${await canetaAvisoHtml()}
  </div>`;
  return { html, tab: 'hoje' };
};

/* ---------------- LANÇAR ---------------- */
VIEWS.lancar = async () => {
  const base = await VIEWS.hoje();
  const c = contador(S.recs, today());
  const op = (href, t, sub, bg, fg, ic) => `<a href="${href}" class="card tight" style="text-decoration:none;color:var(--text);min-height:112px;gap:10px"><span class="ico" style="background:${bg};color:${fg}">${icon(ic)}</span><span class="col" style="gap:2px"><b style="font-size:15px">${t}</b><span class="small muted">${sub}</span></span></a>`;
  const html = base.html + `<div class="overlay" data-act="fecharLancar"><div class="sheet" role="dialog" aria-label="O que você quer lançar" data-stop="1">
    <span class="grab"></span>
    <h1 style="font-size:26px">O que você quer lançar?</h1>
    <a href="#/refeicao/nova" class="row" style="padding:16px;border-radius:22px;background:var(--coral);text-decoration:none;color:#1D1B3A;gap:14px">
      <span class="ico" style="width:52px;height:52px;border-radius:16px;background:#1D1B3A;color:var(--coral)">${icon('cam', 26, 2.2)}</span>
      <span class="col" style="gap:2px"><span class="num" style="font-size:20px">Refeição</span><span style="font-size:13px;font-weight:600">Tire a foto e marque o prato</span></span></a>
    <div class="grid2">
      ${op('#/peso/novo', 'Peso e medidas', 'Balança, cintura, pescoço', 'var(--soft2)', 'var(--text)', 'scale')}
      ${op('#/caneta', 'Caneta', 'Aplicação ou ampola', 'var(--violetSoft)', 'var(--violet)', 'pen')}
      ${op('#/atividade/nova', 'Atividade', 'Caminhada, treino, bike', 'var(--mintSoft)', 'var(--mint)', 'run')}
      ${op('#/foto/nova', 'Foto da jornada', 'Para o antes e agora', '#FBF0CF', '#7A5600', 'photo')}
    </div>
    <div class="grid2">
      <button data-act="qa" data-k="agua" data-d="1" class="row between" style="height:64px;border:0;border-radius:18px;background:var(--waterSoft);color:var(--text);padding:0 14px;cursor:pointer"><span class="col" style="align-items:flex-start;gap:2px"><b style="font-size:14px">+1 copo de água</b><span class="small muted">${c.agua} de 8 hoje</span></span>${icon('drop', 22)}</button>
      <button data-act="qa" data-k="cafe" data-d="1" class="row between" style="height:64px;border:0;border-radius:18px;background:var(--coffeeSoft);color:var(--text);padding:0 14px;cursor:pointer"><span class="col" style="align-items:flex-start;gap:2px"><b style="font-size:14px">+1 café</b><span class="small muted">${c.cafe} hoje</span></span>${icon('cup', 22)}</button>
    </div>
    <a href="#/hoje" class="iconbtn round" aria-label="Fechar" style="align-self:center;width:58px;height:58px;border-radius:29px;background:var(--ink);color:#FFF6EA;border:0">${icon('x', 24, 2.6)}</a>
  </div></div>`;
  return { html, tab: 'hoje' };
};
ACT.fecharLancar = (el, e) => { if (e.target.closest('.sheet')) { const a = e.target.closest('a[href^="#/"]'); if (a && IS_ART) { go(a.getAttribute('href')); return; } return 'pass'; } go('#/hoje'); };

/* ---------------- PERFIL / COMEÇO ---------------- */
function perfilForm(p, first) {
  const v = (x) => esc(x == null ? '' : x);
  const c = S.caneta || { pessoas: [] };
  const eu = c.pessoas[0] || {};
  const doses = ['2,5 mg', '5 mg', '7,5 mg', '10 mg', '12,5 mg', '15 mg'];
  const dSel = S.ui.pf_dose ?? eu.dose ?? '';
  const diaSel = S.ui.pf_dia ?? (eu.dia != null ? Number(eu.dia) : null);
  return `
  <section class="card" aria-label="Seu ponto de partida">
    <h3>Seu ponto de partida</h3>
    <label class="field">Seu nome<div class="input"><input id="pf_nome" value="${v(p.nome)}" placeholder="Como quer ser chamado" autocomplete="given-name"></div></label>
    <div class="grid2">
      <label class="field">Peso no início<div class="input"><input id="pf_ini" inputmode="decimal" value="${v(p.pesoInicial)}" placeholder="100"><span class="un">kg</span></div></label>
      <label class="field">Meta de peso<div class="input"><input id="pf_meta" inputmode="decimal" value="${v(p.meta)}" placeholder="80"><span class="un">kg</span></div></label>
      <label class="field">Início do processo<div class="input"><input id="pf_inicio" type="date" value="${v(p.inicio || today())}"></div></label>
      <label class="field">Altura<div class="input"><input id="pf_alt" inputmode="decimal" value="${v(p.altura)}" placeholder="178"><span class="un">cm</span></div></label>
    </div>
    ${first ? `<label class="field">Peso de hoje (se já mudou desde o início)<div class="input"><input id="pf_hoje" inputmode="decimal" placeholder="opcional"><span class="un">kg</span></div></label>` : ''}
    <span class="small muted">A meta é de peso, não de prazo.</span>
  </section>
  ${first ? `<section class="card" style="background:var(--violetSoft);border-color:var(--violetSoft);color:var(--violetText)" aria-label="Sua caneta">
    <h3>Sua caneta</h3>
    <span class="small">Dose atual</span>
    <div class="chips">${doses.map((d) => `<button class="chip ${dSel === d ? 'on' : ''}" data-act="pfDose" data-v="${d}" aria-pressed="${dSel === d}">${d}</button>`).join('')}</div>
    <span class="small">Dia da semana em que você aplica</span>
    <div class="grid4" style="grid-template-columns:repeat(7,minmax(0,1fr));gap:4px">${DIAS_C.map((l, i) => `<button class="chip ${diaSel === i ? 'on' : ''}" style="justify-content:center;padding:0" data-act="pfDia" data-v="${i}" aria-label="${DIAS[i]}" aria-pressed="${diaSel === i}">${l}</button>`).join('')}</div>
    <span class="small">Estoque, outras pessoas da casa e doses por ampola você ajusta depois na aba Caneta.</span>
  </section>` : ''}`;
}
ACT.pfDose = (el) => { S.ui.pf_dose = el.dataset.v; keepForm(); rerender(); };
ACT.pfDia = (el) => { S.ui.pf_dia = Number(el.dataset.v); keepForm(); rerender(); };
function keepForm() {
  const d = {};
  ['pf_nome', 'pf_ini', 'pf_meta', 'pf_inicio', 'pf_alt', 'pf_hoje'].forEach((k) => { const e = document.getElementById(k); if (e) d[k] = e.value; });
  S.ui.pfDraft = d;
}
function restoreForm() {
  const d = S.ui.pfDraft; if (!d) return;
  Object.entries(d).forEach(([k, v]) => { const e = document.getElementById(k); if (e) e.value = v; });
}

VIEWS.inicio = async () => {
  const html = `<div class="screen sheet-page">
    <header class="col" style="gap:6px;padding-top:8px">${LOGO(48)}<h1 style="margin-top:8px;font-size:34px">Comece aqui</h1><span class="muted" style="font-size:14px;line-height:1.45">Seus dados de partida. Dá para mudar tudo depois no seu perfil.</span></header>
    ${perfilForm(S.perfil || {}, true)}
    <button class="btn primary block" style="min-height:58px;font-size:16px" data-act="salvarPerfil" data-first="1">Começar minha jornada</button>
    <button class="btn ghost block" data-act="importar">Já uso o leve: restaurar backup</button>
    <p class="note">O leve é um auxílio para você se orientar. As calorias são estimativas e a responsabilidade pelo uso é sua. Não substitui médico nem nutricionista. Seus dados ficam só neste celular.</p>
  </div>`;
  return { html, nav: false, after: restoreForm };
};

ACT.salvarPerfil = async (el) => {
  const g = (k) => (document.getElementById(k) || {}).value;
  const ini = num(g('pf_ini')), meta = num(g('pf_meta'));
  if (ini == null || meta == null) { toast('Informe o peso do início e a meta'); return; }
  const first = el.dataset.first === '1';
  const p = { ...(S.perfil || {}), nome: (g('pf_nome') || '').trim(), pesoInicial: ini, meta, inicio: g('pf_inicio') || today(), altura: num(g('pf_alt')) };
  await DB.set('perfil', p); S.perfil = p;
  if (first) {
    const hoje = num(g('pf_hoje'));
    if (hoje != null) await DB.put({ id: uid(), type: 'peso', date: new Date().toISOString(), kg: hoje, origem: 'manual' });
    if (!S.caneta) {
      const c = { pessoas: [], fechadas: 0, dosesPorAmpola: 4 };
      if (S.ui.pf_dose || S.ui.pf_dia != null) c.pessoas.push({ id: uid(), nome: p.nome || 'Eu', dose: S.ui.pf_dose || '', dia: S.ui.pf_dia ?? 1, aberta: 0 });
      await DB.set('caneta', c); S.caneta = c;
    }
  }
  S.ui.pfDraft = null; S.ui.pf_dose = undefined; S.ui.pf_dia = undefined;
  await reloadRecs();
  toast(first ? 'Pronto! Sua jornada começou.' : 'Perfil salvo');
  go('#/hoje');
};

VIEWS.perfil = async () => {
  const nPeso = S.recs.filter((r) => r.type === 'peso').length, nRef = S.recs.filter((r) => r.type === 'refeicao').length;
  const html = `<div class="screen">
    ${topBar('Meu perfil', 'leve.', '#/hoje', themeBtn())}
    ${perfilForm(S.perfil || {}, false)}
    <button class="btn primary block" data-act="salvarPerfil">Salvar perfil</button>
    <section class="card" aria-label="Seus dados">
      <h3>Seus dados</h3>
      <span class="small muted" style="line-height:1.5">Tudo fica guardado só neste celular: ${nPeso} pesagens, ${nRef} refeições e as fotos. Faça um backup de vez em quando e guarde no Drive ou no WhatsApp. Se trocar de celular, é só restaurar.</span>
      <button class="btn dark block" data-act="exportar">${icon('download', 20)} Fazer backup agora</button>
      <button class="btn ghost block" data-act="importar">Restaurar um backup</button>
    </section>
    <section class="card tight" aria-label="Instalar">
      <h3>Instalar no celular</h3>
      <span class="small muted" style="line-height:1.5">No Chrome, toque nos três pontinhos e em "Instalar app" ou "Adicionar à tela inicial". O leve abre em tela cheia e funciona sem internet.</span>
      ${IS_ART ? '' : `<button class="btn ghost block" data-act="instalar" id="btnInstalar" style="${S.ui.installEvt ? '' : 'display:none'}">Instalar agora</button>`}
    </section>
    <button class="btn danger block" data-act="apagarTudo">Apagar todos os dados deste celular</button>
    <p class="note">leve. versão 1.0 · As calorias são estimativas médias, só para orientação. Não substitui médico nem nutricionista.</p>
  </div>`;
  return { html, tab: 'hoje', after: restoreForm };
};

/* backup: JSON com fotos em base64 */
const blobToB64 = (b) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); });
ACT.exportar = async () => {
  toast('Preparando o backup…');
  const keys = await DB.blobKeys();
  const blobs = {};
  for (const k of keys) { const b = await DB.getBlob(k); if (b) blobs[k] = await blobToB64(b); }
  const data = { app: 'leve', v: 1, em: new Date().toISOString(), perfil: S.perfil, caneta: S.caneta, tema: S.tema, recs: S.recs, blobs };
  await salvarArquivo(new Blob([JSON.stringify(data)], { type: 'application/json' }), `leve-backup-${today()}.json`, 'application/json');
};
ACT.importar = () => {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json';
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (d.app !== 'leve') throw new Error('arquivo');
      if (!(await confirmar('Restaurar este backup? Os dados atuais deste celular serão substituídos.', 'Sim, restaurar'))) return;
      await DB.clearAll();
      if (d.perfil) await DB.set('perfil', d.perfil);
      if (d.caneta) await DB.set('caneta', d.caneta);
      if (d.tema) await DB.set('tema', d.tema);
      for (const r of d.recs || []) await DB.put(r);
      for (const [k, u] of Object.entries(d.blobs || {})) { const b = await (await fetch(u)).blob(); await DB.putBlob(k, b); }
      blobUrls.clear(); await load(); toast('Backup restaurado'); go('#/hoje');
    } catch (e) { toast('Não consegui ler esse arquivo de backup'); }
  };
  inp.click();
};
ACT.apagarTudo = async () => {
  if (!(await confirmar('Apagar TODOS os dados do leve deste celular? Isso não tem volta. Faça um backup antes.', 'Apagar tudo'))) return;
  if (!(await confirmar('Tem certeza mesmo? Tudo será apagado.', 'Sim, tenho certeza'))) return;
  await DB.clearAll(); blobUrls.clear(); await load(); go('#/inicio');
};
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); S.ui.installEvt = e; const b = $('#btnInstalar'); if (b) b.style.display = ''; });
ACT.instalar = async () => { const e = S.ui.installEvt; if (!e) return; e.prompt(); await e.userChoice; S.ui.installEvt = null; rerender(); };

/* ---------------- início ---------------- */
async function start() {
  await load();
  if (!IS_ART && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  S.ui.navCount = 0;
  render();
}
