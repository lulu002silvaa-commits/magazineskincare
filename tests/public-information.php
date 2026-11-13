<?php
declare(strict_types=1);
putenv('STORE_LOAD_ENV=0');
require __DIR__ . '/../php/bootstrap.php';
$product = ['id' => 'teste', 'preco' => 50, 'estoque' => 3, 'descricao' => 'Resultados comprovados em apenas 7 dias.', 'especificacoes' => ['Principais benefícios' => 'Elimina a acne.', 'Composição' => 'Aqua, Glycerin.', 'Como usar' => 'Seguir as instruções da embalagem.']];
$reviewed = public_product_information($product);
if (str_contains($reviewed['descricao'], 'comprovados') || str_contains($reviewed['especificacoes']['Principais benefícios'], 'Elimina')) throw new RuntimeException('Alegações não revisadas foram publicadas.');
foreach (['preco', 'estoque'] as $key) if ($reviewed[$key] !== $product[$key]) throw new RuntimeException('Dados comerciais alterados.');
foreach (['Composição', 'Como usar'] as $key) if ($reviewed['especificacoes'][$key] !== $product['especificacoes'][$key]) throw new RuntimeException('Informações de uso alteradas.');
if (public_product_information($reviewed) !== $reviewed) throw new RuntimeException('Revisão pública não é idempotente.');
echo "Revisão pública PHP preserva preços, estoque, composição e instruções, sem sobrescrever o cadastro.\n";
