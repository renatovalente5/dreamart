#!/usr/bin/env node
// Testes do site da Dream Art (Node 22, sem dependências nem browser). Correm no CI antes de cada
// publicação: o passo «Testar o gerador» do pre-visualizacao.yml e do publicar.yml.
//
//   node scripts/testar.mjs          (precisa da cache das imagens: python3 scripts/imagens.py)
//
// Cada guarda prova-se nos dois sentidos: o site normal passa, e uma cópia estragada de propósito pára
// com a mensagem certa. As construções fazem-se em cópias do repositório numa pasta temporária, com a
// cache das imagens reaproveitada (--sem-imagens, como no CI): nunca se mexe no repositório.
//
// O CONTEÚDO É DA DREAM ART, QUE O MUDA NO PAINEL. Na LF Mobile (9 nov 2026) os testes afirmavam coisas
// do content/ de então, e preencher um dado legal ou esconder um artigo parava a publicação neste passo,
// que não escreve as anotações ::error que o painel lê. Por isso nada aqui depende do que o content/
// diz hoje:
//   · as regras provam-se com dados de ensaio escritos aqui;
//   · cada construção parte do conteúdo de agora, mas põe ela mesma o estado de que precisa: os dados
//     legais vazios ou preenchidos de faz-de-conta, e artigos de ensaio («ensaio-…», com preços,
//     escolhas e personalização conhecidos), no primeiro separador e com uma fotografia que exista;
//   · se o conteúdo de agora não constrói a pré-visualização, as construções saltam-se: no CI o passo
//     seguinte (o gerador) pára na mesma e dá as razões ao painel; fora do CI, falha aqui.
//
// DEFEITOS CONHECIDOS (⚠): o que estes testes acharam no gerador e ainda não está corrigido (este
// ficheiro não muda o gerador). Correm como os outros mas não param a publicação; quando o defeito for
// corrigido passam, e o registo diz que se podem passar a teste normal.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as R from '../src/lib/regras.mjs';
import { esc, euros, hojeEmLisboa, numeroWhatsApp } from '../src/templates/util.mjs';
import { NOMES_ICONES } from '../src/templates/icones.mjs';
import { monogramaDe } from '../src/templates/componentes.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NO_CI = process.env.GITHUB_ACTIONS === 'true';
const comeco = Date.now();
let passaram = 0;
let falharam = 0;
let saltados = 0;
const conhecidos = [];
/* Porque é que as construções se saltam (a pré-visualização do conteúdo de agora não constrói), ou null. */
let paragem = null;

/* No CI, uma linha que comece por «::» é um comando do GitHub (uma anotação, que o painel mostraria à
   dona): o que estes testes escrevem nunca começa assim. */
const seguro = (t) => String(t).replace(/^(\s*)::/gm, '$1: :');

/* Um teste. Devolver um texto é saltá-lo (o texto diz porquê). */
async function teste(nome, fn, { construcao = false } = {}) {
  if (construcao && paragem) { saltados++; console.log(`  – ${nome} (saltado)`); return; }
  try {
    const r = await fn();
    if (typeof r === 'string') { saltados++; console.log(`  – ${nome} (${r})`); return; }
    passaram++;
    console.log(`  ✓ ${nome}`);
  } catch (e) {
    falharam++;
    process.exitCode = 1;
    console.error(seguro(`  ✗ ${nome}\n${e.stack}`));
  }
}
const construcao = (nome, fn) => teste(nome, fn, { construcao: true });

/* Um defeito conhecido do gerador: corre (com as construções), mas não pára a publicação. */
async function defeitoConhecido(nome, defeito, fn) {
  if (paragem) { saltados++; console.log(`  – ${nome} (saltado)`); return; }
  try {
    await fn();
    passaram++;
    console.log(`  ✓ ${nome}\n      (era um defeito conhecido e já está corrigido: passe-o a teste normal)`);
  } catch (e) {
    conhecidos.push(nome);
    console.log(seguro(`  ⚠ ${nome}\n      DEFEITO CONHECIDO, por corrigir no gerador: ${defeito}\n      (${String(e.message).split('\n')[0]})`));
  }
}

const lerRaiz = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const ler = (pasta, rel) => fs.readFileSync(path.join(pasta, rel), 'utf8');
const vazio = (v) => v === null || v === undefined || (typeof v === 'string' && !v.trim());
const escaparRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// a mesma conta das regras (problemasDoArtigo) e da ficha (paginas.mjs): um artigo com toalha
const comToalha = (a) => /\btoalhas?\b/i.test(`${typeof a.nome === 'string' ? a.nome : ''} ${Array.isArray(a.inclui) ? a.inclui.join(' ') : ''}`);

/* O conteúdo de uma pasta como as regras o lêem (a forma que o build.mjs lhes dá). */
function dadosDoConteudo(pasta) {
  const listar = (rel, ext) => (fs.existsSync(path.join(pasta, rel)) ? fs.readdirSync(path.join(pasta, rel)).filter((f) => f.endsWith(ext)).map((f) => f.slice(0, -ext.length)) : []);
  return {
    site: ler(pasta, 'content/site.json'),
    inicio: ler(pasta, 'content/inicio.json'),
    categorias: ler(pasta, 'content/categorias.json'),
    fotos: ler(pasta, 'content/fotos.json'),
    artigos: Object.fromEntries(listar('content/produtos', '.json').map((n) => [n, ler(pasta, `content/produtos/${n}.json`)])),
    ficheirosFotos: listar('media/fotos', '.jpg'),
    videos: listar('media/video', '.mp4'),
  };
}

// ---------------------------------------------------------------- regras (as mesmas do painel)
console.log('regras (src/lib/regras.mjs, com dados de ensaio)');
const HOJE = '2026-11-09';
const chaves = (lista, classe) => lista.filter((p) => !classe || p.classe === classe).map((p) => p.chave);
const ZONAS = [
  { id: 'levantamento', nome: 'Levantamento em Rio Tinto', curto: 'Levantamento em Rio Tinto', morada: false },
  { id: 'continente', nome: 'Envio para Portugal Continental', curto: 'Portugal Continental', morada: true },
  { id: 'ilhas', nome: 'Envio para a Madeira e os Açores', curto: 'Madeira e Açores', morada: true },
  { id: 'europa', nome: 'Envio para outros países da Europa', curto: 'Outros países da Europa', morada: true },
];
/* Uns dados da loja completos (nada a lembrar, nada a parar, nem em produção); cada teste estraga o seu. */
function siteDeEnsaio(mudar = () => {}) {
  const s = {
    marca: 'Dream Art',
    contactos: { whatsapp: '914 000 000', telefone: '914 000 000', email: 'ensaio@exemplo.pt', instagram: '', facebook: '', horario: '' },
    local: { localidade: 'Rio Tinto', distrito: 'Porto' },
    empresa: { nome: 'Nome de Ensaio', tipo: 'Empresário em nome individual', nif: '123456789', morada: 'Rua do Ensaio, 1', codigoPostal: '4435-000', localidade: 'Rio Tinto', concelho: 'Gondomar', iva: 'Os preços incluem IVA à taxa legal em vigor.' },
    aviso: { texto: '', ate: '', ligacao: '' },
    entrega: { zonas: structuredClone(ZONAS), portes: { continente: 4.5, ilhas: 7.5, europa: 12, gratisAPartirDe: null }, prazo: 'Duas semanas.', pagamento: 'MB WAY.', levantamento: '' },
  };
  mudar(s);
  return s;
}
const diapositivo = (n, mais = {}) => ({ aba: `Aba ${n}`, titulo: `Título ${n}`, texto: '', botao: 'Ver', ligacao: '/loja/', foto: 'foto-a', ...mais });
function inicioDeEnsaio(mudar = () => {}) {
  const h = {
    seo: { titulo: 'Dream Art', descricao: 'Lembranças personalizadas.' },
    capa: [diapositivo(1)],
    separadores: { titulo: 'O que criamos', texto: '' },
    destaque: { etiqueta: '', titulo: 'Natal', texto: '', categoria: 'colecoes', botao: 'Ver a coleção' },
    lembrancas: { titulo: 'Lembranças', texto: '', categoria: 'lembrancas', botao: 'Ver todas' },
    apresentacao: { etiqueta: '', titulo: 'Um sonho de família', texto: 'Feito à mão.', botao: 'Conhecer', foto: 'foto-a' },
    confianca: [{ icone: 'mao', texto: 'Feito à mão' }],
  };
  mudar(h);
  return h;
}
const problemasDoInicio = (mudar) => R.problemasDoInicio(inicioDeEnsaio(mudar), { fotos: new Set(['foto-a', 'foto-b']), categorias: ['lembrancas', 'colecoes'] });
const artigoDeEnsaio = (mais = {}) => ({ nome: 'Vela de ensaio', resumo: 'Uma vela.', descricao: 'Uma vela de ensaio.', preco: 3.8, fotos: ['foto-a'], categoria: 'lembrancas', ...mais });
const CTX_ARTIGO = { nome: 'vela-de-ensaio', categorias: ['lembrancas'], fotos: new Set(['foto-a']), videos: [], hoje: HOJE };

await teste('precoDe: a promoção vale até ao último dia e depois volta o preço normal; sem fim vale sempre; um «anterior» mais baixo não é promoção; sem preço é null', () => {
  const p = { preco: 8, precoAnterior: 10, promocaoAte: '2026-12-01' };
  assert.deepEqual(R.precoDe(p, '2026-11-30'), { atual: 8, anterior: 10, ate: '2026-12-01' });
  assert.deepEqual(R.precoDe(p, '2026-12-01'), { atual: 8, anterior: 10, ate: '2026-12-01' });
  assert.deepEqual(R.precoDe(p, '2026-12-02'), { atual: 10, anterior: null, ate: '' });
  assert.deepEqual(R.precoDe({ preco: 8, precoAnterior: 10 }, '2099-01-01'), { atual: 8, anterior: 10, ate: '' });
  assert.deepEqual(R.precoDe({ preco: 5, precoAnterior: 4 }, HOJE), { atual: 5, anterior: null, ate: '' });
  assert.deepEqual(R.precoDe({ preco: 5, precoAnterior: null, promocaoAte: '' }, HOJE), { atual: 5, anterior: null, ate: '' });
  for (const semPreco of [{}, { preco: null }, { preco: '3,80' }, { precoAnterior: 10 }]) {
    assert.deepEqual(R.precoDe(semPreco, HOJE), { atual: null, anterior: null, ate: '' }, JSON.stringify(semPreco));
  }
});
await teste('nifValido: nove algarismos, sem começar por 0, e o de controlo (módulo 11)', () => {
  for (const bom of ['123456789', '123 456 789', '100000002', '100000100']) assert.ok(R.nifValido(bom), bom);
  for (const mau of ['123456780', '12345678', '1234567890', '023456789', '100000101', 'abcdefghi', '', null, undefined]) assert.ok(!R.nifValido(mau), String(mau));
});
await teste('opcoesDe: só os grupos com nome e com dois valores ou mais; o acréscimo só conta se for um número positivo; «Desde» só com acréscimos', () => {
  const a = { opcoes: [
    { nome: 'Cor', valores: [{ nome: 'Branco' }, { nome: 'Dourado', suplemento: 1.5 }, { nome: 'Mau', suplemento: -2 }, { nome: '' }, { nome: '  Rosa  ', suplemento: 'x' }] },
    { nome: 'Só um', valores: [{ nome: 'x' }] },
    { nome: '', valores: [{ nome: 'a' }, { nome: 'b' }] },
    'lixo',
  ] };
  assert.deepEqual(R.opcoesDe(a), [{ nome: 'Cor', valores: [{ nome: 'Branco', suplemento: 0 }, { nome: 'Dourado', suplemento: 1.5 }, { nome: 'Mau', suplemento: 0 }, { nome: 'Rosa', suplemento: 0 }] }]);
  assert.ok(R.temSuplementos(a));
  assert.ok(!R.temSuplementos({ opcoes: [{ nome: 'Cor', valores: [{ nome: 'A' }, { nome: 'B', suplemento: 0 }] }] }));
  for (const nada of [null, {}, { opcoes: 'x' }]) assert.deepEqual(R.opcoesDe(nada), []);
});
await teste('personalizacaoDe: os campos ligados, pela ordem nome, data, frase; o rótulo do artigo ou o geral; a frase nunca é obrigatória', () => {
  assert.deepEqual(R.personalizacaoDe({ personalizacao: { frase: true, data: true, nome: true, rotuloNome: 'Nomes dos noivos', rotuloData: '  ', rotuloFrase: 'Frase (opcional)' } }), [
    { id: 'nome', rotulo: 'Nomes dos noivos', obrigatorio: true },
    { id: 'data', rotulo: 'Data', obrigatorio: true },
    { id: 'frase', rotulo: 'Frase (opcional)', obrigatorio: false },
  ]);
  assert.deepEqual(R.personalizacaoDe({ personalizacao: { nome: 'sim', data: false } }), []);
  assert.deepEqual(R.personalizacaoDe({}), []);
});
await teste('quantidadeMinimaDe: um inteiro de 1 a 1000; o resto é 1 (sem mínimo)', () => {
  for (const [q, esperado] of [[10, 10], [1000, 1000], [undefined, 1], [0, 1], [2.5, 1], ['10', 1], [1001, 1], [-3, 1]]) assert.equal(R.quantidadeMinimaDe({ quantidadeMinima: q }), esperado, String(q));
});
await teste('as zonas: o levantamento e o envio para o continente, as ilhas e a Europa; sem uma delas (ou sem nome), a publicação pára', () => {
  assert.deepEqual([...R.ZONAS_ENVIO], ['continente', 'ilhas', 'europa']);
  assert.deepEqual(R.problemasDoSite(siteDeEnsaio(), { producao: true }), []);
  for (const id of ['levantamento', ...R.ZONAS_ENVIO]) {
    const p = R.problemasDoSite(siteDeEnsaio((s) => { s.entrega.zonas = s.entrega.zonas.filter((z) => z.id !== id); }));
    assert.ok(chaves(p, 'bloqueia').includes('site:entrega.zonas'), `sem a zona «${id}» devia parar`);
  }
  assert.ok(chaves(R.problemasDoSite(siteDeEnsaio((s) => { s.entrega.zonas[3].curto = ''; })), 'bloqueia').includes('site:entrega.zonas'));
});
await teste('os portes: por dizer, um lembrete com as zonas que faltam («a confirmar» na encomenda); ditos, nada; um que não é número avisa', () => {
  const todos = R.problemasDoSite(siteDeEnsaio((s) => { s.entrega.portes = { continente: null, ilhas: null, europa: null, gratisAPartirDe: null }; }));
  const l = todos.find((p) => p.chave === 'site:entrega.portes:por-preencher');
  assert.ok(l && l.lembrete === true && l.classe === 'avisa', JSON.stringify(todos));
  for (const z of Object.values(R.NOMES_ZONAS)) assert.ok(l.mensagem.includes(z), `o lembrete não diz «${z}»`);
  const europa = R.problemasDoSite(siteDeEnsaio((s) => { s.entrega.portes.europa = null; })).find((p) => p.chave === 'site:entrega.portes:por-preencher');
  assert.match(europa.mensagem, /outros países da Europa/);
  assert.doesNotMatch(europa.mensagem, /Continental|Açores/);
  assert.ok(chaves(R.problemasDoSite(siteDeEnsaio((s) => { s.entrega.portes.continente = '4,50 €'; })), 'avisa').includes('site:entrega.portes.continente'));
});
await teste('o que a lei pede: na pré-visualização lembra (prazo, pagamento, IVA, morada) sem parar; em produção o prazo e o pagamento param', () => {
  const vazios = (s) => { Object.assign(s.entrega, { prazo: '', pagamento: '' }); Object.assign(s.empresa, { iva: '', morada: '' }); };
  const previa = R.problemasDoSite(siteDeEnsaio(vazios));
  assert.deepEqual(chaves(previa, 'bloqueia'), []);
  for (const k of ['site:entrega.prazo:vazio', 'site:entrega.pagamento:vazio', 'site:empresa.iva:vazio', 'site:empresa.morada:incompleta']) {
    assert.ok(previa.some((p) => p.chave === k && p.lembrete === true), `falta o lembrete ${k}`);
  }
  const producao = R.problemasDoSite(siteDeEnsaio(vazios), { producao: true });
  assert.deepEqual(chaves(producao, 'bloqueia').sort(), ['site:entrega.pagamento:vazio:producao', 'site:entrega.prazo:vazio:producao']);
  assert.match(producao.find((p) => p.chave === 'site:entrega.prazo:vazio:producao').mensagem, /prazo/);
  assert.match(producao.find((p) => p.chave === 'site:entrega.pagamento:vazio:producao').mensagem, /pagamento/);
});
await teste('a página inicial: a capa é uma lista de 1 a 4 diapositivos (sem nenhum pára, um quinto avisa, o formato antigo pára)', () => {
  assert.deepEqual(problemasDoInicio(), []);
  assert.deepEqual(problemasDoInicio((h) => { h.capa = [1, 2, 3, 4].map((n) => diapositivo(n)); }), []);
  assert.deepEqual(chaves(problemasDoInicio((h) => { h.capa = []; })), ['inicio:capa:vazia']);
  const cinco = problemasDoInicio((h) => { h.capa = [1, 2, 3, 4, 5].map((n) => diapositivo(n)); });
  assert.deepEqual(cinco.map((p) => [p.classe, p.chave]), [['avisa', 'inicio:capa:muitos']]);
  assert.deepEqual(chaves(problemasDoInicio((h) => { h.capa = diapositivo(1); }), 'bloqueia'), ['inicio:capa:forma']);
});
await teste('cada diapositivo precisa da aba, do título, do botão, da ligação e de uma fotografia que exista (a frase é opcional)', () => {
  for (const campo of ['aba', 'titulo', 'botao', 'ligacao']) {
    assert.deepEqual(chaves(problemasDoInicio((h) => { h.capa[0][campo] = ''; }), 'bloqueia'), [`inicio:capa.0.${campo}:vazio`], campo);
  }
  assert.deepEqual(problemasDoInicio((h) => { h.capa[0].texto = ''; }), []);
  assert.deepEqual(chaves(problemasDoInicio((h) => { h.capa[0].foto = 'nao-existe'; }), 'bloqueia'), ['inicio:capa.0.foto:foto']);
  assert.deepEqual(chaves(problemasDoInicio((h) => { h.capa[0].ligacao = 'https://exemplo.pt/'; }), 'avisa'), ['inicio:capa.0.ligacao']);
  assert.deepEqual(R.fotosDoInicio(inicioDeEnsaio((h) => { h.capa = [diapositivo(1), diapositivo(2, { foto: 'foto-b' })]; })), ['foto-a', 'foto-b', 'foto-a']);
});
await teste('a faixa de confiança: cada ícone de ICONES_CONFIANCA tem desenho; um desconhecido avisa; de 0 a 4 frases, cada uma com texto', () => {
  assert.ok(R.ICONES_CONFIANCA.length >= 4, 'a faixa precisa de pelo menos quatro ícones à escolha');
  assert.deepEqual(R.ICONES_CONFIANCA.filter((i) => !NOMES_ICONES.includes(i)), [], 'há ícones da faixa sem desenho em src/templates/icones.mjs');
  for (const icone of R.ICONES_CONFIANCA) assert.deepEqual(problemasDoInicio((h) => { h.confianca = [{ icone, texto: 'Frase' }]; }), [], icone);
  assert.deepEqual(chaves(problemasDoInicio((h) => { h.confianca = [{ icone: 'foguete', texto: 'Frase' }]; })), ['inicio:confianca.0.icone']);
  assert.deepEqual(problemasDoInicio((h) => { h.confianca = []; }), []);
  assert.deepEqual(chaves(problemasDoInicio((h) => { h.confianca = [1, 2, 3, 4, 5].map(() => ({ icone: 'mao', texto: 'Frase' })); })), ['inicio:confianca:muitas']);
  assert.deepEqual(chaves(problemasDoInicio((h) => { h.confianca = [{ icone: 'mao', texto: '' }]; }), 'bloqueia'), ['inicio:confianca.0.texto:vazio']);
});
await teste('um artigo sem nome é escondido (só na cópia que o gerador lê) e não pára os outros; um artigo são não tem problemas', () => {
  assert.deepEqual(R.problemasDoArtigo(artigoDeEnsaio(), CTX_ARTIGO), []);
  const semNome = R.problemasDoArtigo(artigoDeEnsaio({ nome: '' }), CTX_ARTIGO);
  assert.deepEqual(semNome.map((p) => [p.classe, p.efeito, p.chave]), [['neutraliza', 'esconder', 'artigo:vela-de-ensaio:nome']]);
  const texto = JSON.stringify(artigoDeEnsaio({ nome: '' }));
  const dados = { artigos: { 'vela-de-ensaio': texto } };
  const n = R.neutralizar(dados, semNome);
  assert.equal(n.artigos['vela-de-ensaio'].publicado, false);
  assert.deepEqual(n.efeitos.map((e) => [e.slug, e.efeitos]), [['vela-de-ensaio', ['esconder']]]);
  assert.equal(dados.artigos['vela-de-ensaio'], texto, 'o neutralizar mexeu no ficheiro do artigo');
});
await teste('sem preço: «preço por confirmar» na pré-visualização e escondido em produção; a toalha sem composição, o mesmo', () => {
  const semPreco = artigoDeEnsaio({ preco: null });
  assert.deepEqual(R.problemasDoArtigo(semPreco, CTX_ARTIGO).map((p) => [p.classe, p.chave, p.lembrete]), [['avisa', 'artigo:vela-de-ensaio:preco:previa', true]]);
  assert.deepEqual(R.problemasDoArtigo(semPreco, { ...CTX_ARTIGO, producao: true }).map((p) => [p.classe, p.efeito, p.chave]), [['neutraliza', 'esconder', 'artigo:vela-de-ensaio:preco:producao']]);
  for (const toalha of [artigoDeEnsaio({ nome: 'Conjunto com toalha' }), artigoDeEnsaio({ inclui: ['Caixa', 'Toalha bordada'] })]) {
    assert.deepEqual(chaves(R.problemasDoArtigo(toalha, CTX_ARTIGO)), ['artigo:vela-de-ensaio:composicao:previa']);
    assert.deepEqual(R.problemasDoArtigo(toalha, { ...CTX_ARTIGO, producao: true }).map((p) => [p.classe, p.efeito]), [['neutraliza', 'esconder']]);
    assert.deepEqual(R.problemasDoArtigo({ ...toalha, composicao: 'Toalha: 100 % algodão' }, { ...CTX_ARTIGO, producao: true }), []);
  }
  assert.deepEqual(R.problemasDoArtigo(artigoDeEnsaio({ descricao: 'Uma vela ecológica.' }), CTX_ARTIGO).map((p) => [p.classe, p.efeito, p.chave]), [['neutraliza', 'esconder', 'artigo:vela-de-ensaio:alegacoes']]);
});
await teste('o conteúdo do repositório não tem problemas que parem a pré-visualização, e cada dado que a lei pede e ainda falta tem o seu lembrete', () => {
  const dados = dadosDoConteudo(RAIZ);
  const lista = R.problemas(dados, { hoje: hojeEmLisboa(), producao: false });
  const param = lista.filter((p) => p.classe === 'bloqueia');
  if (param.length) {
    paragem = param.map((p) => `${p.ecra}: ${p.mensagem}`);
    return 'saltado: o conteúdo de agora pára a pré-visualização; ver o fim';
  }
  const s = JSON.parse(dados.site);
  const esperados = [];
  if (vazio(s.entrega.prazo)) esperados.push('site:entrega.prazo:vazio');
  if (vazio(s.entrega.pagamento)) esperados.push('site:entrega.pagamento:vazio');
  if (R.ZONAS_ENVIO.some((z) => vazio(s.entrega.portes?.[z]))) esperados.push('site:entrega.portes:por-preencher');
  if (vazio(s.empresa.iva)) esperados.push('site:empresa.iva:vazio');
  if (vazio(s.empresa.nif)) esperados.push('site:empresa.nif:vazio');
  if (vazio(s.empresa.morada) || vazio(s.empresa.codigoPostal)) esperados.push('site:empresa.morada:incompleta');
  for (const [nome, texto] of Object.entries(dados.artigos)) {
    const a = JSON.parse(texto);
    if (comToalha(a) && vazio(a.composicao)) esperados.push(`artigo:${nome}:composicao:previa`);
  }
  const lembretes = new Set(lista.filter((p) => p.lembrete === true).map((p) => p.chave));
  assert.deepEqual(esperados.filter((k) => !lembretes.has(k)), [], 'faltam lembretes do que a lei pede');
});

// ---------------------------------------------------------------- os scripts do browser
console.log('\nscripts do browser (src/scripts)');
const SCRIPTS = fs.readdirSync(path.join(RAIZ, 'src/scripts')).filter((f) => f.endsWith('.js')).sort();
for (const f of SCRIPTS) {
  await teste(`${f} compila`, () => {
    const r = spawnSync(process.execPath, ['--check', path.join(RAIZ, 'src/scripts', f)], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
  });
}
await teste('o browser só guarda a encomenda («dreamart:carrinho») e os favoritos («dreamart:favoritos»), como diz a política de cookies', () => {
  const js = Object.fromEntries(SCRIPTS.map((f) => [f, lerRaiz(`src/scripts/${f}`)]));
  assert.match(js['carrinho.js'], /const CHAVE = 'dreamart:carrinho';/);
  assert.match(js['favoritos.js'], /const CHAVE = 'dreamart:favoritos';/);
  for (const [f, t] of Object.entries(js)) {
    assert.doesNotMatch(t, /document\.cookie|sessionStorage|indexedDB|caches\.open/, f);
    // o localStorage só pelo «guardado» do núcleo (sempre dentro de try/catch), e sempre com a CHAVE
    if (f !== 'nucleo.js') assert.doesNotMatch(t, /localStorage/, `${f} usa o localStorage sem o guardado do núcleo`);
    for (const m of t.matchAll(/guardado\.(?:ler|gravar)\(([^,)]+)/g)) assert.equal(m[1].trim(), 'CHAVE', `${f} guarda com «${m[1]}»`);
  }
  const usadas = new Set([...Object.values(js).join('\n').matchAll(/'(dreamart:[\w-]+)'/g)].map((m) => m[1]));
  assert.deepEqual([...usadas].sort(), ['dreamart:carrinho', 'dreamart:favoritos']);
  const cookies = lerRaiz('content/paginas/politica-de-cookies.md');
  assert.deepEqual([...new Set([...cookies.matchAll(/«(dreamart:[\w-]+)»/g)].map((m) => m[1]))].sort(), ['dreamart:carrinho', 'dreamart:favoritos']);
});

/* O núcleo do JavaScript (src/scripts/nucleo.js) num vm, sem página: as contas do dinheiro e o preço. */
function nucleoNoVm() {
  const janela = { document: { querySelector: () => null, querySelectorAll: () => [] }, matchMedia: () => ({ matches: false, addEventListener() {} }), console };
  janela.window = janela;
  vm.createContext(janela);
  vm.runInContext(lerRaiz('src/scripts/nucleo.js'), janela, { filename: 'nucleo.js' });
  return janela.DA;
}
await teste('o preço no browser é a regra das regras (precoDe), e todos os scripts a tiram do núcleo: o carrinho e o site nunca discordam', () => {
  const DA = nucleoNoVm();
  const casos = [
    [{ preco: 8, precoAnterior: 10, promocaoAte: '2026-12-01' }, ['2026-11-30', '2026-12-01', '2026-12-02']],
    [{ preco: 8, precoAnterior: 10 }, ['2000-01-01', '2999-12-31']],
    [{ preco: 8, precoAnterior: 10, promocaoAte: '' }, [HOJE]],
    [{ preco: 5, precoAnterior: 4, promocaoAte: '2099-01-01' }, [HOJE]],
    [{ preco: 3.8, precoAnterior: null, promocaoAte: '' }, [HOJE]],
    [{ preco: null }, [HOJE]], [{}, [HOJE]], [{ preco: '3,80' }, [HOJE]],
  ];
  for (const [p, dias] of casos) {
    for (const dia of dias) {
      const a = R.precoDe(p, dia);
      const b = DA.precoDe(p, dia);
      assert.deepEqual([b.atual, b.anterior], [a.atual, a.anterior], `${JSON.stringify(p)} a ${dia}`);
    }
  }
  for (const f of SCRIPTS.filter((x) => x !== 'nucleo.js')) {
    const t = lerRaiz(`src/scripts/${f}`);
    assert.doesNotMatch(t, /function precoDe|precoAnterior/, `${f} tem uma regra de preço sua`);
  }
  assert.match(lerRaiz('src/scripts/carrinho.js'), /const \{[^}]*\bprecoDe\b[^}]*\} = window\.DA;/);
});
await teste('o monograma de uma categoria (o círculo da página inicial): uma letra maiúscula, uma palavra curta e o fundo chocolate opcional; o resto pára ou avisa', () => {
  const base = JSON.parse(lerRaiz('content/categorias.json'));
  const slug = base[0].slug;
  const problemas = (mo) => R.problemasDasCategorias(JSON.stringify(base.map((c, i) => (i === 0 ? { ...c, monograma: mo } : c))))
    .filter((p) => p.chave.startsWith(`categorias:${slug}.monograma`)).map((p) => `${p.classe} ${p.chave.split(':').slice(1).join(':')}`);
  assert.deepEqual(problemas({ letra: 'L', palavra: 'lembranças' }), []);
  assert.deepEqual(problemas({ letra: 'Ç', palavra: 'natal', escuro: true }), []);
  assert.deepEqual(problemas(undefined), [], 'sem monograma: vale a primeira letra e o nome');
  assert.deepEqual(problemas({ letra: 'l' }), [`bloqueia ${slug}.monograma.letra`]);
  assert.deepEqual(problemas({ letra: 'LM' }), [`bloqueia ${slug}.monograma.letra`]);
  assert.deepEqual(problemas({ palavra: 'uma palavra comprida' }), [`avisa ${slug}.monograma.palavra:tamanho`]);
  assert.deepEqual(problemas({ palavra: 'na\u0007tal' }), [`bloqueia ${slug}.monograma.palavra`], 'um carácter de controlo');
  assert.deepEqual(problemas({ palavra: 'a<b' }), [], 'o «<» escapa-se ao escrever a página');
  assert.deepEqual(problemas({ escuro: 'sim' }), [`bloqueia ${slug}.monograma.escuro`]);
  assert.deepEqual(problemas('L'), [`bloqueia ${slug}.monograma:forma`]);
  // sem o monograma escrito, o site usa a primeira letra do nome do menu e o nome em minúsculas
  assert.deepEqual(monogramaDe({ nome: 'Livros de honra', nomeMenu: 'Livros' }), { letra: 'L', palavra: 'livros', escuro: false });
  assert.deepEqual(monogramaDe({ nome: 'Coleções', monograma: { letra: 'N', palavra: 'natal', escuro: true } }), { letra: 'N', palavra: 'natal', escuro: true });
});
await teste('o browser escreve os euros como o gerador («3,80 €», «1 234,50 €»)', () => {
  const DA = nucleoNoVm();
  for (const v of [0, 0.5, 1.3, 2.2, 3.8, 9.99, 10, 76, 120, 1234.5, 99999.99]) assert.equal(DA.euros(v), euros(v), String(v));
});
await teste('a data da celebração lê-se como em Portugal (dia/mês/ano), e uma que não existe não passa', () => {
  const DA = nucleoNoVm();
  const casos = [
    ['12/12/2026', '2026-12-12'], ['1/5/2026', '2026-05-01'], ['01-05-26', '2026-05-01'], [' 5.6.2027 ', '2027-06-05'],
    ['12122026', '2026-12-12'], ['29/02/2028', '2028-02-29'],
    ['31/02/2026', null], ['29/02/2027', null], ['12/13/2026', null], ['00/05/2026', null],
    ['', ''], ['amanhã', ''], ['12/12', ''], ['2026-12-12', ''],
  ];
  for (const [texto, iso] of casos) assert.equal(DA.isoDe(texto), iso, JSON.stringify(texto));
  assert.equal(DA.dataCurta('2026-05-01'), '01/05/2026');
  assert.equal(DA.dataCurta(DA.isoDe('1/5/26')), '01/05/2026');
});
// (o build.mjs fica de fora: a guarda contra a frase, quando a tiver, há de citá-la na mensagem)
await teste('o que escreve as páginas (os modelos e os scripts do browser) nunca diz «obrigação de pagar»', () => {
  const ficheiros = [...SCRIPTS.map((f) => `src/scripts/${f}`), ...fs.readdirSync(path.join(RAIZ, 'src/templates')).map((f) => `src/templates/${f}`)];
  for (const f of ficheiros) assert.doesNotMatch(lerRaiz(f), /obriga[çc][ãa]o de pagar/i, f);
});

// ---------------------------------------------------------------- construções numa cópia
console.log('\nconstrução (em cópias do repositório, com a cache das imagens)');
const FICHEIRO_MANIFESTO = path.join(RAIZ, '.cache/imagens/manifesto.json');
if (!fs.existsSync(FICHEIRO_MANIFESTO)) {
  console.error('  ✗ Faltam as imagens (.cache/imagens): corra primeiro «python3 scripts/imagens.py».');
  process.exit(1);
}
const MANIFESTO = JSON.parse(fs.readFileSync(FICHEIRO_MANIFESTO, 'utf8'));

/* A base: o repositório sem o .git, o _site, o material do cliente e a cache; a cache entra como ligação
   simbólica (o gerador com --sem-imagens só a lê). Cada teste copia a base e estraga a sua cópia. */
const temporaria = fs.mkdtempSync(path.join(os.tmpdir(), 'dreamart-teste-'));
process.on('exit', () => fs.rmSync(temporaria, { recursive: true, force: true }));
const base = path.join(temporaria, 'base');
const FORA = /^[\\/](\.git|_site|_cliente|_capturas|node_modules|\.wrangler|\.cache)([\\/]|$)/;
fs.cpSync(RAIZ, base, { recursive: true, filter: (f) => !FORA.test(f.slice(RAIZ.length)) });
fs.symlinkSync(path.join(RAIZ, '.cache'), path.join(base, '.cache'), 'dir');

function copia(nome, mexer = () => {}) {
  const destino = path.join(temporaria, nome);
  fs.cpSync(base, destino, { recursive: true });
  mexer(destino);
  return destino;
}
/* O gerador, como o CI o corre (--sem-imagens). Sem o GITHUB_ACTIONS (só quem o pede): as anotações
   ::error das cópias estragadas de propósito não podem chegar ao painel. */
function construir(pasta, args = ['--base=/dreamart'], env = {}) {
  const r = spawnSync(process.execPath, ['scripts/build.mjs', '--sem-imagens', ...args], { cwd: pasta, encoding: 'utf8', env: { ...process.env, GITHUB_ACTIONS: '', ...env } });
  return { pasta, codigo: r.status, saida: `${r.stdout}\n${r.stderr}` };
}
function json(pasta, rel, mudar) {
  const f = path.join(pasta, rel);
  const dados = JSON.parse(fs.readFileSync(f, 'utf8'));
  mudar(dados);
  fs.writeFileSync(f, `${JSON.stringify(dados, null, 2)}\n`);
}
const acrescentar = (pasta, rel, texto) => fs.appendFileSync(path.join(pasta, rel), texto);
const existeSaida = (pasta, rel) => fs.existsSync(path.join(pasta, '_site', rel));
const lerSaida = (pasta, rel) => ler(pasta, path.join('_site', rel));
function paginasHtml(pasta) {
  const raiz = path.join(pasta, '_site');
  const out = [];
  (function andar(d) {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) andar(p);
      else if (f.endsWith('.html')) out.push({ rel: path.relative(raiz, p), html: fs.readFileSync(p, 'utf8') });
    }
  })(raiz);
  return out;
}
/* Os endereços de uma página: href, src, srcset, poster, action e o do reencaminhamento. */
function enderecos(html) {
  const out = [];
  for (const m of html.matchAll(/\s(?:href|src|poster|action)="([^"]*)"/g)) out.push(m[1].replace(/&amp;/g, '&'));
  for (const m of html.matchAll(/\ssrcset="([^"]*)"/g)) for (const parte of m[1].split(',')) out.push(parte.trim().split(/\s+/)[0]);
  for (const m of html.matchAll(/http-equiv="refresh" content="\d+; url=([^"]+)"/g)) out.push(m[1]);
  return out;
}
const interno = (u) => !/^(https?:|mailto:|tel:|#|data:)/.test(u);
function catalogoDe(pasta) {
  const html = lerSaida(pasta, 'index.html');
  const url = /data-catalogo="([^"]+)"/.exec(html)[1];
  const raiz = /data-base="([^"]+)"/.exec(html)[1];
  return JSON.parse(lerSaida(pasta, url.slice(raiz.length)));
}
/* Os artigos que vão para o site, como o gerador os escolhe (as regras, a cópia neutralizada, e só os
   publicados com fotografia). */
function publicados(pasta, producao = false) {
  const dados = dadosDoConteudo(pasta);
  const n = R.neutralizar(dados, R.problemas(dados, { hoje: hojeEmLisboa(), producao }));
  return Object.entries(n.artigos).map(([slug, a]) => ({ slug, ...a })).filter((a) => a.publicado !== false && Array.isArray(a.fotos) && a.fotos.length);
}
const precoDaFicha = (pasta, slug) => /<p class="ficha__preco[^"]*">([\s\S]*?)<\/p>/.exec(lerSaida(pasta, `produtos/${slug}/index.html`))?.[1] || '';

/* Os dados legais que a Dream Art ainda não deu, vazios (a pré-visualização mostra-os «[por confirmar]»)
   ou preenchidos de faz-de-conta (é assim que se prova que a produção constrói quando os der). */
const PRAZO = 'Entre duas e três semanas, depois de confirmada a encomenda.';
const PAGAMENTO = 'MB WAY ou transferência bancária.';
const COMPOSICAO = 'Toalha: 100 % algodão';
function dadosLegaisVazios(s) {
  Object.assign(s.empresa, { morada: '', iva: '', codigoPostal: s.empresa.codigoPostal || '4435-000', localidade: s.empresa.localidade || 'Rio Tinto' });
  Object.assign(s.entrega, { prazo: '', pagamento: '', levantamento: '', portes: { continente: null, ilhas: null, europa: null, gratisAPartirDe: null } });
}
function dadosLegaisDeEnsaio(s) {
  Object.assign(s.contactos, {
    whatsapp: R.eTelemovel(s.contactos.whatsapp) ? s.contactos.whatsapp : '914 000 000',
    telefone: R.numeroPortugues(s.contactos.telefone) ? s.contactos.telefone : '914 000 000',
    email: R.emailValido(s.contactos.email) ? s.contactos.email : 'ensaio@exemplo.pt',
  });
  Object.assign(s.empresa, { nome: s.empresa.nome || 'Nome de Ensaio', morada: 'Rua do Ensaio, 1', codigoPostal: '4435-000', localidade: s.empresa.localidade || 'Rio Tinto', iva: 'Os preços incluem IVA à taxa legal em vigor.' });
  Object.assign(s.entrega, { prazo: PRAZO, pagamento: PAGAMENTO, levantamento: 'Combinamos o dia e a hora pelo WhatsApp.', portes: { continente: 4.5, ilhas: 7.5, europa: 12, gratisAPartirDe: null } });
}
/* A composição de todos os artigos com toalha (os da Dream Art e os de ensaio). → os nomes deles */
function composicaoDasToalhas(pasta, composicao) {
  const dir = path.join(pasta, 'content/produtos');
  const mudados = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const a = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (a && typeof a === 'object' && comToalha(a)) { a.composicao = composicao; fs.writeFileSync(path.join(dir, f), `${JSON.stringify(a, null, 2)}\n`); mudados.push(f.slice(0, -5)); }
  }
  return mudados;
}
/* Os artigos de ensaio, com nomes que nenhum artigo verdadeiro terá («ensaio-…»): no primeiro separador
   de content/categorias.json (os separadores são do Renato) e com a primeira fotografia da biblioteca
   que tem versões na cache (a Dream Art pode apagar as que não usa). */
function artigosDeEnsaio(pasta) {
  const fotos = JSON.parse(ler(pasta, 'content/fotos.json'));
  const foto = Object.keys(fotos).find((f) => MANIFESTO.fotos[f] && fs.existsSync(path.join(pasta, 'media/fotos', `${f}.jpg`)));
  assert.ok(foto, 'não há nenhuma fotografia com versões na cache para os artigos de ensaio');
  const categoria = JSON.parse(ler(pasta, 'content/categorias.json'))[0].slug;
  const comum = { fotos: [foto], resumo: 'Uma peça dos testes.', descricao: 'Uma peça dos testes do site.', categoria, publicado: true };
  const artigos = {
    'ensaio-vela': { ...comum, nome: 'Vela de ensaio', preco: 3.8, quantidadeMinima: 10, personalizacao: { nome: true, data: true, frase: false, rotuloNome: 'Nomes ou iniciais', rotuloData: 'Data da celebração' } },
    'ensaio-caixa': { ...comum, nome: 'Caixa de ensaio', preco: 10, opcoes: [{ nome: 'Cor', valores: [{ nome: 'Branco' }, { nome: 'Dourado', suplemento: 2 }] }], personalizacao: { frase: true, rotuloFrase: 'Frase (opcional)' } },
    'ensaio-toalha': { ...comum, nome: 'Toalha de ensaio', preco: 30, inclui: ['Toalha bordada com o nome'] },
    'ensaio-sem-preco': { ...comum, nome: 'Peça sem preço', preco: null },
    'ensaio-promocao': { ...comum, nome: 'Peça em promoção', preco: 8, precoAnterior: 10, promocaoDesde: '2026-01-01', promocaoAte: '2999-12-31' },
    'ensaio-promocao-acabada': { ...comum, nome: 'Promoção acabada', preco: 8, precoAnterior: 10, promocaoDesde: '2000-01-01', promocaoAte: '2000-01-31' },
    'ensaio-sem-nome': { ...comum, nome: '', preco: 5 },
    'ensaio-escondido': { ...comum, nome: 'Peça escondida', preco: 5, publicado: false },
    'ensaio-foto-em-falta': { ...comum, nome: 'Peça com fotografia em falta', preco: 5, fotos: ['fotografia-que-nao-existe', foto] },
  };
  for (const [slug, a] of Object.entries(artigos)) fs.writeFileSync(path.join(pasta, 'content/produtos', `${slug}.json`), `${JSON.stringify(a, null, 2)}\n`);
  return artigos;
}
/* As cópias que servem a vários testes: feitas e construídas uma vez. */
const RECEITAS = {
  // o conteúdo de agora, tal e qual: é também o portão (se não constrói, as construções saltam-se)
  agora: { args: ['--base=/dreamart'], mexer: () => {} },
  // a pré-visualização com o que falta dizer, os artigos de ensaio e uma ligação boa numa página de texto
  ensaio: {
    args: ['--base=/dreamart'],
    mexer: (p) => {
      json(p, 'content/site.json', dadosLegaisVazios);
      artigosDeEnsaio(p);
      composicaoDasToalhas(p, '');
      acrescentar(p, 'content/paginas/garantia.md', '\n\n[Ver a loja](/loja/)\n');
    },
  },
  // a produção com os dados legais de faz-de-conta e os artigos de ensaio
  producao: { args: ['--producao'], mexer: (p) => { json(p, 'content/site.json', dadosLegaisDeEnsaio); artigosDeEnsaio(p); composicaoDasToalhas(p, COMPOSICAO); } },
};
const feitas = new Map();
function construida(nome) {
  if (!feitas.has(nome)) feitas.set(nome, construir(copia(nome, RECEITAS[nome].mexer), RECEITAS[nome].args));
  const r = feitas.get(nome);
  assert.equal(r.codigo, 0, `a cópia «${nome}» não construiu:\n${r.saida}`);
  return r;
}

// O PORTÃO: a pré-visualização do conteúdo de agora tem de construir; senão, saltam-se as construções.
if (!paragem) {
  const r = construir(copia('agora'), RECEITAS.agora.args);
  feitas.set('agora', r);
  if (r.codigo !== 0) {
    const razoes = r.saida.split('\n').filter((l) => /✗|Error|parou/.test(l)).slice(0, 12);
    paragem = razoes.length ? razoes : [`o gerador saiu com o código ${r.codigo}`];
  }
}
if (paragem) console.log(seguro(`  – as construções saltam-se: a pré-visualização do conteúdo de agora não constrói\n${paragem.map((l) => `      ${l.trim()}`).join('\n')}`));

await construcao('a pré-visualização do conteúdo de agora (--base=/dreamart): fechada aos motores de busca, em português, e todas as ligações com /dreamart/', () => {
  const { pasta } = construida('agora');
  const paginas = paginasHtml(pasta);
  for (const f of ['index.html', 'loja/index.html', 'encomenda/index.html', 'contactos/index.html', '404.html']) assert.ok(paginas.some((x) => x.rel === f), `falta ${f}`);
  for (const { rel, html } of paginas) {
    assert.match(html, /<html lang="pt-PT">/, rel);
    assert.match(html, /<meta name="robots" content="noindex/, rel);
    const canonico = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1] || '';
    assert.ok(canonico.startsWith('https://renatovalente5.github.io/dreamart/'), `${rel}: canonical ${canonico}`);
    for (const u of enderecos(html).filter(interno)) assert.ok(u.startsWith('/dreamart/'), `${rel}: ligação sem /dreamart/: ${u}`);
    assert.doesNotMatch(html, /obriga[çc][ãa]o de pagar/i, rel);
  }
  assert.match(lerSaida(pasta, 'robots.txt'), /User-agent: \*\nDisallow: \/\n/);
  for (const f of ['sitemap.xml', '_headers']) assert.ok(!existeSaida(pasta, f), `${f} não é da pré-visualização`);
  // o JavaScript publicado é a junção dos src/scripts (os mesmos que estes testes correm)
  const js = /src="\/dreamart\/(assets\/site-[0-9a-f]{10}\.js)"/.exec(lerSaida(pasta, 'index.html'))[1];
  const publicado = lerSaida(pasta, js);
  for (const f of SCRIPTS) assert.ok(publicado.includes(lerRaiz(`src/scripts/${f}`)), `o ${js} não leva o src/scripts/${f} tal e qual`);
});
await construcao('na pré-visualização do conteúdo de agora, cada dado legal por dizer está «[por confirmar: …]» nos termos, e um dado já dito não', () => {
  const { pasta } = construida('agora');
  const s = JSON.parse(ler(pasta, 'content/site.json'));
  const termos = lerSaida(pasta, 'termos-e-condicoes/index.html');
  const marca = (t) => `<mark class="por-confirmar">[por confirmar: ${esc(t)}`;
  const resto = [s.empresa.codigoPostal, s.empresa.localidade, s.empresa.concelho].some((x) => !vazio(x));
  const casos = [
    [s.entrega.prazo, 'quanto tempo leva a fazer e a entregar'],
    [s.entrega.pagamento, 'as formas de pagamento'],
    [s.empresa.iva, 'se os preços incluem IVA'],
    [s.empresa.morada, resto ? 'a rua e o número' : 'a morada'],
    // os portes só contam ditos quando são um número (é o que o gerador escreve)
    ...s.entrega.zonas.filter((z) => z.morada).map((z) => [Number.isFinite(s.entrega.portes?.[z.id]) ? s.entrega.portes[z.id] : null, `os portes para ${R.NOMES_ZONAS[z.id] || z.curto}`]),
  ];
  for (const [valor, desc] of casos) {
    if (vazio(valor)) assert.ok(termos.includes(marca(desc)), `os termos não marcam «[por confirmar: ${desc}]»`);
    else assert.ok(!termos.includes(marca(desc)), `os termos marcam «${desc}», que já está dito`);
  }
});
await construcao('uma ficha por artigo publicado (com o nome no título), e nenhuma página nem ligação de um separador sem artigos', () => {
  const { pasta } = construida('agora');
  const pub = publicados(pasta);
  assert.deepEqual(existeSaida(pasta, 'produtos') ? fs.readdirSync(path.join(pasta, '_site/produtos')).sort() : [], pub.map((p) => p.slug).sort());
  for (const p of pub) assert.ok(lerSaida(pasta, `produtos/${p.slug}/index.html`).includes(`<h1 class="ficha__nome">${esc(p.nome)}</h1>`), `${p.slug}: o título não é o nome`);
  const todas = paginasHtml(pasta).map((x) => x.html).join('\n');
  for (const c of JSON.parse(ler(pasta, 'content/categorias.json'))) {
    const temArtigos = pub.some((p) => p.categoria === c.slug);
    assert.equal(existeSaida(pasta, `loja/${c.slug}/index.html`), temArtigos, `loja/${c.slug}/`);
    if (!temArtigos) assert.ok(!todas.includes(`/dreamart/loja/${c.slug}/`), `há uma ligação para o separador vazio «${c.slug}»`);
  }
});
await construcao('a loja e cada separador: as pastilhas em cima e, por baixo, o painel que elas trocam (o título, o texto e os artigos do separador); sem a fotografia do separador nem o «← Loja»', () => {
  const { pasta } = construida('agora');
  const pub = publicados(pasta);
  const comArtigos = JSON.parse(ler(pasta, 'content/categorias.json')).filter((c) => pub.some((p) => p.categoria === c.slug));
  for (const c of [null, ...comArtigos]) {
    const rel = c ? `loja/${c.slug}/index.html` : 'loja/index.html';
    const html = lerSaida(pasta, rel);
    const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
    assert.doesNotMatch(main, /class="medalhao|cabeca-pagina__rotulo/, `${rel}: ainda tem a fotografia do separador ou o «← Loja»`);
    // o loja.js troca o [data-loja-painel] pelo da página do separador: tudo o que muda tem de estar lá dentro
    const painel = main.slice(main.indexOf('data-loja-painel'));
    assert.ok(main.indexOf('class="pastilhas"') > 0 && main.indexOf('class="pastilhas"') < main.indexOf('data-loja-painel'), `${rel}: as pastilhas não estão por cima do painel`);
    assert.ok(painel.includes(`<h1 class="vitrine__titulo">${esc(c ? c.titulo : 'Loja')}</h1>`), `${rel}: o título não está no painel`);
    assert.equal((painel.match(/<li class="artigo">/g) || []).length, c ? pub.filter((p) => p.categoria === c.slug).length : pub.length, `${rel}: os artigos`);
    assert.match(main, new RegExp(`<a href="/dreamart/loja/${c ? `${c.slug}/` : ''}" aria-current="page">`), `${rel}: a pastilha do separador não está marcada`);
  }
});
await construcao('a página inicial: os separadores em monogramas (a letra e a palavra de categorias.json, o Natal no chocolate); o logótipo sem a bola no cabeçalho, no menu e no rodapé', () => {
  const { pasta } = construida('agora');
  const index = lerSaida(pasta, 'index.html');
  const pub = publicados(pasta);
  for (const c of JSON.parse(ler(pasta, 'content/categorias.json')).filter((k) => pub.some((p) => p.categoria === k.slug))) {
    const m = new RegExp(`<a class="circulo__ligacao" href="/dreamart/loja/${c.slug}/">\\s*<span class="medalhao"><span class="monograma( monograma--escuro)?" aria-hidden="true"><span class="monograma__letra">([^<]+)</span><span class="monograma__palavra">([^<]+)</span>`).exec(index);
    assert.ok(m, `o círculo de ${c.slug} não tem o monograma`);
    const esperado = monogramaDe(c);
    assert.deepEqual([Boolean(m[1]), m[2], m[3]], [esperado.escuro, esc(esperado.letra), esc(esperado.palavra)], c.slug);
  }
  // as peças do logótipo (scripts/logo-sem-circulo.py): no cabeçalho, o desenho inteiro com o semicírculo
  assert.match(index, /<a class="topo__logo" href="\/dreamart\/" aria-current="page"><img class="topo__logo-img" src="\/dreamart\/assets\/img\/logo-cabecalho-[0-9a-f]{10}-\d+\.webp"[^>]* sizes="\(min-width: 1024px\) 116px, 84px"[^>]* alt="Dream Art, Lembranças e Eventos — página inicial" fetchpriority="high"/);
  assert.match(index, /<img class="gaveta__logo" src="\/dreamart\/assets\/img\/logo-nome-/);
  assert.match(index, /<a class="rodape__logo" href="\/dreamart\/"><img src="\/dreamart\/assets\/img\/logo-rodape-[0-9a-f]{10}-\d+\.webp"[^>]* alt="Dream Art — página inicial"/);
  for (const peca of ['logo-cabecalho', 'logo-nome', 'logo-rodape']) assert.ok(fs.readdirSync(path.join(pasta, '_site/assets/img')).some((f) => f.startsWith(`${peca}-`)), `falta ${peca} em assets/img`);
});
await construcao('o catálogo da encomenda leva, de cada artigo publicado, o preço, as escolhas, a personalização e o mínimo; e as zonas e os portes; a ficha mostra o preço da regra', () => {
  const { pasta } = construida('agora');
  const url = /data-catalogo="([^"]+)"/.exec(lerSaida(pasta, 'index.html'))[1];
  assert.match(url, /^\/dreamart\/assets\/catalogo-[0-9a-f]{10}\.json$/);
  const cat = catalogoDe(pasta);
  const s = JSON.parse(ler(pasta, 'content/site.json'));
  assert.equal(cat.v, 2);
  assert.equal(cat.whatsapp, numeroWhatsApp(s.contactos.whatsapp));
  assert.deepEqual([cat.assets, cat.encomenda, cat.loja], ['/dreamart/assets/', '/dreamart/encomenda/', '/dreamart/loja/']);
  assert.deepEqual(cat.zonas.map((z) => z.id), s.entrega.zonas.map((z) => z.id));
  // os portes de cada zona de envio da loja (as de content/site.json com morada), ditos ou null
  const envio = s.entrega.zonas.filter((z) => z.morada).map((z) => z.id);
  assert.deepEqual(Object.keys(cat.portes).sort(), [...envio, 'gratisAPartirDe'].sort(), 'o catálogo não tem os portes de todas as zonas de envio');
  for (const z of envio) assert.equal(cat.portes[z], Number.isFinite(s.entrega.portes?.[z]) ? s.entrega.portes[z] : null, z);
  const pub = publicados(pasta);
  assert.deepEqual(Object.keys(cat.produtos).sort(), pub.map((p) => p.slug).sort());
  const hoje = hojeEmLisboa();
  for (const p of pub) {
    const c = cat.produtos[p.slug];
    assert.deepEqual([c.preco, c.precoAnterior, c.promocaoAte], [typeof p.preco === 'number' ? p.preco : null, p.precoAnterior || null, p.promocaoAte || ''], p.slug);
    assert.deepEqual(c.opcoes, R.opcoesDe(p), p.slug);
    assert.deepEqual(c.pers, R.personalizacaoDe(p), p.slug);
    assert.equal(c.minimo, R.quantidadeMinimaDe(p), p.slug);
    assert.equal(c.url, `/dreamart/produtos/${p.slug}/`);
    assert.equal(c.img.n, p.fotos[0], p.slug);
    const v = R.precoDe(p, hoje);
    const ficha = precoDaFicha(pasta, p.slug);
    assert.ok(v.atual === null ? ficha.includes('Preço por confirmar') : ficha.includes(euros(v.atual)), `${p.slug}: a ficha não mostra ${v.atual}`);
  }
});
await construcao('o que falta dizer aparece «[por confirmar: …]» na pré-visualização (termos, como encomendar, encomenda, ficha), e o registo lembra-o', () => {
  const r = construida('ensaio');
  const MARCAS = {
    'termos-e-condicoes/index.html': ['a rua e o número', 'quanto tempo leva a fazer e a entregar', 'as formas de pagamento', 'os portes para ', 'se fazem levantamento', 'se os preços incluem IVA'],
    'como-encomendar/index.html': ['quanto tempo leva a fazer e a entregar', 'as formas de pagamento', 'os portes para '],
    'encomenda/index.html': ['quanto tempo leva a fazer e a entregar', 'as formas de pagamento'],
    'produtos/ensaio-toalha/index.html': ['de que é feita a toalha', 'a rua e o número', 'quanto tempo leva a fazer e a entregar', 'as formas de pagamento'],
  };
  for (const [pagina, marcas] of Object.entries(MARCAS)) {
    const html = lerSaida(r.pasta, pagina);
    for (const m of marcas) assert.ok(html.includes(`<mark class="por-confirmar">[por confirmar: ${esc(m)}`), `${pagina}: falta «[por confirmar: ${m}…]»`);
  }
  for (const lembrete of ['Falta o prazo de produção e entrega', 'Faltam as formas de pagamento', 'Faltam os portes para', 'Falta dizer se os preços incluem IVA', 'A morada está incompleta', 'Toalha de ensaio: Falta a composição da toalha']) {
    assert.ok(r.saida.includes(lembrete), `o registo não lembra «${lembrete}»`);
  }
});
await construcao('os artigos de ensaio: a ficha e o catálogo com o preço da regra (a promoção riscada até ao fim, depois o preço normal; sem preço, «por confirmar»), as escolhas e a personalização', () => {
  const { pasta } = construida('ensaio');
  assert.match(precoDaFicha(pasta, 'ensaio-promocao'), new RegExp(`${escaparRe(euros(8))}[\\s\\S]*<s class="preco__antes">[\\s\\S]*${escaparRe(euros(10))}`));
  const acabada = precoDaFicha(pasta, 'ensaio-promocao-acabada');
  assert.ok(acabada.includes(euros(10)) && !acabada.includes('<s '), acabada);
  assert.match(precoDaFicha(pasta, 'ensaio-sem-preco'), /Preço por confirmar/);
  const c = catalogoDe(pasta).produtos;
  assert.deepEqual([c['ensaio-vela'].preco, c['ensaio-vela'].minimo, c['ensaio-vela'].desde], [3.8, 10, false]);
  assert.deepEqual(c['ensaio-vela'].pers, [{ id: 'nome', rotulo: 'Nomes ou iniciais', obrigatorio: true }, { id: 'data', rotulo: 'Data da celebração', obrigatorio: true }]);
  assert.deepEqual(c['ensaio-caixa'].opcoes, [{ nome: 'Cor', valores: [{ nome: 'Branco', suplemento: 0 }, { nome: 'Dourado', suplemento: 2 }] }]);
  assert.equal(c['ensaio-caixa'].desde, true);
  assert.equal(c['ensaio-sem-preco'].preco, null);
  assert.deepEqual([c['ensaio-promocao'].preco, c['ensaio-promocao'].precoAnterior, c['ensaio-promocao'].promocaoAte], [8, 10, '2999-12-31']);
  // a ficha tem o formulário de juntar, com os campos da personalização e o mínimo
  const vela = lerSaida(pasta, 'produtos/ensaio-vela/index.html');
  assert.match(vela, /<form class="juntar" data-juntar-form="ensaio-vela" data-minimo="10" novalidate>/);
  assert.match(vela, /name="nome"[^>]*required/);
  // a data: um campo de texto dd/mm/aaaa (a data sai como em Portugal em qualquer browser) e o calendário do sistema por cima do ícone
  assert.match(vela, /<div class="data" data-data><input id="pz-data-ensaio-vela" name="data" type="text" inputmode="numeric" placeholder="dd\/mm\/aaaa"[^>]* required><input class="data__calendario" type="date" tabindex="-1" aria-hidden="true">/);
  assert.doesNotMatch(vela, /name="data" type="date"/);
});
await construcao('um artigo sem nome sai do site sem parar a construção, e o registo diz porquê; um escondido também sai; uma fotografia em falta só tira essa fotografia', () => {
  const r = construida('ensaio');
  assert.ok(existeSaida(r.pasta, 'produtos/ensaio-vela/index.html'));
  const cat = catalogoDe(r.pasta);
  const todas = paginasHtml(r.pasta).map((x) => x.html).join('\n');
  for (const slug of ['ensaio-sem-nome', 'ensaio-escondido']) {
    assert.ok(!existeSaida(r.pasta, `produtos/${slug}`), `${slug} não devia ter ficha`);
    assert.ok(!(slug in cat.produtos), `${slug} não devia estar no catálogo`);
    assert.ok(!todas.includes(`/produtos/${slug}/`), `há uma ligação para ${slug}`);
  }
  assert.match(r.saida, /Artigos › ensaio-sem-nome: escondido do site \(Falta o nome do artigo/);
  assert.ok(existeSaida(r.pasta, 'produtos/ensaio-foto-em-falta/index.html'));
  assert.doesNotMatch(lerSaida(r.pasta, 'produtos/ensaio-foto-em-falta/index.html'), /fotografia-que-nao-existe/);
  assert.match(r.saida, /Artigos › Peça com fotografia em falta: com fotografias que não aparecem/);
});
await construcao('um separador que fica sem artigos sai do site (sem página e sem ligações), e a capa que levava lá leva à loja', () => {
  let alvo = '';
  let destaque = '';
  const pasta = copia('separador-vazio', (p) => {
    artigosDeEnsaio(p);
    const pub = publicados(p);
    destaque = JSON.parse(ler(p, 'content/inicio.json')).destaque?.categoria || '';
    alvo = pub.some((a) => a.categoria === destaque) ? destaque : pub[0].categoria;
    for (const a of pub.filter((x) => x.categoria === alvo)) json(p, `content/produtos/${a.slug}.json`, (x) => { x.publicado = false; });
    json(p, 'content/inicio.json', (h) => { h.capa[0].ligacao = `/loja/${alvo}/`; });
  });
  const r = construir(pasta);
  assert.equal(r.codigo, 0, r.saida);
  assert.ok(!existeSaida(pasta, `loja/${alvo}`), `o separador vazio «${alvo}» tem página`);
  for (const { rel, html } of paginasHtml(pasta)) assert.ok(!html.includes(`/dreamart/loja/${alvo}/`), `${rel} liga ao separador vazio «${alvo}»`);
  const index = lerSaida(pasta, 'index.html');
  assert.equal(/id="capa-1"[\s\S]*?<a class="botao[^"]*" href="([^"]+)"/.exec(index)?.[1], '/dreamart/loja/');
  assert.ok(r.saida.includes(`leva a /loja/${alvo}/, que não existe`), 'o registo não avisa da ligação da capa');
  if (alvo === destaque) assert.ok(!index.includes('id="t-destaque"'), 'o destaque de um separador vazio continua na página inicial');
});
await construcao('a produção (--producao) pára sem o prazo e o pagamento e diz quais; no CI, como anotações ::error com o ecrã (o que o painel lê)', () => {
  const pasta = copia('producao-sem-prazo', (p) => json(p, 'content/site.json', (s) => { dadosLegaisDeEnsaio(s); Object.assign(s.entrega, { prazo: '', pagamento: '' }); }));
  const r = construir(pasta, ['--producao'], { GITHUB_ACTIONS: 'true' });
  assert.notEqual(r.codigo, 0, 'a produção publicou sem o prazo e o pagamento');
  assert.match(r.saida, /A publicação parou: 2 problemas no conteúdo\./);
  assert.match(r.saida, /✗ Dados da loja › Entrega e pagamento: Falta o prazo/);
  assert.match(r.saida, /✗ Dados da loja › Entrega e pagamento: Faltam as formas de pagamento/);
  assert.match(r.saida, /^::error title=Dados da loja › Entrega e pagamento::Falta o prazo/m);
  assert.match(r.saida, /^::error title=Dados da loja › Entrega e pagamento::Faltam as formas de pagamento/m);
  assert.ok(!existeSaida(pasta, 'index.html'), 'parou depois de escrever o site');
  // só o pagamento em falta: diz só esse
  const s2 = copia('producao-sem-pagamento', (p) => json(p, 'content/site.json', (s) => { dadosLegaisDeEnsaio(s); s.entrega.pagamento = ''; }));
  const r2 = construir(s2, ['--producao']);
  assert.notEqual(r2.codigo, 0);
  assert.match(r2.saida, /A publicação parou: 1 problema no conteúdo\./);
  assert.match(r2.saida, /Faltam as formas de pagamento/);
  assert.doesNotMatch(r2.saida, /Falta o prazo/);
});
await construcao('com os dados legais preenchidos (de faz-de-conta), a produção constrói: aberta aos motores de busca, com o sitemap e o canonical em https://dreamart.pt/, e sem nada «por confirmar»', () => {
  const { pasta } = construida('producao');
  const locs = [...lerSaida(pasta, 'sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  for (const l of locs) assert.ok(l.startsWith('https://dreamart.pt/'), l);
  for (const p of ['/', '/loja/', '/produtos/ensaio-vela/', '/termos-e-condicoes/']) assert.ok(locs.includes(`https://dreamart.pt${p}`), `o sitemap não tem ${p}`);
  for (const p of ['/encomenda/', '/favoritos/', '/carrinho/', '/404.html']) assert.ok(!locs.includes(`https://dreamart.pt${p}`), `o sitemap tem ${p}`);
  assert.match(lerSaida(pasta, 'robots.txt'), /User-agent: \*\nAllow: \/\n\nSitemap: https:\/\/dreamart\.pt\/sitemap\.xml/);
  assert.match(lerSaida(pasta, '_headers'), /X-Content-Type-Options: nosniff/);
  const chave = fs.readdirSync(path.join(pasta, '_site')).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
  assert.ok(chave && lerSaida(pasta, chave) === chave.slice(0, -4), 'falta a chave do IndexNow');
  for (const { rel, html } of paginasHtml(pasta)) {
    assert.doesNotMatch(html, /por confirmar|por-confirmar/, rel);
    const canonico = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1] || '';
    assert.ok(canonico.startsWith('https://dreamart.pt/'), `${rel}: canonical ${canonico}`);
    for (const u of enderecos(html).filter(interno)) assert.ok(u.startsWith('/') && !u.startsWith('/dreamart/'), `${rel}: ${u}`);
    // no sitemap, aberta; fora dele (a encomenda, os favoritos, o 404), fechada
    const robots = /<meta name="robots" content="([^"]+)"/.exec(html)?.[1];
    if (locs.includes(`https://dreamart.pt/${rel.replace(/index\.html$/, '')}`)) assert.equal(robots, undefined, `${rel} está no sitemap mas fechada aos motores de busca`);
    else assert.match(robots || '', /noindex/, `${rel} fora do sitemap mas aberta`);
  }
  const termos = lerSaida(pasta, 'termos-e-condicoes/index.html');
  for (const t of [PRAZO, PAGAMENTO, 'Rua do Ensaio, 1', euros(4.5)]) assert.ok(termos.includes(esc(t)), `os termos não dizem «${t}»`);
  assert.ok(lerSaida(pasta, 'produtos/ensaio-toalha/index.html').includes(`<strong>Composição:</strong> ${esc(COMPOSICAO)}`));
  assert.ok(!existeSaida(pasta, 'produtos/ensaio-sem-preco'), 'em produção, um artigo sem preço sai do site');
});
await construcao('em produção, o que ainda pode faltar (os portes, o IVA, o levantamento) diz «a confirmar» ou cala-se, nunca «[por confirmar]», e a produção constrói', () => {
  let site = null;
  const pasta = copia('producao-minima', (p) => {
    json(p, 'content/site.json', (s) => {
      dadosLegaisDeEnsaio(s);
      s.empresa.iva = '';
      Object.assign(s.entrega, { levantamento: '', portes: { continente: null, ilhas: null, europa: null, gratisAPartirDe: null } });
      site = s;
    });
    composicaoDasToalhas(p, COMPOSICAO);
  });
  const r = construir(pasta, ['--producao']);
  assert.equal(r.codigo, 0, r.saida);
  for (const { rel, html } of paginasHtml(pasta)) assert.doesNotMatch(html, /por confirmar|por-confirmar/, rel);
  const termos = lerSaida(pasta, 'termos-e-condicoes/index.html');
  const envio = site.entrega.zonas.filter((z) => z.morada);
  for (const z of envio) assert.ok(termos.includes(`${esc(z.curto)}: a confirmar`), `os termos não dizem «${z.curto}: a confirmar»`);
  assert.deepEqual(envio.map((z) => catalogoDe(pasta).portes[z.id]), envio.map(() => null), 'no catálogo, os portes por dizer têm de ir vazios (a encomenda diz «a confirmar»)');
  // sem o texto do levantamento, o domínio não o oferece: nem na encomenda, nem no catálogo, nem nos termos, nem nas fichas
  const encomenda = lerSaida(pasta, 'encomenda/index.html');
  assert.ok(!encomenda.includes('value="levantamento"') && !encomenda.includes('data-so-levantamento'), 'a encomenda oferece o levantamento');
  assert.ok(!catalogoDe(pasta).zonas.some((z) => z.id === 'levantamento'), 'o catálogo tem o levantamento');
  const nome = site.entrega.zonas.find((z) => z.id === 'levantamento').curto;
  assert.ok(!termos.includes(esc(nome)), `os termos falam de «${nome}»`);
  assert.ok(!lerSaida(pasta, 'produtos/vela-tulipa/index.html').includes(esc(nome)), `a ficha fala de «${nome}»`);
});
await construcao('em produção, um artigo com toalha sem a composição sai do site (a lei pede-a antes da compra), e o resto publica-se', () => {
  let toalhas = [];
  const pasta = copia('producao-sem-composicao', (p) => { json(p, 'content/site.json', dadosLegaisDeEnsaio); artigosDeEnsaio(p); toalhas = composicaoDasToalhas(p, ''); });
  const r = construir(pasta, ['--producao']);
  assert.equal(r.codigo, 0, r.saida);
  assert.ok(toalhas.includes('ensaio-toalha'));
  const sitemap = lerSaida(pasta, 'sitemap.xml');
  for (const slug of toalhas) {
    assert.ok(!existeSaida(pasta, `produtos/${slug}`), `${slug} sem composição está no site`);
    assert.ok(!sitemap.includes(`/produtos/${slug}/`), `${slug} está no sitemap`);
  }
  assert.ok(existeSaida(pasta, 'produtos/ensaio-vela/index.html'));
  assert.match(r.saida, /Artigos › Toalha de ensaio: escondido do site \(Falta a composição da toalha/);
});
await construcao('uma fotografia que não existe (na capa ou num separador) pára a construção, e diz onde', () => {
  const pasta = copia('foto', (p) => {
    json(p, 'content/inicio.json', (h) => { h.capa[0].foto = 'fotografia-que-nao-existe'; });
    json(p, 'content/categorias.json', (c) => { c[0].foto = 'outra-que-nao-existe'; });
  });
  const r = construir(pasta);
  assert.notEqual(r.codigo, 0, 'construiu com fotografias que não existem');
  assert.match(r.saida, /✗ Página inicial: Esta fotografia já não está na biblioteca/);
  assert.match(r.saida, /✗ Categorias: A fotografia da categoria .* não existe na biblioteca/);
});
await construcao(
  'a frase «obrigação de pagar» numa página de texto pára a construção',
  () => {
    const pasta = copia('frase', (p) => acrescentar(p, 'content/paginas/perguntas-frequentes.md', '\n\n## Teste\n\nEncomenda com obrigação de pagar.\n'));
    const r = construir(pasta);
    assert.notEqual(r.codigo, 0, 'construiu, e a página publicava «obrigação de pagar»');
    assert.match(r.saida, /obriga[çc][ãa]o de pagar/i);
  },
);
await construcao('um marcador {{…}} desconhecido numa página de texto pára a construção, e diz qual', () => {
  const pasta = copia('marcador', (p) => acrescentar(p, 'content/paginas/garantia.md', '\n\n{{inexistente}}\n'));
  const r = construir(pasta);
  assert.notEqual(r.codigo, 0);
  assert.match(r.saida, /garantia\.md: o marcador «\{\{inexistente\}\}» não existe/);
});
await construcao('uma ligação interna partida numa página de texto pára a construção; uma boa sai com /dreamart/', () => {
  const pasta = copia('ligacao', (p) => acrescentar(p, 'content/paginas/garantia.md', '\n\n[Ligação partida](/nao-existe/)\n'));
  const r = construir(pasta);
  assert.notEqual(r.codigo, 0);
  assert.match(r.saida, /garantia\/index\.html: ligação partida: \/dreamart\/nao-existe\//);
  assert.ok(lerSaida(construida('ensaio').pasta, 'garantia/index.html').includes('<a href="/dreamart/loja/">Ver a loja</a>'));
});
await construcao('uma alegação que a lei só deixa fazer com prova («sustentável») numa página de texto pára a construção', () => {
  const pasta = copia('alegacao', (p) => acrescentar(p, 'content/paginas/garantia.md', '\n\nUma embalagem sustentável.\n'));
  const r = construir(pasta);
  assert.notEqual(r.codigo, 0);
  assert.match(r.saida, /Páginas › garantia\.md: «sustentável» é uma alegação/);
});
await construcao('os restos da Mimices (o nome, os tons de linho, o endereço local dela) param a construção, numa página, no JavaScript ou no CSS', () => {
  const casos = [
    ['restos-pagina', (p) => acrescentar(p, 'content/paginas/perguntas-frequentes.md', '\n\n## Teste\n\nComo na Mimices.\n'), /perguntas-frequentes\/index\.html: tem «Mimices» \(resto de outro site\)/],
    ['restos-js', (p) => acrescentar(p, 'src/scripts/procura.js', '\n// http://localhost:4830/\n'), /assets\/site-[0-9a-f]+\.js: tem «localhost:4830» \(resto de outro site\)/],
    ['restos-css', (p) => acrescentar(p, 'src/estilos/site.css', '\n/* os tons de linho */\n'), /assets\/site-[0-9a-f]+\.css: tem «tons de linho» \(resto de outro site\)/],
  ];
  for (const [nome, mexer, mensagem] of casos) {
    const r = construir(copia(nome, mexer));
    assert.notEqual(r.codigo, 0, `${nome}: construiu`);
    assert.match(r.saida, mensagem, nome);
  }
});
await construcao('a capa com um só diapositivo não tem abas; com cinco mostra quatro e avisa; sem nenhum, pára', () => {
  const um = construir(copia('capa-um', (p) => json(p, 'content/inicio.json', (h) => { h.capa = h.capa.slice(0, 1); })));
  assert.equal(um.codigo, 0, um.saida);
  const titulo = JSON.parse(ler(um.pasta, 'content/inicio.json')).capa[0].titulo;
  const index1 = lerSaida(um.pasta, 'index.html');
  assert.doesNotMatch(index1, /capa__controlos|capa__aba|aria-roledescription="carrossel"/);
  assert.ok(index1.includes(`<h1 class="capa__titulo">${esc(titulo)}</h1>`), 'o título do diapositivo não é o h1');
  const cinco = construir(copia('capa-cinco', (p) => json(p, 'content/inicio.json', (h) => { h.capa = [1, 2, 3, 4, 5].map((n) => ({ ...h.capa[0], aba: `Aba de ensaio ${n}` })); })));
  assert.equal(cinco.codigo, 0, cinco.saida);
  const index5 = lerSaida(cinco.pasta, 'index.html');
  assert.equal((index5.match(/class="capa__aba"/g) || []).length, 4);
  assert.ok(index5.includes('Aba de ensaio 4') && !index5.includes('Aba de ensaio 5'));
  assert.equal((index5.match(/<h1[\s>]/g) || []).length, 1);
  assert.match(cinco.saida, /A capa tem 5 diapositivos; o máximo é 4/);
  const nenhum = construir(copia('capa-vazia', (p) => json(p, 'content/inicio.json', (h) => { h.capa = []; })));
  assert.notEqual(nenhum.codigo, 0);
  assert.match(nenhum.saida, /✗ Página inicial: A capa precisa de pelo menos um diapositivo/);
});
await construcao('a faixa de confiança desenha o ícone de cada frase; um desconhecido fica a flor e avisa; um ícone de ICONES_CONFIANCA sem desenho pára o gerador', () => {
  const r = construir(copia('confianca', (p) => json(p, 'content/inicio.json', (h) => {
    h.confianca = [{ icone: 'presente', texto: 'Frase um' }, { icone: 'estrela', texto: 'Frase dois' }, { icone: 'foguete', texto: 'Frase três' }];
  })));
  assert.equal(r.codigo, 0, r.saida);
  const index = lerSaida(r.pasta, 'index.html');
  const i = index.indexOf('<section class="confianca"');
  assert.ok(i >= 0, 'a página inicial não tem a faixa de confiança');
  const faixa = index.slice(i, index.indexOf('</section>', i));
  assert.deepEqual([...faixa.matchAll(/href="#i-([\w-]+)"/g)].map((m) => m[1]), ['presente', 'estrela', 'flor']);
  assert.match(r.saida, /Página inicial: Este ícone não existe/);
  const sem = construir(copia('icone-sem-desenho', (p) => {
    const f = path.join(p, 'src/templates/icones.mjs');
    const antes = fs.readFileSync(f, 'utf8');
    const depois = antes.replace(/^\s*estrela: .*\n/m, '');
    assert.notEqual(depois, antes, 'o teste não conseguiu tirar o desenho da estrela de icones.mjs');
    fs.writeFileSync(f, depois);
  }));
  assert.notEqual(sem.codigo, 0);
  assert.match(sem.saida, /os ícones estrela da faixa de confiança não têm desenho/);
});
/* «O que o painel deixa gravar é o que a publicação aceita» (o build.mjs, ao ler as regras): dois casos
   em que não é assim. */
await construcao(
  'o que o painel deixa gravar, a produção aceita: sem o telefone (as regras deixam-no vazio), não pára com um erro técnico',
  () => {
    let site = null;
    const pasta = copia('sem-telefone', (p) => {
      json(p, 'content/site.json', (s) => { dadosLegaisDeEnsaio(s); s.contactos.telefone = ''; site = s; });
      composicaoDasToalhas(p, COMPOSICAO);
    });
    const r = construir(pasta, ['--producao']);
    const pedeTelefone = R.problemasDoSite(site, { producao: true }).some((p) => p.classe === 'bloqueia' && /telefone/.test(p.campo || ''));
    assert.ok(r.codigo === 0 || pedeTelefone, `a produção parou: ${r.saida.split('\n').find((l) => l.includes('✗')) || ''}`);
  },
);
await construcao(
  'o que o painel deixa gravar, a pré-visualização aceita: o nome de uma cliente («Susana») na descrição de um artigo',
  () => {
    let artigo = null;
    const pasta = copia('nome-de-cliente', (p) => {
      artigosDeEnsaio(p);
      json(p, 'content/produtos/ensaio-vela.json', (a) => { a.descricao += '\n\nNa fotografia: as lembranças do batizado da Susana.'; artigo = a; });
    });
    const r = construir(pasta);
    const painelRecusa = R.problemasDoArtigo(artigo, { nome: 'ensaio-vela' }).length > 0;
    assert.ok(r.codigo === 0 || painelRecusa, `a construção parou: ${r.saida.split('\n').find((l) => l.includes('✗')) || ''}`);
  },
);

await construcao(
  'o que a Dream Art escreve no pagamento ou no prazo («MB WAY & transferência») aparece tal e qual nas páginas de texto',
  () => {
    const pasta = copia('e-comercial', (p) => json(p, 'content/site.json', (s) => { s.entrega.pagamento = 'MB WAY & transferência bancária.'; }));
    const r = construir(pasta);
    assert.equal(r.codigo, 0, r.saida);
    for (const pagina of ['termos-e-condicoes/index.html', 'encomenda/index.html']) {
      const html = lerSaida(pasta, pagina);
      assert.ok(html.includes('MB WAY &amp; transferência bancária.') && !html.includes('&amp;amp;'), `${pagina}: «${/MB WAY[^<]*/.exec(html)?.[0]}»`);
    }
  },
);

// ---------------------------------------------------------------- a mensagem do WhatsApp
console.log('\na mensagem do WhatsApp (o nucleo.js e o carrinho.js num vm, com a página e o catálogo construídos)');
/* A ENCOMENDA, SEM BROWSER: o nucleo.js e o carrinho.js (os que o gerador junta no site-*.js) correm num
   vm, com o localStorage em memória, o catálogo que o gerador escreveu e a página /encomenda/ que ele
   escreveu, reduzida ao que o carrinho lá procura: os campos e as zonas lêem-se do HTML, e cada
   elemento que o carrinho pede tem de existir na página publicada. «Encomendar pelo WhatsApp» abre o
   wa.me com a mensagem escrita: apanha-se no window.open. */
class Elemento {
  constructor(pagina, props = {}) {
    Object.assign(this, { hidden: false, innerHTML: '', textContent: '', value: '', required: false, checked: false, disabled: false, tabIndex: 0, href: '', id: '', name: '' }, props);
    this.pagina = pagina;
    this.dataset = {};
    this.style = {};
    this.ouvintes = {};
    this.atributos = {};
    this.firstChild = { textContent: '' };
    this.classList = { add() {}, remove() {}, toggle() {}, contains: () => false };
  }
  querySelector(s) { return this.pagina.um(s); }
  querySelectorAll(s) { return this.pagina.varios(s); }
  setAttribute(k, v) { this.atributos[k] = String(v); }
  getAttribute(k) { return k in this.atributos ? this.atributos[k] : null; }
  removeAttribute(k) { delete this.atributos[k]; }
  hasAttribute(k) { return k in this.atributos; }
  addEventListener(tipo, f) { (this.ouvintes[tipo] ||= []).push(f); }
  focus() {}
  closest() { return null; }
  // o carrinho muda a frase do erro de sítio (para junto do campo que falta, ou do botão)
  before() {}
  append() {}
}
/* Um seletor simples existe no HTML? ([data-x], #id, tag[attr="v"], tag; os compostos não se conferem) */
function noHtml(html, s) {
  let m;
  if ((m = /^\[([\w-]+)\]$/.exec(s))) return new RegExp(`\\s${m[1]}(?=[\\s=>])`).test(html);
  if ((m = /^#([\w-]+)$/.exec(s))) return html.includes(` id="${m[1]}"`);
  if ((m = /^(\w+)\[([\w-]+)="([^"]*)"\]$/.exec(s))) return new RegExp(`<${m[1]}\\b[^>]*\\s${m[2]}="${escaparRe(m[3])}"`).test(html);
  if (/^\w+$/.test(s)) return new RegExp(`<${s}\\b`).test(html);
  return true;
}
function paginaDaEncomenda(html) {
  const pedidos = new Set();
  const unicos = new Map();
  const campos = {};
  const radios = [];
  const envio = [];
  const pagina = {
    um(s) { pedidos.add(s); if (!unicos.has(s)) unicos.set(s, new Elemento(pagina)); return unicos.get(s); },
    varios(s) {
      if (s === 'input[name="zona"]') return radios;
      if (s === '[data-obrigatorio-envio]') return envio;
      if (s === '[aria-invalid]') return Object.values(campos).filter((e) => e.hasAttribute('aria-invalid'));
      return [];
    },
  };
  const i = html.indexOf('data-encomenda-form');
  assert.ok(i >= 0, 'a página da encomenda não tem o formulário');
  // os atributos de uma etiqueta (sem o «>»): um atributo sem valor pode ser o último
  const tem = (a, nome) => new RegExp(`\\s${nome}(?=[\\s=/]|$)`).test(a);
  for (const m of html.slice(i, html.indexOf('</form>', i)).matchAll(/<(?:input|textarea)\b([^>]*)>/g)) {
    const a = m[1];
    const nome = /\sname="([^"]+)"/.exec(a)?.[1];
    if (!nome) continue;
    const el = new Elemento(pagina, { name: nome, id: /\sid="([^"]+)"/.exec(a)?.[1] || '', value: /\svalue="([^"]*)"/.exec(a)?.[1] || '', required: tem(a, 'required'), checked: tem(a, 'checked') });
    if (nome === 'zona') radios.push(el); else campos[nome] = el;
    if (tem(a, 'data-obrigatorio-envio')) envio.push(el);
  }
  assert.ok(envio.length >= 3 && campos.nome?.required, 'a página da encomenda já não marca os campos obrigatórios como o carrinho espera');
  const form = new Elemento(pagina, { elements: campos });
  unicos.set('[data-encomenda-form]', form);
  unicos.set('input', campos.pais);   // o único campo do [data-so-europa]
  return { pagina, form, campos, radios, pedidos, unicos };
}
async function encomendar(pasta, { linhas, zona, dados = {}, mudarCatalogo = () => {}, estado = null, semEnviar = false }) {
  const html = lerSaida(pasta, 'encomenda/index.html');
  const urlCatalogo = /data-catalogo="([^"]+)"/.exec(html)[1];
  const raiz = /data-base="([^"]+)"/.exec(html)[1];
  const catalogo = JSON.parse(lerSaida(pasta, urlCatalogo.slice(raiz.length)));
  mudarCatalogo(catalogo);
  const p = paginaDaEncomenda(html);
  assert.deepEqual(p.radios.map((r) => r.value), catalogo.zonas.map((z) => z.id), 'as zonas da página não são as do catálogo');
  for (const [k, v] of Object.entries(dados)) { assert.ok(p.campos[k], `a página da encomenda não tem o campo «${k}»`); p.campos[k].value = v; }
  const armazem = new Map([['dreamart:carrinho', JSON.stringify(estado || { v: 1, linhas, zona })]]);
  const abertos = [];
  const janela = {
    document: { querySelector: (s) => p.pagina.um(s), querySelectorAll: (s) => p.pagina.varios(s), body: { dataset: { catalogo: urlCatalogo, base: raiz } } },
    localStorage: { getItem: (k) => (armazem.has(k) ? armazem.get(k) : null), setItem: (k, v) => { armazem.set(k, String(v)); }, removeItem: (k) => { armazem.delete(k); } },
    matchMedia: (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }),
    fetch: async (u) => (u === urlCatalogo ? { ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(catalogo)) } : { ok: false, status: 404 }),
    open: (u) => { abertos.push(u); return {}; },
    location: { href: '' },
    addEventListener() {},
    setTimeout,
    clearTimeout,
    console,
  };
  janela.window = janela;
  vm.createContext(janela);
  vm.runInContext(`${lerRaiz('src/scripts/nucleo.js')}\n${lerRaiz('src/scripts/carrinho.js')}`, janela, { filename: 'site.js' });
  await janela.DA.catalogo();
  await new Promise((r) => setImmediate(r));
  const enviar = p.form.ouvintes.submit?.[0];
  assert.ok(enviar, 'o carrinho.js não ligou o envio da encomenda');
  if (!semEnviar) {
    await enviar({ preventDefault() {}, target: p.form });
    await new Promise((r) => setImmediate(r));
  }
  assert.deepEqual([...p.pedidos].filter((s) => !noHtml(html, s)), [], 'o carrinho procura na página da encomenda o que ela não tem');
  const url = abertos[0] || '';
  const i = url.indexOf('?text=');
  return { url, mensagem: i < 0 ? '' : decodeURIComponent(url.slice(i + 6)), guardado: armazem.get('dreamart:carrinho'), catalogo, unicos: p.unicos, janela, armazem };
}
/* As linhas esperadas estão na mensagem, por esta ordem. */
function emOrdem(mensagem, esperadas) {
  const linhas = mensagem.split('\n');
  let i = -1;
  for (const e of esperadas) {
    const j = linhas.indexOf(e, i + 1);
    assert.ok(j > i, `falta a linha «${e}» (ou está fora de ordem) na mensagem:\n${mensagem}`);
    i = j;
  }
}
const zonaNome = (cat, id) => cat.zonas.find((z) => z.id === id).nome;
const NUNCA = /gr[áa]tis|gratuit|obriga[çc][ãa]o de pagar|undefined|NaN|null|\[object/i;
const CLIENTE = { nome: 'Maria Ensaio', morada: 'Rua do Ensaio, 1', codigoPostal: '4435-000', localidade: 'Rio Tinto', notas: 'Entregar de manhã' };
const PECAS = [
  { produto: 'ensaio-vela', opcoes: [], pers: { nome: 'Ana & Rui', data: '2026-12-12' }, qtd: 20 },
  { produto: 'ensaio-caixa', opcoes: [1], pers: { frase: 'Com muito amor' }, qtd: 2 },
];

await construcao('leva as peças, as quantidades, a personalização e os preços; a entrega com os portes «a confirmar» (ainda sem valor); o total; o nome e a morada; e não inventa o pagamento', async () => {
  const { pasta } = construida('ensaio');
  const r = await encomendar(pasta, { linhas: PECAS, zona: 'continente', dados: CLIENTE });
  assert.ok(r.url.startsWith(`https://wa.me/${numeroWhatsApp(JSON.parse(ler(pasta, 'content/site.json')).contactos.whatsapp)}?text=`), r.url);
  emOrdem(r.mensagem, [
    'Olá! Quero fazer esta encomenda:',
    `*20 × Vela de ensaio* — ${euros(76)}`,
    '- Nomes ou iniciais: Ana & Rui',
    '- Data da celebração: 12 de dezembro de 2026',
    `*2 × Caixa de ensaio* — ${euros(24)}`,
    `- Cor: Dourado (+ ${euros(2)})`,
    '- Frase: Com muito amor',
    `Subtotal: ${euros(100)}`,
    `Entrega: ${zonaNome(r.catalogo, 'continente')} — portes a confirmar`,
    `*Total: ${euros(100)} + portes*`,
    'Nome: Maria Ensaio',
    'Morada: Rua do Ensaio, 1, 4435-000 Rio Tinto',
    'Observações: Entregar de manhã',
  ]);
  assert.doesNotMatch(r.mensagem, NUNCA);
  assert.doesNotMatch(r.mensagem, /Pagamento/, 'sem as formas de pagamento ditas, a mensagem não as inventa');
  // e a página mostra o mesmo: as peças e o total com os portes por somar
  assert.ok(r.unicos.get('[data-linhas]').innerHTML.includes('Vela de ensaio'));
  assert.ok(r.unicos.get('[data-resumo]').innerHTML.includes(`${euros(100)} + portes`));
});
await construcao('no levantamento: sem portes e sem morada', async () => {
  const r = await encomendar(construida('ensaio').pasta, { linhas: PECAS, zona: 'levantamento', dados: CLIENTE });
  emOrdem(r.mensagem, [`Subtotal: ${euros(100)}`, `Entrega: ${zonaNome(r.catalogo, 'levantamento')}`, `*Total: ${euros(100)}*`, 'Nome: Maria Ensaio']);
  assert.doesNotMatch(r.mensagem, /portes|^Morada:/m);
  assert.doesNotMatch(r.mensagem, NUNCA);
});
await construcao('com os portes e o pagamento ditos (a produção de ensaio), leva-os e soma os portes ao total', async () => {
  const r = await encomendar(construida('producao').pasta, { linhas: PECAS, zona: 'continente', dados: CLIENTE });
  emOrdem(r.mensagem, [`Subtotal: ${euros(100)}`, `Entrega: ${zonaNome(r.catalogo, 'continente')} — portes ${euros(4.5)}`, `*Total: ${euros(104.5)}*`, `Pagamento: ${PAGAMENTO}`, 'Nome: Maria Ensaio']);
  assert.doesNotMatch(r.mensagem, NUNCA);
});
await construcao('para a Europa: a morada leva o país', async () => {
  const dados = { ...CLIENTE, morada: 'Calle de Prueba, 1', codigoPostal: '28001', localidade: 'Madrid', pais: 'Espanha' };
  const r = await encomendar(construida('ensaio').pasta, { linhas: PECAS.slice(0, 1), zona: 'europa', dados });
  emOrdem(r.mensagem, [`*20 × Vela de ensaio* — ${euros(76)}`, `Entrega: ${zonaNome(r.catalogo, 'europa')} — portes a confirmar`, `*Total: ${euros(76)} + portes*`, 'Morada: Calle de Prueba, 1, 28001 Madrid, Espanha']);
});
await construcao('o preço de cada peça é o da regra (a promoção até ao fim, depois o normal); sem preço, «a confirmar» até ao total; uma peça que saiu da loja não entra', async () => {
  const { pasta } = construida('ensaio');
  const hoje = hojeEmLisboa();
  const artigo = (slug) => JSON.parse(ler(pasta, `content/produtos/${slug}.json`));
  const promo = R.precoDe(artigo('ensaio-promocao'), hoje).atual;
  const acabada = R.precoDe(artigo('ensaio-promocao-acabada'), hoje).atual;
  assert.deepEqual([promo, acabada], [8, 10]);
  const linhas = [{ produto: 'ensaio-sem-preco', qtd: 3 }, { produto: 'ensaio-promocao', qtd: 2 }, { produto: 'ensaio-promocao-acabada', qtd: 1 }, { produto: 'ensaio-que-saiu-da-loja', qtd: 4 }];
  const r = await encomendar(pasta, { linhas, zona: 'levantamento', dados: CLIENTE });
  emOrdem(r.mensagem, [
    '*3 × Peça sem preço* — preço a confirmar',
    `*2 × Peça em promoção* — ${euros(2 * promo)}`,
    `*1 × Promoção acabada* — ${euros(acabada)}`,
    `Subtotal: ${euros(2 * promo + acabada)} + a confirmar`,
    '*Total: a confirmar consigo*',
  ]);
  assert.doesNotMatch(r.mensagem, /4 ×|ensaio-que-saiu/);
});
await construcao('portes grátis a partir de um valor (quando a Dream Art o disser): a conta dá 0 €, e a mensagem nunca escreve «grátis»', async () => {
  const { pasta } = construida('ensaio');
  const acima = await encomendar(pasta, { linhas: PECAS, zona: 'continente', dados: CLIENTE, mudarCatalogo: (c) => { Object.assign(c.portes, { continente: 4.5, gratisAPartirDe: 50 }); } });
  emOrdem(acima.mensagem, [`Entrega: ${zonaNome(acima.catalogo, 'continente')} — portes ${euros(0)}`, `*Total: ${euros(100)}*`]);
  const abaixo = await encomendar(pasta, { linhas: PECAS, zona: 'continente', dados: CLIENTE, mudarCatalogo: (c) => { Object.assign(c.portes, { continente: 4.5, gratisAPartirDe: 150 }); } });
  emOrdem(abaixo.mensagem, [`Entrega: ${zonaNome(abaixo.catalogo, 'continente')} — portes ${euros(4.5)}`, `*Total: ${euros(104.5)}*`]);
  for (const r of [acima, abaixo]) assert.doesNotMatch(r.mensagem, NUNCA);
});
await construcao('o browser guarda a encomenda e a hora do envio, nunca o nome, a morada nem as observações (como promete a política de privacidade)', async () => {
  const r = await encomendar(construida('ensaio').pasta, { linhas: PECAS, zona: 'continente', dados: CLIENTE });
  const g = JSON.parse(r.guardado);
  assert.deepEqual(g.linhas.map((l) => [l.produto, l.qtd]), [['ensaio-vela', 20], ['ensaio-caixa', 2]]);
  assert.ok(g.enviada && typeof g.enviada.em === 'string', 'falta a marca «enviada»');
  for (const v of Object.values(CLIENTE)) assert.ok(!r.guardado.includes(v), `o browser guardou «${v}»`);
  assert.match(lerRaiz('content/paginas/politica-de-privacidade.md'), /sem o nome, a morada nem as observações/);
});
await construcao('sem o nome (ou, num envio, sem a morada), não abre o WhatsApp e diz que falta', async () => {
  const { pasta } = construida('ensaio');
  const semNome = await encomendar(pasta, { linhas: PECAS, zona: 'levantamento', dados: { ...CLIENTE, nome: '' } });
  assert.equal(semNome.url, '');
  const erro = semNome.unicos.get('[data-erro-encomenda]');
  assert.ok(erro && erro.hidden === false && /^Falta preencher/.test(erro.textContent), 'não diz o que falta');
  const semMorada = await encomendar(pasta, { linhas: PECAS, zona: 'continente', dados: { ...CLIENTE, morada: '' } });
  assert.equal(semMorada.url, '');
});
await construcao('depois de recarregar, a encomenda enviada não abre um WhatsApp vazio: «Enviar outra vez» volta ao formulário', async () => {
  const { pasta } = construida('ensaio');
  const primeira = await encomendar(pasta, { linhas: PECAS, zona: 'continente', dados: CLIENTE });
  // na página que a enviou, «Abrir o WhatsApp» leva a mensagem, e não há «Enviar outra vez»
  assert.ok(primeira.unicos.get('[data-continuar]').href.includes('?text='), '«Abrir o WhatsApp» sem a mensagem');
  assert.equal(primeira.unicos.get('[data-reenviar]').hidden, true);
  // a mesma encomenda, numa página nova: a mensagem (com o nome e a morada) só vivia na memória da outra
  const r = await encomendar(pasta, { estado: JSON.parse(primeira.guardado), semEnviar: true });
  assert.equal(r.unicos.get('[data-enviada]').hidden, false, 'não diz «Encomenda enviada»');
  assert.equal(r.unicos.get('[data-continuar]').hidden, true, '«Abrir o WhatsApp» abria a conversa sem a mensagem');
  assert.equal(r.unicos.get('[data-reenviar]').hidden, false, 'falta «Enviar outra vez»');
  await r.unicos.get('[data-reenviar]').ouvintes.click[0]();
  assert.equal(JSON.parse(r.armazem.get('dreamart:carrinho')).enviada, undefined, '«Enviar outra vez» não voltou ao formulário');
});
await construcao('uma peça juntada depois de enviada começa outra encomenda (a que seguiu não se repete); o mesmo nome com outra maiúscula é outra linha', async () => {
  const { pasta } = construida('ensaio');
  const primeira = await encomendar(pasta, { linhas: PECAS, zona: 'continente', dados: CLIENTE });
  const r = await encomendar(pasta, { estado: JSON.parse(primeira.guardado), semEnviar: true });
  const { juntar } = r.janela.DA.carrinho;
  assert.equal(juntar({ produto: 'ensaio-vela', pers: { nome: 'Rita' }, qtd: 1 }).nova, true, 'não disse que é uma encomenda nova');
  assert.equal(juntar({ produto: 'ensaio-vela', pers: { nome: 'rita' }, qtd: 1 }).nova, false);
  const g = JSON.parse(r.armazem.get('dreamart:carrinho'));
  assert.deepEqual(g.linhas.map((l) => [l.produto, l.pers.nome, l.qtd]), [['ensaio-vela', 'Rita', 1], ['ensaio-vela', 'rita', 1]]);
  assert.equal(g.zona, 'continente', 'a encomenda nova perdeu a entrega escolhida');
  assert.equal(g.enviada, undefined);
});

// ---------------------------------------------------------------- fim
console.log('');
if (paragem) {
  console.log(seguro(`As construções saltaram: a pré-visualização do conteúdo de agora não constrói.\n${paragem.map((l) => `  ${l.trim()}`).join('\n')}`));
  if (NO_CI) console.log('O passo seguinte (o gerador) pára e dá as razões ao painel.');
  else process.exitCode = 1;
}
if (conhecidos.length) console.log(`${conhecidos.length} ${conhecidos.length === 1 ? 'defeito conhecido' : 'defeitos conhecidos'} por corrigir no gerador (⚠ acima).`);
const tempo = `${((Date.now() - comeco) / 1000).toFixed(1)} s`;
console.log(falharam ? `${falharam} ${falharam === 1 ? 'teste falhou' : 'testes falharam'} (${passaram} passaram, ${tempo}).` : `${passaram} testes passaram${saltados ? `, ${saltados} saltados` : ''} (${tempo}).`);
