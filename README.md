# Magazine do Skincare

Loja com catálogo de 135 produtos, 410 fotos reais e painel administrativo PHP.

## Abrir no computador

1. Abra `INICIAR LOJA.bat` ou `INICIAR PAINEL PHP.bat`.
2. Loja: http://127.0.0.1:8080/
3. Administração: http://127.0.0.1:8080/admin.php

O PHP portátil oficial está em `.runtime/php/`, sem instalação global. O inicializador também aceita PHP 8.2 ou superior instalado no PATH. Mantenha a janela do servidor aberta. O Live Server não executa PHP; use os endereços acima para administrar e testar o checkout.

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

`admin.php` é a entrada do painel; `admin.html` redireciona para ela. `js/admin.js` e `css/admin.css` definem a interface. `api.php` e `php/` implementam os dados, a autenticação, uploads e pagamentos. `router.php` é usado no servidor local; `.htaccess` configura Apache.

`js/products.js` contém a captura inicial do catálogo. Após a primeira gravação, `.data/store.json` é a fonte das alterações. As fotos enviadas ficam em `.data/uploads/`, acessíveis por URLs controladas, sem expor os outros arquivos de dados. Faça backup da pasta `.data/` inteira: ela também contém autenticação, visitas, bloqueios, sessões e referências de cobranças. Não sobrescreva essa pasta ao atualizar o código.

A logo está em `public/images/brand/magazine-do-skincare.png`. Os banners e as imagens de seções são configurados em `js/catalog.js`. As fontes Roc Grotesk são locais. Consulte `IMAGE-MAP.md`.

## Pagamentos

Cadastre a chave, o nome e a cidade do recebedor no painel para Pix próprio. Uma cobrança gerada permanece pendente e não entra no faturamento confirmado. Confira o crédito na conta da loja.

Para BlackCat, configure `BLACKCAT_API_KEY` somente no servidor e selecione a opção no painel. Os preços são calculados no servidor; o navegador não pode escolher o valor cobrado. A confirmação da BlackCat exige correspondência do identificador e do valor do pedido. Consulte `BLACKCAT-INTEGRACAO.md`.

## Hospedagem

Use hospedagem PHP 8.2+ com sessões, JSON, OpenSSL e cURL; a pasta `.data/` precisa permitir gravação pelo PHP. Em Apache, habilite `mod_rewrite` e `AllowOverride All` para aplicar `.htaccess`. A configuração `render.yaml` agora usa o `Dockerfile` PHP/Apache, com disco persistente em `/var/www/html/.data`. A implantação em nuvem não foi executada nesta tarefa.

O projeto agora usa somente PHP. O servidor Python antigo, seu ambiente virtual copiado e a configuração sem referências foram removidos com backup verificado em `.backups/`.

## Verificação

Execute `powershell -NoProfile -ExecutionPolicy Bypass -File tests/run.ps1 -Browser`. Os testes iniciam outro servidor e criam uma pasta exclusiva dentro de `.runtime/`, usando credenciais de teste e sem enviar cobranças à BlackCat. O teste de navegador usa o Chrome instalado no Windows.

Foram conferidos login, autenticação, CSRF, conflitos de edição, cadastro, alteração e exclusão de produtos, uploads, cálculo do Pix, registro de visitas, bloqueios, proteção dos arquivos, edição no Chrome, preservação das galerias, atualização pública do preço e largura de celular. Nenhum pagamento externo real foi executado.

## Backup da limpeza anterior

A pasta `.backups/` preserva a limpeza anterior e a revisão atual, incluindo os arquivos legados removidos. As cópias dos 870 arquivos legados foram conferidas por SHA-256 antes da exclusão. A pasta não participa do funcionamento do site e não é incluída na implantação.
## Revisão de qualidade

A sacola respeita o estoque informado e permite remover produtos retirados do catálogo. Uma falha na atualização do catálogo bloqueia novas compras até a consulta ser restabelecida. O checkout compara o total visto pelo cliente com os preços atuais do servidor e reutiliza a mesma cobrança em uma repetição do mesmo pedido. Se uma tentativa externa ficar sem resposta confirmada, consulte o gateway antes de gerar outra.

Os pedidos novos guardam contato, endereço e itens para consulta no painel; o CPF aparece mascarado. O gerador de QR Code é local, com licença preservada em js/vendor/. Navegação por teclado, página 404, títulos e cabeçalhos em telas menores também foram revisados.

Resultado da revisão de 27/10/2026: 53 verificações da API e 25 no Chrome passaram. Os 135 produtos e as 410 fotos continuam presentes; nenhuma dependência local referenciada ficou ausente. A conferência usa dados isolados, sem cobrança externa real. As capturas temporárias e os perfis do navegador foram limpos ao final.
