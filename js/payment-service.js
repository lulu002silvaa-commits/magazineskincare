(function () {
  let paymentIntent = null;
  let clockOffset = 0;

  function syncClock(response) {
    const serverTime = Date.parse(response.headers?.get('Date') || '');
    if (Number.isFinite(serverTime)) clockOffset = serverTime - Date.now();
  }

  function expirationTime(value) {
    if (value === null || value === undefined || value === '') return NaN;
    if (typeof value === 'number' || /^\d+(?:\.\d+)?$/.test(String(value))) {
      const number = Number(value);
      return number > 0 ? number * (number < 1e12 ? 1000 : 1) : NaN;
    }
    // Datas sem fuso são ambíguas: não desabilite um Pix com base nelas.
    if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(String(value))) return NaN;
    return Date.parse(value);
  }

  function createPixQr(copyPaste) {
    if (typeof window.qrcode !== 'function') throw new Error('O código Pix foi recebido, mas o gerador de QR não carregou. Atualize a página.');
    const qr = window.qrcode(0, 'M');
    qr.addData(copyPaste, 'Byte');
    qr.make();
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr.createSvgTag(8, 4, 'QR Code Pix'))}`;
  }

  async function readApiResponse(response) {
    const body = await response.text();
    try {
      return JSON.parse(body);
    } catch {
      if (response.status === 405) {
        throw new Error("Não foi possível iniciar o pagamento. Atualize a página e tente novamente.");
      }
      throw new Error(`A API de pagamento retornou uma resposta inválida (HTTP ${response.status}).`);
    }
  }

  async function request(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) }
    });
    const result = await readApiResponse(response);
    syncClock(response);
    if (!response.ok) throw new Error(result.error || "Não foi possível processar o pagamento.");
    return result;
  }

  async function getConfig() {
    const response = await fetch("/api/payment-config", { cache: "no-store" });
    const config = await readApiResponse(response);
    syncClock(response);
    if (!response.ok) throw new Error(config.error || "Não foi possível consultar a forma de pagamento.");
    return config;
  }

  window.PaymentService = Object.freeze({
    now: () => Date.now() + clockOffset,
    expirationTime,
    resetIntent() {
      paymentIntent = null;
      try { sessionStorage.removeItem('magazine-payment-intent'); } catch { /* Armazenamento opcional. */ }
    },
    async getStatus() {
      if (window.StoreConnection?.apiEnabled === false) {
        const title = document.querySelector('#paymentProviderTitle');
        if (title) title.textContent = 'Finalização indisponível';
        return { available: false, method: null, message: 'Sua seleção está salva na sacola. A finalização de compras ainda não está disponível.' };
      }
      try {
        const config = await getConfig();
        const blackcat = config.method === "gateway";
        const title = document.querySelector("#paymentProviderTitle");
        if (title) title.textContent = "Pagamento via Pix";
        return { available: config.available === true, method: config.method, message: config.message };
      } catch {
        const liveServerLocal = window.location.hostname === "127.0.0.1" && window.location.port === "5501";
        return {
          available: false,
          method: null,
          message: liveServerLocal
            ? "Abra INICIAR LOJA.bat e mantenha a janela aberta para testar o pagamento."
            : "Pagamento temporariamente indisponível. Tente novamente em alguns instantes."
        };
      }
    },
    async createCharge(data) {
      if (window.StoreConnection?.apiEnabled === false) throw new Error('A finalização de compras ainda não está disponível.');
      const fingerprint = JSON.stringify(data);
      let intent = paymentIntent;
      try { intent = JSON.parse(sessionStorage.getItem('magazine-payment-intent') || 'null') || paymentIntent; } catch { /* Mantém o identificador em memória se o armazenamento não estiver disponível. */ }
      if (!intent || intent.fingerprint !== fingerprint) {
        intent = { fingerprint, key: window.crypto?.randomUUID?.() || `order-${Date.now()}-${Math.random().toString(36).slice(2)}` };
        try { sessionStorage.setItem('magazine-payment-intent', JSON.stringify(intent)); } catch { /* O pedido ainda tem proteção durante esta tentativa. */ }
      }
      paymentIntent = intent;
      const config = await getConfig();
      if (!config.available) throw new Error(config.message || 'Pagamento temporariamente indisponível.');
      if (config.method === "pix" && (!window.PixBR?.gerarPayload || typeof window.qrcode !== "function")) {
        throw new Error("Não foi possível carregar o gerador de QR Pix. Atualize a página e tente novamente.");
      }
      const result = await request("/api/payments/blackcat", { method: "POST", body: JSON.stringify({ ...data, idempotencyKey: intent.key }) });
      if (!result.success || !result.data || typeof result.data !== "object") {
        throw new Error(result.error || "O servidor não retornou os dados do Pix.");
      }
      if (!result.data.transactionId || !Number.isInteger(result.data.amount) || result.data.amount !== data.expectedAmount) {
        throw new Error('A cobrança não corresponde ao valor do pedido. Consulte a loja antes de pagar.');
      }
      if (result.data.paymentMethod === "manual_pix") {
        const details = result.data.pix || config.pix;
        const copyPaste = window.PixBR.gerarPayload({
          chave: details.key,
          nomeRecebedor: details.receiverName,
          cidade: details.receiverCity,
          valor: Number(result.data.amount) / 100,
          txid: result.data.transactionId
        });
        result.data.paymentMethod = "manual_pix";
        result.data.paymentData = {
          ...result.data.paymentData,
          copyPaste,
          qrCode: copyPaste,
          qrCodeBase64: createPixQr(copyPaste)
        };
      } else {
        const paymentData = result.data.paymentData || {};
        const copyPaste = paymentData.copyPaste || paymentData.qrCode;
        if (typeof copyPaste !== "string" || !copyPaste.trim().startsWith('000201')) {
          throw new Error("A cobrança foi criada, mas a BlackCat não devolveu o Pix copia e cola. Consulte a cobrança no painel da BlackCat antes de tentar novamente.");
        }
        paymentData.copyPaste = copyPaste.trim();
        // O copia e cola é a fonte da cobrança; imagens do gateway podem vir inválidas.
        paymentData.qrCodeBase64 = createPixQr(paymentData.copyPaste);
        result.data.paymentData = paymentData;
      }
      return result;
    },
    async getPaymentStatus(transactionId) {
      return request(`/api/payments/${encodeURIComponent(transactionId)}`);
    }
  });
})();

