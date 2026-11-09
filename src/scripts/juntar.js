/* Dream Art — juntar à encomenda: o formulário da ficha e a folha do «+» dos cartões.
   Todas as peças da Dream Art levam nomes ou datas: o «+» de um cartão abre uma folha com os campos
   da personalização dessa peça (o catálogo diz quais e com que rótulos), a quantidade e o botão. Uma
   peça sem nada para escrever nem escolher junta-se logo. Depois de juntar: o saco do cabeçalho
   conta mais uma e aparece o recado com «Ver a encomenda». */
(function () {
  'use strict';
  const { $, $$, esc, euros, ico, catalogo, miniaturaHtml, precoDe, hojeLisboa } = window.DA;
  const folha = $('#folha');
  const caixaFolha = folha && $('[data-folha]', folha);

  /* O formulário de um artigo, como o gerador o escreve na ficha (paginas.mjs, formulario): mudar um
     é mudar o outro. */
  function formularioHtml(slug, p, prefixo) {
    const id = (k) => `${prefixo}-${k}-${slug}`;
    const escolhas = (p.opcoes || []).map((g, i) => {
      const marcado = Math.max(0, g.valores.findIndex((v) => !v.suplemento));
      return `<fieldset class="campo escolha" data-escolha="${i}"><legend>${esc(g.nome)}</legend><div class="escolha__lista">${g.valores.map((v, j) => `<label class="escolha__opcao"><input type="radio" name="opcao-${i}" value="${j}"${j === marcado ? ' checked' : ''}><span>${esc(v.nome)}${v.suplemento ? ` <span class="escolha__mais">+ ${euros(v.suplemento)}</span>` : ''}</span></label>`).join('')}</div></fieldset>`;
    }).join('');
    const campos = p.pers || [];
    const marca = (k) => (k.obrigatorio ? ' <span class="campo__obrig" aria-hidden="true">*</span>' : '');
    const pers = campos.length ? `<fieldset class="juntar__pers"><legend class="juntar__legenda"><span>Personalização</span>${campos.some((k) => k.obrigatorio) ? '<span class="juntar__nota" aria-hidden="true">* obrigatório</span>' : ''}</legend>${campos.map((k) => {
      const rotulo = `<label for="${id(k.id)}">${esc(k.rotulo)}${marca(k)}</label>`;
      if (k.id === 'data') return `<div class="campo">${rotulo}<input id="${id('data')}" name="data" type="date"${k.obrigatorio ? ' required' : ''} data-sem-passado></div>`;
      if (k.id === 'frase') return `<div class="campo">${rotulo}<textarea id="${id('frase')}" name="frase" rows="2" maxlength="160" spellcheck="true"${k.obrigatorio ? ' required' : ''}></textarea></div>`;
      return `<div class="campo">${rotulo}<input id="${id('nome')}" name="nome" type="text" maxlength="60" autocomplete="off" autocapitalize="words" spellcheck="false"${k.obrigatorio ? ' required' : ''}></div>`;
    }).join('')}</fieldset>` : '';
    const minimo = p.minimo || 1;
    return `<form class="juntar" data-juntar-form="${esc(slug)}" data-minimo="${minimo}" novalidate>
  ${escolhas}${pers}
  <div class="juntar__qtd">
    <label for="${id('qtd')}">Quantidade</label>
    <div class="passo" data-passo><button type="button" data-menos aria-label="Menos um">${ico('menos')}</button><input id="${id('qtd')}" name="quantidade" type="number" inputmode="numeric" min="${minimo}" max="999" value="${minimo}"${minimo > 1 ? ` aria-describedby="${id('minimo')}"` : ''}><button type="button" data-mais aria-label="Mais um">${ico('mais')}</button></div>
    ${minimo > 1 ? `<p class="campo__ajuda" id="${id('minimo')}">Mínimo: ${minimo}</p>` : ''}
  </div>
  <p class="juntar__erro" data-erro role="alert" hidden></p>
  <div class="juntar__acoes"><button class="botao botao--verde" type="submit">${ico('saco')}<span>Juntar à encomenda</span></button></div>
  <p class="juntar__total" data-total aria-live="polite"></p>
</form>`;
  }

  /* Liga um formulário de juntar: o total ao vivo, os erros junto do campo, e o juntar. */
  function ligar(form, { depois } = {}) {
    const slug = form.dataset.juntarForm;
    const minimo = Number(form.dataset.minimo) || 1;
    const erro = $('[data-erro]', form);
    const total = $('[data-total]', form);
    const escolhas = () => $$('[data-escolha]', form).map((f) => Number(($('input:checked', f) || {}).value || 0));
    const quantidade = () => Math.min(999, Math.max(minimo, parseInt(form.elements.quantidade.value, 10) || minimo));
    const mostrarTotal = async () => {
      const q = quantidade();
      const passo = $('[data-passo]', form);
      if (passo) { $('[data-menos]', passo).disabled = q <= minimo; $('[data-mais]', passo).disabled = q >= 999; }
      const t = await window.DA.carrinho.totalDe({ produto: slug, opcoes: escolhas(), qtd: q });
      total.textContent = t ? `Total: ${t}` : '';
    };
    form.addEventListener('input', mostrarTotal);
    form.addEventListener('change', mostrarTotal);
    form.elements.quantidade.addEventListener('blur', () => { form.elements.quantidade.value = quantidade(); mostrarTotal(); });
    mostrarTotal();
    /* A frase do erro aparece junto ao campo que falta: por baixo do botão ficava fora do ecrã. */
    const errar = (campo, texto) => {
      erro.textContent = texto;
      const sitio = campo && campo.closest('.campo');
      if (sitio) sitio.append(erro); else $('.juntar__acoes', form).before(erro);
      erro.hidden = false;
      if (campo) { campo.setAttribute('aria-invalid', 'true'); campo.focus(); }
    };
    form.addEventListener('input', (ev) => { if (ev.target.hasAttribute('aria-invalid')) ev.target.removeAttribute('aria-invalid'); erro.hidden = true; });
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      erro.hidden = true;
      $$('[aria-invalid]', form).forEach((i) => i.removeAttribute('aria-invalid'));
      const pers = {};
      for (const k of ['nome', 'data', 'frase']) {
        const i = form.elements[k];
        if (!i) continue;
        const v = i.value.trim();
        const rotulo = ($(`label[for="${i.id}"]`, form).firstChild.textContent || '').trim();
        if (i.required && !v) { errar(i, k === 'data' ? `Escolha a ${rotulo.toLowerCase()}.` : `Escreva: ${rotulo.toLowerCase()}.`); return; }
        if (k === 'data' && v && v < hojeLisboa()) { errar(i, 'Essa data já passou.'); return; }
        if (v) pers[k] = v;
      }
      const q = quantidade();
      window.DA.carrinho.juntar({ produto: slug, opcoes: escolhas(), pers, qtd: q });
      for (const k of ['nome', 'data', 'frase']) if (form.elements[k]) form.elements[k].value = '';
      form.elements.quantidade.value = minimo;
      mostrarTotal();
      juntou(slug, q, $('button[type="submit"]', form));
      if (depois) depois();
    });
  }

  /* Depois de juntar: o recado com a fotografia e «Ver a encomenda». */
  async function juntou(slug, q, botao) {
    let cat = null;
    try { cat = await catalogo(); } catch (_) { /* sem catálogo, o recado vai sem fotografia */ }
    const p = cat && cat.produtos[slug];
    const encomenda = (cat && cat.encomenda) || `${document.body.dataset.base}encomenda/`;
    window.DA.recado(`${p ? miniaturaHtml(cat, p.img, 44) : ''}<span class="recado__texto">${p ? `${q > 1 ? `${q} × ` : ''}${esc(p.curto || p.nome)}: ` : ''}juntou-se à encomenda.</span><a href="${esc(encomenda)}">Ver a encomenda</a>`);
    if (botao && botao.classList.contains('artigo__mais')) { botao.classList.add('is-feito'); window.setTimeout(() => botao.classList.remove('is-feito'), 600); }
  }

  // a ficha
  $$('form[data-juntar-form]').forEach((f) => ligar(f));

  // o «+» dos cartões: a folha
  let origem = null;
  document.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-juntar]');
    if (!b || !folha) return;
    ev.preventDefault();
    const slug = b.dataset.juntar;
    let cat;
    try { cat = await catalogo(); } catch (_) { window.location.href = b.closest('.artigo').querySelector('.artigo__nome a').href; return; }
    const p = cat.produtos[slug];
    if (!p) return;
    // sem nada para escrever nem escolher, junta-se logo
    if (!(p.pers || []).length && !(p.opcoes || []).length && (p.minimo || 1) === 1) {
      window.DA.carrinho.juntar({ produto: slug, qtd: 1 });
      juntou(slug, 1, b);
      return;
    }
    origem = b;
    const v = precoDe(p);
    caixaFolha.innerHTML = `<div class="folha__puxador" aria-hidden="true"></div>
  <div class="folha__topo">
    ${miniaturaHtml(cat, p.img, 72)}
    <div><p class="folha__nome" id="folha-titulo">${esc(p.nome)}</p><p class="folha__preco">${v.atual === null ? 'Preço por confirmar' : `${p.desde ? 'Desde ' : ''}${euros(v.atual)}`}</p></div>
    <button class="icone-botao" type="button" data-fechar aria-label="Fechar">${ico('fechar')}</button>
  </div>
  ${formularioHtml(slug, p, 'fl')}
  <p class="folha__ficha"><a class="ligacao-seta" href="${esc(p.url)}"><span>Ver a peça</span>${ico('seta')}</a></p>`;
    window.DA.marcarDatas(caixaFolha);
    ligar($('form', caixaFolha), { depois: () => window.DA.paineis.fechar(folha) });
    window.DA.paineis.abrir(folha, origem);
    // o foco vai para o primeiro campo (no telemóvel, sem abrir o teclado por cima da folha)
    const primeiro = $('input:not([type="radio"]), textarea', caixaFolha);
    if (primeiro && !window.matchMedia('(hover: none)').matches) window.setTimeout(() => primeiro.focus(), 80);
  });
  if (folha) folha.addEventListener('da:fechado', () => { caixaFolha.innerHTML = ''; });

  // o catálogo vem quando o browser está livre: a folha e a procura abrem logo
  const depois = window.requestIdleCallback || ((f) => window.setTimeout(f, 1200));
  depois(() => { catalogo().catch(() => {}); });
})();
