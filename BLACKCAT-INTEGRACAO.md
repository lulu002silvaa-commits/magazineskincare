# Pagamento BlackCat

O checkout disponibiliza o QR e o copia e cola por 10 minutos após a criação da cobrança. O servidor salva `paymentData.checkoutExpiresAt` em UTC e reutiliza o prazo original nas repetições do mesmo pedido. Ao terminar, a tela oculta os códigos, mas continua consultando pagamentos já realizados. Esse prazo não cancela a cobrança bancária: a API documenta apenas `pix.expiresInDays` em dias inteiros, mantido em 1 dia. Pix por chave também não possui cancelamento automático no banco.

O backend PHP utiliza a URL `https://api.blackcatoficial.com/api`, criação em `/sales/create-sale` e consulta em `/sales/{transactionId}/status`.

Configure `BLACKCAT_API_KEY` apenas no `.env` local ou nas variáveis de ambiente da hospedagem. No painel PHP, abra **Configurações**, selecione **API BlackCat** e salve. O painel informa se a variável está configurada; essa indicação não é um teste de aceitação da credencial pelo provedor.

A chave não é devolvida ao navegador. O servidor calcula os preços pelo catálogo salvo e envia os valores em centavos. A confirmação exige que identificador e valor retornados correspondam ao pedido. Pix pendente não é receita confirmada.

O PHP precisa de cURL e OpenSSL com certificados válidos. O runtime portátil já tem essas extensões e certificados configurados. Em hospedagem, use o certificado fornecido pelo servidor, mantendo a verificação HTTPS ativa.

Os testes desta tarefa não enviam cobranças reais ao gateway. Antes de vender, confira no ambiente da sua conta as credenciais e condições do provedor, conforme sua [documentação](https://docs.blackcatoficial.com/).
