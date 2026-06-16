const fs = require('fs');

const file = 'artifacts/fashion-store/src/components/product-card.tsx';
let data = fs.readFileSync(file, 'utf8');

data = data.replace(
  '  function handleAddToCart(e: React.MouseEvent) {\n    e.preventDefault();\n    e.stopPropagation();\n    if (unavailable) return;\n    // Products with variants MUST select options on the detail page first\n    if (product.hasVariants) {\n      navigate(`/products/${product.id}`);\n      return;\n    }\n    addItem({\n      productId: product.id,\n      tenantId: product.tenantId,\n      tenantName: product.tenantName,\n      name: product.name,\n      price: product.price,\n      imageUrl: product.imageUrl ?? null,\n    });\n  }',
  '  function handleAddToCart(e: React.MouseEvent) {\n    e.preventDefault();\n    e.stopPropagation();\n    if (inCart) {\n      navigate("/checkout");\n      return;\n    }\n    if (unavailable) return;\n    // Products with variants MUST select options on the detail page first\n    if (product.hasVariants) {\n      navigate(`/products/${product.id}`);\n      return;\n    }\n    addItem({\n      productId: product.id,\n      tenantId: product.tenantId,\n      tenantName: product.tenantName,\n      name: product.name,\n      price: product.price,\n      imageUrl: product.imageUrl ?? null,\n    });\n  }'
);

fs.writeFileSync(file, data);
