# Banners com preços reais do catálogo

Revisão de 13/11/2026. Os preços abaixo foram conferidos no catálogo público do backend antes da edição. O usuário escolheu usar os preços reais, mantendo as imagens de campanha como referência visual e declarou possuir autorização de uso.

| Banner | Oferta publicada | Destino |
| --- | --- | --- |
| 1 | Até 30% OFF em produtos selecionados; descontos já incluídos no catálogo | Catálogo |
| 2 | Ceramide Skin Repair: de R$59,99 por R$41,99 | Produto Ceramide Skin Repair |
| 3 | Sérum Hidratante: de R$35,99 por R$25,19 | Produto Sérum Hidratante |
| 4 | 1 sérum de brinde em compras acima de R$349, após descontos, sujeito à disponibilidade | Condições da promoção |
| 5 | Duo Glass Skin: de R$189,98 por R$132,99 | Produto Duo Glass Skin |

Os descontos de 30% são os já incorporados nos preços dos produtos indicados, com arredondamento em centavos. Não há desconto progressivo, desconto adicional no Pix ou cupom anunciado nas novas artes. A promoção de brinde mantém as regras existentes: estritamente acima de R$349, um por pedido e disponibilidade de estoque.

## Arquivos finais

Pasta: `public/images/banners/`.

- `magazine-offer-1-desktop.webp` e `magazine-offer-1-mobile.webp`
- `magazine-offer-2-desktop.webp` e `magazine-offer-2-mobile.webp`
- `magazine-offer-3-desktop.webp` e `magazine-offer-3-mobile.webp`
- `magazine-offer-4-desktop.webp` e `magazine-offer-4-mobile.webp`
- `magazine-offer-5-desktop.webp` e `magazine-offer-5-mobile.webp`

Versões para computador: 1668 × 600. Versões para celular: 640 × 800. Os PNGs de edição ficam preservados em `.runtime/banner-masters/`; os arquivos originais da campanha não foram sobrescritos. Os arquivos finais WebP somam aproximadamente 825 KB para as dez versões. A página seleciona apenas a versão correspondente à tela.

## Prompts de edição

Ferramenta utilizada: `image_gen` integrada, em modo de edição. Um prompt por arte e formato. Os resultados foram inspecionados visualmente e convertidos para WebP para publicação.

Instruções comuns: usar o banner original como imagem-alvo; preservar a identidade, pose e estilo fotográfico das modelos e o fundo azul; manter as marcas nas embalagens reais; remover alegações e promoções incompatíveis; apresentar “MAGAZINE DO SKINCARE” como identificação do vendedor; usar tipografia legível em azul, preto e branco; não usar borrões, contagem regressiva, promessas médicas ou nova alegação de endosso. Criar separadamente uma composição horizontal e uma vertical.

1. **Oferta geral:** remover os círculos progressivos, o benefício extra no Pix e a escolha de brindes. Texto: “SKINCARE EM OFERTA”, “ATÉ 30% OFF”, “Em produtos selecionados” e “Descontos já incluídos nos preços do catálogo.”
2. **Ceramide:** substituir o produto indisponível na imagem pela referência real `official-158370.jpg`. Texto: “CERAMIDE SKIN REPAIR”, “De R$59,99”, “Por R$41,99”, “30% OFF” e “Desconto já incluído no preço.” Remover 48h, GHK-Cu e promessas de resultado.
3. **Sérum:** usar a referência real `official-158344.jpg` no lugar dos produtos da campanha anterior. Texto: “SÉRUM HIDRATANTE”, “De R$35,99”, “Por R$25,19”, “30% OFF” e “Desconto já incluído no preço.” Remover a alegação de 50% OFF.
4. **Brinde:** substituir a escolha de três brindes por um único sérum, usando `official-158344.jpg`. Texto: “GANHE 1 SÉRUM DE BRINDE”, “Em compras acima de R$349”, “1 brinde por pedido. Sujeito à disponibilidade.” e “Total dos produtos após descontos.”
5. **Duo:** manter a modelo como referência e usar a foto real `official-158490.png` do Pore Refiner com Ceramide Skin Repair. Texto: “DUO GLASS SKIN”, “Pore Refiner + Ceramide Skin Repair”, “De R$189,98”, “Por R$132,99”, “30% OFF” e “Desconto já incluído no preço.” Remover o texto de endosso da campanha anterior.

## Manutenção

Ao alterar os preços ou a disponibilidade no painel, atualizar ou suspender também o banner correspondente. Os preços fazem parte dos pixels das artes, portanto não são atualizados automaticamente pelo painel. Conservar os comprovantes de preços de referência e os documentos de autorização de imagem para eventual solicitação da plataforma. A edição não certifica aprovação ou reativação da conta pela Taboola.
