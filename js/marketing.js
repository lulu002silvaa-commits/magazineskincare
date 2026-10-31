(() => {
  'use strict';
  // IDs públicos. Preencher o rótulo somente com o snippet real do Google Ads.
  window.StoreMarketing = Object.freeze({ googleAdsId: 'AW-18464200120', purchaseLabel: '' });
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  let choice = '';
  try { choice = localStorage.getItem('store-marketing-consent') || ''; } catch { /* Opcional. */ }
  const consent = allowed => ({ ad_storage: allowed ? 'granted' : 'denied', analytics_storage: allowed ? 'granted' : 'denied', ad_user_data: allowed ? 'granted' : 'denied', ad_personalization: allowed ? 'granted' : 'denied' });
  window.gtag('consent', 'default', consent(choice === 'accepted'));
  window.gtag('js', new Date());
  window.gtag('config', window.StoreMarketing.googleAdsId, { allow_enhanced_conversions: false });
  // Não envia visitas nem compras dos testes locais para a conta de anúncios.
  if (location.protocol === 'https:' && ['magazineskincare.online', 'www.magazineskincare.online', 'magazineskincare.vercel.app'].includes(location.hostname)) {
    const script = document.createElement('script'); script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=AW-18464200120';
    document.head.append(script);
  }
  function showPreferences() {
    document.querySelector('#marketingConsent')?.remove();
    const banner = document.createElement('section'); banner.id = 'marketingConsent';
    banner.className = 'marketing-consent'; banner.setAttribute('aria-label', 'Preferências de privacidade');
    const text = document.createElement('p');
    text.textContent = 'Podemos usar cookies de publicidade para medir os anúncios e personalizar ofertas? Sua escolha não interfere na compra.';
    const link = document.createElement('a'); link.href = 'empresa.html#privacidade'; link.textContent = 'Política de privacidade';
    banner.append(text, link);
    for (const [label, accepted] of [['Aceitar', true], ['Recusar', false]]) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
      button.onclick = () => {
        window.gtag('consent', 'update', consent(accepted));
        try { localStorage.setItem('store-marketing-consent', accepted ? 'accepted' : 'rejected'); } catch { /* Opcional. */ }
        banner.remove();
      };
      banner.append(button);
    }
    document.body.append(banner);
  }
  document.addEventListener('DOMContentLoaded', () => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'text-link';
    button.textContent = 'Preferências de cookies'; button.onclick = showPreferences;
    (document.querySelector('footer .wrap') || document.querySelector('footer') || document.body).append(button);
    if (!['accepted', 'rejected'].includes(choice)) showPreferences();
  });
})();
