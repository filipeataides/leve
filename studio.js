/* leve — estúdio: artes para Story feitas no celular */
'use strict';

const MODELOS = [['curva', 'Curva', '#1D1B3A', '#FF7A45'], ['antes', 'Antes', '#F6F1E9', '#1D1B3A'], ['marco', 'Conquista', '#FF7A45', '#1D1B3A'], ['prato', 'Prato', '#1D1B3A', '#D9E6D2']];

function dadosArte() {
  const p = S.perfil;
  const ini = num(p.pesoInicial), meta = num(p.meta), atual = pesoAtual(S.recs, p);
  const pct = pctMeta(p, atual);
  const perda = ini != null && atual != null ? Math.max(0, ini - atual) : 0;
  const faltam = atual != null && meta != null ? Math.max(0, atual - meta) : 0;
  const dias = p.inicio ? Math.max(0, daysBetween(fromKey(p.inicio), new Date())) : 0;
  const serie = pesosOrdenados(S.recs).map((r) => ({ date: r.date, kg: num(r.kg) }));
  if (p.inicio && ini != null && (!serie.length || dayKey(serie[0].date) > p.inicio)) serie.unshift({ date: fromKey(p.inicio).toISOString(), kg: ini });
  return { p, ini, meta, atual, pct, perda, faltam, dias, serie };
}
const loadImg = (u) => new Promise((res) => { if (!u) return res(null); const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = u; });
function cover(ctx, img, x, y, w, h, r) {
  ctx.save(); roundRect(ctx, x, y, w, h, r); ctx.clip();
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const iw = img.naturalWidth * s, ih = img.naturalHeight * s;
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih); ctx.restore();
}
function marca(ctx, x, y, escuro) {
  ctx.save();
  ctx.fillStyle = escuro ? '#1D1B3A' : '#FF7A45'; roundRect(ctx, x, y, 24, 24, 7.5); ctx.fill();
  ctx.strokeStyle = escuro ? '#FF7A45' : '#1D1B3A'; ctx.lineWidth = 2.3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x + 5.2, y + 7.9); ctx.bezierCurveTo(x + 9.8, y + 7.9, x + 10.9, y + 16.1, x + 17.6, y + 16.1); ctx.stroke();
  ctx.fillStyle = '#FFF6EA'; ctx.beginPath(); ctx.arc(x + 18, y + 16.1, 2, 0, 7); ctx.fill();
  ctx.font = '800 18px "Bricolage Grotesque", sans-serif'; ctx.fillStyle = escuro ? '#1D1B3A' : '#FFF6EA'; ctx.textBaseline = 'middle';
  ctx.fillText('leve', x + 32, y + 13); const w = ctx.measureText('leve').width;
  ctx.fillStyle = escuro ? '#1D1B3A' : '#FF7A45'; ctx.fillText('.', x + 32 + w, y + 13);
  ctx.restore();
}
function pillTxt(ctx, txt, xr, y, bg, fg) {
  ctx.save(); ctx.font = '700 13px Figtree, sans-serif'; const w = ctx.measureText(txt).width + 24;
  ctx.fillStyle = bg; roundRect(ctx, xr - w, y, w, 28, 14); ctx.fill(); ctx.fillStyle = fg; ctx.textBaseline = 'middle'; ctx.fillText(txt, xr - w + 12, y + 14.5); ctx.restore();
}

async function desenharArte(canvas, modelo, opt) {
  await fontsReady();
  const D = dadosArte();
  const ctx = canvas.getContext('2d');
  canvas.width = 1080; canvas.height = 1920;
  ctx.setTransform(3, 0, 0, 3, 0, 0);
  ctx.textBaseline = 'alphabetic';
  const W = 360, H = 640;
  const grande = opt.perda ? '−' + f1(D.perda) : String(D.pct);

  if (modelo === 'curva') {
    ctx.fillStyle = '#1D1B3A'; ctx.fillRect(0, 0, W, H);
    const c = curvaPath(D.serie, D.p, W, 640, { top: 350, bottom: 95, x0: 0, right: 34 });
    ctx.fillStyle = '#FF7A45';
    const p2 = new Path2D(c.line + ` L${c.cx} ${c.cy} L${c.gx} ${c.gy} L${W} ${c.gy} L${W} ${H} L0 ${H} Z`); ctx.fill(p2);
    ctx.strokeStyle = '#FFF6EA'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(new Path2D(c.line));
    ctx.setLineDash([4, 8]); ctx.globalAlpha = 0.6; ctx.lineWidth = 2.5; ctx.stroke(new Path2D(c.rest)); ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(c.gx, c.gy - 34); ctx.lineTo(c.gx, c.gy); ctx.stroke();
    ctx.fillStyle = '#FFF6EA'; ctx.beginPath(); ctx.moveTo(c.gx, c.gy - 34); ctx.lineTo(c.gx - 18, c.gy - 27); ctx.lineTo(c.gx, c.gy - 20); ctx.fill();
    ctx.fillStyle = '#1D1B3A'; ctx.beginPath(); ctx.arc(c.cx, c.cy, 11, 0, 7); ctx.fill(); ctx.strokeStyle = '#FFF6EA'; ctx.lineWidth = 4; ctx.stroke();
    marca(ctx, 24, 24, false); pillTxt(ctx, 'Dia ' + D.dias, W - 24, 22, '#FFF6EA', '#1D1B3A');
    ctx.fillStyle = '#C9C3DC'; ctx.font = '600 15px Figtree, sans-serif'; ctx.fillText('A minha curva', 24, 112);
    ctx.fillStyle = '#FF7A45'; ctx.font = '800 128px "Bricolage Grotesque", sans-serif'; ctx.fillText(grande, 20, 222);
    const gw = ctx.measureText(grande).width; ctx.fillStyle = '#FFF6EA'; ctx.font = '800 44px "Bricolage Grotesque", sans-serif'; ctx.fillText(opt.perda ? 'kg' : '%', 22 + gw, 222);
    ctx.fillStyle = '#E4DFF2'; ctx.font = '600 17px Figtree, sans-serif';
    wrapText(ctx, opt.perda ? `em ${D.dias} dias de processo. Faltam ${f1(D.faltam)} kg para a meta.` : `da meta, em ${D.dias} dias de processo.`, 312, 2).forEach((l, i) => ctx.fillText(l, 24, 258 + i * 23));
    if (opt.peso) { ctx.fillStyle = '#C9C3DC'; ctx.font = '700 13px Figtree, sans-serif'; ctx.fillText(f1(D.ini) + ' kg', 24, 334); ctx.textAlign = 'right'; ctx.fillStyle = '#1D1B3A'; ctx.fillText('meta ' + f1(D.meta) + ' kg', W - 24, c.gy + 24); ctx.textAlign = 'left'; }
    ctx.fillStyle = '#1D1B3A'; ctx.font = '800 34px "Bricolage Grotesque", sans-serif'; ctx.fillText(D.pct + '% da meta', 24, H - 46);
    ctx.font = '700 13px Figtree, sans-serif'; ctx.fillText('um registro de cada vez', 24, H - 26);
  }

  if (modelo === 'antes') {
    ctx.fillStyle = '#F6F1E9'; ctx.fillRect(0, 0, W, H);
    const fotos = S.recs.filter((r) => r.type === 'foto').sort((a, b) => new Date(a.date) - new Date(b.date));
    const fa = fotos[0], fb = fotos.length > 1 ? fotos[fotos.length - 1] : null;
    const [ia, ib] = await Promise.all([loadImg(fa && await photoUrl(fa.photoId)), loadImg(fb && await photoUrl(fb.photoId))]);
    const diasDif = fa && fb ? daysBetween(fa.date, fb.date) : D.dias;
    ctx.fillStyle = '#C2410C'; ctx.font = '700 14px Figtree, sans-serif'; ctx.fillText('Antes e agora', 24, 44);
    ctx.fillStyle = '#1D1B3A'; ctx.font = '800 44px "Bricolage Grotesque", sans-serif'; ctx.fillText(diasDif + ' dias', 24, 88); ctx.fillText('de diferença', 24, 130);
    const bx = 24, by = 152, bw = 152, bh = 330;
    [[ia, fa, bx, '#E4DCCF', 'Antes'], [ib, fb, bx + bw + 8, '#F3D9CB', 'Agora']].forEach(([img, f, x, bg, lab], j) => {
      if (img) cover(ctx, img, x, by, bw, bh, 22);
      else { ctx.fillStyle = bg; roundRect(ctx, x, by, bw, bh, 22); ctx.fill(); ctx.fillStyle = j ? '#E8B9A2' : '#CFC5B5'; ctx.beginPath(); ctx.arc(x + bw / 2, by + 130, j ? 26 : 30, 0, 7); ctx.fill(); ctx.beginPath(); const sw = j ? 38 : 52; ctx.moveTo(x + bw / 2 - sw, by + bh); ctx.quadraticCurveTo(x + bw / 2, by + 140, x + bw / 2 + sw, by + bh); ctx.fill(); }
      ctx.font = '800 12px Figtree, sans-serif'; const tw = ctx.measureText(lab).width + 20;
      ctx.fillStyle = j ? '#1D1B3A' : '#FFFDF9'; roundRect(ctx, x + 10, by + 10, tw, 24, 10); ctx.fill(); ctx.fillStyle = j ? '#FFF6EA' : '#1D1B3A'; ctx.fillText(lab, x + 20, by + 27);
      const kg = f && f.kg ? num(f.kg) : (j ? D.atual : D.ini);
      if (opt.peso && kg) { ctx.font = '800 20px "Bricolage Grotesque", sans-serif'; const t = f1(kg) + ' kg'; const w2 = ctx.measureText(t).width + 20; ctx.fillStyle = j ? '#1D1B3A' : '#FFFDF9'; roundRect(ctx, x + 10, by + bh - 42, w2, 32, 10); ctx.fill(); ctx.fillStyle = j ? '#FFF6EA' : '#1D1B3A'; ctx.fillText(t, x + 20, by + bh - 19); }
    });
    ctx.fillStyle = '#FF7A45'; ctx.beginPath(); ctx.arc(180, by + bh / 2, 26, 0, 7); ctx.fill(); ctx.strokeStyle = '#F6F1E9'; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = '#1D1B3A'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(171, by + bh / 2); ctx.lineTo(189, by + bh / 2); ctx.moveTo(183, by + bh / 2 - 6); ctx.lineTo(189, by + bh / 2); ctx.lineTo(183, by + bh / 2 + 6); ctx.stroke();
    ctx.fillStyle = '#1D1B3A'; ctx.fillRect(0, H - 132, W, 132);
    ctx.fillStyle = '#FF7A45'; ctx.font = '800 60px "Bricolage Grotesque", sans-serif'; ctx.fillText(opt.perda ? '−' + f1(D.perda) + ' kg' : D.pct + '%', 24, H - 58);
    ctx.fillStyle = '#C9C3DC'; ctx.font = '600 14px Figtree, sans-serif'; ctx.fillText(opt.perda ? D.pct + '% do caminho até a meta' : 'do caminho até a meta', 24, H - 30);
    ctx.save(); ctx.translate(W - 108, H - 52); marca(ctx, 0, 0, false); ctx.restore();
  }

  if (modelo === 'marco') {
    ctx.fillStyle = '#FF7A45'; ctx.fillRect(0, 0, W, H);
    const marcos = [5, 10, 15, 20, 25, 30, 35, 40, 50];
    const feito = marcos.filter((m) => D.perda >= m).pop() || 0;
    const rnd = (i, k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
    for (let i = 0; i < 22; i++) {
      let x = 10 + rnd(i, 1) * 340; const y = 70 + rnd(i, 2) * 320;
      if (Math.hypot(x - 180, y - 240) < 140) x = x < 180 ? x - 120 : x + 120;
      x = Math.max(6, Math.min(350, x));
      ctx.save(); ctx.translate(x, y); ctx.rotate(rnd(i, 4) * 3); ctx.fillStyle = rnd(i, 5) > 0.45 ? '#1D1B3A' : '#FFF6EA';
      const longo = rnd(i, 3) > 0.5; roundRect(ctx, 0, 0, longo ? 14 : 8, longo ? 5 : 8, longo ? 2 : 4); ctx.fill(); ctx.restore();
    }
    ctx.setLineDash([2, 10]); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(29,27,58,.25)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(180, 240, 132, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#1D1B3A'; ctx.beginPath(); ctx.arc(180, 240, 110, 0, 7); ctx.fill();
    ctx.strokeStyle = '#FF7A45'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(180, 240, 96, 0, 7); ctx.stroke();
    ctx.textAlign = 'center'; ctx.fillStyle = '#FFF6EA';
    const med = feito ? (opt.perda ? '−' + feito : Math.round(feito / Math.max(0.1, D.ini - D.meta) * 100) + '%') : D.pct + '%';
    ctx.font = '800 88px "Bricolage Grotesque", sans-serif'; ctx.fillText(med, 180, 262);
    ctx.fillStyle = '#FF7A45'; ctx.font = '700 16px Figtree, sans-serif'; ctx.fillText(feito && opt.perda ? 'quilos' : 'da meta', 180, 292);
    ctx.textAlign = 'left';
    marca(ctx, 24, 24, true); pillTxt(ctx, 'Dia ' + D.dias, W - 24, 22, '#1D1B3A', '#FFF6EA');
    ctx.fillStyle = '#1D1B3A'; ctx.font = '800 40px "Bricolage Grotesque", sans-serif'; ctx.fillText(feito ? 'Conquista' : 'Primeiro', 24, 436); ctx.fillText(feito ? 'desbloqueada' : 'passo dado', 24, 474);
    ctx.font = '600 16px Figtree, sans-serif';
    wrapText(ctx, feito ? (opt.perda ? `Os primeiros ${feito} quilos ficaram para trás. Próxima parada: −${feito + 5}.` : `Já fiz ${D.pct}% do caminho. Próxima parada logo ali.`) : 'Comecei a minha jornada e estou registrando cada dia.', 312, 2).forEach((l, i) => ctx.fillText(l, 24, 506 + i * 22));
    const chips = [5, 10, 15].map((k) => ({ l: opt.perda ? '−' + k : Math.min(100, Math.round(k / Math.max(0.1, D.ini - D.meta) * 100)) + '%', ok: D.perda >= k })).concat([{ l: 'Meta', ok: D.pct >= 100 }]);
    chips.forEach((cp, i) => { const x = 24 + i * 80; ctx.lineWidth = 2; ctx.strokeStyle = '#1D1B3A'; roundRect(ctx, x, H - 64, 74, 36, 12); if (cp.ok) { ctx.fillStyle = '#1D1B3A'; ctx.fill(); } ctx.stroke(); ctx.fillStyle = cp.ok ? '#FFF6EA' : '#1D1B3A'; ctx.font = '800 14px "Bricolage Grotesque", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(cp.l, x + 37, H - 41); ctx.textAlign = 'left'; });
  }

  if (modelo === 'prato') {
    ctx.fillStyle = '#1D1B3A'; ctx.fillRect(0, 0, W, H);
    marca(ctx, 24, 24, false);
    const semana = Array.from({ length: 7 }, (_, i) => dayKey(addDays(new Date(), i - 6)));
    ctx.fillStyle = '#C9C3DC'; ctx.font = '700 13px Figtree, sans-serif'; ctx.textAlign = 'right'; ctx.fillText(ddmm(fromKey(semana[0])) + ' a ' + ddmm(fromKey(semana[6])), W - 24, 41); ctx.textAlign = 'left';
    ctx.fillStyle = '#FFF6EA'; ctx.font = '800 40px "Bricolage Grotesque", sans-serif'; ctx.fillText('Minha semana', 24, 100); ctx.fillStyle = '#FF7A45'; ctx.fillText('no prato', 24, 138);
    const refs = S.recs.filter((r) => r.type === 'refeicao' && semana.includes(dayKey(r.date))).sort((a, b) => new Date(b.date) - new Date(a.date));
    const comFoto = refs.filter((r) => r.photoId).slice(0, 9);
    const imgs = await Promise.all(comFoto.map(async (r) => loadImg(await photoUrl(r.photoId))));
    const fundos = ['#F3D9CB', '#D9E6D2', '#F0E2C4', '#E8D3D9', '#D6E2E8', '#E6E0C8'];
    for (let i = 0; i < 9; i++) { const x = 24 + (i % 3) * 106, y = 156 + Math.floor(i / 3) * 98; if (imgs[i]) cover(ctx, imgs[i], x, y, 100, 92, 14); else { ctx.fillStyle = fundos[i % 6]; roundRect(ctx, x, y, 100, 92, 14); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(x + 50, y + 46, 24, 0, 7); ctx.fill(); } }
    const tem = (g, k) => refs.some((r) => dayKey(r.date) === k && (r.itens || []).some((it) => (g === 'prot' ? ['vermelha', 'branca', 'peixe', 'ovos'].includes(it.grupo) : it.grupo === g)));
    [['Salada', 'salada', '#8FE0BA'], ['Proteína', 'prot', '#FF7A45'], ['Legumes', 'legumes', '#E9C46A']].forEach(([nome, g, cor], j) => {
      const y = 470 + j * 26; const ds = semana.map((k) => tem(g, k)); const n = ds.filter(Boolean).length;
      ctx.fillStyle = '#FFF6EA'; ctx.font = '700 13px Figtree, sans-serif'; ctx.fillText(nome, 24, y + 9);
      ds.forEach((v, i) => { ctx.fillStyle = v ? cor : '#34315C'; roundRect(ctx, 110 + i * 27, y, 23, 10, 5); ctx.fill(); });
      ctx.fillStyle = cor; ctx.font = '800 14px "Bricolage Grotesque", sans-serif'; ctx.textAlign = 'right'; ctx.fillText(n + '/7', W - 24, y + 10); ctx.textAlign = 'left';
    });
    ctx.fillStyle = '#FFF6EA'; ctx.font = '800 24px "Bricolage Grotesque", sans-serif'; ctx.fillText(refs.length + (refs.length === 1 ? ' prato' : ' pratos'), 24, H - 46);
    ctx.fillStyle = '#FF7A45'; ctx.font = '700 14px Figtree, sans-serif'; ctx.textAlign = 'right'; ctx.fillText(D.pct + '% da meta', W - 24, H - 46); ctx.textAlign = 'left';
    ctx.fillStyle = '#34315C'; roundRect(ctx, 24, H - 32, W - 48, 8, 4); ctx.fill(); ctx.fillStyle = '#FF7A45'; roundRect(ctx, 24, H - 32, Math.max(8, (W - 48) * D.pct / 100), 8, 4); ctx.fill();
  }
}

VIEWS.postar = async () => {
  const m = S.ui.arte || 'curva';
  const o = S.ui.arteOpt || { peso: true, perda: true };
  S.ui.arteOpt = o;
  const nf = S.recs.filter((r) => r.type === 'foto').length;
  const html = `<div class="screen">
    ${topBar('Crie sua arte', 'Postar', '', themeBtn())}
    <div class="studio-prev"><canvas id="arte" width="1080" height="1920" aria-label="Prévia da arte"></canvas></div>
    <section class="grid4" aria-label="Modelos">${MODELOS.map(([k, l, c1, c2]) => `<button data-act="arteM" data-v="${k}" aria-pressed="${m === k}" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px 4px;border-radius:16px;border:2px solid ${m === k ? '#FF7A45' : 'var(--line)'};background:var(--card);color:var(--text);cursor:pointer"><span style="width:36px;height:56px;border-radius:8px;background:${c1};display:flex;align-items:flex-end;overflow:hidden"><span style="width:36px;height:18px;background:${c2}"></span></span><span style="font-size:12px;font-weight:700">${l}</span></button>`).join('')}</section>
    ${m === 'antes' && nf < 2 ? `<a class="listbtn" href="#/foto/nova" style="background:#FBF0CF;border-color:#FBF0CF;color:#7A5600"><span class="ico" style="background:#fff">${icon('photo')}</span><span class="col" style="flex:1"><b style="font-size:14px">Adicione suas fotos da jornada</b><span class="small">A primeira vira o "antes" e a mais nova, o "agora". Vale foto antiga.</span></span></a>` : ''}
    <section class="card" style="padding:4px 16px;gap:0">
      ${[['peso', 'Mostrar meu peso', 'peso inicial, atual e meta'], ['perda', 'Mostrar quilos perdidos', 'desligado, mostra só o percentual']].map(([k, l, n], i) => `<button data-act="arteO" data-k="${k}" aria-pressed="${!!o[k]}" class="row between" style="min-height:58px;width:100%;border:0;border-bottom:1px solid ${i === 0 ? 'var(--line)' : 'transparent'};background:transparent;color:var(--text);cursor:pointer;text-align:left;padding:0"><span class="col" style="gap:2px"><b style="font-size:14px">${l}</b><span class="small muted">${n}</span></span><span class="switch ${o[k] ? 'on' : ''}"></span></button>`).join('')}
    </section>
    <div class="grid2"><button class="btn ghost" data-act="arteSalvar">${icon('download', 18)} Salvar imagem</button><button class="btn primary" data-act="arteShare">${icon('share', 18, 2.2)} Compartilhar</button></div>
    <p class="note">A marca leve. vai discreta na arte. Quem perguntar, já sabe onde achar. Você escolhe o que mostrar.</p>
  </div>`;
  return { html, tab: 'postar', after: async () => { const c = $('#arte'); if (c) await desenharArte(c, m, o); } };
};
ACT.arteM = (el) => { S.ui.arte = el.dataset.v; rerender(); };
ACT.arteO = (el) => { S.ui.arteOpt[el.dataset.k] = !S.ui.arteOpt[el.dataset.k]; rerender(); };
ACT.arteShare = async () => { const c = $('#arte'); if (c) await canvasToShare(c, `leve-${S.ui.arte || 'curva'}.png`); };
ACT.arteSalvar = async () => {
  const c = $('#arte'); if (!c) return;
  const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
  if (IS_ART) { await salvarArquivo(blob, `leve-${S.ui.arte || 'curva'}.png`, 'image/png'); return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `leve-${S.ui.arte || 'curva'}.png`; document.body.appendChild(a); a.click(); a.remove();
  toast('Imagem salva');
};
