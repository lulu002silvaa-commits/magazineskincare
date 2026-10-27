window.STORE_CONFIG = {
  brand: {
    name: "Magazine do Skincare",
    tagline: "Produtos para sua rotina de cuidados com a pele",
    announcement: "Ciência e cuidado para transformar sua rotina de skincare",
    contactEmail: "",
    contactText: "Magazine do Skincare · CNPJ 34.105.837/0001-17",
    logo: "public/images/brand/magazine-do-skincare.png"
  },
  images: {
    heroDesktop: "public/images/banners/creamy-current.png",
    heroMobile: "public/images/banners/creamy-current.png",
    heroSlides: [
      { src: "public/images/banners/creamy-current.png", alt: "Campanha Creamy", href: "#produtos" },
      { src: "public/images/banners/campanha-secundaria.png", alt: "Campanha do clareador Intense TX", href: "produto.html?id=intense-tx" }
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
