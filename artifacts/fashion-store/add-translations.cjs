const fs = require('fs');
const path = require('path');
const enPath = path.join('src', 'locales', 'en', 'translation.json');
const arPath = path.join('src', 'locales', 'ar', 'translation.json');
const enContent = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const arContent = JSON.parse(fs.readFileSync(arPath, 'utf8'));

enContent.sectionPreview = {
  edit: "Edit",
  defaults: {
    heroHeading: "Main Heading",
    heroSubheading: "Subheading Text",
    heroCta: "Shop Now",
    heroNewArrival: "New Arrival",
    newArrivalTag: "NEW",
    popularTag: "POPULAR",
    catalogTag: "CATALOG",
    catalogHeading: "All Products",
    catalogProducts: "Store Products",
    catalogFilters: ["All", "Fashion", "Beauty", "Perfumes"],
    categoriesHeading: "Categories",
    categoriesEmpty: "Add categories from the categories tab to show them here",
    categoriesDummy: ["Fashion", "Care", "Accessories", "Perfumes"],
    offersHeading: "30% OFF",
    offersCta: "Get the offer",
    aboutTag: "Our Story",
    newsletterCta: "Subscribe",
    whatsappCta: "Contact via WhatsApp"
  }
};

arContent.sectionPreview = {
  edit: "تعديل",
  defaults: {
    heroHeading: "العنوان الرئيسي",
    heroSubheading: "النص التوضيحي",
    heroCta: "تسوقي الآن",
    heroNewArrival: "وصل حديثاً",
    newArrivalTag: "NEW",
    popularTag: "POPULAR",
    catalogTag: "CATALOG",
    catalogHeading: "جميع المنتجات",
    catalogProducts: "منتجات المتجر",
    catalogFilters: ["الكل", "أزياء", "جمال", "عطور"],
    categoriesHeading: "الأقسام",
    categoriesEmpty: "أضيفي الفئات من تبويب الفئات لتظهر هنا",
    categoriesDummy: ["أزياء", "عناية", "إكسسوار", "عطور"],
    offersHeading: "خصم 30%",
    offersCta: "احصلي على العرض",
    aboutTag: "قصتنا",
    newsletterCta: "اشتركي",
    whatsappCta: "تواصلي عبر واتساب"
  }
};

fs.writeFileSync(enPath, JSON.stringify(enContent, null, 2));
fs.writeFileSync(arPath, JSON.stringify(arContent, null, 2));
