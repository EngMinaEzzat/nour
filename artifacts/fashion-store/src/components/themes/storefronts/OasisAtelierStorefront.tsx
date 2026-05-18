import React from 'react';
import type { StorefrontResponse } from '@workspace/api-client-react';
import { type StorefrontProps } from '@/components/themes/types';
import { Link } from 'wouter';
import { productImageUrl } from '@/lib/image-url';

export function OasisAtelierStorefront({ store, products, categories }: StorefrontProps) {
    return (
        <div className="min-h-screen bg-[#faf8f5] text-[#2d2926] font-sans selection:bg-[#c2a878]/30 overflow-x-hidden relative" style={{ fontFamily: '"Playfair Display", serif' }}>

            <style dangerouslySetInnerHTML={{__html: `
                @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Lato:wght@300;400;700&display=swap');

                .font-sans { font-family: 'Lato', sans-serif; }
                .font-serif { font-family: 'Playfair Display', serif; }
            `}} />

            {/* Sidebar (Desktop) / Top Nav (Mobile) */}
            <div className="md:fixed md:top-0 md:left-0 md:h-screen md:w-64 bg-[#f2efe9] border-b md:border-b-0 md:border-r border-[#d4cfc7] z-40 flex flex-col justify-between py-6 md:py-12 px-6">
                <div>
                    <Link href={`/store/${store.slug}`} className="block font-serif text-2xl md:text-3xl text-[#8b6f4e] text-center md:text-left mb-8 hover:opacity-80 transition-opacity">
                        {store.name}
                    </Link>
                    <nav className="hidden md:flex flex-col gap-4">
                        {categories.map((c: any) => (
                            <Link key={c.id} href={`/store/${store.slug}/category/${c.id}`} className="font-sans text-sm tracking-widest uppercase text-[#5c554d] hover:text-[#8b6f4e] transition-colors relative group w-max">
                                {c.name}
                                <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[#8b6f4e] transition-all duration-300 group-hover:w-full"></span>
                            </Link>
                        ))}
                    </nav>
                </div>
                <div className="hidden md:flex flex-col gap-6">
                    <button className="flex items-center gap-3 text-[#5c554d] hover:text-[#8b6f4e] transition-colors group">
                        <span className="material-symbols-outlined text-lg group-hover:scale-110 transition-transform">shopping_basket</span>
                        <span className="font-sans text-xs tracking-widest uppercase">Cart</span>
                    </button>
                    <p className="font-sans text-[10px] uppercase tracking-widest text-[#8c857b]">
                        Curated in {store.name}
                    </p>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="md:ml-64 p-4 md:p-12 lg:p-20 w-full min-h-screen">
                <main className="max-w-5xl mx-auto">

                    {/* Hero Section */}
                    <section className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-24 items-center">
                        <div className="md:col-span-5 md:col-start-2 flex flex-col justify-center order-2 md:order-1 mt-8 md:mt-0">
                            <p className="font-sans text-xs text-[#8b6f4e] tracking-[0.2em] uppercase mb-4">{store.name}</p>
                            <h1 className="font-serif text-4xl md:text-6xl text-[#2d2926] mb-6 leading-tight">
                                Feminine Craft,<br/>Heritage Leather.
                            </h1>
                            <p className="font-sans text-[#5c554d] mb-8 max-w-md leading-relaxed">
                                {store.description || "Discover slowly crafted collections designed for the modern muse. Tactile heritage modernism."}
                            </p>
                        </div>
                        <div className="md:col-span-6 order-1 md:order-2">
                            <div className="aspect-[4/5] bg-[#e8e4db] border border-[#d4cfc7]/30 relative overflow-hidden">
                                {products[0] ? (
                                    <img src={productImageUrl(products[0].imageUrl)} alt={products[0].name} className="w-full h-full object-cover object-center" />
                                ) : (
                                    <div className="w-full h-full bg-[#d4cfc7]/30"></div>
                                )}
                                {/* Provenance Seal Overlay */}
                                <div className="absolute bottom-6 right-6 w-24 h-24 rounded-full border border-[#bfae99] bg-[#faf8f5]/90 backdrop-blur-sm flex items-center justify-center p-2 text-center shadow-lg">
                                    <span className="font-serif text-[10px] uppercase tracking-widest text-[#8b6f4e] leading-tight">Authentic<br/>Artisan<br/>Craft</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Curated Collection */}
                    <section className="mb-24">
                        <div className="flex items-baseline justify-between mb-12 border-b border-[#d4cfc7]/50 pb-4">
                            <h2 className="font-serif text-3xl text-[#2d2926]">Curated Pieces</h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {products.map((product) => (
                                <Link href={`/store/${store.slug}/product/${product.id}`} key={product.id} className="group cursor-pointer block">
                                    <div className="aspect-[3/4] bg-[#f2efe9] mb-4 overflow-hidden border border-[#d4cfc7]/30 relative">
                                        <img
                                            src={productImageUrl(product.imageUrl)}
                                            alt={product.name}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-[#2d2926]/0 group-hover:bg-[#2d2926]/5 transition-colors duration-500"></div>
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-serif text-lg text-[#2d2926] mb-1 group-hover:text-[#8b6f4e] transition-colors">{product.name}</h3>
                                            <p className="font-sans text-sm text-[#5c554d] truncate max-w-[200px]">{product.description || "Artisanal quality"}</p>
                                        </div>
                                        <span className="font-sans text-[#8b6f4e] font-bold">${(product.price / 100).toFixed(2)}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>

                </main>
            </div>

            {/* BottomNavBar (Mobile) */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-xl bg-[#f2efe9]/95 backdrop-blur-lg border-t border-[#d4cfc7] shadow-[0_-4px_12px_rgba(45,41,38,0.08)]">
                <div className="flex justify-around items-center py-3 px-4">
                    <button className="flex flex-col items-center justify-center text-[#5c554d] hover:text-[#8b6f4e]">
                        <span className="material-symbols-outlined mb-1 text-xl">explore</span>
                        <span className="font-sans text-[9px] uppercase tracking-widest">Explore</span>
                    </button>
                    <button className="flex flex-col items-center justify-center text-[#8b6f4e] bg-[#e6dbce] rounded-full px-4 py-1">
                        <span className="material-symbols-outlined mb-1 text-xl">auto_awesome</span>
                        <span className="font-sans text-[9px] uppercase tracking-widest">Curated</span>
                    </button>
                    <button className="flex flex-col items-center justify-center text-[#5c554d] hover:text-[#8b6f4e]">
                        <span className="material-symbols-outlined mb-1 text-xl">shopping_basket</span>
                        <span className="font-sans text-[9px] uppercase tracking-widest">Cart</span>
                    </button>
                </div>
            </nav>

        </div>
    );
};
