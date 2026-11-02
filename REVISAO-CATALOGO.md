# Revisão do catálogo — 01/11/2026

## Situação em 02/11/2026

Por solicitação expressa do responsável, o catálogo e as novas compras foram restaurados com os 119 cadastros preservados. O desconto existente não foi reaplicado. O modo de revisão foi desativado no backend e na vitrine, e os avisos de pausa foram retirados das páginas públicas. Permanecem a identificação da empresa, os campos de identificação dos produtos e a retirada anterior das 16 ofertas descritas em `withdrawn-products.json`. A retomada não comprova autorização de marca e não reativa nem altera a conta do Google Ads. As medidas abaixo registram a revisão anterior.

O responsável inicialmente informou fabricação própria sem relação com a Creamy e depois esclareceu que afirma fabricar produtos da marca Creamy mediante autorização. A autorização e os dados dos produtos efetivamente fabricados não foram apresentados para esta revisão técnica. Essas declarações não devem ser tratadas como confirmação ou negação documental de vínculo com a marca. O catálogo anterior usa nomes, descrições, GTINs e fotos de produtos Creamy; é necessário conferir a correspondência entre cada registro e o produto efetivamente vendido. Não é correto reaproveitar esses registros apenas trocando a marca, a composição ou os identificadores.

## Medidas implementadas

- Catálogo em revisão, com novas compras temporariamente indisponíveis. `store-hosting.json` registra `catalogReview: true`.
- APIs públicas, feed Merchant, sitemap e JavaScript servido ao público não oferecem os cadastros anteriores. Links antigos de produtos no backend retornam 404. O backend rejeita novas cobranças durante a revisão, inclusive a partir de páginas antigas.
- O build estático publica uma lista de produtos vazia. O estado público não depende apenas de esconder cards no navegador.
- Cadastros antigos permanecem no painel para revisão, sem apagar estoque, histórico ou pedidos. Consultas de pedidos anteriores continuam disponíveis.
- Campanhas visuais do fabricante substituídas por seis peças SVG da Magazine do Skincare, em formatos desktop e mobile. Fotos de embalagens não foram modificadas para simular produtos próprios.
- Nome fantasia e razão social separados conforme os dados informados pelo responsável: Magazine do Skincare / Morgana Wagner de Souza LTDA / CNPJ 34.105.837/0001-17.
- Identificação do vendedor aparece antes do conteúdo nas páginas públicas. A marca do produto deixou de ser preenchida automaticamente como Creamy no schema e no feed.

## O que falta para retomar as ofertas

Receber e conferir marca real, nomes, volumes, preços, composição, modo de uso, fotos reais de embalagens, identificação do fabricante e documentação aplicável aos produtos efetivamente vendidos. Os GTINs e dados do catálogo antigo não devem ser atribuídos aos novos produtos.

O editor administrativo passou a oferecer campos explícitos para marca, fabricante, conteúdo por unidade e EAN/GTIN. Esses campos aparecem na ficha do produto quando preenchidos e não certificam, por si, autorização ou regularização. Durante a revisão, salvar um produto preserva o registro no painel e não o publica; o painel informa essa distinção.

Depois de cadastrar os produtos corretos, revisar anúncios, recursos e fontes de dados externas. Não há acesso às campanhas ou à contestação por meio deste repositório; esses conteúdos não foram alterados nem enviados automaticamente. O site temporariamente sem ofertas não é uma afirmação de que já está pronto para anunciar.

A contestação deve descrever honestamente a divergência encontrada e as correções concluídas, acompanhadas da documentação real. Não declarar vínculo oficial com fabricante, autorização, notas fiscais ou regularização que não tenham sido comprovados. Não enviar o rascunho com lacunas nem apresentar a pausa temporária do catálogo como solução definitiva.

Essas medidas não determinam o motivo exato da decisão do Google nem garantem restabelecimento. A política considera anúncios, destino, conta e outras fontes: https://support.google.com/adspolicy/answer/176017?hl=pt-BR

## Verificação

O teste `tests/catalog-review.ps1` verifica bloqueio das ofertas públicas, feed vazio, ausência de links de produtos no sitemap, bloqueio de cobranças novas e preservação do painel e da consulta de pedido anterior. O cenário ativo de `tests/run.ps1` usa fixtures isoladas e não representa publicação do catálogo anterior.
