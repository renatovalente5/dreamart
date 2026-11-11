# Dream Art — o site

Loja da **Dream Art** (Lembranças | Eventos, Rio Tinto, Gondomar): lembranças, convites, conjuntos de
batizado, livros de honra e menus personalizados, feitos à mão. Instagram @dreamartatelier.

**Não há pagamentos no site.** A encomenda faz-se no site (as peças, as quantidades, os nomes e a data)
e segue pelo WhatsApp («Encomendar pelo WhatsApp»), com a mensagem já escrita para a Dream Art. A
encomenda fica feita quando a Dream Art a confirma por lá.

- **No ar**: https://dreamart.pt (desde 11 nov 2026), um Worker da Cloudflare (`wrangler.jsonc`,
  `worker/www.js`), publicado pelo `publicar.yml` com `--producao` a cada envio para a `main` e todas
  as noites. Os termos do GitHub Pages não deixam lá uma loja: a pré-visualização antiga
  (https://renatovalente5.github.io/dreamart/) só reencaminha para o domínio.
- **Painel (backoffice)**: https://backoffice.dreamart.pt (`~/Websites/dreamart-painel`), onde a Dream
  Art muda o site sozinha (o código de entrada vai por email).
- **O desenho é próprio**: a proposta A («Verde da marca», escolhida pelo Renato a 9 nov 2026), com as
  cores e as letras do logótipo. O gerador, as regras e a legal-comum são os dos outros sites do Renato.
  Plano e decisões em [docs/PLANO.md](docs/PLANO.md).

## A encomenda

- O saco do cabeçalho leva a **/encomenda/** (o /carrinho/ reencaminha para lá): as peças, a entrega
  (levantamento, continente, ilhas, Europa) com os portes, o nome e a morada, e «Encomendar pelo
  WhatsApp», que abre o WhatsApp com a mensagem escrita (`src/scripts/carrinho.js`).
- **/favoritos/**: as peças guardadas com o coração.
- No browser ficam só `dreamart:carrinho` (as peças e a entrega, nunca o nome nem a morada) e
  `dreamart:favoritos`, como diz a política de cookies.

## Correr

```bash
python3 scripts/imagens.py        # as versões web das fotografias (Pillow), para .cache/imagens
node scripts/build.mjs            # o site em _site/ (python3 -m http.server 4880 --directory _site)
node scripts/build.mjs --base=/dreamart   # como no GitHub Pages
node scripts/build.mjs --producao         # como no domínio: pára se faltar um dado que a lei pede
node scripts/testar.mjs           # os testes (o CI corre-os antes de cada publicação)
```

## Onde está cada coisa

| | |
|---|---|
| `content/site.json` | marca, contactos, dados legais, aviso do topo, zonas de entrega, portes, prazos, pagamento |
| `content/produtos/*.json` | um ficheiro por artigo (o nome do ficheiro é o endereço) |
| `content/categorias.json` | os 8 separadores (os que não têm artigos não aparecem) |
| `content/inicio.json` | os textos e as fotografias da página inicial |
| `content/paginas/*.md` | páginas de texto (sobre nós, como encomendar, legais…), com marcadores `{{…}}` |
| `content/fotos.json` | texto alternativo e ponto de foco de cada fotografia |
| `media/fotos/` | as fotografias (as versões web faz o `scripts/imagens.py`) |
| `media/marca/logo.png` | o logótipo da cliente, só recortado em círculo (fundo transparente) |
| `src/lib/regras.mjs` | as regras dos dados: as mesmas no gerador e no painel (cópia byte a byte) |
| `legal-comum/` | as peças legais comuns aos sites do Renato (instalada por `_ferramentas/legal-comum`) |

O material do cliente (conversa do WhatsApp, fotografias originais, recolha do Instagram) está em
`_cliente/`, fora do git.
