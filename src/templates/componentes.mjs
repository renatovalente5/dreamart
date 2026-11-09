// As peças que se repetem: fotografias, o logótipo, o medalhão, preços, cartões de artigo, as
// pastilhas dos separadores, as cabeças das páginas e as peças legais comuns.
import { esc, euros, precoDe, dataPorExtenso } from './util.mjs';
import { ico, arco } from './icones.mjs';
import { temSuplementos, quantidadeMinimaDe } from '../lib/regras.mjs';
import { livroReclamacoes, VERSAO as LEGAL_COMUM_VERSAO } from '../../legal-comum/index.mjs';

/* AS PEÇAS DA BIBLIOTECA legal-comum (a cópia está em legal-comum/; não se edita aqui), entre os
   marcadores que o verificar-versoes.mjs dela procura nas páginas publicadas:
   <!-- legal-comum:<peça> v<versão> --> … <!-- /legal-comum:<peça> --> */
export const pecaLegal = (nome, html) => `<!-- legal-comum:${nome} v${LEGAL_COMUM_VERSAO} -->${html}<!-- /legal-comum:${nome} -->`;

/* O Livro de Reclamações Eletrónico na variante DISCRETA da biblioteca (ícone e texto, a letra e a cor
   das ligações vizinhas, sem caixa), e só no rodapé (o Renato, 22 e 27 out 2026). */
export const livroBotao = () => pecaLegal('livro', livroReclamacoes());

// ---------------------------------------------------------------- fotografias
/** O endereço de uma versão web de uma fotografia (scripts/imagens.py). */
export function urlFoto(ctx, nome, largura, fmt = 'webp') {
  const m = ctx.manifesto.fotos[nome] || ctx.manifesto.posters[nome];
  const w = largura ?? m.larguras[m.larguras.length - 1];
  return ctx.asset(`img/${nome}-${m.resumo}-${w}.${fmt}`);
}
/** A versão mais pequena que ainda chega a «px» píxeis (ou a maior que há: nunca se aumenta). */
export function larguraPara(ctx, nome, px) {
  const m = ctx.manifesto.fotos[nome] || ctx.manifesto.posters[nome];
  return m.larguras.find((w) => w >= px) || m.larguras[m.larguras.length - 1];
}

/* O sizes de uma fotografia cortada numa moldura (object-fit: cover): uma fotografia mais larga do que a
   moldura mostra-se mais larga do que a caixa (os lados ficam de fora) e precisa de mais píxeis — sem
   isto, uma fotografia deitada num círculo vinha da versão pequena e ficava esborratada. */
export function escalarSizes(sizes, f) {
  if (!(f > 1.01)) return sizes;
  const partes = [];
  let fundo = 0;
  let atual = '';
  for (const ch of sizes) {
    if (ch === '(') fundo++;
    if (ch === ')') fundo--;
    if (ch === ',' && fundo === 0) { partes.push(atual.trim()); atual = ''; } else atual += ch;
  }
  partes.push(atual.trim());
  const k = f.toFixed(3);
  return partes.map((x) => {
    const m = /^(\([^()]*\))\s+(.+)$/.exec(x);
    return m ? `${m[1]} calc(${m[2]} * ${k})` : `calc(${x} * ${k})`;
  }).join(', ');
}

/* <picture> com AVIF e WebP em várias larguras (só as que a fotografia tem: o imagens.py nunca
   aumenta). «tamanhos» é o atributo sizes, MEDIDO no browser (a largura a que a fotografia aparece):
   é com ele que o browser escolhe a versão. Fora do primeiro ecrã, loading="lazy". O ponto de foco
   (content/fotos.json) diz onde se corta quando a moldura é de outra forma. */
export function imagem(ctx, nome, { tamanhos = '100vw', classe = '', prioridade = false, alt, foco, ate = Infinity, baixa = false, moldura = 0, cedo = false } = {}) {
  const m = ctx.manifesto.fotos[nome] || ctx.manifesto.posters[nome];
  if (!m) throw new Error(`imagem «${nome}» não existe em media/fotos`);
  // «moldura»: a forma (largura/altura) da caixa onde a fotografia é cortada
  if (moldura) tamanhos = escalarSizes(tamanhos, (m.largura / m.altura) / moldura);
  const info = ctx.fotos[nome] || {};
  const texto = alt ?? info.alt ?? '';
  const ponto = foco ?? info.foco ?? '50% 50%';
  // «ate»: a maior largura que pode fazer falta naquele sítio (um círculo de 46 px não precisa da de 2048)
  const larguras = m.larguras.filter((w, i) => w <= ate || i === 0 || m.larguras[i - 1] < ate);
  const srcset = (fmt) => larguras.map((w) => `${ctx.asset(`img/${nome}-${m.resumo}-${w}.${fmt}`)} ${w}w`).join(', ');
  const fontes = m.formatos.filter((f) => f !== 'webp').map((f) => `<source type="image/${f}" srcset="${srcset(f)}" sizes="${tamanhos}">`).join('');
  const meio = larguras.find((w) => w >= 720) || larguras[larguras.length - 1];
  const estilo = ponto !== '50% 50%' ? ` style="object-position:${esc(ponto)}"` : '';
  // no primeiro ecrã, sem «lazy» (prioridade: a fotografia principal; cedo: a primeira fila de uma grelha)
  const carga = prioridade ? ' fetchpriority="high"' : baixa ? ' fetchpriority="low"' : cedo ? '' : ' loading="lazy"';
  return `<picture${classe ? ` class="${esc(classe)}"` : ''}>${fontes}<img src="${ctx.asset(`img/${nome}-${m.resumo}-${meio}.webp`)}" srcset="${srcset('webp')}" sizes="${tamanhos}" width="${m.largura}" height="${m.altura}" alt="${esc(texto)}"${carga} decoding="async"${estilo}></picture>`;
}

/* Uma fotografia pequena e redonda (a gaveta, a procura, as linhas da encomenda): só a versão de 360. */
export function miniatura(ctx, nome, { lado = 46, classe = '' } = {}) {
  const m = ctx.manifesto.fotos[nome];
  const ponto = ctx.fotos[nome]?.foco || '50% 50%';
  return `<img${classe ? ` class="${esc(classe)}"` : ''} src="${urlFoto(ctx, nome, m.larguras[0])}" width="${lado}" height="${lado}" alt="" loading="lazy" decoding="async"${ponto !== '50% 50%' ? ` style="object-position:${esc(ponto)}"` : ''}>`;
}

/* O medalhão: a fotografia num círculo com o arco fino dourado por baixo, como o círculo do logótipo. */
export function medalhao(ctx, nome, { tamanhos, prioridade = false, baixa = false, alt, ate, etiqueta = 'figure', classe = '' } = {}) {
  return `<${etiqueta} class="medalhao${classe ? ` ${classe}` : ''}">${imagem(ctx, nome, { tamanhos, prioridade, baixa, alt, ate, moldura: 1 })}</${etiqueta}>`;
}

// ---------------------------------------------------------------- o logótipo
/* O logótipo da cliente, tal e qual (media/marca/logo.png, só recortado em círculo), nas versões
   pequenas do imagens.py (64/128/192/256 px): nunca o PNG de 435 KB. «lado» é o tamanho em CSS. */
export function logotipo(ctx, { lado = 72, classe = '', alt = '', prioridade = false, preguica = true } = {}) {
  const l = ctx.manifesto.logo;
  const alturas = Object.keys(l.altura).map(Number).sort((a, b) => a - b);
  const src = l.altura[alturas.find((h) => h >= lado * 2) || alturas[alturas.length - 1]];
  const srcset = alturas.map((h) => `${ctx.asset(`img/${l.altura[h].webp}`)} ${h}w`).join(', ');
  const carga = prioridade ? ' fetchpriority="high"' : preguica ? ' loading="lazy"' : '';
  return `<img${classe ? ` class="${esc(classe)}"` : ''} src="${ctx.asset(`img/${src.webp}`)}" srcset="${srcset}" sizes="${lado}px" width="${lado}" height="${lado}" alt="${esc(alt)}"${carga} decoding="async">`;
}

// ---------------------------------------------------------------- preços
/* As categorias que se vendem às unidades (lembranças, convites, menus): o preço da ficha diz
   «/ unidade», para se perceber que a quantidade multiplica. Os slugs dos separadores são fixos
   (content/categorias.json: só o Renato os muda). */
const POR_UNIDADE = new Set(['lembrancas', 'convites', 'menus-e-mesas']);
export const porUnidade = (p) => POR_UNIDADE.has(p.categoria) || quantidadeMinimaDe(p) > 1;

/* O preço como se mostra: o de hoje, e o anterior riscado quando há promoção. «Desde» quando uma
   escolha pode fazer o preço subir. Sem preço (ainda não dito): «Preço por confirmar» (no domínio
   aberto o artigo nem chega aqui: as regras escondem-no). */
export function preco(ctx, p, { classe = 'preco', unidade = false } = {}) {
  const v = precoDe(p, ctx.hoje);
  if (v.atual === null) return `<p class="${classe} ${classe}--confirmar">Preço por confirmar</p>`;
  const desde = temSuplementos(p) ? '<span class="preco__desde">Desde </span>' : '';
  const un = unidade && porUnidade(p) ? '<span class="preco__un"> / unidade</span>' : '';
  const atual = `${desde}<span class="preco__valor">${euros(v.atual)}</span>${un}`;
  if (!v.anterior) return `<p class="${classe}">${atual}</p>`;
  return `<p class="${classe} ${classe}--promocao">${atual} <s class="preco__antes"><span class="so-leitor">em vez de </span>${euros(v.anterior)}</s></p>`;
}

/* A nota legal da promoção, por baixo do preço da ficha (DL 70/2007, art. 5.º): o período e o preço
   mais baixo dos 30 dias anteriores ao início — que é, por lei, o preço riscado. Só com a data de
   início (promocaoDesde); sem ela, as regras lembram-na no painel. */
export function promocaoNota(ctx, p) {
  const v = precoDe(p, ctx.hoje);
  const desde = typeof p.promocaoDesde === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.promocaoDesde) ? p.promocaoDesde : '';
  if (!v.anterior || !v.ate || !desde) return '';
  const mesmoAno = desde.slice(0, 4) === v.ate.slice(0, 4);
  return `<p class="ficha__promocao">Promoção de ${dataPorExtenso(desde, !mesmoAno)} a ${dataPorExtenso(v.ate, true)} · preço mais baixo nos 30 dias anteriores: ${euros(v.anterior)}</p>`;
}

// ---------------------------------------------------------------- cartões de artigo
/* O cartão de um artigo (o da proposta A): a fotografia num quadrado de cantos redondos, o coração
   (favoritos) e o «+» (juntar à encomenda) por cima dela, o nome e o preço. O cartão inteiro leva à
   ficha: a ligação do nome estende-se por cima dele (::after), e os dois botões ficam à frente.
   Sem JavaScript, os botões não aparecem (o CSS, com html:not(.js)). O site.js desenha o mesmo
   cartão nos favoritos (cartaoHtml): mudar um é mudar o outro. */
export const TAMANHOS_CARTAO = '(min-width: 1296px) 266px, (min-width: 1024px) calc(25vw - 58px), (min-width: 640px) calc(33.3vw - 49px), calc(50vw - 38px)';
export function cartao(ctx, p, { titulo = 'h3', tamanhos = TAMANHOS_CARTAO, prioridade = false, cedo = false } = {}) {
  const v = precoDe(p, ctx.hoje);
  const pct = v.anterior && v.atual !== null ? Math.round((1 - v.atual / v.anterior) * 100) : 0;
  const nome = esc(p.nome);
  return `<li class="artigo">
  <div class="artigo__foto">${imagem(ctx, p.fotos[0], { tamanhos, prioridade, cedo, ate: 1280, moldura: 1 })}${pct ? `<span class="selo">−${pct}%</span>` : p.novidade ? '<span class="selo">Novidade</span>' : ''}
    <button class="artigo__fav" type="button" aria-pressed="false" data-fav="${esc(p.slug)}" aria-label="Guardar nos favoritos: ${nome}">${ico('coracao')}</button>
    <button class="artigo__mais" type="button" data-juntar="${esc(p.slug)}" aria-label="Juntar à encomenda: ${nome}">${ico('mais')}</button>
  </div>
  <div class="artigo__info">
    <${titulo} class="artigo__nome"><a href="${ctx.url(`/produtos/${p.slug}/`)}">${nome}</a></${titulo}>
    ${preco(ctx, p, { classe: 'artigo__preco' })}
  </div>
</li>`;
}
/* «cedo»: quantos cartões, do princípio, estão no primeiro ecrã (sem «lazy»). */
export const grelha = (ctx, lista, { cedo = 0, ...opcoes } = {}) => `<ul class="grelha-artigos" role="list">${lista.map((p, i) => cartao(ctx, p, { ...opcoes, cedo: i < cedo })).join('\n')}</ul>`;

// ---------------------------------------------------------------- separadores
/* Os separadores que têm artigos (os vazios — hoje Padrinhos e Decoração e eventos — não aparecem
   em lado nenhum até terem artigos). */
export const separadoresComArtigos = (ctx) => ctx.categorias.filter((c) => ctx.produtos.some((p) => p.categoria === c.slug));
export const nomeDoSeparador = (c) => c.nomeMenu || c.nome;

/* As pastilhas da loja: «Tudo» e cada separador; a página em que se está fica marcada. */
export function pastilhas(ctx, atual = '') {
  const itens = [{ caminho: '/loja/', nome: 'Tudo' }, ...separadoresComArtigos(ctx).map((c) => ({ caminho: `/loja/${c.slug}/`, nome: nomeDoSeparador(c) }))];
  return `<nav class="pastilhas" aria-label="Separadores"><ul role="list">${itens.map((i) => `<li><a href="${ctx.url(i.caminho)}"${i.caminho === atual ? ' aria-current="page"' : ''}>${esc(i.nome)}</a></li>`).join('')}</ul></nav>`;
}

/* Os separadores em círculos (página inicial e página que não existe), com o arco dourado. */
export function circulos(ctx, { titulo = 'h3' } = {}) {
  const lista = separadoresComArtigos(ctx);
  const n = lista.length;
  // quantos por linha: no tablet três (dois com quatro), no computador todos até seis (com mais, duas linhas)
  const tablet = n <= 3 ? n : n === 4 ? 2 : 3;
  const computador = n <= 6 ? n : Math.ceil(n / 2);
  return `<ul class="circulos" role="list" style="--c-tab:${tablet};--c-desk:${computador}">${lista.map((c) => `<li class="circulo">
    <a class="circulo__ligacao" href="${ctx.url(`/loja/${c.slug}/`)}">
      ${medalhao(ctx, c.foto, { tamanhos: '(min-width: 640px) 168px, 132px', alt: '', etiqueta: 'span', ate: 540 })}
      <${titulo} class="circulo__nome">${esc(nomeDoSeparador(c))}</${titulo}>
    </a>
  </li>`).join('\n')}</ul>`;
}

// ---------------------------------------------------------------- cabeças
/* A cabeça de uma secção: o título em EB Garamond e o arco dourado por baixo (e uma frase, se houver). */
export function cabecaSeccao({ id, titulo, texto = '', etiqueta = 'h2', classe = '' }) {
  return `<div class="cabeca${classe ? ` ${classe}` : ''}">
  <${etiqueta} class="titulo-secao" id="${id}">${esc(titulo)}</${etiqueta}>
  ${arco()}
  ${texto ? `<p class="cabeca__sub">${esc(texto)}</p>` : ''}
</div>`;
}

/* A cabeça de uma página: um rótulo pequeno (o caminho de volta), o título em EB Garamond, o arco dourado e
   uma frase curta; nas páginas legais, a data. Com «foto», o medalhão por cima (os separadores). */
export function cabecaDePagina(ctx, { rotulo = null, titulo, sub = '', data = '', foto = '', extra = '' }) {
  const r = rotulo ? `<a class="cabeca-pagina__rotulo rotulo" href="${ctx.url(rotulo.caminho)}">${ico('voltar')}<span>${esc(rotulo.nome)}</span></a>` : '';
  return `<header class="cabeca-pagina${foto ? ' cabeca-pagina--foto' : ''}">
  <div class="contentor cabeca-pagina__dentro">
    ${foto ? medalhao(ctx, foto, { tamanhos: '(min-width: 900px) 200px, 148px', prioridade: true, alt: '', ate: 540 }) : ''}
    <div class="cabeca-pagina__texto">
      ${r}
      <h1 class="titulo-pagina">${esc(titulo)}</h1>
      ${arco()}
      ${sub ? `<div class="cabeca-pagina__sub">${sub}</div>` : ''}
      ${data ? `<p class="cabeca-pagina__data">${esc(data)}</p>` : ''}
      ${extra}
    </div>
  </div>
</header>`;
}

// ---------------------------------------------------------------- JSON-LD
export function migalhasLd(ctx, itens) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: itens.map((i, n) => ({ '@type': 'ListItem', position: n + 1, name: i.nome, item: ctx.absoluto(i.caminho) })),
  };
}

// ---------------------------------------------------------------- botões
export function botao(href, texto, { classe = 'botao botao--verde', icone = 'seta', externo = false, antes = false } = {}) {
  const i = icone ? ico(icone) : '';
  return `<a class="${classe}" href="${esc(href)}"${externo ? ' target="_blank" rel="noopener"' : ''}>${antes ? i : ''}<span>${esc(texto)}</span>${antes ? '' : i}</a>`;
}
