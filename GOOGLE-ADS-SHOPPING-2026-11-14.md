# Revisão Google Ads e Google Shopping — 14/11/2026

Domínio: https://magazineskincare.online/. Feed: https://magazineskincare.online/merchant-feed.xml. A imagem enviada do Merchant Center mostra 119 produtos, com 1 reprovado e 118 em análise. Não foi fornecido o diagnóstico específico e não houve acesso autenticado à conta. Esta revisão não atribui a reprovação a uma causa sem evidência, não altera o status dos produtos dentro do Google e não garante aprovação.

## Achados e correções

| Prioridade | Achado confirmado | Correção |
| --- | --- | --- |
| ALTA | Marca ausente nos 119 produtos do catálogo/feed | Cada item foi relacionado por linkText à fonte pública oficial da Creamy. A marca comprovada foi adicionada, sem confundir marca e razão social do vendedor. |
| ALTA | Dados estruturados do servidor não incluíam marca, condição e GTIN conhecido | Incluídos Brand, NewCondition e GTIN de comprimento específico, coerentes com o feed e com a versão atualizada pelo navegador. |
| ALTA | Nome, preço e disponibilidade visíveis dependiam da conclusão dos scripts | Resumo renderizado pelo PHP com produto real, imagem, marca, preço, disponibilidade e links de entrega/devolução antes do JavaScript. Compra continua bloqueada até validação do catálogo. |
| MÉDIA | Frete não declarado no feed, embora o site e o checkout informem gratuidade | Adicionado shipping para BR com 0.00 BRL, coerente com as condições já existentes. Prazo de postagem/transporte não foi inventado em dias úteis. |
| MÉDIA | Devolução não descrita nos dados estruturados | Incluído vínculo à política publicada, janela de sete dias e país BR. Não foram inventadas taxas, transportadoras ou métodos de devolução. |
| MÉDIA | 64 itens sem GTIN no catálogo inicial | Confirmados 56 GTINs no fabricante, sendo 55 já existentes sem conflito e um recuperado. Restam 63 itens para conferência documental; ver `PENDENCIAS-GTIN-2026-11-14.md`. |
| MÉDIA | Textos com comparação de resultados rápidos e ausência de irritação | Ampliada a revisão pública dessas alegações; preservados nomes, composição e instruções técnicas do cadastro. Não foram ocultados ingredientes para tentar passar pela análise. |

## Verificação da fonte

Fonte pública utilizada: API de catálogo da Creamy em `https://www.creamy.com.br/api/catalog_system/pub/products/search`, com paginação de 50 itens. Foram encontrados 136 produtos na fonte e correspondência exata de linkText para os 119 do site. Não houve conflito entre os 55 GTINs já cadastrados e os encontrados na fonte. A evidência por produto — nome, marca, fonte, data, ID do produto no fabricante e GTIN quando existente — está versionada em `product-identifiers.json`.

Foram atualizados somente dados de identificação comprovados. Os preços, descontos, estoque e condições de venda não foram alterados. O enriquecimento de registros antigos é feito na leitura, sem sobrescrever o arquivo operacional do painel. Uma marca explicitamente cadastrada pelo administrador não é substituída automaticamente.

## Imagens e coerência comercial

As 119 páginas e imagens principais foram requisitadas na auditoria inicial. Não foram encontradas falhas HTTP nessas páginas/imagens ou divergências de preço/estoque com o feed. As imagens principais também foram inspecionadas em seis folhas de contato: fotografias das embalagens e conjuntos em fundo claro, sem os banners promocionais da página inicial como imagem principal do Shopping. Não se trata de certificação sanitária ou revisão documental de todas as fotografias adicionais.

Mantidos os banners com ofertas reais, identificação do vendedor independente, contatos, políticas, consentimento, integridade do checkout e prevenção de cobranças duplicadas. O feed não foi preenchido com a marca da loja no lugar da marca do produto, avaliações fictícias, certificados não comprovados, GTINs inventados ou MPNs derivados de IDs internos.

## Testes

- API PHP isolada: marca preservada, frete do feed, GTIN, condição, preço real no HTML, políticas de devolução, pagamentos, autenticação e proteção dos dados.
- Navegador com PHP: catálogo, produto, carrinho e checkout, sem cobrança externa real.
- Build estático, navegação responsiva, links locais, consentimento, revisão pública, imagens e serviço de pagamento.
- Auditoria pública automatizada: `tests/merchant-live-audit.mjs`, compara os 119 itens do catálogo/feed com as páginas e suas imagens principais. O resultado por item é salvo em `.runtime/google-shopping-live-audit.json`.

## Pendências fora do código

1. **Google Merchant Center:** obter o diagnóstico do produto reprovado. Os 118 em análise não equivalem a 118 reprovações. Não foram inspecionados dados de conta, verificação de domínio, fontes adicionais, configurações ou histórico de políticas.
2. **Atualização da fonte:** após a publicação, buscar novamente `merchant-feed.xml` na fonte de dados do Merchant Center e aguardar processamento. Se os produtos vierem de outra fonte ou do rastreamento automático, conferir a prioridade e os dados efetivamente utilizados pelo Google. O código do site não aciona uma nova coleta nem solicita reanálise na conta.
3. **Identificadores:** pedir ao fornecedor os GTINs dos 63 itens pendentes quando atribuídos; kits precisam da identificação correta do conjunto. Não declarar que identificadores não existem sem confirmação.
4. **Entrega e devolução:** conferir no Merchant Center país, frete gratuito, prazo real e políticas, sem contradizer o site. O prazo publicado é de até sete dias após a confirmação; não foi convertido arbitrariamente em handling/transit em dias úteis. Confirmar operacionalmente taxas e método de devolução antes de cadastrá-los.
5. **Documentação:** conservar documentos empresariais, autorização das imagens, comprovação de preços de referência, procedência e regularização dos produtos. Declarações do proprietário não substituem a análise documental da plataforma.
6. **Cosméticos:** produtos com adapalenato e outros ativos não foram classificados como medicamentos apenas pelo nome, nem tiveram composição adulterada. Confirmar documentação e enquadramento aplicável com fornecedor e responsável técnico; consultar o diagnóstico do Google antes de concluir que um ingrediente causou a reprovação.
7. **Anúncios Google Ads:** títulos, criativos, segmentação e informações da conta também precisam corresponder às ofertas reais. Esses elementos não estão acessíveis por este projeto.

## Fontes oficiais consultadas

- [Especificação de dados dos produtos](https://support.google.com/merchants/answer/7052112?hl=en)
- [Marca: usar somente informação correta](https://support.google.com/merchants/answer/6324351?hl=en)
- [GTIN: não adivinhar nem inventar códigos](https://support.google.com/merchants/answer/6324461?hl=en)
- [Frete no Merchant Center](https://support.google.com/merchants/answer/6324484?hl=en)
- [Dados estruturados para listagens de comerciantes](https://developers.google.com/search/docs/appearance/structured-data/merchant-listing)
- [Atualização automática de produtos](https://support.google.com/merchants/answer/12157888?hl=en)
- [Requisitos editoriais e profissionais](https://support.google.com/merchants/answer/6150244?hl=en)
- [Saúde e medicamentos no Shopping](https://support.google.com/merchants/answer/6150151?hl=en)
- [Google Ads — deturpação](https://support.google.com/adspolicy/answer/6020955?hl=pt-BR)

O site foi corrigido nos pontos tecnicamente verificáveis. A conformidade completa e a aprovação dependem também da documentação, da operação real, dos anúncios e da decisão do Google.
