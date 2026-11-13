(() => {
  'use strict';
  // Alegações promocionais ficam fora da publicação até revisão documental.
  const claims = /garant(?:e|em|id[oa]s?)|comprovad|clinicamente|curar?\b|elimina|regenera|síntese|estimula.{0,50}(?:colágeno|adipócitos)|(?:apenas|em)\s+\d+\s+(?:dias|semanas)|24\s*(?:h\b|horas)|aqui na Creamy|tratamento.{0,25}(?:acne|rosácea|melasma)/iu;
  const description = 'Cosmético para a rotina de cuidados com a pele. Confira a composição, o modo de uso e as advertências na embalagem. Os resultados variam de pessoa para pessoa.';
  window.StoreProductInformation = product => {
    const result = { ...product, especificacoes: { ...product.especificacoes } };
    if (claims.test(String(result.descricao || ''))) result.descricao = description;
    const benefits = result.especificacoes['Principais benefícios'];
    if (claims.test(String(benefits || ''))) result.especificacoes['Principais benefícios'] = 'Consulte a composição e as indicações cosméticas da embalagem para escolher o produto adequado à sua rotina.';
    return result;
  };
})();
