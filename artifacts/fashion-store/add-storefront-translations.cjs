const fs = require('fs');
const path = require('path');
const enPath = path.join('src', 'locales', 'en', 'translation.json');
const arPath = path.join('src', 'locales', 'ar', 'translation.json');
const enContent = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const arContent = JSON.parse(fs.readFileSync(arPath, 'utf8'));

enContent.storefront = {
  announcement: {
    freeShipping: "Free shipping on orders over EGP 1000",
    useCode: "Use code WELCOME10 for 10% off your first order",
    close: "Close announcement"
  },
  header: {
    search: "Search",
    cart: "Cart",
    menu: "Menu",
    links: {
      home: "Home",
      products: "Products",
      categories: "Categories",
      offers: "Offers"
    }
  },
  footer: {
    about: "About Us",
    contact: "Contact Us",
    quickLinks: "Quick Links",
    policies: "Policies",
    links: {
      shipping: "Shipping Policy",
      returns: "Return Policy",
      privacy: "Privacy Policy",
      terms: "Terms of Service",
      faq: "FAQ"
    },
    rights: "All rights reserved.",
    developedBy: "Developed by Nour"
  },
  hero: {
    shopNow: "Shop Now"
  },
  categories: {
    viewAll: "View All Products"
  },
  products: {
    newArrivals: "New Arrivals",
    bestSellers: "Best Sellers",
    trending: "Trending Now",
    viewAll: "View All",
    addToCart: "Add to Cart",
    outOfStock: "Out of Stock",
    soldOut: "Sold Out",
    quickAdd: "Quick Add",
    selectOptions: "Select Options"
  },
  trust: {
    shipping: "Free Shipping",
    shippingDesc: "On orders over 1000 EGP",
    returns: "Easy Returns",
    returnsDesc: "Within 14 days",
    support: "24/7 Support",
    supportDesc: "We're here to help",
    secure: "Secure Payments",
    secureDesc: "100% protected"
  },
  newsletter: {
    title: "Join Our Newsletter",
    subtitle: "Get updates on new arrivals and exclusive offers.",
    placeholder: "Your Email Address",
    subscribe: "Subscribe",
    success: "Thank you for subscribing!"
  },
  search: {
    placeholder: "Search for products...",
    noResults: "No results found for",
    popular: "Popular Searches"
  },
  lookbook: {
    title: "Editorial Lookbook",
    subtitle: "Discover the latest styles",
    shopLook: "Shop the Look"
  },
  promo: {
    shopNow: "Shop Now"
  },
  ugc: {
    title: "Join Our Community",
    subtitle: "Tag us on Instagram to be featured",
    follow: "Follow Us"
  },
  beauty: {
    title: "Your Beauty Routine",
    subtitle: "Handpicked products for your daily care",
    step1: "Cleanse",
    step2: "Treat",
    step3: "Moisturize",
    step4: "Protect"
  },
  checkout: {
    title: "Checkout",
    contact: "Contact Information",
    shipping: "Shipping Address",
    payment: "Payment",
    summary: "Order Summary",
    subtotal: "Subtotal",
    shippingFee: "Shipping Fee",
    total: "Total",
    placeOrder: "Place Order",
    email: "Email Address",
    phone: "Phone Number",
    fullName: "Full Name",
    address: "Address",
    city: "City",
    governorate: "Governorate",
    notes: "Order Notes (Optional)",
    cod: "Cash on Delivery",
    online: "Online Payment",
    applyCode: "Apply Code",
    discountCode: "Discount Code",
    backToCart: "Back to Cart"
  },
  orderConfirmation: {
    title: "Order Confirmed!",
    subtitle: "Thank you for your order. We've sent a confirmation email.",
    orderId: "Order ID",
    trackOrder: "Track Order",
    continueShopping: "Continue Shopping",
    status: {
      pending: "Pending",
      processing: "Processing",
      shipped: "Shipped",
      delivered: "Delivered",
      cancelled: "Cancelled"
    },
    dear: "Dear",
    thankYou: "Thank you, ",
    paymentSuccess: "Your payment was received successfully. Your order will be processed and shipped soon.",
    paidOnline: "Paid online via Paymob",
    orderIds: "Order IDs",
    whatsappTitle: "Get order confirmation on WhatsApp",
    whatsappDesc: "Tap to open confirmation message for",
    whatsappBtn: "Send confirmation on WhatsApp",
    bostaTitle: "Delivery by Bosta",
    bostaDesc: "The store will create your shipment within 24 hours — you'll receive a tracking number"
  },
  orderTrack: {
    status: {
      pending: "Pending Review",
      confirmed: "Confirmed",
      dispatched: "Dispatched",
      shipped: "On the way",
      delivered: "Delivered",
      cancelled: "Cancelled",
      returned: "Returned"
    },
    invalidLink: "Invalid order link",
    home: "Home",
    loading: "Searching for your order...",
    notFound: "Order not found",
    notFoundDesc: "Check the order number or contact the store",
    title: "Track Your Order",
    orderNo: "Order No.",
    statusLabel: "Order Status",
    trackingNo: "Tracking Number",
    timeline: "Order Timeline",
    details: "Order Details",
    total: "Total",
    store: "Store",
    visitStore: "Visit Store"
  },
  error: {
    notFoundTitle: "Store Not Found",
    notFoundDesc: "We couldn't find a store with this link.",
    browseStores: "Browse Stores"
  }
};

arContent.storefront = {
  announcement: {
    freeShipping: "شحن مجاني للطلبات فوق 1000 جنيه",
    useCode: "استخدمي كود WELCOME10 لخصم 10% على أول طلب",
    close: "إغلاق الإعلان"
  },
  header: {
    search: "بحث",
    cart: "السلة",
    menu: "القائمة",
    links: {
      home: "الرئيسية",
      products: "المنتجات",
      categories: "الأقسام",
      offers: "العروض"
    }
  },
  footer: {
    about: "من نحن",
    contact: "تواصل معنا",
    quickLinks: "روابط سريعة",
    policies: "السياسات",
    links: {
      shipping: "سياسة الشحن",
      returns: "سياسة الإرجاع",
      privacy: "سياسة الخصوصية",
      terms: "الشروط والأحكام",
      faq: "الأسئلة الشائعة"
    },
    rights: "جميع الحقوق محفوظة.",
    developedBy: "طُوِّر بواسطة نور"
  },
  hero: {
    shopNow: "تسوقي الآن"
  },
  categories: {
    viewAll: "تصفح جميع المنتجات"
  },
  products: {
    newArrivals: "وصل حديثاً",
    bestSellers: "الأكثر مبيعاً",
    trending: "رائج الآن",
    viewAll: "عرض الكل",
    addToCart: "أضف للسلة",
    outOfStock: "نفذت الكمية",
    soldOut: "مباع بالكامل",
    quickAdd: "إضافة سريعة",
    selectOptions: "اختيار الخيارات"
  },
  trust: {
    shipping: "شحن مجاني",
    shippingDesc: "للطلبات فوق 1000 جنيه",
    returns: "إرجاع سهل",
    returnsDesc: "خلال 14 يوم",
    support: "دعم فني",
    supportDesc: "متواجدون لمساعدتك",
    secure: "دفع آمن",
    secureDesc: "حماية 100%"
  },
  newsletter: {
    title: "انضمي لنشرتنا البريدية",
    subtitle: "احصلي على آخر الأخبار والعروض الحصرية.",
    placeholder: "البريد الإلكتروني",
    subscribe: "اشتراك",
    success: "شكراً لاشتراكك!"
  },
  search: {
    placeholder: "ابحث عن منتجات...",
    noResults: "لا توجد نتائج لـ",
    popular: "عمليات بحث شائعة"
  },
  lookbook: {
    title: "إطلالات الموسم",
    subtitle: "اكتشفي أحدث صيحات الموضة",
    shopLook: "تسوقي الإطلالة"
  },
  promo: {
    shopNow: "تسوقي الآن"
  },
  ugc: {
    title: "انضمي لمجتمعنا",
    subtitle: "شاركينا صورك على إنستجرام",
    follow: "تابعينا"
  },
  beauty: {
    title: "روتين جمالك",
    subtitle: "منتجات مختارة لعنايتك اليومية",
    step1: "تنظيف",
    step2: "علاج",
    step3: "ترطيب",
    step4: "حماية"
  },
  checkout: {
    title: "إتمام الطلب",
    contact: "معلومات التواصل",
    shipping: "عنوان الشحن",
    payment: "الدفع",
    summary: "ملخص الطلب",
    subtotal: "المجموع الفرعي",
    shippingFee: "رسوم الشحن",
    total: "الإجمالي",
    placeOrder: "تأكيد الطلب",
    email: "البريد الإلكتروني",
    phone: "رقم الهاتف",
    fullName: "الاسم الكامل",
    address: "العنوان",
    city: "المدينة",
    governorate: "المحافظة",
    notes: "ملاحظات الطلب (اختياري)",
    cod: "الدفع عند الاستلام",
    online: "الدفع الإلكتروني",
    applyCode: "تطبيق",
    discountCode: "كود الخصم",
    backToCart: "العودة للسلة"
  },
  orderConfirmation: {
    title: "تم تأكيد طلبك!",
    subtitle: "شكراً لتسوقك معنا. أرسلنا تفاصيل الطلب لبريدك الإلكتروني.",
    orderId: "رقم الطلب",
    trackOrder: "تتبع الطلب",
    continueShopping: "مواصلة التسوق",
    status: {
      pending: "قيد الانتظار",
      processing: "قيد التجهيز",
      shipped: "تم الشحن",
      delivered: "تم التوصيل",
      cancelled: "ملغي"
    },
    dear: "عزيزتنا",
    thankYou: "شكرًا لكِ، ",
    paymentSuccess: "تم استلام دفعتك بنجاح. سيتم تجهيز طلبك وشحنه في أقرب وقت.",
    paidOnline: "تم الدفع إلكترونياً عبر Paymob",
    orderIds: "أرقام الطلبات",
    whatsappTitle: "احصلي على تأكيد الطلب على واتساب",
    whatsappDesc: "اضغطي لفتح رسالة التأكيد على",
    whatsappBtn: "إرسال تأكيد الطلب على واتساب",
    bostaTitle: "التوصيل عبر بوسطة",
    bostaDesc: "سيقوم المتجر بإنشاء شحنتكِ خلال 24 ساعة — ستصلكِ رسالة برقم التتبع"
  },
  orderTrack: {
    status: {
      pending: "قيد المراجعة",
      confirmed: "مؤكد",
      dispatched: "تم الإرسال",
      shipped: "في الطريق",
      delivered: "تم التسليم",
      cancelled: "ملغي",
      returned: "مرتجع"
    },
    invalidLink: "رابط تتبع غير صالح",
    home: "الرئيسية",
    loading: "جارٍ البحث عن طلبك...",
    notFound: "لم يتم العثور على الطلب",
    notFoundDesc: "تأكد من رقم الطلب أو تواصل مع المتجر",
    title: "تتبع طلبك",
    orderNo: "رقم الطلب",
    statusLabel: "حالة الطلب",
    trackingNo: "رقم التتبع",
    timeline: "مراحل الطلب",
    details: "تفاصيل الطلب",
    total: "الإجمالي",
    store: "المتجر",
    visitStore: "زيارة المتجر"
  },
  error: {
    notFoundTitle: "المتجر غير موجود",
    notFoundDesc: "لم نتمكن من العثور على متجر بهذا الرابط.",
    browseStores: "استعرضي المتاجر"
  }
};

fs.writeFileSync(enPath, JSON.stringify(enContent, null, 2));
fs.writeFileSync(arPath, JSON.stringify(arContent, null, 2));
