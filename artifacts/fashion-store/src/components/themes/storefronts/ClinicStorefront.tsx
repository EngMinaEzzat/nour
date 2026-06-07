import React, { useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Calendar, Phone, Clock, MapPin, Search, Menu, X, ArrowRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { productImageUrl } from "@/lib/image-url";
import { publicEntitySlug } from "@/lib/seo-slugs";
import type { StoreThemeProps as StorefrontProps } from "./index";

export function ClinicStorefront({ store, products, categories }: StorefrontProps) {
  const { t, i18n } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Clinic specific colors from store settings, or defaults
  const primaryColor = store.primaryColor || "#0066cc";
  const secondaryColor = (store as any).secondaryColor || "#e6f0fa";

  // Fake doctors data for demonstration if products don't exist
  const doctors = products.filter((p: any) => p.status === "active").slice(0, 4);

  return (
    <div className="min-h-screen bg-slate-50 font-sans" style={{ direction: i18n.dir() }}>
      {/* Top Bar */}
      <div className="text-white text-sm py-2 px-4" style={{ backgroundColor: primaryColor }}>
        <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> {(store as any).footerContact || "+20 123 456 7890"}</span>
            <span className="flex items-center gap-1.5 hidden md:flex"><Clock className="w-4 h-4" /> 9:00 AM - 10:00 PM</span>
          </div>
          <div className="flex items-center gap-3">
             <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {store.city || "Cairo"}</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href={`/`} className="flex items-center gap-3 shrink-0">
              {store.logoUrl ? (
                <img src={store.logoUrl} alt={store.name} className="h-10 w-auto object-contain" />
              ) : (
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: primaryColor }}>
                  {store.name.charAt(0)}
                </div>
              )}
              <span className="font-bold text-xl text-slate-800 hidden sm:block">{store.name}</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8 text-slate-600 font-medium">
              <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
              <a href="#services" className="hover:text-blue-600 transition-colors">Services</a>
              <a href="#doctors" className="hover:text-blue-600 transition-colors">Doctors</a>
              <a href="#contact" className="hover:text-blue-600 transition-colors">Contact</a>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button className="hidden md:inline-flex rounded-full px-6" style={{ backgroundColor: primaryColor }}>
                Book Appointment
              </Button>
              <button
                className="md:hidden p-2 text-slate-600"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-4 space-y-4">
            <Link href="/" className="block py-2 text-slate-600">Home</Link>
            <a href="#services" className="block py-2 text-slate-600">Services</a>
            <a href="#doctors" className="block py-2 text-slate-600">Doctors</a>
            <Button className="w-full mt-4" style={{ backgroundColor: primaryColor }}>Book Appointment</Button>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 z-0">
           {store.coverUrl ? (
             <img src={store.coverUrl} alt="Clinic" className="w-full h-full object-cover opacity-20" />
           ) : (
             <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${secondaryColor} 0%, white 100%)` }} />
           )}
        </div>
        <div className="container mx-auto px-4 py-20 relative z-10 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 max-w-2xl text-center md:text-start">
            <span className="inline-block py-1 px-3 rounded-full text-sm font-medium mb-4" style={{ backgroundColor: secondaryColor, color: primaryColor }}>
              Professional Medical Care
            </span>
            <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
              {store.description || "Your Health Is Our Top Priority"}
            </h1>
            <p className="text-lg text-slate-600 mb-8 max-w-xl mx-auto md:mx-0">
              Book your appointment with our specialized doctors easily and get the best healthcare services.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <Button size="lg" className="rounded-full h-14 px-8 text-lg shadow-lg" style={{ backgroundColor: primaryColor }}>
                <Calendar className="w-5 h-5 mr-2" /> Book Now
              </Button>
              <Button size="lg" variant="outline" className="rounded-full h-14 px-8 text-lg border-2">
                Our Services
              </Button>
            </div>
          </div>

          {/* Appointment Quick Form (Visual) */}
          <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
            <h3 className="text-2xl font-bold text-slate-800 mb-6">Quick Appointment</h3>
            <form className="space-y-4">
               <div>
                 <label className="text-sm font-medium text-slate-700 block mb-1.5">Full Name</label>
                 <Input className="bg-slate-50 border-slate-200 h-12 rounded-xl" placeholder="John Doe" />
               </div>
               <div>
                 <label className="text-sm font-medium text-slate-700 block mb-1.5">Phone Number</label>
                 <Input className="bg-slate-50 border-slate-200 h-12 rounded-xl" placeholder="+20 123 456 7890" />
               </div>
               <div>
                 <label className="text-sm font-medium text-slate-700 block mb-1.5">Select Service</label>
                 <select className="w-full bg-slate-50 border border-slate-200 h-12 rounded-xl px-3 text-slate-700">
                    <option>General Consultation</option>
                    {categories.map((c: any) => <option key={c.id}>{c.name}</option>)}
                 </select>
               </div>
               <Button className="w-full h-12 rounded-xl text-md mt-2" style={{ backgroundColor: primaryColor }}>
                 Request Appointment
               </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Services/Categories */}
      {categories && categories.length > 0 && (
        <section id="services" className="py-20 bg-slate-50">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Medical Specialties</h2>
              <p className="text-slate-600">Comprehensive healthcare services provided by our expert medical team.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {categories.map((category: any) => (
                <div key={category.id} className="bg-white p-6 rounded-2xl shadow-md border border-blue-100 hover:shadow-xl transition-shadow group">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-colors" style={{ backgroundColor: secondaryColor }}>
                    <div className="w-6 h-6" style={{ color: primaryColor }}>
                      <svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v4h4v2h-4v4h-2v-4H7v-2h4z"/></svg>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">{category.name}</h3>
                  <p className="text-slate-600 text-sm mb-4 line-clamp-2">{category.description || "Specialized medical care in this department."}</p>
                  <Link href={`/category/${publicEntitySlug(category, "category")}`} className="text-sm font-semibold flex items-center" style={{ color: primaryColor }}>
                    View Services <ArrowRight className="w-4 h-4 ml-1 rtl:rotate-180" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Doctors/Products */}
      <section id="doctors" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Our Specialists</h2>
              <p className="text-slate-600">Meet our team of experienced and dedicated medical professionals.</p>
            </div>
            <Button variant="outline" className="hidden md:flex rounded-full">View All Doctors</Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {doctors.map((product: any) => {
               const imageUrl = productImageUrl(product);
               return (
                 <div key={product.id} className="bg-white shadow-md border border-blue-100 rounded-2xl overflow-hidden hover:shadow-xl transition-all group">
                   <div className="aspect-[4/5] bg-slate-200 relative overflow-hidden">
                     {imageUrl ? (
                       <img src={imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                     ) : (
                       <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 border border-slate-200">
                         <User className="w-20 h-20" />
                       </div>
                     )}
                   </div>
                   <div className="p-6 text-center">
                     <h3 className="text-xl font-bold text-slate-900 mb-1">{product.name}</h3>
                     <p className="text-sm font-medium mb-4" style={{ color: primaryColor }}>
                       {categories.find((c: any) => c.id === product.categoryId)?.name || "Specialist"}
                     </p>
                     <div className="flex justify-center items-center gap-2 text-slate-500 text-sm mb-4">
                       <Clock className="w-4 h-4" /> 10+ Years Experience
                     </div>
                     <Link href={`/product/${publicEntitySlug(product, "product")}`}>
                       <Button variant="outline" className="w-full rounded-xl border-slate-200 hover:bg-slate-100">
                         View Profile
                       </Button>
                     </Link>
                   </div>
                 </div>
               );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-16" id="contact">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <div className="flex items-center gap-3 mb-6">
              {store.logoUrl ? (
                <img src={store.logoUrl} alt={store.name} className="h-10 w-auto bg-white p-1 rounded" />
              ) : (
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: primaryColor }}>
                  {store.name.charAt(0)}
                </div>
              )}
              <span className="font-bold text-2xl text-white">{store.name}</span>
            </div>
            <p className="mb-6">{store.description || "Providing the best medical care with a focus on patient well-being and health."}</p>
            <div className="flex gap-4">
              {/* Social placeholders */}
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 cursor-pointer transition-colors"></div>
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 cursor-pointer transition-colors"></div>
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 cursor-pointer transition-colors"></div>
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold text-lg mb-6">Quick Links</h4>
            <ul className="space-y-3">
              <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#services" className="hover:text-white transition-colors">Our Services</a></li>
              <li><a href="#doctors" className="hover:text-white transition-colors">Find a Doctor</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Book Appointment</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Patient Portal</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold text-lg mb-6">Contact Us</h4>
            <ul className="space-y-4">
              <li className="flex gap-3">
                <MapPin className="w-5 h-5 shrink-0 text-blue-400" />
                <span>{store.city || "123 Medical Center Drive, Healthcare City"}</span>
              </li>
              <li className="flex gap-3">
                <Phone className="w-5 h-5 shrink-0 text-blue-400" />
                <span>{(store as any).footerContact || "+20 123 456 7890"}</span>
              </li>
              <li className="flex gap-3">
                <Clock className="w-5 h-5 shrink-0 text-blue-400" />
                <span>Mon - Sat: 9:00 AM - 10:00 PM<br/>Sunday: Emergency Only</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-16 pt-8 border-t border-slate-800 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} {store.name}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
