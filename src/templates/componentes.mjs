// Peças repetidas: imagens, preços, cartões de artigo, amostras de cor, migalhas, botões, e as peças legais comuns.
import { esc, euros, precoDe, dataPorExtenso } from './util.mjs';
import { icones } from './icones.mjs';
import { temSuplementos } from '../lib/regras.mjs';
import { livroReclamacoes, VERSAO as LEGAL_COMUM_VERSAO } from '../../legal-comum/index.mjs';

/* AS PEÇAS DA BIBLIOTECA legal-comum (a cópia está em legal-comum/, instalada por
   _ferramentas/legal-comum/instalar.mjs; não se edita aqui), entre os marcadores que o
   verificar-versoes.mjs dela procura nas páginas publicadas:
   <!-- legal-comum:<peça> v<versão> --> … <!-- /legal-comum:<peça> --> (22 out 2026, grupo 1 da auditoria legal). */
export const pecaLegal = (nome, html) => `<!-- legal-comum:${nome} v${LEGAL_COMUM_VERSAO} -->${html}<!-- /legal-comum:${nome} -->`;

/* A ligação ao Livro de Reclamações Electrónico, com o ícone (DL 156/2005, art. 5.º-B, n.º 2: «em local
   visível e de forma destacada»), na variante DISCRETA da biblioteca (o Renato, 22 out 2026: nada de botão
   com caixa): a letra, o tamanho e a cor das ligações vizinhas, nunca mais pequena nem esbatida. No rodapé
   de todas as páginas, na linha das ligações legais, e nos Contactos; o CSS (livroCss) vai na folha de
   estilos na construção. */
export const livroBotao = () => pecaLegal('livro', livroReclamacoes());

/* A nota legal da promoção, por baixo do preço da ficha (DL 70/2007, art. 5.º): o período e o preço mais
   baixo dos 30 dias anteriores ao início — que é, por lei, o preço riscado. Só com a data de início
   (promocaoDesde); sem ela, as regras lembram a data no painel. */
export function promocaoNota(ctx, p) {
  const v = precoDe(p, ctx.hoje);
  const desde = typeof p.promocaoDesde === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.promocaoDesde) ? p.promocaoDesde : '';
  if (!v.anterior || !v.ate || !desde) return '';
  const mesmoAno = desde.slice(0, 4) === v.ate.slice(0, 4);
  return `<p class="preco__promocao">Promoção de ${dataPorExtenso(desde, !mesmoAno)} a ${dataPorExtenso(v.ate, true)} · preço mais baixo nos 30 dias anteriores: ${euros(v.anterior)}</p>`;
}

// <picture> com AVIF + WebP em várias larguras. «tamanhos» é o atributo sizes: diz ao browser
// a largura em que a imagem vai aparecer, para escolher a versão certa.
export function imagem(ctx, nome, { tamanhos = '100vw', classe = '', prioridade = false, alt, foco, proporcao } = {}) {
  const m = ctx.manifesto.fotos[nome] || ctx.manifesto.posters[nome];
  if (!m) throw new Error(`imagem «${nome}» não existe em media/fotos (nem é a capa de um vídeo)`);
  const info = ctx.fotos[nome] || {};
  const texto = alt ?? info.alt ?? '';
  const ponto = foco ?? info.foco ?? '50% 50%';
  const srcset = (fmt) => m.larguras.map((w) => `${ctx.asset(`img/${nome}-${m.resumo}-${w}.${fmt}`)} ${w}w`).join(', ');
  const fontes = m.formatos.filter((f) => f !== 'webp').map((f) => `<source type="image/${f}" srcset="${srcset(f)}" sizes="${tamanhos}">`).join('');
  const meio = m.larguras.find((w) => w >= 720) || m.larguras[m.larguras.length - 1];
  const estilo = [ponto !== '50% 50%' ? `object-position:${ponto}` : '', proporcao ? `aspect-ratio:${proporcao}` : ''].filter(Boolean).join(';');
  return `<picture class="${esc(classe)}">${fontes}<img src="${ctx.asset(`img/${nome}-${m.resumo}-${meio}.webp`)}" srcset="${srcset('webp')}" sizes="${tamanhos}" width="${m.largura}" height="${m.altura}" alt="${esc(texto)}"${prioridade ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async"${estilo ? ` style="${estilo}"` : ''}></picture>`;
}

// O preço como se mostra: o de hoje, e o anterior riscado quando há promoção. «Desde» quando
// uma escolha pode fazer o preço subir. Sem preço (ainda não dito pela Mimices): na
// pré-visualização, a marca «por confirmar» (no domínio o artigo nem chega aqui: está escondido).
export function preco(ctx, p, { grande = false } = {}) {
  const v = precoDe(p, ctx.hoje);
  const classe = `preco${grande ? ' preco--grande' : ''}`;
  if (v.atual === null) return `<p class="${classe} preco--por-confirmar">Preço por confirmar</p>`;
  const desde = temSuplementos(p) ? '<span class="preco__desde">Desde </span>' : '';
  const unidade = (p.quantidadeMinima || 1) > 1 ? '<span class="preco__unidade"> / unidade</span>' : '';
  const atual = `<span class="preco__atual">${desde}${euros(v.atual)}${unidade}</span>`;
  if (!v.anterior) return `<p class="${classe}">${atual}</p>`;
  return `<p class="${classe} preco--promocao">${atual} <s class="preco__antes"><span class="visualmente-escondido">em vez de </span>${euros(v.anterior)}</s></p>`;
}

export function desconto(ctx, p) {
  const v = precoDe(p, ctx.hoje);
  if (!v.anterior || v.atual === null) return '';
  return Math.round((1 - v.atual / v.anterior) * 100);
}

export function promocaoAte(ctx, p) {
  const v = precoDe(p, ctx.hoje);
  return v.anterior && v.ate ? `Promoção até ${dataPorExtenso(v.ate)}` : '';
}

// Cartão de artigo: a fotografia (3:4, cortada pelo ponto de foco), o nome e o preço — só isso (16
// out 2026: as bolinhas dos 14 tons repetiam-se iguais em todos os cartões; os tons escolhem-se na
// ficha). O cartão inteiro leva ao artigo (a ligação do nome estende-se por cima dele com ::after —
// nunca display:contents, que tira o foco do teclado).
export function cartaoProduto(ctx, p, { tamanhos = '(min-width: 1100px) 22vw, (min-width: 700px) 30vw, 46vw', titulo = 'h3' } = {}) {
  const pct = desconto(ctx, p);
  const segunda = p.fotos[1];
  return `<article class="cartao">
  <div class="cartao__foto">${imagem(ctx, p.fotos[0], { tamanhos, classe: 'cartao__img' })}${segunda ? imagem(ctx, segunda, { tamanhos, classe: 'cartao__img cartao__img--outra', alt: '' }) : ''}${pct ? `<span class="selo selo--promocao">−${pct}%</span>` : ''}${p.novidade ? '<span class="selo selo--novidade">Novidade</span>' : ''}</div>
  <${titulo} class="cartao__nome"><a class="cartao__ligacao" href="${ctx.url(`/produtos/${p.slug}/`)}">${esc(p.nome)}</a></${titulo}>
  ${preco(ctx, p)}
</article>`;
}

export function migalhas(ctx, itens) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: itens.map((i, n) => ({ '@type': 'ListItem', position: n + 1, name: i.nome, item: ctx.absoluto(i.caminho) })),
  };
  const html = `<nav class="migalhas" aria-label="Está aqui"><ol>${itens
    .map((i, n) => (n === itens.length - 1 ? `<li><span aria-current="page">${esc(i.nome)}</span></li>` : `<li><a href="${ctx.url(i.caminho)}">${esc(i.nome)}</a></li>`))
    .join('')}</ol></nav>`;
  return { html, ld };
}

// Botão-ligação com uma seta discreta à direita
export function botaoSeta(href, texto, { classe = 'botao botao--contorno', externo = false } = {}) {
  return `<a class="${classe}" href="${esc(href)}"${externo ? ' target="_blank" rel="noopener"' : ''}><span>${esc(texto)}</span>${icones.seta}</a>`;
}

/* A CABEÇA DAS PÁGINAS (17 out 2026, na linguagem da marca): as migalhas, o título numa mancha rosa
   (como o nome no logótipo), um subtítulo curto — ou, nas páginas legais, a data — e o laço entre
   pespontos. Ao centro. */
export function cabecaDePagina(ctx, { migalhas = '', titulo, sub = '', data = '', extra = '' }) {
  return `<header class="cabeca">
  ${migalhas}
  <h1 class="titulo-pagina"><span class="na-mancha">${esc(titulo)}</span></h1>
  ${sub ? `<p class="cabeca__sub">${esc(sub)}</p>` : ''}
  ${data ? `<p class="cabeca__data">${esc(data)}</p>` : ''}
  ${extra}
  <div class="ornamento ornamento--curto" aria-hidden="true">${icones.laco}</div>
</header>`;
}

/* As categorias em três fotografias recortadas em mancha, cada uma com uma mancha de cor por trás
   (no menu, na página que não existe e no carrinho vazio). As fotografias vão sem texto
   alternativo: o nome está por baixo. */
export function categoriasEmMancha(ctx, { atual = '', tamanhos = '(min-width: 48rem) 128px, 30vw' } = {}) {
  const cats = ctx.categorias.filter((c) => ctx.produtos.some((p) => p.categoria === c.slug));
  return `<ul class="categorias-mancha">${cats.map((k) => {
    const caminho = `/loja/${k.slug}/`;
    const n = ctx.produtos.filter((p) => p.categoria === k.slug).length;
    return `<li><a class="categoria-mancha" href="${ctx.url(caminho)}"${caminho === atual ? ' aria-current="page"' : ''}><span class="categoria-mancha__fundo"><span class="categoria-mancha__foto">${imagem(ctx, k.foto, { tamanhos, alt: '' })}</span></span><span class="categoria-mancha__nome">${esc(k.nome)}</span><span class="categoria-mancha__conta">${n === 1 ? '1 artigo' : `${n} artigos`}</span></a></li>`;
  }).join('')}</ul>`;
}

/* O convite no fim das páginas que não são legais: uma linha e dois botões. */
export function convite(ctx) {
  const c = ctx.site.contactos;
  return `<aside class="convite" aria-label="Fale connosco">
  <p class="convite__titulo">Uma dúvida, ou uma ideia para o batizado?</p>
  <div class="convite__botoes">
    ${c.whatsapp ? `<a class="botao botao--whatsapp-suave" href="${ctx.whatsapp('Olá!')}" target="_blank" rel="noopener">${icones.whatsapp}<span>Falar no WhatsApp</span></a>` : ''}
    <a class="botao botao--contorno" href="${ctx.url('/loja/')}">Ver a loja</a>
  </div>
</aside>`;
}
