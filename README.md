# Dream Art — o site

Loja da **Dream Art** (Lembranças | Eventos, Rio Tinto, Gondomar): lembranças, convites, conjuntos de
batizado, livros de honra e menus personalizados, feitos à mão. Instagram @dreamartatelier.

**Não há pagamentos no site.** A encomenda faz-se no site (as peças, as quantidades, os nomes e a data)
e segue pelo WhatsApp («Encomendar pelo WhatsApp»), com a mensagem já escrita para a Dream Art. A
encomenda fica feita quando a Dream Art a confirma por lá.

- **Pré-visualização**: https://renatovalente5.github.io/dreamart/ (noindex; `pre-visualizacao.yml`, a
  cada envio para a `main`). Os dados por confirmar aparecem como «[por confirmar]».
- **Produção**: no domínio **dreamart.pt** (aprovado pela cliente a 8 nov 2026), só no fim — um Worker
  da Cloudflare (`wrangler.jsonc`, `worker/www.js`, `publicar.yml`), como a Mimices: os termos do GitHub
  Pages não deixam lá uma loja. Até lá o `publicar.yml` só corre à mão.
- **Painel (backoffice)**: `renatovalente5/dreamart-painel`, onde a Dream Art muda o site sozinha. Fica no
  ar com o domínio (o código de entrada vai por email de @dreamart.pt).
- A base do código é a da Mimices (`~/Websites/mimices`), adaptada: sem os tons de linho, com a Europa
  nas zonas de envio. Plano e decisões em [docs/PLANO.md](docs/PLANO.md).

## Correr

```bash
python3 scripts/imagens.py        # as versões web das fotografias (Pillow), para .cache/imagens
node scripts/build.mjs            # o site em _site/ (python3 -m http.server 4880 --directory _site)
node scripts/build.mjs --base=/dreamart   # como no GitHub Pages
node scripts/build.mjs --producao         # como no domínio: pára se faltar um dado que a lei pede
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
