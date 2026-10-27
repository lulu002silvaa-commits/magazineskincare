(() => {
  const localPreview = location.protocol === 'file:' || (['127.0.0.1', 'localhost'].includes(location.hostname) && ['5500', '5501'].includes(location.port));
  location.replace(localPreview ? 'http://127.0.0.1:8080/admin.php' : 'admin.php');
})();
