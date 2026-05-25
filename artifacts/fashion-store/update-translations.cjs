const fs = require('fs');
const path = require('path');

function addTranslations(lang, data) {
  const file = path.join(__dirname, 'src/locales', lang, 'translation.json');
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  
  if (!json.sections) {
    json.sections = {};
  }
  Object.assign(json.sections, data.sections);
  
  if (!json.defaultSections) {
    json.defaultSections = {};
  }
  Object.assign(json.defaultSections, data.defaultSections);
  
  fs.writeFileSync(file, JSON.stringify(json, null, 2));
}

// English Translations
const enData = {
  sections: {
    "hero": "Hero Image",
    "new-arrivals": "New Arrivals",
    "best-sellers": "Best Sellers",
    "categories": "Categories",
    "testimonials": "Testimonials",
    "offers": "Offers & Discounts",
    "about": "Our Story",
    "instagram": "Photo Gallery",
    "faq": "FAQ",
    "whatsapp": "WhatsApp Contact",
    "newsletter": "Newsletter",
    "lookbook": "Lookbook",
    "product-catalog": "All Products",
    "trust-strip": "Store Features"
  },
  defaultSections: {
    hero: {
      heading: "Discover the latest collection from {{storeName}}",
      subheading: "Elegant fashion at affordable prices",
      ctaText: "Shop Now"
    },
    newArrivals: {
      heading: "New Arrivals",
      subheading: "The latest products in our collection"
    },
    bestSellers: {
      heading: "Best Sellers",
      subheading: "Our customers' favorite products"
    },
    categories: {
      heading: "Shop by Category"
    }
  }
};

// Arabic Translations
const arData = {
  sections: {
    "hero": "الصورة الرئيسية",
    "new-arrivals": "وصل حديثاً",
    "best-sellers": "الأكثر مبيعاً",
    "categories": "الأقسام",
    "testimonials": "آراء العملاء",
    "offers": "عروض وخصومات",
    "about": "قصة المتجر",
    "instagram": "معرض الصور",
    "faq": "أسئلة شائعة",
    "whatsapp": "تواصل عبر واتساب",
    "newsletter": "اشترك في النشرة",
    "lookbook": "لوك بوك",
    "product-catalog": "جميع المنتجات",
    "trust-strip": "مميزات المتجر"
  },
  defaultSections: {
    hero: {
      heading: "اكتشفي أحدث تشكيلة من {{storeName}}",
      subheading: "أزياء راقية بأسعار تناسبك",
      ctaText: "تسوقي الآن"
    },
    newArrivals: {
      heading: "وصل حديثاً",
      subheading: "أحدث المنتجات في مجموعتنا"
    },
    bestSellers: {
      heading: "الأكثر مبيعاً",
      subheading: "المنتجات المفضلة لعملائنا"
    },
    categories: {
      heading: "تسوقي حسب القسم"
    }
  }
};

addTranslations('en', enData);
addTranslations('ar', arData);
console.log('Translations updated!');
