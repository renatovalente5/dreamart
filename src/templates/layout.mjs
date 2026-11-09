// A moldura de todas as páginas (a da proposta A, «Verde da marca», escolhida pelo Renato a 9 nov
// 2026): o cabeçalho (menu e lupa à esquerda, o logótipo redondo ao centro, favoritos e encomenda à
// direita), a gaveta do menu, o painel da procura, a folha de «juntar à encomenda», o rodapé verde
// e o botão do WhatsApp.
import { esc, numeroWhatsApp } from './util.mjs';
import { sprite, ico, arco } from './icones.mjs';
import { logotipo, livroBotao, miniatura, separadoresComArtigos, nomeDoSeparador } from './componentes.mjs';

const wa = (ctx) => (ctx.site.contactos.whatsapp ? `https://wa.me/${numeroWhatsApp(ctx.site.contactos.whatsapp)}` : '');

/* O aviso do topo (content/site.json, «aviso»): uma faixa fina logo por baixo do cabeçalho, até ao
   dia que a dona escolher (o site.js esconde-o no dia seguinte, mesmo sem publicar). */
function aviso(ctx) {
  const a = ctx.site.aviso || {};
  if (!a.texto || (a.ate && ctx.hoje > a.ate)) return '';
  const texto = esc(a.texto);
  const destino = a.ligacao && ctx.existe(a.ligacao) ? a.ligacao : '';
  return `<div class="aviso"${a.ate ? ` data-ate="${esc(a.ate)}"` : ''}><p class="contentor">${destino ? `<a href="${ctx.url(destino)}">${texto}${ico('seta')}</a>` : texto}</p></div>`;
}

function cabecalho(ctx, caminho) {
  return `<header class="topo" id="topo">
  <div class="topo__barra">
    <div class="topo__lado">
      <button class="icone-botao" type="button" id="abrir-menu" aria-label="Abrir o menu" aria-haspopup="dialog" aria-controls="gaveta" aria-expanded="false">${ico('menu')}</button>
      <button class="icone-botao" type="button" id="abrir-procura" aria-label="Procurar" aria-haspopup="dialog" aria-controls="procura" aria-expanded="false">${ico('lupa')}</button>
    </div>
    <a class="topo__logo" href="${ctx.url('/')}"${caminho === '/' ? ' aria-current="page"' : ''}>${logotipo(ctx, { lado: 104, classe: 'topo__logo-img', alt: `${ctx.site.marca}, Lembranças e Eventos — página inicial`, prioridade: true }).replace('sizes="104px"', 'sizes="(min-width: 1024px) 104px, 72px"')}</a>
    <div class="topo__lado topo__lado--dir">
      <a class="icone-botao" href="${ctx.url('/favoritos/')}" id="favoritos-topo" aria-label="Favoritos"${caminho === '/favoritos/' ? ' aria-current="page"' : ''}>${ico('coracao')}</a>
      <a class="icone-botao saco" href="${ctx.url('/encomenda/')}" id="saco" aria-label="A encomenda"${caminho === '/encomenda/' ? ' aria-current="page"' : ''}>${ico('saco')}<span class="saco__n" data-conta hidden></span></a>
    </div>
  </div>
</header>`;
}

/* A gaveta do menu (um <dialog>: o foco fica lá dentro e o Esc fecha): os separadores com a
   fotografia redonda, o arco, as páginas, e em baixo o WhatsApp (só a ligação) e as redes. */
function gaveta(ctx, caminho) {
  const marca = (c) => (c === caminho ? ' aria-current="page"' : '');
  const paginas = [['/sobre-nos/', 'Sobre nós'], ['/como-encomendar/', 'Como encomendar'], ['/perguntas-frequentes/', 'Perguntas frequentes'], ['/contactos/', 'Contactos']].filter(([c]) => ctx.existe(c));
  const w = wa(ctx);
  return `<dialog class="gaveta" id="gaveta" aria-label="Menu">
  <div class="gaveta__interior">
    <div class="gaveta__topo">
      <button class="icone-botao" type="button" data-fechar aria-label="Fechar o menu">${ico('fechar')}</button>
      ${logotipo(ctx, { lado: 52, classe: 'gaveta__logo' })}
    </div>
    <nav aria-label="Loja">
      <div class="gaveta__cabeca"><p class="rotulo">Loja</p><a class="gaveta__tudo" href="${ctx.url('/loja/')}"${marca('/loja/')}>Ver tudo${ico('seta')}</a></div>
      <ul class="gaveta__seps" role="list">
        ${separadoresComArtigos(ctx).map((c) => `<li><a href="${ctx.url(`/loja/${c.slug}/`)}"${marca(`/loja/${c.slug}/`)}>${miniatura(ctx, c.foto)}<span>${esc(nomeDoSeparador(c))}</span>${ico('chevron')}</a></li>`).join('\n        ')}
      </ul>
    </nav>
    ${arco('gaveta__arco')}
    <nav aria-label="Páginas">
      <ul class="gaveta__paginas" role="list">
        ${paginas.map(([c, t]) => `<li><a href="${ctx.url(c)}"${marca(c)}>${esc(t)}</a></li>`).join('\n        ')}
      </ul>
    </nav>
    <div class="gaveta__fim">
      ${w ? `<a class="botao botao--suave" href="${w}" target="_blank" rel="noopener">${ico('whatsapp')}<span>Enviar mensagem</span></a>` : ''}
      ${redes(ctx)}
    </div>
  </div>
</dialog>`;
}

function redes(ctx) {
  const c = ctx.site.contactos;
  const r = [];
  if (c.instagram) r.push(`<a href="https://www.instagram.com/${esc(c.instagram)}/" target="_blank" rel="noopener" aria-label="Instagram da ${esc(ctx.site.marca)}">${ico('instagram')}</a>`);
  if (c.facebook) r.push(`<a href="https://www.facebook.com/${esc(c.facebook)}" target="_blank" rel="noopener" aria-label="Facebook da ${esc(ctx.site.marca)}">${ico('facebook')}</a>`);
  return r.length ? `<div class="redes">${r.join('')}</div>` : '';
}

/* A procura: o campo e, por baixo, os resultados (o site.js procura no catálogo: o nome, a frase
   curta e o separador, sem acentos nem maiúsculas). Vazia, mostra os separadores. */
function procura(ctx) {
  return `<dialog class="procura" id="procura" aria-label="Procurar">
  <div class="procura__interior">
    <form class="procura__linha" role="search" action="${ctx.url('/loja/')}" data-procura>
      <label class="procura__campo">
        ${ico('lupa')}
        <span class="so-leitor">Procurar na loja</span>
        <input type="search" name="q" placeholder="Velas, convites, batizado…" autocomplete="off" enterkeyhint="search" spellcheck="false" aria-controls="procura-resultados">
      </label>
      <button class="icone-botao" type="button" data-fechar aria-label="Fechar a procura">${ico('fechar')}</button>
    </form>
    <p class="so-leitor" role="status" data-procura-estado></p>
    <div class="procura__resultados" id="procura-resultados" data-procura-resultados hidden></div>
    <div class="procura__inicio" data-procura-inicio>
      <p class="rotulo">Separadores</p>
      <div class="fichas">
        ${separadoresComArtigos(ctx).map((c) => `<a href="${ctx.url(`/loja/${c.slug}/`)}">${esc(nomeDoSeparador(c))}</a>`).join('\n        ')}
      </div>
    </div>
  </div>
</dialog>`;
}

/* A folha de «juntar à encomenda» do «+» dos cartões: o site.js enche-a com os campos da
   personalização do artigo (o catálogo diz quais), a quantidade e o botão. */
function folha() {
  return `<dialog class="folha" id="folha" aria-labelledby="folha-titulo">
  <div class="folha__interior" data-folha></div>
</dialog>`;
}

/* O RODAPÉ da proposta A: o verde mais escuro (o selo lê-se nele), o logótipo, a frase da marca e as
   redes; a Loja, a Ajuda e os Contactos (o WhatsApp só como ligação, sem o número); e a linha legal,
   com o Livro de Reclamações discreto da legal-comum. */
function rodape(ctx) {
  const c = ctx.site.contactos;
  const e = ctx.site.empresa || {};
  const w = wa(ctx);
  const ligacao = (caminho, texto) => (ctx.existe(caminho) ? `<li><a href="${ctx.url(caminho)}">${esc(texto)}</a></li>` : '');
  const contactos = [];
  if (w) contactos.push(`<li><a href="${w}" target="_blank" rel="noopener">${ico('mensagem')}<span>Enviar mensagem<span class="so-leitor"> pelo WhatsApp</span></span></a></li>`);
  if (c.email) contactos.push(`<li><a href="mailto:${esc(c.email)}">${ico('carta')}<span>${esc(c.email)}</span></a></li>`);
  const onde = [e.localidade || ctx.site.local.localidade, e.concelho].filter(Boolean).join(', ');
  contactos.push(`<li><span>${ico('local')}<span>${esc(onde)}</span></span></li>`);
  return `<footer class="rodape">
  <div class="contentor">
    <div class="rodape__grelha">
      <div class="rodape__marca">
        <a class="rodape__logo" href="${ctx.url('/')}">${logotipo(ctx, { lado: 104, alt: `${ctx.site.marca} — página inicial` }).replace('sizes="104px"', 'sizes="(min-width: 640px) 104px, 92px"')}</a>
        <p class="rodape__frase">${esc(ctx.site.assinatura || '')}</p>
        ${redes(ctx)}
      </div>
      <nav class="rodape__col" aria-labelledby="r-loja">
        <h2 class="rodape__titulo" id="r-loja">Loja</h2>
        <ul role="list">
          ${separadoresComArtigos(ctx).map((k) => ligacao(`/loja/${k.slug}/`, nomeDoSeparador(k))).join('\n          ')}
        </ul>
      </nav>
      <nav class="rodape__col" aria-labelledby="r-ajuda">
        <h2 class="rodape__titulo" id="r-ajuda">Ajuda</h2>
        <ul role="list">
          ${ligacao('/como-encomendar/', 'Como encomendar')}
          ${ligacao('/perguntas-frequentes/', 'Perguntas frequentes')}
          ${ligacao('/garantia/', 'Garantia legal')}
          ${ligacao('/desistir/', 'Desistir de uma compra')}
          ${ligacao('/sobre-nos/', 'Sobre nós')}
        </ul>
      </nav>
      <div class="rodape__col rodape__contactos">
        <h2 class="rodape__titulo"><a href="${ctx.url('/contactos/')}">Contactos</a></h2>
        <ul role="list">${contactos.join('')}</ul>
      </div>
    </div>
    <div class="rodape__legal">
      <ul role="list">
        ${ligacao('/termos-e-condicoes/', 'Termos e condições')}
        ${ligacao('/politica-de-privacidade/', 'Política de privacidade')}
        ${ligacao('/politica-de-cookies/', 'Política de cookies')}
        ${ligacao('/resolucao-de-litigios/', 'Resolução de litígios')}
        <li>${livroBotao()}</li>
      </ul>
      <p>© ${ctx.hoje.slice(0, 4)} ${esc(ctx.site.marca)}</p>
    </div>
  </div>
</footer>`;
}

/* O botão do WhatsApp, a flutuar, na cor da marca com o anel dourado: em todas as páginas menos na da
   encomenda (lá, o botão principal já é o WhatsApp). */
function botaoWhatsApp(ctx, caminho) {
  const w = wa(ctx);
  if (!w || caminho === '/encomenda/') return '';
  return `<a class="whats" href="${w}" target="_blank" rel="noopener" aria-label="Enviar mensagem pelo WhatsApp">${ico('whatsapp')}</a>`;
}

export function pagina(ctx, { titulo, descricao, caminho, conteudo, partilha, tipo = 'website', jsonld = [], classe = '', indexar = true }) {
  const marca = ctx.site.marca;
  const tituloCompleto = titulo.includes(marca) ? titulo : `${titulo} | ${marca}`;
  const cartaoPartilha = partilha || ctx.manifesto.partilha._site;
  const l = ctx.manifesto.logo;
  const robots = !ctx.producao ? 'noindex, nofollow' : indexar === false ? 'noindex' : '';
  return `<!doctype html>
<html lang="pt-PT">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(tituloCompleto)}</title>
<meta name="description" content="${esc(descricao)}">
<link rel="canonical" href="${ctx.absoluto(caminho)}">
${robots ? `<meta name="robots" content="${robots}">\n` : ''}<meta property="og:type" content="${tipo}">
<meta property="og:site_name" content="${esc(marca)}">
<meta property="og:locale" content="pt_PT">
<meta property="og:title" content="${esc(tituloCompleto)}">
<meta property="og:description" content="${esc(descricao)}">
<meta property="og:url" content="${ctx.absoluto(caminho)}">
<meta property="og:image" content="${ctx.absoluto(`/assets/img/${cartaoPartilha}`)}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(marca)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#F6F2E8">
<link rel="icon" type="image/png" sizes="32x32" href="${ctx.asset(`img/${l.icones[32]}`)}">
<link rel="icon" type="image/png" sizes="48x48" href="${ctx.asset(`img/${l.icones[48]}`)}">
<link rel="apple-touch-icon" href="${ctx.asset(`img/${l.icones.apple}`)}">
<link rel="preload" href="${ctx.asset('fontes/ebgaramond-latin.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${ctx.asset('fontes/mulish-latin.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${ctx.asset(ctx.ficheiros.css)}">
<script>document.documentElement.classList.add('js')</script>
${jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n')}
<script src="${ctx.asset(ctx.ficheiros.js)}" defer></script>
</head>
<body${classe ? ` class="${esc(classe)}"` : ''} data-catalogo="${ctx.asset(ctx.ficheiros.catalogo)}" data-base="${ctx.url('/')}">
${sprite()}
<a class="saltar" href="#conteudo">Saltar para o conteúdo</a>
${cabecalho(ctx, caminho)}
<main id="conteudo" tabindex="-1">
${aviso(ctx)}
${conteudo}
</main>
${rodape(ctx)}
${botaoWhatsApp(ctx, caminho)}
${gaveta(ctx, caminho)}
${procura(ctx)}
${folha()}
<div class="recado" role="status" aria-live="polite" data-recado></div>
</body>
</html>
`;
}

/* /carrinho/ era o endereço da encomenda na primeira versão: reencaminha para /encomenda/. */
export function reencaminhar(ctx, { de, para }) {
  const alvo = ctx.url(para);
  return `<!doctype html>
<html lang="pt-PT">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(ctx.site.marca)}</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${ctx.absoluto(para)}">
<meta http-equiv="refresh" content="0; url=${alvo}">
<script>location.replace(${JSON.stringify(alvo)} + location.search + location.hash)</script>
</head>
<body>
<p><a href="${alvo}">A sua encomenda</a></p>
</body>
</html>
`;
}
