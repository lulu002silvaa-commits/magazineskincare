import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const storage = new Map(), requests = [];
let failure = false, blankCopyPaste = false;
const window = { StoreConnection: { apiEnabled: true } };
const context = { window, document: { querySelector: () => null }, sessionStorage: {
  getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key)
}, fetch: async (url, options) => {
  if (url.includes('payment-config')) return new Response(JSON.stringify({ available: true, method: 'gateway' }));
  requests.push(JSON.parse(options.body));
  if (failure) return new Response(JSON.stringify({ error: 'Falha do provedor' }), { status: 502 });
  return new Response(JSON.stringify({ success: true, data: { transactionId: 'TEST-ONLY', amount: 1000,
    paymentMethod: 'blackcat', paymentData: { copyPaste: blankCopyPaste ? '   ' : payload, qrCode: payload }
  } }));
} };
vm.createContext(context);
vm.runInContext(await readFile(new URL('../js/pix.js', import.meta.url), 'utf8'), context);
const payload = window.PixBR.gerarPayload({ chave: 'teste@example.com', nomeRecebedor: 'TESTE', cidade: 'BRASILIA', valor: 10, txid: 'TESTE' });
vm.runInContext(await readFile(new URL('../js/payment-service.js', import.meta.url), 'utf8'), context);
const order = { expectedAmount: 1000, items: [{ id: 'test-only', quantity: 1 }] };
let result = await window.PaymentService.createCharge(order);
assert.equal(result.data.paymentData.copyPaste, payload, 'Copia e cola permanece disponível sem biblioteca QR');
assert.equal(result.data.paymentData.qrCodeBase64, null);
blankCopyPaste = true;
result = await window.PaymentService.createCharge(order);
assert.equal(result.data.paymentData.copyPaste, payload, 'Campo vazio não oculta alternativa válida');
assert.equal(requests[0].idempotencyKey, requests[1].idempotencyKey, 'Mesma tentativa preserva identificador');
failure = true;
await assert.rejects(window.PaymentService.createCharge(order), /Falha do provedor/);
assert.equal(requests.length, 3, 'Não repete cobrança automaticamente após falha');
failure = false;
vm.runInContext(await readFile(new URL('../js/vendor/qrcode.min.js', import.meta.url), 'utf8'), context);
window.qrcode = context.qrcode;
result = await window.PaymentService.createCharge(order);
assert.ok(result.data.paymentData.qrCodeBase64.startsWith('data:image/svg+xml'), 'QR local gerado a partir do mesmo Pix');
assert.equal(requests[2].idempotencyKey, requests[3].idempotencyKey, 'Erro não descarta a tentativa');
console.log('Copia e cola, QR, recuperação e proteção contra repetição verificados sem cobranças externas.');
