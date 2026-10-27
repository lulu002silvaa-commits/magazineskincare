(function () {
  let paymentIntent = null;

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
    if (!response.ok) throw new Error(result.error || "Não foi possível processar o pagamento.");
    return result;
  }

  async function getConfig() {
    const response = await fetch("/api/payment-config", { cache: "no-store" });
    const config = await readApiResponse(response);
    if (!response.ok) throw new Error(config.error || "Não foi possível consultar a forma de pagamento.");
    return config;
  }

  window.PaymentService = Object.freeze({
    async getStatus() {
      try {
        const config = await getConfig();
        const blackcat = config.method === "gateway";
        const title = document.querySelector("#paymentProviderTitle");
        if (title) title.textContent = blackcat ? "Pix via BlackCat" : "Pix pela chave da loja";
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
      const fingerprint = JSON.stringify(data);
      let intent = paymentIntent;
      try { intent = JSON.parse(sessionStorage.getItem('magazine-payment-intent') || 'null') || paymentIntent; } catch { /* Mantém o identificador em memória se o armazenamento não estiver disponível. */ }
      if (!intent || intent.fingerprint !== fingerprint) {
        intent = { fingerprint, key: window.crypto?.randomUUID?.() || `order-${Date.now()}-${Math.random().toString(36).slice(2)}` };
        try { sessionStorage.setItem('magazine-payment-intent', JSON.stringify(intent)); } catch { /* O pedido ainda tem proteção durante esta tentativa. */ }
      }
      paymentIntent = intent;
      const config = await getConfig();
      if (config.method === "pix" && (!window.PixBR?.gerarPayload || typeof window.qrcode !== "function")) {
        throw new Error("Não foi possível carregar o gerador de QR Pix. Atualize a página e tente novamente.");
      }
      const result = await request("/api/payments/blackcat", { method: "POST", body: JSON.stringify({ ...data, idempotencyKey: intent.key }) });
      if (!result.success || !result.data || typeof result.data !== "object") {
        throw new Error(result.error || "O servidor não retornou os dados do Pix.");
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
        const qr = window.qrcode(0, "M");
        qr.addData(copyPaste, "Byte");
        qr.make();
        result.data.paymentMethod = "manual_pix";
        result.data.paymentData = {
          copyPaste,
          qrCode: copyPaste,
          qrCodeBase64: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr.createSvgTag(8, 4, "QR Code Pix"))}`
        };
      } else {
        const paymentData = result.data.paymentData || {};
        const copyPaste = paymentData.copyPaste || paymentData.qrCode;
        if (typeof copyPaste !== "string" || !copyPaste.trim()) {
          throw new Error("A cobrança foi criada, mas a BlackCat não devolveu o Pix copia e cola. Consulte a cobrança no painel da BlackCat antes de tentar novamente.");
        }
        paymentData.copyPaste = copyPaste;
        if (typeof paymentData.qrCodeBase64 !== "string" || !paymentData.qrCodeBase64.trim()) {
          if (typeof window.qrcode !== "function") {
            throw new Error("A BlackCat enviou o código Pix, mas o gerador de QR não carregou. Atualize a página e tente novamente.");
          }
          const qr = window.qrcode(0, "M");
          qr.addData(copyPaste, "Byte");
          qr.make();
          paymentData.qrCodeBase64 = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr.createSvgTag(8, 4, "QR Code Pix"))}`;
        } else if (!/^data:image\//i.test(paymentData.qrCodeBase64)) {
          paymentData.qrCodeBase64 = `data:image/png;base64,${paymentData.qrCodeBase64}`;
        }
        result.data.paymentData = paymentData;
      }
      return result;
    },
    async getPaymentStatus(transactionId) {
      return request(`/api/payments/${encodeURIComponent(transactionId)}`);
    }
  });
})();

