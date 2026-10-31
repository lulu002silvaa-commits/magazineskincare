# Revisão de vendas — 31/10/2026

## Evidência disponível

Consulta ao painel de produção: 29 visitantes registrados nos últimos 7 dias; 28 passaram pelo início e 1 por produto. Há 1 Pix pendente e nenhum pagamento confirmado no painel. Quatro registros usam agentes identificáveis como automação; 21 usam celular. Quinze registros têm origem em domínios do Facebook. Esses números não equivalem aos cliques ou ao gasto das plataformas e podem incluir acessos do proprietário ou testes. Não permitem concluir uma taxa de conversão confiável, nem provar o motivo da ausência de vendas.

O abandono registrado concentra-se antes de produto/sacola. A configuração pública de pagamento respondeu disponível, com gateway ativo; uma consulta de configuração não verifica liquidação nem comprova sucesso de uma cobrança real. Não foi criada cobrança real nesta revisão.

## Correções implementadas

- Produtos aparecem na página inicial enquanto a API confirma preço e disponibilidade. A compra continua dependendo da confirmação do servidor. A tolerância da consulta subiu de 8 para 30 segundos; uma indisponibilidade prolongada ainda exige corrigir a hospedagem.
- Removido o prazo artificial de 10 minutos: a validade informada pelo gateway é preservada. Cobranças já emitidas mantêm a resposta original de idempotência.
- CPF validado antes do envio. O servidor continua validando todos os dados.
- Checkout apresenta apenas o método efetivamente disponível, Pix à vista. Cartão continua sem integração; removê-lo da tela não implementa cartão.
- Retirados da rotação os banners de 20% e até 40%, incompatíveis com os atuais 30%. Oferta, pagamento e entrega ficam explícitos.
- Adição à sacola medida após sucesso, inclusive nos cards. Erro de pagamento passa a ser etapa registrada.
- Campanhas UTM persistem entre páginas na sessão e são associadas às visitas e aos pedidos. O painel mostra o funil dos últimos 7 dias e origens/campanhas. Automações reconhecidas são excluídas das contagens do funil, sem bloquear visitantes por localização ou navegador.
- Eventos de comércio preparados sem dados pessoais: view_item, add_to_cart, begin_checkout, pix_generated e purchase. purchase exige status PAID retornado pelo servidor e usa valor/transação reais. Pix pendente não conta como venda. A confirmação em navegador não substitui reconciliação de pedidos com o gateway.
- Tag Google Ads AW-18464200120 instalada nas páginas públicas, com preferências de cookies. Visitas locais de teste não carregam a tag externa.

## Integrações pendentes

O rótulo de compra foi fornecido pela loja e conectado: AW-18464200120/gm6TCL79_asdELirteRE. O evento de conversão usa valor real em BRL e identificador da transação, somente após pagamento confirmado pelo servidor. A validação local simula a resposta PAID sem enviar cobrança nem eventos de teste à conta; a atribuição efetiva no Google Ads precisa ser conferida após uma compra real. Ainda falta o ID do Pixel da Meta. Não houve alteração de orçamento, público, palavras-chave ou objetivo nas contas.

## Como avaliar tráfego com intenção de compra

Conferir no Google Pesquisa os termos efetivamente pesquisados, a correspondência com o produto e o destino. Anúncio de um produto deve levar ao produto correspondente, com preço e condições coerentes. No Meta, conferir objetivo, evento de otimização, posicionamentos e criativos a partir dos resultados reais. Sem dados de investimento, cliques e compras atribuídas, não é possível indicar exclusões de público ou afirmar qual campanha está desperdiçando verba.

Exemplo de URL identificável (não altera a campanha automaticamente):

`https://magazineskincare.online/produto.html?id=acido-salicilico-1&utm_source=google&utm_medium=cpc&utm_campaign=pesquisa_salicilico`

Não inclua nome, e-mail, telefone ou CPF nos parâmetros de campanha. Compare visitas, produto, sacola, checkout, Pix e pedidos pagos por campanha. UTMs antigas ausentes não podem ser recuperadas retroativamente.

Não há filtro de site que garanta apenas visitantes qualificados ou vendas. A medição de compras reais permite avaliar campanha, oferta e experiência sem confundir clique ou Pix gerado com receita.

Referências: [Google: medição de conversões](https://support.google.com/google-ads/answer/1722022?hl=pt-BR), [snippet de compra e identificador da transação](https://support.google.com/google-ads/answer/6386790?hl=pt-BR), [modo de consentimento](https://developers.google.com/tag-platform/security/guides/consent).
