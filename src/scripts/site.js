/* Mimices — o comportamento das páginas (sem dependências).
   O carrinho está em carrinho.js; os dois vão no mesmo ficheiro, este primeiro.
   (A base é o da Pokóto Wood.) */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const menosMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hojeLisboa = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const ICONE_PAUSA = '<svg class="icone" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M9 6.5v11M15 6.5v11"/></svg>';
  const ICONE_TOCAR = '<svg class="icone" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M8 5.5v13l10.5-6.5L8 5.5Z"/></svg>';

  // ---------------------------------------------------------------- o anel do foco
  // Um toque ou um clique escondem o anel do foco (o CSS, em html[data-entrada="ponteiro"]); uma
  // tecla volta a mostrá-lo, para quem navega pelo teclado.
  const raiz = document.documentElement;
  addEventListener('pointerdown', () => { raiz.dataset.entrada = 'ponteiro'; }, { capture: true, passive: true });
  addEventListener('keydown', (e) => { if (!e.metaKey && !e.ctrlKey) delete raiz.dataset.entrada; }, { capture: true });

  // ---------------------------------------------------------------- a barra ao descer
  // No topo a barra não tem chão; ao descer ganha o vidro fosco e encolhe (site.css). O estado vive
  // na raiz (html[data-rolado]), onde a linha do <head> já o escreveu antes da primeira pintura.
  // Dois limiares (40 a descer, 8 a subir) só contra a tremura de uma página parada na linha: a
  // caixa da barra não muda de altura, por isso encolher não mexe no documento. Uma leitura e no
  // máximo uma escrita por quadro. A animação só se arma depois de a primeira decisão ter pintado
  // (um recarregar a meio da página não desliza sozinho), e desarma-se enquanto se arrasta a janela.
  const topo = $('[data-topo]');
  if (topo) {
    let pedido = false;
    const decidir = () => {
      pedido = false;
      const y = scrollY;
      const agora = raiz.dataset.rolado === 'sim';
      const seguinte = y >= 40 ? true : y <= 8 ? false : agora;
      raiz.dataset.rolado = seguinte ? 'sim' : 'nao';
    };
    addEventListener('scroll', () => { if (!pedido) { pedido = true; requestAnimationFrame(decidir); } }, { passive: true });
    let armar;
    const armarDepois = () => {
      topo.dataset.anim = 'nao';
      clearTimeout(armar);
      requestAnimationFrame(() => requestAnimationFrame(() => { topo.dataset.anim = 'sim'; }));
      armar = setTimeout(() => { topo.dataset.anim = 'sim'; }, 300); // sem quadros num separador escondido
    };
    decidir();
    armarDepois();
    addEventListener('pageshow', () => { decidir(); armarDepois(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) decidir(); });
    let redimensionar;
    addEventListener('resize', () => { topo.dataset.anim = 'nao'; clearTimeout(redimensionar); redimensionar = setTimeout(() => { topo.dataset.anim = 'sim'; }, 250); });
  }

  // ---------------------------------------------------------------- aviso do topo com data
  // O site só muda quando se publica; o aviso «até 15 de dezembro» sai sozinho no dia 16.
  $$('.aviso[data-ate]').forEach((a) => { if (hojeLisboa() > a.dataset.ate) a.hidden = true; });

  // ---------------------------------------------------------------- menu e gaveta do carrinho
  // A página por trás fica trancada pelo CSS (html:has(dialog[open])): derivado do próprio
  // diálogo, nunca de uma classe que se põe e tira (um «close» perdido deixava-a presa).
  const dialogos = $$('dialog');
  dialogos.forEach((d) => {
    if (d.open) d.close(); // o Chrome repõe o «open» ao voltar atrás: abre-se outra vez à mão
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); }); // clique no fundo
    // por delegação: o conteúdo da gaveta é desenhado depois, pelo carrinho.js
    d.addEventListener('click', (e) => {
      if (e.target.closest('[data-fechar]')) { d.close(); return; }
      const a = e.target.closest('a[href]');
      if (a && !a.target) d.close();
    });
  });
  function abrir(id, origem) {
    const d = document.getElementById(id);
    if (!d || d.open) return;
    d.showModal();
    /* O showModal() põe o foco no primeiro elemento que o aceita (no menu, o logótipo; no carrinho,
       o X), e o Safari do iPhone mostra-o com o anel do foco mesmo depois de um toque («quando abro
       o menu está a ficar com high light no icon», 16 out 2026). O foco vai para o corpo da gaveta
       (tabindex=-1, sem anel): quem usa o teclado continua a entrar nos links com o Tab. */
    const corpo = d.querySelector('.menu__corpo, .gaveta__corpo');
    if (corpo) corpo.focus({ preventScroll: true });
    d._origem = origem || null;
    if (id === 'carrinho' && window.MimicesCarrinho) window.MimicesCarrinho.desenharGaveta();
  }
  dialogos.forEach((d) => d.addEventListener('close', () => { if (d._origem && document.contains(d._origem)) d._origem.focus(); }));
  $$('[data-abrir]').forEach((b) => b.addEventListener('click', (e) => {
    if (b.dataset.abrir === 'carrinho' && document.body.classList.contains('pagina-carrinho')) return; // já está no carrinho
    e.preventDefault();
    abrir(b.dataset.abrir, b);
  }));

  // ---------------------------------------------------------------- vídeos
  // Sem som e em ciclo. Começam sozinhos quando aparecem no ecrã — excepto com «reduzir
  // movimento» ou «poupar dados» (ou se o telemóvel recusar); aí ficam na imagem de capa, com o
  // botão de ver à vista. Tocar no vídeo pára-o.
  const poupar = navigator.connection && navigator.connection.saveData;
  const automatico = !menosMovimento.matches && !poupar;
  $$('[data-video]').forEach((v) => {
    const video = $('video', v);
    const botao = $('[data-video-botao]', v);
    const rotulo = $('.visualmente-escondido', botao);
    let escolhaDaPessoa = false;
    let recusado = false;
    const desenhar = () => {
      const tocar = video.paused;
      botao.setAttribute('aria-pressed', String(!tocar));
      botao.firstElementChild.outerHTML = tocar ? ICONE_TOCAR : ICONE_PAUSA;
      rotulo.textContent = tocar ? 'Ver o vídeo' : 'Parar o vídeo';
      v.classList.toggle('video--parado', tocar && (!automatico || escolhaDaPessoa || recusado));
    };
    const alternar = () => {
      escolhaDaPessoa = true;
      if (video.paused) video.play().catch(() => {}); else video.pause();
    };
    video.addEventListener('play', desenhar);
    video.addEventListener('pause', desenhar);
    botao.addEventListener('click', alternar);
    video.addEventListener('click', alternar);
    if (automatico) {
      new IntersectionObserver((es) => {
        if (escolhaDaPessoa) return;
        if (es[0].isIntersecting) video.play().catch(() => { recusado = true; desenhar(); }); else video.pause();
      }, { threshold: 0.4 }).observe(v);
    }
    desenhar();
  });

  // ---------------------------------------------------------------- o filme da capa
  // O que está na página por defeito é a imagem parada (o primeiro fotograma do filme): sem
  // JavaScript, com «reduzir movimento», a poupar dados, ou com o telemóvel a recusar o vídeo, fica
  // ela. Nada se descarrega até aqui se decidir que o filme pode tocar (o <video> não tem src).
  // Três perguntas, feitas sempre que alguma coisa muda (o ecrã roda, a pessoa muda as definições,
  // a capa sai do ecrã, o separador fica escondido): pode tocar? que corte (alto no telemóvel, largo
  // a partir de 48rem — data-filme-a, a mesma largura do CSS)? está à vista? E um botão de pausa
  // (WCAG 2.2.2: um movimento com mais de 5 segundos tem de se poder parar), que só aparece quando
  // há filme. O filme entra por cima da imagem só no «playing» (um fotograma pintado).
  const filme = $('.capa__filme');
  if (filme && filme.dataset.filmeLargo && filme.dataset.filmeAlto && filme.dataset.filmeA) {
    const botao = $('[data-filme-botao]');
    const largo = window.matchMedia(`(min-width: ${filme.dataset.filmeA})`);
    const poupa = () => { const c = navigator.connection; return !!c && (c.saveData === true || /(^|-)2g$/.test(c.effectiveType || '')); };
    const pode = () => !menosMovimento.matches && !poupa();
    const corte = () => (largo.matches ? filme.dataset.filmeLargo : filme.dataset.filmeAlto);
    let parado = false;      // a pessoa carregou na pausa (ou o telemóvel recusou o arranque)
    let noEcra = true;
    const desenhar = () => {
      if (!botao) return;
      botao.hidden = !pode();
      botao.setAttribute('aria-pressed', String(parado));
      botao.firstElementChild.outerHTML = parado ? ICONE_TOCAR : ICONE_PAUSA;
      $('.visualmente-escondido', botao).textContent = parado ? 'Ver o filme' : 'Parar o filme';
    };
    const acertar = () => {
      desenhar();
      if (!pode()) { delete filme.dataset.aTocar; if (filme.getAttribute('src')) filme.pause(); return; }
      // getAttribute, e não .src (que devolve o endereço absoluto e nunca seria igual): senão o src
      // mudava a cada chamada e o filme recomeçava a descarregar.
      if (filme.getAttribute('src') !== corte()) {
        delete filme.dataset.aTocar;
        filme.muted = true;    // o atributo já o diz; o Safari quer os dois
        filme.setAttribute('src', corte());
      }
      if (parado || !noEcra || document.visibilityState === 'hidden') { filme.pause(); return; }
      // Um arranque recusado (o iPhone em poupança de energia, ou sem «pré-visualizações de vídeo
      // automáticas») é uma resposta: fica a imagem, e o botão passa a «ver o filme» — o toque da
      // pessoa já o deixa arrancar.
      filme.play().catch(() => { parado = true; desenhar(); });
    };
    filme.addEventListener('playing', () => { if (pode()) filme.dataset.aTocar = ''; });
    if (botao) botao.addEventListener('click', () => { parado = !parado; acertar(); });
    largo.addEventListener('change', acertar);
    menosMovimento.addEventListener('change', acertar);
    document.addEventListener('visibilitychange', acertar);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => { noEcra = es.some((e) => e.isIntersecting); acertar(); }).observe(filme.closest('.capa') || filme);
    }
    acertar();
  }

  // ---------------------------------------------------------------- loja: a categoria aberta à vista
  // No telemóvel a fila das categorias desliza: a categoria aberta fica centrada, sem mexer na página.
  const fila = $('.chips ul');
  const aberta = fila && $('[aria-current]', fila);
  if (aberta) {
    const centrar = () => {
      if (fila.scrollWidth <= fila.clientWidth) return;
      const li = aberta.parentElement;
      fila.scrollLeft = li.offsetLeft - (fila.clientWidth - li.offsetWidth) / 2;
    };
    centrar();
    if (document.fonts) document.fonts.ready.then(centrar);
  }

  // ---------------------------------------------------------------- galeria da ficha
  $$('[data-galeria]').forEach((g) => {
    const pista = $('.galeria__pista', g);
    const minis = $$('[data-foto]', g);
    if (!minis.length) return;
    minis.forEach((b) => b.addEventListener('click', () => {
      const i = Number(b.dataset.foto);
      pista.scrollTo({ left: i * pista.clientWidth, behavior: menosMovimento.matches ? 'auto' : 'smooth' });
    }));
    pista.addEventListener('scroll', () => {
      const i = Math.round(pista.scrollLeft / pista.clientWidth);
      minis.forEach((b, n) => (n === i ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
    }, { passive: true });
  });

  // ---------------------------------------------------------------- quantidades (+ / −)
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-mais], [data-menos]');
    if (!b) return;
    const q = b.closest('[data-quantidade]');
    if (!q || q.hasAttribute('data-linha')) return; // as do carrinho são do carrinho.js
    const input = $('input', q);
    const minimo = Number(input.min) || 1;
    const n = Math.min(999, Math.max(minimo, (parseInt(input.value, 10) || minimo) + (b.hasAttribute('data-mais') ? 1 : -1)));
    input.value = n;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  // ---------------------------------------------------------------- o tom de linho escolhido
  // O nome do tom aparece ao lado de «Tom de linho» quando se escolhe uma amostra (as amostras são
  // só cor: o nome lê-se aqui, numa dica ao passar o rato, e o leitor de ecrã ouve-o na própria
  // amostra). A dica fecha-se com Esc sem mexer no rato nem no foco (WCAG 1.4.13) e volta na
  // amostra seguinte.
  $$('[data-cores]').forEach((f) => {
    const nome = $('[data-cor-nome]', f);
    const mostrar = () => {
      const r = $('input[name="cor"]:checked', f);
      nome.textContent = r ? `· ${r.value} ${r.dataset.nome}` : '';
    };
    f.addEventListener('change', mostrar);
    mostrar();
    let sobre = null;
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') f.classList.add('cores--sem-dica'); });
    f.addEventListener('pointerover', (e) => {
      const c = e.target.closest('.cor');
      if (c !== sobre) { sobre = c; f.classList.remove('cores--sem-dica'); }
    });
    f.addEventListener('focusin', () => f.classList.remove('cores--sem-dica'));
  });

  // ---------------------------------------------------------------- datas sem dias passados
  // A data da peça e a da celebração: o calendário não oferece dias que já passaram.
  $$('input[type="date"][data-sem-passado], input[name="dataCelebracao"]').forEach((i) => { i.min = hojeLisboa(); });

  // ---------------------------------------------------------------- juntar ao carrinho
  $$('form[data-comprar]').forEach((form) => {
    const slug = form.dataset.comprar;
    const minimo = Number(form.dataset.minimo) || 1;
    const erro = $('[data-erro]', form);
    const total = $('[data-total]', form);
    const escolhas = () => $$('[data-escolha]', form).map((f) => Number(($('input:checked', f) || {}).value || 0));
    const quantidade = () => Math.min(999, Math.max(minimo, parseInt(form.elements.quantidade.value, 10) || minimo));
    const mostrarTotal = async () => {
      if (!window.MimicesCarrinho) return;
      const t = await window.MimicesCarrinho.totalDe({ produto: slug, opcoes: escolhas(), qtd: quantidade() });
      total.textContent = t ? `Total: ${t}` : '';
    };
    form.addEventListener('input', mostrarTotal);
    form.addEventListener('change', mostrarTotal);
    mostrarTotal();
    /* O aviso das peças personalizadas aparece quando se escreve um nome, uma data ou uma frase (o Renato,
       8 nov 2026); o carrinho volta a dizê-lo antes do botão. */
    const avisoPers = $('[data-aviso-ao-escrever]', form);
    const pintarAviso = () => { if (avisoPers) avisoPers.hidden = !$$('.personaliza input, .personaliza textarea', form).some((c) => String(c.value || '').trim() !== ''); };
    form.addEventListener('input', pintarAviso);
    form.addEventListener('change', pintarAviso);
    pintarAviso();
    /* A frase do erro aparece junto ao campo que falta (o tom, uma escolha, o nome…): por baixo do
       botão ficava fora do ecrã, porque a página salta para o campo. */
    const errar = (campo, texto) => {
      erro.textContent = texto;
      const sitio = campo && campo.closest('.campo');
      if (sitio) sitio.append(erro);
      erro.hidden = false;
      if (campo) { campo.setAttribute('aria-invalid', 'true'); campo.focus(); }
    };
    form.addEventListener('input', (e) => { if (e.target.hasAttribute('aria-invalid')) e.target.removeAttribute('aria-invalid'); erro.hidden = true; });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      erro.hidden = true;
      $$('[aria-invalid]', form).forEach((i) => i.removeAttribute('aria-invalid'));
      const cores = $('[data-cores]', form);
      const cor = cores ? $('input[name="cor"]:checked', cores) : null;
      if (cores && !cor) { errar($('input[name="cor"]', cores), 'Escolha o tom de linho.'); return; }
      for (const f of $$('[data-escolha]', form)) {
        if (!$('input:checked', f)) { errar($('input', f), `Falta escolher: ${$('legend', f).textContent.trim()}.`); return; }
      }
      const pers = {};
      for (const k of ['nome', 'data', 'frase']) {
        const i = form.elements[k];
        if (!i) continue;
        const v = i.value.trim();
        if (i.required && !v) { errar(i, k === 'data' ? 'Escolha a data que vai na peça.' : `Escreva o ${$(`label[for="${i.id}"]`, form).textContent.trim().toLowerCase()} como quer que fique na peça.`); return; }
        if (k === 'data' && v && v < hojeLisboa()) { errar(i, 'Essa data já passou: escolha a data da celebração.'); return; }
        if (v) pers[k] = v;
      }
      const q = quantidade();
      if ((parseInt(form.elements.quantidade.value, 10) || 0) < minimo) form.elements.quantidade.value = minimo;
      await window.MimicesCarrinho.juntar({ produto: slug, cor: cor ? Number(cor.value) : null, opcoes: escolhas(), pers, qtd: q });
      for (const k of ['nome', 'data', 'frase']) if (form.elements[k]) form.elements[k].value = '';
      pintarAviso();
      form.elements.quantidade.value = minimo;
      mostrarTotal();
      abrir('carrinho', $('button[type="submit"]', form));
    });
  });
})();
