const fs = require('fs');

const file = 'artifacts/fashion-store/src/components/storefront/StorefrontProductCard.tsx';
let data = fs.readFileSync(file, 'utf8');

data = data.replace(
  '  function handleAdd(e: React.MouseEvent) {\n    e.preventDefault();\n    e.stopPropagation();\n    if (unavailable) return;\n    if (product.hasVariants) {\n      navigate(`/products/${product.id}`);\n      return;\n    }\n    onAdd?.();\n  }',
  '  function handleAdd(e: React.MouseEvent) {\n    e.preventDefault();\n    e.stopPropagation();\n    if (inCart) {\n      navigate("/checkout");\n      return;\n    }\n    if (unavailable) return;\n    if (product.hasVariants) {\n      navigate(`/products/${product.id}`);\n      return;\n    }\n    onAdd?.();\n  }'
);

data = data.replace(
  '{t("storefront.products.inCart")}',
  '{t("storefront.products.goToCart")}'
);
data = data.replace(
  '{t("storefront.products.inCart")}',
  '{t("storefront.products.goToCart")}'
);

fs.writeFileSync(file, data);
