window.STORE_CONFIG = {
  brand: {
    name: "Magazine do Skincare",
    tagline: "Produtos para sua rotina de cuidados com a pele",
    announcement: "Ciência e cuidado para transformar sua rotina de skincare",
    contactEmail: "morgana@extratosdaterra.com.br",
    contactText: "WhatsApp: (11) 91975-6184",
    logo: "public/images/brand/magazine-do-skincare.png"
  },
  images: {
    heroDesktop: "public/images/banners/home-1-desktop.png",
    heroMobile: "public/images/banners/home-1-mobile.png",
    heroSlides: [
    {
        "src": "public/images/banners/home-1-desktop.png",
        "mobileSrc": "public/images/banners/home-1-mobile.png",
        "alt": "Creamy Days: até 40% de desconto",
        "href": "#produtos"
    },
    {
        "src": "public/images/banners/home-2-desktop.png",
        "mobileSrc": "public/images/banners/home-2-mobile.png",
        "alt": "Retinal Eye Cream com 20% de desconto",
        "href": "produto.html?id=retinal-eye-cream"
    },
    {
        "src": "public/images/banners/home-3-desktop.png",
        "mobileSrc": "public/images/banners/home-3-mobile.png",
        "alt": "Sérum hidratante de brinde em compras acima de R$ 349; consulte condições",
        "href": "empresa.html#promocoes"
    },
    {
        "src": "public/images/banners/home-4-desktop.png",
        "mobileSrc": "public/images/banners/home-4-mobile.png",
        "alt": "Duo Glass Skin: Pore Refiner e Ceramide Skin Repair",
        "href": "produto.html?id=porerefiner-ceramideskinrepair"
    },
    {
        "src": "public/images/banners/home-5-desktop.png",
        "mobileSrc": "public/images/banners/home-5-mobile.png",
        "alt": "Conheça os produtos Creamy da coleção Jade Picon",
        "href": "#catalogo-completo"
    }
],
    routineDay: "public/images/products/official-157906.png",
    campaignSecondary: "public/images/banners/campanha-secundaria.png",
    categoryOily: "public/images/products/official-157906.png",
    categoryDry: "public/images/products/official-157916.jpg",
    categorySensitive: "public/images/products/official-157672.png",
    categoryHydration: "public/images/products/official-158370.jpg"
  },
  categories: [...new Set((window.CREAMY_PRODUCTS || []).map((product) => product.categoria).filter(Boolean))],
  products: window.CREAMY_PRODUCTS || [],
  routines: [],
  articles: []
};
