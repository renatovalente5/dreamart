// A moldura de todas as páginas: <head>, aviso, cabeçalho, menu, rodapé e gaveta do carrinho.
// A arrumação é a do ithos (ithos-cathelier.pt), de que a Susana gostou: «Menu» à esquerda, o
// logótipo ao centro, o carrinho à direita, e um menu que abre de lado.
import { esc, numeroWhatsApp } from './util.mjs';
import { icones } from './icones.mjs';
import { categoriasEmMancha, livroBotao } from './componentes.mjs';

function logotipo(ctx, { alto = 64, classe = 'logo' } = {}) {
  const l = ctx.manifesto.logo;
  // a versão mais pequena que ainda chega ao dobro da altura (ecrãs de alta resolução)
  const alturas = Object.keys(l.altura).map(Number).sort((x, y) => x - y);
  const h = alturas.find((x) => x >= alto * 2) || alturas[alturas.length - 1];
  const v = l.altura[h];
  const largo = Math.round((v.largura / h) * alto);
  return `<img class="${classe}" src="${ctx.asset(`img/${v.webp}`)}" width="${largo}" height="${alto}" alt="${esc(ctx.site.marca)}">`;
}

function aviso(ctx) {
  const a = ctx.site.aviso || {};
  if (!a.texto || (a.ate && ctx.hoje > a.ate)) return '';
  const texto = esc(a.texto);
  const corpo = a.ligacao ? `<a href="${ctx.url(a.ligacao)}">${texto}</a>` : texto;
  // data-ate: o site.js esconde o aviso no dia seguinte, mesmo que ninguém publique nada
  return `<div class="aviso"${a.ate ? ` data-ate="${esc(a.ate)}"` : ''}><p>${corpo}</p></div>`;
}

const quantosArtigos = (n) => (n === 1 ? '1 artigo' : `${n} artigos`);
/* As categorias que têm artigos no site (a de Natal some sozinha quando os artigos dela se escondem). */
export const categoriasComArtigos = (ctx) => ctx.categorias.filter((c) => ctx.produtos.some((p) => p.categoria === c.slug));

function cabecalho(ctx) {
  const c = ctx.site.contactos;
  return `<header class="topo" data-topo>
  <div class="topo__barra">
    <button class="topo__menu" type="button" data-abrir="menu" aria-haspopup="dialog">${icones.menu}<span class="topo__menu-texto">Menu</span></button>
    <a class="topo__marca" href="${ctx.url('/')}">${logotipo(ctx, { alto: 82 })}<span class="visualmente-escondido"> — página inicial</span></a>
    <div class="topo__direita">
      ${c.whatsapp ? `<a class="topo__whatsapp" href="https://wa.me/${numeroWhatsApp(c.whatsapp)}" target="_blank" rel="noopener">${icones.whatsapp}<span class="topo__whatsapp-texto">Falar connosco<span class="visualmente-escondido"> no WhatsApp</span></span></a>` : ''}
      <a class="topo__carrinho" href="${ctx.url('/carrinho/')}" data-abrir="carrinho" aria-haspopup="dialog">${icones.carrinho}<span class="visualmente-escondido">Carrinho</span><span class="topo__conta" data-conta hidden></span></a>
    </div>
  </div>
</header>`;
}

function redes(ctx, classe = 'redes', { whatsapp = true } = {}) {
  const c = ctx.site.contactos;
  const r = [];
  if (c.instagram) r.push(`<a href="https://www.instagram.com/${esc(c.instagram)}/" target="_blank" rel="noopener">${icones.instagram}<span class="visualmente-escondido">Instagram</span></a>`);
  if (c.facebook) r.push(`<a href="https://www.facebook.com/${esc(c.facebook)}" target="_blank" rel="noopener">${icones.facebook}<span class="visualmente-escondido">Facebook</span></a>`);
  if (c.whatsapp && whatsapp) r.push(`<a href="https://wa.me/${numeroWhatsApp(c.whatsapp)}" target="_blank" rel="noopener">${icones.whatsapp}<span class="visualmente-escondido">WhatsApp</span></a>`);
  return `<ul class="${classe}">${r.map((x) => `<li>${x}</li>`).join('')}</ul>`;
}

/* O MENU (a gaveta da esquerda; no telemóvel ocupa o ecrã, a partir de 48rem é um painel de lado).
   Refeito a 17 out 2026 («melhora também o menu… improvisa»), na linguagem da marca (ver site.css): ao
   centro, como um cartão; as categorias em três fotografias recortadas em mancha, cada uma com a sua
   mancha de cor por trás (como o nome do logótipo assenta na mancha rosa), «Ver toda a loja», o laço
   entre pespontos, as páginas na letra dos títulos e, em baixo, o WhatsApp, por onde chegam as
   encomendas. As fotografias vão sem texto alternativo: o nome está por baixo. A página em que se está
   fica marcada (aria-current). */
function menu(ctx, atual) {
  const c = ctx.site.contactos;
  const marca = (caminho) => (caminho === atual ? ' aria-current="page"' : '');
  const ligacao = (caminho, texto) => `<li><a class="menu__pagina" href="${ctx.url(caminho)}"${marca(caminho)}>${esc(texto)}</a></li>`;
  return `<dialog class="menu" id="menu" aria-label="Menu">
  <div class="menu__corpo" tabindex="-1">
    <div class="menu__topo">
      <a class="menu__marca" href="${ctx.url('/')}">${logotipo(ctx, { alto: 52 })}</a>
      <button class="menu__fechar" type="button" data-fechar>${icones.fechar}<span class="visualmente-escondido">Fechar o menu</span></button>
    </div>
    <nav class="menu__nav" aria-label="Menu">
      <h2 class="visualmente-escondido" id="menu-loja">Loja</h2>
      ${categoriasEmMancha(ctx, { atual }).replace('<ul class="categorias-mancha">', '<ul class="categorias-mancha" aria-labelledby="menu-loja">')}
      <a class="menu__tudo" href="${ctx.url('/loja/')}"${marca('/loja/')}>Ver toda a loja · ${quantosArtigos(ctx.produtos.length)} ${icones.seta}</a>
      <div class="ornamento ornamento--curto" aria-hidden="true">${icones.laco}</div>
      <ul class="menu__paginas">
        ${ligacao('/como-encomendar/', 'Como encomendar')}
        ${ligacao('/perguntas-frequentes/', 'Perguntas frequentes')}
        ${ligacao('/sobre-nos/', 'Sobre a Mimices')}
        ${ligacao('/contactos/', 'Contactos')}
      </ul>
    </nav>
    <div class="menu__pe">
      ${c.whatsapp ? `<a class="botao botao--whatsapp-suave botao--largo" href="https://wa.me/${numeroWhatsApp(c.whatsapp)}" target="_blank" rel="noopener">${icones.whatsapp}<span>Falar connosco no WhatsApp</span></a>` : ''}
      ${redes(ctx, 'redes redes--menu', { whatsapp: false })}
    </div>
  </div>
</dialog>`;
}

/* O RODAPÉ (17 out 2026). O Renato viu três: o primeiro, em colunas; um centrado, como um cartão de
   batizado («Está muito grande… gostei mais do outro… Deste gosto das ondinhas e dos traços»). Ficou o
   de colunas, compacto, com a orla recortada (as ondinhas, como a renda das toalhas bordadas) e o
   pesponto (os traços). À esquerda o logótipo, a assinatura e as redes; ao lado a loja, a Mimices e os
   contactos — o WhatsApp só como ligação, sem o número, e o telefone com a nota entre parênteses, em
   letra mais pequena (pedidos dele) —; em baixo as páginas legais numa linha, com o Livro de
   Reclamações destacado num botão (DL 156/2005, art. 5.º-B, n.º 2). O fundo é o linho: no rosa claro a
   mancha do logótipo some, e num fundo escuro o «M» e o «s», que saem da mancha, deixam de se ler. */
function rodape(ctx) {
  const c = ctx.site.contactos;
  const e = ctx.site.empresa || {};
  const contactos = [];
  if (c.whatsapp) contactos.push(`<li><a href="https://wa.me/${numeroWhatsApp(c.whatsapp)}" target="_blank" rel="noopener">${icones.whatsapp}<span>WhatsApp</span></a></li>`);
  if (c.telefone) contactos.push(`<li><a href="tel:+${numeroWhatsApp(c.telefone)}">${icones.telefone}<span>${esc(ctx.numeroLegivel(c.telefone))}</span></a> ${ctx.notaChamada(c.telefone)}</li>`);
  if (c.email) contactos.push(`<li><a href="mailto:${esc(c.email)}">${icones.email}<span>${esc(c.email)}</span></a></li>`);
  contactos.push(`<li><span class="rodape__local">${icones.local}<span>${esc(ctx.site.local.localidade)}, ${esc(ctx.site.local.distrito)}</span></span></li>`);
  const ligacao = (caminho, texto) => `<li><a href="${ctx.url(caminho)}">${esc(texto)}</a></li>`;
  return `<footer class="rodape">
  <div class="rodape__corpo">
    <div class="rodape__marca">
      <a class="rodape__logo" href="${ctx.url('/')}">${logotipo(ctx, { alto: 96, classe: 'rodape__logo-img' })}<span class="visualmente-escondido"> — página inicial</span></a>
      <p class="rodape__frase">${esc(ctx.site.assinatura)}</p>
      ${redes(ctx, 'redes redes--rodape', { whatsapp: false })}
    </div>
    <nav class="rodape__nav" aria-label="Rodapé">
      <div class="rodape__coluna">
        <h2>Loja</h2>
        <ul>
          ${categoriasComArtigos(ctx).map((k) => ligacao(`/loja/${k.slug}/`, k.nome)).join('')}
          ${ligacao('/loja/', 'Toda a loja')}
        </ul>
      </div>
      <div class="rodape__coluna">
        <h2>A Mimices</h2>
        <ul>
          ${ligacao('/sobre-nos/', 'Sobre nós')}
          ${ligacao('/como-encomendar/', 'Como encomendar')}
          ${ligacao('/perguntas-frequentes/', 'Perguntas frequentes')}
        </ul>
      </div>
    </nav>
    <div class="rodape__coluna rodape__coluna--contactos">
      <h2>Contactos</h2>
      <ul class="rodape__contactos">${contactos.join('')}</ul>
    </div>
  </div>
  <div class="rodape__fim">
    <p class="rodape__direitos">© ${ctx.hoje.slice(0, 4)} ${esc(ctx.site.marca)}${e.nif ? ` · NIF ${esc(e.nif)}` : ''}</p>
    <ul class="rodape__legal">
      ${ligacao('/termos-e-condicoes/', 'Termos e condições')}
      ${ligacao('/politica-de-privacidade/', 'Privacidade')}
      ${ligacao('/politica-de-cookies/', 'Cookies')}
      ${ligacao('/garantia/', 'Garantia legal')}
      ${ligacao('/resolucao-de-litigios/', 'Resolução de litígios')}
      ${ligacao('/desistir/', 'Desistir de uma compra')}
      <li>${livroBotao()}</li>
    </ul>
  </div>
</footer>`;
}

function gavetaCarrinho() {
  return `<dialog class="gaveta" id="carrinho" aria-labelledby="carrinho-titulo">
  <div class="gaveta__corpo" tabindex="-1">
    <div class="gaveta__topo">
      <h2 id="carrinho-titulo">O seu carrinho</h2>
      <button class="gaveta__fechar" type="button" data-fechar>${icones.fechar}<span class="visualmente-escondido">Fechar o carrinho</span></button>
    </div>
    <div class="gaveta__conteudo" data-carrinho-gaveta>
      <p class="gaveta__vazio">O carrinho está vazio.</p>
    </div>
  </div>
</dialog>`;
}

export function pagina(ctx, { titulo, descricao, caminho, conteudo, partilha, tipo = 'website', jsonld = [], classe = '', indexar = true }) {
  const tituloCompleto = titulo.includes(ctx.site.marca) ? titulo : `${titulo} | ${ctx.site.marca}`;
  const cartao = partilha || ctx.manifesto.partilha._site;
  const l = ctx.manifesto.logo;
  const imgAbs = ctx.absoluto(`/assets/img/${cartao}`);
  return `<!doctype html>
<html lang="pt-PT">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<script>document.documentElement.dataset.rolado=scrollY>40?'sim':'nao'</script>
<title>${esc(tituloCompleto)}</title>
<meta name="description" content="${esc(descricao)}">
<meta name="google-site-verification" content="v8PPLKIhMn_2B8I_KIt1AeTOFtCoW2oASKByuSwryBs">
<meta name="msvalidate.01" content="DE1BA388910A8DC62D873CAEEF7B2BB8">
<link rel="canonical" href="${ctx.absoluto(caminho)}">
${!ctx.producao ? '<meta name="robots" content="noindex, nofollow">\n' : indexar === false ? '<meta name="robots" content="noindex">\n' : ''}<meta property="og:type" content="${tipo}">
<meta property="og:site_name" content="${esc(ctx.site.marca)}">
<meta property="og:locale" content="pt_PT">
<meta property="og:title" content="${esc(tituloCompleto)}">
<meta property="og:description" content="${esc(descricao)}">
<meta property="og:url" content="${ctx.absoluto(caminho)}">
<meta property="og:image" content="${imgAbs}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(ctx.site.marca)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#FFFFFF">
<link rel="icon" type="image/png" sizes="32x32" href="${ctx.asset(`img/${l.icones[32]}`)}">
<link rel="icon" type="image/png" sizes="48x48" href="${ctx.asset(`img/${l.icones[48]}`)}">
<link rel="apple-touch-icon" href="${ctx.asset(`img/${l.icones.apple}`)}">
<link rel="preload" href="${ctx.asset('fontes/montserrat-latin.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${ctx.asset('fontes/gilda-latin.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${ctx.asset(ctx.ficheiros.css)}">
${jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n')}
<script src="${ctx.asset(ctx.ficheiros.js)}" defer></script>
</head>
<body class="${esc(classe)}" data-catalogo="${ctx.asset(ctx.ficheiros.catalogo)}" data-base="${ctx.url('/')}">
<a class="saltar" href="#conteudo">Saltar para o conteúdo</a>
${aviso(ctx)}
${cabecalho(ctx)}
<main id="conteudo" tabindex="-1">
${conteudo}
</main>
${rodape(ctx)}
${gavetaCarrinho()}
${menu(ctx, caminho)}
</body>
</html>
`;
}
