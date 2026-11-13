# Auditoria e reestruturação — Magazine do Skincare

Data: 13/11/2026. Domínio: https://magazineskincare.online/. Base Git antes da revisão: `702054a`. Escopo: vitrine Vercel, backend PHP/Render, catálogo público, compra, conteúdo institucional, SEO, segurança e experiência responsiva. Nenhum cadastro, preço, condição financeira, credencial ou dado operacional foi excluído ou alterado pela auditoria. Os testes da API usam dados isolados.

## Resultado e diagnóstico do catálogo

O endpoint público retornou 119 produtos sem exigir login, com preços positivos e imagens cadastradas. Não havia evidência de banco vazio ou ausência de cadastro. O backend utiliza arquivos JSON com bloqueio de gravação e cópia de recuperação, e não um banco SQL.

Foi reproduzido um problema de interação: a busca mantinha filtros anteriores de categoria/tipo de pele e aplicava também esses filtros à seleção de destaques. Isso podia mostrar mensagens de seleção vazia apesar de haver produtos correspondentes no catálogo. Agora uma nova busca limpa os filtros anteriores, as condições ativas ficam visíveis e o visitante pode recuperar todos os produtos por um botão. A seleção de destaques permanece independente da busca do catálogo.

Uma resposta de API sem o contrato esperado também podia ser interpretada como revisão do catálogo e retirar a vitrine silenciosamente. Agora a resposta é validada antes de alterar os produtos. Uma falha mantém a seleção local visível, apresenta o aviso de atualização e bloqueia compras até a validação dos preços. Um catálogo realmente vazio recebe mensagem de indisponibilidade e orientação de atendimento, sem produtos simulados.

## Problemas encontrados e corrigidos

| Gravidade | Achado | Correção e evidência |
| --- | --- | --- |
| CRÍTICO | Nenhum novo problema crítico confirmado no escopo testado | Isso não constitui certificação de ausência de vulnerabilidades ou de conformidade jurídica. |
| ALTO | Filtros persistentes geravam resultado vazio indevido | Nova busca reinicia categoria/tipo de pele; resumo visível e botões de limpeza. Regressão reproduzida e testada. |
| ALTO | Resposta inválida de API podia esvaziar a vitrine silenciosamente | Validação de `products` e `catalogReview` antes da mutação; preservado bloqueio de compras diante de falha. |
| ALTO | Metadados de produto dependiam do JavaScript na vitrine estática | Renderização no PHP de título, descrição, canonical, Open Graph e Product/Offer com preço e estoque reais; Vercel encaminha a página de produto ao backend. URLs existentes são preservadas. Produtos retirados retornam 404. |
| ALTO | Cookie administrativo poderia perder o atributo Secure atrás do proxy HTTPS | HTTPS reconhecido por conexão direta ou proxy explicitamente confiável do Render. Headers de proxy arbitrários continuam desconsiderados. Teste específico adicionado. |
| ALTO | Artes com preço fixo poderiam ficar desatualizadas após edição no painel | Banners vinculados a IDs e valores reais; artes divergentes ou de produtos indisponíveis são omitidas após a consulta do catálogo e durante a navegação. A arte geral de 30% e o brinde também dependem de ofertas/estoque correspondentes. Não modifica preços. |
| MÉDIO | Faltavam páginas específicas de cookies, termos e outras informações institucionais | Oito páginas publicadas, com dados já existentes e links em todos os rodapés. Empresa.html permanece como central e mantém as âncoras antigas. |
| MÉDIO | Página de descoberta usava IDs inexistentes e podia ficar oculta | Seleção utiliza quatro produtos reais existentes, sem alegar lançamento ou fabricar cadastro. |
| MÉDIO | Metadados e indexação incompletos em páginas internas | Descrições, canonical e Open Graph; sacola e checkout com noindex; Organization apenas com dados existentes; sitemap com páginas institucionais. Nenhuma avaliação ou depoimento criado. |
| MÉDIO | Faltavam cabeçalhos defensivos na vitrine | X-Frame-Options, Permissions-Policy e CSP limitada a base, objetos, frames e destino de formulários. Preservadas as integrações de pagamento e anúncios. O painel mantém sua CSP mais restritiva. |
| BAIXO | H1 duplicado nos estados alternativos de sacola e produto | Corrigida a hierarquia de títulos e verificada nos arquivos HTML públicos. |
| BAIXO | Recuperação de navegação e acesso às políticas incompletos | Página 404 com retorno à loja/atendimento, rodapé institucional comum e foco de teclado visível. |

## Páginas institucionais

- `sobre.html`: empresa responsável, natureza independente da loja e informações do catálogo.
- `contato.html`: WhatsApp, e-mail e dados comerciais existentes.
- `privacidade.html`: finalidades, responsáveis, dados compartilhados, publicidade opcional e direitos do titular.
- `cookies.html`: armazenamento operacional, publicidade, revogação e distinção entre publicidade e acompanhamento operacional.
- `termos.html`: revisão de pedido, Pix, preços, disponibilidade, condições e direitos do consumidor.
- `entrega.html`: mantidos frete grátis e prazo já informado de até sete dias, sem inventar cobertura, transportadora ou prazo em dias úteis.
- `trocas.html`: arrependimento, atendimento de avaria/defeito/divergência e instruções de contato.
- `reembolso.html`: solicitação, verificação do pagamento e prazos já publicados, sem limitar os direitos legais.

## Conteúdo, Taboola e cosméticos

Revisadas as ofertas, identificação da loja, conteúdo institucional e controles já implementados de alegações promocionais. Mantidas as composições e instruções dos produtos; a revisão pública não sobrescreve o cadastro administrativo original. Não foram criadas certificações, garantias, avaliações, depoimentos ou benefícios técnicos. Mantido o pixel Taboola 2144350 com consentimento de publicidade. Não foram usados borrões, ocultação para revisores ou redirecionamento por perfil de visitante.

O proprietário declarou possuir documentos da empresa, procedência e autorização das imagens. Esses documentos não foram inspecionados. Não foram verificadas individualmente a regularização sanitária e a documentação de eficácia de cada produto, nem os anúncios e criativos da conta. Essas verificações continuam necessárias para uma conclusão regulatória ou para a análise da plataforma.

## Desempenho

Preservadas fontes locais com `font-display: swap`, imagens WebP, miniaturas, carregamento preguiçoso de imagens secundárias e prioridade do primeiro banner. A verificação existente de 387 imagens otimizadas confirmou redução total de 79,2% em relação aos originais. As novas páginas institucionais não carregam o catálogo nem os scripts de compra. Não foram adicionadas dependências de terceiros ou bibliotecas de interface.

O PageSpeed Insights respondeu HTTP 429 na consulta desta auditoria. Não foi atribuída pontuação de Lighthouse nem certificação de Core Web Vitals. Métricas reais dependem também de dispositivo, rede, terceiros e dados de campo. A página de produto agora depende da disponibilidade do Render para responder com metadados atuais; o fluxo de compra já dependia desse backend. Convém monitorar a latência dessa rota e o serviço.

## Testes executados

- Build estático: 32 verificações, incluindo dependências das oito páginas novas, exclusão de PHP, dados, credenciais e backups do pacote público e precedência do proxy de produto na Vercel. O build local preserva produto.html; na Vercel, a rota é atendida pelo PHP.
- API PHP com dados isolados: autenticação, CSRF, catálogo, edição, conflitos, imagens, proteção de arquivos, feed, sitemap, coleta operacional, bloqueios e pagamentos. Adicionada conferência de SEO do produto antes do JavaScript.
- Navegador com PHP: painel, catálogo, galeria, sacola, identificação, endereço, Pix/QR/cópia, expiração real, confirmação e prevenção de cobranças duplicadas. Sem cobranças externas reais.
- Navegador estático: catálogo anônimo, busca, galeria, sacola, ausência de pagamento simulado sem backend, privacidade, brinde e layouts de 320 a 1920 pixels.
- Regressões da auditoria: busca após filtro anterior, seleção de destaques independente, recuperação dos 119 produtos e omissão de banner com preço divergente.
- Oito páginas institucionais: canonical, metadados, nove links de navegação institucional e larguras de 320, 390 e 1440 pixels.
- Links locais: 14 páginas, um H1 por arquivo e 357 referências, arquivos e âncoras verificadas.
- Testes de consentimento: aceitação, recusa, persistência, revogação e ausência de duplicação das tags; nenhuma tag externa em testes locais.
- Testes de cópia pública e proxy HTTPS: preservação de informações técnicas/preços e rejeição de proxy não confiável.

## Arquivos modificados

Vitrine e institucionais: `index.html`, `produto.html`, `carrinho.html`, `checkout.html`, `empresa.html`, `sobre.html`, `contato.html`, `privacidade.html`, `cookies.html`, `termos.html`, `entrega.html`, `trocas.html`, `reembolso.html`, `404.html` e `css/promotion.css`.

Lógica e configuração: `js/loja.js`, `js/catalog.js`, `php/bootstrap.php`, `php/merchant.php`, `public-page.php`, `router.php`, `.htaccess`, `vercel.json`, `robots.txt` e `scripts/build-static.mjs`.

Verificação: `tests/integration.php`, `tests/static-build.mjs`, `tests/audit-browser.ps1`, `tests/security-proxy.php` e `tests/site-links.mjs`. Os testes existentes de marketing, pagamento e revisão pública foram preservados e executados.

## Pendências que dependem do proprietário

| Gravidade | Pendência | Ação |
| --- | --- | --- |
| ALTO | Motivo da desativação e análise da conta Taboola não acessíveis nesta auditoria | Solicitar motivo específico, política aplicada e URLs avaliadas; pedir reanálise após as correções. Não há garantia de aprovação. |
| ALTO | Documentação empresarial, procedência e autorização das fotografias declaradas, mas não examinadas | Conservar documentos e apresentá-los à plataforma quando solicitados. Confirmar se a licença permite as edições das artes e seu uso publicitário. |
| ALTO | Regularização ANVISA, rótulos e sustentação de alegações por produto | Verificar documentos aplicáveis com fornecedores e responsável técnico; interromper oferta de qualquer produto irregular. O site não afirma certificação sanitária automática. |
| ALTO | Operação de entrega, reembolso, identidade do recebedor e preços de referência | Confirmar se correspondem à prática da empresa. Foram preservadas as condições já publicadas; software não comprova cumprimento operacional ou histórico de preço. |
| MÉDIO | Retenção e base legal do acompanhamento operacional, geolocalização por IP e compartilhamentos | Validar com o responsável jurídico/privacidade, definir períodos e procedimentos e implementar rotinas conforme a operação real, sem exclusão retroativa automática nesta tarefa. |
| MÉDIO | Rótulos de preço nas artes são pixels | A proteção oculta artes divergentes, mas para voltar a exibi-las com novo preço é necessário reeditar a imagem e atualizar seu vínculo. |
| MÉDIO | Core Web Vitals e latência de infraestrutura | Repetir PageSpeed quando a quota permitir e acompanhar dados reais no Search Console. Verificar plano, disponibilidade e backups externos do Render. |

## Recomendações e fontes

Manter backups externos testados; revisar o catálogo antes de cada campanha; usar anúncios com produto, preço e condições iguais aos da página de destino; acompanhar consultas sem resultado e falhas da API; conservar comprovação das alegações; manter Node/PHP e infraestrutura atualizados. A ausência de dependências npm não substitui revisão de componentes locais ou da imagem de servidor.

Fontes consultadas:

- [Taboola — práticas enganosas em páginas de destino](https://realize.com/help/en/articles/4021234-deceptive-landing-page-practices)
- [Taboola — comércio eletrônico](https://realize.com/help/en/articles/7200022-policy-faq-shopping-e-commerce)
- [Taboola — saúde e beleza](https://realize.com/help/en/articles/7199777-policy-faq-health-beauty)
- [Código de Defesa do Consumidor — Câmara dos Deputados](https://www2.camara.leg.br/legin/fed/lei/1990/lei-8078-11-setembro-1990-365086-normaatualizada-pl.html)
- [Decreto 7.962/2013 — comércio eletrônico](https://www2.camara.leg.br/legin/fed/decret/2013/decreto-7962-15-marco-2013-775557-norma-pe.html)
- [ANPD — guia de cookies e proteção de dados](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_cookies_e_protecao_de_dados_pessoais)
- [LGPD — Ministério da Justiça](https://bibliotecadigital.mj.gov.br/bitstream/1/1642/4/LEI_2018_13709.html)
- [ANVISA — rotulagem de cosméticos](https://www.gov.br/anvisa/pt-br/setorregulado/regularizacao/cosmeticos/rotulagem)

Nenhuma auditoria de código certifica aprovação automática pela Taboola ou substitui validação jurídica, sanitária e documental da operação real.
