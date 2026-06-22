import { type StorefrontProps } from '@/components/themes/types';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { productImageUrl } from "@/lib/image-url";

export function ClassicStorefront({ store, products, categories }: StorefrontProps) {
    const { t } = useTranslation();
    // Generate a clean React component matching the design token from Stitch
    return (
        <div className="bg-[#f9f9f9] text-[#1a1c1c] min-h-[100dvh] pb-24 md:pb-0 w-full overflow-x-hidden font-sans">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500&family=Hanken+Grotesk:wght@400;500;600&display=swap');
                .font-heading { font-family: 'EB Garamond', serif; }
                .font-body { font-family: 'Hanken Grotesk', sans-serif; }
            `}</style>

            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-[#e8e8e8] py-4 px-6 md:px-16 flex justify-between items-center">
                <div className="font-heading text-2xl font-medium tracking-widest uppercase">
                    {store.name}
                </div>
                <div className="flex gap-4">
                    <span className="font-body text-sm uppercase tracking-widest cursor-pointer hover:text-[#c5a059] transition-colors">{t('storefront.navigation.shop', 'Shop')}</span>
                    <span className="font-body text-sm uppercase tracking-widest cursor-pointer hover:text-[#c5a059] transition-colors">{t('storefront.navigation.cart', 'Cart')}</span>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative w-full h-[70vh] flex items-center justify-center bg-[#f0f1f1]">
                <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: `url(${store.coverUrl ? productImageUrl(store.coverUrl) : 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070'})`}}></div>
                <div className="relative z-10 text-center px-4 max-w-3xl">
                    <h1 className="font-heading text-5xl md:text-7xl mb-6 text-[#1a1c1c]">{t('storefront.hero.eternalElegance', 'Eternal Elegance')}</h1>
                    <p className="font-body text-lg md:text-xl text-[#4e4639] mb-8">{store.description || t('storefront.hero.discoverCollection', 'Discover our new collection of timeless pieces.')}</p>
                    <button className="bg-[#1a1c1a] text-white font-body text-sm font-medium uppercase tracking-[0.1em] px-8 py-3 hover:bg-transparent hover:text-[#1a1c1a] border border-[#1a1c1a] transition-all duration-300">
                        {t('storefront.hero.shopCollection', 'Shop the Collection')}
                    </button>
                </div>
            </section>

            {/* Signature Divider */}
            <div className="w-full flex justify-center py-16">
                <div className="w-10 h-px bg-[#c5a059]"></div>
            </div>

            {/* Products Grid */}
            <main className="max-w-[1280px] mx-auto px-6 md:px-16 pb-20">
                <div className="text-center mb-16">
                    <h2 className="font-heading text-3xl md:text-4xl text-[#1a1c1c] mb-2 tracking-wide">{t('storefront.sections.newArrivals', 'New Arrivals')}</h2>
                    <p className="font-body text-[#7f7667] text-sm uppercase tracking-[0.15em]">{t('storefront.sections.curatedForYou', 'Curated For You')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
                    {products.slice(0, 6).map((p: any) => (
                        <div key={p.id} className="group cursor-pointer">
                            <div className="aspect-[3/4] relative bg-[#eeeeee] mb-6 overflow-hidden">
                                <img src={productImageUrl(p.imageUrl)} alt={p.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            </div>
                            <div className="text-center">
                                <h3 className="font-body text-lg text-[#1a1c1c] mb-2">{p.name}</h3>
                                <p className="font-body text-[#775a19] font-medium">EGP {p.price}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-[#f0f1f1] py-16 px-6 md:px-16 border-t border-[#e8e8e8]">
                <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row justify-between items-center">
                    <div className="font-heading text-xl font-medium tracking-widest uppercase mb-6 md:mb-0">
                        {store.name}
                    </div>
                    <div className="flex gap-8">
                        <span className="font-body text-sm text-[#4e4639] hover:text-[#c5a059] cursor-pointer transition-colors">Instagram</span>
                        <span className="font-body text-sm text-[#4e4639] hover:text-[#c5a059] cursor-pointer transition-colors">Contact</span>
                        <span className="font-body text-sm text-[#4e4639] hover:text-[#c5a059] cursor-pointer transition-colors">Terms</span>
                    </div>
                </div>
                <div className="max-w-[1280px] mx-auto mt-12 pt-8 border-t border-[#e2e2e2] text-center">
                    <p className="font-body text-xs text-[#7f7667] uppercase tracking-widest">&copy; {new Date().getFullYear()} {store.name}. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
