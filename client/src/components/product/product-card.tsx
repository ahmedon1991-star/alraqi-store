import { Star, ShoppingCart, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Link } from "wouter";
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
}

export function ProductCard({ id, name, price, image, category, rating, badge }: ProductProps) {
  const addToCart = useAddToCart();
  const { toast } = useToast();

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    addToCart.mutate(id, {
      onSuccess: () => {
        toast({ title: "تمت الإضافة", description: `${name} أُضيف إلى السلة` });
      },
    });
  }

  return (
    <Card className="group overflow-hidden border-none shadow-sm hover:shadow-md transition-all duration-300 bg-white hover:-translate-y-1" data-testid={`card-product-${id}`}>
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        {badge && (
          <Badge className="absolute top-3 right-3 z-10 bg-primary hover:bg-primary text-primary-foreground font-bold shadow-sm">
            {badge}
          </Badge>
        )}
        <Button
          size="icon"
          variant="secondary"
          className="absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-white/80 backdrop-blur-sm text-gray-700 hover:text-red-500 hover:bg-white"
          data-testid={`button-wishlist-${id}`}
        >
          <Heart className="h-4 w-4" />
        </Button>
        <Link href={`/product/${id}`}>
          <img
            src={image || "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?q=80&w=400"}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 cursor-pointer"
          />
        </Link>
      </div>

      <CardContent className="p-4 pt-5 text-right">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{category}</span>
          <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
            <span>{rating ?? 0}</span>
            <Star className="h-3 w-3 fill-current" />
          </div>
        </div>
        <Link href={`/product/${id}`}>
          <h3 className="font-bold text-lg mb-2 text-foreground line-clamp-1 hover:text-primary transition-colors cursor-pointer">
            {name}
          </h3>
        </Link>
        <div className="font-black text-xl text-primary font-mono">
          {price.toLocaleString()} <span className="text-sm font-medium text-muted-foreground">ج.س</span>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button
          className="w-full rounded-full font-bold gap-2 hover-elevate group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
          variant="outline"
          onClick={handleAddToCart}
          disabled={addToCart.isPending}
          data-testid={`button-add-to-cart-${id}`}
        >
          <ShoppingCart className="h-4 w-4" />
          إضافة للسلة
        </Button>
      </CardFooter>
    </Card>
  );
}
