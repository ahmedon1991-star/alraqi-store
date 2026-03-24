import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/home/hero";
import { ProductCard } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Truck, ShieldCheck, Headphones, Loader2, Send } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, seedDatabase } from "@/lib/api";
import { useEffect } from "react";

export default function Home() {
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products", { limit: 12 }],
    queryFn: () => apiRequest("/api/products?limit=12"),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: () => apiRequest("/api/categories"),
  });

  useEffect(() => {
    seedDatabase().catch(() => {});
  }, []);

  const featuredProducts = productsData || [];
  const cats = categoriesData || [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <Hero />

      <main className="flex-1">
        <section className="py-20 container mx-auto px-4">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl font-black text-foreground">تصفح الأقسام</h2>
            <Link href="/shop">
              <Button variant="link" className="text-primary font-bold">
                عرض الكل <ArrowLeft className="mr-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-6">
            {cats.map((cat: any) => (
              <Link href={`/shop?category=${cat.id}`} key={cat.id}>
                <div className="group cursor-pointer flex flex-col items-center gap-2 p-3 md:p-6 rounded-2xl bg-white border border-border/50 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 hover:-translate-y-1" data-testid={`card-category-${cat.id}`}>
                  <div className="w-16 h-16 md:w-24 md:h-24 rounded-3xl bg-primary/5 flex items-center justify-center text-2xl md:text-4xl group-hover:scale-110 transition-transform duration-300 group-hover:bg-primary/10 overflow-hidden shadow-sm group-hover:shadow-primary/20">
                    {cat.icon && (cat.icon.startsWith("http") || cat.icon.startsWith("/") || cat.icon.startsWith("data:")) ? (
                      <img src={cat.icon} alt={cat.name} className="w-full h-full object-cover p-2 md:p-3" onError={(e) => { (e.target as HTMLImageElement).src = "https://cdn-icons-png.flaticon.com/512/3081/3081840.png"; }} />
                    ) : (
                      cat.icon || "•"
                    )}
                  </div>
                  <h3 className="font-bold text-center text-xs md:text-lg text-foreground group-hover:text-primary transition-colors leading-tight">{cat.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="py-20 bg-secondary/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-primary font-bold tracking-wider text-sm uppercase mb-2 block">منتجات مختارة</span>
              <h2 className="text-4xl font-black text-foreground mb-4">الأكثر طلباً هذا الأسبوع</h2>
              <p className="text-muted-foreground text-lg">تشكيلة مميزة من المنتجات التي نالت استحسان عملائنا</p>
            </div>

            {productsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {featuredProducts.map((product: any) => (
                  <ProductCard key={product.id} {...product} />
                ))}
              </div>
            )}

            <div className="mt-16 text-center">
              <Link href="/shop">
                <Button size="lg" className="rounded-full px-8 h-12 text-lg font-bold shadow-lg shadow-primary/20">
                  تصفح كل المنتجات
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-20 container mx-auto px-4">
          <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-8">
            <div className="flex flex-col items-center text-center p-4 md:p-10 rounded-3xl md:rounded-[2rem] bg-white border border-border/50 hover:shadow-2xl hover:border-primary/20 transition-all duration-500 shadow-sm hover:-translate-y-2">
              <div className="w-12 h-12 md:w-20 md:h-20 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center mb-4 md:mb-8 shadow-inner">
                <ShieldCheck className="h-6 w-6 md:h-10 md:w-10" />
              </div>
              <h3 className="text-xs md:text-2xl font-black mb-1 md:mb-4 text-slate-800">جودة مضمونة</h3>
              <p className="text-[10px] md:text-lg text-muted-foreground/80 leading-relaxed font-medium">منتجات طبيعية مختارة بعناية فائقة</p>
            </div>
            <div className="flex flex-col items-center text-center p-4 md:p-10 rounded-3xl md:rounded-[2rem] bg-white border border-border/50 hover:shadow-2xl hover:border-primary/20 transition-all duration-500 shadow-sm hover:-translate-y-2">
              <div className="w-12 h-12 md:w-20 md:h-20 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4 md:mb-8 shadow-inner">
                <Truck className="h-6 w-6 md:h-10 md:w-10" />
              </div>
              <h3 className="text-xs md:text-2xl font-black mb-1 md:mb-4 text-slate-800">شحن سريع</h3>
              <p className="text-[10px] md:text-lg text-muted-foreground/80 leading-relaxed font-medium">توصيل آمن وبسرعة فائقة حتى باب بيتك</p>
            </div>
            <div className="flex flex-col items-center text-center p-4 md:p-10 rounded-3xl md:rounded-[2rem] bg-white border border-border/50 hover:shadow-2xl hover:border-primary/20 transition-all duration-500 shadow-sm hover:-translate-y-2">
              <div className="w-12 h-12 md:w-20 md:h-20 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4 md:mb-8 shadow-inner">
                <Send className="h-6 w-6 md:h-10 md:w-10" />
              </div>
              <h3 className="text-xs md:text-2xl font-black mb-1 md:mb-4 text-slate-800">تواصل معنا</h3>
              <p className="text-[10px] md:text-lg text-muted-foreground/80 leading-relaxed font-medium">دعم فني جاهز لخدمتكم على مدار الساعة</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
