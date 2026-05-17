import React from 'react';
import type { StorefrontResponse } from "@workspace/api-client-react";
import { productImageUrl } from "@/lib/image-url";
import { Link } from "wouter";

export function GlowGridStorefront({ store }: { store: StorefrontResponse }) {
    const products = store.products || [];
    const categories = store.categories || [];

    return (
        <div className="bg-[#131313] text-[#e5e2e1] min-h-screen pb-24 md:pb-0" style={{ fontFamily: 'Spline Sans, sans-serif' }}>
            {/* Header */}
            <header className="bg-[#201f1f]/80 backdrop-blur-xl flex justify-between items-center w-full px-4 md:px-8 py-4 sticky top-0 z-50 border-b border-white/10 shadow-[0px_10px_30px_rgba(185,195,255,0.15)]">
                <div className="font-extrabold text-2xl tracking-tighter text-[#cdf200]">
                    {store.name}
                </div>
                <nav className="hidden md:flex gap-4 items-center">
                    {categories.slice(0, 4).map((c: any) => (
                        <a key={c.id} className="text-[#c4c5da] hover:text-[#cdf200] px-4 py-2 hover:bg-white/5 rounded-full" href={`/store/${store.slug}/category/${c.id}`}>{c.name}</a>
                    ))}
                </nav>
                <div className="flex gap-2 items-center">
                    <button className="text-[#b9c3ff] hover:bg-white/5 p-2 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined">shopping_bag</span>
                    </button>
                </div>
            </header>

            {/* Hero / Marquee */}
            <div className="w-full bg-[#cdf200] text-[#3f4c00] py-2 overflow-hidden flex whitespace-nowrap border-b border-[#3f4c00]/10">
                <div className="font-bold px-4 flex gap-8 tracking-widest text-sm">
                    {store.description ? <span>✦ {store.description}</span> : null}
                    <span>✦ DISCOVER THE NEW COLLECTION ✦ FREE SHIPPING ON ORDERS OVER $100</span>
                </div>
            </div>

            {/* Products Grid */}
            <main className="max-w-[1600px] mx-auto p-4 md:p-8">
                <div className="mb-12">
                    <h2 className="text-4xl md:text-6xl font-extrabold text-[#cdf200] mb-4">NEW DROPS</h2>
                    <p className="text-[#c4c5da]">Latest additions to our collection.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {products.map((p: any) => (
                        <div key={p.id} className="bg-[#2a2a2a] rounded-3xl overflow-hidden group hover:border-[#cdf200] border-2 border-transparent transition-all">
                            <div className="aspect-[3/4] relative bg-[#201f1f]">
                                {p.imageUrl && <img src={productImageUrl(p.imageUrl)} alt={p.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />}
                            </div>
                            <div className="p-6">
                                <h3 className="font-bold text-xl mb-2">{p.name}</h3>
                                <p className="text-[#cdf200] font-bold">EGP {p.price}</p>
                                <button className="mt-4 w-full bg-[#0046fa] text-white py-3 rounded-full font-bold hover:bg-[#0046fa]/80 transition-colors">
                                    ADD TO CART
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}