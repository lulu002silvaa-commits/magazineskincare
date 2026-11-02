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
    heroDesktop: "public/images/banners/magazine-catalog-desktop.svg",
    heroMobile: "public/images/banners/magazine-catalog-mobile.svg",
    heroSlides: [
    {
        "src": "public/images/banners/magazine-catalog-desktop.svg",
        "mobileSrc": "public/images/banners/magazine-catalog-mobile.svg",
        "alt": "Magazine do Skincare: conheça o catálogo da loja",
        "href": "empresa.html#atendimento"
    },
    {
        "src": "public/images/banners/magazine-needs-desktop.svg",
        "mobileSrc": "public/images/banners/magazine-needs-mobile.svg",
        "alt": "Magazine do Skincare: encontre produtos por necessidade",
        "href": "empresa.html#atendimento"
    },
    {
        "src": "public/images/banners/magazine-service-desktop.svg",
        "mobileSrc": "public/images/banners/magazine-service-mobile.svg",
        "alt": "Magazine do Skincare: dados da empresa e atendimento",
        "href": "empresa.html"
    }
],
    routineDay: "public/images/banners/magazine-catalog-desktop.svg",
    campaignSecondary: "public/images/banners/magazine-service-desktop.svg",
    categoryOily: "public/images/banners/magazine-catalog-desktop.svg",
    categoryDry: "public/images/banners/magazine-catalog-desktop.svg",
    categorySensitive: "public/images/banners/magazine-catalog-desktop.svg",
    categoryHydration: "public/images/banners/magazine-catalog-desktop.svg"
  },
  categories: [...new Set((window.CREAMY_PRODUCTS || []).map(product => product.categoria).filter(Boolean))],
  products: window.CREAMY_PRODUCTS || [],
  routines: [],
  articles: []
};
