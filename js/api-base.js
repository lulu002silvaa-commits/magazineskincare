(function () {
  const deployment = window.STORE_DEPLOYMENT || { mode: 'auto' };
  const isLocal = ['127.0.0.1', 'localhost'].includes(window.location.hostname);
  const isLocalLiveServer =
    isLocal &&
    ["5500", "5501"].includes(window.location.port);
  const isStatic = deployment.mode === 'static' || window.location.protocol === 'file:' || window.location.hostname.endsWith('.vercel.app');
  let apiOrigin = (deployment.apiOrigin || '').replace(/\/$/, '');
  if (!apiOrigin && isLocalLiveServer && !isStatic) apiOrigin = 'http://127.0.0.1:8080';
  const apiEnabled = Boolean(apiOrigin) || !isStatic;
  window.StoreConnection = Object.freeze({
    mode: isStatic ? 'static' : 'php',
    apiEnabled,
    apiOrigin,
    adminUrl: deployment.adminUrl || (apiOrigin ? `${apiOrigin}/admin.php` : (apiEnabled ? 'admin.php' : ''))
  });
  if (!apiOrigin) return;
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (resource, options) => {
    if (typeof resource === "string" && resource.startsWith("/api/")) {
      return nativeFetch(`${apiOrigin}${resource}`, options);
    }
    return nativeFetch(resource, options);
  };
})();
