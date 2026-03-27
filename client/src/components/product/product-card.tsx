import { useState, useMemo } from "react";
import { ListOrdered, Star, Plus, Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useLocation } from "wouter";
import { useAddToCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { useWishlist } from "@/hooks/use-wishlist";
import { cn } from "@/lib/utils";

interface ProductProps {
  id: string;
  name: string;
  price: number;
  image: string | null;
  category: string;
  rating: number | null;
  variants?: string | null;
  badge?: string | null;
  sizes?: string | null;
  measurements?: string | null;
  stock?: number | null;
  inStock?: boolean | null;
  originalPrice?: number | null;
}

export function ProductCard({ id, name, price, image, category, rating, badge, sizes, measurements, stock, inStock, originalPrice, variants }: ProductProps) {
  const addToCart = useAddToCart();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { isInWishlist, toggleItem } = useWishlist();

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleItem(id, name);
  };

  const parsedVariants = useMemo(() => {
    if (!variants) return [];
    try {
      return typeof variants === 'string' ? JSON.parse(variants) : variants;
    } catch (e) {
      console.error("ProductCard: Failed to parse variants", e);
      return [];
    }
  }, [variants]);
  
  const hasVariants = parsedVariants.length > 0;

  const discountBadge = originalPrice && originalPrice > price 
    ? `${Math.round(((originalPrice - price) / originalPrice) * 100)}%` 
    : null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (addToCart.isPending) return;

    if (hasVariants || sizes || (measurements && measurements.includes(','))) {
      toast({ title: "مطلوب اختيار التفاصيل", description: "هذا المنتج يتطلب تحديد المقاس أو الحجم." });
      setLocation(`/product/${id}`);
      return;
    }

    addToCart.mutate({ productId: id }, {
      onSuccess: () => {
        toast({ title: "تمت الإضافة", description: `${name} أُضيف إلى السلة` });
      },
    });
  };

  return (
    <Card className="group overflow-hidden border-none shadow-none bg-transparent relative flex flex-col h-full animate-fade-up" data-testid={`card-product-${id}`}>
      {/* Image Area */}
      <div className="relative aspect-square w-full overflow-hidden rounded-[1.2rem] md:rounded-[3rem] bg-card shadow-lg shadow-black/5 transition-all duration-500 group-hover:shadow-[0_20px_40px_rgba(200,150,62,0.1)] group-hover:-translate-y-1">
        <Link href={`/product/${id}`}>
          <img
            src={image || "/images/product-spices.png"}
            alt={name}
            loading="lazy"
            className="w-full h-full object-contain p-2 md:p-4 transition-transform duration-500 group-hover:scale-105 cursor-pointer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/images/category-spices.png";
            }}
          />
        </Link>
        
        {/* Wishlist Button */}
        <button
          onClick={handleWishlistToggle}
          className={cn(
            "absolute bottom-2 right-2 z-20 w-8 h-8 md:w-14 md:h-14 flex items-center justify-center rounded-xl md:rounded-2xl transition-all duration-300",
            isInWishlist(id) 
              ? "bg-red-50 text-red-500 shadow-lg shadow-red-200/50 border border-red-100" 
              : "bg-white/90 backdrop-blur-md text-muted-foreground/80 hover:text-red-400 border border-border/50"
          )}
        >
          <Heart className={cn("h-4 w-4 md:h-6 md:w-6 transition-transform", isInWishlist(id) ? "fill-current scale-110" : "")} />
        </button>
        {/* Floating Add Button (HungerStation Style) */}
        {inStock && (
          <button
            onClick={handleAddToCart}
            disabled={addToCart.isPending}
            className="absolute bottom-2 left-2 z-20 w-8 h-8 md:w-14 md:h-14 flex items-center justify-center rounded-xl md:rounded-2xl border border-primary/20 bg-card/80 backdrop-blur-md shadow-lg text-primary hover:bg-primary hover:text-primary-foreground transition-all transform active:scale-90"
          >
            {addToCart.isPending ? <Loader2 className="h-4 w-4 md:h-7 md:w-7 animate-spin" /> : <Plus className="h-4 w-4 md:h-7 md:w-7 stroke-[3]" />}
          </button>
        )}

        {/* Status Badges */}
        {(discountBadge || badge) && (
          <div className="absolute top-0 right-0 z-10 bg-gradient-to-br from-primary to-primary-foreground text-black text-[9px] md:text-sm font-black px-3 py-1 md:px-5 md:py-2 rounded-bl-[1.5rem] md:rounded-bl-[3rem] shadow-xl flex flex-col items-center">
            {discountBadge && <span className="leading-none">{discountBadge}</span>}
            {discountBadge && <span className="text-[7px] md:text-[11px] leading-tight uppercase">خصم</span>}
            {!discountBadge && badge && <span>{badge}</span>}
          </div>
        )}
        
        {!inStock && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/5 opacity-80 backdrop-blur-[1px]">
            <Badge variant="destructive" className="font-black text-[10px] md:text-base border-2 border-white/20">منتهي</Badge>
          </div>
        )}
      </div>

      {/* Content Area */}
      <CardContent className="p-1 md:p-4 text-right flex flex-col flex-1 space-y-0.5 md:space-y-1">
        <div className="flex items-center justify-between">
           <span className="text-[7px] md:text-xs font-bold text-muted-foreground uppercase opacity-60 tracking-wider font-mono">{category}</span>
           {rating && rating > 0 && (
             <div className="flex items-center gap-0.5 text-amber-500 text-[8px] md:text-xs font-black">
               <span>{rating}</span>
               <Star className="h-2 w-2 md:h-3.5 md:w-3.5 fill-current" />
             </div>
           )}
        </div>

        <Link href={`/product/${id}`}>
          <h3 className="font-heading font-black text-[11px] md:text-2xl text-foreground line-clamp-2 leading-tight md:leading-snug cursor-pointer group-hover:text-primary transition-colors">
            {name}
          </h3>
        </Link>
        
        {measurements && (
          <p className="text-[9px] md:text-base font-medium text-muted-foreground/80 line-clamp-1 mb-1">
            {measurements}
          </p>
        )}

        <div className="mt-auto pt-2">
          {originalPrice && originalPrice > price && (
            <div className="text-[9px] md:text-base text-muted-foreground/40 line-through font-bold mb-[-3px] flex items-center gap-1">
              <span>{originalPrice.toLocaleString()}</span>
              <span className="text-[7px] md:text-xs">ج.س</span>
            </div>
          )}
          <div className="font-black text-[17px] md:text-3xl text-primary flex items-baseline gap-1">
            <span className="font-mono tracking-tighter">{price.toLocaleString()}</span>
            <span className="text-[11px] md:text-lg font-bold opacity-80">ج.س</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
