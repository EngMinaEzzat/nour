import { Link, useLocation } from "wouter";
import { Product } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Check, Layers } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { productImageUrl } from "@/lib/image-url";

interface ProductCardProps {
  product: Product & { hasVariants?: boolean };
}

export function ProductCard({ product }: ProductCardProps) {
  const [, navigate] = useLocation();
  const { addItem, isInCart } = useCart();
  const inCart = isInCart(product.id);
  const unavailable = product.status === "out_of_stock" || product.stock === 0;

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
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer border-none bg-card group h-full flex flex-col">
        <div className="relative aspect-[3/4] overflow-hidden bg-muted">
          <img
            src={productImageUrl(product.imageUrl)}
            alt={product.name}
            width={600}
            height={800}
            loading="lazy"
            decoding="async"
            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
          />
          {product.featured && (
            <Badge className="absolute top-2 left-2 bg-accent text-accent-foreground border-none">
              Featured
            </Badge>
          )}
          {unavailable && (
            <Badge variant="destructive" className="absolute top-2 right-2 border-none">
              Out of Stock
            </Badge>
          )}
          {!unavailable && (
            <button
              onClick={handleAddToCart}
              className={`absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all duration-200 border border-white/20
                ${product.hasVariants
                  ? "bg-white/90 text-foreground opacity-0 group-hover:opacity-100 hover:bg-secondary hover:text-secondary-foreground"
                  : inCart
                  ? "bg-primary text-primary-foreground scale-110"
                  : "bg-white/90 text-foreground opacity-0 group-hover:opacity-100 hover:bg-primary hover:text-primary-foreground"
                }`}
              aria-label={product.hasVariants ? "اختر الخيارات" : inCart ? "Added to bag" : "Add to bag"}
            >
              {product.hasVariants ? (
                <Layers className="w-4 h-4" />
              ) : inCart ? (
                <Check className="w-4 h-4" />
              ) : (
                <ShoppingBag className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
        <CardContent className="p-4 flex-1 flex flex-col">
          <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">
            {product.tenantName}
          </div>
          <h3 className="font-serif text-lg text-foreground line-clamp-1 mb-2">{product.name}</h3>
          <div className="mt-auto flex items-center gap-2">
            <span className="font-bold text-primary">EGP {product.price.toFixed(2)}</span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-sm text-muted-foreground line-through">
                EGP {product.originalPrice.toFixed(2)}
              </span>
            )}
          </div>
          {product.hasVariants && (
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
              <Layers className="w-3 h-3" /> متعدد الخيارات — اختر للإضافة
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
