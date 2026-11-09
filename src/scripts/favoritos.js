/* Dream Art — os favoritos: o coração dos cartões e da ficha guarda a peça no browser
   («dreamart:favoritos», uma lista de endereços de artigos), e a página /favoritos/ desenha-as a
   partir do catálogo. Com favoritos guardados, o coração do cabeçalho fica cheio. */
(function () {
  'use strict';
  const { $, $$, esc, ico, guardado, catalogo, imagemHtml, precoHtml } = window.DA;
  const CHAVE = 'dreamart:favoritos';
  const ler = () => { const l = guardado.ler(CHAVE, []); return Array.isArray(l) ? l.filter((s) => typeof s === 'string') : []; };
  let lista = ler();

  function pintar() {
    const tem = new Set(lista);
    $$('[data-fav]').forEach((b) => b.setAttribute('aria-pressed', tem.has(b.dataset.fav) ? 'true' : 'false'));
    const topo = $('#favoritos-topo');
    if (topo) {
      topo.classList.toggle('tem-favoritos', lista.length > 0);
      topo.setAttribute('aria-label', lista.length ? `Favoritos: ${lista.length}` : 'Favoritos');
    }
  }

  /* O mesmo cartão do gerador (componentes.mjs, cartao): mudar um é mudar o outro. */
  const TAMANHOS = '(min-width: 1296px) 266px, (min-width: 1024px) calc(25vw - 58px), (min-width: 640px) calc(33.3vw - 49px), calc(50vw - 38px)';
  function cartaoHtml(cat, slug, p) {
    const nome = esc(p.nome);
    return `<li class="artigo" data-cartao="${esc(slug)}">
  <div class="artigo__foto">${imagemHtml(cat, p.img, { tamanhos: TAMANHOS, moldura: 1 })}
    <button class="artigo__fav" type="button" aria-pressed="true" data-fav="${esc(slug)}" aria-label="Guardar nos favoritos: ${nome}">${ico('coracao')}</button>
    <button class="artigo__mais" type="button" data-juntar="${esc(slug)}" aria-label="Juntar à encomenda: ${nome}">${ico('mais')}</button>
  </div>
  <div class="artigo__info">
    <h2 class="artigo__nome"><a href="${esc(p.url)}">${nome}</a></h2>
    ${precoHtml(p, 'artigo__preco')}
  </div>
</li>`;
  }

  const grelha = $('[data-favoritos-lista]');
  const vazio = $('[data-favoritos-vazio]');
  async function desenharPagina() {
    if (!grelha) return;
    let cat;
    try { cat = await catalogo(); } catch (_) { vazio.hidden = false; return; }
    // os mais recentes primeiro; as peças que saíram da loja não aparecem
    const slugs = lista.slice().reverse().filter((s) => cat.produtos[s]);
    grelha.innerHTML = slugs.map((s) => cartaoHtml(cat, s, cat.produtos[s])).join('');
    grelha.hidden = !slugs.length;
    vazio.hidden = slugs.length > 0;
    pintar();
  }

  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-fav]');
    if (!b) return;
    const slug = b.dataset.fav;
    const marcado = !lista.includes(slug);
    lista = marcado ? [...lista.filter((s) => s !== slug), slug] : lista.filter((s) => s !== slug);
    guardado.gravar(CHAVE, lista);
    pintar();
    b.classList.remove('is-pulo'); void b.offsetWidth; b.classList.add('is-pulo');
    // na página dos favoritos, a peça desmarcada sai da grelha
    if (!marcado && grelha && grelha.contains(b)) {
      const li = b.closest('[data-cartao]');
      const seguinte = li && (li.nextElementSibling || li.previousElementSibling);
      if (li) li.remove();
      if (!$('[data-cartao]', grelha)) { grelha.hidden = true; vazio.hidden = false; }
      const foco = seguinte ? $('.artigo__nome a', seguinte) : $('.botao', vazio);
      if (foco) foco.focus();
    }
  });
  window.addEventListener('storage', (ev) => { if (ev.key === CHAVE) { lista = ler(); pintar(); desenharPagina(); } });
  window.addEventListener('pageshow', (ev) => { if (ev.persisted) { lista = ler(); pintar(); desenharPagina(); } });

  window.DA.favoritos = { pintar };
  pintar();
  desenharPagina();
})();
