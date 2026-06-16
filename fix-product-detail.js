const fs = require('fs');

const file = 'artifacts/fashion-store/src/pages/product-detail.tsx';
let data = fs.readFileSync(file, 'utf8');

// Import useLocation
if (!data.includes('useLocation')) {
  data = data.replace('import { useParams, Link } from "wouter";', 'import { useParams, Link, useLocation } from "wouter";');
}

// Update the handleAddToCart logic
data = data.replace(
  '  const params = useParams<{ id?: string; slug?: string; productSlug?: string }>();',
  '  const [, navigate] = useLocation();\n  const params = useParams<{ id?: string; slug?: string; productSlug?: string }>();'
);

data = data.replace(
  '  function handleAddToCart() {\n    if (!product || unavailable || !variantSelectionComplete) return;\n    const item = {\n      productId: product.id,\n      tenantId: product.tenantId,\n      tenantSlug: productTenantSlug,\n      tenantName: product.tenantName,\n      name: product.name,\n      price: product.price,\n      imageUrl: productImageUrl(selectedVariant?.imageUrls?.[0] ?? product.imageUrl),\n      variantId: selectedVariant?.id,\n      variantLabel: [selectedSize, selectedColor].filter(Boolean).join(" / ") || undefined,\n    };\n    for (let i = 0; i < quantity; i += 1) addItem(item);\n  }',
  '  function handleAddToCart() {\n    if (inCart) {\n      navigate("/checkout");\n      return;\n    }\n    if (!product || unavailable || !variantSelectionComplete) return;\n    const item = {\n      productId: product.id,\n      tenantId: product.tenantId,\n      tenantSlug: productTenantSlug,\n      tenantName: product.tenantName,\n      name: product.name,\n      price: product.price,\n      imageUrl: productImageUrl(selectedVariant?.imageUrls?.[0] ?? product.imageUrl),\n      variantId: selectedVariant?.id,\n      variantLabel: [selectedSize, selectedColor].filter(Boolean).join(" / ") || undefined,\n    };\n    for (let i = 0; i < quantity; i += 1) addItem(item);\n  }'
);

data = data.replace(
  '{t("productDetail.addedToCart")}',
  '{t("productDetail.goToCart")}'
);
data = data.replace(
  '{t("productDetail.addedToCart")}',
  '{t("productDetail.goToCart")}'
);

fs.writeFileSync(file, data);
