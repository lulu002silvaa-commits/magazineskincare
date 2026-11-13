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
  "heroDesktop": "public/images/banners/black-friday-1-desktop.webp",
  "heroMobile": "public/images/banners/black-friday-1-mobile.webp",
  "heroSlides": [
    {
      "src": "public/images/banners/black-friday-1-desktop.webp",
      "mobileSrc": "public/images/banners/black-friday-1-mobile.webp",
      "alt": "Campanha Creamy Days",
      "href": "empresa.html#promocoes"
    },
    {
      "src": "public/images/banners/black-friday-2-desktop.webp",
      "mobileSrc": "public/images/banners/black-friday-2-mobile.webp",
      "alt": "Campanha Peptide Cream da Creamy",
      "href": "empresa.html#promocoes"
    },
    {
      "src": "public/images/banners/black-friday-3-desktop.webp",
      "mobileSrc": "public/images/banners/black-friday-3-mobile.webp",
      "alt": "Produtos em destaque na campanha Creamy Days",
      "href": "empresa.html#promocoes"
    },
    {
      "src": "public/images/banners/black-friday-4-desktop.webp",
      "mobileSrc": "public/images/banners/black-friday-4-mobile.webp",
      "alt": "Campanha de brindes da Creamy",
      "href": "empresa.html#promocoes"
    },
    {
      "src": "public/images/banners/black-friday-5-desktop.webp",
      "mobileSrc": "public/images/banners/black-friday-5-mobile.webp",
      "alt": "Creamy e Jade Picon: produtos da coleção",
      "href": "#catalogo-completo"
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
