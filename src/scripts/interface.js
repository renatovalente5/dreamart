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
    const PASSO = 5500; // um pouco mais rápido do que os 7 s de antes (o Renato, 9 nov 2026)
    let atual = 0;
    let relogio = 0;
    let resta = PASSO; // o que falta ao diapositivo de agora: parar e retomar não volta a contar do zero
    let desde = 0; // quando o relógio arrancou
    let comecou = false; // a barra só anda depois de a passagem ter arrancado uma vez
    let parado = menosMovimento.matches; // com movimento reduzido não roda sozinha
    let suspenso = false;
    capa.style.setProperty('--passo', `${PASSO}ms`);

    const mostrar = (i, porToque) => {
      window.clearTimeout(relogio); relogio = 0; resta = PASSO;
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
    /* Pára e retoma no ponto onde estava: guarda o que falta, e a barra fica parada (is-suspensa) em vez
       de voltar ao princípio. */
    const programar = () => {
      const agora = performance.now();
      if (relogio) { window.clearTimeout(relogio); relogio = 0; resta = Math.max(0, resta - (agora - desde)); }
      // também não roda por trás de um painel aberto
      const vai = !parado && !suspenso && !$('dialog[open]');
      if (vai) comecou = true;
      capa.classList.toggle('is-a-passar', comecou);
      capa.classList.toggle('is-suspensa', comecou && !vai);
      if (vai) { desde = agora; relogio = window.setTimeout(() => { relogio = 0; mostrar(atual + 1); programar(); }, resta); }
    };
    const desenharPausa = () => {
      pausa.setAttribute('aria-pressed', parado ? 'true' : 'false');
      pausa.setAttribute('aria-label', parado ? 'Retomar a passagem das coleções' : 'Parar a passagem das coleções');
    };
    abas.forEach((a, n) => a.addEventListener('click', () => mostrar(n, true)));
    pausa.addEventListener('click', () => { parado = !parado; if (!parado) suspenso = false; desenharPausa(); programar(); });
    desenharPausa();
    /* Pára enquanto o rato está na capa (no botão de pausa também), ou o foco do teclado (:focus-visible),
       e quando o separador está escondido; ao sair, continua de onde estava. Só o rato: no telemóvel, um toque dava «mouseenter» sem o «mouseleave», e a capa
       ficava parada de vez. */
    capa.addEventListener('pointerenter', (ev) => { if (ev.pointerType === 'mouse') { suspenso = true; programar(); } });
    capa.addEventListener('pointerleave', (ev) => { if (ev.pointerType === 'mouse') { suspenso = false; programar(); } });
    const peloTeclado = (el) => { try { return el.matches(':focus-visible'); } catch (_) { return true; } }; // Safari < 15.4
    capa.addEventListener('focusin', (ev) => { if (peloTeclado(ev.target)) { suspenso = true; programar(); } });
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
  /* ---------- A data da celebração: escreve-se dd/mm/aaaa, ou escolhe-se no calendário ---------- */
  // O campo é de texto: a data aparece sempre como em Portugal, seja qual for a língua do browser (o
  // <input type="date"> mostrava «mm/dd/yyyy» no Chrome em inglês, e no Safari o dia de hoje a cinzento,
  // como se já estivesse escolhido). O calendário é o do telemóvel ou do computador: um <input
  // type="date"> invisível por cima do ícone, sem os dias que já passaram.
  function ligarDatas(raiz = document) {
    $$('[data-data]', raiz).forEach((caixa) => {
      if (caixa.dataset.ligada) return;
      caixa.dataset.ligada = '1';
      const { hojeLisboa, isoDe, dataCurta } = window.DA;
      const texto = $('input[type="text"]', caixa);
      const nativa = $('input[type="date"]', caixa);
      // a barra entra sozinha depois do dia e do mês (só a escrever no fim)
      texto.addEventListener('input', (ev) => {
        if (ev.inputType !== 'insertText' || texto.selectionStart !== texto.value.length) return;
        let v = texto.value.replace(/\/{2,}/g, '/');
        if (/^\d{2}$|^\d{1,2}\/\d{2}$/.test(v)) v += '/';
        if (v !== texto.value) texto.value = v;
      });
      texto.addEventListener('blur', () => { const iso = isoDe(texto.value); if (iso) texto.value = dataCurta(iso); });
      const preparar = () => { nativa.min = hojeLisboa(); nativa.value = isoDe(texto.value) || ''; };
      nativa.addEventListener('pointerdown', (ev) => {
        preparar();
        // sem showPicker, o rato só punha o cursor no campo invisível: vai para o de texto
        if (typeof nativa.showPicker !== 'function' && ev.pointerType === 'mouse') { ev.preventDefault(); texto.focus(); }
      });
      nativa.addEventListener('focus', preparar);
      nativa.addEventListener('click', () => {
        if (typeof nativa.showPicker === 'function') { try { nativa.showPicker(); } catch (_) { /* o browser abre-o sozinho */ } }
      });
      const escolhida = () => {
        if (!nativa.value) return;
        texto.value = dataCurta(nativa.value);
        texto.dispatchEvent(new Event('input', { bubbles: true }));
      };
      nativa.addEventListener('input', escolhida);
      nativa.addEventListener('change', escolhida);
    });
  }
  ligarDatas();
  window.DA.ligarDatas = ligarDatas;
})();
