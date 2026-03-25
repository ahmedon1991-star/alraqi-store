import { Star, Plus, Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useLocation } from "wouter";
import { useAddToCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";

interface ProductProps {
  id: string;
  name: string;
  price: number;
  image: string | null;
  category: string;
  rating: number | null;
  badge?: string | null;
  sizes?: string | null;
  measurements?: string | null;
  stock?: number | null;
  inStock?: boolean | null;
}

export function ProductCard({ id, name, price, image, category, rating, badge, sizes, measurements, stock, inStock }: ProductProps) {
  const addToCart = useAddToCart();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (addToCart.isPending) return;

    if (sizes || (measurements && measurements.includes(','))) {
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
    <Card className="group overflow-hidden border-none shadow-none bg-transparent relative flex flex-col h-full" data-testid={`card-product-${id}`}>
      {/* Image Area */}
      <div className="relative aspect-square w-full overflow-hidden rounded-[1.2rem] md:rounded-[2.5rem] bg-white border border-border/10 shadow-sm transition-transform duration-300 group-hover:shadow-md">
        <Link href={`/product/${id}`}>
          <img
            src={image || "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?q=80&w=400"}
            alt={name}
            loading="lazy"
            className="w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-105 cursor-pointer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?q=80&w=400";
            }}
          />
        </Link>

        {/* Floating Add Button (HungerStation Style) */}
        {inStock && (
          <button
            onClick={handleAddToCart}
            disabled={addToCart.isPending}
            className="absolute bottom-2 left-2 z-20 w-8 h-8 md:w-12 md:h-12 flex items-center justify-center rounded-xl md:rounded-2xl border border-primary/20 bg-white/90 backdrop-blur-md shadow-lg text-primary hover:bg-primary hover:text-white transition-all transform active:scale-90"
          >
            {addToCart.isPending ? <Loader2 className="h-4 w-4 md:h-6 md:w-6 animate-spin" /> : <Plus className="h-4 w-4 md:h-6 md:w-6 stroke-[3]" />}
          </button>
        )}

        {/* Status Badges */}
        {badge && (
          <div className="absolute top-0 right-0 z-10 bg-emerald-500 text-white text-[8px] md:text-xs font-black px-2 py-1 rounded-bl-xl md:rounded-bl-3xl shadow-md">
            {badge}
          </div>
        )}
        
        {!inStock && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/5 opacity-80">
            <Badge variant="destructive" className="font-black text-[10px] md:text-base border-2 border-white/20">منتهي</Badge>
          </div>
        )}
      </div>

      {/* Content Area */}
      <CardContent className="p-2 md:p-4 text-right flex flex-col flex-1 space-y-1">
        <div className="flex items-center justify-between">
           <span className="text-[8px] md:text-xs font-bold text-muted-foreground uppercase opacity-60">{category}</span>
           {rating && rating > 0 && (
             <div className="flex items-center gap-0.5 text-amber-500 text-[8px] md:text-xs font-black">
               <span>{rating}</span>
               <Star className="h-2.5 w-2.5 md:h-3.5 md:w-3.5 fill-current" />
             </div>
           )}
        </div>

        <Link href={`/product/${id}`}>
          <h3 className="font-bold text-xs md:text-xl text-foreground line-clamp-2 leading-tight md:leading-snug cursor-pointer hover:text-primary transition-colors">
            {name}
          </h3>
        </Link>
        
        {measurements && (
          <p className="text-[10px] md:text-sm font-medium text-muted-foreground/80 line-clamp-1">
            {measurements}
          </p>
        )}

        <div className="font-black text-sm md:text-2xl text-slate-800 mt-auto pt-1 flex items-baseline gap-1">
          {price.toLocaleString()} <span className="text-[10px] md:text-sm font-bold text-muted-foreground/60">ج.س</span>
        </div>
      </CardContent>
    </Card>
  );
}
