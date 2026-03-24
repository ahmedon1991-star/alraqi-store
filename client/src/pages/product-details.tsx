import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Star, Truck, ShieldCheck, Heart, Minus, Plus, ShoppingCart, Loader2, Package } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useAddToCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useCurrentUser } from "@/hooks/use-auth";
import { useWishlist } from "@/hooks/use-wishlist";

export default function ProductDetails() {
  const [, params] = useRoute("/product/:id");
  const [quantity, setQuantity] = useState(1);
  const addToCart = useAddToCart();
  const { toast } = useToast();
  const { data: user } = useCurrentUser();
  const [hoverRating, setHoverRating] = useState(0);
  const { isInWishlist, toggleItem } = useWishlist();
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedMeasurement, setSelectedMeasurement] = useState<string>("");

  const { data: product, isLoading } = useQuery({
    queryKey: ["/api/products", params?.id],
    queryFn: () => apiRequest(`/api/products/${params?.id}`),
    enabled: !!params?.id,
  });

  function handleAddToCart() {
    if (!product) return;
    
    const sizesList = product.sizes ? product.sizes.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    const measurementList = product.measurements ? product.measurements.split(',').map((m: string) => m.trim()).filter(Boolean) : [];

    if (sizesList.length > 0 && !selectedSize) {
      toast({ title: "تنبيه", description: "يرجى اختيار المقاس المناسب قبل الإضافة للسلة", variant: "destructive" });
      return;
    }

    if (measurementList.length > 0 && !selectedMeasurement) {
      toast({ title: "تنبيه", description: "يرجى اختيار الحجم أو الوزن قبل الإضافة للسلة", variant: "destructive" });
      return;
    }

    for (let i = 0; i < quantity; i++) {
      addToCart.mutate({ 
        productId: product.id, 
        size: selectedSize || undefined, 
        measurement: selectedMeasurement || undefined 
      });
    }
    toast({ title: "تمت الإضافة", description: `${product.name} (${quantity}) أُضيف إلى السلة` });
  }

  const rateMutation = useMutation({
    mutationFn: (rating: number) =>
      apiRequest(`/api/products/${product?.id}/rate`, {
        method: "POST",
        body: JSON.stringify({ rating }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products", params?.id] });
      toast({ title: "شكراً لك!", description: "تم استلام تقييمك بنجاح." });
    },
    onError: () => {
      toast({ title: "خطأ", description: "يجب تسجيل الدخول للتقييم", variant: "destructive" });
    },
  });

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
            <div className="aspect-square rounded-3xl overflow-hidden bg-white flex items-center justify-center p-1 relative shadow-sm border border-border/50">
              {product.badge && (
                <Badge className="absolute top-4 right-4 z-10 bg-primary text-lg px-4 py-1 shadow-sm">
                  {product.badge}
                </Badge>
              )}
              {!product.inStock && (
                <div className="absolute inset-0 z-20 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                  <Badge variant="destructive" className="text-2xl px-8 py-3 font-black shadow-2xl rounded-2xl rotate-12 border-4 border-white/30 animate-in zoom-in duration-300">
                    نفذت الكمية
                  </Badge>
                </div>
              )}
              <img
                src={product.image || "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?q=80&w=800"}
                alt={product.name}
                className="w-full h-full object-contain"
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
              
              {product.inStock && product.stock !== undefined && product.stock !== null && product.stock > 0 && product.stock <= 5 && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-2xl text-orange-700 animate-pulse mb-4">
                  <Package className="h-5 w-5" />
                  <span className="font-bold">سارع بالطلب! المتبقي {product.stock} فقط في المخزون</span>
                </div>
              )}
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

            {(() => {
              const sizesList = product.sizes ? product.sizes.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
              const measurementList = product.measurements ? product.measurements.split(',').map((m: string) => m.trim()).filter(Boolean) : [];
              
              if (sizesList.length === 0 && measurementList.length === 0) return null;
              
              return (
                <div className="bg-white p-6 rounded-2xl border border-border/50 shadow-sm space-y-5 mt-2">
                  {sizesList.length > 0 && (
                    <div>
                      <h3 className="font-bold text-lg mb-3">اختر المقاس:</h3>
                      <div className="flex flex-wrap gap-2 text-sm font-medium">
                        {sizesList.map((s: string, idx: number) => (
                           <button 
                             key={idx}
                             onClick={() => setSelectedSize(s)}
                             className={`min-w-12 h-10 px-4 rounded-xl border flex items-center justify-center transition-all ${selectedSize === s ? "border-primary bg-primary/10 text-primary font-bold scale-105" : "border-border text-muted-foreground hover:border-primary/50"}`}
                           >
                             {s}
                           </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {measurementList.length > 0 && (
                    <div>
                      <h3 className="font-bold text-lg mb-3">اختر الحجم / الوزن:</h3>
                      <div className="flex flex-wrap gap-2 text-sm font-medium">
                        {measurementList.map((m: string, idx: number) => (
                           <button 
                             key={idx}
                             onClick={() => setSelectedMeasurement(m)}
                             className={`min-w-12 h-10 px-4 rounded-xl border flex items-center justify-center transition-all ${selectedMeasurement === m ? "border-primary bg-primary/10 text-primary font-bold scale-105" : "border-border text-muted-foreground hover:border-primary/50"}`}
                           >
                             {m}
                           </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="bg-white p-6 rounded-2xl border border-border/50 shadow-sm mt-2">
              <h3 className="font-bold text-lg mb-3">قيم هذا المنتج</h3>
              <div className="flex items-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="transition-transform hover:scale-110 focus:outline-none"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => rateMutation.mutate(star)}
                    disabled={rateMutation.isPending}
                  >
                    <Star
                      className={`h-8 w-8 ${(hoverRating || 0) >= star ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                        }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                {user ? "اضغط على النجوم للتقييم" : "يجب عليك تسجيل الدخول لتتمكن من التقييم"}
              </p>
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
                className={`flex-1 h-14 rounded-full text-lg font-bold gap-2 shadow-lg transition-all ${!product.inStock ? 'opacity-80' : 'hover:shadow-primary/25'}`}
                onClick={handleAddToCart}
                disabled={addToCart.isPending || !product.inStock}
                data-testid="button-add-to-cart"
                variant={product.inStock ? "default" : "secondary"}
              >
                {product.inStock ? (
                  <>
                    <ShoppingCart className="h-5 w-5" />
                    إضافة للسلة - {(product.price * quantity).toLocaleString()} ج.س
                  </>
                ) : (
                  <>
                    <Package className="h-5 w-5" />
                    نفذت الكمية حالياً
                  </>
                )}
              </Button>

              <Button
                size="icon"
                variant="outline"
                className={`h-14 w-14 rounded-full border-border hover:text-red-500 hover:border-red-200 hover:bg-red-50 ${isInWishlist(product.id) ? "text-red-500 bg-red-50 border-red-200" : ""}`}
                onClick={() => toggleItem(product.id, product.name)}
              >
                <Heart className={`h-6 w-6 ${isInWishlist(product.id) ? "fill-current" : ""}`} />
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
