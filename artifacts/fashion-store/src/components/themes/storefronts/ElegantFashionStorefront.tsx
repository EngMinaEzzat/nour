import React, { useState } from 'react';
import { type StorefrontProps } from '@/components/themes/types';
import { Link } from 'wouter';
import { productImageUrl } from '@/lib/image-url';
import { useCart } from '@/hooks/use-cart';

export function ElegantFashionStorefront({ store, products, categories }: StorefrontProps) {
    const { items, addItem, removeItem, updateQuantity } = useCart();
    const cartCount = items.length;

    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const handleAddToCart = (product: any) => {
        addItem({
            productId: product.id,
            variantId: product.id,
            name: product.name,
            price: product.price,
            imageUrl: product.imageUrl,
            quantity: 1,
            tenantId: store.id,
            tenantName: store.name,
            attributes: {}
        });
    };

    return (
        <div className="min-h-screen bg-[#fff8f6] text-[#211a17] font-sans selection:bg-[#c5b358]/30 overflow-x-hidden relative" style={{ fontFamily: '"DM Sans", sans-serif' }}>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400;0,700;1,400&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;1,9..40,400&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

                .font-sans { font-family: 'DM Sans', sans-serif; }
                .font-serif { font-family: 'Bodoni Moda', serif; }
                .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
            `}</style>

            {/* Header */}
            <header className="absolute top-0 left-0 w-full z-50 py-6 px-6 md:px-20 flex justify-between items-center bg-transparent mix-blend-difference text-white">
                <nav className="hidden md:flex gap-8">
                    {categories.slice(0, 3).map((c: any) => (
                        <Link key={c.id} href={`/store/${store.slug}/category/${c.id}`} className="font-sans text-[12px] uppercase tracking-[0.15em] hover:text-[#c5b358] transition-colors">
                            {c.name}
                        </Link>
                    ))}
                </nav>
                <div className="flex-1 text-center">
                    <Link href={`/store/${store.slug}`} className="font-serif text-3xl md:text-4xl tracking-widest uppercase hover:opacity-80 transition-opacity">
                        {store.name}
                    </Link>
                </div>
                <div className="flex justify-end gap-6">
                    {/* Placeholder search logic */}
                    <button className="font-sans text-[12px] uppercase tracking-[0.15em] hover:text-[#c5b358] transition-colors">Search</button>
                    {/* Link to actual checkout or open a drawer if one existed, using Link here for standard checkout flow */}
                    <Link href={`/checkout?store=${store.slug}`} className="font-sans text-[12px] uppercase tracking-[0.15em] hover:text-[#c5b358] transition-colors flex items-center gap-1">
                        Cart {cartCount > 0 && `(${cartCount})`}
                    </Link>
                </div>
            </header>

            {/* Mobile Nav Toggle (Visual only for now) */}
            <div className="md:hidden absolute top-6 left-6 z-50 text-white mix-blend-difference">
                 <span className="material-symbols-outlined">menu</span>
            </div>

            {/* Hero Section */}
            <section className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-[#e5d7d1]">
                 {/* Placeholder for Hero Image */}
                 <div className="absolute inset-0 bg-[#372f2b]">
                     {products[0] ? (
                        <img src={productImageUrl(products[0].imageUrl)} alt="Hero" className="w-full h-full object-cover opacity-60" />
                     ) : (
                        <div className="w-full h-full bg-[#121212]"></div>
                     )}
                 </div>

                 <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto flex flex-col items-center">
                     <p className="font-sans text-[12px] uppercase tracking-[0.15em] mb-6 text-[#f9f7f2]/80">The New Collection</p>
                     <h1 className="font-serif text-5xl md:text-7xl lg:text-[80px] leading-[1.1] tracking-[-0.02em] mb-12 uppercase">
                         Timeless Artistry
                     </h1>
                     <button onClick={() => {
                        document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                     }} className="bg-transparent border border-white text-white px-8 py-4 font-sans text-[12px] uppercase tracking-[0.15em] hover:bg-white hover:text-[#121212] transition-colors duration-500">
                         Explore the Collection
                     </button>
                 </div>
            </section>

            {/* Story Section */}
            <section className="py-24 md:py-32 px-6 md:px-20 max-w-[1440px] mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 items-center">
                    <div className="order-2 md:order-1 flex justify-center md:justify-end">
                        <div className="aspect-square w-full max-w-[400px] bg-[#eee0da] overflow-hidden">
                             {products[1] ? (
                                <img src={productImageUrl(products[1].imageUrl)} alt="Heritage" className="w-full h-full object-cover" />
                             ) : (
                                <div className="w-full h-full bg-[#e5d7d1]"></div>
                             )}
                        </div>
                    </div>
                    <div className="order-1 md:order-2 flex flex-col items-start max-w-md">
                        <h2 className="font-serif text-4xl md:text-5xl text-[#121212] mb-8 leading-[1.2]">Crafted with Intent</h2>
                        <p className="font-sans text-lg text-[#211a17] leading-[1.8] mb-8 font-light">
                            Born from a pursuit of pure form and exceptional craft, {store.name} creates pieces that transcend seasons. Each garment is a dialogue between tradition and modernity.
                        </p>
                        <Link href={`/store/${store.slug}/about`} className="font-sans text-[12px] uppercase tracking-[0.15em] text-[#121212] border-b border-[#121212] pb-1 hover:text-[#c5b358] hover:border-[#c5b358] transition-colors">
                            Discover Our Heritage
                        </Link>
                    </div>
                </div>
            </section>

            {/* Product Grid */}
            <section id="products" className="py-24 px-6 md:px-20 max-w-[1440px] mx-auto border-t border-[#121212]/10">
                <div className="text-center mb-16">
                    <h2 className="font-serif text-3xl md:text-4xl text-[#121212]">The Essentials</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-16">
                    {products.map((product) => (
                        <div key={product.id} className="group flex flex-col">
                            <Link href={`/store/${store.slug}/product/${product.id}`} className="aspect-[3/4] w-full bg-[#f9ebe5] mb-6 overflow-hidden relative block">
                                <img
                                    src={productImageUrl(product.imageUrl)}
                                    alt={product.name}
                                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500"></div>
                            </Link>
                            <div className="text-center flex flex-col flex-1 relative group">
                                <Link href={`/store/${store.slug}/product/${product.id}`} className="block">
                                    <h3 className="font-serif text-xl text-[#121212] mb-2">{product.name}</h3>
                                </Link>
                                <div className="mt-auto relative h-6 overflow-hidden">
                                    <p className="font-sans text-[16px] text-[#5e5e5b] font-light absolute w-full transition-transform duration-300 group-hover:-translate-y-full">
                                        ${(product.price / 100).toFixed(2)}
                                    </p>
                                    <button
                                        onClick={() => handleAddToCart(product)}
                                        className="font-sans text-[12px] uppercase tracking-[0.15em] text-[#121212] absolute w-full translate-y-full transition-transform duration-300 group-hover:translate-y-0"
                                    >
                                        Add to Cart
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Minimal Footer */}
            <footer className="bg-[#121212] text-[#f9f7f2] py-20 px-6 md:px-20 mt-24">
                <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
                    <div>
                         <h4 className="font-serif text-2xl uppercase tracking-widest mb-6">{store.name}</h4>
                         <p className="font-sans text-sm text-[#8e837e] max-w-xs mx-auto md:mx-0">Redefining modern elegance through mindful creation.</p>
                    </div>
                    <div className="flex flex-col gap-4">
                        <span className="font-sans text-[12px] uppercase tracking-[0.15em] text-[#8e837e]">Explore</span>
                        {categories.slice(0,4).map((c:any) => (
                             <Link key={c.id} href={`/store/${store.slug}/category/${c.id}`} className="font-sans text-sm hover:text-[#c5b358] transition-colors">{c.name}</Link>
                        ))}
                    </div>
                    <div className="flex flex-col gap-4">
                         <span className="font-sans text-[12px] uppercase tracking-[0.15em] text-[#8e837e]">Connect</span>
                         <a href="#" className="font-sans text-sm hover:text-[#c5b358] transition-colors">Instagram</a>
                         <a href="#" className="font-sans text-sm hover:text-[#c5b358] transition-colors">Pinterest</a>
                         <a href="#" className="font-sans text-sm hover:text-[#c5b358] transition-colors">Contact Us</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
