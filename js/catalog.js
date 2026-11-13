window.STORE_CONFIG = {
  catalogReview: false,
  brand: {
    name: "Magazine do Skincare",
    tagline: "Produtos para sua rotina de cuidados com a pele",
    announcement: "+5% OFF na primeira compra com o cupom PRIMEIRA5",
    announcements: [
      "+5% OFF na primeira compra com o cupom PRIMEIRA5",
      "BRINDE em compras a partir de R$299",
      "Ganhe 5% OFF no PIX!"
    ],
    contactEmail: "morgana@extratosdaterra.com.br",
    contactText: "WhatsApp: (11) 91975-6184",
    logo: "public/images/brand/magazine-do-skincare.png"
  },
  images: {
    heroDesktop: "public/images/banners/black-friday-1-desktop.webp",
    heroMobile: "public/images/banners/black-friday-1-mobile.webp",
    heroSlides: [
    {
        "src": "public/images/banners/black-friday-1-desktop.webp",
        "mobileSrc": "public/images/banners/black-friday-1-mobile.webp",
        "alt": "Creamy Days: descontos progressivos de Black Friday",
        "href": "#catalogo-completo"
    },
    {
        "src": "public/images/banners/black-friday-2-desktop.webp",
        "mobileSrc": "public/images/banners/black-friday-2-mobile.webp",
        "alt": "Black Friday: campanha Peptide Cream",
        "href": "#catalogo-completo"
    },
    {
        "src": "public/images/banners/black-friday-3-desktop.webp",
        "mobileSrc": "public/images/banners/black-friday-3-mobile.webp",
        "alt": "Creamy Days: produtos selecionados com desconto",
        "href": "#catalogo-completo"
    },
    {
        "src": "public/images/banners/black-friday-4-desktop.webp",
        "mobileSrc": "public/images/banners/black-friday-4-mobile.webp",
        "alt": "Black Friday: campanha de brindes",
        "href": "empresa.html#promocoes"
    },
    {
        "src": "public/images/banners/black-friday-5-desktop.webp",
        "mobileSrc": "public/images/banners/black-friday-5-mobile.webp",
        "alt": "Creamy e Jade Picon: favoritos da campanha",
        "href": "#catalogo-completo"
    }
],
    routineDay: "public/images/products/official-157906.png",
    campaignSecondary: "public/images/banners/black-friday-3-desktop.webp",
    categoryOily: "public/images/products/official-157906.png",
    categoryDry: "public/images/products/official-157916.jpg",
    categorySensitive: "public/images/products/official-157672.png",
    categoryHydration: "public/images/products/official-158370.jpg"
  },
  categories: [...new Set((window.CREAMY_PRODUCTS || []).map(product => product.categoria).filter(Boolean))],
  products: window.CREAMY_PRODUCTS || [],
  routines: [],
  articles: []
};
