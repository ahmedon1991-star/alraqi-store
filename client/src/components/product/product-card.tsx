import { Star, ShoppingCart, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
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
}

export function ProductCard({ id, name, price, image, category, rating, badge, sizes, measurements }: ProductProps) {
  const addToCart = useAddToCart();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    if (addToCart.isPending) return;

    if (sizes || measurements) {
      toast({ title: "مطلوب اختيار التفاصيل", description: "هذا المنتج يتطلب تحديد المقاس أو الحجم، سيتم نقلك لصفحة المنتج." });
      setLocation(`/product/${id}`);
      return;
    }

    addToCart.mutate({ productId: id }, {
      onSuccess: () => {
        toast({ title: "تمت الإضافة", description: `${name} أُضيف إلى السلة` });
      },
    });
  }

  return (
    <Card className="group overflow-hidden border-none shadow-sm hover:shadow-md transition-all duration-300 bg-white hover:-translate-y-1 relative" data-testid={`card-product-${id}`}>
      <div className="relative aspect-[1/1] overflow-hidden bg-white flex items-center justify-center">
        {badge && (
          <Badge className="absolute top-1 right-1 z-10 bg-primary/90 hover:bg-primary text-[8px] sm:text-[10px] px-1.5 py-0 font-bold shadow-sm rounded-sm">
            {badge}
          </Badge>
        )}
        <Button
          size="sm"
          variant="secondary"
          className="absolute top-1 left-1 z-10 w-6 h-6 sm:w-8 sm:h-8 opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-white/80 backdrop-blur-sm text-gray-700 hover:text-red-500 hover:bg-white p-0"
          data-testid={`button-wishlist-${id}`}
        >
          <Heart className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
        <Link href={`/product/${id}`}>
          <img
            src={image || "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?q=80&w=400"}
            alt={name}
            loading="lazy"
            className="w-full h-full object-contain p-0.5 transition-transform duration-500 group-hover:scale-105 cursor-pointer"
          />
        </Link>
      </div>

      <CardContent className="p-2 sm:p-3 text-right">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[8px] sm:text-[10px] font-medium text-muted-foreground uppercase tracking-tight truncate max-w-[60%]">{category}</span>
          <div className="flex items-center gap-0.5 text-amber-400 text-[8px] sm:text-[10px] font-bold">
            <span>{rating ?? 0}</span>
            <Star className="h-2 w-2 sm:h-2.5 sm:w-2.5 fill-current" />
          </div>
        </div>
        <Link href={`/product/${id}`}>
          <h3 className="font-bold text-[11px] sm:text-base mb-0.5 text-foreground line-clamp-2 leading-tight h-[2.2em] hover:text-primary transition-colors cursor-pointer">
            {name}
          </h3>
        </Link>
        <div className="font-black text-[13px] sm:text-lg text-primary font-mono mt-1">
          {price.toLocaleString()} <span className="text-[8px] sm:text-xs font-medium text-muted-foreground">ج.س</span>
        </div>
      </CardContent>

      <CardFooter className="p-2 sm:p-3 pt-0">
        <Button
          className="w-full rounded-md font-bold h-7 sm:h-9 text-[10px] sm:text-sm gap-1 hover-elevate group-hover:bg-primary group-hover:text-primary-foreground transition-colors p-0 sm:p-2"
          variant="outline"
          onClick={handleAddToCart}
          disabled={addToCart.isPending}
          data-testid={`button-add-to-cart-${id}`}
        >
          <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4" />
          إضافة
        </Button>
      </CardFooter>
    </Card>
  );
}
