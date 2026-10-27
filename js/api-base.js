(function () {
  const isLocalLiveServer =
    (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") &&
    ["5500", "5501"].includes(window.location.port);
  if (!isLocalLiveServer) return;

  const apiOrigin = "http://127.0.0.1:8080";
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (resource, options) => {
    if (typeof resource === "string" && resource.startsWith("/api/")) {
      return nativeFetch(`${apiOrigin}${resource}`, options);
    }
    return nativeFetch(resource, options);
  };
})();
