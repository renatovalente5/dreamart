/* Dream Art — a loja: as pastilhas mudam de separador sem sair do sítio. O painel (o título, o
   texto e os artigos) vem da página desse separador, a mesma que o Google lê e que se abre num
   separador novo do browser; só ele muda, e a página não sobe. O endereço muda com o painel, e o
   «voltar» do browser volta ao separador de antes. Sem JavaScript, ou se o pedido falhar, a
   ligação abre a página como sempre. */
(function () {
  'use strict';
  const { $, $$, menosMovimento } = window.DA;
  const fila = $('.pastilhas');
  const painel = $('[data-loja-painel]');
  if (!fila || !painel || !window.fetch || !window.DOMParser || !window.history.pushState) return;
  const anuncio = $('[data-loja-anuncio]');

  const caminhoDe = (url) => new URL(url, location.href).pathname;
  const ligacaoDe = (ev) => {
    const a = ev.target.closest ? ev.target.closest('a[href]') : null;
    return a && fila.contains(a) && a.origin === location.origin ? a : null;
  };
  const daLoja = (caminho) => $$('a[href]', fila).some((a) => caminhoDe(a.href) === caminho);
  let atual = location.pathname;

  /* As páginas dos separadores, pedidas uma vez: ao passar o rato, ao tocar ou ao chegar pelo
     teclado, para a troca ser imediata no clique. */
  const pedidos = new Map();
  function pedir(caminho) {
    if (!pedidos.has(caminho)) {
      const p = fetch(caminho, { credentials: 'same-origin' })
        .then((r) => { if (!r.ok) throw new Error(`loja ${r.status}`); return r.text(); })
        .then((t) => new DOMParser().parseFromString(t, 'text/html'));
      p.catch(() => pedidos.delete(caminho));
      pedidos.set(caminho, p);
    }
    return pedidos.get(caminho);
  }
  const antecipar = (ev) => { const a = ligacaoDe(ev); if (a) pedir(caminhoDe(a.href)).catch(() => {}); };
  fila.addEventListener('pointerover', antecipar);
  fila.addEventListener('touchstart', antecipar, { passive: true });
  fila.addEventListener('focusin', antecipar);

  /* A página em que se está, nas pastilhas e no menu. */
  function marcar(caminho) {
    [fila, $('#gaveta')].filter(Boolean).forEach((raiz) => $$('a[href]', raiz).forEach((a) => {
      if (caminhoDe(a.href) === caminho) a.setAttribute('aria-current', 'page');
      else if (a.getAttribute('aria-current') === 'page') a.removeAttribute('aria-current');
    }));
  }

  /* No telemóvel, a pastilha escolhida fica inteira à vista na fila. */
  function revelar(a) {
    const ul = $('ul', fila);
    if (!ul || ul.scrollWidth <= ul.clientWidth) return;
    const r = a.getBoundingClientRect();
    const f = ul.getBoundingClientRect();
    const d = r.left < f.left + 16 ? r.left - f.left - 16 : r.right > f.right - 16 ? r.right - f.right + 16 : 0;
    if (d) ul.scrollBy({ left: d, behavior: menosMovimento.matches ? 'auto' : 'smooth' });
  }

  /* A troca. Espera um pouco pelas primeiras fotografias (no máximo 350 ms), para não aparecerem
     os quadrados vazios; com dois cliques seguidos, vale o último. */
  let vez = 0;
  async function mostrar(url, { voltar = false } = {}) {
    const minha = ++vez;
    const caminho = caminhoDe(url);
    let novo;
    try {
      novo = (await pedir(caminho)).querySelector('[data-loja-painel]');
      if (!novo) throw new Error('loja: a página não tem o painel');
    } catch (_) {
      if (minha === vez) { if (voltar) location.reload(); else location.assign(url); }
      return;
    }
    const doc = novo.ownerDocument;
    const entra = document.importNode(novo, true);
    const fotos = $$('img', entra).filter((i) => i.getAttribute('loading') !== 'lazy').slice(0, 8);
    await Promise.race([
      Promise.all(fotos.map((i) => (i.decode ? i.decode().catch(() => {}) : null))),
      new Promise((r) => { window.setTimeout(r, 350); }),
    ]);
    if (minha !== vez) return;
    if (!voltar) history.pushState({ loja: caminho }, '', url);
    atual = caminho;
    painel.replaceChildren(...entra.childNodes);
    document.title = doc.title;
    marcar(caminho);
    if (window.DA.favoritos) window.DA.favoritos.pintar();
    if (anuncio) {
      const h = $('h1', painel);
      const n = $$('.artigo', painel).length;
      anuncio.textContent = `${h ? h.textContent : ''}: ${n} ${n === 1 ? 'peça' : 'peças'}`;
    }
    painel.classList.remove('is-novo');
    void painel.offsetWidth;
    painel.classList.add('is-novo');
  }

  fila.addEventListener('click', (ev) => {
    const a = ligacaoDe(ev);
    if (!a || ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    ev.preventDefault();
    revelar(a);
    if (caminhoDe(a.href) !== atual) mostrar(a.href);
  });
  // o «voltar» e o «avançar» do browser (só entre separadores; um # não muda de separador)
  window.addEventListener('popstate', () => {
    if (location.pathname !== atual && daLoja(location.pathname)) mostrar(location.href, { voltar: true });
  });
})();
