const fs = require('fs');

const fileAr = 'artifacts/fashion-store/src/locales/ar/translation.json';
const fileEn = 'artifacts/fashion-store/src/locales/en/translation.json';

let arData = JSON.parse(fs.readFileSync(fileAr, 'utf8'));
let enData = JSON.parse(fs.readFileSync(fileEn, 'utf8'));

arData.productDetail.goToCart = "اذهب إلى السلة";
enData.productDetail.goToCart = "Go to cart";

arData.storefront.products.goToCart = "اذهب إلى السلة";
enData.storefront.products.goToCart = "Go to cart";

fs.writeFileSync(fileAr, JSON.stringify(arData, null, 2));
fs.writeFileSync(fileEn, JSON.stringify(enData, null, 2));
