/* Dream Art — o núcleo do JavaScript do site (sem dependências). Os outros ficheiros (interface,
   carrinho, favoritos, procura, juntar) vão a seguir a este, no mesmo ficheiro, e usam o que ele
   põe em window.DA: as contas do dinheiro, o armazenamento do browser (sempre dentro de try/catch:
   num separador privado ou com os dados do site bloqueados, o site continua a funcionar, só não se
   lembra), o catálogo publicado e o recado de «juntou-se à encomenda». */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* Euros com as duas casas, como no gerador (src/templates/util.mjs, euros): «3,00 €». */
  function euros(v) {
    const n = Math.round(Number(v) * 100) / 100;
    const [int, dec] = Math.abs(n).toFixed(2).split('.');
    return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')},${dec} €`;
  }
  const hojeLisboa = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const dataPorExtenso = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return m ? `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}` : '';
  };
  /* A data escrita no campo da celebração, como em Portugal («12/12/2026», «1-5-26», «12122026»), em
     «2026-12-12» (o que a encomenda guarda). '' se não se percebe; null se não existe (31/02). */
  function isoDe(texto) {
    const t = String(texto || '').trim();
    const m = /^(\d{1,2})\s*[/.\-\s]\s*(\d{1,2})\s*[/.\-\s]\s*(\d{4}|\d{2})$/.exec(t) || /^(\d{2})(\d{2})(\d{4})$/.exec(t);
    if (!m) return '';
    const dia = Number(m[1]);
    const mes = Number(m[2]);
    const ano = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const d = new Date(Date.UTC(ano, mes - 1, dia));
    if (d.getUTCFullYear() !== ano || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) return null;
    return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  }
  const dataCurta = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; };
  /* Para procurar: sem acentos nem maiúsculas («Lembranças» = «lembrancas»). */
  const normalizar = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const ico = (nome, classe = '') => `<svg class="ico${nome === 'whatsapp' ? ' ico--cheio' : ''}${classe ? ` ${classe}` : ''}" aria-hidden="true" focusable="false"><use href="#i-${nome}"/></svg>`;
  const menosMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* O armazenamento do browser. Lê o que lá está (ou o valor por omissão); grava e diz se conseguiu. */
  const guardado = {
    ler(chave, omissao) {
      try { const v = JSON.parse(window.localStorage.getItem(chave) || 'null'); return v ?? omissao; } catch (_) { return omissao; }
    },
    gravar(chave, valor) {
      try { window.localStorage.setItem(chave, JSON.stringify(valor)); return true; } catch (_) { return false; }
    },
  };

  /* O preço que vale hoje: a MESMA regra das regras dos dados (src/lib/regras.mjs, precoDe) e do
     gerador. Acabada a promoção, volta o preço normal; sem preço, null («a confirmar»). */
  function precoDe(p, hoje = hojeLisboa()) {
    if (typeof p.preco !== 'number') return { atual: null, anterior: null };
    const emPromocao = Boolean(p.precoAnterior) && p.precoAnterior > p.preco && (!p.promocaoAte || hoje <= p.promocaoAte);
    if (emPromocao) return { atual: p.preco, anterior: p.precoAnterior };
    if (p.precoAnterior && p.promocaoAte && hoje > p.promocaoAte) return { atual: p.precoAnterior, anterior: null };
    return { atual: p.preco, anterior: null };
  }

  /* O catálogo publicado (assets/catalogo-<resumo>.json): os artigos, com os preços, a personalização
     e as fotografias, as zonas de entrega e os portes. Pede-se uma vez; o carrinho nunca guarda preços. */
  let pedido = null;
  let pronto = null;
  function catalogo() {
    if (!pedido) {
      pedido = fetch(document.body.dataset.catalogo).then((r) => {
        if (!r.ok) throw new Error(`catálogo ${r.status}`);
        return r.json();
      }).then((c) => { pronto = c; return c; });
      pedido.catch(() => { pedido = null; });
    }
    return pedido;
  }

  /* As fotografias do catálogo: { n: nome, r: resumo, l: [larguras], f: [formatos], w, h, foco, alt }. */
  const urlFoto = (cat, img, w, fmt = 'webp') => `${cat.assets}img/${img.n}-${img.r}-${w}.${fmt}`;
  /* O sizes de uma fotografia cortada numa moldura (o mesmo do gerador, componentes.mjs, escalarSizes). */
  function escalarSizes(sizes, f) {
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
    return partes.map((x) => { const m = /^(\([^()]*\))\s+(.+)$/.exec(x); return m ? `${m[1]} calc(${m[2]} * ${k})` : `calc(${x} * ${k})`; }).join(', ');
  }
  function imagemHtml(cat, img, { tamanhos = '50vw', ate = 1280, alt = img.alt || '', moldura = 0 } = {}) {
    if (moldura) tamanhos = escalarSizes(tamanhos, (img.w / img.h) / moldura);
    const larguras = img.l.filter((w, i) => w <= ate || i === 0 || img.l[i - 1] < ate);
    const srcset = (fmt) => larguras.map((w) => `${urlFoto(cat, img, w, fmt)} ${w}w`).join(', ');
    const fontes = img.f.filter((f) => f !== 'webp').map((f) => `<source type="image/${f}" srcset="${srcset(f)}" sizes="${tamanhos}">`).join('');
    const meio = larguras.find((w) => w >= 720) || larguras[larguras.length - 1];
    const foco = img.foco && img.foco !== '50% 50%' ? ` style="object-position:${esc(img.foco)}"` : '';
    return `<picture>${fontes}<img src="${urlFoto(cat, img, meio)}" srcset="${srcset('webp')}" sizes="${tamanhos}" width="${img.w}" height="${img.h}" alt="${esc(alt)}" loading="lazy" decoding="async"${foco}></picture>`;
  }
  /* A fotografia pequena (linhas da encomenda, procura, folha): só a versão de 360. */
  function miniaturaHtml(cat, img, lado) {
    const foco = img.foco && img.foco !== '50% 50%' ? ` style="object-position:${esc(img.foco)}"` : '';
    return `<img src="${urlFoto(cat, img, img.l[0])}" width="${lado}" height="${lado}" alt="" loading="lazy" decoding="async"${foco}>`;
  }

  /* O preço como o cartão o mostra (a mesma forma do gerador, componentes.mjs, preco). */
  function precoHtml(p, classe) {
    const v = precoDe(p);
    if (v.atual === null) return `<p class="${classe} ${classe}--confirmar">Preço por confirmar</p>`;
    const desde = p.desde ? '<span class="preco__desde">Desde </span>' : '';
    const atual = `${desde}<span class="preco__valor">${euros(v.atual)}</span>`;
    if (!v.anterior) return `<p class="${classe}">${atual}</p>`;
    return `<p class="${classe} ${classe}--promocao">${atual} <s class="preco__antes"><span class="so-leitor">em vez de </span>${euros(v.anterior)}</s></p>`;
  }

  /* O recado: uma linha a dizer o que aconteceu, por uns segundos, no alto do ecrã (é uma região
     role="status": o leitor de ecrã lê-a). Pára enquanto o rato ou o foco estão nele. */
  const caixa = $('[data-recado]');
  let relogio = 0;
  function recado(html) {
    if (!caixa) return;
    window.clearTimeout(relogio);
    caixa.innerHTML = html;
    caixa.classList.add('is-visivel');
    const esconder = () => { caixa.classList.remove('is-visivel'); };
    const armar = () => { window.clearTimeout(relogio); relogio = window.setTimeout(esconder, 6000); };
    armar();
    caixa.onmouseenter = () => window.clearTimeout(relogio);
    caixa.onmouseleave = armar;
    caixa.onfocusin = () => window.clearTimeout(relogio);
    caixa.onfocusout = armar;
  }

  window.DA = {
    $, $$, esc, euros, hojeLisboa, dataPorExtenso, isoDe, dataCurta, normalizar, ico, menosMovimento, guardado, precoDe,
    catalogo, catalogoJa: () => pronto, urlFoto, imagemHtml, miniaturaHtml, precoHtml, recado,
  };
})();
