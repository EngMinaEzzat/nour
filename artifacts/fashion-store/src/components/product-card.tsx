import { Link, useLocation } from "wouter";
import { Product } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Check, Layers, Plus, Minus } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { getResponsiveImageProps } from "@/lib/image-url";
import { useTranslation } from "react-i18next";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [, navigate] = useLocation();
  const { items, addItem, isInCart, updateQuantity } = useCart();
  const { t, i18n } = useTranslation();
  const inCart = isInCart(product.id);
  const cartItem = items.find(i => i.productId === product.id);
  const cartQuantity = cartItem?.quantity || 0;
  const unavailable = product.status === "out_of_stock" || product.stock === 0;

  function handleUpdateQuantity(e: React.MouseEvent, delta: number) {
    e.preventDefault();
    e.stopPropagation();
    if (!cartItem) return;
    updateQuantity(product.id, cartItem.quantity + delta);
  }

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (unavailable) return;
    // Products with variants MUST select options on the detail page first
    if (product.hasVariants) {
      navigate(`/products/${product.id}`);
      return;
    }
    addItem({
      productId: product.id,
      tenantId: product.tenantId,
      tenantName: product.tenantName,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl ?? null,
    });
  }

  return (
    <Link href={`/products/${product.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer border-none bg-card group h-full flex flex-col" dir={i18n.dir()}>
        <div className="relative aspect-[3/4] overflow-hidden bg-muted">
          <img
            {...getResponsiveImageProps(product.imageUrl)}
            alt={product.name}
            width={600}
            height={800}
            loading="lazy"
            decoding="async"
            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
          />
          {product.featured && (
            <Badge className="absolute top-2 start-2 bg-accent text-accent-foreground border-none">
              {t("productCard.featured")}
            </Badge>
          )}
          {unavailable && (
            <Badge variant="destructive" className="absolute top-2 end-2 border-none">
              {t("productCard.outOfStock")}
            </Badge>
          )}
          {!unavailable && (
            <div className={`absolute bottom-3 end-3 flex items-center gap-1 transition-all duration-200 ${product.hasVariants ? "opacity-0 group-hover:opacity-100" : (inCart ? "opacity-100" : "opacity-0 group-hover:opacity-100")}`}>
              {inCart && !product.hasVariants ? (
                <div className="flex items-center bg-white/90 shadow-md rounded-full border border-white/20 overflow-hidden">
                  <button
                    onClick={(e) => handleUpdateQuantity(e, -1)}
                    className="w-8 h-8 flex items-center justify-center text-foreground hover:bg-secondary hover:text-secondary-foreground"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-bold text-foreground">{cartQuantity}</span>
                  <button
                    onClick={(e) => handleUpdateQuantity(e, 1)}
                    className="w-8 h-8 flex items-center justify-center text-foreground hover:bg-secondary hover:text-secondary-foreground"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAddToCart}
                  className="w-9 h-9 rounded-full flex items-center justify-center shadow-md bg-white/90 text-foreground hover:bg-primary hover:text-primary-foreground border border-white/20"
                  aria-label={product.hasVariants ? t("productCard.selectOptions") : t("productCard.addToBag")}
                >
                  {product.hasVariants ? <Layers className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
                </button>
              )}
            </div>
          )}
        </div>
        <CardContent className="p-4 flex-1 flex flex-col">
          <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">
            {product.tenantName}
          </div>
          <h3 className="font-serif text-lg text-foreground line-clamp-1 mb-2">{product.name}</h3>
          <div className="mt-auto flex items-center gap-2">
            <span className="font-bold text-primary">{i18n.language === "ar" ? "ج.م" : "EGP"} {product.price.toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-sm text-muted-foreground line-through">
                {i18n.language === "ar" ? "ج.م" : "EGP"} {product.originalPrice.toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
          </div>
          {product.hasVariants && (
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
              <Layers className="w-3 h-3" /> {t("productCard.multipleOptions")}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
