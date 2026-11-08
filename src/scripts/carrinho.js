/* Mimices — o carrinho.
   Não há pagamentos no site: o carrinho junta as peças (com o tom de linho, as escolhas e a
   personalização de cada uma), soma os portes da entrega escolhida e, no fim, abre o WhatsApp
   com a encomenda escrita. Nada sai do aparelho da pessoa até ela enviar a mensagem; no
   armazenamento local fica só o carrinho (peças, personalização, entrega) e, depois de abrir o
   WhatsApp, a hora a que o abriu, para a página dizer «Encomenda enviada» quando a pessoa volta
   — nunca o nome ou a morada (a política de privacidade promete isto).
   Os preços nunca se guardam: lêem-se sempre do catálogo publicado (assets/catalogo-*.json),
   para um preço mudado no painel valer logo. (A base é o carrinho da Pokóto Wood.) */
(function () {
  'use strict';
  const CHAVE = 'mimices:carrinho';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hojeLisboa = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const euros = (v) => {
    const redondo = Number.isInteger(v);
    return `${v.toLocaleString('pt-PT', { minimumFractionDigits: redondo ? 0 : 2, maximumFractionDigits: 2 })} €`;
  };
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const dataPorExtenso = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return m ? `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}` : '';
  };
  const ICONES = {
    certo: '<svg class="icone" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    mais: '<svg class="icone" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14"/></svg>',
    menos: '<svg class="icone" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M5 12h14"/></svg>',
    lixo: '<svg class="icone" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 7h16M10 11v6M14 11v6M5.5 7l1 12.2a1 1 0 0 0 1 .8h9a1 1 0 0 0 1-.8l1-12.2M9 7V4.5h6V7"/></svg>',
  };
  const MAX_QTD = 999;

  // ---------------------------------------------------------------- estado
  const linhaValida = (l) => l && typeof l.produto === 'string' && Number.isInteger(l.qtd);
  function ler() {
    try {
      const e = JSON.parse(localStorage.getItem(CHAVE) || 'null');
      if (e && e.v === 1 && Array.isArray(e.linhas)) {
        e.linhas = e.linhas.filter(linhaValida);
        if (!(e.enviada && typeof e.enviada.em === 'string' && typeof e.enviada.carrinho === 'string')) delete e.enviada;
        return e;
      }
    } catch (_) { /* armazenamento bloqueado ou estragado: começa vazio */ }
    return { v: 1, linhas: [], zona: 'levantamento' };
  }
  let estado = ler();
  let anuncio = ''; // o que o leitor de ecrã diz depois de uma acção; nunca vai para o armazenamento
  const chaveLinha = (l) => JSON.stringify([l.produto, l.cor ?? null, l.opcoes || [], ['nome', 'data', 'frase'].map((k) => ((l.pers || {})[k] || '').trim().toLowerCase())]);
  // «Encomenda enviada» vale para ESTE carrinho: mudar uma peça, a quantidade, a personalização
  // ou a entrega apaga a marca (a encomenda que seguiu já não é esta), e ao fim de 14 dias também.
  const assinatura = () => JSON.stringify([estado.linhas.map((l) => [chaveLinha(l), l.qtd]), estado.zona]);
  function enviada() {
    const env = estado.enviada;
    if (!env) return null;
    const idade = Date.now() - Date.parse(env.em);
    if (!estado.linhas.length || env.carrinho !== assinatura() || !(idade >= 0 && idade < 14 * 864e5)) { delete estado.enviada; return null; }
    return env;
  }
  function guardar() {
    enviada();
    try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch (_) { /* modo privado sem armazenamento: o carrinho vive só nesta página */ }
    return desenharTudo();
  }
  window.addEventListener('storage', (e) => { if (e.key === CHAVE) { estado = ler(); desenharTudo(); } });
  // A página volta da memória do browser (o «voltar» depois do WhatsApp): lê-se outra vez o
  // carrinho, que pode ter mudado noutro separador entretanto.
  window.addEventListener('pageshow', (e) => { if (e.persisted) { estado = ler(); desenharTudo(); } });

  let catalogoP = null;
  let catalogoPronto = null; // o catálogo já carregado: o envio usa-o sem esperar (ver abrirWhatsApp)
  function catalogo() {
    if (!catalogoP) {
      catalogoP = fetch(document.body.dataset.catalogo).then((r) => {
        if (!r.ok) throw new Error(`catálogo ${r.status}`);
        return r.json();
      }).then((cat) => { catalogoPronto = cat; return cat; });
      catalogoP.catch(() => { catalogoP = null; });
    }
    return catalogoP;
  }

  // ---------------------------------------------------------------- contas
  // A mesma regra do site (src/lib/regras.mjs, precoDe): acabada a promoção, volta o preço
  // normal; sem preço, null («a confirmar»).
  function precoDe(p, hoje) {
    if (typeof p.preco !== 'number') return { atual: null, anterior: null };
    const emPromocao = Boolean(p.precoAnterior) && p.precoAnterior > p.preco && (!p.promocaoAte || hoje <= p.promocaoAte);
    if (emPromocao) return { atual: p.preco, anterior: p.precoAnterior };
    if (p.precoAnterior && p.promocaoAte && hoje > p.promocaoAte) return { atual: p.precoAnterior, anterior: null };
    return { atual: p.preco, anterior: null };
  }
  /* As escolhas de uma linha, com o valor escolhido em cada grupo (ou o primeiro sem acréscimo,
     se a escolha já não existe: o artigo mudou no painel). */
  function escolhasDe(p, l) {
    return (p.opcoes || []).map((g, i) => {
      let j = (l.opcoes || [])[i];
      if (!Number.isInteger(j) || !g.valores[j]) j = Math.max(0, g.valores.findIndex((x) => !x.suplemento));
      return { grupo: g.nome, valor: g.valores[j].nome, suplemento: g.valores[j].suplemento || 0 };
    });
  }

  function contas(cat, linhas, zona) {
    const hoje = hojeLisboa();
    let artigos = 0;
    let porConfirmar = false;
    const detalhe = linhas.map((l) => {
      const p = cat.produtos[l.produto];
      if (!p) return { linha: l, p: null };
      const escolhas = escolhasDe(p, l);
      const base = precoDe(p, hoje).atual;
      const unidade = base === null ? null : base + escolhas.reduce((s, x) => s + x.suplemento, 0);
      const total = unidade === null ? null : unidade * l.qtd;
      if (total === null) porConfirmar = true; else artigos += total;
      const cor = p.cores && l.cor != null ? (cat.cores || []).find((k) => k.numero === l.cor) : null;
      return { linha: l, p, escolhas, unidade, total, cor };
    });
    const validas = detalhe.filter((d) => d.p);
    let portes = 0;
    let portesPorConfirmar = false;
    if (zona !== 'levantamento' && validas.length) {
      const v = (cat.portes || {})[zona];
      const gratis = (cat.portes || {}).gratisAPartirDe;
      // portes grátis no continente a partir de um valor (quando a Mimices o definir)
      if (zona === 'continente' && typeof gratis === 'number' && !porConfirmar && artigos >= gratis) portes = 0;
      else if (typeof v === 'number') portes = v; else portesPorConfirmar = true;
    }
    return { detalhe, validas, artigos, porConfirmar, portes, portesPorConfirmar, total: artigos + portes, unidades: validas.reduce((s, d) => s + d.linha.qtd, 0) };
  }

  // ---------------------------------------------------------------- API para o site.js
  async function juntar({ produto, cor = null, opcoes = [], pers = {}, qtd = 1 }) {
    const limpo = Object.fromEntries(['nome', 'data', 'frase'].map((k) => [k, String(pers[k] || '').trim().slice(0, k === 'frase' ? 160 : 60)]).filter(([, v]) => v));
    const nova = { produto, cor: Number.isInteger(cor) ? cor : null, opcoes: opcoes.map(Number), pers: limpo, qtd: Math.max(1, Math.min(MAX_QTD, qtd)) };
    const igual = estado.linhas.find((l) => chaveLinha(l) === chaveLinha(nova));
    if (igual) igual.qtd = Math.min(MAX_QTD, igual.qtd + nova.qtd);
    else estado.linhas.push(nova);
    anuncio = 'Peça juntada ao carrinho.';
    return guardar();
  }
  async function totalDe({ produto, opcoes = [], qtd = 1 }) {
    try {
      const cat = await catalogo();
      const c = contas(cat, [{ produto, opcoes, qtd }], 'levantamento');
      if (!c.validas.length) return '';
      return c.porConfirmar ? 'preço por confirmar' : euros(c.artigos);
    } catch (_) { return ''; }
  }

  // ---------------------------------------------------------------- desenho das linhas
  /* Os pormenores de uma linha (tom, escolhas, personalização), na mesma ordem da mensagem. */
  function pormenores(d) {
    const l = d.linha;
    const out = [];
    if (d.cor) out.push(`Tom de linho: ${d.cor.numero} · ${d.cor.nome}`);
    for (const x of d.escolhas) out.push(`${x.grupo}: ${x.valor}${x.suplemento ? ` (+ ${euros(x.suplemento)})` : ''}`);
    const campos = d.p.personalizacao || [];
    for (const k of campos) {
      const v = (l.pers || {})[k.id];
      if (v) out.push(`${k.rotulo}: ${k.id === 'data' ? dataPorExtenso(v) : v}`);
    }
    return out;
  }
  function linhaHtml(d) {
    const l = d.linha;
    const i = estado.linhas.indexOf(l);
    if (!d.p) {
      return `<li class="linha"><div></div><div><p class="linha__nome">Peça que já não está à venda</p><p class="linha__indisponivel">Esta peça saiu da loja e não entra na encomenda.</p><div class="linha__fundo"><span></span><button class="linha__tirar" type="button" data-tirar="${i}">${ICONES.lixo}<span class="visualmente-escondido">Tirar do carrinho</span></button></div></div></li>`;
    }
    const extras = pormenores(d).map((t) => `<p class="linha__extra">${esc(t)}</p>`).join('');
    const minimo = d.p.minimo || 1;
    return `<li class="linha">
      <a class="linha__foto" href="${esc(d.p.url)}" tabindex="-1" aria-hidden="true"><img src="${esc(d.p.foto)}" alt="" width="76" height="95" loading="lazy"></a>
      <div>
        <p class="linha__nome"><a href="${esc(d.p.url)}">${esc(d.p.nome)}</a></p>
        ${extras}
        <div class="linha__fundo">
          <div class="quantidade" data-quantidade data-linha="${i}">
            <button type="button" data-menos${l.qtd <= minimo ? ' disabled' : ''}>${ICONES.menos}<span class="visualmente-escondido">Menos um de ${esc(d.p.nomeCurto)}</span></button>
            <span aria-live="polite"><span class="visualmente-escondido">Quantidade: </span>${l.qtd}</span>
            <button type="button" data-mais>${ICONES.mais}<span class="visualmente-escondido">Mais um de ${esc(d.p.nomeCurto)}</span></button>
          </div>
          <span class="linha__preco">${d.total === null ? 'a confirmar' : euros(d.total)}</span>
          <button class="linha__tirar" type="button" data-tirar="${i}">${ICONES.lixo}<span class="visualmente-escondido">Tirar ${esc(d.p.nomeCurto)} do carrinho</span></button>
        </div>
      </div>
    </li>`;
  }

  function totaisHtml(c, cat, zona) {
    const z = cat.zonas.find((x) => x.id === zona) || cat.zonas[0];
    const portes = zona === 'levantamento' ? 'Grátis' : (c.portesPorConfirmar ? 'a confirmar' : euros(c.portes));
    const confirmar = c.porConfirmar || (zona !== 'levantamento' && c.portesPorConfirmar);
    const total = confirmar ? (c.artigos ? `${euros(c.total)} + o que falta confirmar` : 'a confirmar') : euros(c.total);
    return `<p><span>Peças</span><span>${c.porConfirmar ? (c.artigos ? `${euros(c.artigos)} + a confirmar` : 'a confirmar') : euros(c.artigos)}</span></p>
      <p><span>${esc(z.curto)}</span><span>${portes}</span></p>
      <p class="totais__total"><span>Total</span><span>${total}</span></p>`;
  }

  // ---------------------------------------------------------------- gaveta
  async function desenharGaveta() {
    const alvo = $('[data-carrinho-gaveta]');
    if (!alvo) return;
    let cat;
    try { cat = await catalogo(); } catch (_) { alvo.innerHTML = '<p class="gaveta__vazio">Não conseguimos carregar o carrinho. Verifique a ligação e tente outra vez.</p>'; return; }
    const aviso = anuncio ? `<p class="visualmente-escondido" role="status">${esc(anuncio)}</p>` : '';
    anuncio = '';
    if (!estado.linhas.length) {
      alvo.innerHTML = `${aviso}<p class="gaveta__vazio">O carrinho está vazio.</p><div class="gaveta__acoes"><a class="botao botao--cheio" href="${esc(cat.loja)}">Ver a loja</a></div>`;
      return;
    }
    const zona = estado.zona || 'levantamento';
    const c = contas(cat, estado.linhas, zona);
    alvo.innerHTML = `${aviso}
      <ul class="linhas">${c.detalhe.map((d) => linhaHtml(d)).join('')}</ul>
      <div class="gaveta__zonas">
        <label for="gaveta-zona">Entrega</label>
        <select id="gaveta-zona" data-zona>${cat.zonas.map((z) => `<option value="${esc(z.id)}"${z.id === zona ? ' selected' : ''}>${esc(z.curto)}</option>`).join('')}</select>
      </div>
      <div class="totais" aria-live="polite">${totaisHtml(c, cat, zona)}</div>
      ${enviada() ? `<p class="gaveta__enviada">${ICONES.certo}<span>Já abriu o WhatsApp com esta encomenda.</span></p>` : ''}
      <div class="gaveta__acoes">
        <a class="botao botao--cheio" href="${esc(cat.carrinho)}">${enviada() ? 'Ver a encomenda' : 'Finalizar a encomenda'}</a>
        <button class="botao botao--contorno" type="button" data-fechar>Continuar a ver</button>
      </div>`;
  }

  // ---------------------------------------------------------------- página do carrinho
  const pagina = $('[data-carrinho-pagina]');
  const form = $('form[data-encomenda]');
  let ultimaMensagem = '';

  async function desenharPagina() {
    if (!pagina) return;
    const lista = $('[data-carrinho-lista]', pagina);
    let cat;
    try { cat = await catalogo(); } catch (_) { lista.innerHTML = '<p class="carrinho-vazio">Não conseguimos carregar o carrinho. Verifique a ligação e recarregue a página.</p>'; return; }
    const radios = $$('input[name="entrega"]', form);
    if (!radios.some((r) => r.value === estado.zona)) estado.zona = radios[0].value;
    radios.forEach((r) => { r.checked = r.value === estado.zona; });
    const vazio = !estado.linhas.length;
    form.hidden = vazio;
    if (vazio) {
      lista.innerHTML = `<p class="carrinho-vazio">O carrinho está vazio. <a href="${esc(cat.loja)}">Ver a loja</a></p>`;
      return;
    }
    const c = contas(cat, estado.linhas, estado.zona);
    lista.innerHTML = `<ul class="linhas">${c.detalhe.map((d) => linhaHtml(d)).join('')}</ul>`;
    // o preço dos portes ao lado de cada opção de entrega, para comparar antes de escolher
    $$('[data-preco-zona]', form).forEach((s) => {
      const z = s.dataset.precoZona;
      if (z === 'levantamento') { s.textContent = 'Grátis'; return; }
      const v = (cat.portes || {})[z];
      s.textContent = typeof v === 'number' ? euros(v) : 'a confirmar';
    });
    $('[data-totais]', form).innerHTML = totaisHtml(c, cat, estado.zona);
    // a data da celebração: por omissão, a primeira data escrita numa peça (a pessoa só a escreve uma vez)
    const dataCel = form.elements.dataCelebracao;
    if (dataCel && !dataCel.value) {
      const comData = estado.linhas.find((l) => l.pers && l.pers.data);
      if (comData) dataCel.value = comData.pers.data;
    }
    const comMorada = (cat.zonas.find((z) => z.id === estado.zona) || {}).morada;
    $$('[data-so-envio]', form).forEach((e) => { e.hidden = !comMorada; });
    $$('[data-obrigatorio-envio]', form).forEach((i) => { i.required = Boolean(comMorada); });
    // Já abriu o WhatsApp com esta encomenda: a página diz isso (também quando a pessoa volta
    // mais tarde, ou recarrega), em vez de pedir os dados outra vez.
    const env = enviada();
    form.dataset.estado = env ? 'enviada' : '';
    $('[data-enviada]', form).hidden = !env;
    $('#encomenda-titulo').textContent = env ? 'Encomenda enviada' : 'Finalizar a encomenda';
    if (env) {
      $('[data-enviada-quando]', form).textContent = quando(env.em);
      $('[data-copiar]', form).hidden = !ultimaMensagem; // o texto só vive nesta página: não se guarda
    }
  }
  // « hoje, às 21:34» ou « a 12 de outubro, às 21:34» (em Lisboa)
  function quando(iso) {
    const d = new Date(iso);
    const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    const hora = new Intl.DateTimeFormat('pt-PT', { timeZone: 'Europe/Lisbon', hour: '2-digit', minute: '2-digit' }).format(d);
    if (dia === hojeLisboa()) return ` hoje, às ${hora}`;
    return ` a ${new Intl.DateTimeFormat('pt-PT', { timeZone: 'Europe/Lisbon', day: 'numeric', month: 'long' }).format(d)}, às ${hora}`;
  }

  function desenharConta() {
    const n = estado.linhas.reduce((s, l) => s + l.qtd, 0);
    $$('[data-conta]').forEach((b) => {
      b.hidden = n === 0;
      b.textContent = n > 99 ? '99+' : String(n);
      const rotulo = b.parentElement && $('.visualmente-escondido', b.parentElement);
      if (rotulo) rotulo.textContent = n ? `Carrinho, ${n} ${n === 1 ? 'peça' : 'peças'}` : 'Carrinho';
    });
  }

  function desenharTudo() {
    desenharConta();
    const g = document.getElementById('carrinho');
    return Promise.all([g && g.open ? desenharGaveta() : null, desenharPagina()]);
  }

  // ---------------------------------------------------------------- acções nas linhas
  // As linhas redesenham-se por inteiro: o botão onde estava o foco deixa de existir. Depois de
  // redesenhar, o foco volta ao botão equivalente (o mesmo «+» da mesma linha), e quando a linha
  // sai vai para o título — nunca fica perdido no <body>.
  document.addEventListener('click', async (e) => {
    const onde = e.target.closest('dialog') ? '#carrinho' : '[data-carrinho-pagina]';
    const tirar = e.target.closest('[data-tirar]');
    if (tirar) {
      estado.linhas.splice(Number(tirar.dataset.tirar), 1);
      anuncio = 'Peça tirada do carrinho.';
      await guardar();
      const titulo = document.querySelector(onde === '#carrinho' ? '#carrinho-titulo' : '#encomenda-titulo, .carrinho-pagina h1');
      if (titulo) { titulo.tabIndex = -1; titulo.focus(); }
      return;
    }
    const b = e.target.closest('[data-linha] [data-mais], [data-linha] [data-menos]');
    if (b) {
      const l = estado.linhas[Number(b.closest('[data-linha]').dataset.linha)];
      if (!l) return;
      const cat = catalogoPronto;
      const minimo = (cat && cat.produtos[l.produto] && cat.produtos[l.produto].minimo) || 1;
      const accao = b.hasAttribute('data-mais') ? 'data-mais' : 'data-menos';
      l.qtd = Math.max(minimo, Math.min(MAX_QTD, l.qtd + (accao === 'data-mais' ? 1 : -1)));
      await guardar();
      const novo = document.querySelector(`${onde} [data-linha="${estado.linhas.indexOf(l)}"] [${accao}]`);
      if (novo && !novo.disabled) novo.focus();
      else { const outro = document.querySelector(`${onde} [data-linha="${estado.linhas.indexOf(l)}"] [data-mais]`); if (outro) outro.focus(); }
    }
  });
  document.addEventListener('change', (e) => {
    if (e.target.matches('[data-zona], input[name="entrega"]')) {
      estado.zona = e.target.value;
      guardar();
    }
  });

  // ---------------------------------------------------------------- a mensagem e o envio
  function mensagem(cat, c, dados) {
    const z = cat.zonas.find((x) => x.id === estado.zona);
    const linhas = ['Olá! Quero fazer esta encomenda:', ''];
    for (const d of c.validas) {
      linhas.push(`*${d.linha.qtd}× ${d.p.nome}* — ${d.total === null ? 'preço a confirmar' : euros(d.total)}`);
      for (const t of pormenores(d)) linhas.push(`   ${t}`);
    }
    linhas.push('');
    linhas.push(`Peças: ${c.porConfirmar ? (c.artigos ? `${euros(c.artigos)} + a confirmar` : 'a confirmar') : euros(c.artigos)}`);
    if (estado.zona === 'levantamento') linhas.push(`Entrega: ${z.nome} (grátis)`);
    else linhas.push(`Entrega: ${z.nome} — ${c.portesPorConfirmar ? 'portes a confirmar' : euros(c.portes)}`);
    const confirmar = c.porConfirmar || (estado.zona !== 'levantamento' && c.portesPorConfirmar);
    linhas.push(confirmar ? '*Total: a confirmar consigo*' : `*Total: ${euros(c.total)}*`);
    // A forma de pagamento vai na mensagem (DL 24/2014, art. 5.º): a mesma que a ficha e o carrinho dizem.
    linhas.push('Pagamento: MB WAY ou transferência');
    linhas.push('');
    linhas.push(`Cliente: ${dados.nome}`);
    if (dados.dataCelebracao) linhas.push(`Data da celebração: ${dataPorExtenso(dados.dataCelebracao)}`);
    if (z.morada) linhas.push(`Morada: ${dados.morada}, ${dados.codigoPostal} ${dados.localidade}`);
    if (dados.notas) linhas.push(`Observações: ${dados.notas}`);
    return linhas.join('\n');
  }

  /* ABRIR O WHATSAPP. No telemóvel, a própria página segue para o wa.me, que é uma ligação
     universal: abre logo a aplicação, e o separador fica no carrinho. No computador, um separador
     novo (o WhatsApp Web ou a aplicação), e o site fica onde estava; se o browser recusar o
     separador, abre-se aqui mesmo. Sem «noopener» nas opções do window.open: com ele o browser
     devolve SEMPRE null (memória window-open-noopener-devolve-null). O window.open tem de ser
     chamado dentro do toque, sem esperas antes: por isso o envio usa o catálogo já carregado. */
  const telemovel = window.matchMedia('(hover: none) and (pointer: coarse)');
  function abrirWhatsApp(url) {
    if (telemovel.matches) { location.href = url; return; }
    const janela = window.open(url, '_blank');
    if (janela) { try { janela.opener = null; } catch (_) { /* já é de outra origem */ } } else location.href = url;
  }
  const focarTitulo = () => { const t = $('#encomenda-titulo'); if (t) { t.tabIndex = -1; t.focus(); } };

  if (form) {
    const erro = $('[data-erro-encomenda]', form);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      erro.hidden = true;
      $$('[aria-invalid]', form).forEach((i) => i.removeAttribute('aria-invalid'));
      let cat = catalogoPronto;
      if (!cat) {
        try { cat = await catalogo(); } catch (_) { erro.textContent = 'Não conseguimos carregar o catálogo. Verifique a ligação e tente outra vez.'; erro.hidden = false; return; }
      }
      const c = contas(cat, estado.linhas, estado.zona);
      if (!c.validas.length) { erro.textContent = 'O carrinho está vazio.'; erro.hidden = false; return; }
      const campos = ['nome', 'morada', 'codigoPostal', 'localidade'].map((n) => form.elements[n]).filter((i) => i.required && !i.value.trim());
      if (campos.length) {
        campos.forEach((i) => i.setAttribute('aria-invalid', 'true'));
        erro.textContent = `Falta preencher: ${campos.map((i) => form.querySelector(`label[for="${i.id}"]`).textContent.toLowerCase()).join(', ')}.`;
        erro.hidden = false;
        campos[0].focus();
        return;
      }
      const dados = Object.fromEntries(['nome', 'dataCelebracao', 'morada', 'codigoPostal', 'localidade', 'notas'].map((n) => [n, form.elements[n].value.trim().replace(/\s+/g, ' ')]));
      ultimaMensagem = mensagem(cat, c, dados);
      // A marca «enviada» grava-se antes de abrir: no telemóvel a página pode sair logo a seguir.
      estado.enviada = { em: new Date().toISOString(), carrinho: assinatura() };
      const desenho = guardar();
      abrirWhatsApp(`https://wa.me/${cat.whatsapp || ''}?text=${encodeURIComponent(ultimaMensagem)}`);
      await desenho;
      focarTitulo();
    });
    // «Continuar no WhatsApp»: a mesma mensagem, se a página ainda a tem; depois de recarregar já
    // não a tem (os dados da pessoa não se guardam), e abre-se só a conversa.
    $('[data-continuar]', form).addEventListener('click', () => {
      const numero = (catalogoPronto && catalogoPronto.whatsapp) || '';
      abrirWhatsApp(`https://wa.me/${numero}${ultimaMensagem ? `?text=${encodeURIComponent(ultimaMensagem)}` : ''}`);
    });
    $('[data-copiar]', form).addEventListener('click', async (e) => {
      const b = e.currentTarget; // guardado antes do await: depois dele vale null
      try {
        await navigator.clipboard.writeText(ultimaMensagem);
        b.lastElementChild.textContent = 'Mensagem copiada';
      } catch (_) {
        b.lastElementChild.textContent = 'Não foi possível copiar';
      }
    });
    // «Alterar a encomenda»: o formulário outra vez, com o carrinho como está.
    $('[data-alterar]', form).addEventListener('click', async () => {
      delete estado.enviada;
      await guardar();
      focarTitulo();
    });
    // «Fazer outra encomenda»: o carrinho fica vazio.
    $('[data-esvaziar]', form).addEventListener('click', async () => {
      estado = { v: 1, linhas: [], zona: estado.zona };
      ultimaMensagem = '';
      form.reset();
      await guardar();
      const h1 = document.querySelector('.carrinho-pagina h1');
      if (h1) { h1.tabIndex = -1; h1.focus(); }
    });
  }

  window.MimicesCarrinho = { juntar, totalDe, desenharGaveta };
  catalogo().catch(() => {});
  desenharConta();
  desenharPagina();
})();
