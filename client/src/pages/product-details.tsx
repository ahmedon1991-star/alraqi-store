import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useRoute } from "wouter";
import { products } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Star, Truck, ShieldCheck, Heart, Minus, Plus, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export default function ProductDetails() {
  const [match, params] = useRoute("/product/:id");
  const [quantity, setQuantity] = useState(1);
  
  // Find product or default to first
  const product = params && products.find(p => p.id === parseInt(params.id)) || products[0];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="aspect-square rounded-3xl overflow-hidden bg-white shadow-sm border border-border/50 relative">
               {product.badge && (
                <Badge className="absolute top-4 right-4 z-10 bg-primary text-lg px-4 py-1">
                  {product.badge}
                </Badge>
              )}
              <img 
                src={product.image} 
                alt={product.name} 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="aspect-square rounded-xl overflow-hidden border-2 border-primary cursor-pointer">
                <img src={product.image} alt="thumbnail" className="w-full h-full object-cover" />
              </div>
              <div className="aspect-square rounded-xl overflow-hidden border border-border/50 cursor-pointer opacity-70 hover:opacity-100 transition-opacity">
                <img src={product.image} alt="thumbnail" className="w-full h-full object-cover grayscale hover:grayscale-0" />
              </div>
              <div className="aspect-square rounded-xl overflow-hidden border border-border/50 cursor-pointer opacity-70 hover:opacity-100 transition-opacity">
                <img src={product.image} alt="thumbnail" className="w-full h-full object-cover grayscale hover:grayscale-0" />
              </div>
            </div>
          </div>

          {/* Product Info */}
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
              <h1 className="text-3xl md:text-5xl font-black text-foreground mb-2">{product.name}</h1>
              <h2 className="text-xl text-muted-foreground font-medium mb-6 font-serif opacity-80">{product.nameEn}</h2>
              
              <div className="flex items-end gap-3 mb-8">
                <span className="text-4xl font-black text-primary font-mono">{product.price.toLocaleString()}</span>
                <span className="text-xl font-bold text-muted-foreground mb-2">ج.س</span>
              </div>
            </div>

            <div className="bg-muted/30 p-6 rounded-2xl space-y-4 border border-border/50">
               <p className="leading-relaxed text-muted-foreground">
                 هذا النص هو مثال لنص يمكن أن يستبدل في نفس المساحة. جودة عالية وطعم أصيل يضمن لك تجربة سودانية فريدة.
                 يتم استخراج المنتج بعناية من أفضل المزارع وتجهيزه بأعلى معايير الجودة.
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

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t mt-auto">
               <div className="flex items-center justify-between bg-white border border-border rounded-full px-4 h-14 w-full sm:w-40">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-xl font-bold font-mono">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
               </div>
               
               <Button size="lg" className="flex-1 h-14 rounded-full text-lg font-bold gap-2 shadow-lg hover:shadow-primary/25 transition-all">
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
