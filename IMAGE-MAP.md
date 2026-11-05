# Imagens e fontes em uso

- `public/images/brand/magazine-do-skincare.png`: logo Magazine do Skincare fornecida pelo proprietário. Arte original preservada; tamanho ajustado pelo CSS.
- `public/images/banners/black-friday-1-desktop.png` a `black-friday-5-desktop.png`: cinco banners da campanha de referência, na ordem das capturas fornecidas pelo proprietário.
- `public/images/banners/black-friday-1-mobile.png` a `black-friday-5-mobile.png`: versões para celular dos mesmos banners.
- `public/images/banners/black-friday-3-desktop.png`: campanha secundária. As artes anteriores continuam preservadas na pasta.
- `public/images/products/official-*`: 410 fotos reais distintas. Cada produto referencia sua imagem principal e a galeria em `js/products.js`. Categorias e rotinas reutilizam essas fotos pelo arquivo `js/catalog.js`.
- `public/fonts/`: arquivos locais Roc Grotesk e Roc Grotesk Wide usados em `css/skin.css`.

As fotos de produto usam `object-fit: contain` para preservar o enquadramento. As galerias têm miniaturas e controles de navegação. A loja não depende de URLs externas para suas imagens ou fontes.

## Imagens otimizadas

Os banners usam versões `.webp`. `js/image-assets.js` relaciona as fotos originais às versões WebP e às miniaturas `-420.webp` usadas na vitrine, sacola e checkout. As galerias e a prévia de produto usam a versão maior; fotos novas enviadas pelo painel continuam funcionando pelo caminho original. Os originais permanecem preservados.

As 387 imagens foram reduzidas de 70.599.227 para 14.650.538 bytes (79,2%). As miniaturas das 377 fotos somam 3.258.102 bytes. Execute `node tests/image-assets.mjs` para conferir cobertura, arquivos WebP e redução de tamanho. `vercel.json` configura cache de imagens por sete dias; use um novo nome de arquivo ao substituir uma arte durante esse período.
