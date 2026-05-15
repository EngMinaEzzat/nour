export const DEFAULT_CATEGORIES = [
  { name: "Clothing", nameAr: "ملابس", type: "fashion" as const },
  { name: "Accessories", nameAr: "إكسسوارات", type: "fashion" as const },
  { name: "Cosmetics", nameAr: "مستحضرات تجميل", type: "cosmetics" as const },
  { name: "Perfumes", nameAr: "عطور", type: "cosmetics" as const },
];

export const DEFAULT_SHIPPING_ZONES_CONFIG = [
  {
    governorates: ["القاهرة", "الجيزة", "القليوبية"],
    baseCost: 45,
    deliveryDays: 2,
  },
  {
    governorates: ["الإسكندرية"],
    baseCost: 55,
    deliveryDays: 3,
  },
  {
    governorates: ["الشرقية", "الدقهلية", "البحيرة", "كفر الشيخ", "الغربية", "المنوفية", "دمياط"],
    baseCost: 55,
    deliveryDays: 3,
  },
  {
    governorates: ["بورسعيد", "الإسماعيلية", "السويس"],
    baseCost: 60,
    deliveryDays: 4,
  },
  {
    governorates: ["الفيوم", "بني سويف", "المنيا", "أسيوط", "سوهاج", "قنا", "الأقصر", "أسوان"],
    baseCost: 70,
    deliveryDays: 5,
  },
  {
    governorates: ["البحر الأحمر", "مطروح", "شمال سيناء", "جنوب سيناء", "الوادي الجديد"],
    baseCost: 90,
    deliveryDays: 7,
  },
];
