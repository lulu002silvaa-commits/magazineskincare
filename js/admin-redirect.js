(() => {
  const connection = window.StoreConnection;
  if (connection?.mode === 'static') {
    if (connection.adminUrl) { location.replace(connection.adminUrl); return; }
    document.querySelector('#adminMessage').textContent = 'A vitrine está publicada em HTML. O painel administrativo continua em PHP e precisa ser aberto no servidor onde foi hospedado.';
    document.querySelector('#adminHelp').hidden = false;
    return;
  }
  const localPreview = location.protocol === 'file:' || (['127.0.0.1', 'localhost'].includes(location.hostname) && ['5500', '5501'].includes(location.port));
  location.replace(localPreview ? 'http://127.0.0.1:8080/admin.php' : 'admin.php');
})();
