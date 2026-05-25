const fs = require('fs');
const path = require('path');
const enPath = path.join('src', 'locales', 'en', 'translation.json');
const arPath = path.join('src', 'locales', 'ar', 'translation.json');
const enContent = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const arContent = JSON.parse(fs.readFileSync(arPath, 'utf8'));

enContent.affiliates = {
  page: {
    title: "Affiliates and Commissions Program",
    subtitle: "Create a unique code for each affiliate, track their sales, and calculate their commission automatically",
    btnAdd: "Add Affiliate"
  },
  stats: {
    affiliates: "Affiliates",
    orders: "Converted Order(s)",
    commissionDue: "Commission Due {currency}"
  },
  empty: {
    title: "No affiliates added yet",
    desc: "Add an affiliate and a discount code will be generated automatically — track their sales and commissions here",
    btnAddFirst: "Add first affiliate"
  },
  list: {
    inactive: "Inactive",
    promoCode: "Promo Code:",
    uses: "Uses",
    revenue: "Revenue",
    commission: "Commission",
    due: "Due",
    toggleActive: "Activate",
    toggleInactive: "Deactivate",
    flatPerOrder: "{value} {currency}/order"
  },
  howItWorks: {
    title: "How does the program work?",
    s1Title: "Add an affiliate",
    s1Desc: "Enter their name, account handle, and their discount code",
    s2Title: "Share the code",
    s2Desc: "Their followers use the code when purchasing from your store",
    s3Title: "Track and pay",
    s3Desc: "You see their revenue and commission automatically — pay them monthly"
  },
  form: {
    title: "Add New Affiliate",
    name: "Affiliate Name *",
    namePlaceholder: "Sara Ahmed",
    handle: "Contact Handle *",
    handlePlaceholder: "@sara_style",
    platform: "Platform",
    platformOther: "Other",
    promoSection: "Affiliate Promo Code",
    promoCode: "Promo Code (auto-generated for affiliate) *",
    promoHint: "Shared with followers — cannot be duplicated",
    discountType: "Discount Type",
    discountTypePercent: "Percentage %",
    discountTypeFixed: "Fixed amount {currency}",
    discountValue: "Discount Value",
    commissionSection: "Affiliate Commission",
    commissionType: "Commission Type",
    commissionTypePercent: "% of revenue",
    commissionTypeFlat: "Fixed amount / order",
    commissionValue: "Value",
    commissionHintPercent: "The affiliate gets {value}% of every converted order's value",
    commissionHintFlat: "The affiliate gets {value} {currency} for each completed order",
    notes: "Notes (Optional)",
    notesPlaceholder: "Monthly collaboration, covers dresses category...",
    btnCancel: "Cancel",
    btnAdd: "Add Affiliate",
    btnAdding: "Creating..."
  },
  delete: {
    title: "Delete Affiliate",
    desc: "The affiliate will be deleted from your list. Their discount code will still exist on the discounts page.",
    btnCancel: "Cancel",
    btnDelete: "Delete",
    btnDeleting: "Deleting..."
  },
  toast: {
    fetchError: "Failed to load affiliates",
    createSuccess: "Affiliate added",
    createSuccessDesc: "The code was generated automatically and linked to the affiliate",
    createError: "Creation failed",
    updateError: "Update failed",
    deleteSuccess: "Deleted",
    deleteError: "Deletion failed",
    errorTitle: "Error",
    validationError: "Name, handle and promo code are required"
  },
  copy: {
    copy: "Copy",
    copied: "Copied"
  }
};

arContent.affiliates = {
  page: {
    title: "برنامج المؤثرين والعمولات",
    subtitle: "أنشئ كوداً فريداً لكل مؤثر، تتبع مبيعاته، واحسب عمولته تلقائياً",
    btnAdd: "إضافة مؤثر"
  },
  stats: {
    affiliates: "مؤثرون",
    orders: "طلب محوّل",
    commissionDue: "عمولة مستحقة {currency}"
  },
  empty: {
    title: "لم تضف أي مؤثر بعد",
    desc: "أضف مؤثراً وسيُنشأ له كود خصم تلقائياً — تتبع مبيعاته وعمولاته من هنا",
    btnAddFirst: "إضافة أول مؤثر"
  },
  list: {
    inactive: "متوقف",
    promoCode: "كود الخصم:",
    uses: "استخدامات",
    revenue: "إيرادات",
    commission: "العمولة",
    due: "مستحق",
    toggleActive: "تفعيل",
    toggleInactive: "إيقاف",
    flatPerOrder: "{value} {currency}/طلب"
  },
  howItWorks: {
    title: "كيف يعمل البرنامج؟",
    s1Title: "أضف مؤثراً",
    s1Desc: "أدخل اسمه وحسابه وكود الخصم الخاص به",
    s2Title: "شارك الكود",
    s2Desc: "يستخدم متابعوه الكود عند الشراء من متجرك",
    s3Title: "تتبع وادفع",
    s3Desc: "ترى إيراداته وعمولته تلقائياً — ادفعها له شهرياً"
  },
  form: {
    title: "إضافة مؤثر جديد",
    name: "اسم المؤثر *",
    namePlaceholder: "سارة أحمد",
    handle: "حساب التواصل *",
    handlePlaceholder: "@sara_style",
    platform: "المنصة",
    platformOther: "أخرى",
    promoSection: "كود الخصم للمؤثر",
    promoCode: "كود الخصم (يُنشأ تلقائياً للمؤثر) *",
    promoHint: "يُشارَك مع المتابعين — لا يمكن تكراره",
    discountType: "نوع الخصم",
    discountTypePercent: "نسبة مئوية %",
    discountTypeFixed: "مبلغ ثابت {currency}",
    discountValue: "قيمة الخصم",
    commissionSection: "عمولة المؤثر",
    commissionType: "نوع العمولة",
    commissionTypePercent: "% من الإيراد",
    commissionTypeFlat: "مبلغ ثابت / طلب",
    commissionValue: "القيمة",
    commissionHintPercent: "المؤثر يحصل على {value}% من قيمة كل طلب يُحوّله",
    commissionHintFlat: "المؤثر يحصل على {value} {currency} عن كل طلب مكتمل",
    notes: "ملاحظات (اختياري)",
    notesPlaceholder: "تعاون شهري، يغطي فئة الفساتين...",
    btnCancel: "إلغاء",
    btnAdd: "إضافة المؤثر",
    btnAdding: "جاري الإنشاء..."
  },
  delete: {
    title: "حذف المؤثر",
    desc: "سيتم حذف المؤثر من قائمتك. كود الخصم الخاص به سيظل موجوداً في صفحة الخصومات.",
    btnCancel: "إلغاء",
    btnDelete: "حذف",
    btnDeleting: "جاري الحذف..."
  },
  toast: {
    fetchError: "فشل تحميل المؤثرين",
    createSuccess: "تم إضافة المؤثر",
    createSuccessDesc: "تم إنشاء الكود تلقائياً وربطه بالمؤثر",
    createError: "فشل الإنشاء",
    updateError: "فشل التحديث",
    deleteSuccess: "تم الحذف",
    deleteError: "فشل الحذف",
    errorTitle: "خطأ",
    validationError: "الاسم والحساب وكود الخصم مطلوبة"
  },
  copy: {
    copy: "نسخ",
    copied: "تم النسخ"
  }
};

fs.writeFileSync(enPath, JSON.stringify(enContent, null, 2));
fs.writeFileSync(arPath, JSON.stringify(arContent, null, 2));
