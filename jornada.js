/* leve — jornada: resultados, agenda, prato, relatórios */
'use strict';

const JTABS = [['resultados', 'Resultados'], ['agenda', 'Agenda'], ['prato', 'Prato'], ['relatorios', 'Relatórios']];
const jtabs = (on) => `<nav class="seg" style="grid-template-columns:repeat(4,minmax(0,1fr))" aria-label="Seções da jornada">${JTABS.map(([k, l]) => `<a href="#/jornada/${k}" class="${on === k ? 'on' : ''}" ${on === k ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>`;

VIEWS.jornada = async (parts) => {
  const sec = parts[0] || 'resultados';
  const fn = { resultados: jResultados, agenda: jAgenda, prato: jPrato, relatorios: jRelatorios }[sec] || jResultados;
  const out = await fn();
  return { ...out, tab: 'jornada' };
};

/* série diária para gráficos */
function serieDias(nDias) {
  const fim = new Date(); const ini = addDays(fim, -(nDias - 1));
  const pesos = pesosOrdenados(S.recs);
  const p0 = num(S.perfil.pesoInicial);
  const dias = [];
  for (let i = 0; i < nDias; i++) {
    const d = addDays(ini, i), k = dayKey(d);
    const { inn, out } = kcalDia(S.recs, k);
    const pd = pesos.filter((p) => dayKey(p.date) === k);
    const temRef = S.recs.some((r) => r.type === 'refeicao' && dayKey(r.date) === k);
    dias.push({ k, d, inn, out, temRef, peso: pd.length ? num(pd[pd.length - 1].kg) : null });
  }
  // peso "vigente" em cada dia (último registro até aquele dia)
  let vig = null;
  const antes = pesos.filter((p) => dayKey(p.date) < dias[0].k);
  vig = antes.length ? num(antes[antes.length - 1].kg) : (S.perfil.inicio && S.perfil.inicio <= dias[0].k ? p0 : null);
  dias.forEach((x) => { if (x.peso != null) vig = x.peso; x.vig = vig; });
  return dias;
}
function periodoDias() {
  const per = S.ui.jPer || 30;
  if (per === 'tudo') return Math.max(7, (S.perfil.inicio ? daysBetween(fromKey(S.perfil.inicio), new Date()) + 1 : 30));
  return per;
}
function svgPeso(dias, W = 326, H = 170) {
  const pts = dias.map((x, i) => ({ i, v: x.peso })).filter((p) => p.v != null);
  const vigs = dias.map((x) => x.vig).filter((v) => v != null);
  if (!vigs.length) return `<div class="empty">Registre o seu peso para ver a linha aqui.</div>`;
  const all = pts.map((p) => p.v).concat(vigs);
  const mx = Math.max(...all), mn = Math.min(...all), padv = Math.max(0.3, (mx - mn) * 0.1);
  const lo = mn - padv, hi = mx + padv, top = 20, bot = 140, x0 = 42;
  const x = (i) => x0 + (W - x0 - 8) * (dias.length === 1 ? 1 : i / (dias.length - 1));
  const y = (v) => top + (hi - v) / (hi - lo) * (bot - top);
  const linePts = dias.map((d, i) => d.vig != null ? [x(i), y(d.vig)] : null).filter(Boolean);
  const line = linePts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const last = linePts[linePts.length - 1];
  const area = line + ` L${last[0].toFixed(1)} ${bot + 6} L${linePts[0][0].toFixed(1)} ${bot + 6} Z`;
  return `<svg role="img" aria-label="Gráfico do peso no período" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block">
    <line x1="0" y1="${y(mx).toFixed(1)}" x2="${W}" y2="${y(mx).toFixed(1)}" stroke="var(--line)"/><line x1="0" y1="${y(mn).toFixed(1)}" x2="${W}" y2="${y(mn).toFixed(1)}" stroke="var(--line)"/>
    <text x="0" y="${(y(mx) - 6).toFixed(1)}" fill="var(--muted)" font-size="11" font-weight="600" font-family="Figtree,sans-serif">${f1(mx)} kg</text>
    <text x="0" y="${(y(mn) + 15).toFixed(1)}" fill="var(--muted)" font-size="11" font-weight="600" font-family="Figtree,sans-serif">${f1(mn)} kg</text>
    <path d="${area}" fill="#FF7A45" fill-opacity=".14"/><path d="${line}" fill="none" stroke="#FF7A45" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    ${pts.map((p) => `<circle cx="${x(p.i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="3.5" fill="#FF7A45"/>`).join('')}
    <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="6" fill="#FF7A45" stroke="var(--card)" stroke-width="3"/>
    <text x="0" y="${H - 4}" fill="var(--muted)" font-size="11" font-family="Figtree,sans-serif">${ddmm(dias[0].d)}</text>
    <text x="${W}" y="${H - 4}" fill="var(--muted)" font-size="11" text-anchor="end" font-family="Figtree,sans-serif">${ddmm(dias[dias.length - 1].d)}</text></svg>`;
}
function svgCalorias(dias, W = 324, H = 190) {
  let grupos = dias.map((d) => ({ inn: d.inn, out: d.out }));
  let un = 'por dia';
  if (dias.length > 31) {
    grupos = [];
    for (let i = dias.length; i > 0; i -= 7) { const g = dias.slice(Math.max(0, i - 7), i); const comRef = g.filter((d) => d.temRef); grupos.unshift({ inn: comRef.length ? comRef.reduce((a, d) => a + d.inn, 0) / comRef.length : 0, out: g.reduce((a, d) => a + d.out, 0) / g.length }); }
    un = 'média por dia, a cada semana';
  }
  const maxK = Math.max(1200, ...grupos.map((g) => Math.max(g.inn, g.out))) * 1.1, baseY = 170, hK = 150;
  const slot = W / grupos.length, bw = Math.max(2, Math.min(16, slot * 0.36));
  const comRef = dias.filter((d) => d.temRef);
  const media = comRef.length ? comRef.reduce((a, d) => a + d.inn, 0) / comRef.length : 0;
  const ay = baseY - media / maxK * hK;
  return { un, media, svg: `<svg role="img" aria-label="Gráfico de calorias no período" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block">
    <line x1="0" y1="${baseY}" x2="${W}" y2="${baseY}" stroke="var(--line)"/>
    ${grupos.map((g, i) => { const cx = slot * i + slot / 2, h1 = g.inn / maxK * hK, h2 = g.out / maxK * hK, r = Math.min(3, bw / 2);
      return `${h1 > 0 ? `<rect x="${(cx - bw - 1).toFixed(1)}" y="${(baseY - h1).toFixed(1)}" width="${bw.toFixed(1)}" height="${h1.toFixed(1)}" rx="${r}" fill="#FF7A45"/>` : ''}${h2 > 0 ? `<rect x="${(cx + 1).toFixed(1)}" y="${(baseY - h2).toFixed(1)}" width="${bw.toFixed(1)}" height="${h2.toFixed(1)}" rx="${r}" fill="var(--mint)"/>` : ''}`; }).join('')}
    ${media ? `<line x1="0" y1="${ay.toFixed(1)}" x2="${W}" y2="${ay.toFixed(1)}" stroke="var(--text)" stroke-width="1.5" stroke-dasharray="3 5"/><text x="${W}" y="${(ay - 6).toFixed(1)}" fill="var(--text)" font-size="11" font-weight="700" text-anchor="end" font-family="Figtree,sans-serif">média ${f0(media)}</text>` : ''}
    <text x="0" y="${H - 4}" fill="var(--muted)" font-size="11" font-family="Figtree,sans-serif">${ddmm(dias[0].d)}</text><text x="${W}" y="${H - 4}" fill="var(--muted)" font-size="11" text-anchor="end" font-family="Figtree,sans-serif">${ddmm(dias[dias.length - 1].d)}</text></svg>` };
}
function resumoPeriodo(dias) {
  const vigs = dias.filter((d) => d.vig != null);
  const perda = vigs.length ? Math.max(0, vigs[0].vig - vigs[vigs.length - 1].vig) : 0;
  const comRef = dias.filter((d) => d.temRef);
  return {
    perda, treinos: dias.filter((d) => d.out > 0).length,
    mediaIn: comRef.length ? comRef.reduce((a, d) => a + d.inn, 0) / comRef.length : 0,
    totalOut: dias.reduce((a, d) => a + d.out, 0), diasRef: comRef.length
  };
}

async function jResultados() {
  const n = periodoDias();
  const dias = serieDias(n);
  const r = resumoPeriodo(dias);
  const cal = svgCalorias(dias);
  const fotos = S.recs.filter((x) => x.type === 'foto').sort((a, b) => new Date(a.date) - new Date(b.date));
  const furls = await Promise.all(fotos.map((f) => photoUrl(f.photoId)));
  const per = S.ui.jPer || 30;
  const html = `<div class="screen">
    ${topBar('Seu esforço', 'Jornada', '', themeBtn())}
    ${jtabs('resultados')}
    <div class="seg" role="group" aria-label="Período" style="grid-template-columns:repeat(4,minmax(0,1fr))">${[[7, '7 dias'], [30, '30 dias'], [90, '90 dias'], ['tudo', 'Tudo']].map(([v, l]) => `<button data-act="jPer" data-v="${v}" class="${per === v ? 'on' : ''}" aria-pressed="${per === v}">${l}</button>`).join('')}</div>
    <section class="hero">
      <span class="sub" style="font-size:13px;font-weight:600">${ddmm(dias[0].d)} a ${ddmm(dias[dias.length - 1].d)} · ${dias.length} dias</span>
      <div class="grid2" style="gap:14px 10px">
        <div class="col" style="gap:2px"><span class="num" style="font-size:30px;letter-spacing:-1px;color:var(--coral)">-${f1(r.perda)} kg</span><span class="small sub">no período</span></div>
        <div class="col" style="gap:2px"><span class="num" style="font-size:30px;letter-spacing:-1px">${r.treinos}</span><span class="small sub">dias com exercício</span></div>
        <div class="col" style="gap:2px"><span class="num" style="font-size:22px">${f0(r.mediaIn)}</span><span class="small sub">kcal ingeridas por dia (média)</span></div>
        <div class="col" style="gap:2px"><span class="num" style="font-size:22px;color:#8FE0BA">${f0(r.totalOut)}</span><span class="small sub">kcal gastas em exercício</span></div>
      </div>
    </section>
    <section class="card"><div class="row between" style="align-items:baseline"><h3>Peso</h3><a href="#/peso/novo" style="font-size:13px;font-weight:800">+ Pesar</a></div>${svgPeso(dias)}</section>
    <section class="card"><div class="row between" style="align-items:baseline"><h3>Calorias</h3><span class="small muted">${cal.un}</span></div>
      <div class="row small muted" style="gap:16px;font-weight:600"><span class="row" style="gap:6px"><i style="width:10px;height:10px;border-radius:3px;background:#FF7A45;display:block"></i>Ingeridas</span><span class="row" style="gap:6px"><i style="width:10px;height:10px;border-radius:3px;background:var(--mint);display:block"></i>Gastas em exercício</span></div>
      ${cal.svg}</section>
    <section class="card tight" style="background:var(--coralSoft);border-color:var(--coralSoft);color:var(--coralDeep);font-weight:600;font-size:14px;line-height:1.5">
      ${r.diasRef || r.treinos ? `Nesse período você registrou refeições em ${r.diasRef} de ${dias.length} dias, treinou em ${r.treinos} dias${r.perda > 0 ? ' e perdeu ' + f1(r.perda) + ' kg' : ''}. Cada registro conta.` : 'Comece a lançar refeições, peso e atividades. Aqui aparece o seu esforço.'}
    </section>
    <section class="card"><div class="row between" style="align-items:baseline"><h3>Fotos da jornada</h3><a href="#/foto/nova" style="font-size:13px;font-weight:800">+ Foto</a></div>
      ${fotos.length ? `<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px">${fotos.map((f, i) => `<a href="#/foto/${f.id}" class="mtile" style="aspect-ratio:3/4"><img src="${furls[i] || ''}" alt="Foto de ${ddmm(f.date)}"><span class="t">${ddmm(f.date)}</span>${f.kg ? `<span class="k">${f1(f.kg)} kg</span>` : ''}</a>`).join('')}</div>` : `<span class="small muted">Guarde fotos (vale foto antiga) para montar o antes e agora.</span>`}
    </section>
  </div>`;
  return { html };
}
ACT.jPer = (el) => { S.ui.jPer = el.dataset.v === 'tudo' ? 'tudo' : Number(el.dataset.v); rerender(); };

/* ---------- Agenda ---------- */
const TIPOS_AG = {
  refeicao: { label: 'Refeições', cor: '#FF7A45' }, aplicacao: { label: 'Caneta', cor: '#5B3FD9' },
  atividade: { label: 'Exercício', cor: '#1E8A6A' }, peso: { label: 'Peso', cor: '#1D1B3A', corDark: '#F3EEE6' }, foto: { label: 'Fotos', cor: '#E0A100' }
};
function agCor(t) { const x = TIPOS_AG[t]; return S.tema === 'dark' && x.corDark ? x.corDark : x.cor; }
function entradaHtml(r) {
  const base = (href, t, sub, val, tp) => `<a class="listbtn" href="${href}"><span class="ico" style="background:${agCor(tp)}22"><i style="width:12px;height:12px;border-radius:6px;background:${agCor(tp)};display:block"></i></span><span class="col" style="flex:1;min-width:0;gap:2px"><b style="font-size:14px">${t}</b><span class="small muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${sub}</span></span><span class="num" style="font-size:15px;white-space:nowrap">${val}</span></a>`;
  if (r.type === 'refeicao') return base('#/refeicao/' + r.id, esc(TIPOS_REF[r.tipo] || 'Refeição') + ' · ' + hhmm(r.date), esc(resumoItens(r)), f0(r.kcalTotal) + ' kcal', 'refeicao');
  if (r.type === 'aplicacao') return base('#/caneta', 'Caneta · ' + esc(r.nome), 'Aplicou ' + esc(r.dose || '') + ' · ' + hhmm(r.date), '1 dose', 'aplicacao');
  if (r.type === 'atividade') return base('#/atividade/' + r.id, esc(r.nome || 'Atividade') + ' · ' + hhmm(r.date), f0(r.minutos) + ' min' + (r.origem === 'samsung' ? ' · Samsung Health' : ' · lançado por você'), f0(r.kcal) + ' kcal', 'atividade');
  if (r.type === 'peso') return base('#/peso/' + r.id, 'Peso', (r.origem === 'balanca' ? 'Da balança' : 'Digitado por você') + ' · ' + hhmm(r.date), f1(num(r.kg)) + ' kg', 'peso');
  if (r.type === 'foto') return base('#/foto/' + r.id, 'Foto da jornada', esc(r.pose || ''), r.kg ? f1(r.kg) + ' kg' : '', 'foto');
  return '';
}
async function jAgenda() {
  const now = new Date();
  const mes = S.ui.agMes || { y: now.getFullYear(), m: now.getMonth() };
  S.ui.agMes = mes;
  const off = S.ui.agOff || {};
  const sel = S.ui.agSel || today();
  const first = new Date(mes.y, mes.m, 1), nd = new Date(mes.y, mes.m + 1, 0).getDate();
  const porDia = {};
  for (const r of S.recs) { if (!TIPOS_AG[r.type]) continue; const k = dayKey(r.date); (porDia[k] = porDia[k] || []).push(r); }
  const counts = {}; Object.keys(TIPOS_AG).forEach((t) => { counts[t] = 0; });
  for (let d = 1; d <= nd; d++) { (porDia[dayKey(new Date(mes.y, mes.m, d))] || []).forEach((r) => counts[r.type]++); }
  const t0 = today();
  let cells = '';
  for (let i = 0; i < first.getDay(); i++) cells += '<span></span>';
  for (let d = 1; d <= nd; d++) {
    const k = dayKey(new Date(mes.y, mes.m, d));
    const tipos = [...new Set((porDia[k] || []).map((r) => r.type).filter((t) => !off[t]))];
    cells += `<button data-act="agSel" data-k="${k}" class="${k === t0 ? 'today' : ''} ${k === sel ? 'sel' : ''} ${k > t0 ? 'fut' : ''}" aria-label="${d} de ${MESES[mes.m]}"><span class="n">${d}</span><span class="dots">${tipos.map((t) => `<i style="background:${k === sel && t === 'peso' ? '#FFF6EA' : agCor(t)}"></i>`).join('')}</span></button>`;
  }
  const ent = (porDia[sel] || []).filter((r) => !off[r.type]).sort((a, b) => new Date(a.date) - new Date(b.date));
  const c = contador(S.recs, sel);
  // sequência de dias registrando (até hoje)
  let seq = 0; for (let d = new Date(); ; d = addDays(d, -1)) { const k = dayKey(d); if ((porDia[k] || []).length || (contador(S.recs, k).agua > 0)) seq++; else if (k !== t0) break; else if (seq === 0 && k === t0) continue; if (seq > 999) break; if (k < (S.perfil.inicio || '2000-01-01')) break; }
  const dMes = Object.keys(porDia).filter((k) => k.startsWith(mes.y + '-' + pad(mes.m + 1)));
  const html = `<div class="screen">
    ${topBar(MESES[mes.m].replace(/^./, (x) => x.toUpperCase()) + ' ' + mes.y, 'Agenda', '', `<div class="row" style="gap:6px"><button class="iconbtn" data-act="agMes" data-d="-1" aria-label="Mês anterior">${icon('back', 18, 2.2)}</button><button class="iconbtn" data-act="agMes" data-d="1" aria-label="Próximo mês">${icon('next', 18, 2.2)}</button></div>`)}
    ${jtabs('agenda')}
    <section class="hero" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:16px 18px">
      <div class="col" style="gap:2px"><span class="num" style="font-size:26px;color:var(--coral)">${seq}</span><span class="small sub">dias seguidos registrando</span></div>
      <div class="col" style="gap:2px"><span class="num" style="font-size:26px">${dMes.filter((k) => porDia[k].some((r) => r.type === 'atividade')).length}</span><span class="small sub">dias com exercício no mês</span></div>
      <div class="col" style="gap:2px"><span class="num" style="font-size:26px">${counts.aplicacao}</span><span class="small sub">aplicações na casa no mês</span></div>
    </section>
    <div class="chips" aria-label="Filtrar por tipo">${Object.entries(TIPOS_AG).map(([t, x]) => `<button class="chip" data-act="agFiltro" data-t="${t}" aria-pressed="${!off[t]}" style="${off[t] ? 'background:transparent;color:var(--muted)' : 'border-color:var(--text)'}"><span class="dot" style="background:${agCor(t)}"></span>${x.label}<span class="small" style="opacity:.75">${counts[t]}</span></button>`).join('')}</div>
    <section class="card" style="padding:12px 10px 14px;gap:4px"><div class="cal">${DIAS_C.map((l) => `<span class="h">${l}</span>`).join('')}${cells}</div></section>
    <section class="col" style="gap:10px">
      <div class="row between" style="align-items:baseline"><h2>${diaLabel(sel)}${sel === t0 ? '' : ''}</h2><span class="small muted">${c.agua ? c.agua + (c.agua === 1 ? ' copo de água · ' : ' copos de água · ') : ''}${c.cafe ? c.cafe + (c.cafe === 1 ? ' café · ' : ' cafés · ') : ''}${ent.length} ${ent.length === 1 ? 'registro' : 'registros'}</span></div>
      ${ent.map(entradaHtml).join('') || `<div class="empty">${sel > t0 ? 'Nada previsto para este dia.' : 'Nenhum registro com os filtros escolhidos.'}</div>`}
    </section>
  </div>`;
  return { html };
}
ACT.agSel = (el) => { S.ui.agSel = el.dataset.k; rerender(); };
ACT.agMes = (el) => { const m = S.ui.agMes; const d = new Date(m.y, m.m + Number(el.dataset.d), 1); S.ui.agMes = { y: d.getFullYear(), m: d.getMonth() }; rerender(); };
ACT.agFiltro = (el) => { S.ui.agOff = { ...(S.ui.agOff || {}), [el.dataset.t]: !(S.ui.agOff || {})[el.dataset.t] }; rerender(); };

/* ---------- Prato: galeria + semana por grupos ---------- */
const GRUPOS_SEMANA = [
  ['Vegetais', [['salada', 'Salada'], ['legumes', 'Legumes'], ['fruta', 'Frutas']]],
  ['Energia', [['carbo', 'Carboidratos']]],
  ['Proteínas', [['branca', 'Carne branca'], ['vermelha', 'Carne vermelha'], ['peixe', 'Peixe'], ['ovos', 'Ovos'], ['laticinio', 'Laticínios']]],
  ['Hidratação', [['agua', 'Água (8 copos)']]]
];
async function jPrato() {
  const tipo = S.ui.prTipo || 'tudo';
  const refs = S.recs.filter((r) => r.type === 'refeicao').sort((a, b) => new Date(b.date) - new Date(a.date));
  const semana = Array.from({ length: 7 }, (_, i) => dayKey(addDays(new Date(), i - 6)));
  const refSem = refs.filter((r) => semana.includes(dayKey(r.date)));
  const diasComFoto = new Set(refSem.filter((r) => r.photoId).map((r) => dayKey(r.date))).size;
  const diasRef = new Set(refSem.map((r) => dayKey(r.date)));
  const mediaSem = diasRef.size ? refSem.reduce((a, r) => a + (num(r.kcalTotal) || 0), 0) / diasRef.size : 0;
  const vis = refs.filter((r) => tipo === 'tudo' || r.tipo === tipo).slice(0, 60);
  const urls = await Promise.all(vis.map((r) => photoUrl(r.photoId)));
  const grupos = {};
  vis.forEach((r, i) => { const k = dayKey(r.date); (grupos[k] = grupos[k] || []).push({ r, u: urls[i] }); });
  // matriz da semana
  const tem = (g, k) => g === 'agua' ? contador(S.recs, k).agua >= 8 : refSem.some((r) => dayKey(r.date) === k && (r.itens || []).some((i) => i.grupo === g));
  const sel = S.ui.prSel || 'fruta';
  const linhas = [];
  GRUPOS_SEMANA.forEach(([sec, gs]) => gs.forEach(([g, nome], j) => {
    const d = semana.map((k) => tem(g, k)); const n = d.filter(Boolean).length;
    const cor = g === 'agua' ? '#3B82C4' : GRUPOS[g].cor;
    linhas.push(`${j === 0 ? `<span class="small muted" style="grid-column:1/-1;font-size:11px;font-weight:800;letter-spacing:.4px;text-transform:uppercase;padding:8px 4px 2px">${sec}</span>` : ''}
      <button data-act="prSel" data-g="${g}" aria-pressed="${sel === g}" style="grid-column:1/-1;display:grid;grid-template-columns:104px repeat(7,minmax(0,1fr)) 34px;gap:4px;align-items:center;min-height:38px;padding:0 4px;border:0;border-radius:12px;background:${sel === g ? (g === 'agua' ? 'var(--waterSoft)' : GRUPOS[g].soft) : 'transparent'};color:${sel === g && S.tema !== 'dark' ? '#1D1B3A' : 'var(--text)'};cursor:pointer;text-align:left">
        <span style="font-size:13px;font-weight:700">${nome}</span>${d.map((v) => `<span style="height:20px;border-radius:7px;background:${v ? cor : 'var(--soft)'}"></span>`).join('')}<span class="num" style="font-size:14px;text-align:right">${n}</span></button>`);
  }));
  const det = (() => {
    if (sel === 'agua') { const n = semana.filter((k) => tem('agua', k)).length; return { nome: 'Água', n, txt: `Bateu os 8 copos em ${n} dias. Hoje está em ${contador(S.recs, today()).agua} copos.` }; }
    const itens = refSem.flatMap((r) => (r.itens || []).filter((i) => i.grupo === sel));
    const cnt = {}; itens.forEach((i) => { const t = i.texto.toLowerCase().replace(/\(.*?\)/g, '').replace(/[0-9]+.*?\b(g|gramas?|unidades?|colheres?|pedaços?|fatias?)\b/g, '').replace(/^[\s\d:,.-]+/, '').trim().split(/[,:-]/)[0].trim(); if (t) cnt[t] = (cnt[t] || 0) + 1; });
    const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t, c]) => `${t} (${c}x)`).join(', ');
    const n = semana.filter((k) => tem(sel, k)).length;
    return { nome: GRUPOS[sel].nome, n, txt: n ? 'Mais frequentes: ' + (top || '—') + '.' : 'Não apareceu nos últimos 7 dias.' };
  })();
  const fracos = [['fruta', 'frutas'], ['salada', 'salada'], ['legumes', 'legumes'], ['peixe', 'peixe']].filter(([g]) => semana.filter((k) => tem(g, k)).length <= 3);
  const html = `<div class="screen">
    ${topBar('Meu prato', 'Jornada', '', themeBtn())}
    ${jtabs('prato')}
    <section class="hero" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:16px 18px">
      <div class="col" style="gap:2px"><span class="num" style="font-size:26px;color:var(--coral)">${refSem.length}</span><span class="small sub">pratos nos últimos 7 dias</span></div>
      <div class="col" style="gap:2px"><span class="num" style="font-size:26px">${f0(mediaSem)}</span><span class="small sub">kcal por dia, média</span></div>
      <div class="col" style="gap:2px"><span class="num" style="font-size:26px">${diasComFoto} de 7</span><span class="small sub">dias com foto</span></div>
    </section>
    <section class="card" style="padding:14px 12px;gap:4px" aria-label="Grupos de alimentos por dia">
      <div style="display:grid;grid-template-columns:104px repeat(7,minmax(0,1fr)) 34px;gap:4px;text-align:center;font-size:11px;font-weight:700;color:var(--muted);padding:0 4px 4px"><span></span>${semana.map((k) => `<span>${DIAS_C[fromKey(k).getDay()]}</span>`).join('')}<span></span></div>
      <div style="display:grid;grid-template-columns:1fr;gap:2px">${linhas.join('')}</div>
    </section>
    <section class="card tight" style="background:${sel === 'agua' ? 'var(--waterSoft)' : GRUPOS[sel].soft};border:0;color:${S.tema === 'dark' ? 'var(--text)' : (sel === 'agua' ? '#1F4E79' : GRUPOS[sel].fg)}"><b style="font-size:14px">${det.nome}: ${det.n} de 7 dias</b><span style="font-size:13px;line-height:1.45">${esc(det.txt)}</span></section>
    ${fracos.length && refSem.length ? `<section class="card tight" style="flex-direction:row;gap:12px;align-items:flex-start;background:var(--coralSoft);border:0;color:var(--coralDeep)">${LOGO(24)}<span style="font-size:14px;font-weight:600;line-height:1.45">${fracos.map(([, l]) => l).join(', ').replace(/, ([^,]*)$/, ' e $1').replace(/^./, (x) => x.toUpperCase())} apareceram em poucos dias. Que tal incluir no próximo prato?</span></section>` : ''}
    <div class="chips">${[['tudo', 'Tudo'], ['cafe', 'Café'], ['almoco', 'Almoço'], ['lanche', 'Lanches'], ['jantar', 'Jantar']].map(([k, l]) => `<button class="chip ${tipo === k ? 'on' : ''}" data-act="prTipo" data-v="${k}">${l}</button>`).join('')}</div>
    ${Object.keys(grupos).length ? Object.entries(grupos).map(([k, xs]) => `<section class="col" style="gap:8px"><div class="row between" style="align-items:baseline"><span class="num" style="font-size:16px">${diaLabel(k)}</span><span class="small muted">${f0(kcalDia(S.recs, k).inn)} kcal</span></div>
      <div class="grid3" style="gap:6px">${xs.map(({ r, u }) => `<a href="#/refeicao/${r.id}" class="mtile">${u ? `<img src="${u}" alt="${esc(resumoItens(r))}">` : `<span style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted);padding:8px;font-size:11px;text-align:center">${esc(resumoItens(r))}</span>`}<span class="t">${esc((TIPOS_REF[r.tipo] || '').replace(' da manhã', ''))}</span><span class="k">${f0(r.kcalTotal)} kcal</span></a>`).join('')}</div></section>`).join('') : `<div class="empty">Suas fotos de prato aparecem aqui.</div>`}
  </div>`;
  return { html };
}
ACT.prTipo = (el) => { S.ui.prTipo = el.dataset.v; rerender(); };
ACT.prSel = (el) => { S.ui.prSel = el.dataset.g; rerender(); };

/* ---------- Relatórios ---------- */
const SECOES = [['peso', 'Peso e medidas'], ['calorias', 'Calorias ingeridas e grupos'], ['exercicio', 'Exercícios'], ['caneta', 'Aplicações da caneta'], ['fotos', 'Fotos de antes e agora']];
function relPeriodo() {
  const p = S.ui.relPer || 'mes', hoje = new Date();
  if (p === 'semana') return [addDays(hoje, -6), hoje];
  if (p === 'mes') return [new Date(hoje.getFullYear(), hoje.getMonth(), 1), hoje];
  if (p === 'tres') return [addDays(hoje, -89), hoje];
  if (p === 'inicio') return [S.perfil.inicio ? fromKey(S.perfil.inicio) : addDays(hoje, -29), hoje];
  return [fromKey(S.ui.relDe || dayKey(addDays(hoje, -29))), fromKey(S.ui.relAte || today())];
}
function dadosRel(de, ate) {
  const k0 = dayKey(de), k1 = dayKey(ate);
  const n = Math.max(1, daysBetween(de, ate) + 1);
  const recs = S.recs.filter((r) => { const k = dayKey(r.date); return k >= k0 && k <= k1; });
  const dias = serieDias(daysBetween(de, new Date()) + 1).filter((d) => d.k >= k0 && d.k <= k1);
  return { n, recs, dias, res: resumoPeriodo(dias) };
}
async function jRelatorios() {
  const [de, ate] = relPeriodo();
  const off = S.ui.relOff || {};
  const { n, recs, res } = dadosRel(de, ate);
  const per = S.ui.relPer || 'mes';
  const html = `<div class="screen">
    ${topBar('Monte o seu', 'Relatórios', '', themeBtn())}
    ${jtabs('relatorios')}
    <section class="col" style="gap:10px"><span class="small muted" style="font-weight:700;font-size:13px">Período</span>
      <div class="chips">${[['semana', 'Esta semana'], ['mes', 'Este mês'], ['tres', '3 meses'], ['inicio', 'Desde o início'], ['livre', 'Personalizado']].map(([k, l]) => `<button class="chip ${per === k ? 'on' : ''}" data-act="relPer" data-v="${k}">${l}</button>`).join('')}</div>
      <div class="grid2"><label class="field">De<div class="input"><input type="date" data-in="relDe" value="${dayKey(de)}"></div></label><label class="field">Até<div class="input"><input type="date" data-in="relAte" value="${dayKey(ate)}"></div></label></div>
    </section>
    <section class="card" style="gap:2px"><span class="small muted" style="font-weight:700;font-size:13px;margin-bottom:4px">O que entra no relatório</span>
      ${SECOES.map(([k, l]) => `<button data-act="relSec" data-k="${k}" aria-pressed="${!off[k]}" class="row" style="min-height:44px;gap:12px;border:0;background:transparent;color:var(--text);font-size:14px;font-weight:600;cursor:pointer;text-align:left;padding:0"><span style="width:22px;height:22px;border-radius:7px;border:2px solid ${off[k] ? 'var(--muted)' : '#FF7A45'};background:${off[k] ? 'transparent' : '#FF7A45'};color:#1D1B3A;display:flex;align-items:center;justify-content:center;flex:none">${off[k] ? '' : icon('check', 14, 3.5)}</span>${l}</button>`).join('')}
    </section>
    <section class="card" style="background:#FFFDF9;color:#1D1B3A" aria-label="Prévia">
      <div class="row between"><span class="row" style="gap:8px">${LOGO(24)}<b class="num" style="font-size:16px">Relatório de ${esc(primeiroNome() || 'você')}</b></span><span class="small" style="color:#6A6580;font-weight:600">${ddmm(de)} a ${ddmm(ate)}</span></div>
      <div class="grid3">
        <div style="background:#FFE6DA;border-radius:12px;padding:10px" class="col"><span class="num" style="font-size:18px;color:#9A3412">-${f1(res.perda)} kg</span><span style="font-size:11px;color:#9A3412">no período</span></div>
        <div style="background:#F1EBE1;border-radius:12px;padding:10px" class="col"><span class="num" style="font-size:18px">${f0(res.mediaIn)}</span><span style="font-size:11px;color:#6A6580">kcal/dia</span></div>
        <div style="background:#DDF1E8;border-radius:12px;padding:10px" class="col"><span class="num" style="font-size:18px;color:#145C46">${res.treinos}</span><span style="font-size:11px;color:#145C46">dias de treino</span></div>
      </div>
      <span class="small" style="color:#6A6580">${n} dias · ${recs.filter((r) => r.type === 'refeicao').length} refeições · ${recs.filter((r) => r.type === 'aplicacao').length} aplicações · ${SECOES.filter(([k]) => !off[k]).length} seções</span>
    </section>
    <a class="btn primary block" style="min-height:56px;font-size:16px" href="#/relatorio?de=${dayKey(de)}&ate=${dayKey(ate)}&s=${SECOES.filter(([k]) => !off[k]).map(([k]) => k).join(',')}">${icon('file', 20)} Gerar relatório em PDF</a>
    <p class="note">${IS_ART ? 'Abre o relatório pronto. Toque em "Baixar relatório" para guardar ou mandar para quem quiser, inclusive para o seu médico.' : 'Abre o relatório pronto. Toque em "Salvar em PDF" e mande para quem quiser, inclusive para o seu médico.'}</p>
  </div>`;
  return { html };
}
ACT.relPer = (el) => { S.ui.relPer = el.dataset.v; rerender(); };
INP.relDe = (el, e) => { if (e.type === 'change' && el.value) { S.ui.relDe = el.value; if (S.ui.relPer !== 'livre') S.ui.relAte = dayKey(relPeriodo()[1]); S.ui.relPer = 'livre'; rerender(); } };
INP.relAte = (el, e) => { if (e.type === 'change' && el.value) { S.ui.relAte = el.value; if (S.ui.relPer !== 'livre') S.ui.relDe = dayKey(relPeriodo()[0]); S.ui.relPer = 'livre'; rerender(); } };
ACT.relSec = (el) => { S.ui.relOff = { ...(S.ui.relOff || {}), [el.dataset.k]: !(S.ui.relOff || {})[el.dataset.k] }; rerender(); };

/* relatório para imprimir / salvar em PDF */
VIEWS.relatorio = async (parts, q) => {
  const de = fromKey(q.de || dayKey(addDays(new Date(), -29))), ate = fromKey(q.ate || today());
  const sec = new Set((q.s || 'peso,calorias,exercicio,caneta,fotos').split(','));
  const { n, recs, dias, res } = dadosRel(de, ate);
  const p = S.perfil;
  const pesos = recs.filter((r) => r.type === 'peso').sort((a, b) => new Date(a.date) - new Date(b.date));
  const refs = recs.filter((r) => r.type === 'refeicao');
  const ativ = recs.filter((r) => r.type === 'atividade');
  const apl = recs.filter((r) => r.type === 'aplicacao').sort((a, b) => new Date(a.date) - new Date(b.date));
  const gcount = {}; refs.forEach((r) => new Set((r.itens || []).map((i) => i.grupo)).forEach((g) => { gcount[g] = (gcount[g] || 0) + 1; }));
  const diasG = {}; refs.forEach((r) => (r.itens || []).forEach((i) => { (diasG[i.grupo] = diasG[i.grupo] || new Set()).add(dayKey(r.date)); }));
  const fotos = S.recs.filter((r) => r.type === 'foto').sort((a, b) => new Date(a.date) - new Date(b.date));
  const fA = fotos[0], fB = fotos.length > 1 ? fotos[fotos.length - 1] : null;
  const [uA, uB] = await Promise.all([fA ? photoUrl(fA.photoId) : null, fB ? photoUrl(fB.photoId) : null]);
  const cal = svgCalorias(dias.length ? dias : serieDias(7));
  const atual = pesoAtual(S.recs, p);
  const html = `<div class="screen sheet-page" style="background:#fff;color:#1D1B3A;--text:#1D1B3A;--muted:#6A6580;--line:#E8E0D4;--card:#fff;--mint:#1E8A6A">
    <div class="row between noprint"><a class="btn ghost" href="#/jornada/relatorios">${icon('back', 18)} Voltar</a><button class="btn primary" data-act="imprimir">${icon('download', 18)} ${IS_ART ? 'Baixar relatório' : 'Salvar em PDF'}</button></div>
    <header class="row between" style="padding-bottom:12px;border-bottom:2px solid #1D1B3A"><span class="row" style="gap:10px">${LOGO(40)}<span class="col" style="gap:2px"><b class="num" style="font-size:22px">Relatório de ${esc(p.nome || 'acompanhamento')}</b><span style="font-size:13px;color:#6A6580">${ddmmyy(de)} a ${ddmmyy(ate)} · ${n} dias</span></span></span><span class="word">leve<b>.</b></span></header>
    <section class="grid4" style="gap:8px">
      <div class="col" style="background:#FFE6DA;border-radius:12px;padding:12px"><span class="num" style="font-size:20px;white-space:nowrap;color:#9A3412">-${f1(res.perda)} kg</span><span style="font-size:11px;color:#9A3412">no período</span></div>
      <div class="col" style="background:#F1EBE1;border-radius:12px;padding:12px"><span class="num" style="font-size:20px;white-space:nowrap">${f1(atual)} kg</span><span style="font-size:11px;color:#6A6580">peso atual · meta ${f1(num(p.meta))}</span></div>
      <div class="col" style="background:#F1EBE1;border-radius:12px;padding:12px"><span class="num" style="font-size:22px">${pctMeta(p, atual)}%</span><span style="font-size:11px;color:#6A6580">da meta</span></div>
      <div class="col" style="background:#DDF1E8;border-radius:12px;padding:12px"><span class="num" style="font-size:22px;color:#145C46">${res.treinos}</span><span style="font-size:11px;color:#145C46">dias com exercício</span></div>
    </section>
    ${sec.has('peso') ? `<section class="col" style="gap:8px"><h3>Peso</h3>${svgPeso(dias.length ? dias : serieDias(7), 640, 200)}
      ${pesos.length ? `<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="text-align:left;color:#6A6580"><th style="padding:6px 0">Data</th><th>Peso</th><th>Cintura</th><th>Quadril</th><th>Pescoço</th></tr></thead><tbody>${pesos.map((x) => `<tr style="border-top:1px solid #E8E0D4"><td style="padding:6px 0">${ddmmyy(x.date)}</td><td><b>${f1(num(x.kg))} kg</b></td><td>${esc(x.cintura || '—')}</td><td>${esc(x.quadril || '—')}</td><td>${esc(x.pescoco || '—')}</td></tr>`).join('')}</tbody></table>` : '<span class="small muted">Sem pesagens no período.</span>'}</section>` : ''}
    ${sec.has('calorias') ? `<section class="col" style="gap:8px"><h3>Calorias e grupos de alimentos</h3><span class="small muted">${refs.length} ${refs.length === 1 ? 'refeição' : 'refeições'} · média de ${f0(res.mediaIn)} kcal por dia com registro (${res.diasRef} ${res.diasRef === 1 ? 'dia' : 'dias'})</span>${cal.svg}
      <div class="grid3" style="gap:6px">${Object.keys(GRUPOS).filter((g) => diasG[g]).map((g) => `<div class="row" style="gap:8px;font-size:13px;padding:8px 10px;border-radius:10px;background:${GRUPOS[g].soft};color:${GRUPOS[g].fg}"><b style="flex:1">${GRUPOS[g].nome}</b><span>${diasG[g].size} ${diasG[g].size === 1 ? 'dia' : 'dias'}</span></div>`).join('') || '<span class="small muted">Sem refeições no período.</span>'}</div></section>` : ''}
    ${sec.has('exercicio') ? `<section class="col" style="gap:8px"><h3>Exercícios</h3><span style="font-size:14px">${ativ.length} ${ativ.length === 1 ? 'atividade' : 'atividades'} · ${f0(ativ.reduce((a, x) => a + (num(x.minutos) || 0), 0))} minutos · ${f0(ativ.reduce((a, x) => a + (num(x.kcal) || 0), 0))} kcal gastas</span></section>` : ''}
    ${sec.has('caneta') ? `<section class="col" style="gap:8px"><h3>Aplicações da caneta</h3>${apl.length ? `<table style="width:100%;border-collapse:collapse;font-size:13px"><tbody>${apl.map((a) => `<tr style="border-top:1px solid #E8E0D4"><td style="padding:6px 0">${ddmmyy(a.date)}</td><td>${esc(a.nome)}</td><td>${esc(a.dose || '')}</td></tr>`).join('')}</tbody></table>` : '<span class="small muted">Sem aplicações registradas no período.</span>'}</section>` : ''}
    ${sec.has('fotos') && uA ? `<section class="col" style="gap:8px"><h3>Antes e agora</h3><div class="grid2">${[[fA, uA], [fB, uB]].filter((x) => x[1]).map(([f, u]) => `<figure style="margin:0"><img src="${u}" alt="" style="width:100%;border-radius:14px;display:block"><figcaption class="small" style="margin-top:4px;font-weight:700">${ddmmyy(f.date)}${f.kg ? ' · ' + f1(f.kg) + ' kg' : ''}</figcaption></figure>`).join('')}</div></section>` : ''}
    <p class="note" style="text-align:left">Gerado pelo app leve em ${ddmmyy(new Date())}. Calorias são estimativas médias feitas a partir das descrições lançadas pelo usuário, só para orientação. Este relatório não substitui avaliação médica ou nutricional.</p>
  </div>`;
  return { html, nav: false };
};
ACT.imprimir = async () => {
  if (!IS_ART) { window.print(); return; }
  const src = $('#app .screen'); if (!src) return;
  const cl = src.cloneNode(true); cl.querySelectorAll('.noprint').forEach((n) => n.remove());
  for (const img of cl.querySelectorAll('img')) { if (img.src.startsWith('blob:')) { try { img.src = await blobToB64(await (await fetch(img.src)).blob()); } catch (e) { img.remove(); } } }
  const css = ($('#leve-css') || {}).textContent || '';
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Relatório leve</title><style>${css}</style></head><body style="background:#fff"><div id="app">${cl.outerHTML}</div><p class="note" style="padding:16px">Para PDF: abra este arquivo no navegador e use Imprimir > Salvar como PDF.</p></body></html>`;
  await salvarArquivo(new Blob([html], { type: 'text/html' }), `leve-relatorio-${today()}.html`, 'text/html');
};
