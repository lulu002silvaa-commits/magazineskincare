# Correções do painel e preservação dos dados — 18/11/2026

## Diagnóstico e limite da investigação

O relato de perda simultânea do login, leads e método de pagamento é compatível com troca ou perda da pasta `.data`. Isso não foi reproduzido nos testes isolados e não confirma sozinho a causa na hospedagem. Não houve acesso ao painel do Render, aos logs do serviço nem aos dados privados de produção.

O `render.yaml` já declara disco persistente e `docker-entrypoint.sh` exige esse disco quando `STORE_REQUIRE_PERSISTENT_DISK=1`. Esses arquivos não comprovam a configuração de um serviço criado anteriormente pelo Dashboard. Sem disco, Render perde as alterações locais em reinícios e publicações: https://render.com/docs/disks.

## Correções preparadas

- Prazo de coleta da sessão PHP alinhado ao prazo de autenticação de uma hora; cookies continuam protegidos e o logout continua invalidando o acesso.
- Falha ao abrir a sessão deixa de ser tratada como sucesso.
- Respostas idênticas da atualização não recriam a tela. O texto do intervalo agora corresponde aos três segundos existentes.
- Uma atualização em andamento não reconstrói o formulário de configurações que está sendo editado.
- Diagnóstico autenticado `GET /api.php?route=%2Fadmin%2Fstorage`, exibido em Configurações. Mostra se a pasta permite gravação e se existe uma montagem contendo a pasta de dados no Render, sem expor caminhos internos, senhas, chaves ou registros de clientes. Detectar uma montagem não verifica backups nem a integridade histórica dos dados.

## Etapa necessária antes da publicação

1. No Dashboard do Render, abrir o serviço `magazineskincare` e conferir Events, Logs, Disks e Environment. Comparar reinícios/publicações com os horários da perda. Não compartilhar valores de chaves ou senhas.
2. Antes de adicionar disco, trocar diretório ou reiniciar, exportar com segurança os arquivos existentes da pasta de dados atual. Uma cópia `.backup.json` na mesma pasta também é perdida se todo o armazenamento for descartado. Não colocar esses arquivos no Git nem em diretório público.
3. Confirmar um disco montado em `/var/www/html/.data`, com `STORE_DATA_DIR=/var/www/html/.data` e `STORE_REQUIRE_PERSISTENT_DISK=1`. Adicionar disco provoca publicação: guardar os dados antes. O plano precisa aceitar disco persistente.
4. Se o disco for novo, migrar os dados preservados antes de reabrir vendas e conferir permissões do usuário PHP. Não substituir arquivos atuais por cópias antigas sem comparar os registros.
5. Publicar as correções e confirmar que Configurações indica disco montado. Verificar a preservação de um registro identificado e do método salvo antes/depois de um reinício controlado, com backup confirmado.
6. Se registros já estiverem ausentes, procurar cópias externas ou snapshots de um disco que já existia. Não restaurar um snapshot inteiro sobre dados atuais sem conciliação; não há garantia de recuperar arquivos de armazenamento temporário descartado.

## Validação local

- Suíte PHP/API: autenticação, CSRF, pagamento, histórico, configurações, proteção de arquivos e diagnóstico de armazenamento.
- Teste dedicado: sessão e token CSRF preservados entre requisições; coleta não remove uma sessão com 30 minutos.
- Navegador: formulário administrativo, Pix, carrinho, checkout, imagens, medidas de celular e desktop e ausência de exceções JavaScript.
- Build estático; links e âncoras de 14 páginas; imagens; consentimento; informações públicas; marcas e identificadores do catálogo.

Nenhuma cobrança externa foi criada. Registros privados de produção não foram acessados ou modificados. Após receber o aviso sobre reinício e persistência, o usuário autorizou a publicação em 18/11/2026. A publicação das correções de código não confirma que o disco está configurado nem resolve, sozinha, a perda de dados no Render. Os testes cobrem os fluxos listados; não equivalem a uma garantia de ausência de todos os bugs.
