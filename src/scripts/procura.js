/* Dream Art — a procura: a lupa abre o painel e procura a sério no catálogo — no nome, na frase
   curta e no separador de cada peça, sem acentos nem maiúsculas («lembrancas» encontra
   «Lembranças»; «velas» encontra «vela»). Cada resultado leva à ficha. Vazia, mostra os separadores. */
(function () {
  'use strict';
  const { $, esc, euros, normalizar, catalogo, miniaturaHtml, precoDe } = window.DA;
  const painel = $('#procura');
  if (!painel) return;
  const form = $('[data-procura]', painel);
  const campo = $('input[name="q"]', form);
  const caixa = $('[data-procura-resultados]', painel);
  const inicio = $('[data-procura-inicio]', painel);
  const estado = $('[data-procura-estado]', painel);
  let indice = null;
  let primeiro = null;

  async function preparar() {
    if (indice) return indice;
    const cat = await catalogo();
    indice = Object.entries(cat.produtos).map(([slug, p]) => ({
      slug, p,
      nome: normalizar(`${p.nome} ${p.curto || ''}`),
      resto: normalizar(`${p.resumo || ''} ${p.sepNome || ''} ${p.sepTitulo || ''}`),
    }));
    indice.cat = cat;
    return indice;
  }

  /* Cada palavra tem de aparecer em algum lado; uma palavra no plural vale também no singular. As
     peças com as palavras no nome vêm primeiro. */
  function procurar(texto) {
    const palavras = normalizar(texto).split(/[^a-z0-9]+/).filter(Boolean);
    if (!palavras.length) return [];
    const formas = palavras.map((w) => (w.length > 3 && w.endsWith('s') ? [w, w.slice(0, -1)] : [w]));
    const contem = (txt, fs) => fs.some((f) => txt.includes(f));
    return indice
      .filter((x) => formas.every((fs) => contem(x.nome, fs) || contem(x.resto, fs)))
      .map((x) => ({ x, pontos: formas.reduce((s, fs) => s + (fs.some((f) => x.nome.startsWith(f)) ? 3 : contem(x.nome, fs) ? 2 : 0), 0) }))
      .sort((a, b) => b.pontos - a.pontos)
      .map((r) => r.x);
  }

  function desenhar(lista, texto) {
    const cat = indice.cat;
    primeiro = lista[0] || null;
    if (!texto.trim()) {
      caixa.hidden = true;
      inicio.hidden = false;
      estado.textContent = '';
      return;
    }
    inicio.hidden = true;
    caixa.hidden = false;
    if (!lista.length) {
      caixa.innerHTML = `<p class="procura__nada">Nenhuma peça encontrada para «${esc(texto.trim())}».</p>`;
      estado.textContent = 'Nenhuma peça encontrada.';
      return;
    }
    caixa.innerHTML = `<ul class="resultados" role="list">${lista.map(({ slug, p }) => {
      const v = precoDe(p);
      return `<li><a class="resultado" href="${esc(p.url)}" data-resultado="${esc(slug)}">${miniaturaHtml(cat, p.img, 56)}<span><span class="resultado__nome">${esc(p.nome)}</span><span class="resultado__sep">${esc(p.sepNome || '')}</span></span><span class="resultado__preco">${v.atual === null ? '' : `${p.desde ? 'Desde ' : ''}${euros(v.atual)}`}</span></a></li>`;
    }).join('')}</ul>`;
    estado.textContent = `${lista.length} ${lista.length === 1 ? 'peça encontrada' : 'peças encontradas'}.`;
  }

  let espera = 0;
  campo.addEventListener('input', () => {
    window.clearTimeout(espera);
    espera = window.setTimeout(async () => {
      try { await preparar(); } catch (_) { caixa.hidden = false; inicio.hidden = true; caixa.innerHTML = '<p class="procura__nada">Não conseguimos procurar agora. Verifique a ligação.</p>'; return; }
      desenhar(procurar(campo.value), campo.value);
    }, 80);
  });
  // O Esc fecha a procura logo (num campo de procura com texto, o Chrome só o apagava, e o painel
  // ficava aberto)
  campo.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    ev.preventDefault();
    window.DA.paineis.fechar(painel);
  });
  // Enter abre a primeira peça encontrada
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (primeiro) window.location.href = primeiro.p.url;
  });
  painel.addEventListener('da:aberto', () => {
    preparar().catch(() => {});
    window.setTimeout(() => { campo.focus(); if (campo.value) campo.select(); }, 60);
  });
})();
