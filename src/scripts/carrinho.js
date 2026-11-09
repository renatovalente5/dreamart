/* Dream Art — a encomenda.
   Não há pagamentos no site: a encomenda junta as peças (com a personalização e as escolhas de cada
   uma), soma os portes da entrega escolhida e, no fim, abre o WhatsApp com a encomenda escrita.
   Nada sai do aparelho da pessoa até ela enviar a mensagem. No browser («dreamart:carrinho») fica só
   a encomenda — as peças, a personalização, as quantidades e a entrega — e, depois de abrir o
   WhatsApp, a hora a que o abriu, para a página dizer «Encomenda enviada» quando a pessoa volta;
   nunca o nome nem a morada (a política de privacidade promete isto).
   Os preços nunca se guardam: lêem-se sempre do catálogo publicado, para um preço mudado no painel
   valer logo. */
(function () {
  'use strict';
  const { $, $$, esc, euros, dataPorExtenso, ico, guardado, precoDe, catalogo, miniaturaHtml } = window.DA;
  const CHAVE = 'dreamart:carrinho';
  const MAX_QTD = 999;
  const CAMPOS = ['nome', 'data', 'frase'];

  // ---------------------------------------------------------------- estado
  const linhaValida = (l) => l && typeof l.produto === 'string' && Number.isInteger(l.qtd) && l.qtd > 0;
  function ler() {
    const e = guardado.ler(CHAVE, null);
    if (e && e.v === 1 && Array.isArray(e.linhas)) {
      e.linhas = e.linhas.filter(linhaValida).map((l) => ({ ...l, opcoes: Array.isArray(l.opcoes) ? l.opcoes : [], pers: l.pers && typeof l.pers === 'object' ? l.pers : {} }));
      if (typeof e.zona !== 'string') e.zona = 'levantamento';
      if (!(e.enviada && typeof e.enviada.em === 'string' && typeof e.enviada.encomenda === 'string')) delete e.enviada;
      return e;
    }
    return { v: 1, linhas: [], zona: 'levantamento' };
  }
  let estado = ler();
  const chaveLinha = (l) => JSON.stringify([l.produto, l.opcoes || [], CAMPOS.map((k) => String((l.pers || {})[k] || '').trim().toLowerCase())]);
  /* «Encomenda enviada» vale para ESTA encomenda: mudar uma peça, a quantidade ou a entrega apaga a
     marca (a encomenda que seguiu já não é esta), e ao fim de 14 dias também. */
  const assinatura = () => JSON.stringify([estado.linhas.map((l) => [chaveLinha(l), l.qtd]), estado.zona]);
  function enviada() {
    const env = estado.enviada;
    if (!env) return null;
    const idade = Date.now() - Date.parse(env.em);
    if (!estado.linhas.length || env.encomenda !== assinatura() || !(idade >= 0 && idade < 14 * 864e5)) { delete estado.enviada; return null; }
    return env;
  }
  const ouvintes = [];
  function guardar() {
    enviada();
    guardado.gravar(CHAVE, estado);
    desenharConta();
    ouvintes.forEach((f) => f());
  }
  window.addEventListener('storage', (ev) => { if (ev.key === CHAVE) { estado = ler(); desenharConta(); ouvintes.forEach((f) => f()); } });
  // A página volta da memória do browser (o «voltar» depois do WhatsApp): lê-se outra vez.
  window.addEventListener('pageshow', (ev) => { if (ev.persisted) { estado = ler(); desenharConta(); ouvintes.forEach((f) => f()); } });

  // ---------------------------------------------------------------- contas
  /* As escolhas de uma linha, com o valor escolhido em cada grupo (ou o primeiro sem acréscimo, se a
     escolha já não existe: o artigo mudou no painel). */
  function escolhasDe(p, l) {
    return (p.opcoes || []).map((g, i) => {
      let j = (l.opcoes || [])[i];
      if (!Number.isInteger(j) || !g.valores[j]) j = Math.max(0, g.valores.findIndex((x) => !x.suplemento));
      return { grupo: g.nome, valor: g.valores[j].nome, suplemento: g.valores[j].suplemento || 0 };
    });
  }
  function contas(cat, linhas, zona) {
    let pecas = 0;
    let porConfirmar = false;
    const detalhe = linhas.map((l) => {
      const p = cat.produtos[l.produto];
      if (!p) return { linha: l, p: null };
      const escolhas = escolhasDe(p, l);
      const base = precoDe(p).atual;
      const unidade = base === null ? null : base + escolhas.reduce((s, x) => s + x.suplemento, 0);
      const total = unidade === null ? null : Math.round(unidade * l.qtd * 100) / 100;
      if (total === null) porConfirmar = true; else pecas += total;
      return { linha: l, p, escolhas, unidade, total };
    });
    const validas = detalhe.filter((d) => d.p);
    pecas = Math.round(pecas * 100) / 100;
    let portes = 0;
    let portesPorConfirmar = false;
    if (zona !== 'levantamento' && validas.length) {
      const v = (cat.portes || {})[zona];
      const gratis = (cat.portes || {}).gratisAPartirDe;
      // portes grátis no continente a partir de um valor (quando a Dream Art o definir)
      if (zona === 'continente' && typeof gratis === 'number' && !porConfirmar && pecas >= gratis) portes = 0;
      else if (typeof v === 'number') portes = v; else portesPorConfirmar = true;
    }
    return { detalhe, validas, pecas, porConfirmar, portes, portesPorConfirmar, total: Math.round((pecas + portes) * 100) / 100 };
  }

  // ---------------------------------------------------------------- o saco do cabeçalho
  /* O número no saco: as peças diferentes da encomenda (com 80 convites, «80» no saco não dizia nada). */
  let ultimaConta = null;
  function desenharConta() {
    const n = estado.linhas.length;
    const saco = $('#saco');
    const conta = saco && $('[data-conta]', saco);
    if (!saco || !conta) return;
    conta.hidden = n === 0;
    conta.textContent = n > 99 ? '99+' : String(n);
    saco.setAttribute('aria-label', n ? `A encomenda: ${n} ${n === 1 ? 'artigo' : 'artigos'}` : 'A encomenda');
    if (ultimaConta !== null && n > ultimaConta) { conta.classList.remove('is-pulo'); void conta.offsetWidth; conta.classList.add('is-pulo'); }
    ultimaConta = n;
  }

  // ---------------------------------------------------------------- juntar (a ficha e a folha)
  function juntar({ produto, opcoes = [], pers = {}, qtd = 1 }) {
    const limpo = Object.fromEntries(CAMPOS.map((k) => [k, String(pers[k] || '').trim().replace(/\s+/g, ' ').slice(0, k === 'frase' ? 160 : 60)]).filter(([, v]) => v));
    const nova = { produto, opcoes: opcoes.map(Number), pers: limpo, qtd: Math.max(1, Math.min(MAX_QTD, qtd)) };
    const igual = estado.linhas.find((l) => chaveLinha(l) === chaveLinha(nova));
    if (igual) igual.qtd = Math.min(MAX_QTD, igual.qtd + nova.qtd);
    else estado.linhas.push(nova);
    guardar();
  }
  async function totalDe({ produto, opcoes = [], qtd = 1 }) {
    try {
      const cat = await catalogo();
      const c = contas(cat, [{ produto, opcoes, qtd, pers: {} }], 'levantamento');
      if (!c.validas.length) return '';
      return c.porConfirmar ? 'preço por confirmar' : euros(c.pecas);
    } catch (_) { return ''; }
  }

  // ---------------------------------------------------------------- a página da encomenda
  const pagina = $('[data-encomenda]');
  const form = pagina && $('[data-encomenda-form]', pagina);
  let ultimaMensagem = '';

  /* Os pormenores de uma linha (escolhas e personalização), pela ordem da mensagem. O rótulo sem o
     «(opcional)» que alguns trazem: na encomenda já não é pergunta. */
  const semOpcional = (t) => String(t).replace(/\s*\(opcional\)\s*$/i, '');
  function pormenores(d) {
    const out = [];
    for (const x of d.escolhas) out.push([x.grupo, `${x.valor}${x.suplemento ? ` (+ ${euros(x.suplemento)})` : ''}`]);
    for (const k of d.p.pers || []) {
      const v = (d.linha.pers || {})[k.id];
      if (v) out.push([semOpcional(k.rotulo), k.id === 'data' ? dataPorExtenso(v) : v]);
    }
    return out;
  }

  function linhaHtml(cat, d, i) {
    if (!d.p) {
      return `<li class="linha linha--saiu"><span class="linha__foto"></span><div class="linha__info"><p class="linha__nome">Peça que já não está à venda</p><p class="linha__un">Saiu da loja e não entra na encomenda.</p></div><div class="linha__fundo"><button class="icone-botao linha__tirar" type="button" data-tirar="${i}" aria-label="Tirar da encomenda">${ico('lixo')}</button></div></li>`;
    }
    const p = d.p;
    const minimo = p.minimo || 1;
    const nome = esc(p.nome);
    const extras = pormenores(d).map(([k, v]) => `<li>${esc(k)}: <strong>${esc(v)}</strong></li>`).join('');
    const un = d.unidade === null ? 'Preço por confirmar' : `${euros(d.unidade)} / unidade`;
    return `<li class="linha">
      <a class="linha__foto" href="${esc(p.url)}" tabindex="-1" aria-hidden="true">${miniaturaHtml(cat, p.img, 104)}</a>
      <div class="linha__info">
        <p class="linha__nome"><a href="${esc(p.url)}">${nome}</a></p>
        ${extras ? `<ul class="linha__pormenores" role="list">${extras}</ul>` : ''}
        <p class="linha__un">${un}</p>
      </div>
      <div class="linha__fundo">
        <div class="passo" data-linha="${i}">
          <button type="button" data-menos aria-label="Menos um: ${nome}"${d.linha.qtd <= minimo ? ' disabled' : ''}>${ico('menos')}</button>
          <input type="number" inputmode="numeric" min="${minimo}" max="${MAX_QTD}" value="${d.linha.qtd}" aria-label="Quantidade: ${nome}">
          <button type="button" data-mais aria-label="Mais um: ${nome}"${d.linha.qtd >= MAX_QTD ? ' disabled' : ''}>${ico('mais')}</button>
        </div>
        <span class="linha__total">${d.total === null ? 'a confirmar' : euros(d.total)}</span>
        <button class="icone-botao linha__tirar" type="button" data-tirar="${i}" aria-label="Tirar da encomenda: ${nome}">${ico('lixo')}</button>
      </div>
    </li>`;
  }

  function resumoHtml(c, cat, zona) {
    const portes = zona === 'levantamento' ? 'Sem portes' : (c.portesPorConfirmar ? 'a confirmar' : euros(c.portes));
    const pecas = c.porConfirmar ? (c.pecas ? `${euros(c.pecas)} + a confirmar` : 'a confirmar') : euros(c.pecas);
    let total;
    if (c.porConfirmar) total = 'a confirmar';
    else if (zona !== 'levantamento' && c.portesPorConfirmar) total = `${euros(c.pecas)} + portes`;
    else total = euros(c.total);
    return `<div><dt>Subtotal</dt><dd>${pecas}</dd></div>
      <div><dt>Portes</dt><dd>${portes}</dd></div>
      <div class="resumo__total"><dt>Total</dt><dd>${total}</dd></div>`;
  }

  // « hoje, às 21:34» ou « a 12 de outubro, às 21:34» (em Lisboa)
  function quando(iso) {
    const d = new Date(iso);
    const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    const hora = new Intl.DateTimeFormat('pt-PT', { timeZone: 'Europe/Lisbon', hour: '2-digit', minute: '2-digit' }).format(d);
    if (dia === window.DA.hojeLisboa()) return ` hoje, às ${hora}`;
    return ` a ${new Intl.DateTimeFormat('pt-PT', { timeZone: 'Europe/Lisbon', day: 'numeric', month: 'long' }).format(d)}, às ${hora}`;
  }

  async function desenharPagina() {
    if (!pagina) return;
    const carregar = $('[data-encomenda-carregar]', pagina);
    const cheia = $('[data-encomenda-cheia]', pagina);
    const vazia = $('[data-encomenda-vazia]', pagina);
    let cat;
    try { cat = await catalogo(); } catch (_) {
      carregar.textContent = 'Não conseguimos abrir a encomenda. Verifique a ligação e recarregue a página.';
      return;
    }
    carregar.hidden = true;
    const radios = $$('input[name="zona"]', form);
    if (!radios.some((r) => r.value === estado.zona)) estado.zona = radios[0] ? radios[0].value : 'levantamento';
    radios.forEach((r) => { r.checked = r.value === estado.zona; });
    const vazio = !estado.linhas.length;
    cheia.hidden = vazio;
    vazia.hidden = !vazio;
    if (vazio) return;
    const c = contas(cat, estado.linhas, estado.zona);
    $('[data-linhas]', pagina).innerHTML = c.detalhe.map((d, i) => linhaHtml(cat, d, i)).join('');
    $('[data-resumo]', form).innerHTML = resumoHtml(c, cat, estado.zona);
    const zona = cat.zonas.find((z) => z.id === estado.zona) || {};
    $('[data-so-envio]', form).hidden = !zona.morada;
    $$('[data-obrigatorio-envio]', form).forEach((i) => { i.required = Boolean(zona.morada); });
    const europa = $('[data-so-europa]', form);
    if (europa) { europa.hidden = estado.zona !== 'europa'; $('input', europa).required = estado.zona === 'europa'; }
    $$('[data-so-levantamento]', form).forEach((x) => { x.hidden = estado.zona !== 'levantamento'; });
    // Já abriu o WhatsApp com esta encomenda: a página diz isso (também quando a pessoa volta mais
    // tarde, ou recarrega), em vez de pedir os dados outra vez.
    const env = enviada();
    $('[data-por-enviar]', form).hidden = Boolean(env);
    $('[data-enviada]', form).hidden = !env;
    if (env) {
      $('[data-enviada-quando]', form).textContent = quando(env.em);
      $('[data-continuar]', form).href = `https://wa.me/${cat.whatsapp}${ultimaMensagem ? `?text=${encodeURIComponent(ultimaMensagem)}` : ''}`;
    }
  }

  // ---------------------------------------------------------------- a mensagem do WhatsApp
  /* A mensagem que a pessoa envia: as peças (quantidade, nome, preço e a personalização), a entrega e
     os portes, o total, a forma de pagamento (quando a Dream Art a disser), o nome, a morada e as
     observações. O *negrito* e os «- » (lista) são do WhatsApp. */
  function mensagem(cat, c, dados) {
    const z = cat.zonas.find((x) => x.id === estado.zona) || cat.zonas[0];
    const linhas = ['Olá! Quero fazer esta encomenda:', ''];
    for (const d of c.validas) {
      linhas.push(`*${d.linha.qtd} × ${d.p.nome}* — ${d.total === null ? 'preço a confirmar' : euros(d.total)}`);
      for (const [k, v] of pormenores(d)) linhas.push(`- ${k}: ${v}`);
      linhas.push('');
    }
    linhas.push(`Subtotal: ${c.porConfirmar ? (c.pecas ? `${euros(c.pecas)} + a confirmar` : 'a confirmar') : euros(c.pecas)}`);
    if (estado.zona === 'levantamento') linhas.push(`Entrega: ${z.nome}`);
    else linhas.push(`Entrega: ${z.nome} — portes ${c.portesPorConfirmar ? 'a confirmar' : euros(c.portes)}`);
    if (c.porConfirmar) linhas.push('*Total: a confirmar consigo*');
    else if (estado.zona !== 'levantamento' && c.portesPorConfirmar) linhas.push(`*Total: ${euros(c.pecas)} + portes*`);
    else linhas.push(`*Total: ${euros(c.total)}*`);
    if (cat.pagamento) linhas.push(`Pagamento: ${cat.pagamento}`);
    linhas.push('');
    linhas.push(`Nome: ${dados.nome}`);
    if (z.morada) linhas.push(`Morada: ${[dados.morada, [dados.codigoPostal, dados.localidade].filter(Boolean).join(' '), estado.zona === 'europa' ? dados.pais : ''].filter(Boolean).join(', ')}`);
    if (dados.notas) linhas.push(`Observações: ${dados.notas}`);
    return linhas.join('\n').replace(/\n{3,}/g, '\n\n');
  }

  /* ABRIR O WHATSAPP. No telemóvel, a própria página segue para o wa.me (uma ligação universal: abre
     logo a aplicação, e o separador fica na encomenda). No computador, um separador novo (o WhatsApp
     Web ou a aplicação); se o browser o recusar, abre-se aqui mesmo. O window.open é chamado dentro
     do toque, sem esperas antes: por isso o envio usa o catálogo já carregado. */
  const telemovel = window.matchMedia('(hover: none) and (pointer: coarse)');
  function abrirWhatsApp(url) {
    if (telemovel.matches) { window.location.href = url; return; }
    const janela = window.open(url, '_blank');
    if (janela) { try { janela.opener = null; } catch (_) { /* já é de outra origem */ } } else window.location.href = url;
  }

  if (pagina && form) {
    const erro = $('[data-erro-encomenda]', form);
    const focar = (sel) => { const t = $(sel, pagina); if (t) { t.tabIndex = -1; t.focus(); } };

    // as acções nas linhas (as linhas redesenham-se por inteiro: o foco volta ao botão equivalente)
    pagina.addEventListener('click', (ev) => {
      const tirar = ev.target.closest('[data-tirar]');
      if (tirar) {
        estado.linhas.splice(Number(tirar.dataset.tirar), 1);
        guardar();
        window.DA.recado('<span class="recado__texto">A peça saiu da encomenda.</span>');
        focar(estado.linhas.length ? '#t-encomenda' : '.vazio__titulo');
        return;
      }
      const b = ev.target.closest('[data-linha] [data-mais], [data-linha] [data-menos]');
      if (b) {
        const i = Number(b.closest('[data-linha]').dataset.linha);
        const l = estado.linhas[i];
        if (!l) return;
        const cat = window.DA.catalogoJa();
        const minimo = (cat && cat.produtos[l.produto] && cat.produtos[l.produto].minimo) || 1;
        const accao = b.hasAttribute('data-mais') ? 'data-mais' : 'data-menos';
        l.qtd = Math.max(minimo, Math.min(MAX_QTD, l.qtd + (accao === 'data-mais' ? 1 : -1)));
        guardar();
        const novo = $(`[data-linha="${i}"] [${accao}]`, pagina);
        if (novo && !novo.disabled) novo.focus(); else { const outro = $(`[data-linha="${i}"] input`, pagina); if (outro) outro.focus(); }
      }
    });
    // a quantidade escrita à mão (80 convites não se fazem com o «+»)
    pagina.addEventListener('change', (ev) => {
      const input = ev.target.closest('[data-linha] input');
      if (input) {
        const i = Number(input.closest('[data-linha]').dataset.linha);
        const l = estado.linhas[i];
        if (!l) return;
        const minimo = Number(input.min) || 1;
        l.qtd = Math.max(minimo, Math.min(MAX_QTD, parseInt(input.value, 10) || minimo));
        guardar();
        const novo = $(`[data-linha="${i}"] input`, pagina);
        if (novo) novo.focus();
        return;
      }
      if (ev.target.name === 'zona') { estado.zona = ev.target.value; guardar(); }
    });
    form.addEventListener('input', (ev) => { if (ev.target.hasAttribute('aria-invalid')) ev.target.removeAttribute('aria-invalid'); erro.hidden = true; });

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      erro.hidden = true;
      $$('[aria-invalid]', form).forEach((i) => i.removeAttribute('aria-invalid'));
      let cat = window.DA.catalogoJa();
      if (!cat) {
        try { cat = await catalogo(); } catch (_) { erro.textContent = 'Não conseguimos carregar a loja. Verifique a ligação e tente outra vez.'; erro.hidden = false; return; }
      }
      const c = contas(cat, estado.linhas, estado.zona);
      if (!c.validas.length) { erro.textContent = 'A encomenda está vazia.'; erro.hidden = false; return; }
      const faltam = ['nome', 'morada', 'codigoPostal', 'localidade', 'pais'].map((n) => form.elements[n]).filter((i) => i && i.required && !i.value.trim());
      if (faltam.length) {
        faltam.forEach((i) => i.setAttribute('aria-invalid', 'true'));
        const nomes = faltam.map((i) => $(`label[for="${i.id}"]`, form).firstChild.textContent.trim().toLowerCase());
        erro.textContent = `Falta preencher: ${nomes.join(', ')}.`;
        erro.hidden = false;
        faltam[0].focus();
        return;
      }
      const dados = Object.fromEntries(['nome', 'morada', 'codigoPostal', 'localidade', 'pais', 'notas'].map((n) => [n, form.elements[n] ? form.elements[n].value.trim().replace(/\s+/g, ' ') : '']));
      ultimaMensagem = mensagem(cat, c, dados);
      const url = `https://wa.me/${cat.whatsapp}?text=${encodeURIComponent(ultimaMensagem)}`;
      // A marca «enviada» grava-se antes de abrir: no telemóvel a página pode sair logo a seguir.
      estado.enviada = { em: new Date().toISOString(), encomenda: assinatura() };
      guardar();
      abrirWhatsApp(url);
      focar('#t-enviada');
    });
    // «Alterar a encomenda»: o formulário outra vez, com a encomenda como está.
    $('[data-alterar]', form).addEventListener('click', () => { delete estado.enviada; guardar(); focar('#t-encomenda'); });
    // «Fazer outra encomenda»: a encomenda fica vazia.
    $('[data-esvaziar]', form).addEventListener('click', () => {
      estado = { v: 1, linhas: [], zona: estado.zona };
      ultimaMensagem = '';
      form.reset();
      guardar();
      focar('.vazio__titulo');
    });
    ouvintes.push(desenharPagina);
  }

  window.DA.carrinho = { juntar, totalDe, linhas: () => estado.linhas.slice() };
  desenharConta();
  desenharPagina();
})();
