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
  "heroDesktop": "public/images/banners/magazine-catalog-desktop.svg",
  "heroMobile": "public/images/banners/magazine-catalog-mobile.svg",
  "heroSlides": [
    {
      "src": "public/images/banners/magazine-catalog-desktop.svg",
      "mobileSrc": "public/images/banners/magazine-catalog-mobile.svg",
      "alt": "Catálogo da Magazine do Skincare",
      "href": "#catalogo-completo"
    },
    {
      "src": "public/images/banners/magazine-needs-desktop.svg",
      "mobileSrc": "public/images/banners/magazine-needs-mobile.svg",
      "alt": "Produtos por categoria e tipo de pele",
      "href": "#necessidades"
    },
    {
      "src": "public/images/banners/magazine-service-desktop.svg",
      "mobileSrc": "public/images/banners/magazine-service-mobile.svg",
      "alt": "Dados da loja e condições de compra",
      "href": "empresa.html"
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
