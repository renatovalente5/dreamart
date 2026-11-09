/* Dream Art — a interface (a da proposta A): o cabeçalho que encolhe ao rolar, a gaveta do menu, a
   procura e a folha (dialog nativo: o foco fica lá dentro e o Esc fecha), a capa que roda as
   coleções, o aparecer ao rolar, as pastilhas da loja, a galeria da ficha e os passos (+ / −). */
(function () {
  'use strict';
  const { $, $$, menosMovimento } = window.DA;

  /* ---------- Cabeçalho: encolhe ao rolar ---------- */
  const topo = $('#topo');
  if (topo) {
    let compacto = false;
    let pedido = false;
    const ver = () => {
      pedido = false;
      const agora = window.scrollY > 24;
      if (agora !== compacto) { compacto = agora; topo.classList.toggle('is-compacto', agora); }
    };
    window.addEventListener('scroll', () => { if (!pedido) { pedido = true; window.requestAnimationFrame(ver); } }, { passive: true });
    ver();
  }

  /* ---------- O botão flutuante do WhatsApp sai da frente dos campos da ficha ---------- */
  // No telemóvel, o botão fixo em baixo à direita tapava a ponta dos campos da personalização: sai
  // enquanto o formulário «Juntar à encomenda» está no ecrã, e volta quando se rola para fora dele.
  const whats = $('.whats');
  const formFicha = $('form.juntar');
  if (whats && formFicha && 'IntersectionObserver' in window) {
    const estreito = window.matchMedia('(max-width: 1023px)');
    let visivel = false;
    const aplicar = () => whats.classList.toggle('whats--fora', visivel && estreito.matches);
    new IntersectionObserver((entradas) => { visivel = entradas.some((e) => e.isIntersecting); aplicar(); }).observe(formFicha);
    estreito.addEventListener('change', aplicar);
  }

  /* ---------- O aviso do topo com data: sai sozinho no dia seguinte ---------- */
  $$('.aviso[data-ate]').forEach((a) => { if (window.DA.hojeLisboa() > a.dataset.ate) a.hidden = true; });

  /* ---------- Os painéis: gaveta, procura e folha ---------- */
  // Desliza ao abrir e ao fechar; o fundo escurece; um clique no fundo fecha; o foco volta ao botão
  // que o abriu. O Chrome repõe um <dialog> aberto ao voltar atrás: fecha-se à chegada.
  const origens = new WeakMap();
  const tempos = new WeakMap();
  function abrir(dialogo, origem) {
    if (!dialogo) return;
    window.clearTimeout(tempos.get(dialogo));
    if (origem) origens.set(dialogo, origem);
    if (!dialogo.open) dialogo.showModal();
    const botao = origem && origem.getAttribute('aria-controls') === dialogo.id ? origem : null;
    if (botao) botao.setAttribute('aria-expanded', 'true');
    // deixa pintar fechado e só depois desliza
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => dialogo.classList.add('is-aberta')));
    dialogo.dispatchEvent(new CustomEvent('da:aberto'));
  }
  function fechar(dialogo) {
    if (!dialogo || !dialogo.open) return;
    dialogo.classList.remove('is-aberta');
    const espera = menosMovimento.matches ? 0 : 420;
    tempos.set(dialogo, window.setTimeout(() => { if (dialogo.open) dialogo.close(); }, espera));
  }
  $$('dialog').forEach((d) => {
    if (d.open) d.close();
    d.addEventListener('cancel', (ev) => { ev.preventDefault(); fechar(d); });
    d.addEventListener('click', (ev) => {
      if (ev.target === d) { fechar(d); return; }
      if (ev.target.closest('[data-fechar]')) fechar(d);
    });
    d.addEventListener('close', () => {
      d.classList.remove('is-aberta');
      $$(`[aria-controls="${d.id}"]`).forEach((b) => b.setAttribute('aria-expanded', 'false'));
      const o = origens.get(d);
      if (o && document.contains(o)) o.focus({ preventScroll: true });
      d.dispatchEvent(new CustomEvent('da:fechado'));
    });
  });
  window.addEventListener('pageshow', (ev) => { if (ev.persisted) $$('dialog[open]').forEach((d) => d.close()); });
  const gaveta = $('#gaveta');
  const procura = $('#procura');
  const botaoMenu = $('#abrir-menu');
  const botaoProcura = $('#abrir-procura');
  if (botaoMenu) botaoMenu.addEventListener('click', () => abrir(gaveta, botaoMenu));
  if (botaoProcura) botaoProcura.addEventListener('click', () => abrir(procura, botaoProcura));
  window.DA.paineis = { abrir, fechar };

  /* ---------- Capa: as coleções que rodam ---------- */
  const capa = $('.capa');
  const slides = capa ? $$('.capa__slide', capa) : [];
  if (capa && slides.length > 1) {
    const abas = $$('.capa__aba', capa);
    const pausa = $('.capa__pausa', capa);
    const PASSO = 7000;
    let atual = 0;
    let relogio = 0;
    let parado = menosMovimento.matches; // com movimento reduzido não roda sozinha
    let suspenso = false;
    capa.style.setProperty('--passo', `${PASSO}ms`);

    const mostrar = (i, porToque) => {
      atual = (i + slides.length) % slides.length;
      slides.forEach((s, n) => {
        const ativo = n === atual;
        s.classList.toggle('is-ativo', ativo);
        if (ativo) s.removeAttribute('inert'); else s.setAttribute('inert', '');
      });
      abas.forEach((a, n) => a.setAttribute('aria-current', n === atual ? 'true' : 'false'));
      // reinicia a barra de progresso
      const barra = $('.capa__barra i', abas[atual]);
      if (barra) { barra.style.animation = 'none'; void barra.offsetWidth; barra.style.animation = ''; }
      if (porToque) programar();
    };
    const programar = () => {
      window.clearTimeout(relogio);
      // também não roda por trás de um painel aberto
      const vai = !parado && !suspenso && !$('dialog[open]');
      capa.classList.toggle('is-a-passar', vai);
      if (vai) relogio = window.setTimeout(() => { mostrar(atual + 1); programar(); }, PASSO);
    };
    const desenharPausa = () => {
      pausa.setAttribute('aria-pressed', parado ? 'true' : 'false');
      pausa.setAttribute('aria-label', parado ? 'Retomar a passagem das coleções' : 'Parar a passagem das coleções');
    };
    abas.forEach((a, n) => a.addEventListener('click', () => mostrar(n, true)));
    pausa.addEventListener('click', () => { parado = !parado; desenharPausa(); programar(); });
    desenharPausa();
    // pára enquanto o rato ou o foco estão na capa, e quando o separador está escondido
    capa.addEventListener('mouseenter', () => { suspenso = true; programar(); });
    capa.addEventListener('mouseleave', () => { suspenso = false; programar(); });
    capa.addEventListener('focusin', () => { suspenso = true; programar(); });
    capa.addEventListener('focusout', (ev) => { if (!capa.contains(ev.relatedTarget)) { suspenso = false; programar(); } });
    document.addEventListener('visibilitychange', () => { suspenso = document.hidden; programar(); });
    $$('dialog').forEach((d) => { d.addEventListener('close', programar); d.addEventListener('da:aberto', () => window.setTimeout(programar, 0)); });
    if (menosMovimento.addEventListener) menosMovimento.addEventListener('change', (ev) => { parado = ev.matches; desenharPausa(); programar(); });
    programar();
  }

  /* ---------- Aparecer ao rolar (só o que começa abaixo do primeiro ecrã) ---------- */
  if ('IntersectionObserver' in window && !menosMovimento.matches) {
    const alto = window.innerHeight;
    const porVer = $$('.revela').filter((el) => el.getBoundingClientRect().top > alto);
    const observador = new IntersectionObserver((entradas) => {
      entradas.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add('revelado');
        en.target.classList.remove('por-revelar');
        observador.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    porVer.forEach((el) => { el.classList.add('por-revelar'); observador.observe(el); });
  }

  /* ---------- Loja: no telemóvel, a pastilha do separador aberto fica à vista ---------- */
  const fila = $('.pastilhas ul');
  const aberta = fila && $('[aria-current="page"]', fila);
  if (aberta && fila.scrollWidth > fila.clientWidth) {
    const li = aberta.parentElement;
    fila.scrollLeft = li.offsetLeft - (fila.clientWidth - li.offsetWidth) / 2;
  }

  /* ---------- Galeria da ficha: as miniaturas escolhem a fotografia ---------- */
  $$('[data-galeria]').forEach((g) => {
    const pista = $('.galeria__pista', g);
    const minis = $$('[data-foto]', g);
    if (!minis.length) return;
    minis.forEach((b) => b.addEventListener('click', () => {
      pista.scrollTo({ left: Number(b.dataset.foto) * pista.clientWidth, behavior: menosMovimento.matches ? 'auto' : 'smooth' });
    }));
    pista.addEventListener('scroll', () => {
      const i = Math.round(pista.scrollLeft / pista.clientWidth);
      minis.forEach((b, n) => (n === i ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
    }, { passive: true });
  });

  /* ---------- Os passos (+ / −) dos formulários de juntar ---------- */
  // Os das linhas da encomenda são do carrinho (data-linha).
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-passo] [data-mais], [data-passo] [data-menos]');
    if (!b) return;
    const input = $('input', b.closest('[data-passo]'));
    const minimo = Number(input.min) || 1;
    const n = Math.min(999, Math.max(minimo, (parseInt(input.value, 10) || minimo) + (b.hasAttribute('data-mais') ? 1 : -1)));
    input.value = n;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  // as datas da personalização não oferecem dias que já passaram
  const marcarDatas = (raiz = document) => $$('input[type="date"][data-sem-passado]', raiz).forEach((i) => { i.min = window.DA.hojeLisboa(); });
  marcarDatas();
  window.DA.marcarDatas = marcarDatas;
})();
