# Dream Art — plano e decisões

Loja da Dream Art («Lembranças | Eventos», Rio Tinto, Gondomar; Instagram @dreamartatelier): lembranças,
convites, conjuntos de batizado, livros de honra e menus, feitos à mão e personalizados com nomes e datas.
Titular: Luís Miguel da Silva Monteiro, empresário em nome individual, NIF 252896580. Escrito a 9 nov 2026.

Não sou advogado: o que está em «O que a lei pede» é a leitura dos diplomas citados; o que ficou em dúvida
diz «dúvida».

## 1. Decisões

### Do Renato

- **Sem pagamentos no site** (8 nov 2026). A encomenda faz-se no site e segue pelo WhatsApp («Encomendar
  pelo WhatsApp»), com a mensagem já escrita; a Dream Art responde com o resumo e a encomenda fica feita
  quando o cliente o confirma.
- **8 separadores, sem sub-separadores** (pedido da cliente): Lembranças, Convites, Conjuntos de batizado,
  Livros de honra, Menus e mesas, Padrinhos, Decoração e eventos, Coleções. Os que não têm artigos (hoje
  Padrinhos e Decoração e eventos) não aparecem em lado nenhum até os terem. Coleções = Natal 2026.
- **A fotografia das bolas de sabão (com a Patrulha Pata) fica.** O risco foi avisado; não se volta a
  insistir.
- **Dados em falta = «[por confirmar]»** na pré-visualização, e uma mensagem à cliente com o que falta.
- **A proposta A, «Verde da marca»** (9 nov 2026). A primeira versão, montada sobre o código da Mimices, foi
  rejeitada: «O site está péssimo, criaste um site igual ao do Mimices… quero uma coisa nova original»,
  «Refaz tudo!», «O site nem combina com o Logo!». Das três propostas, o Renato escolheu a A
  (`~/Websites/dreamart-propostas/a/`, com as capturas), que é a fonte da verdade do aspeto:
  - as cores do logótipo: verde #556045 (fundos fortes, títulos, botões), creme #F6F2E8 (o papel) e dourado
    #C8B07C só no arco fino;
  - **9 nov 2026, «sem vida e sem cor» (o Renato, com as capas dos destaques do Instagram):** o rosa
    (#E9CFC2) e o chocolate (#533D27) das histórias entram no site: a capa rosa, os títulos, os botões e
    os preços em chocolate, as pastilhas e os cartões em rosa, o Natal em chocolate; o verde do logótipo
    fica no logótipo, nos ícones do cabeçalho e no rodapé. O logótipo sem a bola verde
    (`scripts/logo-sem-circulo.py`, a partir do logótipo quadrado da cliente: tira-se só o verde): no
    cabeçalho claro, o desenho inteiro a verde, com o semicírculo num dourado mais fundo (escolhido por ele
    entre as provas; «faltou o semi círculo» quando o tirei); no menu lateral, também o desenho inteiro
    («o logo no Menu Lateral também tem de ser o Logo inteiro»); no rodapé verde, o desenho inteiro em creme
    e dourado. O botão do WhatsApp voltou ao verde do logótipo, com o anel dourado (com as cores das histórias tinha
    passado a chocolate; «mete o botão do WhatsApp verde»). O
    rodapé mais pequeno, com o «© 2026 Dream Art» à esquerda e as ligações à direita no computador (no
    telemóvel, o «©» fica no fim); a página acaba logo por baixo da linha legal («não quero que o rodapé
    baixe mais do que isto»), com o botão do WhatsApp ao lado dela. As
    secções da página inicial em monogramas, como as capas das histórias (a letra em Bodoni Moda, a
    palavra em Ms Madi; «monograma» em content/categorias.json);
  - EB Garamond (600) nos títulos e Mulish no texto, servidas pelo próprio site (escolhidas pelo Renato a
    9 nov 2026 entre as provas; antes, Gilda Display e Montserrat). A Cormorant Garamond ficou de fora: é a
    letra dos títulos da Mimices;
  - **a capa no creme** (9 nov 2026, «está muito rosa assim no início do site»; escolhida a «1» entre três): o
    rosa só num disco atrás da fotografia, com um anel dourado leve; um risco leve separa-a do cabeçalho;
  - **a moldura «B»** do «Um sonho de família» (escolhida entre três): a fotografia de cantos redondos com um
    bloco rosa por trás, deslocado, e um selo como os círculos das secções no canto (a letra da marca e a
    última palavra do título: «D · família»); no «Sobre nós», o mesmo bloco, sem o selo. Antes:
    a fotografia num rectângulo de cantos redondos com o fio dourado à volta (`.moldura-foto`; o arco em
    cima «parece que tem formato de caixão», o Renato, 9 nov 2026; nada de oval, que lembra as fotografias
    das campas), os separadores em círculos, cartões de cantos redondos;
  - o cabeçalho com o menu e a procura à esquerda, o logótipo ao centro, os favoritos e a encomenda à direita;
    a gaveta do menu; o rodapé verde com o logótipo;
  - a loja e os separadores (o Renato, 9 nov 2026, com uma captura): os produtos no mesmo creme da página,
    sem faixa branca nem moldura nos cartões; sem a fotografia do separador nem o «← Loja»; as pastilhas em
    cima trocam o separador sem a página subir (`src/scripts/loja.js`). Os favoritos e as sugestões da
    ficha ficaram iguais. Depois, a página inicial: a seguir à capa verde, tudo no creme (sem as faixas
    brancas das lembranças, da coleção e da confiança), com um só espaço entre secções; só os cartões da
    coleção, no bloco verde, mantêm o creme à volta. E por fim as páginas de texto e os Contactos: sem a faixa
    branca por baixo da cabeça; os cartões das notas, o cabeçalho dos quadros e os círculos dos ícones (que
    eram creme sobre o branco) passaram ao salva. Depois, também a encomenda: as peças separadas por riscas e o formulário no creme, sem os cartões
    brancos (o branco fica só nos campos). E a data da celebração passou a um campo de texto «dd/mm/aaaa»
    (o `<input type="date">` mostrava «mm/dd/yyyy» no Chrome em inglês e, no Safari, o dia de hoje a
    cinzento), com o calendário do sistema por cima do ícone; guarda-se aaaa-mm-dd como antes.

  Nada pode voltar a ter o aspeto, as cores ou a arrumação da Mimices.
- **Da base da Mimices fica só o invisível**: o gerador em Node sem dependências (`scripts/build.mjs`), as
  imagens responsivas (`scripts/imagens.py`), as regras dos dados (`src/lib/regras.mjs`, iguais byte a byte
  às do painel), a biblioteca `legal-comum` e a lógica da encomenda que acaba no WhatsApp. O HTML, o CSS e o
  JS de interface escrevem-se de raiz a partir da proposta A (ramo `site`).
- **A página da encomenda chama-se `/encomenda/`** (deixa de ser `/carrinho/`).
- **Pré-visualização** no GitHub Pages, em https://renatovalente5.github.io/dreamart/ (`node
  scripts/build.mjs --base=/dreamart`, fechada aos motores de busca). O domínio **dreamart.pt** (aprovado pela
  cliente a 8 nov) e o **backoffice** no ar ficam para o fim.

### De gosto, para todo o site

- Qualidade e simplicidade «à Apple», com a cara da marca. Pouco texto; o óbvio não se explica.
- O Livro de Reclamações discreto (ícone e texto, com a letra das ligações vizinhas), **só no rodapé**.
- O WhatsApp só como ligação, sem o número. O telefone com «(Chamada para a rede móvel nacional)», entre
  parênteses e em letra mais pequena.
- Nunca «obrigação de pagar», nem no botão nem nos textos.
- O logótipo é o da cliente, só recortado; nunca se redesenha.
- Contactos, prazos e valores nas páginas sempre por marcadores `{{…}}` (vêm de `content/site.json`), nunca
  escritos à mão.

## 2. Estrutura do site

| Página | O que tem |
|---|---|
| Início | A capa com três diapositivos (Lembranças, Natal, Batizado), «O que criamos» (os separadores em círculos), Natal 2026 em destaque, as lembranças, «Um sonho de família», a faixa de confiança e o rodapé. |
| Separadores da loja | Um por categoria, só os que têm artigos. Hoje 6, com 27 artigos: Lembranças 15, Convites 4, Conjuntos de batizado 3, Livros de honra 1, Menus e mesas 1, Coleções (Natal 2026) 3. |
| Ficha de cada artigo | Fotografias, preço por unidade, personalização (nome, data, frase), quantidade, «Juntar à encomenda», quem faz a peça (nome, morada, email) e, quando os há, a composição, os avisos e os perigos. |
| Encomenda (`/encomenda/`) | As peças, a entrega com os portes e o total, o nome, a morada (se for envio), as observações e «Encomendar pelo WhatsApp». |
| Favoritos | As peças marcadas com o coração. |
| Contactos | WhatsApp (só a ligação), telefone com a nota da chamada, email, redes. |
| Páginas de texto | Sobre nós, Como encomendar, Perguntas frequentes (`content/paginas/*.md`). |
| Páginas legais (rodapé) | Termos e condições, Política de privacidade, Política de cookies, Resolução de litígios, Garantia legal, Desistir de uma compra. |

O percurso de uma encomenda, como os termos o descrevem:

1. O cliente junta à encomenda as peças, com a quantidade e a personalização.
2. Escolhe a entrega e vê os portes e o total.
3. Carrega em «Encomendar pelo WhatsApp»: a mensagem abre já escrita (as peças, a personalização, a entrega,
   o total e a forma de pagamento) e ele envia-a.
4. A Dream Art responde com o resumo: as peças como as vai fazer, o total com os portes, o prazo e o
   pagamento.
5. A encomenda fica feita quando o cliente responde a confirmar.
6. Nos 5 dias seguintes, e antes da entrega, a Dream Art envia a confirmação por escrito (PDF ou email).

No browser só ficam a encomenda (`dreamart:carrinho`) e os favoritos (`dreamart:favoritos`), sem o nome, a
morada nem as observações. Não há cookies, estatísticas nem nada de terceiros.

## 3. O que está «[por confirmar]» e porquê

| Falta | Onde se vê | Porquê | Mensagem |
|---|---|---|---|
| A morada completa (rua e número; há só o código postal 4435-397) | Termos, privacidade, desistência; «Feito por» em cada ficha | Lei: identificação (DL 7/2004, art. 10.º) e fabricante (RGSP, art. 19.º) | 1 |
| As formas de pagamento | Como encomendar, perguntas, termos, mensagem do WhatsApp | Lei (DL 24/2014, art. 4.º, n.º 1, al. j)) | 2 |
| Os portes: continente, ilhas, Europa | Os mesmos e a encomenda | Lei (art. 4.º, n.º 1, als. e) e g)) | 3 |
| O prazo habitual | Os mesmos e a ficha | Lei (art. 4.º, n.º 1, al. j)). Sem ele valem os 30 dias do art. 19.º, já nos termos | 4 |
| A quantidade mínima nas lembranças | Ficha e encomenda (hoje 1 em todas) | Para a encomenda funcionar | 5 |
| O levantamento em Rio Tinto | Encomenda, fichas e o texto dos portes, com «[por confirmar]» | Para a encomenda funcionar. No domínio, sem o texto (`entrega.levantamento`), não se oferece (9 nov) | 5 |
| O IVA | Termos (`{{empresa.iva}}`, hoje vazio) | Lei: o preço mostrado é o total com impostos (art. 4.º, n.º 1, al. e)) | 6 |
| A composição da toalha | Ficha dos dois conjuntos de batizado | Lei (Reg. (UE) 1007/2011, art. 16.º) | 7 |
| Ingredientes, alergénios, peso e origem | Fichas das drageias e do mel | Lei (Reg. (UE) 1169/2011, art. 14.º) | 8 |
| As fragrâncias (fichas de segurança) | Fichas das velas, do gesso e do mikado | Lei, só se a fragrância classificar a peça (CLP) | 9 |
| O rótulo original das bolas de sabão | Ficha | Lei (brinquedos, DL 43/2011) | 10 |
| Os sabonetes | — | Lei (cosméticos), se forem sabonetes para usar | 11 |
| A autorização dos nomes nas fotografias | As fotografias das peças | Lei (RGPD) | 12 |
| O email do painel | Backoffice | Para entrarem no painel | 13 |

A mensagem está em `~/Websites/dreamart/_cliente/mensagem-para-a-cliente.md` (fora do git, não enviada).

## 4. O que a lei pede

Três classes: **LEI** (há norma e a falta é infração), **FORMA SEGURA** (a maneira mais segura de cumprir,
não obrigatória) e **GOSTO** (do Renato). Só a LEI entra nas perguntas à cliente.

### LEI

1. **Identificação** sempre acessível: nome, morada geográfica, email e NIF (DL 7/2004, art. 10.º;
   ANACOM, 2 500–50 000 €) e, antes da encomenda, também o telefone (DL 24/2014, art. 4.º, n.º 1, al. a);
   grave). Está nos termos, na privacidade e no formulário de desistência, a dois cliques do rodapé, o que
   chega. **Falta a rua e o número** (pergunta 1).
2. **Informação antes da encomenda** (DL 24/2014, art. 4.º, n.º 1; grave, art. 31.º):
   - o preço total com impostos e os portes (al. e)), ou o aviso de que os portes podem variar (al. g));
   - o pagamento, a entrega e o prazo (al. j));
   - a desistência: 14 dias, como se faz, o formulário e quem paga a devolução (als. m) e n));
   - nas peças personalizadas, a falta desse direito (al. p); art. 17.º, n.º 1, al. c));
   - a garantia (al. s)) e os centros de arbitragem (al. bb)).

   Estão nas páginas. Faltam os dados: pagamento, portes, prazo e IVA (perguntas 2, 3, 4 e 6). A linha
   «peça personalizada: não tem devolução por desistência» tem de continuar na ficha e na encomenda.
3. **O fecho pelo WhatsApp** (DL 24/2014, art. 5.º, n.os 2 a 4 e 9). Antes de o cliente confirmar, o resumo
   mostra as peças, o total com portes e o pagamento; o cliente confirma por mensagem. Sem isto, não fica
   vinculado. Está nos termos e em «Como encomendar». A mensagem que o site escreve traz o pagamento escrito
   à mão: ver o pedido B2.
4. **A confirmação em suporte duradouro** (DL 24/2014, art. 6.º; grave): em PDF ou email, nos 5 dias
   seguintes e antes da entrega. É trabalho da Dream Art; o Renato dá o modelo.
5. **O Livro de Reclamações Eletrónico** (DL 156/2005, art. 5.º-B; Portaria 201-A/2017, art. 11.º; grave,
   650–1 500 € numa pessoa singular, depois de 90 dias de advertência):
   - a conta, que é da cliente (última pergunta);
   - a ligação na página de entrada: o rodapé, com a peça da `legal-comum` (código do ramo `site`).
6. **RAL** (Lei 144/2015, art. 18.º; Lei 24/96, art. 14.º, n.º 2): as entidades e os sítios, no site e nos
   termos. Feito: a página com os 10 centros e os termos com a ligação. **Rio Tinto (Gondomar, Área
   Metropolitana do Porto) → CICAP**, confirmado com `centrosPorConcelho('Gondomar')` da `legal-comum` v1.1.2.
   Quem mora noutra zona vai ao centro da sua, ou ao CNIACC.
7. **A garantia de 3 anos** (DL 84/2021, art. 12.º). Feito: nos termos e na página da garantia, com o aviso da
   UE.
8. **Privacidade** (RGPD, art. 13.º): quem trata, para quê e com que fundamento, a quem se dá, por quanto
   tempo, os direitos e a CNPD. Feito.
   - Falta o prazo das faturas, 10 anos (CIVA, art. 52.º), no marcador `{{privacidade.prazos}}`: pedido A3.
   - As fotografias mostram nomes e datas de clientes (Benedita, Maria Clara, Rafael, Dinis, André & Carla…).
     São dados pessoais, e uma autorização para o Instagram não cobre o site (RGPD, art. 6.º): pergunta 12,
     e antes do primeiro envio para o GitHub, porque o repositório é público.
9. **Cookies e armazenamento** (Lei 41/2004, art. 5.º). Só a encomenda e os favoritos, estritamente
   necessários, por isso sem aviso. Feito, enquanto o site não carregar nada de terceiros e as chaves forem
   as que a política diz (hoje o código usa `mimices:carrinho`): pedido B1.
10. **O custo da chamada** junto de cada número (DL 59/2021, art. 3.º, n.º 3). O marcador `{{telefone}}` já
    a põe; o rodapé e os contactos novos também têm de a pôr.
11. **Segurança geral dos produtos** (Reg. (UE) 2023/988, art. 19.º). Em cada ficha:
    - quem fabrica, com o nome, a morada postal e o email (al. a)). Falta a morada (pergunta 1);
    - a fotografia e o tipo (al. c)). Já estão;
    - os avisos que acompanham a peça (al. d), com o art. 9.º, n.º 7).

    Os avisos das velas (EN 15494, o estado da técnica) contam-se aqui, incluindo a vela dos conjuntos:
    nunca deixar acesa sem vigilância, longe do que arde, fora do alcance de crianças e animais, base
    resistente ao calor, tirar a decoração antes de acender. Hoje estão só nos termos e nas perguntas. Na
    Mimices o Renato mandou tirá-los da ficha (17 out): a decisão é dele.

    Dúvida: nas peças compradas feitas (bolas de sabão, lápis), o fabricante na ficha é quem as fez, salvo se
    a Dream Art lhes puser o nome.
12. **Têxteis** (Reg. (UE) 1007/2011; grave). A composição da toalha dos conjuntos, em percentagens e
    visível antes da compra (art. 16.º, n.º 1), e a etiqueta na toalha (art. 14.º): pergunta 7. A caixa
    forrada a linho não é produto têxtil, mas «linho» tem de ser verdade.
13. **Alimentos** (Reg. (UE) 1169/2011, arts. 9.º e 14.º, n.º 1, al. a); DL 26/2016). As drageias e o mel
    vendem-se à distância, por isso a ficha mostra, antes da compra:
    - a denominação e a quantidade líquida;
    - nas drageias, os ingredientes, com os alergénios destacados (o mel, de ingrediente único, não precisa de
      lista);
    - as condições de conservação e o nome e a morada do operador;
    - no mel, o país de origem (Diretiva 2001/110/CE; DL 214/2003).

    A data de durabilidade só é precisa na entrega. Pergunta 8. O modelo dos artigos não tem campos para
    isto: pedido D3. A frase sobre a origem do mel, que não vinha do material da cliente, saiu da ficha a
    9 nov (pedido D1).
14. **CLP** (Reg. (CE) 1272/2008), só se se aplicar. Diz respeito às peças com fragrância:
    - as velas perfumadas (a aromática e a coração dizem-no; as outras, por saber);
    - o gesso perfumado (anjo, anjinho, cruz);
    - o mikado, quase de certeza.

    Se a fragrância classificar a peça (por exemplo, H317) ou a obrigar à frase EUH208, a ficha diz os tipos
    de perigo (art. 48.º, n.º 2; desde 1 jan 2028, os elementos do rótulo, art. 48.º-A) e a embalagem leva o
    rótulo CLP (art. 17.º). Se for classificada, há ainda a notificação aos centros antivenenos (UFI). Falhar
    é contraordenação ambiental (DL 220/2012). Pergunta 9: as fichas de segurança das fragrâncias.
15. **Brinquedos** (DL 43/2011; Diretiva 2009/48/CE; muito grave). Bolas de sabão para festas de crianças são
    brinquedo:
    - no tubo, a marcação CE e os avisos do fabricante, que o rótulo personalizado não pode tapar;
    - na ficha, os avisos que decidem a compra (a idade, «Atenção…»), antes da compra (arts. 15.º e 16.º);
    - a marcação CE dada a conhecer (art. 34.º, n.º 3). Publicitar um brinquedo sem CE é proibido.

    Pergunta 10. As regras dos dados recusam «marcação CE» escrito (`RE_ALEGACOES`), por isso o caminho é a
    fotografia do rótulo. Dúvida: se forem só para adultos (casamentos), não são brinquedo.
16. **Cosméticos** (Reg. (CE) 1223/2009, arts. 4.º, 10.º, 13.º e 19.º; DL 23/2025, INFARMED; muito grave). Se o
    «Nome em sabonete» é sabonete para usar e feito pela Dream Art, precisa, antes de se vender, de:
    - pessoa responsável e relatório de segurança;
    - notificação no CPNP;
    - rótulo em português.

    Pergunta 11. Dúvida: se for só decorativo.
17. **IVA**. O preço anunciado é o total com IVA (DL 24/2014, art. 4.º, n.º 1, al. e)). Se estiverem isentos
    (CIVA, art. 53.º), a fatura diz «IVA — regime de isenção, art. 53.º» (art. 36.º, n.º 5, al. e)). Pergunta 6.
18. **Patrulha Pata.** As personagens são de terceiros (Spin Master/Nickelodeon), na fotografia e no rótulo
    das bolas de sabão: há risco de marca e de direito de autor (CPI; CDADC). O Renato decidiu manter.

### FORMA SEGURA (não entra nas perguntas)

- O nome e o NIF também no rodapé. A lei pede «acesso fácil e direto», e os termos a dois cliques cumprem.
- O ícone e o lugar do Livro: a lei só pede a ligação visível e destacada na página de entrada.
- Uma referência em cada ficha (o aviso «Sem referência», 27 vezes). O RGSP pede a fotografia, o tipo e
  «quaisquer outros identificadores»: o nome do artigo é o tipo, e a referência só é precisa se a peça
  tiver um número.
- «Não é um brinquedo» nos ímanes e nas lembranças com peças pequenas (RGSP, art. 6.º: avaliar o risco para
  crianças). Já está nos termos; na ficha é o campo `naoBrinquedo`.
- Escrever «IVA incluído» ou «isento, art. 53.º» no site (`{{empresa.iva}}`): a lei pede o preço total.
- A Garantia legal e a página Desistir no rodapé. O rodapé da proposta A não as tem, mas os termos ligam a
  elas.
- A lista dos 10 centros gerada pela `legal-comum` (pedido A6), em vez de escrita na página.
- O Centro Europeu do Consumidor, para quem compra de outro país da UE.

### GOSTO

O Livro discreto, só no rodapé. O WhatsApp só como ligação. O telefone com «(Chamada para **a** rede móvel
nacional)»: a lei diz sem o «a», e manter o «a» foi decisão do Renato. Sem «obrigação de pagar», sem aviso
de cookies, pouco texto.

### Os avisos do gerador

`node scripts/build.mjs`, a 9 nov 2026, escreve 49 avisos, de 11 tipos:

| Aviso | Quantos | Classe | O que fazer |
|---|---|---|---|
| A morada está incompleta (Dados legais) e «Morada sem número de porta» (Identificação) | 1 + 1 | LEI (DL 7/2004, art. 10.º; RGSP, art. 19.º) | Pergunta 1 |
| Faltam as formas de pagamento | 1 | LEI (DL 24/2014, art. 4.º, n.º 1, al. j)) | Pergunta 2 |
| Faltam os portes | 1 | LEI (al. e) ou g)) | Pergunta 3 |
| Falta o prazo | 1 | LEI (al. j)) | Pergunta 4 |
| Falta dizer o IVA | 1 | LEI quanto ao preço total; a frase no site é FORMA SEGURA | Pergunta 6 |
| Falta a composição da toalha (Artigos) e «Têxtil sem composição» (Ficha) | 2 + 2 | LEI (Reg. 1007/2011, art. 16.º) | Pergunta 7 |
| Mistura sem os tipos de perigo (CLP) | 6 | LEI só se a fragrância os pedir | Pergunta 9 |
| Mistura sem avisos de segurança visíveis (CLP) | 6 | Velas: LEI pelo RGSP (art. 19.º, al. d)), decisão do Renato. Gesso: LEI só se classificado | Pedido C4 e pergunta 9 |
| Sem referência do produto (RGSP) | 27 | FORMA SEGURA | Nada |

Os 6 com CLP são as velas aromática, coração, margarida, tulipa e floco de neve, e a cruz em gesso perfumado.

**O que as guardas não veem** (pedido A4):
- o mikado (CLP);
- o anjo e o anjinho (gesso perfumado, que só o resumo diz);
- a vela dos dois conjuntos de batizado (o conjunto cai em «têxtil»);
- as bolas de sabão (brinquedo);
- o sabonete (cosmético);
- as drageias e o mel (alimentos).

### Fora do site (só a cliente pode fazer)

- Abrir a conta no Livro de Reclamações Eletrónico, com o NIF e a senha das Finanças do titular.
- Mandar a confirmação de cada encomenda em PDF ou email, nos 5 dias seguintes (DL 24/2014, art. 6.º).
  O Renato dá o modelo.
- Passar fatura de cada venda (CIVA, art. 29.º).
- Rótulos:
  - CLP nas peças perfumadas, se classificadas;
  - identificação e avisos na vela ou na caixa (RGSP, art. 9.º);
  - etiqueta da composição na toalha;
  - os alimentos reembalados com o nome de quem os embala (Reg. (UE) 1169/2011, art. 8.º). Dúvida: o
    registo de operador na DGAV (Reg. (CE) 852/2004, art. 6.º);
  - nos sabonetes, se forem cosmético, o CPNP.
- Pedir autorização antes de publicar fotografias de peças com nomes. É o que a política de privacidade
  promete.

## 5. Pedidos ao código e aos dados (fora das páginas de texto)

Não os fiz: o código e os dados não são deste ramo.

### A. `scripts/build.mjs`

1. **O domínio.** Na linha 48, `const DOMINIO = 'mimices.pt'` passa a `'dreamart.pt'`. Com `--dominio` ou
   `--producao`, o canonical, o sitemap e os cartões de partilha apontariam para a Mimices.
2. **A identificação sem a rua não avisa.** `identificacao()` (linhas 285–297) escreve «em 4435-397 Rio Tinto,
   Gondomar» quando `empresa.morada` está vazia. Deve juntar `ctx.marcador('a rua e o número')` (DL 7/2004,
   art. 10.º; DL 24/2014, art. 4.º, n.º 1, al. a)). A regra da Mimices (só a localidade) foi decisão para a
   Mimices.
3. **O prazo das faturas.** No marcador `privacidade.prazos` (linhas 346–351) falta a linha das faturas,
   «Encomendas e faturas: 10 anos, por obrigação fiscal (CIVA, art. 52.º).». A Dream Art tem atividade
   aberta (RGPD, art. 13.º, n.º 2, al. a)). Convém escrevê-la com a grafia atual: a constante da
   `legal-comum` diz «facturas».
4. **As guardas das fichas** (linhas 140–146) decidem a categoria só pelo nome. Pedido:
   - ler também o resumo e o «inclui»;
   - pôr o mikado em `mistura-clp`, e o anjo e o anjinho também;
   - pôr as bolas de sabão em `brinquedo`;
   - verificar a vela dos conjuntos também como vela.

   A `legal-comum` não tem categorias de alimento nem de cosmético: pedido à biblioteca.
5. **Os portes** (`textoPortes()`, linhas 277–283) afirmam «Enviamos por CTT Expresso» e «O levantamento em
   Rio Tinto não tem custos». Nenhuma das duas veio da cliente (DL 57/2008, art. 7.º). Sem mudar o modelo:
   - tirar a transportadora;
   - o texto do levantamento passa a vir de `entrega.levantamento` (o campo já existe), com
     `ctx.marcador(…)` quando está vazio;
   - o mesmo no marcador `{{levantamento}}` (linha 338), que hoje escreve vazio.
6. **(FORMA SEGURA)** Um marcador `{{ral}}`, com `pecaLegal('ral', ralHtml({ ambito: 'nacional' }))`. A
   lista dos centros passava a vir da `legal-comum` e a página de litígios deixava de a ter escrita à mão.

### B. `src/scripts/carrinho.js` (a lógica que fica)

1. **A chave.** Na linha 12, `const CHAVE = 'mimices:carrinho'` passa a `'dreamart:carrinho'`. Os
   favoritos ficam em `'dreamart:favoritos'` (só os endereços das peças): é o que a política de cookies diz.
2. **O pagamento.** Na linha 353, a mensagem do WhatsApp escreve «Pagamento: MB WAY ou transferência», à mão
   e não confirmado. É o texto que o cliente confirma (DL 24/2014, art. 4.º, n.º 1, al. j), e art. 5.º).
   Deve vir de `entrega.pagamento`, posto no catálogo, ou dizer «a combinar» enquanto estiver vazio.
3. **O levantamento.** Na linha 348, «(grátis)» também não foi confirmado.
4. **O que fica guardado.** Nunca o nome, a morada, a data da celebração nem as observações no
   armazenamento: a privacidade e os cookies prometem-no. Hoje está certo.

### C. Os modelos novos (ramo `site`)

1. Nenhum texto de pagamento ou de transportadora escrito à mão. No modelo antigo há vários: em
   `paginas.mjs`, «Envio por CTT Expresso», «Levantamento grátis em …» e «Paga depois de confirmarmos pelo
   WhatsApp: MB WAY ou transferência» (linhas 297–298), «por MB WAY ou transferência» (linha 431) e
   `paymentAccepted` no JSON-LD (linha 139). Nem «Mimices» («Sobre a Mimices», «A Mimices», a descrição da
   loja) nem «tom de linho».
2. Na ficha:
   - «Feito por», com o nome, a morada e o email (RGSP, art. 19.º, al. a));
   - a composição da toalha com «[por confirmar]»;
   - a linha da peça personalizada sem desistência (DL 24/2014, art. 4.º, n.º 1, al. p)).
3. Na encomenda:
   - antes do botão, a linha das personalizadas e a ligação aos termos;
   - os passos «a seguir» iguais aos termos: a encomenda fica feita quando o cliente confirma o resumo;
   - o botão diz «Encomendar pelo WhatsApp».
4. Os avisos das velas na ficha das velas e dos conjuntos (RGSP, art. 19.º, al. d)). É LEI, mas decide o
   Renato: na Mimices tirou-os, e o bloco está no commit 396e7e9 da Mimices.
5. O rodapé:
   - o Livro discreto da `legal-comum`, que liga a `https://www.livroreclamacoes.pt/inicio` (a proposta A
     usa `/Inicio/`);
   - o telefone, se aparecer, com a nota da chamada.
6. Nada de terceiros: letras do Google, mapas, vídeos ou o Instagram embebido tornam falsas a política de
   cookies e a de privacidade, e pedem consentimento (Lei 41/2004, art. 5.º).
7. ~~As meta `google-site-verification` e `msvalidate.01` do `layout.mjs` são as da Mimices.~~ O
   `layout.mjs` novo (proposta A) já não as tem (9 nov).

### D. Dados (`content/`)

1. ~~`produtos/pote-de-mel-com-colher.json`: a frase da origem do mel~~ saiu a 9 nov (era uma alegação de
   origem sem fonte, DL 57/2008, art. 7.º). Volta só com o rótulo (pergunta 8).
2. `site.json`, quando as respostas chegarem: `empresa.morada`, `empresa.iva`, `entrega.portes`,
   `entrega.prazo`, `entrega.pagamento` e `entrega.levantamento`. O levantamento só se oferece no domínio
   quando `entrega.levantamento` diz como se combina (o `build.mjs` tira a zona sem esse texto, 9 nov); na
   pré-visualização aparece com «[por confirmar]». Os portes não dizem «por encomenda» nem «por peça» até
   a cliente responder (pergunta 3).
3. **Mudança de modelo** (`regras.mjs` e painel, byte a byte): nos alimentos, campos para os ingredientes, os
   alergénios, a quantidade líquida, a conservação e a origem (Reg. (UE) 1169/2011, art. 9.º). Até lá podem ir
   na descrição.
4. Quando chegarem as fichas de segurança e o rótulo das bolas de sabão, preencher `perigos`, `avisos`,
   `idade`, `fabricante` e `naoBrinquedo`, campos que já existem.
5. Se a cliente não autorizar os nomes nas fotografias: trocá-las, ou tapar os nomes, antes do primeiro envio
   para o GitHub (o repositório é público).
6. **Mudança nas regras** (`regras.mjs` e painel): em produção, a morada sem a rua só avisa (linha 663,
   `empresa.morada:incompleta`). Foi a decisão para a Mimices, que abriu só com a localidade. Para a Dream
   Art, a lei pede a morada geográfica (DL 7/2004, art. 10.º), por isso o `--producao` devia parar sem ela.
   Decide o Renato.
