import {
  ShieldCheck,
  Store, CreditCard, Truck, MessageCircle, BarChart3, Users,
  Zap, Globe, Sparkles
} from "lucide-react";

// You can control all landing page data here.
// Change the text, icons, and values below to reflect your real business data.
// Support for dual languages can be maintained by providing objects for en/ar.

export const LANDING_CONFIG = {
  hero: {
    badge: {
      en: "Nour Egyptian E-Commerce Platform",
      ar: "منصة نور للتجارة الإلكترونية المصرية"
    },
    title1: {
      en: "Open your ",
      ar: "افتح متجرك "
    },
    titleHighlight: {
      en: "Online Store",
      ar: "الإلكتروني"
    },
    title2: {
      en: "in one minute",
      ar: "في دقيقة واحدة"
    },
    subtitle: {
      en: "Nour is a 100% Egyptian platform enabling merchants to create professional fashion and beauty stores. Gather all your orders from different social media platforms into one organized place effortlessly.",
      ar: "نور هي منصة مصرية ١٠٠٪ تُمكّن التجار من إنشاء متاجر أزياء وجمال احترافية. اجمعي كل طلباتك من منصات التواصل الاجتماعي المختلفة في مكان واحد منظم بكل سهولة."
    },
    videoUrl: "/videos/boutique.mp4",
    posterUrl: "/videos/boutique-poster.jpg"
  },
  stats: [
    { value: 500, label: { en: "Active Merchant", ar: "تاجر نشط" }, suffix: "+" },
    { value: 12000, label: { en: "Order Delivered", ar: "طلب تم توصيله" }, suffix: "+" },
    { value: 98, label: { en: "Satisfaction Rate", ar: "نسبة رضا العملاء" }, suffix: "%" },
    { value: 1, label: { en: "Minute to Setup", ar: "دقيقة للإنشاء" }, suffix: "" }
  ],
  features: [
    {
      icon: Store, color: "text-primary bg-primary/10",
      title: { en: "Professional Online Store", ar: "متجر إلكتروني احترافي" },
      desc: { en: "A complete storefront customized for your brand with the best local e-commerce practices.", ar: "واجهة متجر متكاملة مخصصة لعلامتك التجارية بأفضل ممارسات التجارة الإلكترونية المحلية." }
    },
    {
      icon: CreditCard, color: "text-primary bg-accent/15",
      title: { en: "Integrated Payments", ar: "مدفوعات متكاملة" },
      desc: { en: "Accept credit cards and Fawry safely and easily through Paymob. (In progress)", ar: "استقبل المدفوعات بالبطاقات البنكية وفوري بأمان وسهولة عبر Paymob (قريباً)." }
    },
    {
      icon: Truck, color: "text-secondary-foreground bg-secondary",
      title: { en: "Automated Shipping", ar: "شحن أوتوماتيكي" },
      desc: { en: "Seamless integration with Bosta to generate shipping waybills with one click. (In progress)", ar: "ربط سلس مع بوسطة لإنشاء بوالص الشحن بضغطة زر واحدة (قريباً)." }
    },
    {
      icon: MessageCircle, color: "text-primary bg-primary/10",
      title: { en: "WhatsApp API", ar: "واتساب API" },
      desc: { en: "Send automated updates to your customers and increase sales via WhatsApp.", ar: "أرسل تحديثات آلية لعملائك وزد مبيعاتك عبر الواتساب." }
    },
    {
      icon: BarChart3, color: "text-primary bg-accent/15",
      title: { en: "Detailed Analytics", ar: "تحليلات دقيقة" },
      desc: { en: "Understand your customers' behavior and make decisions based on real data.", ar: "افهم سلوك عملائك واتخذ قراراتك بناءً على بيانات حقيقية." }
    },
    {
      icon: Users, color: "text-secondary-foreground bg-secondary",
      title: { en: "Team Management", ar: "إدارة فريق العمل" },
      desc: { en: "Add employees with custom permissions to manage orders and products.", ar: "أضف موظفيك بصلاحيات مخصصة لإدارة الطلبات والمنتجات." }
    }
  ],
  howItWorks: {
    videoUrl: "/videos/shopping.mp4",
    posterUrl: "/videos/shopping-poster.jpg",
    steps: [
      {
        num: "1", icon: Zap,
        title: { en: "Create your account", ar: "سجل حسابك" },
        desc: { en: "Enter your store details and choose the design that suits your brand.", ar: "أدخل بيانات متجرك واختر التصميم الذي يناسب علامتك التجارية." }
      },
      {
        num: "2", icon: Sparkles,
        title: { en: "Add your products", ar: "أضف منتجاتك" },
        desc: { en: "Upload photos, prices, and details of your products easily.", ar: "ارفع صور وأسعار وتفاصيل منتجاتك بكل سهولة." }
      },
      {
        num: "3", icon: Globe,
        title: { en: "Start selling", ar: "ابدأ البيع" },
        desc: { en: "Share your store link and start receiving orders immediately.", ar: "شارك رابط متجرك وابدأ استقبال الطلبات فوراً." }
      }
    ]
  },
  pricing: [
    {
      name: { en: "Free", ar: "مجاني" },
      price: "0",
      desc: { en: "For a strong start", ar: "لبداية قوية" },
      badge: null,
      features: [
        { en: "Full online store", ar: "متجر إلكتروني كامل" },
        { en: "Up to 20 products", ar: "حتى ٢٠ منتج" },
        { en: "Cash on delivery", ar: "دفع عند الاستلام" },
        { en: "Arabic RTL interface", ar: "واجهة عربية RTL" },
        { en: "Manual WhatsApp Support", ar: "دعم واتساب يدوي" }
      ],
      cta: { en: "Start Free", ar: "ابدأ مجاناً" },
      href: "/register",
      variant: "outline" as const
    },
    {
      name: { en: "Pro", ar: "احترافي" },
      price: "499",
      desc: { en: "Monthly / per store", ar: "شهرياً / لكل متجر" },
      badge: { en: "Most Popular", ar: "الأكثر شيوعاً" },
      features: [
        { en: "Unlimited products", ar: "منتجات غير محدودة" },
        { en: "Paymob — E-payment (In progress)", ar: "Paymob — دفع إلكتروني (قريباً)" },
        { en: "Automated Bosta shipping (In progress)", ar: "شحن بوسطة تلقائي (قريباً)" },
        { en: "Automated WhatsApp API", ar: "واتساب API أوتوماتيك" },
        { en: "Advanced analytics", ar: "تحليلات متقدمة" },
        { en: "Custom Domain", ar: "نطاق خاص (Domain)" },
        { en: "Priority support", ar: "دعم أولوية" }
      ],
      cta: { en: "Try 30 days free", ar: "جرّب ٣٠ يوم مجاناً" },
      href: "/register",
      variant: "default" as const
    },
    {
      name: { en: "Enterprise", ar: "مؤسسي" },
      price: "999",
      desc: { en: "Monthly / unlimited stores", ar: "شهرياً / متاجر غير محدودة" },
      badge: null,
      features: [
        { en: "All professional features", ar: "كل مميزات الاحترافي" },
        { en: "Multiple stores", ar: "متاجر متعددة" },
        { en: "Custom integrations", ar: "ربط مخصص (API)" },
        { en: "Dedicated account manager", ar: "مدير حساب مخصص" },
        { en: "Advanced reports", ar: "تقارير متقدمة" }
      ],
      cta: { en: "Contact us", ar: "تواصل معنا" },
      href: "/register",
      variant: "outline" as const
    }
  ],
  testimonials: [
    {
      name: { en: "Sara Mohamed", ar: "سارة محمد" },
      store: { en: "Pearl Boutique", ar: "بوتيك لؤلؤة" },
      text: { en: "I opened my store in less than an hour and received my first order the same day! Nour changed my professional life.", ar: "فتحت متجري في أقل من ساعة وأول طلب وصلني في نفس اليوم! نور غيّر حياتي المهنية." },
      stars: 5
    },
    {
      name: { en: "Mai Ahmed", ar: "مي أحمد" },
      store: { en: "Beauty World", ar: "عالم الجمال" },
      text: { en: "Payment via Paymob and Bosta shipping with one click — saved me hours every day.", ar: "الدفع عبر Paymob وشحن بوسطة بنقرة واحدة — وفّر عليّ ساعات كل يوم." },
      stars: 5
    },
    {
      name: { en: "Nadine Hossam", ar: "نادين حسام" },
      store: { en: "Style House", ar: "ستايل هاوس" },
      text: { en: "The Arabic interface is excellent and very easy for my team to use.", ar: "واجهة الاستخدام العربية ممتازة وسهلة جداً لفريق العمل الخاص بي." },
      stars: 5
    }
  ],
  trustBar: [
    { icon: ShieldCheck, text: { en: "Secure SSL encrypted", ar: "تشفير SSL آمن" } },
    { icon: Zap, text: { en: "99.9% Uptime guarantee", ar: "ثبات ٩٩.٩٪" } },
    { icon: Globe, text: { en: "Servers inside Egypt", ar: "سيرفرات داخل مصر" } },
    { icon: Users, text: { en: "Arabic support 7 days", ar: "دعم بالعربي ٧ أيام" } }
  ],
  cta: {
    title: { en: "Ready to open your store?", ar: "جاهزة تفتحي متجرك؟" },
    subtitle: { en: "Join more than 500 Egyptian merchants building their commercial future with Nour.", ar: "انضمي لأكثر من ٥٠٠ تاجرة مصرية تبني مستقبلها التجاري مع نور." }
  }
};
