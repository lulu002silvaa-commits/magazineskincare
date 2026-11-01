# Revisão do catálogo — 01/11/2026

O responsável informou que a empresa fabrica produtos próprios e não tem relação com a Creamy. O catálogo anteriormente publicado usava nomes, descrições, GTINs e fotos de produtos Creamy. Não é correto reaproveitar esses registros apenas trocando a marca, pois isso poderia atribuir ao produto próprio embalagem, composição e identificadores de outro produto.

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

Depois de cadastrar os produtos corretos, revisar anúncios, recursos e fontes de dados externas. Não há acesso às campanhas ou à contestação por meio deste repositório; esses conteúdos não foram alterados nem enviados automaticamente. O site temporariamente sem ofertas não é uma afirmação de que já está pronto para anunciar.

A contestação deve descrever honestamente a divergência encontrada e as correções concluídas, acompanhadas da documentação real. Não declarar vínculo oficial com fabricante, autorização, notas fiscais ou regularização que não tenham sido comprovados. Não enviar o rascunho com lacunas nem apresentar a pausa temporária do catálogo como solução definitiva.

Essas medidas não determinam o motivo exato da decisão do Google nem garantem restabelecimento. A política considera anúncios, destino, conta e outras fontes: https://support.google.com/adspolicy/answer/176017?hl=pt-BR

## Verificação

O teste `tests/catalog-review.ps1` verifica bloqueio das ofertas públicas, feed vazio, ausência de links de produtos no sitemap, bloqueio de cobranças novas e preservação do painel e da consulta de pedido anterior. O cenário ativo de `tests/run.ps1` usa fixtures isoladas e não representa publicação do catálogo anterior.
