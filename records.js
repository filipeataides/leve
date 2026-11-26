/* leve — lançamentos: refeição, peso, atividade, foto da jornada, caneta */
'use strict';

/* ================= REFEIÇÃO ================= */
function tipoPorHora(d = new Date()) { const h = d.getHours(); return h < 10 ? 'cafe' : h < 15 ? 'almoco' : h < 18 ? 'lanche' : h < 22 ? 'jantar' : 'ceia'; }
function novoItem(x = null, y = null) { return { id: uid(), x, y, texto: '', grupo: null, grupoManual: false, kcal: null, kcalManual: false }; }
function totalItens(itens) { return itens.reduce((a, i) => a + (num(i.kcal) || 0), 0); }
function grupoSelect(it, i) {
  return `<select data-in="itGrupo" data-i="${i}" aria-label="Grupo do alimento" style="min-height:38px;border:1px solid var(--line);border-radius:10px;background:${it.grupo ? GRUPOS[it.grupo].soft : 'var(--card)'};color:${it.grupo ? GRUPOS[it.grupo].fg : 'var(--muted)'};font-size:12px;font-weight:800;padding:0 6px;max-width:150px">
    <option value="">Grupo…</option>${Object.entries(GRUPOS).map(([k, g]) => `<option value="${k}" ${it.grupo === k ? 'selected' : ''}>${g.nome}</option>`).join('')}</select>`;
}

VIEWS.refeicao = async (parts) => {
  const id = parts[0];
  if (id === 'nova') {
    if (!S.ui.ref || !S.ui.ref.novo) S.ui.ref = { novo: true, id: uid(), tipo: tipoPorHora(), date: new Date().toISOString(), photoId: null, semFoto: false, itens: [] };
    return refEditor();
  }
  const r = await DB.rec(id);
  if (!r) return { html: `<div class="screen">${topBar('Refeição', '', '#/hoje')}<div class="empty">Essa refeição não existe mais.</div></div>` };
  if (parts[1] === 'editar') {
    if (!S.ui.ref || S.ui.ref.id !== id) S.ui.ref = JSON.parse(JSON.stringify(r));
    S.ui.ref.novo = false;
    return refEditor();
  }
  return refView(r);
};

async function refEditor() {
  const d = S.ui.ref;
  const url = d.photoId ? await photoUrl(d.photoId) : null;
  const tipos = Object.entries(TIPOS_REF).map(([k, l]) => `<button class="chip ${d.tipo === k ? 'on' : ''}" data-act="refTipo" data-v="${k}" aria-pressed="${d.tipo === k}">${l.replace(' da manhã', '')}</button>`).join('');
  const comFoto = !!url;
  const ordem = d.itens.map((it, i) => i).reverse();
  const itensHtml = ordem.map((i) => [d.itens[i], i]).map(([it, i]) => `
    <div class="card tight" data-item="${i}" style="border:2px solid ${!it.texto && i === d.itens.length - 1 ? 'var(--coral)' : 'var(--line)'};gap:8px">
      <div class="row" style="gap:8px">
        <span class="num" style="width:26px;height:26px;border-radius:13px;background:${it.x != null ? (it.texto ? 'var(--coral)' : '#FFF6EA') : 'var(--soft2)'};color:#1D1B3A;display:flex;align-items:center;justify-content:center;font-size:12px;flex:none;border:${it.x != null && !it.texto ? '2px solid var(--coral)' : '0'}">${i + 1}</span>
        <input data-in="itTexto" data-i="${i}" value="${esc(it.texto)}" placeholder="Ex.: bife de gado (120 g)" aria-label="Alimento ${i + 1}" style="flex:1;min-width:0;border:0;outline:none;background:transparent;font-size:16px;font-weight:700;padding:6px 0">
        <button class="iconbtn" data-act="itDel" data-i="${i}" aria-label="Apagar alimento ${i + 1}" style="width:36px;height:36px;border:0;background:var(--soft);color:var(--muted)">${icon('x', 14, 2.6)}</button>
      </div>
      <div class="row between" style="gap:8px">
        <span data-gsel="${i}">${grupoSelect(it, i)}</span>
        <span class="row" style="gap:6px"><span class="small muted" data-kest="${i}">${it.kcalManual ? 'você corrigiu' : it.kcal != null ? 'estimado' : ''}</span>
          <span class="input" style="min-height:38px;width:96px;padding:0 8px;border-width:1px"><input data-in="itKcal" data-i="${i}" inputmode="numeric" value="${it.kcal != null ? Math.round(it.kcal) : ''}" placeholder="kcal" aria-label="Calorias do alimento ${i + 1}" style="font-size:15px;padding:6px 0;text-align:right"><span class="un">kcal</span></span></span>
      </div>
    </div>`).join('');
  const html = `<div class="screen sheet-page">
    ${topBar(d.novo ? 'Marque o seu prato' : 'Editar refeição', (TIPOS_REF[d.tipo] || '') + ' · ' + hhmm(d.date), d.novo ? '#/hoje' : '#/refeicao/' + d.id)}
    <div class="chips">${tipos}</div>
    <label class="field">Data e hora<div class="input"><input type="datetime-local" data-in="refData" value="${toLocalInput(d.date)}"></div></label>
    ${!comFoto && !d.semFoto ? `
      <section class="card" style="align-items:stretch;text-align:center;gap:12px">
        <span class="ico" style="align-self:center;width:64px;height:64px;border-radius:20px;background:var(--coralSoft);color:var(--coralText)">${icon('cam', 30, 2)}</span>
        <h2>Foto do prato</h2>
        <span class="small muted">Depois é só tocar em cada alimento e escrever o que é e quanto.</span>
        <label class="btn primary block">${icon('cam', 20, 2.2)} Tirar foto<input type="file" accept="image/*" capture="environment" data-in="refFoto" hidden></label>
        <label class="btn ghost block">Escolher da galeria<input type="file" accept="image/*" data-in="refFoto" hidden></label>
        <button class="btn danger" style="color:var(--muted)" data-act="refSemFoto">Lançar sem foto</button>
      </section>` : ''}
    ${comFoto ? `
      <section class="hero" style="flex-direction:row;align-items:center;gap:12px;padding:12px 14px;border-radius:20px">
        <span class="ico" style="width:36px;height:36px;border-radius:18px;background:var(--coral);color:#1D1B3A">${icon('M9 11V5a2 2 0 0 1 4 0v6M13 10a2 2 0 0 1 4 0v3a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-3l-2-4a1.6 1.6 0 0 1 2.7-1.6L9 14', 18, 2.4)}</span>
        <span style="font-size:13px;line-height:1.45;color:var(--onink2)"><b style="color:var(--onink)">Toque em cada alimento da foto</b> e escreva o que é e quanto. Ex.: 2 ovos cozidos.</span>
      </section>
      <div class="photo" data-act="tapFoto" role="button" aria-label="Foto do prato: toque para marcar um alimento" style="cursor:crosshair">
        <img src="${url}" alt="Foto do prato" draggable="false">
        ${d.itens.map((it, i) => it.x != null ? `<span class="pin ${it.texto ? '' : 'empty'}" style="left:${(it.x * 100).toFixed(2)}%;top:${(it.y * 100).toFixed(2)}%">${i + 1}</span>` : '').join('')}
      </div>
      <div class="row between"><label class="small" style="font-weight:800;color:var(--coralText);cursor:pointer">Trocar foto<input type="file" accept="image/*" data-in="refFoto" hidden></label><span class="small muted">${d.itens.length} ${d.itens.length === 1 ? 'alimento' : 'alimentos'}</span></div>` : ''}
    ${(comFoto || d.semFoto) ? `
      <section class="col" style="gap:8px" aria-label="Alimentos">${itensHtml || (comFoto ? '' : '')}
        <button class="btn ghost block" data-act="itAdd">${icon('plus', 18, 2.6)} ${comFoto ? 'Adicionar sem marcar na foto' : 'Adicionar alimento'}</button>
      </section>
      <div class="card tight" style="flex-direction:row;justify-content:space-between;align-items:center"><span class="small muted" style="font-weight:700;font-size:13px">Estimativa do prato</span><span class="num" style="font-size:22px" id="refTotal">≈ ${f0(totalItens(d.itens))} kcal</span></div>
      <button class="btn primary block" style="min-height:56px;font-size:16px" data-act="refSalvar">Confirmar e criar legendas</button>
      ${!d.novo ? `<button class="btn danger block" data-act="refApagar">Apagar esta refeição</button>` : ''}
      <p class="note">Tudo é feito no seu celular, sem internet e sem custo. As calorias são médias estimadas pela descrição: quanto mais detalhe (gramas, quantidade), mais certo fica. Você pode corrigir qualquer valor.</p>` : ''}
  </div>`;
  return { html, nav: false };
}
ACT.refTipo = (el) => { S.ui.ref.tipo = el.dataset.v; rerender(); };
INP.refData = (el) => { if (el.value) S.ui.ref.date = new Date(el.value).toISOString(); };
ACT.refSemFoto = () => { S.ui.ref.semFoto = true; if (!S.ui.ref.itens.length) S.ui.ref.itens.push(novoItem()); rerender(); };
INP.refFoto = async (el, e) => {
  if (e.type !== 'change') return;
  const f = el.files && el.files[0]; if (!f) return;
  toast('Preparando a foto…');
  try {
    const { blob, w, h } = await compressImage(f);
    const pid = 'p' + uid();
    await DB.putBlob(pid, blob);
    const d = S.ui.ref;
    if (d.photoId && d._tempPhoto) { await DB.delBlob(d.photoId); }
    d.photoId = pid; d._tempPhoto = true; d.photoW = w; d.photoH = h;
    rerender();
  } catch (err) { toast('Não consegui abrir essa foto'); }
};
ACT.tapFoto = (el, e) => {
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
  if (!(x >= 0 && x <= 1 && y >= 0 && y <= 1)) return;
  S.ui.ref.itens.push(novoItem(x, y));
  const n = S.ui.ref.itens.length - 1;
  rerender().then(() => { const inp = $(`[data-in="itTexto"][data-i="${n}"]`); if (inp) inp.focus({ preventScroll: true }); });
};
ACT.itAdd = () => { S.ui.ref.itens.push(novoItem()); const n = S.ui.ref.itens.length - 1; rerender().then(() => { const l = $(`[data-in="itTexto"][data-i="${n}"]`); if (l) l.focus(); }); };
ACT.itDel = (el) => { S.ui.ref.itens.splice(Number(el.dataset.i), 1); rerender(); };
function refPatch(i) {
  const it = S.ui.ref.itens[i];
  const g = $(`[data-gsel="${i}"]`); if (g && document.activeElement !== g.firstElementChild) g.innerHTML = grupoSelect(it, i);
  const k = $(`[data-in="itKcal"][data-i="${i}"]`); if (k && document.activeElement !== k) k.value = it.kcal != null ? Math.round(it.kcal) : '';
  const ke = $(`[data-kest="${i}"]`); if (ke) ke.textContent = it.kcalManual ? 'você corrigiu' : it.kcal != null ? 'estimado' : '';
  const t = $('#refTotal'); if (t) t.textContent = '≈ ' + f0(totalItens(S.ui.ref.itens)) + ' kcal';
  const pins = $$('.photo .pin'); // atualiza cor do pino
  let pi = 0; S.ui.ref.itens.forEach((x, j) => { if (x.x != null) { const p = pins[pi++]; if (p && j === i) p.classList.toggle('empty', !x.texto); } });
}
INP.itTexto = (el) => {
  const i = Number(el.dataset.i), it = S.ui.ref.itens[i];
  it.texto = el.value;
  const est = estimar(it.texto);
  if (!it.grupoManual) it.grupo = est.grupo && est.grupo !== 'outro' ? est.grupo : (it.texto ? 'outro' : null);
  if (!it.kcalManual) it.kcal = est.kcal;
  refPatch(i);
};
INP.itGrupo = (el) => { const it = S.ui.ref.itens[Number(el.dataset.i)]; it.grupo = el.value || null; it.grupoManual = !!el.value; el.style.background = it.grupo ? GRUPOS[it.grupo].soft : 'var(--card)'; el.style.color = it.grupo ? GRUPOS[it.grupo].fg : 'var(--muted)'; };
INP.itKcal = (el) => { const i = Number(el.dataset.i), it = S.ui.ref.itens[i]; const v = num(el.value); it.kcal = v; it.kcalManual = el.value !== ''; if (!it.kcalManual) { it.kcal = estimar(it.texto).kcal; } refPatch(i); };
ACT.refSalvar = async () => {
  const d = S.ui.ref;
  const itens = d.itens.filter((i) => (i.texto || '').trim()).map((i) => ({ ...i, texto: i.texto.trim(), grupo: i.grupo || 'outro' }));
  if (!itens.length && !d.photoId) { toast('Escreva pelo menos um alimento'); return; }
  const rec = { id: d.id, type: 'refeicao', date: d.date, tipo: d.tipo, photoId: d.photoId || null, photoW: d.photoW, photoH: d.photoH, itens, kcalTotal: totalItens(itens) };
  await DB.put(rec); await reloadRecs();
  S.ui.ref = null; S.ui.legKcal = true;
  toast('Refeição lançada');
  if (IS_ART) go('#/refeicao/' + rec.id); else location.replace('#/refeicao/' + rec.id);
};
ACT.refApagar = async () => {
  const d = S.ui.ref;
  if (!(await confirmar('Apagar esta refeição?'))) return;
  await DB.del(d.id); if (d.photoId) await DB.delBlob(d.photoId);
  S.ui.ref = null; await reloadRecs(); toast('Refeição apagada'); go('#/hoje');
};

/* layout das legendas dentro da foto (unidades: largura 358) */
function layoutLegendas(itens, W, H) {
  const pad = 10, gap = 6, boxW = Math.round(W * 0.46), boxH = 64;
  const slotX = [pad, W - pad - boxW];
  const comXY = itens.map((it, idx) => ({ ...it, idx })).filter((it) => it.x != null);
  const out = [];
  const place = (lista, emCima) => {
    lista.sort((a, b) => a.x - b.x);
    lista.forEach((it, i) => {
      let col = i % 2;
      if (lista.length === 1) col = it.x < 0.5 ? 0 : 1;
      const row = Math.floor(i / 2);
      const lx = slotX[col];
      const ly = emCima ? pad + row * (boxH + gap) : H - pad - boxH - row * (boxH + gap);
      out.push({ it, lx, ly, w: boxW, h: boxH, ax: lx + boxW / 2, ay: emCima ? ly + boxH : ly, px: it.x * W, py: it.y * H });
    });
  };
  place(comXY.filter((i) => i.y < 0.5), true);
  place(comXY.filter((i) => i.y >= 0.5), false);
  return out;
}

async function refView(r) {
  const url = r.photoId ? await photoUrl(r.photoId) : null;
  const total = num(r.kcalTotal) || 0;
  const porG = {};
  (r.itens || []).forEach((i) => { const m = GRUPOS[i.grupo] ? i.grupo : 'outro'; porG[m] = (porG[m] || 0) + (num(i.kcal) || 0); });
  const barra = Object.entries(porG).filter(([, v]) => v > 0);
  const kOn = S.ui.legKcal !== false;
  const html = `<div class="screen">
    ${topBar('Seu prato', (TIPOS_REF[r.tipo] || 'Refeição') + ' · ' + diaLabel(dayKey(r.date)) + ' · ' + hhmm(r.date), '#/hoje')}
    ${url ? `<div class="photo" id="legFoto"><img src="${url}" alt="Foto do prato com legendas" id="legImg"><div id="legLayer"></div></div>
      <button class="listbtn" data-act="legKcal" aria-pressed="${kOn}" style="justify-content:space-between"><b style="font-size:14px">Mostrar calorias na foto</b><span class="switch ${kOn ? 'on' : ''}"></span></button>` : ''}
    <section class="hero" aria-label="Total do prato">
      <span class="num" style="font-size:34px;letter-spacing:-1px">≈ ${f0(total)} <span style="font-size:16px;color:var(--onink2)">kcal no prato</span></span>
      ${barra.length ? `<div class="stack">${barra.map(([g, v]) => `<i style="flex:${v} 1 0;background:${GRUPOS[g].cor}"></i>`).join('')}</div>
      <div class="chips" style="gap:6px 14px">${barra.map(([g, v]) => `<span class="row small" style="gap:6px;color:var(--onink2);font-weight:600"><i style="width:9px;height:9px;border-radius:3px;background:${GRUPOS[g].cor};display:block"></i>${GRUPOS[g].nome} ${Math.round(v / (total || 1) * 100)}%</span>`).join('')}</div>` : ''}
    </section>
    <section class="card" style="gap:0;padding:6px 14px" aria-label="Alimentos">
      ${(r.itens || []).map((i, n, a) => `<div class="row" style="gap:10px;min-height:58px;border-bottom:1px solid ${n < a.length - 1 ? 'var(--line)' : 'transparent'}">
        <div class="col" style="flex:1;min-width:0;gap:3px"><span><span class="tag" style="background:${GRUPOS[i.grupo]?.soft || '#EEF2F6'};color:${GRUPOS[i.grupo]?.fg || '#475569'}">${esc(GRUPOS[i.grupo]?.nome || 'Outro')}</span></span><b style="font-size:14px">${esc(i.texto)}</b></div>
        <span class="num" style="font-size:16px">${i.kcal != null ? '≈ ' + f0(i.kcal) : '—'}</span></div>`).join('') || '<div class="empty" style="margin:8px 0">Sem alimentos descritos.</div>'}
    </section>
    <div class="grid2">
      <a class="btn ghost" href="#/refeicao/${r.id}/editar">${icon('edit', 18)} Corrigir</a>
      ${url ? `<button class="btn primary" data-act="legShare" data-id="${r.id}">${icon('share', 18, 2.2)} Compartilhar</button>` : `<a class="btn primary" href="#/hoje">Pronto</a>`}
    </div>
    <p class="note">Calorias são estimativas médias, só para orientação.</p>
  </div>`;
  return {
    html, tab: 'hoje', after: async () => {
      const img = $('#legImg'); if (!img) return;
      const draw = () => {
        const W = img.clientWidth, H = img.clientHeight; if (!W) return;
        const L = layoutLegendas(r.itens || [], W, H);
        $('#legLayer').innerHTML = `<svg width="${W}" height="${H}" style="position:absolute;inset:0" aria-hidden="true">${L.map((l) => `
          <line x1="${l.px}" y1="${l.py}" x2="${l.ax}" y2="${l.ay}" stroke="#1D1B3A" stroke-opacity=".55" stroke-width="5" stroke-linecap="round"/>
          <line x1="${l.px}" y1="${l.py}" x2="${l.ax}" y2="${l.ay}" stroke="#FFF6EA" stroke-width="2" stroke-linecap="round"/>
          <circle cx="${l.px}" cy="${l.py}" r="8" fill="#FF7A45" stroke="#FFF6EA" stroke-width="3"/><circle cx="${l.ax}" cy="${l.ay}" r="3" fill="#FFF6EA"/>`).join('')}</svg>
          ${L.map((l) => `<div class="legend" style="left:${l.lx}px;top:${l.ly}px;width:${l.w}px;height:${l.h}px;justify-content:center"><b style="overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${esc(l.it.texto)}</b>${kOn && l.it.kcal != null ? `<span>≈ ${f0(l.it.kcal)} kcal</span>` : ''}</div>`).join('')}`;
      };
      if (img.complete) draw(); else img.onload = draw;
      window.onresize = draw;
    }
  };
}
ACT.legKcal = () => { S.ui.legKcal = S.ui.legKcal === false; rerender(); };

/* foto legendada em imagem (para Story, WhatsApp, Instagram) */
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function wrapText(ctx, text, maxW, maxLines) {
  const words = String(text).split(/\s+/); const lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = lines[maxLines - 1].replace(/.{0,2}$/, '…'); }
  return lines;
}
async function fontsReady() { try { await Promise.all([document.fonts.load('800 40px "Bricolage Grotesque"'), document.fonts.load('700 20px Figtree'), document.fonts.load('600 20px Figtree')]); } catch (e) { /* segue com a fonte do sistema */ } }
async function canvasToShare(canvas, nome) {
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  await salvarArquivo(blob, nome, 'image/png');
}
ACT.legShare = async (el) => {
  const r = await DB.rec(el.dataset.id); if (!r || !r.photoId) return;
  await fontsReady();
  const url = await photoUrl(r.photoId);
  const img = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = url; });
  const W = 1080, H = Math.round(1080 * img.naturalHeight / img.naturalWidth);
  const c = document.createElement('canvas'); c.width = W; c.height = H + 120;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1D1B3A'; ctx.fillRect(0, 0, W, H + 120);
  ctx.drawImage(img, 0, 0, W, H);
  const s = W / 358; const kOn = S.ui.legKcal !== false;
  const L = layoutLegendas(r.itens || [], 358, 358 * H / W);
  for (const l of L) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(29,27,58,.55)'; ctx.lineWidth = 5 * s; ctx.beginPath(); ctx.moveTo(l.px * s, l.py * s); ctx.lineTo(l.ax * s, l.ay * s); ctx.stroke();
    ctx.strokeStyle = '#FFF6EA'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(l.px * s, l.py * s); ctx.lineTo(l.ax * s, l.ay * s); ctx.stroke();
    ctx.fillStyle = '#FF7A45'; ctx.beginPath(); ctx.arc(l.px * s, l.py * s, 8 * s, 0, 7); ctx.fill(); ctx.strokeStyle = '#FFF6EA'; ctx.lineWidth = 3 * s; ctx.stroke();
    ctx.fillStyle = 'rgba(29,27,58,.92)'; roundRect(ctx, l.lx * s, l.ly * s, l.w * s, l.h * s, 14 * s); ctx.fill();
    ctx.fillStyle = '#FFF6EA'; ctx.font = `700 ${12 * s}px Figtree, sans-serif`;
    const lines = wrapText(ctx, l.it.texto, (l.w - 20) * s, kOn ? 2 : 3);
    const lh = 15 * s; let ty = l.ly * s + (l.h * s - (lines.length * lh + (kOn ? 18 * s : 0))) / 2 + 12 * s;
    lines.forEach((ln) => { ctx.fillText(ln, (l.lx + 10) * s, ty); ty += lh; });
    if (kOn && l.it.kcal != null) { ctx.fillStyle = '#FF7A45'; ctx.font = `800 ${14 * s}px "Bricolage Grotesque", sans-serif`; ctx.fillText('≈ ' + f0(l.it.kcal) + ' kcal', (l.lx + 10) * s, ty + 4 * s); }
  }
  ctx.fillStyle = '#FFF6EA'; ctx.font = '800 44px "Bricolage Grotesque", sans-serif';
  ctx.fillText(kOn ? '≈ ' + f0(r.kcalTotal) + ' kcal' : (TIPOS_REF[r.tipo] || 'Meu prato'), 40, H + 76);
  ctx.textAlign = 'right'; ctx.font = '800 40px "Bricolage Grotesque", sans-serif'; ctx.fillText('leve', W - 64, H + 74); ctx.fillStyle = '#FF7A45'; ctx.fillText('.', W - 44, H + 74); ctx.textAlign = 'left';
  await canvasToShare(c, 'leve-prato.png');
};

/* ================= PESO ================= */
VIEWS.peso = async (parts) => {
  const id = parts[0];
  const pesos = pesosOrdenados(S.recs);
  let d = S.ui.peso;
  if (!d || d._for !== id) {
    if (id === 'novo') {
      const last = pesos.length ? num(pesos[pesos.length - 1].kg) : num(S.perfil.pesoInicial);
      d = { _for: id, id: uid(), novo: true, kg: last || 80, date: new Date().toISOString(), origem: 'manual', cintura: '', quadril: '', pescoco: '' };
    } else {
      const r = await DB.rec(id); if (!r) { go('#/hoje'); return { html: '' }; }
      d = { ...r, _for: id, novo: false };
    }
    S.ui.peso = d;
  }
  const anteriores = pesos.filter((p) => p.id !== d.id && new Date(p.date) < new Date(d.date));
  const ref = anteriores.length ? num(anteriores[anteriores.length - 1].kg) : num(S.perfil.pesoInicial);
  const dif = ref != null ? Math.round((d.kg - ref) * 10) / 10 : null;
  const v = (x) => esc(x == null ? '' : x);
  const html = `<div class="screen sheet-page">
    ${topBar(d.novo ? 'Registrar peso' : 'Editar pesagem', 'Peso e medidas', '#/hoje')}
    <section class="hero" style="align-items:center;gap:14px;padding:22px 16px">
      <span class="sub" style="font-size:13px;font-weight:600">Quanto a balança marcou?</span>
      <div class="row" style="gap:12px">
        <button data-act="pesoStep" data-d="-1" aria-label="Diminuir 100 gramas" style="width:56px;height:56px;border-radius:28px;border:0;background:var(--ink2);color:#FFF6EA;font-size:28px;font-weight:700;cursor:pointer">−</button>
        <span class="row" style="align-items:baseline;gap:4px"><input id="pesoKg" data-in="pesoKg" inputmode="decimal" value="${f1(d.kg)}" aria-label="Peso em quilos" style="width:170px;text-align:center;border:0;outline:none;background:transparent;color:#FFF6EA;font-family:var(--display);font-size:66px;font-weight:800;letter-spacing:-3px;padding:0"><span style="font-size:20px;font-weight:700;color:var(--coral)">kg</span></span>
        <button data-act="pesoStep" data-d="1" aria-label="Aumentar 100 gramas" style="width:56px;height:56px;border-radius:28px;border:0;background:var(--ink2);color:#FFF6EA;font-size:28px;font-weight:700;cursor:pointer">+</button>
      </div>
      <span id="pesoDif" class="pill" style="background:rgba(255,246,234,.08);color:${dif != null && dif > 0 ? '#FFB896' : '#8FE0BA'};font-size:14px">${dif == null ? '' : (dif > 0 ? '+' : dif < 0 ? '−' : '') + f1(Math.abs(dif)) + ' kg desde a medição anterior'}</span>
    </section>
    <section class="card">
      <label class="field">Data e hora<div class="input"><input type="datetime-local" data-in="pesoData" value="${toLocalInput(d.date)}"></div></label>
      <div class="seg" style="grid-template-columns:1fr 1fr">${[['manual', 'Digitei eu mesmo'], ['balanca', 'Da balança']].map(([k, l]) => `<button data-act="pesoOrigem" data-v="${k}" class="${d.origem === k ? 'on' : ''}" aria-pressed="${d.origem === k}">${l}</button>`).join('')}</div>
    </section>
    <section class="card">
      <div class="row between" style="align-items:baseline"><h3>Medidas</h3><span class="small muted">opcional, em cm</span></div>
      <div class="grid3">${[['cintura', 'Cintura'], ['quadril', 'Quadril'], ['pescoco', 'Pescoço']].map(([k, l]) => `<label class="field">${l}<div class="input" style="padding:0 10px"><input data-in="pesoMed" data-k="${k}" inputmode="decimal" value="${v(d[k])}" placeholder="—"></div></label>`).join('')}</div>
      <a class="btn ghost block" href="#/foto/nova" style="border-style:dashed">${icon('photo', 18)} Adicionar foto do corpo</a>
    </section>
    <button class="btn primary block" style="min-height:56px;font-size:16px" data-act="pesoSalvar">Salvar peso</button>
    ${!d.novo ? `<button class="btn danger block" data-act="pesoApagar">Apagar esta pesagem</button>` : ''}
    <section class="col" style="gap:8px">
      <div class="row between" style="align-items:baseline"><h3>Últimas medições</h3><span class="small muted">toque para corrigir</span></div>
      ${pesos.slice(-6).reverse().map((p) => `<a class="listbtn" href="#/peso/${p.id}"><span class="col" style="flex:1;gap:2px"><b style="font-size:14px">${diaLabel(dayKey(p.date))}</b><span class="small muted">${p.origem === 'balanca' ? 'Da balança' : 'Digitado por você'}${p.cintura ? ' · cintura ' + esc(p.cintura) + ' cm' : ''}</span></span><span class="num" style="font-size:17px">${f1(num(p.kg))} kg</span>${icon('edit', 18)}</a>`).join('') || '<div class="empty">Nenhuma pesagem ainda.</div>'}
    </section>
  </div>`;
  return { html, nav: false };
};
ACT.pesoStep = (el) => { const d = S.ui.peso; d.kg = Math.round((d.kg + Number(el.dataset.d) * 0.1) * 10) / 10; rerender(); };
INP.pesoKg = (el, e) => { const v = num(el.value); if (v != null && v > 20 && v < 400) S.ui.peso.kg = v; if (e.type === 'change') rerender(); };
INP.pesoData = (el) => { if (el.value) S.ui.peso.date = new Date(el.value).toISOString(); };
INP.pesoMed = (el) => { S.ui.peso[el.dataset.k] = el.value; };
ACT.pesoOrigem = (el) => { S.ui.peso.origem = el.dataset.v; rerender(); };
ACT.pesoSalvar = async () => {
  const k = num($('#pesoKg').value); if (k == null || k < 20 || k > 400) { toast('Confira o peso'); return; }
  const d = S.ui.peso; d.kg = k;
  const { _for, novo, ...rec } = d;
  await DB.put({ ...rec, type: 'peso' }); S.ui.peso = null; await reloadRecs();
  const p = S.perfil, pct = pctMeta(p, pesoAtual(S.recs, p));
  toast(`Peso salvo · ${pct}% da meta`);
  go('#/hoje');
};
ACT.pesoApagar = async () => { if (!(await confirmar('Apagar esta pesagem?'))) return; await DB.del(S.ui.peso.id); S.ui.peso = null; await reloadRecs(); go('#/hoje'); };

/* ================= ATIVIDADE ================= */
const ATIV = { caminhada: ['Caminhada', 5], corrida: ['Corrida', 10], bike: ['Bicicleta', 7], musculacao: ['Musculação', 6], funcional: ['Funcional', 8], natacao: ['Natação', 8], outro: ['Outra', 5] };
VIEWS.atividade = async (parts) => {
  const id = parts[0];
  let d = S.ui.ativ;
  if (!d || d._for !== id) {
    if (id === 'nova') d = { _for: id, id: uid(), novo: true, tipo: 'caminhada', nome: 'Caminhada', date: new Date().toISOString(), minutos: '', distancia: '', kcal: null, kcalManual: false, origem: 'manual' };
    else { const r = await DB.rec(id); if (!r) { go('#/hoje'); return { html: '' }; } d = { ...r, _for: id, novo: false }; }
    S.ui.ativ = d;
  }
  const html = `<div class="screen sheet-page">
    ${topBar(d.novo ? 'Lançar atividade' : 'Editar atividade', 'Exercício', '#/hoje')}
    ${d.origem === 'samsung' ? `<span class="pill" style="background:var(--mintSoft);color:var(--mintText)">Veio do Samsung Health${d.editado ? ' · editado por você' : ''}</span>` : ''}
    <div class="chips">${Object.entries(ATIV).map(([k, [l]]) => `<button class="chip ${d.tipo === k ? 'on' : ''}" data-act="ativTipo" data-v="${k}" aria-pressed="${d.tipo === k}">${l}</button>`).join('')}</div>
    <section class="card">
      <label class="field">Data e hora<div class="input"><input type="datetime-local" data-in="ativData" value="${toLocalInput(d.date)}"></div></label>
      <div class="grid2">
        <label class="field">Duração<div class="input"><input data-in="ativCampo" data-k="minutos" inputmode="numeric" value="${esc(d.minutos)}" placeholder="40"><span class="un">min</span></div></label>
        <label class="field">Distância<div class="input"><input data-in="ativCampo" data-k="distancia" inputmode="decimal" value="${esc(d.distancia)}" placeholder="opcional"><span class="un">km</span></div></label>
      </div>
      <label class="field">Calorias gastas <span id="ativEst" style="font-weight:600">${d.kcalManual ? '(você informou)' : '(estimativa pelo tempo; pode trocar pelo número do relógio)'}</span><div class="input"><input id="ativKcal" data-in="ativKcal" inputmode="numeric" value="${d.kcal != null ? Math.round(d.kcal) : ''}" placeholder="kcal"><span class="un">kcal</span></div></label>
    </section>
    <button class="btn primary block" style="min-height:56px;font-size:16px" data-act="ativSalvar">Salvar atividade</button>
    ${!d.novo ? `<button class="btn danger block" data-act="ativApagar">Apagar esta atividade</button>` : ''}
    <p class="note">Nesta versão a atividade é lançada à mão. Na versão com Samsung Health, o que vier do relógio aparece aqui e você corrige se precisar.</p>
  </div>`;
  return { html, nav: false };
};
function ativAuto() { const d = S.ui.ativ; if (d.kcalManual) return; const m = num(d.minutos); d.kcal = m ? Math.round(m * ATIV[d.tipo][1]) : null; const k = $('#ativKcal'); if (k && document.activeElement !== k) k.value = d.kcal != null ? d.kcal : ''; }
ACT.ativTipo = (el) => { const d = S.ui.ativ; d.tipo = el.dataset.v; d.nome = ATIV[d.tipo][0]; ativAuto(); rerender(); };
INP.ativData = (el) => { if (el.value) S.ui.ativ.date = new Date(el.value).toISOString(); };
INP.ativCampo = (el) => { S.ui.ativ[el.dataset.k] = el.value; if (el.dataset.k === 'minutos') ativAuto(); };
INP.ativKcal = (el) => { const d = S.ui.ativ; d.kcal = num(el.value); d.kcalManual = el.value !== ''; if (!d.kcalManual) ativAuto(); const e = $('#ativEst'); if (e) e.textContent = d.kcalManual ? '(você informou)' : '(estimativa pelo tempo)'; };
ACT.ativSalvar = async () => {
  const d = S.ui.ativ; if (!num(d.minutos) && !num(d.kcal)) { toast('Informe a duração ou as calorias'); return; }
  const { _for, novo, ...rec } = d; if (rec.origem === 'samsung' && !novo) rec.editado = true;
  await DB.put({ ...rec, type: 'atividade', minutos: num(d.minutos), distancia: num(d.distancia), kcal: num(d.kcal) }); S.ui.ativ = null; await reloadRecs(); toast('Atividade salva'); go('#/hoje');
};
ACT.ativApagar = async () => { if (!(await confirmar('Apagar esta atividade?'))) return; await DB.del(S.ui.ativ.id); S.ui.ativ = null; await reloadRecs(); go('#/hoje'); };

/* ================= FOTO DA JORNADA ================= */
const POSES = ['Frente', 'Perfil', 'Rosto', 'Corpo inteiro', 'Outra'];
VIEWS.foto = async (parts) => {
  const id = parts[0];
  let d = S.ui.foto;
  if (!d || d._for !== id) {
    if (id === 'nova') d = { _for: id, id: uid(), novo: true, date: new Date().toISOString(), pose: 'Frente', kg: '', photoId: null };
    else { const r = await DB.rec(id); if (!r) { go('#/jornada/resultados'); return { html: '' }; } d = { ...r, _for: id, novo: false }; }
    S.ui.foto = d;
  }
  const url = d.photoId ? await photoUrl(d.photoId) : null;
  const html = `<div class="screen sheet-page">
    ${topBar(d.novo ? 'Foto da jornada' : 'Editar foto', 'Para o antes e agora', '#/jornada/resultados')}
    ${url ? `<div class="photo"><img src="${url}" alt="Foto da jornada"></div><label class="small" style="font-weight:800;color:var(--coralText);cursor:pointer;align-self:flex-start">Trocar foto<input type="file" accept="image/*" data-in="fotoArq" hidden></label>`
      : `<section class="card" style="text-align:center;gap:12px"><span class="ico" style="align-self:center;width:64px;height:64px;border-radius:20px;background:#FBF0CF;color:#7A5600">${icon('photo', 30)}</span><h2>Escolha a foto</h2>
        <span class="small muted">Vale foto antiga, de festa ou viagem. Coloque a data em que ela foi tirada.</span>
        <label class="btn primary block">${icon('cam', 20, 2.2)} Tirar foto agora<input type="file" accept="image/*" capture="user" data-in="fotoArq" hidden></label>
        <label class="btn ghost block">Escolher da galeria<input type="file" accept="image/*" data-in="fotoArq" hidden></label></section>`}
    <section class="card">
      <div class="chips">${POSES.map((p) => `<button class="chip ${d.pose === p ? 'on' : ''}" data-act="fotoPose" data-v="${p}">${p}</button>`).join('')}</div>
      <div class="grid2">
        <label class="field">Data da foto<div class="input"><input type="date" data-in="fotoData" value="${dayKey(d.date)}"></div></label>
        <label class="field">Peso nesse dia<div class="input"><input data-in="fotoKg" inputmode="decimal" value="${esc(d.kg)}" placeholder="opcional"><span class="un">kg</span></div></label>
      </div>
    </section>
    <button class="btn primary block" data-act="fotoSalvar" ${url ? '' : 'disabled'}>Salvar foto</button>
    ${!d.novo ? `<button class="btn danger block" data-act="fotoApagar">Apagar esta foto</button>` : ''}
  </div>`;
  return { html, nav: false };
};
INP.fotoArq = async (el, e) => {
  if (e.type !== 'change') return; const f = el.files && el.files[0]; if (!f) return;
  toast('Preparando a foto…');
  const { blob } = await compressImage(f, 1440);
  const pid = 'p' + uid(); await DB.putBlob(pid, blob);
  const d = S.ui.foto; if (d.photoId && d._temp) await DB.delBlob(d.photoId);
  d.photoId = pid; d._temp = true;
  if (f.lastModified && d.novo) { const lm = new Date(f.lastModified); if (lm < new Date()) d.date = lm.toISOString(); }
  rerender();
};
ACT.fotoPose = (el) => { S.ui.foto.pose = el.dataset.v; rerender(); };
INP.fotoData = (el) => { if (el.value) { const dt = fromKey(el.value); dt.setHours(12); S.ui.foto.date = dt.toISOString(); } };
INP.fotoKg = (el) => { S.ui.foto.kg = el.value; };
ACT.fotoSalvar = async () => {
  const d = S.ui.foto; if (!d.photoId) return;
  const { _for, novo, _temp, ...rec } = d;
  await DB.put({ ...rec, type: 'foto', kg: num(d.kg) }); S.ui.foto = null; await reloadRecs(); toast('Foto guardada na sua jornada'); go('#/jornada/resultados');
};
ACT.fotoApagar = async () => { if (!(await confirmar('Apagar esta foto?'))) return; const d = S.ui.foto; await DB.del(d.id); if (d.photoId) await DB.delBlob(d.photoId); S.ui.foto = null; await reloadRecs(); go('#/jornada/resultados'); };

/* ================= CANETA ================= */
const COR_P = ['#FF7A45', '#5B3FD9', '#1E8A6A', '#E0A100', '#3B82C4', '#C2366B'];
async function salvarCaneta() { await DB.set('caneta', S.caneta); }
function canetaObj() { if (!S.caneta) S.caneta = { pessoas: [], fechadas: 0, dosesPorAmpola: 4 }; return S.caneta; }

VIEWS.caneta = async () => {
  const c = canetaObj();
  const por = Math.max(1, num(c.dosesPorAmpola) || 1);
  const prev = preverCaneta(c);
  const cor = (p) => COR_P[c.pessoas.indexOf(p) % COR_P.length];
  const aplic = S.recs.filter((r) => r.type === 'aplicacao').sort((a, b) => new Date(b.date) - new Date(a.date));
  const diasAte = prev && prev.ultimo ? daysBetween(new Date(), prev.ultimo) : 0;
  const compraAte = prev && prev.falta ? addDays(prev.falta.dt, -3) : null;
  const edit = S.ui.editP;
  const pessoaForm = (p) => `<div class="card tight" style="gap:10px">
      <label class="field">Nome<div class="input"><input id="cp_nome" value="${esc(p.nome || '')}" placeholder="Ex.: Paula"></div></label>
      <label class="field">Dose<div class="input"><input id="cp_dose" value="${esc(p.dose || '')}" placeholder="Ex.: 5 mg"></div></label>
      <span class="small muted" style="font-weight:700">Dia da aplicação</span>
      <div class="grid4" style="grid-template-columns:repeat(7,minmax(0,1fr));gap:4px">${DIAS_C.map((l, i) => `<button class="chip ${Number(S.ui.cpDia ?? p.dia ?? 1) === i ? 'on' : ''}" style="justify-content:center;padding:0" data-act="cpDia" data-v="${i}" aria-label="${DIAS[i]}">${l}</button>`).join('')}</div>
      <div class="grid2"><button class="btn ghost" data-act="cpCancelar">Cancelar</button><button class="btn primary" data-act="cpSalvar" data-id="${p.id || ''}">Salvar</button></div>
      ${p.id ? `<button class="btn danger" data-act="cpRemover" data-id="${p.id}">Tirar ${esc(p.nome)} da caneta da casa</button>` : ''}
    </div>`;
  const html = `<div class="screen">
    ${topBar('Caneta da casa', 'Estoque e previsão', '', `<a class="btn dark" style="min-height:44px;padding:0 14px;font-size:13px" href="#/lancar">${icon('plus', 16, 2.6)}</a>`)}
    ${c.pessoas.length ? `<section class="hero" aria-label="Previsão do estoque">
      <span class="sub" style="font-size:13px;font-weight:600">${prev.total ? 'Pelos seus registros, o estoque dura até' : 'Sem doses registradas na casa'}</span>
      ${prev.ultimo ? `<div class="row" style="align-items:flex-end;gap:12px"><span class="big" style="font-size:64px">${ddmm(prev.ultimo)}</span><span class="sub" style="font-size:14px;font-weight:600;padding-bottom:6px;line-height:1.3">${DIAS[prev.ultimo.getDay()]}<br>daqui a ${diasAte} ${diasAte === 1 ? 'dia' : 'dias'}</span></div>` : ''}
      <span style="font-size:13px;color:#E4DFF2">${prev.total} ${prev.total === 1 ? 'dose' : 'doses'} na casa · ${c.pessoas.length} ${c.pessoas.length === 1 ? 'aplicação' : 'aplicações'} por semana</span>
      ${prev.falta ? `<div class="row" style="background:var(--coral);color:#1D1B3A;border-radius:16px;padding:12px 14px;gap:10px">${icon('cart', 20, 2.2)}<b style="font-size:14px;line-height:1.35">Compre até ${ddmm(compraAte)} para a aplicação de ${esc(prev.falta.p.nome)} no dia ${ddmm(prev.falta.dt)}.</b></div>` : ''}
    </section>
    ${prev.fila.length ? `<section class="card" aria-label="Para quem vai cada dose"><div class="row between" style="align-items:baseline"><h3>Próximas doses</h3><span class="small muted">quem usa e quando</span></div>
      <div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px">${prev.fila.slice(0, 12).map((f) => `<div class="col" style="align-items:center;gap:5px"><div class="num" style="width:100%;height:56px;border-radius:14px;background:${cor(f.p)}22;color:${cor(f.p)};display:flex;align-items:center;justify-content:center;font-size:18px;border:2px solid ${cor(f.p)}">${esc((f.p.nome || '?')[0].toUpperCase())}</div><span style="font-size:11px;font-weight:700">${ddmm(f.dt)}</span></div>`).join('')}</div>
      ${prev.fila.length > 12 ? `<span class="small muted">e mais ${prev.fila.length - 12} doses</span>` : ''}</section>` : ''}` : `<div class="empty">Cadastre quem usa a caneta na casa para o leve prever quando o estoque acaba.</div>`}

    <span class="small muted" style="font-weight:700;font-size:13px">Quem usa${c.pessoas.length ? ' · ampola aberta de cada um' : ''}</span>
    ${c.pessoas.map((p) => edit === p.id ? pessoaForm(p) : `<div class="card tight" style="gap:12px">
      <div class="row" style="gap:12px">
        <span class="num" style="width:44px;height:44px;border-radius:22px;background:${cor(p)};color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;flex:none">${esc((p.nome || '?')[0].toUpperCase())}</span>
        <div class="col" style="flex:1;min-width:0;gap:4px"><b style="font-size:15px">${esc(p.nome)} · ${esc(p.dose || 'dose?')}</b><span class="small muted">Toda ${DIAS[Number(p.dia)]} · próxima ${ddmm(proximaAplicacao(p))}</span>
          <span style="display:flex;gap:4px">${Array.from({ length: por }, (_, i) => `<i style="width:22px;height:9px;border-radius:5px;background:${i < (num(p.aberta) || 0) ? cor(p) : 'var(--line)'};display:block"></i>`).join('')}<span class="small muted" style="margin-left:6px;font-weight:700">${num(p.aberta) || 0} de ${por}</span></span></div>
        <button class="iconbtn" data-act="cpEditar" data-id="${p.id}" aria-label="Editar ${esc(p.nome)}">${icon('edit', 18)}</button>
      </div>
      <div style="display:grid;grid-template-columns:44px 44px minmax(0,1fr) minmax(0,1fr);gap:6px">
        <button class="iconbtn" data-act="cpAberta" data-id="${p.id}" data-d="-1" aria-label="Uma dose a menos">−</button>
        <button class="iconbtn" data-act="cpAberta" data-id="${p.id}" data-d="1" aria-label="Uma dose a mais">+</button>
        <button class="btn" style="min-height:44px;background:var(--coralSoft);color:var(--coralDeep);font-size:13px;padding:0 8px" data-act="cpAcabou" data-id="${p.id}">Ampola acabou</button>
        <button class="btn dark" style="min-height:44px;font-size:13px;padding:0 8px" data-act="aplicar" data-p="${p.id}">Apliquei</button>
      </div></div>`).join('')}
    ${edit === 'nova' ? pessoaForm({}) : `<button class="btn ghost block" style="border-style:dashed" data-act="cpNova">${icon('plus', 18, 2.6)} Adicionar pessoa da casa</button>`}

    <section class="card" aria-label="Estoque fechado">
      <div class="row between"><div class="col" style="gap:2px"><b style="font-size:15px">Ampolas fechadas</b><span class="small muted">guardadas na geladeira</span></div>
        <div class="row" style="gap:10px"><button class="iconbtn" data-act="cpFech" data-d="-1" aria-label="Uma ampola a menos">−</button><span class="num" style="font-size:24px;min-width:28px;text-align:center">${num(c.fechadas) || 0}</span><button class="iconbtn" data-act="cpFech" data-d="1" aria-label="Uma ampola a mais">+</button></div></div>
      <div class="row between" style="padding-top:12px;border-top:1px solid var(--line)"><div class="col" style="gap:2px"><b style="font-size:15px">Doses por ampola</b><span class="small muted">conforme a sua caneta</span></div>
        <div class="row" style="gap:10px"><button class="iconbtn" data-act="cpPor" data-d="-1" aria-label="Menos doses por ampola">−</button><span class="num" style="font-size:24px;min-width:28px;text-align:center">${por}</span><button class="iconbtn" data-act="cpPor" data-d="1" aria-label="Mais doses por ampola">+</button></div></div>
      <div class="row" style="gap:8px;padding-top:12px;border-top:1px solid var(--line)"><span class="small" style="flex:1;font-weight:700">Comprei</span>
        <button class="iconbtn" data-act="cpCompraQ" data-d="-1" aria-label="Menos">−</button><span class="num" style="font-size:20px;min-width:24px;text-align:center">${S.ui.compraQ || 1}</span><button class="iconbtn" data-act="cpCompraQ" data-d="1" aria-label="Mais">+</button>
        <button class="btn primary" style="min-height:44px;font-size:13px" data-act="cpCompra">Registrar compra</button></div>
    </section>

    <section class="card" aria-label="Últimas aplicações"><h3>Últimas aplicações</h3>
      ${aplic.slice(0, 8).map((a) => `<div class="row" style="gap:10px;font-size:14px"><i style="width:10px;height:10px;border-radius:5px;background:${cor(c.pessoas.find((p) => p.id === a.pessoaId) || {})};display:block;flex:none"></i><span style="flex:1;font-weight:600">${esc(a.nome)} · ${esc(a.dose || '')}</span><span class="muted small">${DIAS[new Date(a.date).getDay()]}, ${ddmm(a.date)}</span><button class="iconbtn" style="width:34px;height:34px;border:0;background:transparent;color:var(--muted)" data-act="aplApagar" data-id="${a.id}" aria-label="Apagar aplicação">${icon('x', 14, 2.6)}</button></div>`).join('') || '<span class="small muted">Nenhuma aplicação registrada ainda.</span>'}
    </section>
    <p class="note">Perdeu, quebrou ou acabou antes da hora? Use "Ampola acabou" e a previsão é refeita na hora.</p>
  </div>`;
  return { html, tab: 'caneta' };
};
ACT.cpNova = () => { S.ui.editP = 'nova'; S.ui.cpDia = undefined; rerender(); };
ACT.cpEditar = (el) => { S.ui.editP = el.dataset.id; S.ui.cpDia = undefined; rerender(); };
ACT.cpCancelar = () => { S.ui.editP = null; rerender(); };
ACT.cpDia = (el) => { const n = $('#cp_nome'), d = $('#cp_dose'); S.ui.cpTmp = { nome: n && n.value, dose: d && d.value }; S.ui.cpDia = Number(el.dataset.v); rerender().then(() => { if (S.ui.cpTmp) { if ($('#cp_nome')) $('#cp_nome').value = S.ui.cpTmp.nome || ''; if ($('#cp_dose')) $('#cp_dose').value = S.ui.cpTmp.dose || ''; } }); };
ACT.cpSalvar = async (el) => {
  const c = canetaObj(); const nome = ($('#cp_nome').value || '').trim(); if (!nome) { toast('Informe o nome'); return; }
  const dose = ($('#cp_dose').value || '').trim();
  const id = el.dataset.id;
  if (id) { const p = c.pessoas.find((x) => x.id === id); p.nome = nome; p.dose = dose; if (S.ui.cpDia != null) p.dia = S.ui.cpDia; }
  else c.pessoas.push({ id: uid(), nome, dose, dia: S.ui.cpDia ?? 1, aberta: 0 });
  S.ui.editP = null; S.ui.cpTmp = null; await salvarCaneta(); rerender();
};
ACT.cpRemover = async (el) => { const c = canetaObj(); const p = c.pessoas.find((x) => x.id === el.dataset.id); if (!(await confirmar(`Tirar ${p.nome} da caneta da casa?`))) return; c.pessoas = c.pessoas.filter((x) => x.id !== p.id); S.ui.editP = null; await salvarCaneta(); rerender(); };
ACT.cpAberta = async (el) => { const c = canetaObj(); const p = c.pessoas.find((x) => x.id === el.dataset.id); const por = Math.max(1, num(c.dosesPorAmpola) || 1); p.aberta = Math.max(0, Math.min(por, (num(p.aberta) || 0) + Number(el.dataset.d))); await salvarCaneta(); rerender(); };
ACT.cpAcabou = async (el) => {
  const c = canetaObj(); const p = c.pessoas.find((x) => x.id === el.dataset.id); const por = Math.max(1, num(c.dosesPorAmpola) || 1);
  if ((num(c.fechadas) || 0) > 0) { c.fechadas = num(c.fechadas) - 1; p.aberta = por; toast(`Nova ampola aberta para ${p.nome}`); }
  else { p.aberta = 0; toast('Sem ampolas fechadas no estoque'); }
  await salvarCaneta(); rerender();
};
ACT.cpFech = async (el) => { const c = canetaObj(); c.fechadas = Math.max(0, (num(c.fechadas) || 0) + Number(el.dataset.d)); await salvarCaneta(); rerender(); };
ACT.cpPor = async (el) => { const c = canetaObj(); c.dosesPorAmpola = Math.max(1, Math.min(8, (num(c.dosesPorAmpola) || 1) + Number(el.dataset.d))); c.pessoas.forEach((p) => { p.aberta = Math.min(num(p.aberta) || 0, c.dosesPorAmpola); }); await salvarCaneta(); rerender(); };
ACT.cpCompraQ = (el) => { S.ui.compraQ = Math.max(1, (S.ui.compraQ || 1) + Number(el.dataset.d)); rerender(); };
ACT.cpCompra = async () => { const c = canetaObj(); const q = S.ui.compraQ || 1; c.fechadas = (num(c.fechadas) || 0) + q; S.ui.compraQ = 1; await salvarCaneta(); await DB.put({ id: uid(), type: 'compra', date: new Date().toISOString(), ampolas: q }); await reloadRecs(); toast(`${q} ${q === 1 ? 'ampola registrada' : 'ampolas registradas'}`); rerender(); };
ACT.aplicar = async (el) => {
  const c = canetaObj(); const p = c.pessoas.find((x) => x.id === el.dataset.p); if (!p) return;
  const por = Math.max(1, num(c.dosesPorAmpola) || 1);
  if ((num(p.aberta) || 0) > 0) p.aberta = num(p.aberta) - 1;
  else if ((num(c.fechadas) || 0) > 0) { c.fechadas = num(c.fechadas) - 1; p.aberta = por - 1; }
  await salvarCaneta();
  await DB.put({ id: uid(), type: 'aplicacao', date: new Date().toISOString(), pessoaId: p.id, nome: p.nome, dose: p.dose });
  await reloadRecs(); toast(`Aplicação de ${p.nome} registrada`); rerender();
};
ACT.aplApagar = async (el) => { if (!(await confirmar('Apagar este registro de aplicação? (o estoque não muda)'))) return; await DB.del(el.dataset.id); await reloadRecs(); rerender(); };
