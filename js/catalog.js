window.STORE_CONFIG = {
  catalogReview: false,
  brand: {
    name: "Magazine do Skincare",
    tagline: "Produtos para sua rotina de cuidados com a pele",
    announcement: "Magazine do Skincare · Produtos para sua rotina de cuidados com a pele",
    contactEmail: "morgana@extratosdaterra.com.br",
    contactText: "WhatsApp: (11) 91975-6184",
    logo: "public/images/brand/magazine-do-skincare.png"
  },
  images: {
    heroDesktop: "public/images/banners/black-friday-1-desktop.png",
    heroMobile: "public/images/banners/black-friday-1-mobile.png",
    heroSlides: [
    {
        "src": "public/images/banners/black-friday-1-desktop.png",
        "mobileSrc": "public/images/banners/black-friday-1-mobile.png",
        "alt": "Creamy Days: descontos progressivos de Black Friday",
        "href": "#catalogo-completo"
    },
    {
        "src": "public/images/banners/black-friday-2-desktop.png",
        "mobileSrc": "public/images/banners/black-friday-2-mobile.png",
        "alt": "Black Friday: campanha Peptide Cream",
        "href": "#catalogo-completo"
    },
    {
        "src": "public/images/banners/black-friday-3-desktop.png",
        "mobileSrc": "public/images/banners/black-friday-3-mobile.png",
        "alt": "Creamy Days: produtos selecionados com desconto",
        "href": "#catalogo-completo"
    },
    {
        "src": "public/images/banners/black-friday-4-desktop.png",
        "mobileSrc": "public/images/banners/black-friday-4-mobile.png",
        "alt": "Black Friday: campanha de brindes",
        "href": "empresa.html#promocoes"
    },
    {
        "src": "public/images/banners/black-friday-5-desktop.png",
        "mobileSrc": "public/images/banners/black-friday-5-mobile.png",
        "alt": "Creamy e Jade Picon: favoritos da campanha",
        "href": "#catalogo-completo"
    }
],
    routineDay: "public/images/products/official-157906.png",
    campaignSecondary: "public/images/banners/black-friday-3-desktop.png",
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
