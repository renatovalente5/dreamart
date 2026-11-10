// Os desenhos da Dream Art: traço fino (1,5 em 24×24), pontas redondas, como as flores do logótipo.
// Vão uma vez por página, num <svg> escondido no topo do <body> (os <symbol>), e cada ícone é um
// <use href="#i-nome">: o JavaScript usa os mesmos (ico() no site.js). Os de marcas (WhatsApp,
// Instagram, Facebook, Pinterest) são os desenhos de sempre dessas marcas, numa cor só.
// Todos levam aria-hidden: o nome do botão ou da ligação é que diz o que fazem.

const S = {
  menu: '<path d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"/>',
  lupa: '<circle cx="10.6" cy="10.6" r="6.35"/><path d="m15.35 15.35 4.9 4.9"/>',
  coracao: '<path d="M12 20s-7.6-4.6-7.6-10.3C4.4 7.1 6.4 5 8.9 5c1.4 0 2.4.6 3.1 1.7C12.7 5.6 13.7 5 15.1 5c2.5 0 4.5 2.1 4.5 4.7C19.6 15.4 12 20 12 20Z"/>',
  saco: '<path d="M5.6 8.4h12.8l-.95 10.9a1.8 1.8 0 0 1-1.8 1.65H8.35a1.8 1.8 0 0 1-1.8-1.65L5.6 8.4Z"/><path d="M9 10.6V7.2a3 3 0 0 1 6 0v3.4"/>',
  fechar: '<path d="m6.5 6.5 11 11M17.5 6.5l-11 11"/>',
  mais: '<path d="M12 6.25v11.5M6.25 12h11.5"/>',
  menos: '<path d="M6.25 12h11.5"/>',
  seta: '<path d="M5 12h13.5M13.25 6.75 18.5 12l-5.25 5.25"/>',
  voltar: '<path d="M19 12H5.5M10.75 6.75 5.5 12l5.25 5.25"/>',
  chevron: '<path d="m9.5 6 6 6-6 6"/>',
  baixo: '<path d="m6 9.5 6 6 6-6"/>',
  pausa: '<path d="M9.25 7v10M14.75 7v10"/>',
  play: '<path d="M8.75 6.9v10.2L17 12 8.75 6.9Z"/>',
  lixo: '<path d="M4.75 7h14.5M10 10.75v5.75M14 10.75v5.75M6.6 7l.85 11.55a1.8 1.8 0 0 0 1.8 1.7h5.5a1.8 1.8 0 0 0 1.8-1.7L17.4 7M9.25 7V5.4a1.6 1.6 0 0 1 1.6-1.6h2.3a1.6 1.6 0 0 1 1.6 1.6V7"/>',
  certo: '<path d="m5.5 12.5 4.25 4.25L18.5 8"/>',
  relogio: '<circle cx="12" cy="12" r="8.25"/><path d="M12 7.75V12l2.75 1.75"/>',
  calendario: '<rect x="3.75" y="5.25" width="16.5" height="15" rx="2.5"/><path d="M3.75 9.75h16.5M8 3.25v4M16 3.25v4"/>',
  cartao: '<rect x="3.25" y="5.75" width="17.5" height="12.5" rx="2.5"/><path d="M3.25 9.75h17.5M7 14.75h3.5"/>',
  info: '<circle cx="12" cy="12" r="8.25"/><path d="M12 11v5M12 7.9v.1"/>',
  carta: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  local: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.4"/>',
  telefone: '<path d="M6.6 3.75h2.6c.4 0 .75.27.85.66l.9 3.6a.9.9 0 0 1-.36.95l-1.5 1.05a11.3 11.3 0 0 0 4.9 4.9l1.05-1.5a.9.9 0 0 1 .95-.36l3.6.9c.39.1.66.45.66.85v2.6a1.8 1.8 0 0 1-1.8 1.8A15.6 15.6 0 0 1 4.8 5.55a1.8 1.8 0 0 1 1.8-1.8Z"/>',
  // a faixa de confiança (regras.mjs, ICONES_CONFIANCA): um desenho para cada nome
  mao: '<path d="M11 14h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16"/><path d="m7 20 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"/><path d="m2 15 6 6"/><path d="M19.5 8.5c.7-.7 1.5-1.6 1.5-2.7A2.73 2.73 0 0 0 16 4a2.78 2.78 0 0 0-5 1.8c0 1.2.8 2 1.5 2.8L16 12Z"/>',
  etiqueta: '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4Z"/><circle cx="7.5" cy="7.5" r="1.25"/>',
  caixa: '<path d="M11 21.7a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7Z"/><path d="M12 22V12"/><path d="m3.3 7 7.7 4.7a2 2 0 0 0 2 0L20.7 7"/><path d="m7.5 4.3 9 5.1"/>',
  mensagem: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/>',
  estrela: '<path d="m12 3.75 2.45 5 5.5.8-3.98 3.88.94 5.47L12 16.32 7.09 18.9l.94-5.47-3.98-3.88 5.5-.8L12 3.75Z"/>',
  presente: '<rect x="3.75" y="8.25" width="16.5" height="4" rx="1"/><path d="M5.25 12.25v6.5a1.5 1.5 0 0 0 1.5 1.5h10.5a1.5 1.5 0 0 0 1.5-1.5v-6.5M12 8.25v12"/><path d="M12 8.25S10.6 4 8.25 4.4C6.6 4.7 6.9 7 8.4 7.6c1.3.5 3.6.65 3.6.65Zm0 0s1.4-4.25 3.75-3.85c1.65.3 1.35 2.6-.15 3.2-1.3.5-3.6.65-3.6.65Z"/>',
  flor: '<path d="M7 3.75V8.5a5 5 0 0 0 10 0V3.75L14.5 6 12 2.75 9.5 6Z"/><path d="M12 13.5v7.75"/><path d="M12 19.25c-2.4 0-4.5-1.6-5.1-4 2.4 0 4.5 1.6 5.1 4Zm0-1.75c2.4 0 4.5-1.6 5.1-4-2.4 0-4.5 1.6-5.1 4Z"/>',
  // marcas
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.3 6.7h.01"/>',
  facebook: '<path d="M15.5 3.5h-2.2a4 4 0 0 0-4 4v2.7H7v3.4h2.3v7h3.4v-7h2.5l.6-3.4h-3.1V7.8c0-.6.4-1 1-1h1.8Z"/>',
  // o «P» do Pinterest num círculo, a traço como os outros
  pinterest: '<circle cx="12" cy="12" r="9"/><path d="m8.3 20.1 3.9-8.9"/><path d="M10.75 14.1c.45 1.2 1.45 1.9 2.55 1.9 2.05 0 3.7-1.6 3.7-4a5 5 0 1 0-9.65 1.8"/>',
  whatsapp: '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>',
};
// o arco fino dourado do logótipo, o enfeite das cabeças de secção (84×12)
const ARCO = '<symbol id="i-arco" viewBox="0 0 84 12"><path d="M1.5 1.5C17 11 67 11 82.5 1.5"/></symbol>';

/** Os ícones que existem (o build confere que cada ícone da faixa de confiança tem desenho). */
export const NOMES_ICONES = Object.freeze(Object.keys(S));

/** O <svg> escondido com todos os desenhos: vai uma vez, no topo do <body>. */
export function sprite() {
  return `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">${Object.entries(S).map(([n, d]) => `<symbol id="i-${n}" viewBox="0 0 24 24">${d}</symbol>`).join('')}${ARCO}</svg>`;
}

/** Um ícone: <svg class="ico"><use href="#i-nome"/></svg>. «cheio» para os desenhos a cheio (WhatsApp, Facebook). */
export function ico(nome, { classe = '', cheio = nome === 'whatsapp' } = {}) {
  if (!S[nome]) throw new Error(`ícone «${nome}» não existe (existem: ${NOMES_ICONES.join(', ')})`);
  return `<svg class="ico${cheio ? ' ico--cheio' : ''}${classe ? ` ${classe}` : ''}" aria-hidden="true" focusable="false"><use href="#i-${nome}"/></svg>`;
}

/** O arco dourado (enfeite). */
export const arco = (classe = '') => `<svg class="ornato${classe ? ` ${classe}` : ''}" aria-hidden="true" focusable="false"><use href="#i-arco"/></svg>`;
