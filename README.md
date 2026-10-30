# Magazine do Skincare

Loja com catálogo público de 119 produtos, 377 fotos reais e painel administrativo PHP. Dezesseis ofertas foram retiradas na revisão de 27/10/2026; consulte GOOGLE-ADS-REVISAO.md.

## Abrir no computador

1. Abra `INICIAR LOJA.bat` ou `INICIAR PAINEL PHP.bat`.
2. Loja: http://127.0.0.1:8080/
3. Administração: http://127.0.0.1:8080/admin.php

O PHP portátil oficial está em `.runtime/php/`, sem instalação global. O inicializador também aceita PHP 8.2 ou superior instalado no PATH. Mantenha a janela do servidor aberta. O Live Server não executa PHP; use os endereços acima para administrar e testar o checkout.

## Vitrine HTML na Vercel e painel PHP

A publicação na Vercel agora gera somente HTML, CSS, JavaScript, fotos e fontes em `dist/`. O arquivo `vercel.json` define o comando `node scripts/build-static.mjs` e a pasta de saída `dist`; essas opções ficam versionadas no GitHub. O build usa Node 24 LTS e não instala dependências.

Sem servidor conectado, a vitrine utiliza o catálogo publicado em `js/products.js`: busca, galerias e sacola funcionam sem API. O checkout explica que a finalização ainda não está disponível e não coleta dados do cliente nem gera cobrança. Esse modo não tenta consultar `/api/catalog`, portanto não apresenta o aviso de falha por uma API inexistente.

O painel continua sendo `admin.php` e precisa de hospedagem PHP. Para conectar o painel e os pagamentos à vitrine:

1. Publique o backend PHP com a configuração Docker/Render existente, ou em hospedagem PHP compatível.
2. Na Vercel, defina a variável pública `STORE_API_ORIGIN` com a origem HTTPS real desse servidor, sem barra de caminho. Exemplo ilustrativo: `https://seu-servidor-php.example.com`.
3. No servidor PHP, configure `STORE_FRONTEND_ORIGINS=https://magazineskincare.online,https://magazineskincare.vercel.app`. Se usar domínio próprio, acrescente a origem exata separada por vírgula.
4. Faça um novo deploy da vitrine. O catálogo passa a vir do servidor e as alterações do painel aparecem na loja. Fotos enviadas pelo painel são carregadas da hospedagem PHP.
5. Opcionalmente, use `STORE_ADMIN_URL` na Vercel caso o endereço do painel não seja a origem do backend mais `/admin.php`.

`STORE_API_ORIGIN` e `STORE_ADMIN_URL` são endereços públicos. A senha administrativa e `BLACKCAT_API_KEY` continuam somente no ambiente do servidor PHP. Não coloque essas credenciais nas variáveis do frontend ou em `js/deployment.js`.

Para gerar a vitrine manualmente: `node scripts/build-static.mjs`. Para verificar o build: `node tests/static-build.mjs`. Para verificar o modo HTML no Chrome, inicie `node tests/static-server.mjs` e execute `powershell -NoProfile -ExecutionPolicy Bypass -File tests/browser.ps1 -Static`.

## Acesso administrativo

O usuário é definido por `ADMIN_USERNAME` (padrão: `admin`). Se `ADMIN_SYNC_PASSWORD` estiver preenchida no `.env` ou no ambiente do servidor, essa é a senha de acesso. Não há senha padrão pública.

Sem senha configurada, o primeiro acesso pelo próprio computador permite criar uma senha com pelo menos 12 caracteres. O servidor armazena apenas seu hash. Em hospedagem, configure `ADMIN_SYNC_PASSWORD` no ambiente. A autenticação usa sessão PHP, cookie HttpOnly, token CSRF, limitação de tentativas e expiração por inatividade.

## Painel

- Visão geral: visitas, Pix gerados, faturamento confirmado e pessoas online.
- Tabelas de visitas e cobranças, paginação e atualização a cada 15 segundos.
- Bloqueio e desbloqueio de IPs; o acesso administrativo continua disponível para desfazer bloqueios.
- Catálogo: busca sem acentos e filtros por categoria e disponibilidade.
- Editor: nome, categoria, descrição, preços, estoque opcional, disponibilidade, composição, benefícios, uso e tipos de pele.
- Fotos: envio de JPG, PNG e WebP de até 5 MB, remoção da galeria e reordenação. A primeira foto é a principal.
- Cadastro e exclusão de produtos. Exclusão do catálogo preserva os arquivos de imagem.
- Configurações de nome da loja, Pix próprio e seleção da BlackCat.

Edições são salvas no servidor e consultadas pela loja em `/api/catalog`. O campo de estoque vazio significa quantidade não informada; zero torna o produto indisponível. O controle de versão evita que uma aba sobrescreva uma edição mais recente feita em outra aba.

## Dados e arquivos

O histórico de visitas não tem mais exclusão automática após mil registros. A paginação do painel permite consultar os registros preservados. Cada gravação JSON cria uma cópia `.backup.json` na mesma pasta; a leitura usa essa cópia quando o arquivo principal estiver ausente ou inválido. Isso protege contra falhas do arquivo, mas não contra a perda do disco inteiro nem substitui backups externos. Exclusões manuais continuam disponíveis com confirmação.

Na configuração Render, `STORE_DATA_DIR=/var/www/html/.data` aponta para o disco `loja-data`. `STORE_REQUIRE_PERSISTENT_DISK=1` impede iniciar o contêiner sem esse disco montado, evitando recriar silenciosamente um painel vazio em disco temporário. Aplicar o YAML a um serviço existente exige conferir as configurações do serviço e preservar seus dados antes de qualquer migração. Sem acesso à hospedagem, o código local não confirma se o disco está ativo em produção.

Novas visitas recebem cidade, estado e país aproximados pelo IP via HTTPS no IPWHOIS.io, apenas no servidor. O cache dura 7 dias; falhas são retentadas após 15 minutos, com teto local de 950 consultas por dia e timeout de 1,2 segundo. IPs locais/privados não são consultados. Sem resposta válida, o painel mantém “Não informada”. Não usa GPS nem altera o endereço de entrega. Visitas antigas sem localização são preenchidas progressivamente ao atualizar o painel, com até 3 novas consultas por atualização e reutilização do cache. Novos pedidos também guardam a localização aproximada e o IP nos detalhes. Render é detectado por `RENDER=true`; em outro proxy confiável, configure `STORE_TRUST_PROXY=1` somente quando ele acrescentar o IP real ao fim de `X-Forwarded-For`. A localização usa o último IP público da cadeia. Fora de proxy confiável, usa `REMOTE_ADDR`.

`admin.php` é a entrada do painel. Em hospedagem PHP, `admin.html` redireciona para ela; na vitrine estática, abre o endereço de painel configurado ou informa que a hospedagem PHP ainda não foi conectada. `js/admin.js` e `css/admin.css` definem a interface. `api.php` e `php/` implementam os dados, a autenticação, uploads e pagamentos. `router.php` é usado no servidor local; `.htaccess` configura Apache.

`js/products.js` contém a captura inicial do catálogo. Após a primeira gravação, `.data/store.json` é a fonte das alterações. As fotos enviadas ficam em `.data/uploads/`, acessíveis por URLs controladas, sem expor os outros arquivos de dados. Faça backup da pasta `.data/` inteira: ela também contém autenticação, visitas, bloqueios, sessões e referências de cobranças. Não sobrescreva essa pasta ao atualizar o código.

A logo está em `public/images/brand/magazine-do-skincare.png`. Os banners e as imagens de seções são configurados em `js/catalog.js`. As fontes Roc Grotesk são locais. Consulte `IMAGE-MAP.md`.

## Pagamentos

Cadastre a chave, o nome e a cidade do recebedor no painel para Pix próprio. Uma cobrança gerada permanece pendente e não entra no faturamento confirmado. Confira o crédito na conta da loja.

Para BlackCat, configure `BLACKCAT_API_KEY` somente no servidor e selecione a opção no painel. Os preços são calculados no servidor; o navegador não pode escolher o valor cobrado. A confirmação da BlackCat exige correspondência do identificador e do valor do pedido. Consulte `BLACKCAT-INTEGRACAO.md`.

## Hospedagem

Use hospedagem PHP 8.2+ com sessões, JSON, OpenSSL e cURL; a pasta `.data/` precisa permitir gravação pelo PHP. Em Apache, habilite `mod_rewrite` e `AllowOverride All` para aplicar `.htaccess`. A configuração `render.yaml` agora usa o `Dockerfile` PHP/Apache, com disco persistente em `/var/www/html/.data`. A implantação em nuvem não foi executada nesta tarefa.

O painel e o backend usam PHP; a vitrine também pode ser publicada apenas em HTML/CSS/JavaScript na Vercel. O servidor Python antigo e seu ambiente virtual foram removidos com backup verificado em `.backups/`.

## Verificação

Execute `powershell -NoProfile -ExecutionPolicy Bypass -File tests/run.ps1 -Browser`. Os testes iniciam outro servidor e criam uma pasta exclusiva dentro de `.runtime/`, usando credenciais de teste e sem enviar cobranças à BlackCat. O teste de navegador usa o Chrome instalado no Windows.

Foram conferidos login, autenticação, CSRF, conflitos de edição, cadastro, alteração e exclusão de produtos, uploads, cálculo do Pix, registro de visitas, bloqueios, proteção dos arquivos, edição no Chrome, preservação das galerias, atualização pública do preço e largura de celular. Nenhum pagamento externo real foi executado.

## Backup da limpeza anterior

A pasta `.backups/` preserva a limpeza anterior e a revisão atual, incluindo os arquivos legados removidos. As cópias dos 870 arquivos legados foram conferidas por SHA-256 antes da exclusão. A pasta não participa do funcionamento do site e não é incluída na implantação.
## Revisão de qualidade

A sacola respeita o estoque informado e permite remover produtos retirados do catálogo. Uma falha na atualização do catálogo bloqueia novas compras até a consulta ser restabelecida. O checkout compara o total visto pelo cliente com os preços atuais do servidor e reutiliza a mesma cobrança em uma repetição do mesmo pedido. Se uma tentativa externa ficar sem resposta confirmada, consulte o gateway antes de gerar outra.

Os pedidos novos guardam contato, endereço e itens para consulta no painel; o CPF aparece mascarado. O gerador de QR Code é local, com licença preservada em js/vendor/. Navegação por teclado, página 404, títulos e cabeçalhos em telas menores também foram revisados.

Resultado da revisão de 27/10/2026: 53 verificações da API e 25 no Chrome passaram. Os 135 produtos e as 410 fotos continuam presentes; nenhuma dependência local referenciada ficou ausente. A conferência usa dados isolados, sem cobrança externa real. As capturas temporárias e os perfis do navegador foram limpos ao final.

Validação da publicação HTML: passaram 15 verificações do build, 14 no navegador estático, 56 da API PHP e 25 no navegador com PHP. Nenhuma cobrança externa real foi enviada.

## Modelo de navegação e compra

A vitrine, a página de produto e a sacola seguem as referências visuais fornecidas pelo proprietário: cards com foto e ações separadas, galeria lateral, benefícios, bloco de compra com quantidade, cálculo de frete por CEP e produtos relacionados.

O botão **Comprar** abre a sacola. Ela apresenta os itens em colunas, controles de quantidade, entrega, campo de cupom, descontos reais do produto, total no Pix e as seções **Aproveite e leve junto** e **Não se esqueça deles**. Adicionar uma recomendação atualiza os itens e o resumo sem recarregar a página.

Preços, avaliações, selos e benefícios são exibidos conforme os dados existentes; não são criadas avaliações ou certificações. A entrega permanece gratuita conforme a configuração atual e não se presume um prazo de transportadora. Não há cupom adicional ativo: o campo informa que nenhum desconto extra foi aplicado. Retirada está indisponível.

O botão **Avançar** mantém a etapa de contato e pagamento existente. Em publicação apenas HTML sem backend PHP conectado, a finalização continua indisponível, com a seleção preservada e sem coleta de dados pessoais.

A alteração passou em 15 verificações de build, 24 no navegador estático, 56 da API PHP e 27 no navegador com PHP. Nenhuma cobrança externa real foi enviada.
