/* O SEO À MÃO (11 nov 2026, «Trata de toda a parte do SEO»): o que as pessoas escrevem no Google
   («lembranças personalizadas batizado», «convites personalizados casamento») e que os nomes curtos
   do site não dizem. Só mexe no <title> (e no og:title); o H1, as migalhas e o menu continuam com os
   nomes da Dream Art.

   Um separador sem entrada aqui (as Coleções, que mudam com a época) fica com o título que tem. */
export const TITULOS_DOS_SEPARADORES = Object.freeze({
  lembrancas: 'Lembranças personalizadas para batizados, casamentos e comunhões',
  convites: 'Convites personalizados para casamentos e batizados',
  'conjuntos-de-batizado': 'Conjuntos de batizado personalizados',
  'livros-de-honra': 'Livros de honra personalizados',
  'menus-e-mesas': 'Menus de mesa personalizados',
  padrinhos: 'Lembranças personalizadas para os padrinhos',
  'decoracao-e-eventos': 'Decoração personalizada para eventos',
});
/* O que se junta ao nome de um artigo. Nos convites, nos livros de honra e nos menus, os nomes começam
   todos pela mesma palavra, masculina («Convite floral», «Livro de honra», «Menu com pendente»): leva
   «personalizado». Nas lembranças, cada uma com o seu género, vai o separador no plural. */
const MASCULINO = Object.freeze({ convites: 'Convite', 'livros-de-honra': 'Livro', 'menus-e-mesas': 'Menu' });
const NO_PLURAL = Object.freeze({ lembrancas: 'Lembranças personalizadas', padrinhos: 'Lembranças para os padrinhos' });
/* O Google mostra cerca de 60 caracteres do título; com « | Dream Art» (12), o resto cabe em 50. */
const CABE = 50;

export function tituloDoSeparador(c) {
  const t = c && TITULOS_DOS_SEPARADORES[c.slug];
  return t || (c ? c.titulo : '');
}

export function tituloDoArtigo(p, c) {
  const nome = String(p.nome || '').trim();
  if (!c || /personaliz/i.test(nome)) return nome;
  let t = nome;
  if (MASCULINO[c.slug] && nome.startsWith(MASCULINO[c.slug])) t = `${nome} personalizado`;
  else if (NO_PLURAL[c.slug]) t = `${nome} · ${NO_PLURAL[c.slug]}`;
  return t.length <= CABE ? t : nome;
}
