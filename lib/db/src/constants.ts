export const DEFAULT_CATEGORIES = [
  { name: "Clothing", nameAr: "ملابس", type: "fashion" as const },
  { name: "Accessories", nameAr: "إكسسوارات", type: "fashion" as const },
  { name: "Cosmetics", nameAr: "مستحضرات تجميل", type: "cosmetics" as const },
  { name: "Perfumes", nameAr: "عطور", type: "cosmetics" as const },
];

export const DEFAULT_SHIPPING_ZONES_CONFIG = [
  {
    governorates: ["cairo", "giza", "qalyubia"],
    baseCost: 45,
    deliveryDays: 2,
  },
  {
    governorates: ["alexandria"],
    baseCost: 55,
    deliveryDays: 3,
  },
  {
    governorates: ["sharqia", "dakahlia", "beheira", "kafr_el_sheikh", "gharbia", "menoufia", "damietta"],
    baseCost: 55,
    deliveryDays: 3,
  },
  {
    governorates: ["port_said", "ismailia", "suez"],
    baseCost: 60,
    deliveryDays: 4,
  },
  {
    governorates: ["fayoum", "beni_suef", "minya", "asyut", "sohag", "qena", "luxor", "aswan"],
    baseCost: 70,
    deliveryDays: 5,
  },
  {
    governorates: ["red_sea", "matrouh", "north_sinai", "south_sinai", "new_valley"],
    baseCost: 90,
    deliveryDays: 7,
  },
];
