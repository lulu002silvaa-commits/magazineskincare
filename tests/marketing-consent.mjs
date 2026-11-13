import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../js/marketing.js', import.meta.url), 'utf8');
function visit(choice = '', hostname = 'magazineskincare.online') {
  const scripts = [], elements = [], events = {};
  let banner, reloaded = false;
  const context = {
    window: {},
    location: { protocol: 'https:', hostname, reload() { reloaded = true; } },
    localStorage: { getItem: () => choice, setItem: (_, value) => { choice = value; } },
    document: {
      getElementById: id => scripts.find(script => script.id === id),
      querySelector: selector => selector === '#marketingConsent' ? banner : null,
      addEventListener: (name, callback) => { events[name] = callback; },
      head: { append: script => scripts.push(script) },
      body: { append: element => { elements.push(element); if (element.id === 'marketingConsent') banner = element; } },
      createElement: tag => ({ tag, children: [], setAttribute() {}, append(...items) { this.children.push(...items); }, remove() { if (banner === this) banner = null; } })
    }
  };
  vm.runInNewContext(source, context);
  events.DOMContentLoaded();
  return { context, scripts, elements, get banner() { return banner; }, get reloaded() { return reloaded; } };
}
function choose(state, label) { state.banner.children.find(button => button.textContent === label).onclick(); }
for (const choice of ['', 'rejected']) assert.equal(visit(choice).scripts.length, 0, 'Nenhuma tag externa antes de aceitar publicidade');
const state = visit();
choose(state, 'Aceitar');
assert.equal(state.scripts.length, 2);
assert.equal(state.context.window._tfa.length, 1);
assert.equal(state.context.window._tfa[0].id, 2144289);
assert.equal(state.context.window._tfa[0].name, 'page_view');
state.elements.find(element => element.tag === 'button').onclick();
choose(state, 'Aceitar');
assert.equal(state.scripts.length, 2, 'Aceitar novamente não duplica tags nem page_view');
state.elements.find(element => element.tag === 'button').onclick();
choose(state, 'Recusar');
assert.equal(state.context.localStorage.getItem(), 'rejected');
assert.ok(state.reloaded, 'Revogação recarrega a página e aplica a escolha salva');
assert.equal(visit('accepted').scripts.length, 2, 'Consentimento salvo carrega ambas as tags');
assert.equal(visit('accepted', 'localhost').scripts.length, 0, 'Testes locais não enviam eventos externos');
console.log('Consentimento: recusa, aceitação, revogação, persistência e ausência de duplicações verificados.');
