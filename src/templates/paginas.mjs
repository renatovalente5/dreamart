// As páginas do site, na proposta A. Cada função devolve { caminho, titulo, descricao, conteudo, … }
// e o build.mjs veste-a com a moldura (layout.mjs).
import { esc, euros, precoDe, markdown, textoSimples, resumir, numeroWhatsApp, numeroLegivel, notaChamada, moradaCompleta } from './util.mjs';
import { ico, arco } from './icones.mjs';
import { numeroPortugues, opcoesDe, personalizacaoDe, quantidadeMinimaDe, temSuplementos, ICONES_CONFIANCA } from '../lib/regras.mjs';
import {
  imagem, medalhao, preco, promocaoNota, porUnidade, cartao, grelha, pastilhas, circulos, cabecaSeccao, cabecaDePagina,
  migalhasLd, botao, separadoresComArtigos, nomeDoSeparador, urlFoto,
} from './componentes.mjs';

const produtosDe = (ctx, cat) => ctx.produtos.filter((p) => p.categoria === cat);
const categoriaDe = (ctx, slug) => ctx.categorias.find((c) => c.slug === slug);
const paragrafos = (t) => String(t || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('');
/* Uma ligação escrita no painel (a capa, o aviso) só se usa se a página existir: um separador sem
   artigos não tem página, e a ligação ia dar à página que não existe. */
const ligacaoQueExiste = (ctx, c, alternativa = '/loja/') => (c && ctx.existe(c) ? c : alternativa);

// ---------------------------------------------------------------- a loja (JSON-LD)
export function organizacao(ctx) {
  const c = ctx.site.contactos;
  const e = ctx.site.empresa || {};
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    '@id': ctx.absoluto('/#loja'),
    name: ctx.site.marca,
    description: ctx.site.descricao,
    slogan: ctx.site.assinatura || undefined,
    url: ctx.absoluto('/'),
    logo: ctx.absoluto(`/assets/img/${ctx.manifesto.logo.altura[256].png}`),
    image: ctx.absoluto(`/assets/img/${ctx.manifesto.partilha._site}`),
    address: {
      '@type': 'PostalAddress',
      ...(e.morada ? { streetAddress: e.morada } : {}),
      ...(e.codigoPostal ? { postalCode: e.codigoPostal } : {}),
      addressLocality: e.localidade || ctx.site.local.localidade,
      addressRegion: ctx.site.local.distrito,
      addressCountry: 'PT',
    },
    areaServed: ['Portugal', 'Europa'],
    currenciesAccepted: 'EUR',
    sameAs: [c.instagram && `https://www.instagram.com/${c.instagram}/`, c.facebook && `https://www.facebook.com/${c.facebook}`].filter(Boolean),
  };
  if (ctx.site.entrega?.pagamento) ld.paymentAccepted = ctx.site.entrega.pagamento;
  if (c.email) ld.email = c.email;
  const tel = numeroPortugues(c.telefone) || numeroPortugues(c.whatsapp);
  if (tel) ld.telephone = `+351${tel}`;
  if (e.nif) ld.vatID = `PT${String(e.nif).replace(/\D/g, '')}`;
  if (!ld.slogan) delete ld.slogan;
  return ld;
}

// ---------------------------------------------------------------- página inicial
/* A página inicial da proposta A, alimentada por content/inicio.json: a capa (os diapositivos que
   rodam, cada um num medalhão; o título do primeiro é o h1), «O que criamos» (os separadores em
   círculos, só os que têm artigos), o destaque (a coleção de Natal), as lembranças, «Um sonho de
   família» e a faixa de confiança. */
export function inicio(ctx) {
  const h = ctx.inicio;
  const diapositivos = (Array.isArray(h.capa) ? h.capa : []).filter((d) => d && ctx.manifesto.fotos[d.foto]).slice(0, 4);
  const varios = diapositivos.length > 1;
  const tamanhosCapa = '(min-width: 900px) min(40vw, 440px), min(66vw, 272px)';
  const capa = diapositivos.length ? `<section class="capa"${varios ? ' aria-roledescription="carrossel"' : ''} aria-label="Coleções em destaque">
  <div class="contentor capa__grelha">
    <div class="capa__palco">
      ${diapositivos.map((d, i) => `<div class="capa__slide${i === 0 ? ' is-ativo' : ''}" id="capa-${i + 1}" role="group"${varios ? ` aria-roledescription="diapositivo" aria-label="${i + 1} de ${diapositivos.length}: ${esc(d.aba)}"` : ''}${i === 0 ? '' : ' inert'}>
        ${medalhao(ctx, d.foto, { tamanhos: tamanhosCapa, prioridade: i === 0, baixa: i > 0, ate: 960 })}
        <div class="capa__texto">
          ${i === 0 ? `<h1 class="capa__titulo">${esc(d.titulo)}</h1>` : `<p class="capa__titulo">${esc(d.titulo)}</p>`}
          ${d.texto ? `<p class="capa__sub">${esc(d.texto)}</p>` : ''}
          ${botao(ctx.url(ligacaoQueExiste(ctx, d.ligacao)), d.botao, { classe: 'botao botao--creme' })}
        </div>
      </div>`).join('\n      ')}
    </div>
    ${varios ? `<div class="capa__controlos">
      <div class="capa__abas">
        ${diapositivos.map((d, i) => `<button class="capa__aba" type="button" aria-controls="capa-${i + 1}" aria-current="${i === 0 ? 'true' : 'false'}">${esc(d.aba)}<span class="capa__barra" aria-hidden="true"><i></i></span></button>`).join('\n        ')}
      </div>
      <button class="capa__pausa" type="button" aria-pressed="false" aria-label="Parar a passagem das coleções">${ico('pausa', { classe: 'i-pausa' })}${ico('play', { classe: 'i-play' })}</button>
    </div>` : ''}
  </div>
</section>` : '';

  const s = h.separadores || {};
  const separadores = separadoresComArtigos(ctx).length ? `<section class="separadores" aria-labelledby="t-separadores">
  <div class="contentor">
    ${cabecaSeccao({ id: 't-separadores', titulo: s.titulo || 'O que criamos', texto: s.texto, classe: 'revela' })}
    <div class="revela">${circulos(ctx)}</div>
  </div>
</section>` : '';

  // o destaque (na Dream Art, a coleção de Natal): até três artigos da categoria escolhida
  const d = h.destaque || {};
  const catD = categoriaDe(ctx, d.categoria);
  const listaD = catD ? produtosDe(ctx, catD.slug) : [];
  const destaque = listaD.length ? `<section class="destaque" aria-labelledby="t-destaque">
  <div class="contentor">
    <div class="destaque__bloco revela">
      <div class="destaque__texto">
        ${d.etiqueta ? `<p class="rotulo">${esc(d.etiqueta)}</p>` : ''}
        <h2 class="titulo-secao" id="t-destaque">${esc(d.titulo)}</h2>
        ${arco()}
        ${d.texto ? `<p>${esc(d.texto)}</p>` : ''}
        ${botao(ctx.url(`/loja/${catD.slug}/`), d.botao || 'Ver a coleção', { classe: 'botao botao--creme' })}
      </div>
      <ul class="destaque__lista" role="list" aria-label="${esc(d.titulo)}">
        ${listaD.slice(0, 3).map((p) => cartao(ctx, p, { tamanhos: '(min-width: 1296px) 242px, (min-width: 1024px) calc(19vw - 4px), (min-width: 640px) calc(33.3vw - 51px), min(calc(68vw - 58px), 244px)' })).join('\n')}
      </ul>
    </div>
  </div>
</section>` : '';

  // as lembranças: até oito (seis no telemóvel e no tablet) e o botão para as ver todas
  const l = h.lembrancas || {};
  const catL = categoriaDe(ctx, l.categoria);
  const listaL = catL ? produtosDe(ctx, catL.slug) : [];
  const lembrancas = listaL.length ? `<section class="lembrancas" aria-labelledby="t-lembrancas">
  <div class="contentor">
    ${cabecaSeccao({ id: 't-lembrancas', titulo: l.titulo, texto: l.texto, classe: 'revela' })}
    <div class="revela">${grelha(ctx, listaL.slice(0, 8)).replace('class="grelha-artigos"', 'class="grelha-artigos grelha-artigos--montra"')}</div>
    <div class="lembrancas__mais">${botao(ctx.url(`/loja/${catL.slug}/`), l.botao || 'Ver todas', { classe: 'botao botao--contorno' })}</div>
  </div>
</section>` : '';

  const a = h.apresentacao || {};
  const apresentacao = a.titulo ? `<section class="apresentacao" aria-labelledby="t-apresentacao">
  <div class="contentor apresentacao__grelha">
    ${a.foto && ctx.manifesto.fotos[a.foto] ? `<figure class="arco-foto revela">${imagem(ctx, a.foto, { tamanhos: '(min-width: 640px) min(calc(50vw - 56px), 400px), min(calc(78vw - 16px), 330px)', ate: 960, moldura: 0.8 })}</figure>` : ''}
    <div class="apresentacao__texto revela">
      ${a.etiqueta ? `<p class="rotulo">${esc(a.etiqueta)}</p>` : ''}
      <h2 class="titulo-secao" id="t-apresentacao">${esc(a.titulo)}</h2>
      ${paragrafos(a.texto)}
      ${ctx.existe('/sobre-nos/') ? `<a class="ligacao-seta" href="${ctx.url('/sobre-nos/')}"><span>${esc(a.botao || 'Conhecer a nossa história')}</span>${ico('seta')}</a>` : ''}
    </div>
  </div>
</section>` : '';

  const frases = (Array.isArray(h.confianca) ? h.confianca : []).filter((f) => f && f.texto).slice(0, 4);
  const confianca = frases.length ? `<section class="confianca" aria-label="Como trabalhamos">
  <ul class="contentor confianca__lista" role="list" style="--n:${frases.length}">
    ${frases.map((f) => `<li class="confianca__item"><span class="confianca__icone">${ico(ICONES_CONFIANCA.includes(f.icone) ? f.icone : 'flor')}</span><span>${esc(f.texto)}</span></li>`).join('\n    ')}
  </ul>
</section>` : '';

  return {
    caminho: '/',
    titulo: h.seo?.titulo || ctx.site.marca,
    descricao: h.seo?.descricao || ctx.site.descricao,
    classe: 'pagina-inicio',
    jsonld: [organizacao(ctx), { '@context': 'https://schema.org', '@type': 'WebSite', '@id': ctx.absoluto('/#site'), name: ctx.site.marca, url: ctx.absoluto('/'), inLanguage: 'pt-PT', publisher: { '@id': ctx.absoluto('/#loja') } }],
    conteudo: [capa, separadores, destaque, lembrancas, apresentacao, confianca].filter(Boolean).join('\n\n'),
  };
}

// ---------------------------------------------------------------- loja e separadores
/* A loja (/loja/): todos os artigos, e os separadores em pastilhas. Cada separador com artigos tem a
   sua página (/loja/<slug>/), com uma cabeça curta: o medalhão com a fotografia do separador, o
   título e o texto de content/categorias.json. */
export function loja(ctx, slug = null) {
  const c = slug ? categoriaDe(ctx, slug) : null;
  const lista = c ? produtosDe(ctx, slug) : ctx.produtos;
  const caminho = c ? `/loja/${c.slug}/` : '/loja/';
  const cabeca = c
    ? cabecaDePagina(ctx, { rotulo: { nome: 'Loja', caminho: '/loja/' }, titulo: c.titulo, sub: markdown(c.resumo, ctx.url), foto: c.foto })
    : cabecaDePagina(ctx, { titulo: 'Loja', sub: `<p>${esc(ctx.site.descricao)}</p>` });
  const conteudo = `${cabeca}
<section class="vitrine" aria-label="${c ? esc(c.titulo) : 'Todos os artigos'}">
  <div class="contentor">
    ${pastilhas(ctx, caminho)}
    ${grelha(ctx, lista, { titulo: 'h2', cedo: 4 })}
  </div>
</section>`;
  const ld = [
    migalhasLd(ctx, [{ nome: 'Início', caminho: '/' }, { nome: 'Loja', caminho: '/loja/' }, ...(c ? [{ nome: c.titulo, caminho }] : [])]),
    { '@context': 'https://schema.org', '@type': 'ItemList', name: c ? c.titulo : 'Loja', itemListElement: lista.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: ctx.absoluto(`/produtos/${p.slug}/`), name: p.nome })) },
  ];
  return {
    caminho,
    titulo: c ? c.titulo : 'Loja — lembranças, convites e conjuntos de batizado',
    descricao: resumir(c ? textoSimples(c.resumo) : `${ctx.site.descricao} Encomendas pelo WhatsApp.`),
    jsonld: ld,
    conteudo,
  };
}

// ---------------------------------------------------------------- ficha do artigo
/* O formulário de «juntar à encomenda» de um artigo: as escolhas (se houver), os campos da
   personalização (os rótulos do artigo; os obrigatórios com «*»), a quantidade (com o mínimo) e o
   botão. O site.js faz o mesmo na folha do «+» dos cartões (formularioHtml): mudar um é mudar o outro. */
export function formulario(ctx, p, { prefixo = 'pz' } = {}) {
  const id = (k) => `${prefixo}-${k}-${p.slug}`;
  const grupos = opcoesDe(p);
  const escolhas = grupos.map((g, i) => {
    // marcado à partida: o primeiro valor sem acréscimo (o preço anunciado é o que se paga)
    const marcado = Math.max(0, g.valores.findIndex((v) => !v.suplemento));
    return `<fieldset class="campo escolha" data-escolha="${i}">
    <legend>${esc(g.nome)}</legend>
    <div class="escolha__lista">${g.valores.map((v, j) => `<label class="escolha__opcao"><input type="radio" name="opcao-${i}" value="${j}"${j === marcado ? ' checked' : ''}><span>${esc(v.nome)}${v.suplemento ? ` <span class="escolha__mais">+ ${euros(v.suplemento)}</span>` : ''}</span></label>`).join('')}</div>
  </fieldset>`;
  }).join('');
  const campos = personalizacaoDe(p);
  const obrig = campos.some((k) => k.obrigatorio);
  const marca = (k) => (k.obrigatorio ? ' <span class="campo__obrig" aria-hidden="true">*</span>' : '');
  const pers = campos.length ? `<fieldset class="juntar__pers">
    <legend class="juntar__legenda"><span>Personalização</span>${obrig ? '<span class="juntar__nota" aria-hidden="true">* obrigatório</span>' : ''}</legend>
    ${campos.map((k) => {
      const rotulo = `<label for="${id(k.id)}">${esc(k.rotulo)}${marca(k)}</label>`;
      if (k.id === 'data') return `<div class="campo">${rotulo}<input id="${id('data')}" name="data" type="date"${k.obrigatorio ? ' required' : ''} data-sem-passado></div>`;
      if (k.id === 'frase') return `<div class="campo">${rotulo}<textarea id="${id('frase')}" name="frase" rows="2" maxlength="160" spellcheck="true"${k.obrigatorio ? ' required' : ''}></textarea></div>`;
      return `<div class="campo">${rotulo}<input id="${id('nome')}" name="nome" type="text" maxlength="60" autocomplete="off" autocapitalize="words" spellcheck="false"${k.obrigatorio ? ' required' : ''}></div>`;
    }).join('\n    ')}
  </fieldset>` : '';
  const minimo = quantidadeMinimaDe(p);
  return `<form class="juntar" data-juntar-form="${esc(p.slug)}" data-minimo="${minimo}" novalidate>
  ${escolhas}
  ${pers}
  <div class="juntar__qtd">
    <label for="${id('qtd')}">Quantidade</label>
    <div class="passo" data-passo>
      <button type="button" data-menos aria-label="Menos um">${ico('menos')}</button>
      <input id="${id('qtd')}" name="quantidade" type="number" inputmode="numeric" min="${minimo}" max="999" value="${minimo}"${minimo > 1 ? ` aria-describedby="${id('minimo')}"` : ''}>
      <button type="button" data-mais aria-label="Mais um">${ico('mais')}</button>
    </div>
    ${minimo > 1 ? `<p class="campo__ajuda" id="${id('minimo')}">Mínimo: ${minimo}</p>` : ''}
  </div>
  <p class="juntar__erro" data-erro role="alert" hidden></p>
  <div class="juntar__acoes">
    <button class="botao botao--verde" type="submit">${ico('saco')}<span>Juntar à encomenda</span></button>
    ${prefixo === 'pz' ? `<button class="icone-botao juntar__fav" type="button" aria-pressed="false" data-fav="${esc(p.slug)}" aria-label="Guardar nos favoritos: ${esc(p.nome)}">${ico('coracao')}</button>` : ''}
  </div>
  <p class="juntar__total" data-total aria-live="polite"></p>
</form>`;
}

/* O fabricante de um artigo, quando o painel o diz por inteiro (nome, morada e email); senão null,
   e a ficha diz a loja (Regulamento (UE) 2023/988, art. 19.º). */
export function fabricanteDoArtigo(p) {
  const f = p.fabricante;
  if (!f || typeof f !== 'object') return null;
  const ok = ['nome', 'morada', 'email'].every((k) => typeof f[k] === 'string' && f[k].trim());
  return ok ? { nome: f.nome.trim(), morada: f.morada.trim(), email: f.email.trim() } : null;
}
/* Os avisos de segurança (e os perigos) de um artigo: um por linha do campo. */
const linhasDe = (v) => String(typeof v === 'string' ? v : '').split(/\n+/).map((t) => t.trim()).filter(Boolean);
export const avisosDoArtigo = (p) => linhasDe(p.avisos);
export const perigosDoArtigo = (p) => linhasDe(p.perigos);

/* A morada de quem faz as peças: sem a rua (ainda não dita), na pré-visualização vai a marca
   «[por confirmar]» antes do código postal; no domínio aberto, o que houver (as regras deixam abrir
   com a localidade). */
export function moradaDaLoja(ctx) {
  const e = ctx.site.empresa || {};
  const resto = moradaCompleta(e);
  if (e.morada || ctx.producao) return esc(resto);
  return `${ctx.marcador('a rua e o número')}, ${esc(resto)}`;
}

export function produto(ctx, p) {
  const c = categoriaDe(ctx, p.categoria);
  const caminho = `/produtos/${p.slug}/`;
  const v = precoDe(p, ctx.hoje);
  const nome = esc(p.nome);

  // a galeria: a primeira fotografia grande; com várias, as outras deslizam e as miniaturas escolhem
  const fotos = p.fotos.filter((f) => ctx.manifesto.fotos[f]);
  const tamanhos = '(min-width: 1296px) 600px, (min-width: 900px) calc(50vw - 64px), calc(100vw - 40px)';
  // a moldura tem a forma da fotografia mais alta do artigo (entre 4:5 e 4:3): a peça vê-se inteira
  const forma = Math.max(0.8, Math.min(4 / 3, ...fotos.map((f) => ctx.manifesto.fotos[f].largura / ctx.manifesto.fotos[f].altura)));
  const galeria = `<div class="galeria${fotos.length > 1 ? ' galeria--varias' : ''}" data-galeria style="--forma:${forma.toFixed(3)}">
    <div class="galeria__pista"${fotos.length > 1 ? ` tabindex="0" role="region" aria-label="Fotografias de ${nome}"` : ''}>
      ${fotos.map((f, i) => `<figure class="galeria__foto" id="foto-${i + 1}">${imagem(ctx, f, { tamanhos, prioridade: i === 0, moldura: forma })}</figure>`).join('\n      ')}
      ${p.video && ctx.ficheiros.videos[p.video] ? video(ctx, p) : ''}
    </div>
    ${fotos.length > 1 ? `<ul class="galeria__miniaturas" role="list">${fotos.map((f, i) => `<li><button type="button" data-foto="${i}"${i === 0 ? ' aria-current="true"' : ''} aria-label="Fotografia ${i + 1} de ${fotos.length}"><img src="${urlFoto(ctx, f, ctx.manifesto.fotos[f].larguras[0])}" width="64" height="64" alt="" loading="lazy" decoding="async"></button></li>`).join('')}</ul>` : ''}
  </div>`;

  const comToalha = /\btoalhas?\b/i.test(`${p.nome} ${(p.inclui || []).join(' ')}`);
  const composicao = p.composicao
    ? `<p class="ficha__linha"><strong>Composição:</strong> ${esc(p.composicao)}</p>`
    : comToalha ? `<p class="ficha__linha"><strong>Composição da toalha:</strong> ${ctx.marcador('de que é feita a toalha (ex.: 100 % algodão)')}</p>` : '';
  const inclui = p.inclui?.length ? `<div class="ficha__bloco"><h2 class="ficha__subtitulo">Inclui</h2><ul class="lista-certo" role="list">${p.inclui.map((t) => `<li>${ico('certo')}<span>${esc(t)}</span></li>`).join('')}</ul></div>` : '';
  const medidas = p.medidas?.length ? `<div class="ficha__bloco"><h2 class="ficha__subtitulo">Medidas</h2><table class="medidas"><tbody>${p.medidas.map((l) => `<tr><th scope="row">${esc(l.rotulo)}</th><td>${esc(l.valor)}</td></tr>`).join('')}</tbody></table><p class="ficha__nota">Medidas aproximadas: cada peça é feita à mão.</p></div>` : '';

  /* A informação legal do artigo, só quando está preenchida no painel (22 out 2026, grupo 1 da
     auditoria legal): avisos de segurança e perigos (um por linha), a idade recomendada, «Não é um
     brinquedo» e a referência. */
  const avisos = avisosDoArtigo(p);
  const perigos = perigosDoArtigo(p);
  const infoLegal = avisos.length || perigos.length || p.idade || p.naoBrinquedo === true || p.referencia ? `<div class="ficha__bloco ficha__legal">
    ${avisos.length ? `<h2 class="ficha__subtitulo">Avisos de segurança</h2><ul role="list">${avisos.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
    ${perigos.length ? `<h2 class="ficha__subtitulo">Perigos</h2><ul role="list">${perigos.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
    ${p.idade ? `<p class="ficha__linha"><strong>Idade recomendada:</strong> ${esc(p.idade)}</p>` : ''}
    ${p.naoBrinquedo === true ? '<p class="ficha__linha">Não é um brinquedo.</p>' : ''}
    ${p.referencia ? `<p class="ficha__linha"><strong>Referência:</strong> ${esc(p.referencia)}</p>` : ''}
  </div>` : '';

  // entrega e pagamento (fechado): o prazo, os portes por encomenda e o pagamento
  const en = ctx.site.entrega || {};
  const portes = (en.zonas || []).filter((z) => z.morada).map((z) => `${esc(z.curto)}: ${Number.isFinite(en.portes?.[z.id]) ? euros(en.portes[z.id]) : 'a confirmar'}`).join(' · ');
  const levantamento = (en.zonas || []).find((z) => z.id === 'levantamento');
  const entrega = `<details class="ficha__detalhe">
    <summary>${ico('caixa')}<span>Entrega e pagamento</span>${ico('baixo', { classe: 'ficha__seta' })}</summary>
    <div class="ficha__detalhe-corpo">
      <p><strong>Prazo:</strong> ${en.prazo ? esc(en.prazo) : ctx.marcador('quanto tempo leva a fazer e a entregar')}</p>
      <p><strong>Portes, por encomenda:</strong> ${portes}${levantamento ? ` · ${esc(levantamento.curto)}: grátis` : ''}.</p>
      <p><strong>Pagamento:</strong> ${en.pagamento ? esc(en.pagamento) : ctx.marcador('as formas de pagamento')}</p>
      ${personalizacaoDe(p).length ? '<p>Peça personalizada: não tem direito de livre resolução.</p>' : ''}
    </div>
  </details>`;

  const e = ctx.site.empresa || {};
  const fab = fabricanteDoArtigo(p);
  const feito = fab
    ? [fab.nome, fab.morada, fab.email].map(esc).join(' · ')
    : [e.nome ? `${esc(e.nome)} (${esc(ctx.site.marca)})` : esc(ctx.site.marca), moradaDaLoja(ctx), esc(ctx.site.contactos.email || '')].filter(Boolean).join(' · ');

  // «Também pode gostar»: do mesmo separador; se não chegarem quatro, outras peças da loja
  const mesmos = ctx.produtos.filter((x) => x.slug !== p.slug && x.categoria === p.categoria);
  const outros = ctx.produtos.filter((x) => x.slug !== p.slug && x.categoria !== p.categoria);
  const relacionados = [...mesmos, ...outros].slice(0, 4);

  const conteudo = `<section class="ficha">
  <div class="contentor ficha__grelha">
    ${galeria}
    <div class="ficha__info">
      <a class="ficha__rotulo rotulo" href="${ctx.url(`/loja/${c.slug}/`)}">${esc(nomeDoSeparador(c))}</a>
      <h1 class="ficha__nome">${nome}</h1>
      ${preco(ctx, p, { classe: 'ficha__preco', unidade: true })}
      ${promocaoNota(ctx, p)}
      ${p.resumo ? `<p class="ficha__resumo">${esc(p.resumo)}</p>` : ''}
      ${formulario(ctx, p)}
      <noscript><p class="ficha__nota">A encomenda precisa de JavaScript. Pode sempre encomendar pelo <a href="${ctx.whatsapp(`Olá! Gostava de encomendar: ${p.nome}.`)}">WhatsApp</a>.</p></noscript>
      <div class="ficha__mais">
        <div class="ficha__descricao prosa">${markdown(p.descricao, ctx.url)}</div>
        ${inclui}
        ${composicao}
        ${medidas}
        ${infoLegal}
        ${entrega}
        <p class="ficha__feito">${ico('mao')}<span><strong>Feito à mão por</strong> ${feito}</span></p>
      </div>
    </div>
  </div>
</section>
${relacionados.length ? `<section class="relacionados" aria-labelledby="t-relacionados">
  <div class="contentor">
    ${cabecaSeccao({ id: 't-relacionados', titulo: 'Também pode gostar' })}
    ${grelha(ctx, relacionados)}
  </div>
</section>` : ''}`;

  const personalizada = personalizacaoDe(p).length > 0;
  const ldProduto = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.nome,
    description: p.resumo || textoSimples(p.descricao),
    image: fotos.slice(0, 4).map((f) => ctx.absoluto(`/assets/img/${f}-${ctx.manifesto.fotos[f].resumo}-${ctx.manifesto.fotos[f].larguras.at(-1)}.webp`)),
    brand: { '@type': 'Brand', name: ctx.site.marca },
    category: c.titulo,
    url: ctx.absoluto(caminho),
  };
  if (p.referencia) ldProduto.sku = p.referencia;
  if (v.atual !== null) {
    ldProduto.offers = {
      '@type': 'Offer',
      url: ctx.absoluto(caminho),
      priceCurrency: 'EUR',
      price: v.atual.toFixed(2),
      availability: 'https://schema.org/MadeToOrder', // tudo é feito por encomenda
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': ctx.absoluto('/#loja') },
      /* A devolução, como os termos a dizem: uma peça personalizada não tem livre resolução; as outras
         têm 14 dias, com os custos da devolução a cargo do cliente. */
      hasMerchantReturnPolicy: personalizada
        ? { '@type': 'MerchantReturnPolicy', applicableCountry: 'PT', returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted' }
        : { '@type': 'MerchantReturnPolicy', applicableCountry: 'PT', returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow', merchantReturnDays: 14, returnMethod: 'https://schema.org/ReturnByMail', returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility' },
      ...(v.ate ? { priceValidUntil: v.ate } : {}),
    };
  }
  return {
    caminho,
    titulo: p.nome,
    descricao: resumir(`${p.resumo || textoSimples(p.descricao)}${v.atual !== null ? ` ${temSuplementos(p) ? 'Desde ' : ''}${euros(v.atual).replace(' ', ' ')}${porUnidade(p) ? ' / unidade' : ''}.` : ''} Feito à mão pela ${ctx.site.marca}.`, 160),
    tipo: 'product',
    partilha: ctx.manifesto.partilha[p.slug],
    jsonld: [migalhasLd(ctx, [{ nome: 'Início', caminho: '/' }, { nome: 'Loja', caminho: '/loja/' }, { nome: c.titulo, caminho: `/loja/${c.slug}/` }, { nome: p.nome, caminho }]), ldProduto],
    conteudo,
  };
}

function video(ctx, p) {
  const poster = ctx.manifesto.posters[`video-${p.video}`];
  const posterUrl = poster ? ` poster="${ctx.asset(`img/video-${p.video}-${poster.resumo}-${poster.larguras.at(-1)}.webp`)}"` : '';
  return `<figure class="galeria__foto galeria__foto--video"><video controls muted playsinline preload="none"${posterUrl}${poster ? ` width="${poster.largura}" height="${poster.altura}"` : ''} aria-label="Vídeo sem som: ${esc(p.nome)}"><source src="${ctx.asset(ctx.ficheiros.videos[p.video])}" type="video/mp4"></video></figure>`;
}

// ---------------------------------------------------------------- a encomenda
/* A ENCOMENDA (o saco do cabeçalho). Não há pagamentos no site: as peças (com a personalização), as
   quantidades, a entrega, o nome e a morada seguem pelo WhatsApp, numa mensagem já escrita
   (carrinho.js). Antes do botão, o que a lei pede que se saiba antes de encomendar (DL 24/2014,
   art. 4.º): o prazo, o pagamento, os portes e que as peças personalizadas não têm livre resolução. */
export function encomenda(ctx) {
  const en = ctx.site.entrega || {};
  const zonas = en.zonas || [];
  const precoZona = (z) => (z.id === 'levantamento' ? 'Grátis' : Number.isFinite(en.portes?.[z.id]) ? euros(en.portes[z.id]) : 'a confirmar');
  const temTermos = ctx.existe('/termos-e-condicoes/');
  const conteudo = `${cabecaDePagina(ctx, { titulo: 'A sua encomenda' })}
<section class="encomenda" data-encomenda>
  <div class="contentor">
    <div class="encomenda__grelha" data-encomenda-cheia hidden>
      <div class="encomenda__pecas">
        <h2 class="so-leitor" id="t-pecas">As peças</h2>
        <ul class="linhas" role="list" aria-labelledby="t-pecas" data-linhas></ul>
        <a class="ligacao-seta encomenda__continuar" href="${ctx.url('/loja/')}">${ico('voltar')}<span>Continuar a ver a loja</span></a>
      </div>
      <form class="cartao-form" data-encomenda-form novalidate>
        <div data-por-enviar>
          <h2 class="cartao-form__titulo" id="t-encomenda">Entrega e dados</h2>
          <fieldset class="entregas">
            <legend>Como quer receber?</legend>
            ${zonas.map((z, i) => `<label class="entrega"><input type="radio" name="zona" value="${esc(z.id)}"${i === 0 ? ' checked' : ''}><span class="entrega__nome">${esc(z.curto)}</span><span class="entrega__preco">${precoZona(z)}</span></label>`).join('\n            ')}
          </fieldset>
          ${en.levantamento ? `<p class="campo__ajuda" data-so-levantamento>${esc(en.levantamento)}</p>` : ''}
          <div class="campo"><label for="e-nome">Nome <span class="campo__obrig" aria-hidden="true">*</span></label><input id="e-nome" name="nome" type="text" autocomplete="name" required maxlength="80"></div>
          <div data-so-envio hidden>
            <div class="campo"><label for="e-morada">Morada <span class="campo__obrig" aria-hidden="true">*</span></label><input id="e-morada" name="morada" type="text" autocomplete="address-line1" maxlength="160" data-obrigatorio-envio></div>
            <div class="campos-lado">
              <div class="campo"><label for="e-cp">Código postal <span class="campo__obrig" aria-hidden="true">*</span></label><input id="e-cp" name="codigoPostal" type="text" autocomplete="postal-code" maxlength="12" data-obrigatorio-envio></div>
              <div class="campo"><label for="e-local">Localidade <span class="campo__obrig" aria-hidden="true">*</span></label><input id="e-local" name="localidade" type="text" autocomplete="address-level2" maxlength="60" data-obrigatorio-envio></div>
            </div>
            <div class="campo" data-so-europa hidden><label for="e-pais">País <span class="campo__obrig" aria-hidden="true">*</span></label><input id="e-pais" name="pais" type="text" autocomplete="country-name" maxlength="60"></div>
          </div>
          <div class="campo"><label for="e-notas">Observações</label><textarea id="e-notas" name="notas" rows="3" maxlength="500"></textarea></div>
          <dl class="resumo" data-resumo aria-live="polite"></dl>
          <ul class="antes" role="list" aria-label="Antes de encomendar">
            <li>${ico('relogio')}<span><strong>Prazo:</strong> ${en.prazo ? esc(en.prazo) : ctx.marcador('quanto tempo leva a fazer e a entregar')}</span></li>
            <li>${ico('cartao')}<span><strong>Pagamento:</strong> ${en.pagamento ? esc(en.pagamento) : ctx.marcador('as formas de pagamento')}</span></li>
            <li>${ico('caixa')}<span>Os portes são por encomenda, não por peça.</span></li>
            <li>${ico('info')}<span>As peças personalizadas não têm direito de livre resolução.${temTermos ? ` <a href="${ctx.url('/termos-e-condicoes/')}">Termos e condições</a>` : ''}</span></li>
          </ul>
          <p class="juntar__erro" data-erro-encomenda role="alert" hidden></p>
          <button class="botao botao--verde botao--largo" type="submit">${ico('whatsapp')}<span>Encomendar pelo WhatsApp</span></button>
          <p class="cartao-form__nota">A encomenda fica feita quando a confirmarmos consigo pelo WhatsApp.</p>
        </div>
        <div class="enviada" data-enviada hidden>
          <span class="enviada__icone">${ico('certo')}</span>
          <h2 class="cartao-form__titulo" id="t-enviada" tabindex="-1">Encomenda enviada</h2>
          <p>Abrimos o WhatsApp com a sua encomenda<span data-enviada-quando></span>. Se ainda não a enviou, envie-a por lá: respondemos a confirmar.</p>
          <a class="botao botao--verde botao--largo" href="${ctx.whatsapp('')}" target="_blank" rel="noopener" data-continuar>${ico('whatsapp')}<span>Abrir o WhatsApp</span></a>
          <div class="enviada__mais">
            <button class="botao botao--contorno" type="button" data-alterar>Alterar a encomenda</button>
            <button class="botao botao--texto" type="button" data-esvaziar>Fazer outra encomenda</button>
          </div>
        </div>
      </form>
    </div>
    <div class="vazio" data-encomenda-vazia hidden>
      <span class="vazio__icone">${ico('saco')}</span>
      <p class="vazio__titulo">A encomenda está vazia.</p>
      ${botao(ctx.url('/loja/'), 'Ver a loja', { classe: 'botao botao--verde' })}
    </div>
    <p class="vazio" data-encomenda-carregar>A abrir a encomenda…</p>
    <noscript><p class="ficha__nota">A encomenda precisa de JavaScript. Pode sempre encomendar pelo <a href="${ctx.whatsapp('Olá! Gostava de fazer uma encomenda.')}">WhatsApp</a>.</p></noscript>
  </div>
</section>`;
  return { caminho: '/encomenda/', titulo: 'A sua encomenda', descricao: 'Reveja as peças, escolha a entrega e envie-nos a encomenda pelo WhatsApp.', conteudo, classe: 'pagina-encomenda', indexar: false };
}

// ---------------------------------------------------------------- favoritos
/* Os favoritos: os artigos marcados com o coração (no browser, «dreamart:favoritos»), desenhados pelo
   site.js a partir do catálogo. */
export function favoritos(ctx) {
  const conteudo = `${cabecaDePagina(ctx, { titulo: 'Favoritos' })}
<section class="vitrine">
  <div class="contentor">
    <ul class="grelha-artigos" role="list" data-favoritos-lista></ul>
    <div class="vazio" data-favoritos-vazio hidden>
      <span class="vazio__icone">${ico('coracao')}</span>
      <p class="vazio__titulo">Ainda sem favoritos.</p>
      <p>Toque no coração de uma peça para a guardar aqui.</p>
      ${botao(ctx.url('/loja/'), 'Ver a loja', { classe: 'botao botao--verde' })}
    </div>
    <noscript><p class="vazio">Os favoritos precisam de JavaScript.</p></noscript>
  </div>
</section>`;
  return { caminho: '/favoritos/', titulo: 'Favoritos', descricao: 'As peças que guardou com o coração.', conteudo, classe: 'pagina-favoritos', indexar: false };
}

// ---------------------------------------------------------------- páginas de texto
/* As páginas de texto (content/paginas/*.md): a cabeça com o título em Gilda e o arco dourado, e o
   texto numa coluna confortável de ler. Dois modelos próprios, escolhidos no cabeçalho do Markdown
   («modelo:»): «passos» (os passos numerados, ligados por um fio, e o resto em cartões) e
   «perguntas» (as perguntas abrem e fecham). */
const ICONE_DA_NOTA = { pagamento: 'cartao', prazos: 'relogio', prazo: 'relogio', levantamento: 'local', entrega: 'caixa', portes: 'caixa' };
const chaveDe = (t) => textoSimples(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
// O HTML do Markdown partido pelos <h2>: o que vem antes e cada secção (id, título, corpo).
function seccoes(html) {
  const partes = html.split(/(?=<h2[ >])/);
  const intro = partes.length && !partes[0].startsWith('<h2') ? partes.shift().trim() : '';
  return { intro, lista: partes.map((x) => {
    const m = /^<h2(?: id="([^"]*)")?>([\s\S]*?)<\/h2>([\s\S]*)$/.exec(x.trim());
    return m ? { id: m[1] || '', titulo: m[2], corpo: m[3].trim() } : { id: '', titulo: '', corpo: x };
  }) };
}
function comoPassos(html) {
  const { intro, lista } = seccoes(html);
  const numerado = (x) => /^\d+\.\s/.test(textoSimples(x.titulo));
  const passos = lista.filter(numerado);
  const notas = lista.filter((x) => !numerado(x) && x.corpo.replace(/<[^>]+>/g, '').trim());
  return `${intro ? `<div class="prosa prosa--intro">${intro}</div>` : ''}
    <ol class="etapas" role="list">${passos.map((x, i) => `<li class="etapa"><span class="etapa__numero" aria-hidden="true">${i + 1}</span><div class="etapa__texto prosa"><h2 id="${x.id}">${x.titulo.replace(/^\d+\.\s*/, '')}</h2>${x.corpo}</div></li>`).join('')}</ol>
    ${notas.length ? `<div class="notas">${notas.map((x) => { const i = ICONE_DA_NOTA[chaveDe(x.titulo)]; return `<section class="nota-cartao prosa">${i ? `<span class="nota-cartao__icone">${ico(i)}</span>` : ''}<h2 id="${x.id}">${x.titulo}</h2>${x.corpo}</section>`; }).join('')}</div>` : ''}`;
}
function comoPerguntas(html) {
  const { intro, lista } = seccoes(html);
  return `${intro ? `<div class="prosa prosa--intro">${intro}</div>` : ''}
    <div class="perguntas">${lista.map((x) => `<details class="pergunta"><summary><h2 class="pergunta__titulo" id="${x.id}">${x.titulo}</h2><span class="pergunta__sinal" aria-hidden="true">${ico('mais')}</span></summary><div class="pergunta__resposta prosa">${x.corpo}</div></details>`).join('')}</div>`;
}

export function texto(ctx, pag) {
  const legal = Boolean(pag.atualizado);
  const data = legal ? `Atualizado a ${new Date(`${pag.atualizado}T12:00:00Z`).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Lisbon' })}` : '';
  const corpo = pag.modelo === 'passos' ? comoPassos(pag.html) : pag.modelo === 'perguntas' ? comoPerguntas(pag.html) : `<div class="prosa">${pag.html}</div>`;
  const comFoto = pag.foto && ctx.manifesto.fotos[pag.foto];
  const conteudo = `${cabecaDePagina(ctx, { titulo: pag.titulo, sub: pag.subtitulo ? `<p>${esc(pag.subtitulo)}</p>` : '', data })}
<section class="leitura${pag.modelo ? ` leitura--${esc(pag.modelo)}` : ''}${comFoto ? ' leitura--foto' : ''}">
  <div class="contentor leitura__grelha">
    ${comFoto ? `<figure class="arco-foto leitura__foto">${imagem(ctx, pag.foto, { tamanhos: '(min-width: 900px) 360px, min(calc(78vw - 16px), 330px)', prioridade: true, ate: 960, moldura: 0.8 })}</figure>` : ''}
    <article class="leitura__texto">
      ${corpo}
      ${legal ? '' : `<p class="leitura__fim">${botao(ctx.url('/loja/'), 'Ver a loja', { classe: 'botao botao--contorno' })}</p>`}
    </article>
  </div>
</section>`;
  return {
    caminho: pag.caminho,
    titulo: pag.tituloSeo || pag.titulo,
    descricao: resumir(pag.descricao || textoSimples(pag.html.replace(/<[^>]+>/g, ' '))),
    indexar: pag.indexar,
    jsonld: [migalhasLd(ctx, [{ nome: 'Início', caminho: '/' }, { nome: pag.titulo, caminho: pag.caminho }])],
    classe: `pagina-texto${legal ? ' pagina-legal' : ''}`,
    conteudo,
  };
}

/* Os contactos: o WhatsApp à cabeça, num cartão verde com o botão (é por lá que se combinam as
   encomendas; só a ligação, sem o número), e os outros caminhos numa lista. O telefone com a nota da
   chamada, pequena e entre parênteses (DL 59/2021). */
export function contactos(ctx) {
  const c = ctx.site.contactos;
  const e = ctx.site.empresa || {};
  const tel = numeroPortugues(c.telefone);
  const linha = (icone, nome, corpo) => `<li class="contacto"><span class="contacto__icone">${ico(icone)}</span><div><h2 class="contacto__nome">${nome}</h2>${corpo}</div></li>`;
  const outros = [];
  if (tel) outros.push(linha('telefone', 'Telefone', `<p><a href="tel:+351${tel}">${esc(numeroLegivel(tel))}</a> ${notaChamada(tel)}</p>`));
  if (c.email) outros.push(linha('carta', 'Email', `<p><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></p>`));
  if (c.instagram) outros.push(linha('instagram', 'Instagram', `<p><a href="https://www.instagram.com/${esc(c.instagram)}/" target="_blank" rel="noopener">@${esc(c.instagram)}</a></p>`));
  if (c.facebook) outros.push(linha('facebook', 'Facebook', `<p><a href="https://www.facebook.com/${esc(c.facebook)}" target="_blank" rel="noopener">${esc(ctx.site.marca)}</a></p>`));
  outros.push(linha('local', 'Onde estamos', `<p>${esc([e.localidade || ctx.site.local.localidade, e.concelho].filter(Boolean).join(', '))}</p>`));
  const principal = c.whatsapp
    ? `<div class="contactos__principal">
      <span class="contactos__icone">${ico('whatsapp')}</span>
      <h2 class="contactos__titulo">WhatsApp</h2>
      <p>É por aqui que combinamos as encomendas.</p>
      <a class="botao botao--creme" href="https://wa.me/${numeroWhatsApp(c.whatsapp)}" target="_blank" rel="noopener">${ico('whatsapp')}<span>Enviar mensagem</span></a>
    </div>` : '';
  const conteudo = `${cabecaDePagina(ctx, { titulo: 'Contactos', sub: '<p>Fale connosco como preferir.</p>' })}
<section class="contactos">
  <div class="contentor contactos__grelha">
    ${principal}
    <ul class="contactos__lista" role="list">${outros.join('')}</ul>
  </div>
</section>`;
  return {
    caminho: '/contactos/',
    titulo: 'Contactos',
    descricao: resumir(`Fale com a ${ctx.site.marca}: WhatsApp, ${tel ? 'telefone, ' : ''}email, Instagram e Facebook. ${ctx.site.local.localidade}, ${e.concelho || ctx.site.local.distrito}.`),
    jsonld: [migalhasLd(ctx, [{ nome: 'Início', caminho: '/' }, { nome: 'Contactos', caminho: '/contactos/' }]), organizacao(ctx)],
    conteudo,
  };
}

export function erro404(ctx) {
  const conteudo = `${cabecaDePagina(ctx, { titulo: 'Esta página não existe', sub: '<p>Pode ter mudado de sítio, ou o endereço tem um erro.</p>' })}
<section class="separadores separadores--erro" aria-label="Separadores">
  <div class="contentor">
    ${circulos(ctx, { titulo: 'p' })}
    <p class="lembrancas__mais">${botao(ctx.url('/loja/'), 'Ver toda a loja', { classe: 'botao botao--verde' })}</p>
  </div>
</section>`;
  return { caminho: '/404.html', titulo: 'Página não encontrada', descricao: 'Esta página não existe.', conteudo, indexar: false };
}
