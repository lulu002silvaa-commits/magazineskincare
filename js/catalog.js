window.STORE_CONFIG = {
  catalogReview: false,
  brand: {
  "name": "Magazine do Skincare",
  "tagline": "Produtos para sua rotina de cuidados com a pele",
  "announcement": "Cuidados com a pele • Conheça nosso catálogo",
  "announcements": [
    "Cuidados com a pele • Conheça nosso catálogo",
    "Brinde acima de R$349 • Consulte as condições",
    "Pagamento por Pix • Confira o total antes de pagar"
  ],
  "contactEmail": "morgana@extratosdaterra.com.br",
  "contactText": "WhatsApp: (11) 91975-6184",
  "logo": "public/images/brand/magazine-do-skincare.png"
},
  images: {
  "heroDesktop": "public/images/banners/magazine-offer-1-desktop.webp",
  "heroMobile": "public/images/banners/magazine-offer-1-mobile.webp",
  "heroSlides": [
    {
      "src": "public/images/banners/magazine-offer-1-desktop.webp",
      "mobileSrc": "public/images/banners/magazine-offer-1-mobile.webp",
      "alt": "Skincare em oferta: até 30% em produtos selecionados; descontos já incluídos no catálogo",
      "href": "#catalogo-completo",
      "discountPercent": 30
    },
    {
      "src": "public/images/banners/magazine-offer-2-desktop.webp",
      "mobileSrc": "public/images/banners/magazine-offer-2-mobile.webp",
      "alt": "Ceramide Skin Repair: de R$59,99 por R$41,99; desconto já incluído",
      "href": "produto.html?id=ceramide-skin-repair",
      "offer": {
        "productId": "ceramide-skin-repair",
        "priceCents": 4199,
        "regularCents": 5999
      }
    },
    {
      "src": "public/images/banners/magazine-offer-3-desktop.webp",
      "mobileSrc": "public/images/banners/magazine-offer-3-mobile.webp",
      "alt": "Sérum Hidratante: de R$35,99 por R$25,19; desconto já incluído",
      "href": "produto.html?id=drops-serum-hidratante",
      "offer": {
        "productId": "drops-serum-hidratante",
        "priceCents": 2519,
        "regularCents": 3599
      }
    },
    {
      "src": "public/images/banners/magazine-offer-4-desktop.webp",
      "mobileSrc": "public/images/banners/magazine-offer-4-mobile.webp",
      "alt": "Ganhe 1 sérum de brinde em compras acima de R$349, sujeito à disponibilidade",
      "href": "empresa.html#promocoes",
      "giftProductId": "drops-serum-hidratante"
    },
    {
      "src": "public/images/banners/magazine-offer-5-desktop.webp",
      "mobileSrc": "public/images/banners/magazine-offer-5-mobile.webp",
      "alt": "Duo Glass Skin: de R$189,98 por R$132,99; desconto já incluído",
      "href": "produto.html?id=porerefiner-ceramideskinrepair",
      "offer": {
        "productId": "porerefiner-ceramideskinrepair",
        "priceCents": 13299,
        "regularCents": 18998
      }
    }
  ],
  "routineDay": "public/images/products/official-157906.png",
  "campaignSecondary": "public/images/banners/magazine-service-desktop.svg",
  "categoryOily": "public/images/products/official-157906.png",
  "categoryDry": "public/images/products/official-157916.jpg",
  "categorySensitive": "public/images/products/official-157672.png",
  "categoryHydration": "public/images/products/official-158370.jpg"
},
  categories: [...new Set((window.CREAMY_PRODUCTS || []).map(product => product.categoria).filter(Boolean))],
  products: window.CREAMY_PRODUCTS || [],
  routines: [],
  articles: []
};
