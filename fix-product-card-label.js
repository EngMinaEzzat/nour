const fs = require('fs');

const file = 'artifacts/fashion-store/src/components/product-card.tsx';
let data = fs.readFileSync(file, 'utf8');

data = data.replace(
  'aria-label={product.hasVariants ? t("productCard.selectOptions") : inCart ? t("productCard.addedToBag") : t("productCard.addToBag")}',
  'aria-label={product.hasVariants ? t("productCard.selectOptions") : inCart ? t("productDetail.goToCart") : t("productCard.addToBag")}'
);

fs.writeFileSync(file, data);
