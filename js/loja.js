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
    image.decoding = "async";
    image.width = 480; image.height = 480;
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
    const picture = $('picture', container) || document.createElement('picture'), source = $('source', picture) || document.createElement('source');
    source.media = '(max-width: 650px)'; source.srcset = slides[0].mobileSrc || slides[0].src;
    if (!source.parentNode) picture.append(source);
    const image = $('.hero-slide-image', picture) || document.createElement("img");
    image.className = "hero-slide-image";
    image.alt = slides[0].alt || "Campanha da loja";
    image.src = slides[0].src;
    image.fetchPriority = "high";
    image.decoding = 'async';
    const showLoadedBanner = () => {
      container.classList.add("has-image");
      $$(".placeholder-leaf, .placeholder-label, .placeholder-filename", container)
        .forEach((placeholder) => { placeholder.hidden = true; });
    };
    image.addEventListener('load', showLoadedBanner, { once: true });
    if (image.complete && image.naturalWidth > 0) showLoadedBanner();
    if (!image.parentNode) picture.append(image);
    if (!picture.parentNode) container.append(picture);
    const controls = $('.hero-slider-controls', container); container.after(controls);
    const pause = ui('button', 'hero-slider-pause', 'Ⅱ'); pause.type = 'button'; pause.setAttribute('aria-label', 'Pausar banners'); pause.setAttribute('aria-pressed', 'false'); controls.append(pause);
    const campaignLink = document.createElement("a");
    campaignLink.className = "hero-slide-link";
    campaignLink.href = slides[0].href || "#produtos";
    campaignLink.setAttribute("aria-label", `Ver campanha: ${slides[0].alt || "produtos em destaque"}`);
    container.append(campaignLink);
    const dots = $(".hero-slider-dots", controls);
    let activeIndex = 0;
    let timer;
    let hovered = false;
    let focused = false;
    let paused = false;
    const show = (index) => {
      activeIndex = (index + slides.length) % slides.length;
      source.srcset = slides[activeIndex].mobileSrc || slides[activeIndex].src;
      image.src = slides[activeIndex].src;
      container.dataset.activeSlide = String(activeIndex);
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
    $("[data-hero-prev]", controls).addEventListener("click", () => show(activeIndex - 1));
    $("[data-hero-next]", controls).addEventListener("click", () => show(activeIndex + 1));
    const start = () => {
      stop();
      if (!hovered && !focused && !paused && !document.hidden && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        timer = window.setInterval(() => show(activeIndex + 1), 6000);
      }
    };
    const stop = () => window.clearInterval(timer);
    pause.onclick = () => { paused = !paused; pause.textContent = paused ? '▶' : 'Ⅱ'; pause.setAttribute('aria-pressed', String(paused)); pause.setAttribute('aria-label', paused ? 'Reproduzir banners' : 'Pausar banners'); start(); };
    let touch;
    container.addEventListener('touchstart', event => { touch = event.touches[0]; stop(); }, { passive: true });
    container.addEventListener('touchend', event => {
      const end = event.changedTouches[0];
      if (touch && Math.abs(end.clientX - touch.clientX) > 50 && Math.abs(end.clientX - touch.clientX) > Math.abs(end.clientY - touch.clientY)) { if (event.cancelable) event.preventDefault(); show(activeIndex + (end.clientX < touch.clientX ? 1 : -1)); }
      touch = null; start();
    }, { passive: false });
    container.addEventListener('touchcancel', () => { touch = null; start(); }, { passive: true });
    controls.addEventListener('focusin', () => { focused = true; stop(); });
    controls.addEventListener('focusout', event => { if (!controls.contains(event.relatedTarget)) { focused = false; start(); } });
    image.addEventListener('load', () => { const next = slides[(activeIndex + 1) % slides.length]; const preload = new Image(); preload.fetchPriority = 'low'; preload.src = window.matchMedia('(max-width: 650px)').matches ? (next.mobileSrc || next.src) : next.src; });
    show(0);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
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

  async function lookupAddress(cep, signal) {
    if (!/^\d{8}$/.test(cep)) throw new Error('Informe um CEP com 8 números.');
    const providers = [
      [`https://viacep.com.br/ws/${cep}/json/`, false],
      [`https://brasilapi.com.br/api/cep/v2/${cep}`, true],
      [`https://opencep.com/v1/${cep}`, false]
    ];
    const controllers = providers.map(() => new AbortController());
    const abort = () => controllers.forEach(controller => controller.abort());
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    try {
      return await Promise.any(providers.map(async ([url, english], index) => {
        const timeout = setTimeout(() => controllers[index].abort(), 5000);
        try {
          const response = await fetch(url, { signal: controllers[index].signal });
          if (!response.ok) throw new Error('Consulta indisponível');
          const result = await response.json();
          const city = english ? result.city : result.localidade;
          const state = english ? result.state : result.uf;
          const returnedCep = String(result.cep || '').replace(/\D/g, '');
          if (result.erro || result.error || !city || !/^[A-Z]{2}$/.test(state || '') || (returnedCep && returnedCep !== cep)) throw new Error('CEP não localizado na base');
          return { zipCode: cep, street: (english ? result.street : result.logradouro) || '', neighborhood: (english ? result.neighborhood : result.bairro) || '', city, state };
        } finally { clearTimeout(timeout); }
      }));
    } finally {
      abort(); signal?.removeEventListener('abort', abort);
    }
  }

  function saveDelivery(address) {
    try { sessionStorage.setItem('magazine-delivery-address', JSON.stringify(address)); } catch { /* Endereço continua disponível no formulário. */ }
  }

  function readDelivery() {
    try { return JSON.parse(sessionStorage.getItem('magazine-delivery-address') || 'null'); } catch { return null; }
  }

  function initCommerceForms() {
    $$('form[data-shipping-form]').forEach(form => {
      const input = $('input', form), status = document.getElementById(form.dataset.shippingForm);
      const saved = safeRead('magazine-delivery-postcode', '');
      if (typeof saved === 'string') input.value = saved;
      const fields = ui('div', 'delivery-address-fields'); fields.hidden = true;
      let address = null, controller, timer;
      const controls = {};
      [['street', 'Rua / Avenida'], ['neighborhood', 'Bairro'], ['city', 'Cidade'], ['state', 'Estado (UF)'], ['number', 'Número da casa'], ['complement', 'Complemento (opcional)']].forEach(([key, title]) => {
        const label = ui('label', '', title), field = ui('input');
        field.id = `${input.id}-${key}`; label.htmlFor = field.id;
        field.maxLength = key === 'state' ? 2 : 200;
        field.autocomplete = ({ street: 'address-line1', neighborhood: 'address-level3', city: 'address-level2', state: 'address-level1', number: 'off', complement: 'address-line2' })[key];
        if (key === 'number') field.placeholder = 'Informe o número ou S/N';
        controls[key] = field; fields.append(label, field);
        field.addEventListener('input', () => { if (address) { address[key] = field.value.trim(); saveDelivery(address); } });
      });
      status.after(fields);
      const showAddress = value => {
        address = value; fields.hidden = false;
        Object.entries(controls).forEach(([key, field]) => {
          field.value = value[key] || '';
          const resolved = ['street', 'neighborhood', 'city', 'state'].includes(key) && !!value[key];
          field.hidden = resolved; field.previousElementSibling.hidden = resolved;
        });
        const summary = [value.street, value.neighborhood, [value.city, value.state].filter(Boolean).join(' / ')].filter(Boolean).join(', ');
        status.textContent = `${summary ? `${summary}. ` : ''}Frete grátis. Entrega em até 7 dias após a confirmação do pagamento. ${value.street && value.neighborhood ? 'Confirme o número da casa.' : 'Complete os dados do endereço e o número.'}`;
        saveDelivery(value);
      };
      const cached = readDelivery();
      if (cached && cached.zipCode === input.value.replace(/\D/g, '')) showAddress(cached);
      const consult = async (focus = false) => {
        const digits = input.value.replace(/\D/g, '');
        if (digits.length !== 8) { status.textContent = 'Informe um CEP com 8 números.'; return; }
        controller?.abort(); controller = new AbortController(); const request = controller;
        const timeout = setTimeout(() => request.abort(), 8000);
        status.textContent = 'Consultando endereço…';
        try {
          const result = await lookupAddress(digits, request.signal);
          if (request !== controller || input.value.replace(/\D/g, '') !== digits) return;
          try { localStorage.setItem('magazine-delivery-postcode', JSON.stringify(input.value)); } catch { /* Opcional. */ }
          showAddress(result);
          if (focus) controls.number.focus();
        } catch (error) {
          if (request !== controller) return;
          showAddress({ zipCode: digits, street: '', neighborhood: '', city: '', state: '', number: '', complement: '' });
          status.textContent = 'Não conseguimos localizar este CEP nas bases consultadas. Confira o CEP ou preencha o endereço abaixo.';
        } finally { clearTimeout(timeout); }
      };
      input.addEventListener('input', () => {
        clearTimeout(timer); controller?.abort(); controller = null; address = null; fields.hidden = true;
        try { sessionStorage.removeItem('magazine-delivery-address'); } catch { /* Opcional. */ }
        const value = input.value.replace(/\D/g, '').slice(0, 8);
        input.value = value.length > 5 ? `${value.slice(0, 5)}-${value.slice(5)}` : value;
        status.textContent = '';
        if (value.length === 8) timer = setTimeout(() => consult(), 400);
      });
      form.addEventListener('submit', event => {
        event.preventDefault();
        clearTimeout(timer); consult(true);
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
    if (mainImage) { mainImage.loading = 'eager'; mainImage.fetchPriority = 'high'; mainImage.decoding = 'async'; }
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
    $('#productDescription').textContent = productDescriptionFor(product);
    const active = product.especificacoes?.['Principais ativos'];
    $('#productSummary').textContent = active ? `Ativos: ${active.replace(/\s*\n+\s*/g, ' + ')}` : (product.descricao || '').replace(/^O que é\?\s*/i, '').split(/\n\s*\n/)[0].slice(0, 240);
    const benefits = (product.especificacoes?.['Principais benefícios'] || '').split(/[\n;]+/).map(value => value.replace(/^[•\-\s]+/, '').trim()).filter(Boolean).slice(0, 6);
    $('#productBenefits').replaceChildren(...benefits.map(text => ui('li', '', text)));
    $('#benefitsBlock').hidden = benefits.length === 0;
    const rating = $('#productRating');
    if (typeof product.avaliacao === 'number' && product.avaliacao > 0 && product.avaliacao <= 5) { rating.textContent = `${product.avaliacao.toFixed(1)} ★★★★★`; rating.hidden = false; }
    renderProductGallery(product);
    $('#productAvailability').textContent = canPurchase(product) ? 'Disponível para compra · Produto novo' : 'Indisponível no momento';
    const zoomDialog = $('#productPhotoDialog');
    const syncZoomPhoto = () => {
      $('#productZoomImage').src = $('#productMainImage').src;
      $('#productZoomImage').alt = $('#productMainImage').alt;
      $('#photoPosition').textContent = $('#productImageCount').textContent;
      $('#photoViewport').scrollTo(0, 0);
    };
    const resetZoom = () => {
      zoomDialog.classList.remove('is-zoomed'); $('#photoZoomToggle').setAttribute('aria-pressed', 'false'); $('#photoZoomToggle').textContent = 'Aproximar 2×';
    };
    $('#productZoom').onclick = () => {
      resetZoom(); syncZoomPhoto(); zoomDialog.showModal();
    };
    $('#photoZoomToggle').onclick = () => {
      const zoomed = zoomDialog.classList.toggle('is-zoomed');
      $('#photoZoomToggle').setAttribute('aria-pressed', String(zoomed));
      $('#photoZoomToggle').textContent = zoomed ? 'Ver foto inteira' : 'Aproximar 2×';
    };
    $('#photoPrevious').onclick = () => { $('#productImagePrev').click(); resetZoom(); syncZoomPhoto(); };
    $('#photoNext').onclick = () => { $('#productImageNext').click(); resetZoom(); syncZoomPhoto(); };
    zoomDialog.onclick = event => { if (event.target === zoomDialog) zoomDialog.close(); };
    zoomDialog.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight' && !zoomDialog.classList.contains('is-zoomed')) { event.preventDefault(); $('#photoNext').click(); }
      if (event.key === 'ArrowLeft' && !zoomDialog.classList.contains('is-zoomed')) { event.preventDefault(); $('#photoPrevious').click(); }
    });
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
    detail.after($('#productInformation'));
    updateProductMetadata(product);
  }

  function productDescriptionFor(product) {
    if ((product.descricao || '').trim()) return product.descricao.trim();
    const parts = [product.nome];
    if (product.categoria) parts.push(`Categoria: ${product.categoria}.`);
    ['Principais benefícios', 'Principais ativos', 'Como usar'].forEach(key => { if (product.especificacoes?.[key]) parts.push(`${key}: ${product.especificacoes[key]}`); });
    return parts.join('\n');
  }

  function updateProductMetadata(product) {
    const url = new URL('/produto.html', 'https://magazineskincare.online'); url.searchParams.set('id', product.id);
    const description = productDescriptionFor(product).replace(/\s+/g, ' ').trim();
    const meta = (name, value, property = false) => {
      const attribute = property ? 'property' : 'name';
      let element = document.head.querySelector(`meta[${attribute}="${name}"]`);
      if (!element) { element = document.createElement('meta'); element.setAttribute(attribute, name); document.head.append(element); }
      element.content = value;
    };
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.append(canonical); }
    canonical.href = url.href;
    const photos = [...new Set([product.imagem, ...(product.imagens || [])].filter(Boolean))].map(path => new URL(path, location.href).href);
    meta('description', description.slice(0, 170)); meta('og:title', product.nome, true);
    meta('og:description', description.slice(0, 200), true); meta('og:type', 'product', true); meta('og:url', url.href, true);
    if (photos.length) meta('og:image', photos[0], true);
    if (!catalogVerified || !validPrice(currentPrice(product))) return;
    const data = { '@context': 'https://schema.org', '@type': 'Product', name: product.nome, description, image: photos, sku: product.id, brand: { '@type': 'Brand', name: 'Creamy' }, offers: { '@type': 'Offer', url: url.href, priceCurrency: 'BRL', price: currentPrice(product).toFixed(2), itemCondition: 'https://schema.org/NewCondition', availability: canPurchase(product) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', seller: { '@type': 'Organization', name: config.brand.name } } };
    if (product.gtin && /^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(product.gtin)) data.gtin = product.gtin;
    const script = document.createElement('script'); script.type = 'application/ld+json'; script.id = 'productStructuredData';
    script.textContent = JSON.stringify(data); document.head.append(script);
  }

  function promotionGift(cart, amountCents) {
    const gift = productById('drops-serum-hidratante');
    const paidQuantity = cart.filter(item => item.id === gift?.id).reduce((sum, item) => sum + item.quantity, 0);
    if (amountCents <= 34900 || !gift || !canPurchase(gift) || (Number.isInteger(gift.estoque) && gift.estoque <= paidQuantity)) return null;
    return gift;
  }

  function giftCard(gift) {
    const card = ui('div', 'promotion-gift');
    const image = ui('img'); image.src = gift.imagem; image.alt = gift.nome; image.loading = 'lazy';
    const text = ui('div'); text.append(ui('strong', '', `${gift.nome} — Brinde`), ui('p', '', '1 unidade grátis · Compras acima de R$ 349'));
    card.append(image, text); return card;
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
    $('#cartGift')?.remove();
    const gift = promotionGift(cart, subtotal);
    if (gift) { const card = giftCard(gift); card.id = 'cartGift'; container.after(card); }
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
      button.textContent = `Gerar Pix · ${$('#checkoutSubtotal').textContent}`;
      $('#reserveOrderTop').disabled = button.disabled;
      $('#reserveOrderTop').textContent = button.textContent;
    });
    const cart = readCart();
    const validItems = cart.map((item) => ({ ...item, product: productById(item.id) }))
      .filter((item) => item.product && canPurchase(item.product) && item.quantity <= purchaseLimit(item.product));
    const hasItems = validItems.length > 0 && validItems.length === cart.length;
    $("#checkoutLayout").hidden = !hasItems;
    $("#checkoutEmpty").hidden = hasItems;
    if (!hasItems) return;
    let subtotal = 0, regularSubtotal = 0;
    container.replaceChildren();
    validItems.forEach(({ product, quantity }) => {
      const line = document.createElement("div");
      line.className = "checkout-item-line";
      const image = makeProductImage(product, 'checkout-item-image');
      const info = ui('div', 'checkout-item-description'); info.append(ui('p', '', product.nome), ui('small', '', `Quantidade: ${String(quantity).padStart(2, '0')}`));
      line.append(image, info, ui('strong', '', money(Math.round(currentPrice(product) * 100) * quantity / 100)));
      subtotal += Math.round(currentPrice(product) * 100) * quantity / 100;
      regularSubtotal += Math.round(Math.max(product.precoRegular || 0, currentPrice(product)) * 100) * quantity / 100;
      container.append(line);
    });
    $("#checkoutSubtotal").textContent = money(subtotal);
    const gift = promotionGift(cart, Math.round(subtotal * 100));
    if (gift) container.append(giftCard(gift));
    $('#checkoutRegularSubtotal').textContent = money(regularSubtotal);
    $('#checkoutDiscount').textContent = `− ${money(regularSubtotal - subtotal)}`;
    $('#checkoutItemCount').textContent = `(${validItems.reduce((sum, item) => sum + item.quantity, 0)} itens)`;
    $('#checkoutApplyCoupon').onclick = () => { $('#checkoutCouponStatus').textContent = 'Cupom indisponível ou inválido. Nenhum desconto adicional foi aplicado.'; };
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
      const methods = $('.payment-methods').cloneNode(true);
      $$('button', methods).forEach(option => { option.disabled = true; });
      $('button.selected small', methods).textContent = 'Em breve';
      message.append(title, description, methods, back); form.before(message);
      return;
    }
    $("#checkoutForm").addEventListener("submit", submitPayment);
    $("#customerCpf").addEventListener("input", (event) => {
      const digits = event.target.value.replace(/\D/g, "").slice(0, 11);
      event.target.value = digits.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    });
    $("#copyPix").addEventListener("click", async () => {
      if (!$('#pixCopyPaste').value.trim() || $('#copyPix').disabled) return;
      let copied = false;
      try { await navigator.clipboard.writeText($('#pixCopyPaste').value); copied = true; }
      catch { $('#pixCopyPaste').focus(); $('#pixCopyPaste').select(); $('#pixCopyPaste').setSelectionRange(0, $('#pixCopyPaste').value.length); try { copied = document.execCommand('copy'); } catch { /* Permite copiar manualmente. */ } }
      $('#copyPix').textContent = copied ? 'Código copiado' : 'Copiar código Pix';
      $('#pixCopyStatus').textContent = copied ? 'Código Pix copiado. Cole no aplicativo do seu banco.' : 'Selecione e copie o código acima para colar no aplicativo do seu banco.';
    });
    $('#pixViewCode').onclick = () => {
      const expanded = $('#pixViewCode').getAttribute('aria-expanded') !== 'true';
      $('#pixViewCode').setAttribute('aria-expanded', String(expanded));
      $('#pixViewCode').textContent = expanded ? 'Recolher código' : 'Ver código completo';
      $('#pixCopyPaste').rows = expanded ? 6 : 2;
    };
    initCepLookup();
    initCustomerPhone();
    initCheckoutStages();
  }

  function initCustomerPhone() {
    const input = $('#customerPhone'), help = $('#customerPhoneHelp');
    const normalize = value => {
      let digits = value.replace(/\D/g, '');
      if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) digits = digits.slice(2);
      return digits;
    };
    const validate = (show = false) => {
      const digits = normalize(input.value);
      const valid = /^[1-9]{2}(?:9\d{8}|[2-5]\d{7})$/.test(digits);
      const message = !digits ? 'Informe seu WhatsApp com DDD.' : 'Confira o DDD e o número completo, por exemplo (11) 91234-5678.';
      input.setCustomValidity(valid ? '' : message);
      input.setAttribute('aria-invalid', String(show && !valid));
      help.textContent = show && !valid ? message : 'Informe o DDD e o número. Pode colar com +55.';
      help.classList.toggle('field-help-error', show && !valid);
      return valid;
    };
    input.addEventListener('keydown', event => {
      if (!['Backspace', 'Delete'].includes(event.key) || input.selectionStart !== input.selectionEnd) return;
      const cursor = input.selectionStart;
      if (event.key === 'Backspace' && cursor > 0 && /\D/.test(input.value[cursor - 1])) {
        let start = cursor - 1; while (start > 0 && /\D/.test(input.value[start])) start--;
        input.setSelectionRange(start, cursor);
      } else if (event.key === 'Delete' && cursor < input.value.length && /\D/.test(input.value[cursor])) {
        let end = cursor; while (end < input.value.length && /\D/.test(input.value[end])) end++;
        input.setSelectionRange(cursor, Math.min(end + 1, input.value.length));
      }
    });
    input.addEventListener('input', () => {
      const raw = input.value, cursor = input.selectionStart, atEnd = cursor === raw.length;
      const digits = normalize(raw), before = normalize(raw.slice(0, cursor)).length;
      if (digits.length <= 11) {
        const subscriber = digits.slice(2), split = subscriber.length > 8 ? 5 : 4;
        input.value = digits.length < 3 ? digits : `(${digits.slice(0, 2)}) ${subscriber.slice(0, split)}${subscriber.length > split ? `-${subscriber.slice(split)}` : ''}`;
        let position = input.value.length;
        if (!atEnd) { let count = 0; position = 0; while (position < input.value.length && count < before) { if (/\d/.test(input.value[position])) count++; position++; } }
        input.setSelectionRange(position, position);
      }
      validate();
    });
    input.addEventListener('blur', () => validate(true));
    input.addEventListener('invalid', () => validate(true));
    input.addEventListener('change', () => validate(true));
  }

  function initCheckoutStages() {
    const form = $('#checkoutForm'); let stage = 1;
    const show = next => {
      stage = next;
      $$('[data-checkout-stage]', form).forEach(section => { section.hidden = Number(section.dataset.checkoutStage) !== stage; });
      $('#checkoutStepLabel').textContent = `Etapa ${stage} de 3`;
      $('#checkoutStageTitle').textContent = ['Identificação', 'Entrega', 'Pagamento'][stage - 1];
      $('.checkout-progress').setAttribute('aria-valuenow', String(stage));
      $('.checkout-progress span').style.width = `${stage / 3 * 100}%`;
      $('#checkoutContinue').hidden = stage === 3; $('#reserveOrderTop').hidden = stage !== 3;
      $('#checkoutContactReview').textContent = $('#customerEmail').value;
      $('#checkoutAddressReview').textContent = addressReview();
      document.dispatchEvent(new CustomEvent('visitor-stage', { detail: ['checkout_identification', 'checkout_delivery', 'checkout_review'][stage - 1] }));
    };
    $('#checkoutContinue').onclick = () => {
      const fields = $$(`[data-checkout-stage="${stage}"] input`, form);
      if (fields.some(field => !field.reportValidity())) return;
      show(Math.min(3, stage + 1)); $('#checkoutStageTitle').scrollIntoView({ block: 'start', behavior: 'smooth' });
    };
    $('#checkoutBack').onclick = () => { if (stage === 1) location.assign('carrinho.html'); else show(stage - 1); };
    $('[data-edit-delivery]').onclick = () => show(2);
    form.addEventListener('invalid', event => {
      const section = event.target.closest('[data-checkout-stage]');
      if (section) show(Number(section.dataset.checkoutStage));
    }, true);
    form.addEventListener('keydown', event => { if (event.key === 'Enter' && stage < 3 && event.target.tagName === 'INPUT') { event.preventDefault(); $('#checkoutContinue').click(); } });
    show(1);
  }

  function addressReview() {
    return [$('#shippingAddress').value, $('#shippingNumber').value, $('#shippingComplement').value, $('#shippingNeighborhood').value, `${$('#shippingCity').value} / ${$('#shippingState').value}`, `CEP ${$('#shippingZipCode').value}`].filter(Boolean).join(', ');
  }

  function initCepLookup() {
    const input = $('#shippingZipCode'), status = $('#cepLookupStatus');
    if (!input || !status) return;
    const ids = { street: '#shippingAddress', neighborhood: '#shippingNeighborhood', city: '#shippingCity', state: '#shippingState', number: '#shippingNumber', complement: '#shippingComplement' };
    const apply = address => {
      input.value = address.zipCode.replace(/(\d{5})(\d{3})/, '$1-$2');
      Object.entries(ids).forEach(([key, selector]) => { $(selector).value = address[key] || ''; });
      status.textContent = address.street && address.neighborhood && address.city && address.state ? 'Confira o endereço e confirme o número da casa.' : 'Complete os dados do endereço e informe o número.';
    };
    const cached = readDelivery();
    if (cached && /^\d{8}$/.test(cached.zipCode || '')) apply(cached);
    let controller, timer;
    const consult = async () => {
      const cep = input.value.replace(/\D/g, '');
      if (cep.length !== 8) return;
      controller?.abort(); controller = new AbortController(); const request = controller;
      const timeout = setTimeout(() => request.abort(), 8000);
      status.textContent = 'Consultando CEP…';
      try {
        const address = await lookupAddress(cep, request.signal);
        if (request !== controller || input.value.replace(/\D/g, '') !== cep) return;
        apply(address); saveDelivery(address);
      } catch (error) {
        if (request !== controller) return;
        status.textContent = 'Não conseguimos localizar este CEP nas bases consultadas. Confira o CEP ou preencha o endereço manualmente.';
      } finally { clearTimeout(timeout); }
    };
    input.addEventListener('input', () => {
      controller?.abort(); controller = null; clearTimeout(timer);
      const digits = input.value.replace(/\D/g, '').slice(0, 8);
      input.value = digits.length > 5 ? digits.slice(0, 5) + '-' + digits.slice(5) : digits;
      Object.values(ids).forEach(selector => { $(selector).value = ''; });
      try { sessionStorage.removeItem('magazine-delivery-address'); } catch { /* Opcional. */ }
      status.textContent = 'Digite o CEP para preencher o endereço.';
      if (digits.length === 8) timer = setTimeout(consult, 400);
    });
    input.addEventListener('blur', () => { clearTimeout(timer); if (input.value.replace(/\D/g, '').length === 8) consult(); });
    Object.entries(ids).forEach(([key, selector]) => $(selector).addEventListener('input', () => {
      const address = readDelivery();
      if (address && address.zipCode === input.value.replace(/\D/g, '')) { address[key] = $(selector).value.trim(); saveDelivery(address); }
    }));
  }

  let submittingPayment = false;
  async function submitPayment(event) {
    event.preventDefault();
    if (submittingPayment) return;
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
    submittingPayment = true;
    button.disabled = true;
    $('#reserveOrderTop').disabled = true;
    button.textContent = "Gerando Pix seguro...";
    error.textContent = "";
    try {
      const expectedAmount = cart.reduce((sum, item) => sum + Math.round(currentPrice(productById(item.id)) * 100) * item.quantity, 0);
      const result = await window.PaymentService.createCharge({ customer, shipping, items, expectedAmount });
      const payment = result.data;
      if (!result.success || !payment?.transactionId) throw new Error("A BlackCat não retornou os dados do pagamento.");
      if (['PAID', 'CANCELLED', 'REFUNDED'].includes(payment.status)) {
        throw new Error(payment.status === 'PAID' ? 'Este pedido já foi pago. Consulte a loja para acompanhar a entrega.' : 'Esta cobrança foi encerrada. Atualize a página e revise o pedido.');
      }
      $("#confirmationReference").textContent = `Pedido ${payment.transactionId}`;
      $("#pixCopyPaste").value = payment.paymentData?.copyPaste || payment.paymentData?.qrCode || "";
      $('#pixCopyPaste').rows = 2; $('#pixViewCode').setAttribute('aria-expanded', 'false'); $('#pixViewCode').textContent = 'Ver código completo';
      $('#copyPix').textContent = '❖ Copiar código Pix'; $('#pixCopyStatus').textContent = '';
      $('#pixQrImage').hidden = true; $('#pixQrImage').removeAttribute('src'); $('#pixInvoice').hidden = true;
      const qr = payment.paymentData?.qrCodeBase64;
      if (typeof qr === "string" && /^data:image\//i.test(qr)) {
        $("#pixQrImage").src = qr;
        $("#pixQrImage").hidden = false;
      }
      $('#pixRetry').hidden = true;
      startPixCountdown(payment.paymentData?.checkoutExpiresAt || payment.paymentData?.expiresAt);
      $("#pixPayment").hidden = false;
      $('#pixDeliveryReview').textContent = addressReview();
      $('#pixOrderItems').replaceChildren(...Array.from($('#checkoutItems').children, child => child.cloneNode(true)));
      $('#pixOrderTotal').textContent = money(expectedAmount / 100);
      $('#pixSummaryTotal').textContent = money(expectedAmount / 100);
      $('#pixMethodTotal').textContent = money(expectedAmount / 100);
      $('#pixRegularSubtotal').textContent = $('#checkoutRegularSubtotal').textContent;
      $('#pixDiscount').textContent = $('#checkoutDiscount').textContent;
      $('#pixSavings').textContent = $('#checkoutDiscount').textContent.replace(/^−\s*/, '');
      $("#checkoutLayout").hidden = true;
      $('#pixPayment').scrollIntoView({ block: 'start' });
      if (payment.paymentMethod === "manual_pix") {
        $("#pixTitle").textContent = "Realize o pagamento para garantir sua compra";
        $("#pixStatus").textContent = "Depois de pagar, a loja confirmará o crédito manualmente.";
      } else {
        $("#pixTitle").textContent = "Realize o pagamento para garantir sua compra";
      }
      pollPayment(payment.transactionId, payment.paymentMethod === 'manual_pix');
      document.dispatchEvent(new CustomEvent('visitor-stage', { detail: 'pix_pending' }));
    } catch (submitError) {
      error.textContent = submitError.message;
    } finally {
      submittingPayment = false;
      button.disabled = false;
      $('#reserveOrderTop').disabled = false;
      button.textContent = `Gerar Pix · ${$('#checkoutSubtotal').textContent}`;
    }
  }

  let stopPixCountdown = () => {};
  let pixDeadlineExpired = false;
  function startPixCountdown(expiresAt) {
    stopPixCountdown();
    pixDeadlineExpired = false;
    $('#copyPix').disabled = false; $('#pixCopyPaste').hidden = false; $('#pixViewCode').hidden = false;
    const deadline = window.PaymentService.expirationTime(expiresAt);
    const timer = $('#pixCountdown'), progress = $('#pixExpiryProgress');
    timer.textContent = ''; progress.hidden = true;
    if (!Number.isFinite(deadline)) {
      $('#pixExpiry').textContent = 'Este Pix não possui expiração automática informada.';
      return;
    }
    $('#pixExpiry').textContent = 'Tempo para pagar neste checkout'; progress.hidden = false;
    const duration = Math.max(1, deadline - window.PaymentService.now()); let interval;
    const update = () => {
      const remaining = Math.max(0, deadline - window.PaymentService.now()), seconds = Math.ceil(remaining / 1000);
      const hours = Math.floor(seconds / 3600), minutes = Math.floor(seconds % 3600 / 60);
      timer.textContent = `${hours ? `${String(hours).padStart(2, '0')}:` : ''}${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
      progress.value = remaining / duration * 100;
      if (!remaining) {
        pixDeadlineExpired = true;
        clearInterval(interval);
        $('#pixExpiry').textContent = 'Prazo de pagamento encerrado';
        $('#copyPix').disabled = true; $('#pixQrImage').hidden = true;
        $('#pixCopyPaste').hidden = true; $('#pixViewCode').hidden = true;
        $('#pixRetry').hidden = false;
        $('#pixStatus').textContent = 'O prazo informado para este Pix terminou. Consulte a loja antes de realizar outro pagamento.';
      }
    };
    interval = setInterval(update, 1000); stopPixCountdown = () => clearInterval(interval); update();
  }

  let stopPaymentWatch = () => {};
  function pollPayment(transactionId, manual = false) {
    stopPaymentWatch();
    const button = $('#pixInvoice');
    let timer, busy = false, terminal = false, disposed = false, lastStatus = null;
    button.hidden = false; button.disabled = false; button.textContent = 'Confirmar pagamento';
    stopPaymentWatch = () => { disposed = true; clearTimeout(timer); };
    const refresh = async (requested = false) => {
      if (busy || terminal || disposed) return;
      clearTimeout(timer); busy = true; button.disabled = true;
      lastStatus = null;
      if (requested) { button.textContent = 'Consultando pagamento…'; $('#pixStatus').textContent = 'Verificando o recebimento do Pix…'; }
      try {
        const result = await window.PaymentService.getPaymentStatus(transactionId);
        if (disposed) return;
        if (!result.success || result.data?.transactionId !== transactionId) throw new Error('Consulta inválida');
        const state = result.data.status;
        if (!['PENDING', 'PAID', 'CANCELLED', 'REFUNDED'].includes(state)) throw new Error('Status inválido');
        lastStatus = state;
        if (state === 'PAID') {
          document.dispatchEvent(new CustomEvent('visitor-stage', { detail: 'paid' }));
          $('#pixRetry').hidden = true;
          terminal = true; stopPixCountdown();
          $('#pixExpiry').textContent = 'Pagamento confirmado'; $('#pixCountdown').textContent = ''; $('#pixExpiryProgress').hidden = true;
          $('#copyPix').disabled = true; $('#pixQrImage').hidden = true; $('#pixCopyPaste').hidden = true; $('#pixViewCode').hidden = true;
          $('#pixStatus').textContent = 'Pagamento confirmado. Seu pedido está pago.'; $('#pixTitle').textContent = 'Pagamento aprovado';
          button.textContent = 'Pagamento confirmado';
          localStorage.removeItem(CART_KEY); updateCartCount();
        } else if (state === 'CANCELLED' || state === 'REFUNDED') {
          $('#pixRetry').hidden = state !== 'CANCELLED';
          terminal = true; stopPixCountdown();
          $('#copyPix').disabled = true; $('#pixQrImage').hidden = true; $('#pixCopyPaste').hidden = true; $('#pixViewCode').hidden = true;
          $('#pixCountdown').textContent = ''; $('#pixExpiryProgress').hidden = true; $('#pixExpiry').textContent = '';
          $('#pixStatus').textContent = state === 'REFUNDED' ? 'Este pagamento foi estornado.' : 'Este pagamento foi cancelado ou expirou.';
          $('#pixTitle').textContent = 'Pagamento não concluído'; button.textContent = 'Pagamento encerrado';
        } else if (!pixDeadlineExpired) {
          $('#pixStatus').textContent = manual ? 'O crédito ainda não foi confirmado pela loja.' : (requested ? 'O Pix ainda não foi identificado. Se já pagou, aguarde e consulte novamente.' : 'Aguardando confirmação do Pix…');
        } else if (requested) {
          $('#pixStatus').textContent = 'O prazo terminou e o crédito ainda não foi confirmado. Consulte a loja antes de pagar novamente.';
        }
      } catch {
        if (!disposed) $('#pixStatus').textContent = 'Não foi possível consultar agora. Tente confirmar novamente em instantes; não é necessário gerar outro Pix.';
      } finally {
        busy = false;
        if (!disposed) {
          button.disabled = terminal;
          if (!terminal) { button.textContent = 'Confirmar pagamento'; timer = setTimeout(() => refresh(), 10000); }
        }
      }
    };
    button.onclick = () => refresh(true);
    $('#pixRetry').onclick = async () => {
      if (busy || disposed) return;
      if (!window.confirm('Se você já pagou, não gere outro Pix: aguarde a confirmação ou fale com a loja. Deseja revisar o pedido para uma nova tentativa?')) return;
      await refresh(true);
      if (disposed || $('#pixTitle').textContent === 'Pagamento aprovado') return;
      // Uma falha na consulta não autoriza criar uma segunda cobrança.
      if (!['PENDING', 'CANCELLED'].includes(lastStatus)) return;
      stopPaymentWatch(); stopPixCountdown();
      window.PaymentService.resetIntent();
      $('#pixPayment').hidden = true; $('#checkoutLayout').hidden = false;
      $('#checkoutError').textContent = 'Confira os dados antes de gerar um novo Pix. Pague somente a nova cobrança.';
      $('#checkoutLayout').scrollIntoView({ block: 'start' });
    };
    timer = setTimeout(() => refresh(), 10000);
  }
  function initVisitorAnalytics() {
    if (!connection.apiEnabled || window.location.protocol === "file:") return;
    const key = "mineironet_creamystore_session";
    let sessionId;
    try { sessionId = sessionStorage.getItem(key); } catch { /* Navegação privada pode bloquear armazenamento. */ }
    if (!sessionId) {
      sessionId = window.crypto?.randomUUID?.() || `visit-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      try { sessionStorage.setItem(key, sessionId); } catch { /* Mantém a visita funcional sem armazenamento. */ }
    }
    const pageId = window.crypto?.randomUUID?.() || `page-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    let stage = { home: 'home', product: 'product', cart: 'cart', checkout: 'checkout_identification' }[document.body.dataset.page] || '';
    const product = productById(new URLSearchParams(location.search).get('id'));
    let queue = Promise.resolve();
    const send = (source, reportedStage = stage) => fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      keepalive: true,
      body: JSON.stringify({ source, sessionId, pageId, stage: reportedStage, productName: product?.nome || readCart().map(item => productById(item.id)?.nome).filter(Boolean).join(' · ').slice(0, 180), path: window.location.pathname + window.location.search, page: document.title, referrer: document.referrer })
    }).catch(() => {});
    queue = send('view');
    const report = source => { const reportedStage = stage; queue = queue.then(() => send(source, reportedStage)); };
    document.addEventListener('visitor-stage', event => { if (event.detail && stage !== event.detail) { stage = event.detail; report('stage'); } });
    document.addEventListener('click', event => {
      if (event.target.closest('#addProduct') && !$('#addProduct')?.disabled) { stage = 'added_to_cart'; report('stage'); }
    }, true);
    window.addEventListener('pagehide', () => send('leave'));
    window.addEventListener('pageshow', event => { if (event.persisted) report('view'); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') report('heartbeat'); });
    window.setInterval(() => {
      if (document.visibilityState === "visible") report("heartbeat");
    }, 5000);
  }

  function initHeader() {
    const mobileSearch = $('#mobileSearchToggle');
    if (mobileSearch) mobileSearch.onclick = () => {
      const open = $('#searchForm').classList.toggle('search-open');
      mobileSearch.setAttribute('aria-expanded', String(open));
      mobileSearch.setAttribute('aria-label', open ? 'Fechar busca' : 'Abrir busca');
      if (open) $('#searchInput').focus();
    };
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
    initVisitorAnalytics();
    initHeader();
    renderBranding();
    initConfiguredImages();
    updateCartCount();
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
    initFeaturedCarousel();
    updateCartCount();
    renderCategoryTabs();
    renderCatalog();
    renderProductPage();
    renderCart();
    renderCheckout();
    initCommerceForms();
  }
  initializeStore();
})();
