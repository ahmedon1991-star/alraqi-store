import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Star, Truck, ShieldCheck, Heart, Minus, Plus, ShoppingCart, Loader2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useAddToCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";

export default function ProductDetails() {
  const [, params] = useRoute("/product/:id");
  const [quantity, setQuantity] = useState(1);
  const addToCart = useAddToCart();
  const { toast } = useToast();

  const { data: product, isLoading } = useQuery({
    queryKey: ["/api/products", params?.id],
    queryFn: () => apiRequest(`/api/products/${params?.id}`),
    enabled: !!params?.id,
  });

  function handleAddToCart() {
    if (!product) return;
    for (let i = 0; i < quantity; i++) {
      addToCart.mutate(product.id);
    }
    toast({ title: "تمت الإضافة", description: `${product.name} (${quantity}) أُضيف إلى السلة` });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <h2 className="text-2xl font-bold mb-2">المنتج غير موجود</h2>
            <p className="text-muted-foreground">عذراً، لم نتمكن من العثور على هذا المنتج.</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          <div className="space-y-4">
            <div className="aspect-square rounded-3xl overflow-hidden bg-white shadow-sm border border-border/50 relative">
              {product.badge && (
                <Badge className="absolute top-4 right-4 z-10 bg-primary text-lg px-4 py-1">
                  {product.badge}
                </Badge>
              )}
              <img
                src={product.image || "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?q=80&w=800"}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-bold text-primary uppercase tracking-wider">{product.category}</span>
                <span className="text-border">|</span>
                <div className="flex items-center text-amber-400">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="text-foreground font-bold ml-1">{product.rating}</span>
                  <span className="text-muted-foreground text-xs mr-1">({product.reviews} تقييم)</span>
                </div>
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-foreground mb-2" data-testid="text-product-name">{product.name}</h1>
              <h2 className="text-xl text-muted-foreground font-medium mb-6 opacity-80">{product.nameEn}</h2>

              <div className="flex items-end gap-3 mb-8">
                <span className="text-4xl font-black text-primary font-mono" data-testid="text-product-price">{product.price.toLocaleString()}</span>
                <span className="text-xl font-bold text-muted-foreground mb-2">ج.س</span>
              </div>
            </div>

            <div className="bg-muted/30 p-6 rounded-2xl space-y-4 border border-border/50">
              <p className="leading-relaxed text-muted-foreground">
                {product.description || "منتج سوداني أصيل بجودة عالية وطعم مميز."}
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm font-medium">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                  <span>طبيعي 100%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-blue-600" />
                  <span>توصيل سريع</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t mt-auto">
              <div className="flex items-center justify-between bg-white border border-border rounded-full px-4 h-14 w-full sm:w-40">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground"
                  data-testid="button-quantity-minus"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-xl font-bold font-mono" data-testid="text-quantity">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground"
                  data-testid="button-quantity-plus"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <Button
                size="lg"
                className="flex-1 h-14 rounded-full text-lg font-bold gap-2 shadow-lg hover:shadow-primary/25 transition-all"
                onClick={handleAddToCart}
                disabled={addToCart.isPending}
                data-testid="button-add-to-cart"
              >
                <ShoppingCart className="h-5 w-5" />
                إضافة للسلة - {(product.price * quantity).toLocaleString()} ج.س
              </Button>

              <Button size="icon" variant="outline" className="h-14 w-14 rounded-full border-border hover:text-red-500 hover:border-red-200 hover:bg-red-50">
                <Heart className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
