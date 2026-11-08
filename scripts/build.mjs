#!/usr/bin/env node
// Gera o site da Mimices em _site/, a partir de content/ e media/. Node 22, sem dependências.
// (O gerador é o da Pokóto Wood, adaptado: tons de linho, escolhas, personalização por campos.)
//
//   node scripts/build.mjs                       local, em http://localhost:4830/
//   node scripts/build.mjs --base=/mimices       pré-visualização no GitHub Pages
//   node scripts/build.mjs --dominio             o domínio (mimices.pt, na Cloudflare) ANTES de
//                                                abrir: na raiz, com o _headers (a cache), mas
//                                                fechado aos motores de busca e com o que falta
//                                                «[por confirmar]» (16 out 2026: o domínio chegou
//                                                antes dos dados legais da Susana)
//   node scripts/build.mjs --producao            o domínio aberto: aos motores de busca, e
//                                                RECUSA publicar com dados legais por preencher
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
import { esc, euros, hojeEmLisboa, markdown, numeroWhatsApp, numeroLegivel, custoChamada, notaChamada, moradaCompleta } from '../src/templates/util.mjs';
import { pagina } from '../src/templates/layout.mjs';
import * as R from '../src/lib/regras.mjs';
import * as paginas from '../src/templates/paginas.mjs';
/* As peças legais comuns aos sites do Renato (a cópia em legal-comum/, instalada por
   _ferramentas/legal-comum/instalar.mjs; não se edita aqui): o CSS do botão do Livro de
   Reclamações, os destinatários da política de privacidade e as guardas da identificação, das
   promoções e das fichas (22 out 2026, grupo 1 da auditoria legal). */
import { livroCss, destinatariosHtml, CATALOGO_DESTINATARIOS, frasesPrivacidade, prazos as PRAZOS_LEGAIS, verificarIdentificacao, verificarPromocao, verificarProduto, VERSAO as LEGAL_COMUM_VERSAO } from '../legal-comum/index.mjs';
import { pecaLegal } from '../src/templates/componentes.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
// --conteudo=<pasta> e --saida=<pasta>: para as baterias e o ensaio do painel gerarem o site a
// partir de outro conteúdo (o media/, os modelos e a cache das imagens são sempre os daqui).
const CONTEUDO = path.resolve(args.find((a) => a.startsWith('--conteudo='))?.slice(11) || path.join(RAIZ, 'content'));
const SAIDA = path.resolve(args.find((a) => a.startsWith('--saida='))?.slice(8) || path.join(RAIZ, '_site'));
const producao = args.includes('--producao');
const dominio = producao || args.includes('--dominio');   // na raiz de mimices.pt (aberto ou ainda não)
const base = dominio ? '' : (args.find((a) => a.startsWith('--base='))?.slice(7) || '').replace(/\/$/, '');
const semImagens = args.includes('--sem-imagens');

// O domínio (o Renato compra-o quando o site estiver feito, 15 out 2026): o canonical, o
// sitemap e os cartões de partilha seguem-no em produção.
const DOMINIO = 'mimices.pt';
const ORIGEM = dominio ? `https://${DOMINIO}` : (base ? 'https://renatovalente5.github.io' : 'http://localhost:4830');

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
const ler = (rel) => JSON.parse(fs.readFileSync(path.join(RAIZ, rel), 'utf8'));
const existe = (rel) => fs.existsSync(path.join(RAIZ, rel));

// ---------------------------------------------------------------- conteúdo e regras
// As regras dos dados estão em src/lib/regras.mjs, o MESMO ficheiro que o painel usa (cópia byte a
// byte em mimices-painel/estatico/js/regras.js): o que o painel deixa gravar é o que a publicação
// aceita. Classes: «bloqueia» pára a publicação; «neutraliza» esconde só aquele artigo (ou tira-lhe
// a fotografia que falta) na cópia que o gerador lê; «avisa» só avisa.
// Os ficheiros de uma pasta com a extensão dada, sem a extensão; uma pasta que não existe (o git não
// guarda pastas vazias: media/video/ sem vídeos não chega ao CI) é uma lista vazia (vem da LF Mobile).
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
// Os artigos como o gerador os lê: a cópia neutralizada (um artigo com problemas sai escondido).
const produtos = Object.entries(neutro.artigos)
  .map(([slug, a]) => ({ slug, ...a }))
  .filter((p) => p.publicado !== false)
  .sort((a, b) => (a.ordem ?? 999) - (b.ordem ?? 999) || a.nome.localeCompare(b.nome, 'pt'));
const fotoExiste = (f) => fotos[f] && dadosRegras.ficheirosFotos.includes(f);

// ---------------------------------------------------------------- as guardas legais (só avisam)
/* As guardas da biblioteca legal-comum, em modo AVISAR (22 out 2026, grupo 1 da auditoria legal):
   nada pára nem se esconde por elas; o que dizem vai para os avisos do registo da publicação, para o
   Renato ver. A identificação (DL 7/2004, art. 10.º: reposta depois de 2bb729f, que abriu o site sem
   NIF), as promoções (DL 70/2007, art. 5.º) e as fichas (Regulamento (UE) 2023/988, art. 19.º; CLP nas
   velas e no gesso perfumado; composição nas toalhas). */
{
  const e = site.empresa || {};
  const FORMAS = [[/nome individual|\beni\b/i, 'eni'], [/unipessoal/i, 'unipessoal'], [/\blda\b|limitada/i, 'lda'], [/\bs\.?\s?a\b|an[óo]nima/i, 'sa']];
  /* Sem NIF não há atividade aberta (o Renato, 17 out 2026): a guarda recebe «sem-actividade» e avisa que
     o site não devia fechar vendas até lá (RGIT, art. 123.º), em vez de pedir só a forma jurídica. */
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

// As páginas de texto (content/paginas/*.md) não passam pelo painel: só o Renato as muda.
// Conferem-se aqui as alegações e a fotografia.
for (const f of fs.readdirSync(path.join(CONTEUDO, 'paginas'))) {
  const t = lerTexto(`content/paginas/${f}`);
  const m = t.match(R.RE_ALEGACOES);
  if (m) erros.push(`Páginas › ${f}: «${m[0]}» é uma alegação que a lei só deixa fazer com prova (ou uma certificação que não temos). Tire a palavra.`);
}
if (erros.length) parar(`A publicação parou: ${erros.length} ${erros.length === 1 ? 'problema' : 'problemas'} no conteúdo.`, erros);

// ---------------------------------------------------------------- imagens
if (!semImagens) execFileSync('python3', [path.join(RAIZ, 'scripts/imagens.py')], { stdio: 'inherit' });
const manifesto = JSON.parse(fs.readFileSync(path.join(RAIZ, '.cache/imagens/manifesto.json'), 'utf8'));
/* Só as que têm ficheiro: uma descrição sem fotografia (sobra de uma mudança à mão) não faz mal a
   nada, e o gerador nunca a usa (fotoExiste pede as duas coisas). */
const semVersoes = Object.keys(fotos).filter((f) => dadosRegras.ficheirosFotos.includes(f) && !manifesto.fotos[f]);
if (semVersoes.length) parar('A publicação parou: faltam as versões web de fotografias.', semVersoes.map((f) => `Fotografias: «${f}» não tem as versões web (scripts/imagens.py)`), { tecnico: true });

// ---------------------------------------------------------------- saída
fs.rmSync(SAIDA, { recursive: true, force: true });
fs.mkdirSync(path.join(SAIDA, 'assets/img'), { recursive: true });
const copiar = (de, para) => { fs.mkdirSync(path.dirname(para), { recursive: true }); fs.copyFileSync(de, para); };
const resumo = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 10);

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

// vídeos: nome com resumo, para a cache de um ano nunca servir um vídeo antigo
const ficheirosVideo = {};
for (const f of listar('media/video', '.mp4').map((x) => `${x}.mp4`)) {
  const buf = fs.readFileSync(path.join(RAIZ, 'media/video', f));
  const nome = f.replace(/\.mp4$/, '');
  ficheirosVideo[nome] = `video/${nome}-${resumo(buf)}.mp4`;
  copiar(path.join(RAIZ, 'media/video', f), path.join(SAIDA, 'assets', ficheirosVideo[nome]));
}

// O FILME DA CAPA (media/capa/, feito pelo scripts/filme.py): os dois cortes, com o resumo no
// nome, e as imagens paradas (o primeiro fotograma de cada um) já passaram pelo imagens.py. Com o
// filme ligado na página inicial e um dos ficheiros em falta, a publicação pára: a capa ficava sem
// nada por baixo das palavras.
let filme = null;
if (inicio.capa?.filme === true) {
  const cortes = { largo: 'filme-largo', alto: 'filme-alto' };
  const faltam = Object.values(cortes).flatMap((n) => [
    ...(existe(`media/capa/${n}.mp4`) ? [] : [`media/capa/${n}.mp4`]),
    ...(manifesto.capa?.[`capa-${n}`] ? [] : [`media/capa/${n}.jpg`]),
  ]);
  if (faltam.length) parar('A publicação parou: falta o filme da capa.', faltam.map((f) => `Página inicial › A capa: falta ${f} (scripts/filme.py)`), { tecnico: true });
  filme = {};
  for (const [corte, n] of Object.entries(cortes)) {
    const buf = fs.readFileSync(path.join(RAIZ, `media/capa/${n}.mp4`));
    filme[corte] = { video: `video/${n}-${resumo(buf)}.mp4`, imagem: `capa-${n}` };
    copiar(path.join(RAIZ, `media/capa/${n}.mp4`), path.join(SAIDA, 'assets', filme[corte].video));
  }
}

// CSS e JS: um ficheiro cada, com o resumo no nome
/* A folha de estilos leva o CSS do Livro de Reclamações da biblioteca legal-comum (a variante discreta,
   .lr-discreto, e o texto só para leitores de ecrã). Vai ANTES do site.css: as regras do rodapé
   (.rodape__legal a) ganham, e o Livro fica com a letra e a cor das ligações vizinhas. */
const css = Buffer.concat([
  Buffer.from(`/* legal-comum v${LEGAL_COMUM_VERSAO}: o Livro de Reclamações */\n${livroCss()}\n`),
  fs.readFileSync(path.join(RAIZ, 'src/estilos/site.css')),
]);
const js = Buffer.from(['site.js', 'carrinho.js'].map((f) => `// ${f}\n${fs.readFileSync(path.join(RAIZ, 'src/scripts', f), 'utf8')}`).join('\n'));
const ficheiros = { css: `site-${resumo(css)}.css`, js: `site-${resumo(js)}.js`, videos: ficheirosVideo, filme };
fs.writeFileSync(path.join(SAIDA, 'assets', ficheiros.css), css);
fs.writeFileSync(path.join(SAIDA, 'assets', ficheiros.js), js);

// ---------------------------------------------------------------- contexto dos modelos
const numero = numeroWhatsApp(site.contactos.whatsapp);
const ctx = {
  site, inicio, categorias, produtos, fotos, manifesto, hoje, producao, ficheiros,
  videos: {
    'conjunto-tomas': 'o conjunto de batismo azul do Tomás, de perto: a caixa, a toalha bordada e a vela com o laço de linho',
    'conjunto-mariana': 'o conjunto de batismo rosa da Mariana, de perto: o laço de linho, a vela e a toalha bordada',
  },
  url: (c) => (/^https?:|^mailto:|^tel:|^#/.test(c) ? c : `${base}${c}`),
  asset: (rel) => `${base}/assets/${rel}`,
  absoluto: (c) => `${ORIGEM}${base}${c}`,
  // sem número ainda: o wa.me sem número abre o WhatsApp a pedir o contacto (dá para ensaiar)
  whatsapp: (texto) => `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`,
  numeroLegivel, custoChamada, notaChamada,
  marcador: (desc) => `<mark class="por-confirmar">[por confirmar: ${esc(desc)}]</mark>`,
};


// ---------------------------------------------------------------- catálogo do carrinho
// O que o carrinho lê (assets/catalogo-*.json): os preços, as escolhas e os campos da personalização
// de cada artigo, os tons de linho, as zonas e os portes da loja. O carrinho nunca guarda preços.
const fotoPequena = (f) => { const m = manifesto.fotos[f]; const w = m.larguras.find((x) => x >= 360) || m.larguras[0]; return ctx.asset(`img/${f}-${m.resumo}-${w}.webp`); };
const catalogo = {
  v: 1,
  marca: site.marca,
  whatsapp: numero,
  zonas: site.entrega.zonas,
  portes: {
    ...Object.fromEntries(R.ZONAS_ENVIO.map((z) => [z, Number.isFinite(site.entrega.portes?.[z]) ? site.entrega.portes[z] : null])),
    gratisAPartirDe: Number.isFinite(site.entrega.portes?.gratisAPartirDe) ? site.entrega.portes.gratisAPartirDe : null,
  },
  cores: (site.cores || []).map((c) => ({ numero: c.numero, nome: c.nome })),
  carrinho: ctx.url('/carrinho/'),
  loja: ctx.url('/loja/'),
  produtos: Object.fromEntries(produtos.map((p) => [p.slug, {
    nome: p.nome, nomeCurto: p.nomeCurto || p.nome, url: ctx.url(`/produtos/${p.slug}/`), foto: fotoPequena(p.fotos[0]),
    preco: typeof p.preco === 'number' ? p.preco : null, precoAnterior: p.precoAnterior || null, promocaoAte: p.promocaoAte || '',
    cores: p.cores === true, opcoes: R.opcoesDe(p), personalizacao: R.personalizacaoDe(p), minimo: R.quantidadeMinimaDe(p),
  }])),
};
const catalogoBuf = Buffer.from(JSON.stringify(catalogo));
ficheiros.catalogo = `catalogo-${resumo(catalogoBuf)}.json`;
fs.writeFileSync(path.join(SAIDA, 'assets', ficheiros.catalogo), catalogoBuf);

// ---------------------------------------------------------------- marcadores das páginas de texto
/* Os portes da loja (por encomenda, não por peça), como frase: «Enviamos por CTT Expresso. Portugal
   Continental: 5 €; Madeira e Açores: 9 €. O levantamento em Azeitão não tem custos.» */
function textoPortes() {
  const p = site.entrega.portes || {};
  const zonas = site.entrega.zonas.filter((z) => z.morada);
  const partes = zonas.map((z) => `${esc(z.curto)}: ${Number.isFinite(p[z.id]) ? euros(p[z.id]) : ctx.marcador(`os portes para ${z.curto}`)}`);
  const gratis = Number.isFinite(p.gratisAPartirDe) ? ` Portes grátis no continente a partir de ${euros(p.gratisAPartirDe)} em peças.` : '';
  return `Enviamos por CTT Expresso. ${partes.join('; ')}.${gratis} Numa encomenda maior, os portes podem subir com o peso: confirmamos o valor consigo antes do pagamento. O levantamento em ${esc(site.local.localidade)} não tem custos.`;
}

function identificacao() {
  const e = site.empresa;
  const partes = [];
  partes.push(e.nome ? `<strong>${esc(e.nome)}</strong>` : ctx.marcador('o nome da empresa ou do empresário'));
  if (e.tipo) partes.push(esc(e.tipo));
  /* Sem atividade aberta não há NIF (o Renato, 17 out 2026), e a Susana deu só a terra (19 out: «Morada
     apenas Azeitão»): o NIF só aparece se existir, e a morada pode ser só a localidade. As regras
     (regras.mjs) continuam a lembrá-los no painel e na construção. */
  if (e.nif) partes.push(`NIF ${esc(e.nif)}`);
  const morada = e.morada || e.localidade ? moradaCompleta(e) : '';
  partes.push(morada ? `em ${esc(morada)}` : `em ${ctx.marcador('a morada')}`);
  return `${partes.join(', ')}, que vende com a marca ${esc(site.marca)}.`;
}

function botoesDesistencia() {
  const texto = `Olá! Quero desistir da compra (direito de livre resolução).\n\nArtigo: \nEncomendado em: \nRecebido em: \nNome: \nMorada: `;
  const b = [];
  if (numero) b.push(`<a class="botao botao--whatsapp" href="${ctx.whatsapp(texto)}">Desistir pelo WhatsApp</a>`);
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
    whatsapp: () => (c.whatsapp ? guardar(`<a href="https://wa.me/${numero}">WhatsApp</a>`) : guardar(`WhatsApp ${ctx.marcador('o número')}`)),
    telefone: () => (R.numeroPortugues(c.telefone) ? guardar(`<a href="tel:+351${R.numeroPortugues(c.telefone)}">${esc(numeroLegivel(c.telefone))}</a> ${notaChamada(c.telefone)}`) : guardar(ctx.marcador('o telefone'))),
    'empresa.identificacao': () => guardar(identificacao()),
    'empresa.iva': () => (site.empresa.iva ? esc(site.empresa.iva) : ''), // sem atividade não há IVA a declarar
    prazo: () => (site.entrega.prazo ? esc(site.entrega.prazo) : guardar(ctx.marcador('quanto tempo leva a fazer e a entregar uma peça'))),
    pagamento: () => (site.entrega.pagamento ? esc(site.entrega.pagamento) : guardar(ctx.marcador('as formas de pagamento (MB WAY, transferência, no levantamento…)'))),
    levantamento: () => esc(site.entrega.levantamento || ''),
    portes: () => guardar(textoPortes()),
    botoesDesistencia: () => guardar(botoesDesistencia()),
    /* A política de privacidade (RGPD, art. 13.º), pela biblioteca legal-comum: os destinatários reais
       (o alojamento e o DNS na Cloudflare, o código e a publicação no GitHub, o Gmail da Mimices, a Meta,
       e o Renato, que mantém o site e o painel: RGPD, art. 28.º), os prazos, e as frases da Meta e do
       repositório público. */
    'privacidade.destinatarios': () => guardar(pecaLegal('privacidade-destinatarios', destinatariosComExtras())),
    'privacidade.prazos': () => guardar(pecaLegal('privacidade-prazos', `<ul>${[
      'Pedidos de informação que não chegam a encomenda: 12 meses depois da última mensagem.',
      'Conversas e dados de uma encomenda: enquanto forem precisos para ela e para a garantia, até 3 anos depois da entrega.',
      // Sem atividade aberta não há faturas (8 nov 2026): o prazo fiscal de 10 anos (PRAZOS_LEGAIS.encomendas) volta quando houver.
      PRAZOS_LEGAIS.registosTecnicos.texto,
    ].map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`)),
    'privacidade.frases': () => guardar(pecaLegal('privacidade-frases', frasesPrivacidade(CONFIG_PRIVACIDADE).map((t) => `<p>${esc(t)}</p>`).join(''))),
    avisoGarantia: () => guardar(`<figure class="aviso-garantia"><img src="${ctx.asset('legal/aviso-garantia-legal-pt.svg')}" width="600" height="848" alt="${esc(AVISO_ALT)}" loading="lazy"><figcaption><a href="${ctx.asset('legal/aviso-garantia-legal-pt.pdf')}">Descarregar o aviso oficial (PDF)</a> · <a href="https://europa.eu/youreurope/garantias" target="_blank" rel="noopener">europa.eu/youreurope/garantias</a></figcaption></figure>`),
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
  return { caminho: `/${slug}/`, titulo: meta.titulo, tituloSeo: meta.tituloSeo, subtitulo: meta.subtitulo, modelo: meta.modelo, descricao: meta.descricao, atualizado: meta.atualizado, foto: meta.foto, indexar, html };
}

// ---------------------------------------------------------------- páginas
const saidas = [];
saidas.push(paginas.inicio(ctx));
saidas.push(paginas.loja(ctx));
for (const c of categorias) saidas.push(paginas.loja(ctx, c.slug));
for (const p of produtos) saidas.push(paginas.produto(ctx, p));
saidas.push(paginas.carrinho(ctx));
saidas.push(paginas.contactos(ctx));
for (const f of fs.readdirSync(path.join(CONTEUDO, 'paginas')).filter((x) => x.endsWith('.md'))) saidas.push(paginas.texto(ctx, paginaMarkdown(f)));
saidas.push(paginas.erro404(ctx));

if (erros.length) parar(`A publicação parou: ${erros.length} ${erros.length === 1 ? 'problema' : 'problemas'}.`, erros, { tecnico: true });

for (const s of saidas) {
  const html = pagina(ctx, s);
  const destino = s.caminho.endsWith('.html') ? path.join(SAIDA, s.caminho) : path.join(SAIDA, s.caminho, 'index.html');
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, html);
}

// ---------------------------------------------------------------- robots, sitemap, _headers
const indexaveis = saidas.filter((s) => !['/404.html', '/carrinho/'].includes(s.caminho) && s.indexar !== false);
let lastmod = {};
try {
  // a data da última alteração de cada página sai do git (o conteúdo de que ela é feita)
  const data = (ficheirosFonte) => execFileSync('git', ['log', '-1', '--format=%cs', '--', ...ficheirosFonte], { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  for (const s of indexaveis) {
    let fontes = ['content/site.json'];
    if (s.caminho === '/') fontes = ['content/inicio.json', 'content/produtos', 'media/capa'];
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
// Pré-visualização: fechada aos motores de busca, mas aberta aos robôs que fazem a pré-visualização
// das ligações no WhatsApp e no Facebook (sem isto, partilhar o link mostra-se sem imagem).
fs.writeFileSync(path.join(SAIDA, 'robots.txt'), producao
  ? `User-agent: *\nAllow: /\n\nSitemap: ${ctx.absoluto('/sitemap.xml')}\n`
  : 'User-agent: facebookexternalhit\nAllow: /\n\nUser-agent: WhatsApp\nAllow: /\n\nUser-agent: *\nDisallow: /\n');
// Em produção (Cloudflare): a cache dos ficheiros com o resumo no nome. Os ficheiros do
// Worker saem todos com max-age=0 (cada visita pergunta outra vez); estes nunca mudam de
// conteúdo, porque o nome muda com ele. Só grupos que não se tocam: duas regras para o
// mesmo ficheiro JUNTAM os valores (as miniaturas do painel, assets/img/miniatura-*.webp,
// não têm resumo e ficam fora — por isso as imagens não levam regra).
if (dominio) {
  const umAno = '  Cache-Control: public, max-age=31536000, immutable\n';
  /* E os cabeçalhos de segurança em todas as respostas (como no ithos): sem Cache-Control, porque
     duas regras para o mesmo ficheiro JUNTAM os valores. O HSTS começa curto (um dia). */
  const seguranca = '/*\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: SAMEORIGIN\n  Content-Security-Policy: frame-ancestors \'self\'\n  Referrer-Policy: strict-origin-when-cross-origin\n  Strict-Transport-Security: max-age=86400\n';
  fs.writeFileSync(path.join(SAIDA, '_headers'), seguranca + ['/assets/site-*', '/assets/catalogo-*', '/assets/video/*'].map((r) => `${r}\n${umAno}`).join(''));
}
fs.writeFileSync(path.join(SAIDA, '.nojekyll'), '');
// A chave do IndexNow (o aviso ao Bing, ao Yandex e aos outros de que uma página mudou; o ChatGPT
// pesquisa sobretudo pelo índice do Bing): é pública por desenho, e prova que o domínio é nosso. Só
// no site aberto (--producao): avisar de páginas com noindex não serve de nada.
const INDEXNOW = '3cb4f7a67561f88e800496793392287d';
if (producao) fs.writeFileSync(path.join(SAIDA, `${INDEXNOW}.txt`), INDEXNOW);

// ---------------------------------------------------------------- verificação do que saiu
const problemas = [];
const todosHtml = [];
(function andar(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) andar(p); else if (f.endsWith('.html')) todosHtml.push(p); } })(SAIDA);
for (const f of todosHtml) {
  const html = fs.readFileSync(f, 'utf8');
  const onde = path.relative(SAIDA, f);
  for (const lixo of ['{{', 'undefined', 'NaN', '[object Object]']) if (html.includes(lixo)) problemas.push(`${onde}: contém «${lixo}»`);
  if (producao && html.includes('por-confirmar')) problemas.push(`${onde}: ainda tem texto por confirmar`);
  if (!html.includes('<!-- legal-comum:livro ')) problemas.push(`${onde}: falta o botão do Livro de Reclamações`);
  for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\salt="/.test(m[0])) problemas.push(`${onde}: imagem sem alt: ${m[0].slice(0, 80)}`);
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
  if (og && !fs.existsSync(path.join(SAIDA, og.replace(ORIGEM + base, '')))) problemas.push(`${onde}: o cartão de partilha não existe: ${og}`);
}
if (problemas.length) parar(`A publicação parou: o site saiu com ${problemas.length} problemas.`, [...new Set(problemas)].slice(0, 60).map((p) => `Gerador: ${p}`), { tecnico: true });

for (const a of avisos) console.warn(`  ! ${a}`);
console.log(`site: ${saidas.length} páginas em _site/ (${producao ? `produção, ${DOMINIO}` : dominio ? `${DOMINIO}, ainda fechado aos motores de busca` : base ? `pré-visualização, ${ORIGEM}${base}/` : 'local'}), ${produtos.length} artigos, hoje ${hoje}`);
