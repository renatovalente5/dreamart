#!/usr/bin/env node
// Gera o site da Dream Art em _site/, a partir de content/ e media/. Node 22, sem dependências.
// O aspeto é o da proposta A, «Verde da marca» (escolhida pelo Renato a 9 nov 2026); por baixo, a
// infraestrutura de sempre: as regras dos dados (src/lib/regras.mjs, as mesmas do painel), as
// imagens do scripts/imagens.py, a biblioteca legal-comum e as guardas do fim.
//
//   node scripts/build.mjs                       local, em http://localhost:4880/
//   node scripts/build.mjs --base=/dreamart      pré-visualização no GitHub Pages
//   node scripts/build.mjs --dominio             o domínio (dreamart.pt, na Cloudflare) ANTES de
//                                                abrir: na raiz, com o _headers, mas fechado aos
//                                                motores de busca e com o que falta «[por confirmar]»
//   node scripts/build.mjs --producao            o domínio aberto: aos motores de busca, e RECUSA
//                                                publicar com dados legais por preencher
//   node scripts/build.mjs --sem-imagens         não corre o scripts/imagens.py (usa a cache)
//
// Os textos que a lei manda ter certos (identificação, NIF, morada, contactos, prazos) vêm todos
// de content/site.json por marcadores ({{email}}, {{empresa.identificacao}}…): nunca escritos à
// mão nas páginas, para não envelhecerem num sítio e ficarem certos noutro.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { esc, euros, hojeEmLisboa, markdown, numeroWhatsApp, numeroLegivel, notaChamada, moradaCompleta, textoSimples } from '../src/templates/util.mjs';
import { pagina, reencaminhar } from '../src/templates/layout.mjs';
import * as R from '../src/lib/regras.mjs';
import * as paginas from '../src/templates/paginas.mjs';
import { pecaLegal, separadoresComArtigos, nomeDoSeparador } from '../src/templates/componentes.mjs';
import { NOMES_ICONES } from '../src/templates/icones.mjs';
/* As peças legais comuns aos sites do Renato (a cópia em legal-comum/; não se edita aqui): o CSS do
   Livro de Reclamações, os destinatários da política de privacidade, as guardas da identificação,
   das promoções e das fichas, e a conta do contraste. */
import { livroCss, destinatariosHtml, CATALOGO_DESTINATARIOS, frasesPrivacidade, prazos as PRAZOS_LEGAIS, verificarIdentificacao, verificarPromocao, verificarProduto, contraste, VERSAO as LEGAL_COMUM_VERSAO } from '../legal-comum/index.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
// --conteudo=<pasta> e --saida=<pasta>: para as baterias e o ensaio do painel gerarem o site a
// partir de outro conteúdo (o media/, os modelos e a cache das imagens são sempre os daqui).
const CONTEUDO = path.resolve(args.find((a) => a.startsWith('--conteudo='))?.slice(11) || path.join(RAIZ, 'content'));
const SAIDA = path.resolve(args.find((a) => a.startsWith('--saida='))?.slice(8) || path.join(RAIZ, '_site'));
const producao = args.includes('--producao');
const dominio = producao || args.includes('--dominio');   // na raiz de dreamart.pt (aberto ou ainda não)
const base = dominio ? '' : (args.find((a) => a.startsWith('--base='))?.slice(7) || '').replace(/\/$/, '');
const semImagens = args.includes('--sem-imagens');

// O domínio (aprovado pela cliente a 8 nov 2026; o Renato compra-o no fim): o canonical, o sitemap
// e os cartões de partilha seguem-no em produção.
const DOMINIO = 'dreamart.pt';
const ORIGEM = dominio ? `https://${DOMINIO}` : (base ? 'https://renatovalente5.github.io' : 'http://localhost:4880');

const erros = [];
const avisos = [];
// NO GITHUB ACTIONS, CADA PROBLEMA VAI TAMBÉM COMO ANOTAÇÃO (::error / ::warning): é o que o painel
// lê para dizer à dona porque é que a publicação parou («Dados da loja › Contactos: falta o
// email»), com a ligação para o ecrã onde se corrige. O título é o ecrã («A › B: mensagem»).
const NO_CI = process.env.GITHUB_ACTIONS === 'true';
const escaparDados = (s) => String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const escaparPropriedade = (s) => escaparDados(s).replace(/:/g, '%3A').replace(/,/g, '%2C');
function anotar(nivel, texto) {
  if (!NO_CI) return;
  const m = /^([^:]{3,80}?): (.+)$/s.exec(String(texto));
  console.log(m ? `::${nivel} title=${escaparPropriedade(m[1])}::${escaparDados(m[2])}` : `::${nivel}::${escaparDados(texto)}`);
}
/** Pára a publicação: a lista no registo e, no CI, uma anotação por problema (10 no máximo: o
 *  GitHub não guarda mais por passo; a lista inteira calcula-a o painel). `tecnico`: um defeito do
 *  gerador, e não do conteúdo — a anotação di-lo, e o painel manda falar com o Renato. */
function parar(titulo, lista, { tecnico = false } = {}) {
  console.error(`\n${titulo}\n`);
  for (const e of lista) console.error(`  ✗ ${e}`);
  for (const e of [...new Set(lista)].slice(0, 10)) anotar('error', tecnico ? `${e} (Só o Renato pode corrigir.)` : e);
  process.exit(1);
}
const existe = (rel) => fs.existsSync(path.join(RAIZ, rel));

// ---------------------------------------------------------------- conteúdo e regras
// As regras dos dados estão em src/lib/regras.mjs, o MESMO ficheiro que o painel usa (cópia byte a
// byte): o que o painel deixa gravar é o que a publicação aceita. Classes: «bloqueia» pára a
// publicação; «neutraliza» esconde só aquele artigo (ou tira-lhe a fotografia que falta) na cópia
// que o gerador lê; «avisa» só avisa.
// Os ficheiros de uma pasta com a extensão dada, sem a extensão; uma pasta que não existe (o git não
// guarda pastas vazias: media/video/ sem vídeos não chega ao CI) é uma lista vazia.
const listar = (rel, ext) => (fs.existsSync(path.join(RAIZ, rel)) ? fs.readdirSync(path.join(RAIZ, rel)).filter((f) => f.endsWith(ext)).map((f) => f.slice(0, -ext.length)) : []);
const lerTexto = (rel) => fs.readFileSync(path.join(CONTEUDO, rel.replace(/^content\//, '')), 'utf8');
const dadosRegras = {
  site: lerTexto('content/site.json'),
  inicio: lerTexto('content/inicio.json'),
  categorias: lerTexto('content/categorias.json'),
  fotos: lerTexto('content/fotos.json'),
  artigos: Object.fromEntries(fs.readdirSync(path.join(CONTEUDO, 'produtos')).filter((f) => f.endsWith('.json')).map((f) => [f.slice(0, -5), lerTexto(`content/produtos/${f}`)])),
  ficheirosFotos: fs.readdirSync(path.join(RAIZ, 'media/fotos')).filter((f) => f.endsWith('.jpg')).map((f) => f.slice(0, -4)),
  videos: listar('media/video', '.mp4'),
};
const hoje = hojeEmLisboa();
const listaRegras = R.problemas(dadosRegras, { hoje, producao });
for (const p of listaRegras.filter((x) => x.classe === 'bloqueia')) erros.push(`${p.ecra}: ${p.mensagem}`);
for (const p of listaRegras.filter((x) => x.classe === 'avisa')) avisos.push(`${p.ecra}: ${p.mensagem}`);
if (erros.length) parar(`A publicação parou: ${erros.length} ${erros.length === 1 ? 'problema' : 'problemas'} no conteúdo.`, erros);
const neutro = R.neutralizar(dadosRegras, listaRegras);
for (const e of neutro.efeitos) {
  avisos.push(`Artigos › ${e.nome}: ${R.descreverEfeitos(e)} (${e.motivos.join(' ')})`);
  anotar('warning', `Artigos › ${e.nome}: ${R.descreverEfeitos(e)}.`);
}

const site = JSON.parse(dadosRegras.site);
const inicio = JSON.parse(dadosRegras.inicio);
const categorias = JSON.parse(dadosRegras.categorias);
const fotos = JSON.parse(dadosRegras.fotos);
const ordemSep = (p) => { const i = categorias.findIndex((c) => c.slug === p.categoria); return i < 0 ? 999 : i; };
// Os artigos como o gerador os lê: a cópia neutralizada (um artigo com problemas sai escondido).
const produtos = Object.entries(neutro.artigos)
  .map(([slug, a]) => ({ slug, ...a }))
  .filter((p) => p.publicado !== false && Array.isArray(p.fotos) && p.fotos.length)
  // pela posição na lista e, com a mesma posição, pela ordem dos separadores: «Tudo» abre com a
  // primeira peça de cada separador
  .sort((a, b) => (a.ordem ?? 999) - (b.ordem ?? 999) || ordemSep(a) - ordemSep(b) || a.nome.localeCompare(b.nome, 'pt'));
const fotoExiste = (f) => fotos[f] && dadosRegras.ficheirosFotos.includes(f);

// ---------------------------------------------------------------- as guardas legais (só avisam)
/* As guardas da biblioteca legal-comum, em modo AVISAR: nada pára nem se esconde por elas; o que
   dizem vai para os avisos do registo da publicação, para o Renato ver. A identificação (DL 7/2004,
   art. 10.º), as promoções (DL 70/2007, art. 5.º) e as fichas (Regulamento (UE) 2023/988, art. 19.º;
   CLP nas velas e no gesso perfumado; composição nas toalhas). */
{
  const e = site.empresa || {};
  const FORMAS = [[/nome individual|\beni\b/i, 'eni'], [/unipessoal/i, 'unipessoal'], [/\blda\b|limitada/i, 'lda'], [/\bs\.?\s?a\b|an[óo]nima/i, 'sa']];
  const forma = FORMAS.find(([re]) => re.test(e.tipo || ''))?.[1] || (!e.nif ? 'sem-actividade' : undefined);
  const r = verificarIdentificacao({
    nome: e.nome, formaJuridica: forma, nif: e.nif,
    morada: [e.morada, [e.codigoPostal, e.localidade].filter(Boolean).join(' ')].filter(Boolean).join(', '),
    email: site.contactos?.email, telefone: site.contactos?.telefone || site.contactos?.whatsapp,
  }, { modo: 'avisar', ecra: 'Dados da loja › Dados legais' });
  for (const p of r.problemas) avisos.push(`Identificação (${p.campo}): ${p.mensagem}`);
}
for (const p of produtos) {
  if (typeof p.precoAnterior === 'number' && typeof p.preco === 'number' && p.precoAnterior > p.preco) {
    const r = verificarPromocao({ precoAntes: p.precoAnterior, precoAgora: p.preco, inicio: p.promocaoDesde, fim: p.promocaoAte, historico: [] }, { modo: 'avisar' });
    for (const x of r.problemas) avisos.push(`Promoção › ${p.nome}: ${x.mensagem}`);
  }
  const e = site.empresa || {};
  const fab = paginas.fabricanteDoArtigo(p) || { nome: e.nome, morada: [e.morada, e.codigoPostal, e.localidade].filter(Boolean).join(', '), email: site.contactos?.email };
  const texto = `${p.nome} ${(p.inclui || []).join(' ')}`;
  const categoria = /\btoalhas?\b/i.test(texto) ? 'textil' : /^vel(as?|inhas?)\b|gesso perfumado|fragr[âa]ncia/i.test(p.nome) ? 'mistura-clp' : 'geral';
  const r = verificarProduto({ nome: p.nome, preco: p.preco, fabricante: fab, referencia: p.referencia, avisos: paginas.avisosDoArtigo(p), perigos: paginas.perigosDoArtigo(p), composicao: p.composicao }, { categoria, modo: 'avisar' });
  for (const x of r.problemas) avisos.push(`Ficha › ${p.nome}: ${x.mensagem}`);
}

// As páginas de texto (content/paginas/*.md) são do Renato, menos a «Sobre nós» (sobre-nos.md), que a
// Dream Art edita no painel (com as mesmas guardas no browser e no Worker do painel).
// Conferem-se aqui as alegações.
for (const f of fs.readdirSync(path.join(CONTEUDO, 'paginas'))) {
  const t = lerTexto(`content/paginas/${f}`);
  const m = t.match(R.RE_ALEGACOES);
  if (m) erros.push(`Páginas › ${f}: «${m[0]}» é uma alegação que a lei só deixa fazer com prova (ou uma certificação que não temos). Tire a palavra.`);
}
// cada ícone da faixa de confiança tem desenho (regras.mjs, ICONES_CONFIANCA ↔ icones.mjs)
const semDesenho = R.ICONES_CONFIANCA.filter((i) => !NOMES_ICONES.includes(i));
if (semDesenho.length) erros.push(`Gerador: os ícones ${semDesenho.join(', ')} da faixa de confiança não têm desenho em src/templates/icones.mjs`);
if (erros.length) parar(`A publicação parou: ${erros.length} ${erros.length === 1 ? 'problema' : 'problemas'} no conteúdo.`, erros);

// ---------------------------------------------------------------- os contrastes da paleta
/* As cores da proposta A, medidas aqui e não a olho (memória contraste-mede-se-nao-se-olha): o texto
   a 4,5:1 e os contornos dos campos a 3:1. Lêem-se do :root do site.css: mudar uma cor e falhar o
   mínimo pára a construção. */
const CSS_FONTE = fs.readFileSync(path.join(RAIZ, 'src/estilos/site.css'), 'utf8');
{
  const raiz = CSS_FONTE.slice(CSS_FONTE.indexOf(':root {'), CSS_FONTE.indexOf('}', CSS_FONTE.indexOf(':root {')));
  const cor = Object.fromEntries([...raiz.matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6})\b/g)].map((m) => [m[1], m[2]]));
  const PARES = [
    ['tinta', 'creme', 4.5], ['tinta', 'branco', 4.5], ['tinta-2', 'creme', 4.5], ['tinta-2', 'branco', 4.5], ['tinta-2', 'salvia', 4.5],
    ['verde', 'creme', 4.5], ['verde', 'branco', 4.5], ['verde', 'salvia', 4.5], ['creme', 'verde', 4.5], ['creme-no-verde', 'verde', 4.5],
    ['creme-no-verde', 'verde-fundo', 4.5], ['creme', 'verde-fundo', 4.5], ['creme', 'tinta', 4.5], ['erro', 'branco', 4.5], ['tinta', 'marcador', 4.5],
    ['linha-campo', 'branco', 3], ['linha-campo', 'creme', 3],
  ];
  const falham = [];
  for (const [a, b, min] of PARES) {
    if (!cor[a] || !cor[b]) { falham.push(`Gerador: a cor --${!cor[a] ? a : b} não está no :root do site.css`); continue; }
    const r = contraste(cor[a], cor[b]);
    if (r < min) falham.push(`Gerador: --${a} sobre --${b} tem ${r}:1 (o mínimo é ${min}:1)`);
  }
  if (falham.length) parar('A publicação parou: as cores do site não têm contraste que chegue.', falham, { tecnico: true });
}

// ---------------------------------------------------------------- imagens
if (!semImagens) execFileSync('python3', [path.join(RAIZ, 'scripts/imagens.py')], { stdio: 'inherit' });
const manifesto = JSON.parse(fs.readFileSync(path.join(RAIZ, '.cache/imagens/manifesto.json'), 'utf8'));
/* Só as que têm ficheiro: uma descrição sem fotografia (sobra de uma mudança à mão) não faz mal a
   nada, e o gerador nunca a usa (fotoExiste pede as duas coisas). */
const semVersoes = Object.keys(fotos).filter((f) => dadosRegras.ficheirosFotos.includes(f) && !manifesto.fotos[f]);
if (semVersoes.length) parar('A publicação parou: faltam as versões web de fotografias.', semVersoes.map((f) => `Fotografias: «${f}» não tem as versões web (scripts/imagens.py)`), { tecnico: true });
if (!manifesto.logo) parar('A publicação parou: falta o logótipo.', ['Gerador: media/marca/logo.png não tem as versões pequenas (scripts/imagens.py)'], { tecnico: true });

// ---------------------------------------------------------------- saída
fs.rmSync(SAIDA, { recursive: true, force: true });
fs.mkdirSync(path.join(SAIDA, 'assets/img'), { recursive: true });
const copiar = (de, para) => { fs.mkdirSync(path.dirname(para), { recursive: true }); fs.copyFileSync(de, para); };
const resumo = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 10);

// as imagens todas da cache (as versões web, os cartões de partilha, o logótipo e as miniaturas que o
// painel mostra, assets/img/miniatura-<nome>.webp)
for (const f of fs.readdirSync(path.join(RAIZ, '.cache/imagens'))) {
  if (f !== 'manifesto.json' && !f.endsWith('.resumo')) copiar(path.join(RAIZ, '.cache/imagens', f), path.join(SAIDA, 'assets/img', f));
}
for (const f of fs.readdirSync(path.join(RAIZ, 'src/fontes'))) copiar(path.join(RAIZ, 'src/fontes', f), path.join(SAIDA, 'assets/fontes', f));

// o aviso oficial da garantia: byte a byte o da Comissão (media/legal/LEIA.md)
const AVISO_SHA = {
  'aviso-garantia-legal-pt.svg': '9069bb0bc5e9f3cf655579038be5646181cc5447a25f3f8ccf2d018eacba0ac1',
  'aviso-garantia-legal-pt.pdf': 'b145a3014984f474d9bb81c60b5a492a376e64e55695eb089f0554adaa752877',
};
for (const [f, sha] of Object.entries(AVISO_SHA)) {
  const buf = fs.readFileSync(path.join(RAIZ, 'media/legal', f));
  if (crypto.createHash('sha256').update(buf).digest('hex') !== sha) parar('A publicação parou: o aviso da garantia foi alterado.', [`Garantia: media/legal/${f} foi alterado, e o aviso oficial da garantia não se pode editar`], { tecnico: true });
  copiar(path.join(RAIZ, 'media/legal', f), path.join(SAIDA, 'assets/legal', f));
}
const AVISO_ALT = 'GARANTIA LEGAL. Proteção da garantia legal mínima de dois anos para os bens vendidos na União Europeia. Os consumidores podem invocar os seus direitos ao abrigo da garantia legal de conformidade, por exemplo, se os bens: não corresponderem à descrição; não funcionarem como previsto. Os vendedores são responsáveis por qualquer falta de conformidade que exista no momento em que os bens forem entregues e se manifeste no período de garantia legal. Os vendedores nessa situação estão obrigados a oferecer: reparação gratuita ou substituição gratuita; em alguns casos, redução do preço ou reembolso integral. Alguns países têm um período de garantia legal mais longo. Para os bens em segunda mão, pode aplicar-se um período mais curto, mas não inferior a um ano. Para mais informações sobre os seus direitos num determinado país, digitalize o código QR abaixo ou consulte o vendedor. europa.eu/youreurope/garantias. O que fazer se receber bens não conformes: 1. Contactar o vendedor o mais rapidamente possível para expor o problema; 2. Apresentar uma prova de compra, como um recibo, uma fatura ou um extrato bancário. Os vendedores e os produtores também podem oferecer garantias comerciais, que se aplicam independentemente da garantia legal. Por exemplo, pode ver este rótulo GARAN, que representa uma garantia comercial de durabilidade oferecida pelo produtor sem custos adicionais e cobrindo a totalidade do bem.';

// os vídeos das fichas (media/video/): nome com resumo, para a cache de um ano nunca servir um antigo
const ficheirosVideo = {};
for (const nome of listar('media/video', '.mp4')) {
  const buf = fs.readFileSync(path.join(RAIZ, 'media/video', `${nome}.mp4`));
  ficheirosVideo[nome] = `video/${nome}-${resumo(buf)}.mp4`;
  copiar(path.join(RAIZ, 'media/video', `${nome}.mp4`), path.join(SAIDA, 'assets', ficheirosVideo[nome]));
}

// CSS e JS: um ficheiro cada, com o resumo no nome
/* A folha de estilos leva primeiro o CSS do Livro de Reclamações da biblioteca legal-comum (a variante
   discreta, .lr-discreto): as regras do rodapé vêm depois e ganham, e o Livro fica com a letra e a cor
   das ligações vizinhas. */
const css = Buffer.from(`/* legal-comum v${LEGAL_COMUM_VERSAO}: o Livro de Reclamações */\n${livroCss()}\n${CSS_FONTE}`);
const ORDEM_JS = ['nucleo.js', 'interface.js', 'carrinho.js', 'favoritos.js', 'procura.js', 'juntar.js'];
const soltos = fs.readdirSync(path.join(RAIZ, 'src/scripts')).filter((f) => f.endsWith('.js') && !ORDEM_JS.includes(f));
if (soltos.length) parar('A publicação parou: há scripts fora da lista.', soltos.map((f) => `Gerador: src/scripts/${f} não está em ORDEM_JS (scripts/build.mjs)`), { tecnico: true });
const js = Buffer.from(ORDEM_JS.map((f) => `// ${f}\n${fs.readFileSync(path.join(RAIZ, 'src/scripts', f), 'utf8')}`).join('\n'));
const ficheiros = { css: `site-${resumo(css)}.css`, js: `site-${resumo(js)}.js`, videos: ficheirosVideo };
fs.writeFileSync(path.join(SAIDA, 'assets', ficheiros.css), css);
fs.writeFileSync(path.join(SAIDA, 'assets', ficheiros.js), js);

// ---------------------------------------------------------------- as páginas que vão existir
/* Antes de escrever: a lista dos caminhos. Uma ligação do conteúdo (a capa, o aviso) para uma
   página que não vai existir (um separador sem artigos) muda-se para a loja, em vez de partir. */
const PAGINAS_MD = fs.readdirSync(path.join(CONTEUDO, 'paginas')).filter((x) => x.endsWith('.md'));
const comArtigos = categorias.filter((c) => produtos.some((p) => p.categoria === c.slug));
const caminhos = new Set([
  '/', '/loja/', '/encomenda/', '/favoritos/', '/contactos/',
  ...comArtigos.map((c) => `/loja/${c.slug}/`),
  ...produtos.map((p) => `/produtos/${p.slug}/`),
  ...PAGINAS_MD.map((f) => `/${f.replace(/\.md$/, '')}/`),
]);

// ---------------------------------------------------------------- contexto dos modelos
const numero = numeroWhatsApp(site.contactos.whatsapp);
const ctx = {
  site, inicio, categorias, produtos, fotos, manifesto, hoje, producao, ficheiros,
  url: (c) => (/^https?:|^mailto:|^tel:|^#/.test(c) ? c : `${base}${c}`),
  asset: (rel) => `${base}/assets/${rel}`,
  absoluto: (c) => `${ORIGEM}${base}${c}`,
  existe: (c) => caminhos.has(String(c || '').split(/[?#]/)[0]),
  // o wa.me com a mensagem já escrita (sem texto, só a conversa)
  whatsapp: (texto) => `https://wa.me/${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`,
  marcador: (desc) => `<mark class="por-confirmar">[por confirmar: ${esc(desc)}]</mark>`,
};
for (const d of Array.isArray(inicio.capa) ? inicio.capa : []) {
  if (d && d.ligacao && !ctx.existe(d.ligacao)) avisos.push(`Página inicial › A capa: o botão «${d.botao}» leva a ${d.ligacao}, que não existe (um separador sem artigos?): vai para a loja.`);
}

// ---------------------------------------------------------------- catálogo (encomenda, favoritos, procura)
/* O que o browser lê (assets/catalogo-*.json): os preços, as escolhas e os campos da personalização
   de cada artigo, a fotografia (as versões do imagens.py), o separador, as zonas e os portes. O
   carrinho nunca guarda preços: lê-os sempre daqui. */
const fotoDoCatalogo = (f) => {
  const m = manifesto.fotos[f];
  return { n: f, r: m.resumo, l: m.larguras, f: m.formatos, w: m.largura, h: m.altura, foco: fotos[f]?.foco || '50% 50%', alt: fotos[f]?.alt || '' };
};
const catalogo = {
  v: 2,
  marca: site.marca,
  whatsapp: numero,
  assets: ctx.asset(''),
  encomenda: ctx.url('/encomenda/'),
  loja: ctx.url('/loja/'),
  pagamento: site.entrega.pagamento || '',
  zonas: site.entrega.zonas.map((z) => ({ id: z.id, nome: z.nome, curto: z.curto, morada: z.morada === true })),
  portes: {
    ...Object.fromEntries(R.ZONAS_ENVIO.map((z) => [z, Number.isFinite(site.entrega.portes?.[z]) ? site.entrega.portes[z] : null])),
    gratisAPartirDe: Number.isFinite(site.entrega.portes?.gratisAPartirDe) ? site.entrega.portes.gratisAPartirDe : null,
  },
  produtos: Object.fromEntries(produtos.map((p) => {
    const c = categorias.find((k) => k.slug === p.categoria);
    return [p.slug, {
      nome: p.nome, curto: p.nomeCurto || p.nome, url: ctx.url(`/produtos/${p.slug}/`), resumo: p.resumo || '',
      sep: p.categoria, sepNome: c ? nomeDoSeparador(c) : '', sepTitulo: c ? c.titulo : '',
      preco: typeof p.preco === 'number' ? p.preco : null, precoAnterior: p.precoAnterior || null, promocaoAte: p.promocaoAte || '',
      desde: R.temSuplementos(p), opcoes: R.opcoesDe(p), pers: R.personalizacaoDe(p), minimo: R.quantidadeMinimaDe(p),
      img: fotoDoCatalogo(p.fotos[0]),
    }];
  })),
};
const catalogoBuf = Buffer.from(JSON.stringify(catalogo));
ficheiros.catalogo = `catalogo-${resumo(catalogoBuf)}.json`;
fs.writeFileSync(path.join(SAIDA, 'assets', ficheiros.catalogo), catalogoBuf);

// ---------------------------------------------------------------- marcadores das páginas de texto
/* Na pré-visualização, o que falta dizer leva a marca «[por confirmar: …]»; no domínio aberto, as
   regras já pararam a construção antes do que a lei pede, e o resto diz «a confirmar». */
const porConfirmar = (desc, emProducao = 'a confirmar') => (producao ? esc(emProducao) : ctx.marcador(desc));

/* Os portes da loja (por encomenda, não por peça), como frase: «Portugal Continental: 5,00 €; Madeira
   e Açores: …». O levantamento só diz o que a Dream Art escrever em entrega.levantamento (a cliente ainda
   não confirmou se o faz, nem em que condições: nada de «grátis» ou «sem custos» escrito por nós). */
function textoPortes() {
  const p = site.entrega.portes || {};
  const zonas = site.entrega.zonas.filter((z) => z.morada);
  const partes = zonas.map((z) => `${esc(z.curto)}: ${Number.isFinite(p[z.id]) ? euros(p[z.id]) : porConfirmar(`os portes para ${z.curto}`)}`);
  const gratis = Number.isFinite(p.gratisAPartirDe) ? ` Portes grátis em Portugal Continental a partir de ${euros(p.gratisAPartirDe)} em peças.` : '';
  const levantamento = site.entrega.zonas.find((z) => z.id === 'levantamento');
  const textoLevantamento = !levantamento ? '' : site.entrega.levantamento ? ` ${esc(site.entrega.levantamento)}` : producao ? '' : ` Levantamento em ${esc(site.local.localidade)}: ${ctx.marcador('se fazem levantamento e como se combina')}.`;
  return `${partes.join('; ')}.${gratis}${textoLevantamento}`;
}

function identificacao() {
  const e = site.empresa;
  const partes = [];
  partes.push(e.nome ? `<strong>${esc(e.nome)}</strong>` : ctx.marcador('o nome da empresa ou do empresário'));
  if (e.tipo) partes.push(esc(e.tipo.charAt(0).toLowerCase() + e.tipo.slice(1)));
  if (e.nif) partes.push(`NIF ${esc(e.nif)}`);
  const resto = moradaCompleta(e);
  if (e.morada) partes.push(`com morada em ${esc(resto)}`);
  else if (resto) partes.push(`com morada em ${producao ? esc(resto) : `${ctx.marcador('a rua e o número')}, ${esc(resto)}`}`);
  else partes.push(`com morada em ${ctx.marcador('a morada')}`);
  return `${partes.join(', ')}, que vende com a marca ${esc(site.marca)}.`;
}

function botoesDesistencia() {
  const texto = 'Olá! Quero desistir da compra (direito de livre resolução).\n\nArtigo: \nEncomendado em: \nRecebido em: \nNome: \nMorada: ';
  const b = [];
  if (numero) b.push(`<a class="botao botao--verde" href="${ctx.whatsapp(texto)}" target="_blank" rel="noopener">Desistir pelo WhatsApp</a>`);
  if (site.contactos.email) b.push(`<a class="botao botao--contorno" href="mailto:${esc(site.contactos.email)}?subject=${encodeURIComponent('Desistência da compra (livre resolução)')}&amp;body=${encodeURIComponent(texto)}">Desistir por email</a>`);
  return `<div class="botoes">${b.join('')}</div><p class="nota">Respondemos a confirmar que recebemos a sua desistência.</p>`;
}

/* Quem recebe dados (destinatariosHtml, da legal-comum). O GitHub (o repositório do site e a
   publicação) não cabe nas chaves da configuração (que só tem um alojamento): entra como linha a
   mais, com os dados do catálogo da biblioteca. */
const CONFIG_PRIVACIDADE = {
  alojamento: 'cloudflare', dns: 'cloudflare', email: 'google',
  whatsapp: true, instagram: true, facebookPage: true,
  manutencao: { nome: 'Renato Valente', papel: 'subcontratante' },
  repositorioPublico: true,
};
const TRANSFERENCIA = { DPF: 'EUA: consta da lista do Data Privacy Framework (decisão de adequação da Comissão Europeia)', UE: 'Sem transferência: os dados ficam na União Europeia' };
function destinatariosComExtras() {
  const d = CATALOGO_DESTINATARIOS.github;
  const extra = `<tr><td>${esc(d.nome)}</td><td>${esc('código do site e publicação automática (GitHub Actions): o painel grava lá as mudanças da loja; não leva dados de clientes')}</td><td>${esc(d.pais)}</td><td>${esc(TRANSFERENCIA[d.transferencia] || 'Por confirmar')}</td></tr>`;
  return destinatariosHtml(CONFIG_PRIVACIDADE).replace('</tbody>', `${extra}\n</tbody>`);
}

function resolverMarcadores(fonte, onde) {
  const c = site.contactos;
  const tokens = [];
  const guardar = (html) => { tokens.push(html); return `\u0000${tokens.length - 1}\u0000`; };
  const valores = {
    marca: () => esc(site.marca),
    localidade: () => esc(site.local.localidade),
    email: () => (c.email ? guardar(`<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`) : guardar(ctx.marcador('o email'))),
    // o WhatsApp só como ligação, sem o número (o Renato, 17 out 2026); o telefone com o número e a nota
    whatsapp: () => (c.whatsapp ? guardar(`<a href="https://wa.me/${numero}" target="_blank" rel="noopener">WhatsApp</a>`) : guardar(`WhatsApp ${ctx.marcador('o número')}`)),
    telefone: () => (R.numeroPortugues(c.telefone) ? guardar(`<a href="tel:+351${R.numeroPortugues(c.telefone)}">${esc(numeroLegivel(c.telefone))}</a> ${notaChamada(c.telefone)}`) : guardar(ctx.marcador('o telefone'))),
    'empresa.identificacao': () => guardar(identificacao()),
    'empresa.iva': () => (site.empresa.iva ? esc(site.empresa.iva) : guardar(porConfirmar('se os preços incluem IVA ou se há isenção', ''))),
    prazo: () => (site.entrega.prazo ? esc(site.entrega.prazo) : guardar(ctx.marcador('quanto tempo leva a fazer e a entregar uma peça'))),
    pagamento: () => (site.entrega.pagamento ? esc(site.entrega.pagamento) : guardar(ctx.marcador('as formas de pagamento (MB WAY, transferência, no levantamento…)'))),
    levantamento: () => (site.entrega.levantamento ? esc(site.entrega.levantamento) : guardar(porConfirmar('se fazem levantamento em Rio Tinto e como se combina', ''))),
    portes: () => guardar(textoPortes()),
    botoesDesistencia: () => guardar(botoesDesistencia()),
    /* A política de privacidade (RGPD, art. 13.º), pela biblioteca legal-comum: os destinatários reais,
       os prazos, e as frases da Meta e do repositório público. */
    'privacidade.destinatarios': () => guardar(pecaLegal('privacidade-destinatarios', `<div class="quadro" tabindex="0" role="region" aria-label="Quem recebe os dados">${destinatariosComExtras()}</div>`)),
    'privacidade.prazos': () => guardar(pecaLegal('privacidade-prazos', `<ul>${[
      'Pedidos de informação que não chegam a encomenda: 12 meses depois da última mensagem.',
      'Conversas e dados de uma encomenda: enquanto forem precisos para ela e para a garantia, até 3 anos depois da entrega.',
      'Faturas e dados de faturação: 10 anos, por obrigação fiscal (artigo 52.º do Código do IVA).',
      PRAZOS_LEGAIS.registosTecnicos.texto,
    ].map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`)),
    'privacidade.frases': () => guardar(pecaLegal('privacidade-frases', frasesPrivacidade(CONFIG_PRIVACIDADE).map((t) => `<p>${esc(t)}</p>`).join(''))),
    avisoGarantia: () => guardar(`<figure class="aviso-garantia"><img src="${ctx.asset('legal/aviso-garantia-legal-pt.svg')}" width="600" height="848" alt="${esc(AVISO_ALT)}" loading="lazy" decoding="async"><figcaption><a href="${ctx.asset('legal/aviso-garantia-legal-pt.pdf')}">Descarregar o aviso oficial (PDF)</a> · <a href="https://europa.eu/youreurope/garantias" target="_blank" rel="noopener">europa.eu/youreurope/garantias</a></figcaption></figure>`),
  };
  const texto = fonte.replace(/\{\{([\w.]+)\}\}/g, (todo, chave) => {
    if (!valores[chave]) { erros.push(`${onde}: o marcador «${todo}» não existe (existem: ${Object.keys(valores).join(', ')})`); return todo; }
    return valores[chave]();
  });
  return { texto, tokens };
}

function paginaMarkdown(ficheiro) {
  const fonte = fs.readFileSync(path.join(CONTEUDO, 'paginas', ficheiro), 'utf8');
  const [cabeca, ...corpo] = fonte.split(/\n---\n/);
  const meta = Object.fromEntries(cabeca.split('\n').filter(Boolean).map((l) => { const i = l.indexOf(':'); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
  const { texto, tokens } = resolverMarcadores(corpo.join('\n---\n'), `Páginas › ${ficheiro}`);
  // um marcador sozinho num parágrafo (quadro, figura, botões) sai do <p> que o Markdown lhe põe
  let html = markdown(texto, ctx.url).replace(/<p>\u0000(\d+)\u0000<\/p>/g, (_, i) => tokens[Number(i)]);
  html = html.replace(/\u0000(\d+)\u0000/g, (_, i) => tokens[Number(i)]);
  const slug = ficheiro.replace(/\.md$/, '');
  if (meta.foto && !fotoExiste(meta.foto)) erros.push(`Páginas › ${ficheiro}: a fotografia «${meta.foto}» não existe`);
  // «indexar: não» no cabeçalho tira a página do Google (noindex e fora do sitemap); continua no site
  const indexar = !/^(n[ãa]o|false)$/i.test(meta.indexar || '');
  return { caminho: `/${slug}/`, titulo: meta.titulo, tituloSeo: meta.tituloSeo, subtitulo: meta.subtitulo, modelo: meta.modelo, descricao: meta.descricao, atualizado: meta.atualizado, foto: meta.foto && fotoExiste(meta.foto) ? meta.foto : '', indexar, html };
}

// ---------------------------------------------------------------- páginas
const saidas = [];
saidas.push(paginas.inicio(ctx));
saidas.push(paginas.loja(ctx));
for (const c of comArtigos) saidas.push(paginas.loja(ctx, c.slug));   // os separadores vazios não têm página
for (const p of produtos) saidas.push(paginas.produto(ctx, p));
saidas.push(paginas.encomenda(ctx));
saidas.push(paginas.favoritos(ctx));
saidas.push(paginas.contactos(ctx));
for (const f of PAGINAS_MD) saidas.push(paginas.texto(ctx, paginaMarkdown(f)));
saidas.push(paginas.erro404(ctx));

if (erros.length) parar(`A publicação parou: ${erros.length} ${erros.length === 1 ? 'problema' : 'problemas'}.`, erros, { tecnico: true });

for (const s of saidas) {
  const html = pagina(ctx, s);
  const destino = s.caminho.endsWith('.html') ? path.join(SAIDA, s.caminho) : path.join(SAIDA, s.caminho, 'index.html');
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, html);
}
// /carrinho/ era o endereço da encomenda na primeira versão: reencaminha
fs.mkdirSync(path.join(SAIDA, 'carrinho'), { recursive: true });
fs.writeFileSync(path.join(SAIDA, 'carrinho/index.html'), reencaminhar(ctx, { de: '/carrinho/', para: '/encomenda/' }));

// ---------------------------------------------------------------- robots, sitemap, _headers
const indexaveis = saidas.filter((s) => s.caminho !== '/404.html' && s.indexar !== false);
// O sitemap só no domínio aberto: na pré-visualização (noindex) ia mostrar ao Google páginas que lhe
// pedimos para não guardar.
if (producao) {
  let lastmod = {};
  try {
    // a data da última alteração de cada página sai do git (o conteúdo de que ela é feita)
    const data = (ficheirosFonte) => execFileSync('git', ['log', '-1', '--format=%cs', '--', ...ficheirosFonte], { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    for (const s of indexaveis) {
      let fontes = ['content/site.json'];
      if (s.caminho === '/') fontes = ['content/inicio.json', 'content/produtos'];
      else if (s.caminho.startsWith('/produtos/')) fontes = [`content/produtos/${s.caminho.split('/')[2]}.json`];
      else if (s.caminho.startsWith('/loja/')) fontes = ['content/produtos', 'content/categorias.json'];
      else if (existe(`content/paginas${s.caminho.replace(/\/$/, '')}.md`)) fontes = [`content/paginas${s.caminho.replace(/\/$/, '')}.md`];
      lastmod[s.caminho] = data(fontes) || hoje;
    }
  } catch { lastmod = {}; }
  fs.writeFileSync(path.join(SAIDA, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexaveis.map((s) => `  <url><loc>${ctx.absoluto(s.caminho)}</loc><lastmod>${lastmod[s.caminho] || hoje}</lastmod></url>`).join('\n')}
</urlset>
`);
}
// Pré-visualização: fechada aos motores de busca, mas aberta aos robôs que fazem a pré-visualização
// das ligações no WhatsApp e no Facebook (sem isto, partilhar o link mostra-se sem imagem).
fs.writeFileSync(path.join(SAIDA, 'robots.txt'), producao
  ? `User-agent: *\nAllow: /\n\nSitemap: ${ctx.absoluto('/sitemap.xml')}\n`
  : 'User-agent: facebookexternalhit\nAllow: /\n\nUser-agent: WhatsApp\nAllow: /\n\nUser-agent: *\nDisallow: /\n');
// No domínio (Cloudflare): a cache dos ficheiros com o resumo no nome. Os ficheiros do Worker saem
// todos com max-age=0 (cada visita pergunta outra vez); estes nunca mudam de conteúdo, porque o nome
// muda com ele. Só grupos que não se tocam: duas regras para o mesmo ficheiro JUNTAM os valores (as
// miniaturas do painel, assets/img/miniatura-*.webp, não têm resumo e ficam fora — por isso as
// imagens não levam regra).
if (dominio) {
  const umAno = '  Cache-Control: public, max-age=31536000, immutable\n';
  // E os cabeçalhos de segurança em todas as respostas: sem Cache-Control (duas regras juntam-se).
  const seguranca = '/*\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: SAMEORIGIN\n  Content-Security-Policy: frame-ancestors \'self\'\n  Referrer-Policy: strict-origin-when-cross-origin\n  Strict-Transport-Security: max-age=86400\n';
  fs.writeFileSync(path.join(SAIDA, '_headers'), seguranca + ['/assets/site-*', '/assets/catalogo-*', '/assets/video/*'].map((r) => `${r}\n${umAno}`).join(''));
}
fs.writeFileSync(path.join(SAIDA, '.nojekyll'), '');
// A chave do IndexNow (o aviso ao Bing e aos outros de que uma página mudou), só no site aberto: é
// pública por desenho, e prova que o domínio é nosso. Uma só para a Dream Art.
const INDEXNOW = '26d937b70160ff32a868a5670710d2d1';
if (producao) fs.writeFileSync(path.join(SAIDA, `${INDEXNOW}.txt`), INDEXNOW);

// ---------------------------------------------------------------- verificação do que saiu
const problemas = [];
const todosHtml = [];
(function andar(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) andar(p); else if (f.endsWith('.html')) todosHtml.push(p); } })(SAIDA);
/* Nada da Mimices (o site da Dream Art nasceu sobre o código dela e o Renato rejeitou a mistura, 8 nov
   2026): nem o nome, nem a dona, nem a terra, nem os tons de linho. */
const RESTOS = /mimices|susana|azeit[ãa]o|tons? de linho|localhost:4830/i;
for (const [nome, buf] of [[ficheiros.css, css], [ficheiros.js, js]]) {
  const m = buf.toString('utf8').match(RESTOS);
  if (m) problemas.push(`assets/${nome}: tem «${m[0]}» (resto de outro site)`);
}
for (const f of todosHtml) {
  const html = fs.readFileSync(f, 'utf8');
  const onde = path.relative(SAIDA, f);
  const reencaminha = html.includes('http-equiv="refresh"');
  for (const lixo of ['{{', 'undefined', 'NaN', '[object Object]']) if (html.includes(lixo)) problemas.push(`${onde}: contém «${lixo}»`);
  const resto = html.match(RESTOS);
  if (resto) problemas.push(`${onde}: tem «${resto[0]}» (resto de outro site)`);
  if (producao && html.includes('por-confirmar')) problemas.push(`${onde}: ainda tem texto por confirmar`);
  if (!reencaminha && !html.includes('<!-- legal-comum:livro ')) problemas.push(`${onde}: falta a ligação ao Livro de Reclamações`);
  if (!reencaminha && (html.match(/<h1[\s>]/g) || []).length !== 1) problemas.push(`${onde}: tem ${(html.match(/<h1[\s>]/g) || []).length} títulos h1 (tem de ter um)`);
  if (!producao && !html.includes('name="robots" content="noindex')) problemas.push(`${onde}: a pré-visualização tem de ser noindex`);
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\salt="/.test(m[0])) problemas.push(`${onde}: imagem sem alt: ${m[0].slice(0, 80)}`);
    if (!/\swidth="\d+"/.test(m[0]) || !/\sheight="\d+"/.test(m[0])) problemas.push(`${onde}: imagem sem width/height: ${m[0].slice(0, 80)}`);
  }
  // os JSON-LD têm de se ler (um erro aqui e o Google ignora a página inteira)
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { const j = JSON.parse(m[1]); if (!j['@context'] || !j['@type']) problemas.push(`${onde}: JSON-LD sem @context ou @type`); } catch (e) { problemas.push(`${onde}: JSON-LD que não se lê (${e.message})`); }
  }
  // ids repetidos partem as ligações dos rótulos e dos aria-controls
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const repetidos = ids.filter((x, i) => ids.indexOf(x) !== i);
  if (repetidos.length) problemas.push(`${onde}: ids repetidos: ${[...new Set(repetidos)].join(', ')}`);
  // nada de terceiros: as páginas não carregam nada de fora (as letras e as imagens são do site)
  for (const m of html.matchAll(/<(?:script|link|img|source|iframe|video)\b[^>]*\s(?:src|srcset|href)="(https?:\/\/[^"]+)"/g)) {
    if (!/^<link[^>]*rel="canonical"/.test(m[0]) && !m[1].startsWith(ORIGEM)) problemas.push(`${onde}: carrega de fora: ${m[1].slice(0, 80)}`);
  }
  for (const m of html.matchAll(/\s(?:href|src|poster)="([^"]+)"/g)) {
    let u = m[1].replace(/&amp;/g, '&');
    if (/^(https?:|mailto:|tel:|#|data:)/.test(u)) continue;
    if (base && !u.startsWith(base + '/')) { problemas.push(`${onde}: ligação sem o prefixo ${base}: ${u}`); continue; }
    u = u.slice(base.length).split(/[?#]/)[0];
    const alvo = path.join(SAIDA, decodeURIComponent(u));
    const ok = fs.existsSync(alvo) && (fs.statSync(alvo).isFile() || fs.existsSync(path.join(alvo, 'index.html')));
    if (!ok) problemas.push(`${onde}: ligação partida: ${m[1]}`);
  }
  for (const m of html.matchAll(/\ssrcset="([^"]+)"/g)) {
    for (const parte of m[1].split(',')) {
      const u = parte.trim().split(/\s+/)[0].slice(base.length);
      if (!fs.existsSync(path.join(SAIDA, u))) problemas.push(`${onde}: imagem em falta no srcset: ${u}`);
    }
  }
  const og = html.match(/property="og:image" content="([^"]+)"/)?.[1];
  if (!reencaminha && !og) problemas.push(`${onde}: falta o cartão de partilha (og:image)`);
  if (og && !fs.existsSync(path.join(SAIDA, og.replace(ORIGEM + base, '')))) problemas.push(`${onde}: o cartão de partilha não existe: ${og}`);
}
// os separadores vazios não têm página, nem ligação em lado nenhum
for (const c of categorias.filter((k) => !comArtigos.includes(k))) {
  if (fs.existsSync(path.join(SAIDA, 'loja', c.slug))) problemas.push(`loja/${c.slug}/: um separador sem artigos não pode ter página`);
}
if (problemas.length) parar(`A publicação parou: o site saiu com ${problemas.length} problemas.`, [...new Set(problemas)].slice(0, 60).map((p) => `Gerador: ${p}`), { tecnico: true });

for (const a of avisos) console.warn(`  ! ${a}`);
console.log(`site: ${saidas.length} páginas em ${path.relative(RAIZ, SAIDA) || '.'}/ (${producao ? `produção, ${DOMINIO}` : dominio ? `${DOMINIO}, ainda fechado aos motores de busca` : base ? `pré-visualização, ${ORIGEM}${base}/` : 'local'}), ${produtos.length} artigos, ${comArtigos.length} separadores, hoje ${hoje}`);
