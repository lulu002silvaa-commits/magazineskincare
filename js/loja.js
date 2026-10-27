(function () {
  "use strict";

  const CART_KEY = "calma-pele-carrinho";
  const MAX_CART_QUANTITY = 20;
  const FEATURED_ORDER = {
    favorites: ["intense-tx", "kit-anti-manchas-1", "intensetx-vitaminacgold", "intensetx-ceramideskinrepair"],
    launches: ["intensetx-acidotranexamico", "intensetx-vitaminacgold", "intensetx-ceramideskinrepair", "intensetx-peptide"]
  };
  const FEATURED_COLLECTIONS = [
    { id: "favorites", label: "Mais vendidos", matches: (product) => product.selo?.includes("Favoritos da Jade") || FEATURED_ORDER.favorites.includes(product.id) },
    { id: "duos", label: "Duos", matches: (product) => /^duo\b/i.test(product.nome || "") },
    { id: "routines", label: "Rotinas completas", matches: (product) => /^(kit|combo)\b/i.test(product.nome || "") || product.categoria === "Combos" },
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

  function renderProductCard(product, style = "catalog") {
    const card = document.createElement("article");
    card.className = `product-card product-card-${style}`;
    const image = makeProductImage(product, "product-image");
    if (typeof product.selo === "string" && product.selo.trim()) {
      const badge = document.createElement("span");
      badge.className = "product-image-badge";
      badge.textContent = product.selo.split(" · ")[0];
      image.append(badge);
    }
    if (product.disponivel === false) {
      const unavailableBadge = document.createElement("span");
      unavailableBadge.className = "product-image-badge product-image-badge-stock";
      unavailableBadge.textContent = "Esgotado";
      image.append(unavailableBadge);
    }
    const imageLink = document.createElement("a");
    imageLink.href = `produto.html?id=${encodeURIComponent(product.id)}`;
    imageLink.setAttribute("aria-label", `Ver ${product.nome}`);
    imageLink.append(image);
    card.append(imageLink);

    const content = document.createElement("div");
    content.className = "product-card-content";
    if (style === "catalog") {
      const category = document.createElement("p");
      category.className = "product-category";
      category.textContent = product.categoria || "";
      content.append(category);
    }
    if (validPrice(product.avaliacao)) {
      const rating = document.createElement("p");
      const wholeStars = Math.round(product.avaliacao);
      rating.className = "product-rating";
      rating.setAttribute("aria-label", `Avaliação ${product.avaliacao} de 5`);
      rating.textContent = `${product.avaliacao.toFixed(1)}  ${"★".repeat(wholeStars)}${"☆".repeat(5 - wholeStars)}`;
      content.append(rating);
    }
    const name = document.createElement("h3");
    const detailLink = document.createElement("a");
    detailLink.href = `produto.html?id=${encodeURIComponent(product.id)}`;
    detailLink.textContent = product.nome;
    name.append(detailLink);
    content.append(name);

    if (validPrice(currentPrice(product))) {
      const price = document.createElement("p");
      price.className = "product-price";
      if (validPrice(product.precoRegular)) {
        const original = document.createElement("del");
        original.textContent = money(product.precoRegular);
        price.append(original);
      }
      const current = document.createElement("strong");
      current.textContent = money(currentPrice(product));
      price.append(current);
      if (validPrice(product.precoRegular)) {
        const discount = Math.round((1 - currentPrice(product) / product.precoRegular) * 100);
        if (discount > 0) {
          const savings = document.createElement("span");
          savings.className = "product-pix-discount";
          savings.textContent = `-${discount}%`;
          price.append(savings);
        }
      }
      content.append(price);
    }
    const actions = document.createElement("div");
    actions.className = "product-card-actions";
    const detailsButton = document.createElement("a");
    detailsButton.className = style === "new" ? "button button-outline button-full" : "button button-outline";
    detailsButton.href = detailLink.href;
    detailsButton.textContent = style === "featured" ? "Saiba mais" : "Ver detalhes";
    actions.append(detailsButton);
    if (style !== "new") {
      const addButton = document.createElement("button");
      addButton.type = "button";
      addButton.className = style === "featured" ? "button button-dark cart-icon-button" : "button button-dark";
      addButton.setAttribute("aria-label", canPurchase(product) ? `Adicionar ${product.nome} à sacola` : `${product.nome} indisponível`);
      addButton.disabled = !canPurchase(product);
      if (style === "featured") {
        const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        icon.setAttribute("viewBox", "0 0 24 24");
        icon.setAttribute("aria-hidden", "true");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M6 8h12l1 12H5L6 8Zm3 0a3 3 0 0 1 6 0");
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "currentColor");
        path.setAttribute("stroke-width", "1.8");
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("stroke-linejoin", "round");
        icon.append(path);
        addButton.append(icon);
      } else {
        addButton.textContent = canPurchase(product) ? "Adicionar à sacola" : "Indisponível";
      }
      if (canPurchase(product)) {
        addButton.addEventListener("click", () => addToCart(product, 1));
      }
      actions.append(addButton);
    }
    content.append(actions);
    card.append(content);
    return card;
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
    };
    images.forEach((path, index) => {
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
    const detail = $("#productDetail");
    if (!detail) return;
    const id = new URLSearchParams(window.location.search).get("id");
    const product = config.products.find((item) => item.id === id);
    if (!product) {
      $("#productNotFound").hidden = false;
      return;
    }
    $("#breadcrumbName").textContent = product.nome;
    $("#productCategory").textContent = product.categoria || "";
    $("#productName").textContent = product.nome;
    const description = displayDescription(product.descricao);
    $("#productDescription").textContent = description;
    $("#productDescription").hidden = !description;
    renderProductGallery(product);
    const priceBox = $("#productPrices");
    if (validPrice(currentPrice(product))) {
      if (validPrice(product.precoRegular)) {
        const original = document.createElement("del");
        original.textContent = money(product.precoRegular);
        priceBox.append(original);
      }
      const price = document.createElement("strong");
      price.textContent = money(currentPrice(product));
      priceBox.append(price);
    }
    const facts = $("#productFacts");
    if (product.especificacoes && typeof product.especificacoes === "object") {
      Object.entries(product.especificacoes).forEach(([label, value]) => {
        if (typeof value !== "string" || !value.trim()) return;
        const term = document.createElement("dt");
        const description = document.createElement("dd");
        term.textContent = label;
        description.textContent = value;
        facts.append(term, description);
      });
    }
    const quantity = $("#productQuantity");
    quantity.max = String(Math.max(1, purchaseLimit(product)));
    const addButton = $("#addProduct");
    addButton.disabled = !canPurchase(product);
    addButton.textContent = canPurchase(product) ? "Adicionar à sacola" : "Indisponível";
    addButton.addEventListener("click", () => {
      const requested = Number(quantity.value);
      if (!Number.isInteger(requested) || requested < 1 || requested > purchaseLimit(product)) {
        $("#productStatus").textContent = `Informe uma quantidade entre 1 e ${purchaseLimit(product)}.`;
        return;
      }
      const added = addToCart(product, requested);
      $("#productStatus").textContent = added
        ? "Confira sua sacola para continuar."
        : `Não foi possível adicionar o produto. O limite por item é ${MAX_CART_QUANTITY} unidades.`;
    });
    document.title = `${product.nome} — ${config.brand.name}`;
    detail.hidden = false;
  }

  function renderCart() {
    const container = $("#cartItems");
    if (!container) return;
    const cart = readCart();
    const hasItems = cart.length > 0;
    $("#cartEmpty").hidden = hasItems;
    $(".cart-layout").hidden = !hasItems;
    if (!hasItems) return;
    container.replaceChildren();
    let subtotal = 0;
    cart.forEach((item) => {
      const product = productById(item.id);
      const row = document.createElement("article");
      row.className = "cart-item";
      if (!product) {
        const unavailable = document.createElement("p");
        unavailable.textContent = "Este produto não está mais no catálogo.";
        row.append(unavailable);
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "remove-item";
        remove.textContent = "Remover da sacola";
        remove.addEventListener("click", () => removeFromCart(item.id));
        row.append(remove);
      } else {
        row.append(makeProductImage(product, "cart-image"));
        const info = document.createElement("div");
        info.className = "cart-item-info";
        const name = document.createElement("h2");
        name.textContent = product.nome;
        const price = document.createElement("p");
        price.textContent = validPrice(currentPrice(product)) ? money(currentPrice(product)) : "Preço ainda não cadastrado";
        info.append(name, price);
        const controls = document.createElement("div");
        controls.className = "cart-quantity";
        const minus = document.createElement("button");
        minus.type = "button";
        minus.setAttribute("aria-label", `Diminuir quantidade de ${product.nome}`);
        minus.textContent = "−";
        const count = document.createElement("span");
        count.textContent = String(item.quantity);
        const plus = document.createElement("button");
        plus.type = "button";
        plus.setAttribute("aria-label", `Aumentar quantidade de ${product.nome}`);
        plus.textContent = "+";
        minus.disabled = item.quantity <= 1;
        plus.disabled = !canPurchase(product) || item.quantity >= purchaseLimit(product);
        minus.addEventListener("click", () => changeQuantity(item.id, item.quantity - 1));
        plus.addEventListener("click", () => changeQuantity(item.id, item.quantity + 1));
        controls.append(minus, count, plus);
        info.append(controls);
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "remove-item";
        remove.textContent = "Remover";
        remove.addEventListener("click", () => removeFromCart(item.id));
        info.append(remove);
        row.append(info);
        if (validPrice(currentPrice(product))) subtotal += currentPrice(product) * item.quantity;
      }
      container.append(row);
    });
    $("#cartSubtotal").textContent = money(subtotal);
    const validCart = cart.every(item => {
      const product = productById(item.id);
      return product && canPurchase(product) && item.quantity <= purchaseLimit(product);
    });
    const checkoutLink = $("#checkoutLink");
    checkoutLink.setAttribute("aria-disabled", String(!validCart));
    if (!validCart) { checkoutLink.removeAttribute("href"); checkoutLink.textContent = "Revise os itens indisponíveis"; }
    else { checkoutLink.href = "checkout.html"; checkoutLink.textContent = "Continuar para finalizar"; }
  }

  function changeQuantity(id, quantity) {
    const product = productById(id);
    const cart = readCart();
    const item = cart.find((entry) => entry.id === id);
    if (!product || !item) return;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > purchaseLimit(product)) {
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
    if (window.location.protocol === "file:") return;
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
      const response = await fetch("/api/catalog", { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error('Catálogo indisponível');
      if (response.ok) {
        const result = await response.json();
        if (Array.isArray(result.products)) {
          config.products = result.products;
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
    initVisitorAnalytics();
  }
  initializeStore();
})();
