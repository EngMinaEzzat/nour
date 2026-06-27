import { type StorefrontProps } from '@/components/themes/types';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { productImageUrl } from "@/lib/image-url";

export function GlowGridStorefront({ store, products, categories }: StorefrontProps) {
    const { t } = useTranslation();


    return (
        <div className="theme-glow-grid bg-[#131313] text-[#e5e2e1] min-h-[100dvh] pb-24 md:pb-0 w-full overflow-x-hidden" style={{ fontFamily: 'Spline Sans, sans-serif' }}>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Anybody:wght@700;800&family=Space+Grotesk:wght@500;700&family=Spline+Sans:wght@400&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
                .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
                .theme-glow-grid { background-color: #131313 !important; color: #e5e2e1 !important; }
            `}</style>

            {/* Header */}
            <header className="bg-[#201f1f] flex justify-between items-center w-full px-4 md:px-8 py-6 sticky top-0 z-50 border-b border-white/10">
                <div className="flex gap-2 items-center">
                    <button className="text-[#b9c3ff] font-medium text-sm transition-colors" aria-label={t("storefront.navigation.cart", "Cart")}>
                        <span className="material-symbols-outlined" aria-hidden="true">shopping_bag</span>
                    </button>
                </div>
                <div className="font-extrabold text-3xl tracking-tighter text-[#cdf200] text-right" style={{ fontFamily: 'Anybody, sans-serif' }}>
                    {store.name}
                </div>
            </header>

            {/* Trending Ticker */}
            <div className="w-full bg-[#cdf200] text-[#3f4c00] py-2 overflow-hidden flex whitespace-nowrap border-b border-[#cdf200]/10">
                <div className="font-bold px-4 flex gap-8 tracking-widest text-sm">
                    {store.description ? <span>✦ {store.description}</span> : null}
                    <span>✦ DISCOVER THE NEW COLLECTION ✦ FREE SHIPPING ON ORDERS OVER $100 ✦ SHOP LATEST ARRIVALS</span>
                </div>
            </div>

            {/* Products Grid */}
            <main className="max-w-[1600px] mx-auto px-4 py-12 md:px-8">
                <div className="mb-12">
                    <h2 className="text-4xl md:text-6xl font-extrabold text-[#cdf200] mb-4" style={{ fontFamily: 'Anybody, sans-serif' }}>NEW DROPS</h2>
                    <p className="text-[#c4c5da] text-lg text-right">.Latest additions to our collection</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {products.map((p: any) => (
                        <div key={p.id} className="bg-[#2a2a2a] rounded-3xl overflow-hidden group hover:border-[#cdf200] border-2 border-transparent transition-all shadow-lg">
                            <div className="aspect-[3/4] relative bg-[#201f1f]">
                                <img src={productImageUrl(p.imageUrl)} alt={p.name} className="w-full h-full object-cover opacity-90 group-hover:scale-105 group-hover:opacity-100 transition-all duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#131313]/90 via-transparent to-transparent"></div>

                                <div className="absolute bottom-0 left-0 w-full p-6 flex flex-col gap-2">
                                    <h3 className="font-bold text-xl text-white" style={{ fontFamily: 'Anybody, sans-serif' }}>{p.name}</h3>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-[#cdf200] font-bold text-lg">EGP {p.price}</span>
                                        <button className="w-10 h-10 rounded-full border border-[#8e8fa3] text-[#b9c3ff] flex items-center justify-center hover:bg-[#313030] transition-colors" aria-label={t("storefront.products.addToCart", "Add to Cart")}>
                                            <span className="material-symbols-outlined font-sans font-bold text-sm" aria-hidden="true">+</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}