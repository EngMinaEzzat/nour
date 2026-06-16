import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Search, Heart, ShoppingBag, Menu, X, ArrowRight, Instagram, Facebook, Twitter, Youtube, Truck, RotateCcw, ShieldCheck, Star } from "lucide-react";

const COLORS = {
  bg: "#faf7f4",
  deepBg: "#f5f0ea",
  primary: "#8B1A35",
  rose: "#c97b8b",
  gold: "#c8963a",
  charcoal: "#1f1414",
  muted: "#7a6060",
  white: "#ffffff",
  blush: "rgba(201,123,139,0.08)",
};

const FONTS = {
  heading: "'Cormorant Garamond', serif",
  body: "'Cairo', sans-serif",
};

// Data arrays
const CATEGORIES = [
  { name: "فساتين", image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80" },
  { name: "ميك أب", image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&q=80" },
  { name: "عناية بالبشرة", image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&q=80" },
  { name: "عطور", image: "https://images.unsplash.com/photo-1541643600914-78b084683702?w=600&q=80" },
];

const NEW_ARRIVALS = [
  { id: 1, name: "فستان سهرة مخملي", brand: "Nour Collection", price: "2,450 EGP", rating: 5, count: 12, image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&q=80", badge: "جديد" },
  { id: 2, name: "أحمر شفاه مطفي", brand: "Lumière", price: "450 EGP", rating: 4.8, count: 54, image: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=400&q=80", badge: "خصم 20%" },
  { id: 3, name: "فستان صيفي مشجر", brand: "Nour Collection", price: "1,850 EGP", rating: 4.9, count: 28, image: "https://images.unsplash.com/photo-1566479179817-c0e6a9bb1adf?w=400&q=80" },
  { id: 4, name: "سيروم فيتامين سي", brand: "Pure Skin", price: "850 EGP", rating: 5, count: 105, image: "https://images.unsplash.com/photo-1631730359585-38a4935cbec4?w=400&q=80", badge: "جديد" },
  { id: 5, name: "طقم كاجوال قطعتين", brand: "Urban Chic", price: "1,200 EGP", rating: 4.7, count: 16, image: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&q=80" },
  { id: 6, name: "عطر ليالي الشرق", brand: "Oud & Rose", price: "3,200 EGP", rating: 5, count: 42, image: "https://images.unsplash.com/photo-1512207736890-6ffed8a84e8d?w=400&q=80" },
  { id: 7, name: "فستان حرير طويل", brand: "Nour Collection", price: "2,900 EGP", rating: 4.9, count: 9, image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400&q=80", badge: "جديد" },
  { id: 8, name: "باليت ظلال عيون", brand: "Color Pop", price: "1,150 EGP", rating: 4.6, count: 88, image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=80", badge: "خصم 15%" },
];

const ROUTINE_STEPS = [
  { step: 1, title: "تنظيف البشرة", desc: "غسول لطيف يزيل الشوائب", icon: "🫧" },
  { step: 2, title: "مرطب وكريم", desc: "ترطيب عميق يدوم طويلاً", icon: "💧" },
  { step: 3, title: "مكياج خفيف", desc: "إطلالة طبيعية مشرقة", icon: "✨" },
  { step: 4, title: "عطر مميز", desc: "لمسة نهائية ساحرة", icon: "🌸" },
];

const TRENDING = [
  { id: 101, name: "بلوزة حرير", price: "950 EGP", image: "https://images.unsplash.com/photo-1550639524-a6f58345a059?w=400&q=80" },
  { id: 102, name: "كريم أساس تغطية كاملة", price: "1,200 EGP", image: "https://images.unsplash.com/photo-1599305090598-fe179d501227?w=400&q=80" },
  { id: 103, name: "فستان ميدي", price: "1,600 EGP", image: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400&q=80" },
  { id: 104, name: "ماسكارا تطويل", price: "350 EGP", image: "https://images.unsplash.com/photo-1512496015851-a1dc8bc41ba5?w=400&q=80" },
  { id: 105, name: "عطر نهاري", price: "1,800 EGP", image: "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=400&q=80" },
  { id: 106, name: "حقيبة يد جلد", price: "2,100 EGP", image: "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=400&q=80" },
];

const BEST_SELLERS = [
  { id: 201, name: "سيروم النضارة", price: "900 EGP", image: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400&q=80" },
  { id: 202, name: "فستان سهرة أسود", price: "3,500 EGP", image: "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=400&q=80" },
  { id: 203, name: "عطر Signature", price: "4,200 EGP", image: "https://images.unsplash.com/photo-1541643600914-78b084683702?w=400&q=80" },
  { id: 204, name: "باليت الألوان الترابية", price: "1,450 EGP", image: "https://images.unsplash.com/photo-1512496015851-a1dc8bc41ba5?w=400&q=80" },
];

const UGC_IMAGES = [
  "https://images.unsplash.com/photo-1529139574466-a303027c028b?w=400&q=80",
  "https://images.unsplash.com/photo-1515347619152-16e6d1c81211?w=400&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&q=80",
  "https://images.unsplash.com/photo-1485230405346-71acb9518d9c?w=400&q=80",
  "https://images.unsplash.com/photo-1516726817505-f5ed825624d8?w=400&q=80",
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80",
];

// Reusable Components
const FadeIn = ({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-10%" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.8, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </motion.div>
  );
};

export function Homepage() {
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [activeTab, setActiveTab] = useState("الكل");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div style={{ backgroundColor: COLORS.bg, color: COLORS.charcoal, fontFamily: FONTS.body, direction: "rtl" }} className="min-h-screen overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Cairo:wght@400;500;600&display=swap');
        
        .marquee-container {
          overflow: hidden;
          white-space: nowrap;
          display: flex;
        }
        .marquee-content {
          display: flex;
          animation: marquee 20s linear infinite;
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(50%); }
        }
        
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .product-card:hover .quick-add {
          transform: translateY(0);
          opacity: 1;
        }
        .product-card:hover .product-img {
          transform: scale(1.05);
        }
        
        .editorial-overlay {
          background: linear-gradient(to top, rgba(31, 20, 20, 0.8) 0%, transparent 100%);
        }
      `}</style>

      {/* 1. Announcement Bar */}
      <AnimatePresence>
        {showAnnouncement && (
          <motion.div 
            initial={{ height: 36, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ backgroundColor: COLORS.primary }}
            className="text-white text-sm relative flex items-center justify-center overflow-hidden"
          >
            <div className="marquee-container w-full py-2">
              <div className="marquee-content whitespace-nowrap px-4 font-medium" style={{ fontFamily: FONTS.body }}>
                ✦ شحن مجاني على الطلبات فوق 500 جنيه ✦ تشكيلة العيد وصلت ✦ كود NOUR15 للخصم ✦ NEW ARRIVALS EVERY FRIDAY ✦ شحن مجاني على الطلبات فوق 500 جنيه ✦ تشكيلة العيد وصلت ✦ كود NOUR15 للخصم ✦ NEW ARRIVALS EVERY FRIDAY ✦
              </div>
            </div>
            <button 
              onClick={() => setShowAnnouncement(false)}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Sticky Glass Header */}
      <header 
        className={`sticky top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'shadow-sm backdrop-blur-xl' : ''}`}
        style={{ 
          height: '64px',
          backgroundColor: isScrolled ? 'rgba(255,255,255,0.8)' : 'transparent',
        }}
      >
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="lg:hidden" onClick={() => setShowMobileMenu(true)}>
              <Menu size={24} />
            </button>
            <div className="flex flex-col items-center">
              <h1 style={{ fontFamily: FONTS.heading }} className="text-3xl font-light tracking-wide">نـور</h1>
              <span className="text-[9px] tracking-[0.2em] text-gray-500 uppercase" style={{ fontFamily: FONTS.body }}>FASHION & BEAUTY</span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-8 text-[15px] font-medium">
            {['Women', 'Dresses', 'Cosmetics', 'Sale', 'About'].map((item) => (
              <a key={item} href="#" className="relative group overflow-hidden pb-1">
                <span className="group-hover:text-[#8B1A35] transition-colors">{item}</span>
                <span className="absolute bottom-0 right-0 w-full h-[1px] bg-[#8B1A35] transform translate-x-full group-hover:translate-x-0 transition-transform duration-300"></span>
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-5">
            <button onClick={() => setShowSearch(true)} className="hover:text-[#8B1A35] transition-colors"><Search size={20} strokeWidth={1.5} /></button>
            <button className="hidden sm:block hover:text-[#8B1A35] transition-colors"><Heart size={20} strokeWidth={1.5} /></button>
            <button className="relative hover:text-[#8B1A35] transition-colors">
              <ShoppingBag size={20} strokeWidth={1.5} />
              <span className="absolute -top-1.5 -right-2 bg-[#8B1A35] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">2</span>
            </button>
          </div>
        </div>
      </header>

      {/* 3. Search Overlay */}
      <AnimatePresence>
        {showSearch && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] backdrop-blur-md flex flex-col pt-32 px-4"
            style={{ backgroundColor: 'rgba(31, 20, 20, 0.7)' }}
          >
            <button onClick={() => setShowSearch(false)} className="absolute top-6 left-6 text-white hover:opacity-70">
              <X size={32} />
            </button>
            <div className="container mx-auto max-w-3xl">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="ابحثي عن منتجاتك المفضلة..." 
                  className="w-full bg-transparent border-b-2 border-white/30 text-white text-3xl pb-4 px-2 focus:outline-none focus:border-white placeholder:text-white/40 transition-colors"
                  autoFocus
                />
                <Search size={32} className="absolute left-2 top-2 text-white/50" />
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <span className="text-white/60 text-sm py-2">Popular Searches:</span>
                {['فساتين سهرة', 'لبس بيتي', 'روج', 'كريم أساس', 'عطور'].map(tag => (
                  <button key={tag} className="px-4 py-2 rounded-full border border-white/20 text-white hover:bg-white hover:text-[#1f1414] transition-all text-sm">
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {showMobileMenu && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
              onClick={() => setShowMobileMenu(false)}
            />
            <motion.div 
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed top-0 right-0 bottom-0 w-4/5 max-w-sm bg-white z-[70] shadow-2xl p-6 flex flex-col"
            >
              <button onClick={() => setShowMobileMenu(false)} className="self-end mb-8"><X size={24} /></button>
              <nav className="flex flex-col gap-6 text-xl">
                {['Women', 'Dresses', 'Cosmetics', 'Sale', 'About'].map((item) => (
                  <a key={item} href="#" className="border-b border-gray-100 pb-2">{item}</a>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 4. Hero Section */}
      <section className="w-full flex flex-col-reverse md:flex-row" style={{ height: 'calc(85vh - 64px)' }}>
        <div className="w-full md:w-[45%] h-1/2 md:h-full flex flex-col justify-center px-8 lg:px-16" style={{ backgroundColor: COLORS.deepBg }}>
          <FadeIn>
            <span className="text-xs font-bold tracking-[0.2em] mb-4 block" style={{ color: COLORS.muted }}>NEW COLLECTION — SS 2025</span>
            <h2 className="text-5xl md:text-6xl lg:text-7xl mb-4 leading-tight" style={{ fontFamily: FONTS.heading, color: COLORS.charcoal }}>أناقة<br/>بلا حدود</h2>
            <p className="text-lg md:text-xl italic mb-8 text-gray-600" style={{ fontFamily: FONTS.heading }}>Curated fashion & beauty for the modern Egyptian woman</p>
            
            <div className="w-16 h-1 mb-8" style={{ backgroundColor: COLORS.gold }}></div>
            
            <div className="flex flex-wrap gap-4">
              <button className="px-8 py-3 text-white font-medium hover:opacity-90 transition-opacity" style={{ backgroundColor: COLORS.primary }}>
                تسوقي الآن
              </button>
              <button className="px-8 py-3 font-medium border transition-colors hover:bg-white" style={{ borderColor: COLORS.primary, color: COLORS.primary }}>
                اكتشفي المجموعة
              </button>
            </div>
          </FadeIn>
        </div>
        <div className="w-full md:w-[55%] h-1/2 md:h-full relative overflow-hidden group">
          <img 
            src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900&q=80" 
            alt="Fashion Editorial" 
            className="w-full h-full object-cover transform transition-transform duration-1000 group-hover:scale-105"
          />
        </div>
      </section>

      {/* 5. Category Tiles */}
      <section className="py-20 container mx-auto px-4">
        <FadeIn>
          <div className="flex items-center justify-center gap-4 mb-12">
            <div className="h-[1px] w-16 bg-gray-300"></div>
            <h3 className="text-3xl" style={{ fontFamily: FONTS.heading }}>تسوقي حسب الفئة</h3>
            <div className="h-[1px] w-16 bg-gray-300"></div>
          </div>
        </FadeIn>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CATEGORIES.map((cat, idx) => (
            <FadeIn key={cat.name} delay={idx * 0.1}>
              <div className="group relative aspect-[3/4] overflow-hidden cursor-pointer rounded-sm">
                <img src={cat.image} alt={cat.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 editorial-overlay flex items-end justify-center pb-6">
                  <h4 className="text-white text-xl font-medium tracking-wide translate-y-2 group-hover:translate-y-0 transition-transform duration-300" style={{ fontFamily: FONTS.body }}>{cat.name}</h4>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* 6. New Arrivals */}
      <section className="py-20" style={{ backgroundColor: COLORS.white }}>
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center mb-12">
            <h3 className="text-4xl mb-6" style={{ fontFamily: FONTS.heading }}>وصل جديد</h3>
            <div className="flex gap-6 text-sm font-medium">
              {['الكل', 'فساتين', 'ميك أب', 'عناية'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-1 border-b-2 transition-colors ${activeTab === tab ? 'border-[#8B1A35] text-[#8B1A35]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 gap-y-12">
            {NEW_ARRIVALS.map((product, idx) => (
              <FadeIn key={product.id} delay={idx * 0.05}>
                <div className="product-card group flex flex-col h-full">
                  <div className="relative aspect-[4/5] overflow-hidden mb-4 rounded-sm bg-gray-100">
                    <img src={product.image} alt={product.name} className="product-img w-full h-full object-cover transition-transform duration-500" />
                    
                    {product.badge && (
                      <div className="absolute top-3 right-3 text-xs font-bold px-2 py-1 text-white rounded-sm z-10" style={{ backgroundColor: product.badge.includes('خصم') ? COLORS.gold : COLORS.rose }}>
                        {product.badge}
                      </div>
                    )}
                    
                    <button className="absolute top-3 left-3 bg-white/80 backdrop-blur-sm p-2 rounded-full hover:bg-white hover:text-red-500 transition-colors z-10">
                      <Heart size={16} />
                    </button>

                    <div className="quick-add absolute bottom-0 left-0 right-0 p-4 translate-y-full opacity-0 transition-all duration-300 z-10">
                      <button className="w-full py-3 bg-white text-black font-medium flex items-center justify-center gap-2 hover:bg-gray-50 shadow-lg">
                        <ShoppingBag size={18} />
                        أضف للسلة
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col flex-grow text-right">
                    <span className="text-xs text-gray-500 mb-1">{product.brand}</span>
                    <h4 className="font-medium mb-1 line-clamp-1">{product.name}</h4>
                    <div className="flex items-center justify-end gap-1 mb-2">
                      <span className="text-xs text-gray-400">({product.count})</span>
                      <div className="flex text-[#c8963a]">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={12} fill={i < Math.floor(product.rating) ? "currentColor" : "none"} />
                        ))}
                      </div>
                    </div>
                    <div className="mt-auto font-bold" style={{ color: COLORS.primary }}>{product.price}</div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
          
          <div className="mt-12 flex justify-center">
            <button className="px-8 py-3 border border-gray-300 hover:border-gray-800 transition-colors">
              عرض كل المنتجات
            </button>
          </div>
        </div>
      </section>

      {/* 7. Beauty Routine Section */}
      <section className="py-24 relative overflow-hidden" style={{ backgroundColor: COLORS.deepBg }}>
        <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#c97b8b 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h3 className="text-4xl mb-3" style={{ fontFamily: FONTS.heading }}>روتينك اليومي</h3>
            <p className="text-gray-600 italic" style={{ fontFamily: FONTS.heading }}>Your Daily Glow Routine</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            <div className="hidden md:block absolute top-1/3 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#c8963a] to-transparent opacity-30"></div>
            
            {ROUTINE_STEPS.map((step, idx) => (
              <FadeIn key={step.step} delay={idx * 0.1}>
                <div className="flex flex-col items-center text-center relative bg-white/50 backdrop-blur-sm p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-6xl mb-4 font-light opacity-20 absolute top-2 right-4" style={{ fontFamily: FONTS.heading, color: COLORS.gold }}>
                    0{step.step}
                  </div>
                  <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-2xl mb-4 shadow-sm border border-gray-100">
                    {step.icon}
                  </div>
                  <h4 className="text-xl font-bold mb-2">{step.title}</h4>
                  <p className="text-sm text-gray-500">{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>

          <div className="mt-16 text-center">
            <button className="inline-flex items-center gap-2 text-lg font-medium hover:gap-4 transition-all" style={{ color: COLORS.primary }}>
              <ArrowRight size={20} className="rotate-180" />
              اكتشفي منتجات الروتين
            </button>
          </div>
        </div>
      </section>

      {/* 8. Editorial Lookbook */}
      <section className="py-24 container mx-auto px-4">
        <div className="mb-12">
          <h3 className="text-4xl mb-2" style={{ fontFamily: FONTS.heading }}>لوك بوك SS 2025</h3>
          <p className="text-gray-500 italic text-xl" style={{ fontFamily: FONTS.heading }}>Style that speaks for itself</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 h-[80vh]">
          <div className="w-full md:w-2/3 h-1/2 md:h-full group relative overflow-hidden cursor-pointer">
            <img src="https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80" alt="Lookbook Main" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-500 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <span className="text-white border border-white px-8 py-3 tracking-widest uppercase text-sm">اكتشفي اللوك</span>
            </div>
          </div>
          <div className="w-full md:w-1/3 h-1/2 md:h-full flex flex-row md:flex-col gap-4">
            <div className="w-1/2 md:w-full h-full md:h-1/2 group relative overflow-hidden cursor-pointer">
              <img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80" alt="Lookbook Sub 1" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-500 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <span className="text-white border border-white px-6 py-2 text-sm">التفاصيل</span>
              </div>
            </div>
            <div className="w-1/2 md:w-full h-full md:h-1/2 group relative overflow-hidden cursor-pointer">
              <img src="https://images.unsplash.com/photo-1537832816519-689ad163238b?w=400&q=80" alt="Lookbook Sub 2" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-500 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <span className="text-white border border-white px-6 py-2 text-sm">تسوقي القطع</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Trending Now */}
      <section className="py-16 overflow-hidden">
        <div className="container mx-auto px-4 mb-8 flex justify-between items-end">
          <div className="flex items-center gap-4 text-gray-400">
            <ArrowRight size={24} className="rotate-180" />
            <span className="text-sm uppercase tracking-wider">Scroll</span>
          </div>
          <h3 className="text-3xl" style={{ fontFamily: FONTS.heading }}>الأكثر طلباً</h3>
        </div>
        
        <div className="w-full overflow-x-auto hide-scrollbar pb-8" style={{ direction: 'ltr' }}>
          <div className="flex gap-4 px-4 w-max" style={{ direction: 'rtl' }}>
            {TRENDING.map((item, idx) => (
              <div key={item.id} className="w-[220px] group cursor-pointer">
                <div className="aspect-[3/4] overflow-hidden mb-3 bg-gray-100">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div className="text-right">
                  <h4 className="font-medium text-sm mb-1 line-clamp-1">{item.name}</h4>
                  <p className="font-bold text-sm" style={{ color: COLORS.primary }}>{item.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. Best Sellers Band */}
      <section className="py-20 text-white" style={{ backgroundColor: COLORS.charcoal }}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-4xl mb-4" style={{ fontFamily: FONTS.heading, color: COLORS.gold }}>الأكثر مبيعاً</h3>
            <p className="text-gray-400">المنتجات المفضلة لدى عميلاتنا</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {BEST_SELLERS.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-4 group cursor-pointer p-4 hover:bg-white/5 rounded-lg transition-colors border border-white/5 hover:border-white/10">
                <div className="text-5xl font-light opacity-50 transition-opacity group-hover:opacity-100" style={{ fontFamily: FONTS.heading, color: COLORS.gold }}>
                  {idx + 1}
                </div>
                <div className="w-20 h-20 rounded-full overflow-hidden shrink-0">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" />
                </div>
                <div>
                  <h4 className="font-medium mb-1">{item.name}</h4>
                  <p className="text-sm" style={{ color: COLORS.gold }}>{item.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 11. Promo Banner */}
      <section className="w-full my-12" style={{ background: `linear-gradient(135deg, ${COLORS.rose}, #e8a5b2)` }}>
        <div className="container mx-auto">
          <div className="flex flex-col-reverse md:flex-row items-stretch">
            <div className="w-full md:w-1/2 p-12 lg:p-24 flex flex-col justify-center text-white">
              <h2 className="text-4xl lg:text-5xl font-bold mb-4 leading-tight">حتى 40% خصم على مجموعة الجمال</h2>
              <p className="text-xl mb-8 opacity-90 font-medium">عرض لفترة محدودة — ينتهي قريباً</p>
              <div>
                <button className="bg-white text-[#8B1A35] px-8 py-3 font-bold hover:bg-transparent hover:text-white border border-white transition-colors rounded-sm shadow-lg">
                  تسوقي الخصومات
                </button>
              </div>
            </div>
            <div className="w-full md:w-1/2 h-[300px] md:h-[500px]">
              <img src="https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=600&q=80" alt="Promo" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* 12. UGC Grid */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-3xl mb-4" style={{ fontFamily: FONTS.heading }}>@nour_fashion — شاركينا لوكك</h3>
            <p className="text-gray-500">استخدمي الهاشتاج لفرصة الظهور على صفحتنا</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {UGC_IMAGES.map((img, idx) => (
              <div key={idx} className="aspect-square relative group overflow-hidden cursor-pointer">
                <img src={img} alt="User Generated Content" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Instagram className="text-white w-8 h-8" />
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <button className="inline-flex items-center gap-2 font-medium hover:text-[#8B1A35] transition-colors">
              تابعينا على إنستغرام <ArrowRight size={16} className="rotate-180" />
            </button>
          </div>
        </div>
      </section>

      {/* 13. Trust Strip */}
      <section className="py-12 border-y border-gray-200" style={{ backgroundColor: COLORS.bg }}>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-x-reverse divide-gray-200">
            <div className="flex flex-col items-center text-center px-4">
              <Truck className="mb-3 w-8 h-8" style={{ color: COLORS.primary }} strokeWidth={1.5} />
              <h4 className="font-bold text-sm mb-1">شحن سريع</h4>
              <p className="text-xs text-gray-500">خلال 48 ساعة</p>
            </div>
            <div className="flex flex-col items-center text-center px-4">
              <RotateCcw className="mb-3 w-8 h-8" style={{ color: COLORS.primary }} strokeWidth={1.5} />
              <h4 className="font-bold text-sm mb-1">إرجاع مجاني</h4>
              <p className="text-xs text-gray-500">خلال 14 يوم</p>
            </div>
            <div className="flex flex-col items-center text-center px-4">
              <ShieldCheck className="mb-3 w-8 h-8" style={{ color: COLORS.primary }} strokeWidth={1.5} />
              <h4 className="font-bold text-sm mb-1">دفع آمن 100%</h4>
              <p className="text-xs text-gray-500">طرق دفع متعددة وموثوقة</p>
            </div>
            <div className="flex flex-col items-center text-center px-4">
              <Star className="mb-3 w-8 h-8" style={{ color: COLORS.gold }} fill="currentColor" strokeWidth={1.5} />
              <h4 className="font-bold text-sm mb-1">4.9/5 تقييم</h4>
              <p className="text-xs text-gray-500">من أكثر من 12,000 عميلة</p>
            </div>
          </div>
        </div>
      </section>

      {/* 14. Newsletter */}
      <section className="py-24" style={{ backgroundColor: COLORS.deepBg }}>
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <div className="mb-6 flex justify-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: COLORS.blush, color: COLORS.primary }}>
              ✨
            </div>
          </div>
          <h2 className="text-4xl mb-4" style={{ fontFamily: FONTS.heading }}>نادي Glow</h2>
          <p className="text-lg text-gray-600 mb-8">اشتركي وأنتِ الأولى بالعروض والوصفات الجمالية والتشكيلات الجديدة</p>
          
          <form className="flex flex-col sm:flex-row gap-3 mb-4" onSubmit={(e) => e.preventDefault()}>
            <input 
              type="email" 
              placeholder="البريد الإلكتروني..." 
              className="flex-grow px-6 py-4 border border-gray-300 focus:outline-none focus:border-[#8B1A35] bg-white rounded-sm"
              required
            />
            <button 
              type="submit" 
              className="px-8 py-4 text-white font-bold whitespace-nowrap rounded-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: COLORS.primary }}
            >
              انضمي الآن
            </button>
          </form>
          <p className="text-xs text-gray-400">بدون سبام. إلغاء الاشتراك في أي وقت.</p>
        </div>
      </section>

      {/* 15. Premium Footer */}
      <footer className="pt-20 pb-8 text-white/80" style={{ backgroundColor: COLORS.charcoal }}>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div>
              <h1 style={{ fontFamily: FONTS.heading }} className="text-4xl font-light tracking-wide text-white mb-2">نـور</h1>
              <p className="text-xs tracking-[0.2em] text-gray-500 uppercase mb-6" style={{ fontFamily: FONTS.body }}>FASHION & BEAUTY</p>
              <p className="text-sm mb-6 leading-relaxed opacity-80">
                وجهتك الأولى للأناقة والجمال. نقدم لكِ أحدث صيحات الموضة ومنتجات العناية المختارة بعناية للمرأة العصرية.
              </p>
              <div className="flex gap-4">
                <a href="#" className="hover:text-white transition-colors"><Instagram size={20} /></a>
                <a href="#" className="hover:text-white transition-colors"><Facebook size={20} /></a>
                <a href="#" className="hover:text-white transition-colors"><Twitter size={20} /></a>
                <a href="#" className="hover:text-white transition-colors"><Youtube size={20} /></a>
              </div>
            </div>

            <div>
              <h4 className="text-white font-bold text-lg mb-6" style={{ fontFamily: FONTS.heading }}>تسوقي</h4>
              <ul className="flex flex-col gap-3 text-sm">
                <li><a href="#" className="hover:text-[#c8963a] transition-colors">وصل حديثاً</a></li>
                <li><a href="#" className="hover:text-[#c8963a] transition-colors">فساتين</a></li>
                <li><a href="#" className="hover:text-[#c8963a] transition-colors">ميك أب</a></li>
                <li><a href="#" className="hover:text-[#c8963a] transition-colors">عناية بالبشرة</a></li>
                <li><a href="#" className="hover:text-[#c8963a] transition-colors">عطور</a></li>
                <li><a href="#" className="text-red-400 hover:text-red-300 transition-colors">تخفيضات</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold text-lg mb-6" style={{ fontFamily: FONTS.heading }}>مساعدة</h4>
              <ul className="flex flex-col gap-3 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">تتبع طلبك</a></li>
                <li><a href="#" className="hover:text-white transition-colors">سياسة الإرجاع والاستبدال</a></li>
                <li><a href="#" className="hover:text-white transition-colors">تواصلي معنا</a></li>
                <li><a href="#" className="hover:text-white transition-colors">الأسئلة الشائعة</a></li>
                <li><a href="#" className="hover:text-white transition-colors">شروط الاستخدام</a></li>
                <li><a href="#" className="hover:text-white transition-colors">سياسة الخصوصية</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold text-lg mb-6" style={{ fontFamily: FONTS.heading }}>تحميل التطبيق</h4>
              <p className="text-sm mb-6 opacity-80">احصلي على خصم 10% على أول طلب من التطبيق</p>
              <div className="flex flex-col gap-3">
                <button className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg px-4 py-2 flex items-center gap-3 transition-colors">
                  <div className="text-2xl">🍎</div>
                  <div className="text-right flex-grow">
                    <div className="text-[10px] opacity-70">Download on the</div>
                    <div className="text-sm font-bold text-white">App Store</div>
                  </div>
                </button>
                <button className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg px-4 py-2 flex items-center gap-3 transition-colors">
                  <div className="text-2xl">▶️</div>
                  <div className="text-right flex-grow">
                    <div className="text-[10px] opacity-70">GET IT ON</div>
                    <div className="text-sm font-bold text-white">Google Play</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs opacity-60">© {new Date().getFullYear()} نور. جميع الحقوق محفوظة.</p>
            <div className="flex items-center gap-3 text-xs opacity-60 font-medium">
              <span className="px-2 py-1 border border-white/20 rounded">VISA</span>
              <span className="px-2 py-1 border border-white/20 rounded">Mastercard</span>
              <span className="px-2 py-1 border border-white/20 rounded">Meeza</span>
              <span className="px-2 py-1 border border-white/20 rounded">C.O.D</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
