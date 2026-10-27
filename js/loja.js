(function () {
  "use strict";

  const CART_KEY = "calma-pele-carrinho";
  const MAX_CART_QUANTITY = 20;
  const FEATURED_ORDER = {
    favorites: ["drops-serum-hidratante", "lip-balm-latte", "lip-balm-mocha-10g", "acido-salicilico-1"],
    launches: ["intensetx-acidotranexamico", "intensetx-vitaminacgold", "intensetx-ceramideskinrepair", "intensetx-peptide"]
  };
  const FEATURED_COLLECTIONS = [
    { id: "favorites", label: "Mais Vendidos", matches: (product) => product.selo?.includes("Favoritos da Jade") || FEATURED_ORDER.favorites.includes(product.id) },
    { id: "duos", label: "Duos", matches: (product) => /^duo\b/i.test(product.nome || "") },
    { id: "routines", label: "Rotinas Completas", matches: (product) => /^(kit|combo)\b/i.test(product.nome || "") || product.categoria === "Combos" },
    { id: "antiacne", label: "Antiacne", matches: (product) => product.categoria === "Antiacne" }
  ];
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const config = window.STORE_CONFIG;
  let activeCategory = "Todos";
  let activeSkin = "";
  let activeCollection = FEATURED_COLLECTIONS[0].id;
  let searchTerm = "";
  let toastTimer;
  let catalogVerified = false;
  const connection = window.StoreConnection || { apiEnabled: true, mode: 'php' };

  function money(value) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  }

  function validPrice(value) {
    return typeof value === "number" && Number.isFinite(value) && value > 0;
  }

  function displayDescription(value) {
    const description = typeof value === "string" ? value.trim() : "";
    if (description.length < 140 || /[.!?…]$/.test(description)) return description;
    const lastWordBoundary = description.lastIndexOf(" ");
    return `${description.slice(0, lastWordBoundary > 0 ? lastWordBoundary : description.length).trimEnd()}…`;
  }

  function currentPrice(product) {
    return validPrice(product.precoPix) ? product.precoPix : product.preco;
  }

  function safeRead(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      console.error(`Não foi possível ler ${key} do armazenamento local.`, error);
      return fallback;
    }
  }

  function readCart() {
    const value = safeRead(CART_KEY, []);
    if (!Array.isArray(value)) return [];
    const items = new Map();
    value.forEach(item => {
      if (!item || typeof item.id !== "string" || !Number.isInteger(item.quantity) || item.quantity < 1) return;
      items.set(item.id, Math.min(MAX_CART_QUANTITY, (items.get(item.id) || 0) + item.quantity));
    });
    return [...items].map(([id, quantity]) => ({ id, quantity }));
  }

  function writeCart(cart) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      updateCartCount();
      return true;
    } catch (error) {
      console.error("Não foi possível salvar a sacola neste navegador.", error);
      showToast("Não foi possível salvar a sacola. Verifique o armazenamento do navegador.");
      return false;
    }
  }

  function updateCartCount() {
    const count = readCart().reduce((sum, item) => sum + item.quantity, 0);
    $$("#cartCount").forEach((element) => { element.textContent = String(count); });
  }

  function productById(id) {
    return config.products.find((product) => product.id === id);
  }

  function canPurchase(product) {
    return catalogVerified && validPrice(currentPrice(product)) && product.disponivel === true && purchaseLimit(product) > 0;
  }

  function purchaseLimit(product) {
    return Number.isInteger(product.estoque) ? Math.max(0, Math.min(MAX_CART_QUANTITY, product.estoque)) : MAX_CART_QUANTITY;
  }

  function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 3600);
  }

  function makePlaceholder(filename, label) {
    const placeholder = document.createElement("div");
    placeholder.className = "media-placeholder";
    placeholder.setAttribute("role", "img");
    placeholder.setAttribute("aria-label", label);
    const symbol = document.createElement("span");
    symbol.className = "placeholder-leaf";
    symbol.setAttribute("aria-hidden", "true");
    symbol.textContent = "✳";
    const description = document.createElement("span");
    description.className = "placeholder-label";
    description.textContent = "Imagem indisponível";
    const path = document.createElement("span");
    path.className = "placeholder-filename";
    path.hidden = true;
    placeholder.append(symbol, description, path);
    return placeholder;
  }

  function makeProductImage(product, className) {
    const figure = document.createElement("div");
    figure.className = className;
    const filename = typeof product.imagem === "string" ? product.imagem : "";
    const placeholder = makePlaceholder(filename, `Foto de ${product.nome}`);
    figure.append(placeholder);
    if (!filename) return figure;

    const image = document.createElement("img");
    image.src = filename;
    image.alt = `Foto de ${product.nome}`;
    image.loading = "lazy";
    image.addEventListener("load", () => {
      placeholder.hidden = true;
      figure.classList.add("has-image");
    }, { once: true });
    image.addEventListener("error", () => {
      image.remove();
    }, { once: true });
    figure.append(image);
    return figure;
  }

  function initConfiguredImages() {
    $$("[data-image-key]").forEach((container) => {
      if (container.classList.contains("hero-media") && Array.isArray(config.images.heroSlides)) {
        initHeroSlider(container, config.images.heroSlides);
        return;
      }
      const filename = config.images[container.dataset.imageKey];
      const filenameLabel = $(".placeholder-filename", container);
      if (filenameLabel) filenameLabel.textContent = filename || "Configure o caminho da imagem em js/catalog.js";
      if (!filename) return;

      const picture = document.createElement("picture");
      const mobileFilename = config.images[container.dataset.mobileImageKey];
      let mobileSource = null;
      if (mobileFilename) {
        mobileSource = document.createElement("source");
        mobileSource.media = "(max-width: 650px)";
        mobileSource.srcset = mobileFilename;
        picture.append(mobileSource);
      }
      const image = document.createElement("img");
      image.src = filename;
      image.alt = container.getAttribute("aria-label") || "";
      image.loading = container.classList.contains("hero-media") ? "eager" : "lazy";
      image.addEventListener("load", () => {
        container.classList.add("has-image");
        $$(".placeholder-leaf, .placeholder-label, .placeholder-filename", container)
          .forEach((placeholder) => { placeholder.hidden = true; });
      }, { once: true });
      const handleImageError = () => {
        if (mobileSource && mobileSource.isConnected) {
          mobileSource.remove();
          image.addEventListener("error", () => picture.remove(), { once: true });
          return;
        }
        picture.remove();
      };
      image.addEventListener("error", handleImageError, { once: true });
      picture.append(image);
      container.append(picture);
    });
  }

  function initHeroSlider(container, slides) {
    if (!slides.length) return;
    const image = document.createElement("img");
    image.className = "hero-slide-image";
    image.alt = slides[0].alt || "Campanha da loja";
    image.src = slides[0].src;
    image.fetchPriority = "high";
    image.addEventListener("load", () => {
      container.classList.add("has-image");
      $$(".placeholder-leaf, .placeholder-label, .placeholder-filename", container)
        .forEach((placeholder) => { placeholder.hidden = true; });
    }, { once: true });
    container.append(image);
    const campaignLink = document.createElement("a");
    campaignLink.className = "hero-slide-link";
    campaignLink.href = slides[0].href || "#produtos";
    campaignLink.setAttribute("aria-label", `Ver campanha: ${slides[0].alt || "produtos em destaque"}`);
    container.append(campaignLink);
    const dots = $(".hero-slider-dots", container);
    let activeIndex = 0;
    let timer;
    let hovered = false;
    let focused = false;
    const show = (index) => {
      activeIndex = (index + slides.length) % slides.length;
      image.src = slides[activeIndex].src;
      image.alt = slides[activeIndex].alt || "Campanha da loja";
      campaignLink.href = slides[activeIndex].href || "#produtos";
      campaignLink.setAttribute("aria-label", `Ver campanha: ${slides[activeIndex].alt || "produtos em destaque"}`);
      $$(".hero-slider-dot", dots).forEach((dot, dotIndex) => {
        dot.classList.toggle("active", dotIndex === activeIndex);
        dot.setAttribute("aria-current", String(dotIndex === activeIndex));
      });
    };
    slides.forEach((slide, index) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = `hero-slider-dot${index === 0 ? " active" : ""}`;
      dot.setAttribute("aria-label", `Mostrar banner ${index + 1}`);
      dot.setAttribute("aria-current", String(index === 0));
      dot.addEventListener("click", () => show(index));
      dots.append(dot);
    });
    $("[data-hero-prev]", container).addEventListener("click", () => show(activeIndex - 1));
    $("[data-hero-next]", container).addEventListener("click", () => show(activeIndex + 1));
    const start = () => {
      stop();
      if (!hovered && !focused && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        timer = window.setInterval(() => show(activeIndex + 1), 5000);
      }
    };
    const stop = () => window.clearInterval(timer);
    container.addEventListener("mouseenter", () => { hovered = true; stop(); });
    container.addEventListener("mouseleave", () => { hovered = false; start(); });
    container.addEventListener("focusin", () => { focused = true; stop(); });
    container.addEventListener("focusout", (event) => {
      if (!container.contains(event.relatedTarget)) { focused = false; start(); }
    });
    start();
  }

  function availableProducts() {
    return config.products.filter((product) => {
      return matchesNeed(product) && matchesSearch(product);
    });
  }

  function matchesNeed(product) {
    const categoryMatch = activeCategory === "Todos" || product.categoria === activeCategory;
    const skinMatch = !activeSkin || (Array.isArray(product.tiposDePele) && product.tiposDePele.some((type) => {
      const normalizedType = type.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      return normalizedType === "todos os tipos de pele" || normalizedType.includes(activeSkin);
    }));
    return categoryMatch && skinMatch;
  }

  function matchesSearch(product) {
    const searchable = `${product.nome || ""} ${product.categoria || ""} ${product.descricao || ""}`
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const query = searchTerm.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return searchable.includes(query);
  }

  function carouselCardsPerPage() {
    if (window.matchMedia("(max-width: 650px)").matches) return 2;
    if (window.matchMedia("(max-width: 900px)").matches) return 3;
    return 4;
  }

  function ui(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function bagIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M6 7h12l1 14H5L6 7Zm3 1V6a3 3 0 0 1 6 0v2M9 12a3 3 0 0 0 6 0');
    path.setAttribute('fill', 'none'); path.setAttribute('stroke', 'currentColor'); path.setAttribute('stroke-width', '1.5');
    path.setAttribute('stroke-linecap', 'round'); path.setAttribute('stroke-linejoin', 'round'); svg.append(path); return svg;
  }

  function discountPercent(product) {
    const original = validPrice(product.precoRegular) ? product.precoRegular : product.preco;
    return validPrice(original) && original > currentPrice(product) ? Math.round((1 - currentPrice(product) / original) * 100) : 0;
  }

  function decorateProductImage(container, product) {
    const discount = discountPercent(product);
    if (discount > 0) container.append(ui('span', 'product-image-badge', `${discount}% OFF`));
    else if (product.selo?.trim()) container.append(ui('span', 'product-image-badge', product.selo.split(' · ')[0]));
    if (product.disponivel === false) container.append(ui('span', 'product-image-badge product-image-badge-stock', 'Indisponível'));
    const uses = ui('div', 'product-use-icons');
    (product.uso || []).forEach(use => {
      const day = /diurno/i.test(use), night = /noturno/i.test(use);
      if (!day && !night) return;
      const icon = ui('span', 'product-use-icon', day ? '☼' : '☾');
      icon.title = day ? 'Uso diurno' : 'Uso noturno'; icon.setAttribute('aria-label', icon.title); uses.append(icon);
    });
    container.append(uses);
  }

  function productPriceBlock(product, className = 'product-pricing', quantity = 1) {
    const block = ui('div', className);
    if (!validPrice(currentPrice(product))) return block;
    const oldPrice = validPrice(product.precoRegular) && product.precoRegular > currentPrice(product) ? product.precoRegular : null;
    const total = price => Math.round(price * 100) * quantity / 100;
    if (oldPrice) block.append(ui('del', 'price-before', money(total(oldPrice))));
    const line = ui('div', 'price-current');
    line.append(ui('strong', '', money(total(currentPrice(product)))), ui('span', 'price-method', 'no Pix'));
    if (validPrice(product.precoPix) && product.precoPix < product.preco) {
      const discount = Math.round((1 - product.precoPix / product.preco) * 100);
      if (discount > 0) line.append(ui('span', 'pix-extra-badge', `+${discount}% OFF`));
    }
    block.append(line, ui('p', 'price-caption', 'Pagamento por Pix'));
    return block;
  }

  function renderRecommendations(target, products, style = 'recommendation') {
    if (!target) return;
    target.replaceChildren(...products.map(product => renderProductCard(product, style)));
    const section = target.closest('[data-recommendations]');
    if (section) section.hidden = products.length === 0;
  }

  function initCommerceForms() {
    $$('form[data-shipping-form]').forEach(form => {
      const input = $('input', form), status = document.getElementById(form.dataset.shippingForm);
      const saved = safeRead('magazine-delivery-postcode', '');
      if (typeof saved === 'string') input.value = saved;
      input.addEventListener('input', () => {
        const value = input.value.replace(/\D/g, '').slice(0, 8);
        input.value = value.length > 5 ? `${value.slice(0, 5)}-${value.slice(5)}` : value;
        status.textContent = '';
      });
      form.addEventListener('submit', event => {
        event.preventDefault();
        const digits = input.value.replace(/\D/g, '');
        if (digits.length !== 8) { status.textContent = 'Informe um CEP com 8 números.'; return; }
        try { localStorage.setItem('magazine-delivery-postcode', JSON.stringify(input.value)); } catch { /* A consulta também funciona sem armazenamento. */ }
        status.textContent = `Frete grátis para o CEP ${input.value}. O prazo será confirmado antes do envio.`;
      });
    });
    const coupon = $('#cartCoupon');
    if (coupon) coupon.addEventListener('submit', event => {
      event.preventDefault();
      $('#couponStatus').textContent = 'Cupom indisponível ou inválido. Nenhum desconto adicional foi aplicado.';
    });
  }

  function renderProductCard(product, style = 'catalog') {
    const card = ui('article', `product-card product-card-${style}`);
    const image = makeProductImage(product, 'product-image');
    decorateProductImage(image, product);
    const imageLink = ui('a'); imageLink.href = `produto.html?id=${encodeURIComponent(product.id)}`;
    imageLink.setAttribute('aria-label', `Ver ${product.nome}`); imageLink.append(image); card.append(imageLink);
    const content = ui('div', 'product-card-content');
    if (typeof product.avaliacao === 'number' && product.avaliacao > 0 && product.avaliacao <= 5) {
      const rating = ui('p', 'product-rating', `${product.avaliacao.toFixed(1)} ★★★★★`);
      rating.setAttribute('aria-label', `Avaliação ${product.avaliacao} de 5`); content.append(rating);
    }
    const name = ui('h3'), detail = ui('a', '', product.nome); detail.href = imageLink.href; name.append(detail); content.append(name);
    content.append(productPriceBlock(product));
    const actions = ui('div', 'product-card-actions');
    const details = ui('a', 'button button-outline', style === 'featured' || style === 'catalog' ? 'Saiba mais' : 'Ver detalhes');
    details.href = imageLink.href; actions.append(details);
    const add = ui('button', 'button button-dark cart-icon-button'); add.type = 'button';
    add.setAttribute('aria-label', canPurchase(product) ? `Adicionar ${product.nome} à sacola` : `${product.nome} indisponível`);
    add.disabled = !canPurchase(product); add.append(bagIcon());
    add.addEventListener('click', () => {
      if (!addToCart(product, 1)) return;
      if (document.body.dataset.page === 'cart') renderCart();
    });
    actions.append(add); content.append(actions); card.append(content); return card;
  }

  function renderCatalog() {
    const grid = $("#productGrid");
    if (!grid) return;
    const products = availableProducts();
    grid.replaceChildren(...products.map((product) => renderProductCard(product)));
    $$(".need-card").forEach((card) => {
      const isActive = card.dataset.filterSkin
        ? card.dataset.filterSkin === activeSkin && activeCategory === "Todos"
        : card.dataset.filterCategory === activeCategory && activeCategory !== "Todos";
      card.classList.toggle("active", isActive);
      if (isActive) card.setAttribute("aria-current", "true");
      else card.removeAttribute("aria-current");
    });
    const status = $("#fullCatalogStatus");
    const empty = $("#catalogEmpty");
    if (status) status.textContent = `${products.length} ${products.length === 1 ? "produto encontrado" : "produtos encontrados"}`;
    if (empty) {
      empty.hidden = config.products.length > 0;
      if (config.products.length > 0 && products.length === 0) {
        empty.hidden = false;
        $("h3", empty).textContent = "Nenhum produto nesta seleção";
        $("p", empty).textContent = "Tente outra categoria ou ajuste sua busca.";
      }
    }
    renderFeaturedProducts();
    renderNewProducts();
  }

  function renderCategoryTabs() {
    const tabs = $("#categoryTabs");
    if (tabs) {
      tabs.replaceChildren();
      FEATURED_COLLECTIONS.forEach((collection) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `category-tab${activeCollection === collection.id ? " active" : ""}`;
        button.textContent = collection.label;
        button.setAttribute("aria-pressed", String(activeCollection === collection.id));
        button.addEventListener("click", () => {
          activeCollection = collection.id;
          renderCategoryTabs();
          renderFeaturedProducts();
        });
        tabs.append(button);
      });
    }

    const catalogTabs = $("#catalogCategoryTabs");
    if (!catalogTabs) return;
    const categories = ["Todos", ...new Set(config.products.map((product) => product.categoria).filter(Boolean))];
    catalogTabs.replaceChildren();
    categories.forEach((category) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `category-tab${activeCategory === category ? " active" : ""}`;
      button.textContent = category;
      button.setAttribute("aria-pressed", String(activeCategory === category));
      button.addEventListener("click", () => {
        activeCategory = category;
        activeSkin = "";
        renderCategoryTabs();
        renderCatalog();
      });
      catalogTabs.append(button);
    });
  }

  function renderFeaturedProducts() {
    const grid = $("#featuredGrid");
    if (!grid) return;
    const collection = FEATURED_COLLECTIONS.find((item) => item.id === activeCollection);
    const preferredOrder = FEATURED_ORDER[activeCollection] || [];
    const products = config.products.filter((product) =>
      collection.matches(product) && matchesNeed(product) && matchesSearch(product)
    ).sort((left, right) => {
      const leftIndex = preferredOrder.indexOf(left.id);
      const rightIndex = preferredOrder.indexOf(right.id);
      if (leftIndex === -1) return rightIndex === -1 ? 0 : 1;
      if (rightIndex === -1) return -1;
      return leftIndex - rightIndex;
    });
    const empty = $("#featuredEmpty");
    if (empty) empty.hidden = products.length > 0;
    grid.replaceChildren(...products.map((product) => renderProductCard(product, "featured")));
    const status = $("#catalogStatus");
    if (status) status.textContent = `${products.length} produtos na coleção ${collection.label}`;
    const dots = $("#featuredDots");
    if (!dots) return;
    const cardsPerPage = carouselCardsPerPage();
    const pages = Math.ceil(products.length / cardsPerPage);
    dots.replaceChildren();
    for (let pageIndex = 0; pageIndex < pages; pageIndex += 1) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = `carousel-dot${pageIndex === 0 ? " active" : ""}`;
      dot.setAttribute("aria-label", `Ir para a página ${pageIndex + 1}`);
      dot.setAttribute("aria-current", String(pageIndex === 0));
      dot.addEventListener("click", () => {
        grid.scrollLeft = Math.min(pageIndex * grid.clientWidth, grid.scrollWidth - grid.clientWidth);
      });
      dots.append(dot);
    }
    $("#featuredPrev").disabled = pages <= 1;
    $("#featuredNext").disabled = pages <= 1;
  }

  function renderNewProducts() {
    const grid = $("#newProductsGrid");
    if (!grid) return;
    const products = config.products.filter((product) =>
      (product.selo?.includes("Lançamento") || FEATURED_ORDER.launches.includes(product.id)) && matchesNeed(product) && matchesSearch(product)
    ).sort((left, right) => {
      const leftIndex = FEATURED_ORDER.launches.indexOf(left.id);
      const rightIndex = FEATURED_ORDER.launches.indexOf(right.id);
      if (leftIndex === -1) return rightIndex === -1 ? 0 : 1;
      if (rightIndex === -1) return -1;
      return leftIndex - rightIndex;
    });
    const section = $("#novidades");
    if (section) section.hidden = products.length === 0;
    grid.replaceChildren(...products.slice(0, 4).map((product) => renderProductCard(product, "new")));
  }

  function initFeaturedCarousel() {
    const grid = $("#featuredGrid");
    if (!grid) return;
    $("#featuredPrev").addEventListener("click", () => {
      grid.scrollLeft = Math.max(0, grid.scrollLeft - grid.clientWidth);
    });
    $("#featuredNext").addEventListener("click", () => {
      grid.scrollLeft = Math.min(grid.scrollLeft + grid.clientWidth, grid.scrollWidth - grid.clientWidth);
    });
    grid.addEventListener("scroll", () => {
      const cardsPerPage = carouselCardsPerPage();
      const pageIndex = Math.round(grid.scrollLeft / grid.clientWidth);
      $$(".carousel-dot", $("#featuredDots")).forEach((dot, index) => {
        const active = index === pageIndex;
        dot.classList.toggle("active", active);
        dot.setAttribute("aria-current", String(active));
      });
    }, { passive: true });
  }

  function addToCart(product, quantity) {
    if (!canPurchase(product)) {
      showToast("Este produto ainda não está disponível para compra.");
      return false;
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      showToast("Informe uma quantidade válida.");
      return false;
    }
    const cart = readCart();
    const existing = cart.find((item) => item.id === product.id);
    const nextQuantity = (existing ? existing.quantity : 0) + quantity;
    if (nextQuantity > purchaseLimit(product)) {
      showToast(`A quantidade disponível para este produto é de até ${purchaseLimit(product)} unidades.`);
      return false;
    }
    if (existing) existing.quantity = nextQuantity;
    else cart.push({ id: product.id, quantity });
    if (!writeCart(cart)) return false;
    showToast(`${product.nome} foi adicionado à sacola.`);
    return true;
  }

  function renderProductGallery(product) {
    const mainImage = $("#productMainImage");
    const mainContainer = $("#productMainImageContainer");
    const thumbnails = $("#productThumbnails");
    const previous = $("#productImagePrev");
    const next = $("#productImageNext");
    const counter = $("#productImageCount");
    const galleryImages = Array.isArray(product.imagens) ? product.imagens : [];
    const images = [...new Set([product.imagem, ...galleryImages]
      .filter((path) => typeof path === "string" && path.trim()))];
    if (!mainImage || !mainContainer || !thumbnails || !previous || !next || !counter || !images.length) {
      $("#productGallery").hidden = true;
      return;
    }
    let selectedIndex = 0;
    const thumbnailButtons = [];
    const dots = $('#productGalleryDots'), dotButtons = [];
    const showImage = (index) => {
      selectedIndex = (index + images.length) % images.length;
      mainImage.src = images[selectedIndex];
      mainImage.alt = `${product.nome} — foto ${selectedIndex + 1} de ${images.length}`;
      counter.textContent = `${selectedIndex + 1} / ${images.length}`;
      thumbnailButtons.forEach((button, buttonIndex) => {
        const isSelected = buttonIndex === selectedIndex;
        button.classList.toggle("active", isSelected);
        button.setAttribute("aria-pressed", String(isSelected));
      });
      dotButtons.forEach((button, index) => { button.classList.toggle('active', index === selectedIndex); button.setAttribute('aria-pressed', String(index === selectedIndex)); });
    };
    images.forEach((path, index) => {
      if (dots) {
        const dot = ui('button', 'product-gallery-dot'); dot.type = 'button';
        dot.setAttribute('aria-label', `Ver foto ${index + 1}`); dot.onclick = () => showImage(index); dots.append(dot); dotButtons.push(dot);
      }
      const button = document.createElement("button");
      button.type = "button";
      button.className = "product-gallery-thumbnail";
      button.setAttribute("aria-label", `Ver foto ${index + 1} de ${images.length} de ${product.nome}`);
      button.setAttribute("aria-pressed", "false");
      const image = document.createElement("img");
      image.src = path;
      image.alt = "";
      image.loading = "lazy";
      image.addEventListener("error", () => {
        button.hidden = true;
        if (index === selectedIndex) {
          const nextIndex = images.findIndex((_, imageIndex) =>
            imageIndex !== index && !thumbnailButtons[imageIndex]?.hidden
          );
          if (nextIndex >= 0) showImage(nextIndex);
          else $("#productGallery").hidden = true;
        }
      }, { once: true });
      button.append(image);
      button.addEventListener("click", () => showImage(index));
      thumbnailButtons.push(button);
      thumbnails.append(button);
    });
    previous.addEventListener("click", () => showImage(selectedIndex - 1));
    next.addEventListener("click", () => showImage(selectedIndex + 1));
    if (images.length < 2) {
      previous.hidden = true;
      next.hidden = true;
      counter.hidden = true;
      thumbnails.hidden = true;
      if (dots) dots.hidden = true;
    }
    mainImage.addEventListener("error", () => {
      const nextIndex = images.findIndex((_, imageIndex) =>
        imageIndex !== selectedIndex && !thumbnailButtons[imageIndex]?.hidden
      );
      if (nextIndex >= 0) showImage(nextIndex);
      else $("#productGallery").hidden = true;
    });
    mainContainer.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") previous.click();
      if (event.key === "ArrowRight") next.click();
    });
    showImage(0);
  }

  function renderProductPage() {
    const detail = $('#productDetail'); if (!detail) return;
    const id = new URLSearchParams(location.search).get('id'), product = productById(id);
    if (!product) { $('#productNotFound').hidden = false; document.title = `Produto não encontrado | ${config.brand.name}`; return; }
    $('#breadcrumbName').textContent = product.nome;
    $('#breadcrumbCategory').textContent = product.categoria || 'Produtos';
    $('#productCategory').textContent = product.categoria || '';
    $('#productName').textContent = product.nome;
    $('#productDescription').textContent = product.descricao || '';
    const active = product.especificacoes?.['Principais ativos'];
    $('#productSummary').textContent = active ? `Ativos: ${active.replace(/\s*\n+\s*/g, ' + ')}` : (product.descricao || '').replace(/^O que é\?\s*/i, '').split(/\n\s*\n/)[0].slice(0, 240);
    const benefits = (product.especificacoes?.['Principais benefícios'] || '').split(/[\n;]+/).map(value => value.replace(/^[•\-\s]+/, '').trim()).filter(Boolean).slice(0, 6);
    $('#productBenefits').replaceChildren(...benefits.map(text => ui('li', '', text)));
    $('#benefitsBlock').hidden = benefits.length === 0;
    const rating = $('#productRating');
    if (typeof product.avaliacao === 'number' && product.avaliacao > 0 && product.avaliacao <= 5) { rating.textContent = `${product.avaliacao.toFixed(1)} ★★★★★`; rating.hidden = false; }
    renderProductGallery(product);
    decorateProductImage($('#productMainImageContainer'), product);
    $('#productPrices').replaceChildren(productPriceBlock(product));
    const facts = $('#productFacts'); facts.replaceChildren();
    Object.entries(product.especificacoes || {}).forEach(([label, value]) => { if (typeof value === 'string' && value.trim()) facts.append(ui('dt', '', label), ui('dd', '', value)); });
    const quantity = $('#productQuantity'), add = $('#addProduct');
    quantity.max = String(Math.max(1, purchaseLimit(product)));
    $('#productPrices').setAttribute('aria-live', 'polite');
    const syncQuantity = () => {
      const requested = Number(quantity.value);
      $('#quantityMinus').disabled = requested <= 1;
      $('#quantityPlus').disabled = requested >= purchaseLimit(product) || !canPurchase(product);
      if (Number.isInteger(requested) && requested >= 1 && requested <= purchaseLimit(product)) {
        $('#productPrices').replaceChildren(productPriceBlock(product, 'product-pricing', requested));
      }
    };
    $('#quantityMinus').onclick = () => { if (Number(quantity.value) > 1) quantity.stepDown(); syncQuantity(); };
    $('#quantityPlus').onclick = () => { if (Number(quantity.value) < purchaseLimit(product)) quantity.stepUp(); syncQuantity(); };
    quantity.addEventListener('input', syncQuantity); syncQuantity();
    add.disabled = !canPurchase(product); add.replaceChildren(ui('span', '', canPurchase(product) ? 'Comprar' : 'Indisponível'), bagIcon());
    add.addEventListener('click', () => {
      const requested = Number(quantity.value);
      if (!Number.isInteger(requested) || requested < 1 || requested > purchaseLimit(product)) { $('#productStatus').textContent = `Informe uma quantidade entre 1 e ${purchaseLimit(product)}.`; return; }
      if (addToCart(product, requested)) location.assign('carrinho.html');
      else $('#productStatus').textContent = 'Confira a quantidade já adicionada à sua sacola.';
    });
    const candidates = config.products.filter(p => p.id !== id && canPurchase(p));
    candidates.sort((a, b) => Number(b.categoria === product.categoria) - Number(a.categoria === product.categoria));
    renderRecommendations($('#relatedProducts'), candidates.slice(0, 4));
    try { localStorage.setItem('magazine-recent-products', JSON.stringify([id, ...safeRead('magazine-recent-products', []).filter(value => value !== id)].slice(0, 12))); } catch { /* A página não depende do histórico. */ }
    document.title = `${product.nome} | ${config.brand.name}`; detail.hidden = false;
    $('#productInformation').hidden = false;
  }

  function renderCart() {
    const container = $('#cartItems'); if (!container) return;
    const cart = readCart(), hasItems = cart.length > 0;
    $('#cartEmpty').hidden = hasItems; $('.cart-layout').hidden = !hasItems; container.replaceChildren();
    let subtotal = 0, beforeDiscount = 0;
    cart.forEach(item => {
      const product = productById(item.id), row = ui('article', 'cart-item');
      if (!product) {
        row.classList.add('cart-item-unavailable'); row.append(ui('p', '', 'Este produto não está mais no catálogo.'));
        const remove = ui('button', 'remove-item', 'Remover da sacola'); remove.type = 'button'; remove.onclick = () => removeFromCart(item.id); row.append(remove); container.append(row); return;
      }
      const info = ui('div', 'cart-item-info'), imageLink = ui('a'); imageLink.href = `produto.html?id=${encodeURIComponent(product.id)}`;
      imageLink.setAttribute('aria-label', product.nome); imageLink.append(makeProductImage(product, 'cart-image'));
      const name = ui('h2'), link = ui('a', '', product.nome); link.href = imageLink.href; name.append(link); info.append(imageLink, name);
      if (!canPurchase(product) || item.quantity > purchaseLimit(product)) info.append(ui('p', 'cart-stock-note', 'Revise a disponibilidade deste produto.'));
      const unit = ui('div', 'cart-item-unit'); unit.dataset.label = 'Preço';
      if (validPrice(product.precoRegular) && product.precoRegular > currentPrice(product)) unit.append(ui('del', '', money(product.precoRegular)));
      unit.append(ui('strong', '', money(currentPrice(product))), ui('small', '', 'no Pix'));
      const controls = ui('div', 'cart-quantity'); controls.setAttribute('aria-label', `Quantidade de ${product.nome}`);
      const minus = ui('button', '', '−'), plus = ui('button', '', '+'); minus.type = plus.type = 'button';
      minus.setAttribute('aria-label', `Diminuir quantidade de ${product.nome}`); plus.setAttribute('aria-label', `Aumentar quantidade de ${product.nome}`);
      minus.disabled = item.quantity <= 1; plus.disabled = !canPurchase(product) || item.quantity >= purchaseLimit(product);
      minus.onclick = () => changeQuantity(item.id, item.quantity - 1); plus.onclick = () => changeQuantity(item.id, item.quantity + 1);
      controls.append(minus, ui('span', '', String(item.quantity).padStart(2, '0')), plus);
      const total = ui('div', 'cart-item-total'); total.dataset.label = 'Total'; total.append(ui('strong', '', money(currentPrice(product) * item.quantity)), ui('small', '', 'no Pix'));
      const remove = ui('button', 'remove-item', '×'); remove.type = 'button'; remove.setAttribute('aria-label', `Remover ${product.nome}`); remove.onclick = () => removeFromCart(item.id);
      row.append(info, unit, controls, total, remove); container.append(row);
      if (validPrice(currentPrice(product))) {
        subtotal += Math.round(currentPrice(product) * 100) * item.quantity;
        const regular = validPrice(product.precoRegular) && product.precoRegular > currentPrice(product) ? product.precoRegular : currentPrice(product);
        beforeDiscount += Math.round(regular * 100) * item.quantity;
      }
    });
    $('#cartSubtotal').textContent = money(subtotal / 100);
    $('#cartItemsTotal').textContent = money(beforeDiscount / 100);
    $('#cartDiscountTotal').textContent = beforeDiscount > subtotal ? `− ${money((beforeDiscount - subtotal) / 100)}` : money(0);
    const validCart = hasItems && cart.every(item => { const p = productById(item.id); return p && canPurchase(p) && item.quantity <= purchaseLimit(p); });
    const next = $('#checkoutLink'); next.setAttribute('aria-disabled', String(!validCart));
    next.textContent = validCart ? 'Avançar' : 'Revise sua sacola';
    if (validCart) next.href = 'checkout.html'; else next.removeAttribute('href');
    const ids = new Set(cart.map(item => item.id)), candidates = config.products.filter(p => !ids.has(p.id) && canPurchase(p));
    renderRecommendations($('#cartRecommendations'), candidates.slice(0, 4), 'cross-sell');
    const savedRecent = safeRead('magazine-recent-products', []);
    const recent = Array.isArray(savedRecent) ? savedRecent : [];
    const extra = [...recent.map(productById).filter(p => p && !ids.has(p.id) && canPurchase(p)), ...candidates.slice(4)];
    const unique = [...new Map(extra.map(p => [p.id, p])).values()];
    renderRecommendations($('#cartReminders'), unique.slice(0, 4), 'cross-sell');
  }

  function changeQuantity(id, quantity) {
    const product = productById(id);
    const cart = readCart();
    const item = cart.find((entry) => entry.id === id);
    if (!product || !item) return;
    if (!Number.isInteger(quantity) || quantity < 1 || (quantity > purchaseLimit(product) && quantity >= item.quantity)) {
      showToast(`A quantidade deve ficar entre 1 e ${purchaseLimit(product)}.`);
      return;
    }
    item.quantity = quantity;
    if (writeCart(cart)) renderCart();
  }

  function removeFromCart(id) {
    if (writeCart(readCart().filter((item) => item.id !== id))) renderCart();
  }

  function renderCheckout() {
    const container = $("#checkoutItems");
    if (!container) return;
    const availability = $("#paymentAvailability");
    const button = $("#reserveOrder");
    window.PaymentService.getStatus().then((status) => {
      availability.textContent = status.message;
      button.disabled = !status.available || !catalogVerified;
      button.textContent = status.method === "gateway" ? "Gerar Pix BlackCat" : "Gerar Pix";
    });
    const cart = readCart();
    const validItems = cart.map((item) => ({ ...item, product: productById(item.id) }))
      .filter((item) => item.product && canPurchase(item.product) && item.quantity <= purchaseLimit(item.product));
    const hasItems = validItems.length > 0 && validItems.length === cart.length;
    $("#checkoutLayout").hidden = !hasItems;
    $("#checkoutEmpty").hidden = hasItems;
    if (!hasItems) return;
    let subtotal = 0;
    container.replaceChildren();
    validItems.forEach(({ product, quantity }) => {
      const line = document.createElement("p");
      line.className = "checkout-item-line";
      line.textContent = `${product.nome} × ${quantity} — ${money(currentPrice(product) * quantity)}`;
      subtotal += currentPrice(product) * quantity;
      container.append(line);
    });
    $("#checkoutSubtotal").textContent = money(subtotal);
    if (!connection.apiEnabled) {
      const form = $("#checkoutForm");
      form.hidden = true;
      const message = document.createElement('section');
      message.className = 'checkout-form checkout-unavailable';
      const title = document.createElement('h2');
      title.textContent = 'Sua seleção está salva';
      const description = document.createElement('p');
      description.textContent = 'A finalização de compras ainda não está disponível. Você pode continuar explorando os produtos e guardar seus favoritos na sacola.';
      const back = document.createElement('a');
      back.className = 'button button-outline'; back.href = 'carrinho.html'; back.textContent = 'Voltar à sacola';
      message.append(title, description, back); form.before(message);
      return;
    }
    $("#checkoutForm").addEventListener("submit", submitPayment);
    $("#customerCpf").addEventListener("input", (event) => {
      const digits = event.target.value.replace(/\D/g, "").slice(0, 11);
      event.target.value = digits.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    });
    $("#copyPix").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText($("#pixCopyPaste").value); $("#copyPix").textContent = "Código copiado"; }
      catch { $("#pixCopyPaste").select(); document.execCommand("copy"); }
    });
    initCepLookup();
  }

  function initCepLookup() {
    const input = $("#shippingZipCode");
    const status = $("#cepLookupStatus");
    if (!input || !status) return;
    const formatCep = (value) => {
      const digits = value.replace(/\D/g, "").slice(0, 8);
      return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    };
    input.addEventListener("input", () => {
      const cursorAtEnd = input.selectionStart === input.value.length;
      input.value = formatCep(input.value);
      if (cursorAtEnd) input.setSelectionRange(input.value.length, input.value.length);
      status.textContent = "Digite o CEP para preencher rua, bairro, cidade e estado.";
      status.classList.remove("field-help-error", "field-help-success");
    });
    input.addEventListener("blur", async () => {
      const cep = input.value.replace(/\D/g, "");
      if (cep.length !== 8) {
        status.textContent = "Informe um CEP com 8 números.";
        status.classList.add("field-help-error");
        return;
      }
      status.textContent = "Consultando CEP…";
      status.classList.remove("field-help-error", "field-help-success");
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: controller.signal });
        if (!response.ok) throw new Error("Consulta indisponível");
        const result = await response.json();
        if (!Array.isArray(result.products)) throw new Error('Catálogo inválido');
        if (result.erro) {
          status.textContent = "CEP não encontrado. Confira o número ou preencha o endereço manualmente.";
          status.classList.add("field-help-error");
          return;
        }
        $("#shippingAddress").value = result.logradouro || "";
        $("#shippingNeighborhood").value = result.bairro || "";
        $("#shippingCity").value = result.localidade || "";
        $("#shippingState").value = result.uf || "";
        status.textContent = "Endereço encontrado. Confira os dados e informe o número.";
        status.classList.add("field-help-success");
      } catch {
        status.textContent = "Não foi possível consultar agora. Você pode preencher o endereço manualmente.";
        status.classList.add("field-help-error");
      } finally {
        window.clearTimeout(timeout);
      }
    });
  }

  async function submitPayment(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const button = $("#reserveOrder");
    const error = $("#checkoutError");
    const cart = readCart();
    const items = cart.map((item) => ({ id: item.id, quantity: item.quantity }));
    if (!items.length || items.some((item) => !productById(item.id))) {
      error.textContent = "Um produto não está mais disponível. Revise sua sacola.";
      return;
    }
    const data = Object.fromEntries(new FormData(form).entries());
    const customer = { name: data.name, email: data.email, phone: data.phone, document: { number: data.cpf, type: "cpf" } };
    const shipping = { street: data.address, number: data.number, complement: data.complement, neighborhood: data.neighborhood, city: data.city, state: data.state, zipCode: data.zipCode };
    button.disabled = true;
    button.textContent = "Gerando Pix seguro...";
    error.textContent = "";
    try {
      const expectedAmount = cart.reduce((sum, item) => sum + Math.round(currentPrice(productById(item.id)) * 100) * item.quantity, 0);
      const result = await window.PaymentService.createCharge({ customer, shipping, items, expectedAmount });
      const payment = result.data;
      if (!result.success || !payment?.transactionId) throw new Error("A BlackCat não retornou os dados do pagamento.");
      $("#confirmationReference").textContent = `Referência do pagamento: ${payment.transactionId}`;
      $("#pixCopyPaste").value = payment.paymentData?.copyPaste || payment.paymentData?.qrCode || "";
      const qr = payment.paymentData?.qrCodeBase64;
      if (typeof qr === "string" && /^data:image\//i.test(qr)) {
        $("#pixQrImage").src = qr;
        $("#pixQrImage").hidden = false;
      }
      if (typeof payment.invoiceUrl === "string" && /^https:\/\/[^/]*blackcat[^/]*\//i.test(payment.invoiceUrl)) {
        $("#pixInvoice").href = payment.invoiceUrl;
        $("#pixInvoice").hidden = false;
      }
      if (payment.paymentData?.expiresAt) $("#pixExpiry").textContent = `Válido até ${new Date(payment.paymentData.expiresAt).toLocaleString("pt-BR")}`;
      $("#pixPayment").hidden = false;
      $("#checkoutLayout").hidden = true;
      if (payment.paymentMethod === "manual_pix") {
        $("#pixTitle").textContent = "Pix gerado";
        $("#pixStatus").textContent = "Depois de pagar, a loja confirmará o crédito manualmente.";
      } else {
        $("#pixTitle").textContent = "Finalize seu pagamento";
        pollPayment(payment.transactionId);
      }
    } catch (submitError) {
      error.textContent = submitError.message;
    } finally {
      button.disabled = false;
      button.textContent = $("#paymentProviderTitle").textContent.includes("BlackCat") ? "Gerar Pix BlackCat" : "Gerar Pix";
    }
  }

  async function pollPayment(transactionId) {
    const refresh = async () => {
      try {
        const result = await window.PaymentService.getPaymentStatus(transactionId);
        const state = result.data.status;
        if (state === "PAID") {
          $("#pixStatus").textContent = "Pagamento confirmado pela BlackCat.";
          $("#pixTitle").textContent = "Pagamento aprovado";
          localStorage.removeItem(CART_KEY);
          updateCartCount();
          return;
        }
        if (state === "CANCELLED" || state === "REFUNDED") {
          $("#pixStatus").textContent = state === "REFUNDED" ? "Este pagamento foi estornado." : "Este pagamento foi cancelado ou expirou.";
          $("#pixTitle").textContent = "Pagamento não concluído";
          return;
        }
        $("#pixStatus").textContent = "Aguardando confirmação do Pix...";
      } catch {
        $("#pixStatus").textContent = "Não foi possível atualizar agora. O pagamento ainda pode ser consultado.";
      }
      window.setTimeout(refresh, 10000);
    };
    window.setTimeout(refresh, 10000);
  }
  function initVisitorAnalytics() {
    if (!connection.apiEnabled || window.location.protocol === "file:") return;
    const key = "mineironet_creamystore_session";
    let sessionId = sessionStorage.getItem(key);
    if (!sessionId) {
      sessionId = window.crypto?.randomUUID?.() || `visit-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      sessionStorage.setItem(key, sessionId);
    }
    const send = (source) => fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ source, sessionId, path: window.location.pathname + window.location.search, page: document.title, referrer: document.referrer })
    }).catch(() => {});
    send("view");
    window.setInterval(() => {
      if (document.visibilityState === "visible") send("heartbeat");
    }, 30000);
  }

  function initHeader() {
    const announcement = $("#announcement");
    if (announcement && typeof config.brand.announcement === "string" && config.brand.announcement.trim()) {
      announcement.textContent = config.brand.announcement;
    } else if (announcement) {
      announcement.hidden = true;
    }
    if ($("#heroImagePath")) $("#heroImagePath").textContent = config.images.heroDesktop;
    if ($("#storeEmail") && config.brand.contactEmail) {
      const link = document.createElement("a");
      link.href = `mailto:${config.brand.contactEmail}`;
      link.textContent = config.brand.contactEmail;
      $("#storeEmail").replaceChildren(link);
    }
    if ($("#storeContact") && config.brand.contactText) $("#storeContact").textContent = config.brand.contactText;
    const toggle = $(".menu-toggle");
    if (toggle) {
      toggle.addEventListener("click", () => {
        const expanded = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!expanded));
        $("#mainNav").classList.toggle("nav-open", !expanded);
        toggle.setAttribute("aria-label", expanded ? "Abrir menu" : "Fechar menu");
      });
      $$("#mainNav a").forEach((link) => link.addEventListener("click", () => {
        toggle.setAttribute("aria-expanded", "false");
        $("#mainNav").classList.remove("nav-open");
      }));
    }
    const searchForm = $("#searchForm");
    if (searchForm) {
      searchForm.addEventListener("submit", (event) => {
        event.preventDefault();
        searchTerm = $("#searchInput").value.trim();
        renderCatalog();
        $("#catalogo-completo").scrollIntoView({ behavior: "smooth" });
      });
    }
    $$(".need-card").forEach((card) => card.addEventListener("click", () => {
      activeCategory = card.dataset.filterCategory || "Todos";
      activeSkin = card.dataset.filterSkin || "";
      searchTerm = "";
      renderCategoryTabs();
      renderCatalog();
    }));
    $("#currentYear") && ($("#currentYear").textContent = String(new Date().getFullYear()));
  }

  function renderBranding() {
    const titles = { home: 'Produtos Creamy', cart: 'Sua sacola', checkout: 'Finalizar pedido', product: 'Produto' };
    document.title = `${titles[document.body.dataset.page] || 'Loja'} | ${config.brand.name}`;
    $$(".brand-name").forEach((element) => {
      element.firstChild.textContent = config.brand.name;
      const tagline = $("small", element);
      if (tagline) tagline.textContent = config.brand.tagline;
    });
    if (config.brand.logo) {
      $$(".brand-mark").forEach((mark) => {
        const image = document.createElement("img");
        image.src = config.brand.logo;
        image.alt = config.brand.name;
        image.addEventListener("load", () => {
          mark.replaceChildren(image);
          mark.classList.add("has-logo");
        }, { once: true });
      });
    }
  }

  async function initializeStore() {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      if (!connection.apiEnabled) {
        if (!Array.isArray(config.products) || !config.products.length) throw new Error('Catálogo estático indisponível');
        catalogVerified = true;
      } else {
        const response = await fetch("/api/catalog", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error('Catálogo indisponível');
        const result = await response.json();
        if (Array.isArray(result.products)) {
          config.products = result.products.map(product => {
            if (!connection.apiOrigin) return product;
            const imageUrl = path => typeof path === 'string' && path.startsWith('public/images/uploads/') ? `${connection.apiOrigin}/${path}` : path;
            return { ...product, imagem: imageUrl(product.imagem), imagens: (product.imagens || []).map(imageUrl) };
          });
          catalogVerified = true;
          config.categories = [...new Set(result.products.map(product => product.categoria).filter(Boolean))];
        }
        if (result.brand && typeof result.brand.nome === "string") config.brand.name = result.brand.nome;
      }
    } catch (error) {
      const notice = document.createElement('div');
      notice.className = 'store-notice';
      notice.setAttribute('role', 'alert');
      notice.append('Não foi possível atualizar os preços e a disponibilidade. ');
      const retry = document.createElement('button');
      retry.type = 'button'; retry.textContent = 'Tentar novamente'; retry.onclick = () => window.location.reload();
      notice.append(retry); document.body.prepend(notice);
    } finally { window.clearTimeout(timeout); }
    initHeader();
    renderBranding();
    initConfiguredImages();
    initFeaturedCarousel();
    updateCartCount();
    renderCategoryTabs();
    renderCatalog();
    renderProductPage();
    renderCart();
    renderCheckout();
    initCommerceForms();
    initVisitorAnalytics();
  }
  initializeStore();
})();
