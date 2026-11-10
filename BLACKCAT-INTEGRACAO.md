# Pagamento BlackCat

O checkout respeita a expiração informada pelo provedor e mantém a consulta de pagamentos após esse prazo. Não aplica expiração artificial a Pix por chave própria. A BlackCat recebe `pix.expiresInDays` em dias inteiros, mantido em 1 dia.

O backend PHP utiliza a URL `https://api.blackcatoficial.com/api`, criação em `/sales/create-sale` e consulta em `/sales/{transactionId}/status`.

Configure `BLACKCAT_API_KEY` apenas no `.env` local ou nas variáveis de ambiente da hospedagem. No painel PHP, abra **Configurações**, selecione **API BlackCat** e salve. O painel informa se a variável está configurada; essa indicação não é um teste de aceitação da credencial pelo provedor.

A chave não é devolvida ao navegador. O servidor calcula os preços pelo catálogo salvo e envia os valores em centavos. A confirmação exige que identificador e valor retornados correspondam ao pedido. Pix pendente não é receita confirmada.

## Falhas de geração

O servidor distingue recusas explícitas do provedor (credencial, permissão, validação e limite de solicitações) de respostas incertas. Uma recusa JSON com `success: false` permite repetir a mesma tentativa; timeout, resposta inválida e falha HTTP 5xx mantêm o bloqueio até conferência no provedor. Tentativas antigas sem resposta confirmada não são liberadas automaticamente.

Com uma sessão administrativa autenticada, `GET /api/admin/payment-diagnostics` consulta `/sales/seller` sem criar cobrança. Retorna aceitação da conexão, classificação da falha e contagem das solicitações concluídas, recusadas e incertas, sem expor a chave ou os dados pessoais dos pedidos. Credencial aceita nessa consulta não garante que a conta tenha condições de emitir uma cobrança.

Execute `tests/run.ps1` para validar a classificação dos erros e a repetição das tentativas com dados isolados. Os testes não criam cobranças externas.

Uma resposta de cobrança aceita é salva antes das demais gravações, para permitir retomada após interrupção sem reenviar a criação. A referência enviada ao provedor também é preservada antes da chamada. Solicitações antigas que já ficaram sem confirmação continuam exigindo conferência.

O copia e cola não depende da biblioteca de QR: se a biblioteca falhar, o código permanece disponível com uma orientação na tela. `node tests/payment-service.mjs` verifica essa situação e a preservação da tentativa após erro de rede.

## Pix por chave própria

No painel administrativo, selecione **Configurações → Chave Pix própria**, confira chave, titular e cidade e salve. O checkout gera o copia e cola e o QR localmente, com o valor calculado no servidor. O recebimento precisa ser conferido na conta da loja; gerar ou copiar o código não comprova pagamento.

O PHP precisa de cURL e OpenSSL com certificados válidos. O runtime portátil já tem essas extensões e certificados configurados. Em hospedagem, use o certificado fornecido pelo servidor, mantendo a verificação HTTPS ativa.

Os testes desta tarefa não enviam cobranças reais ao gateway. Antes de vender, confira no ambiente da sua conta as credenciais e condições do provedor, conforme sua [documentação](https://docs.blackcatoficial.com/).
