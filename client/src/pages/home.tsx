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
  const { data: productsData, isLoading: productsLoading } = useQuery<any[]>({
    queryKey: ["/api/products"],
    queryFn: () => apiRequest("/api/products"),
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
        <section className="py-12 md:py-20 container mx-auto px-4 overflow-hidden">
          <div className="flex items-center justify-between mb-8 md:mb-10">
            <h2 className="text-2xl md:text-3xl font-black text-foreground">تصفح الأقسام</h2>
            <Link href="/shop">
              <Button variant="link" className="text-primary font-bold pr-0">
                عرض الكل <ArrowLeft className="mr-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="flex md:grid md:grid-cols-5 gap-3 md:gap-6 overflow-x-auto no-scrollbar pb-4 md:pb-0 snap-x">
            {cats.map((cat: any) => (
              <Link href={`/shop?category=${cat.id}`} key={cat.id}>
                <div className="flex-shrink-0 w-24 md:w-auto group cursor-pointer flex flex-col items-center gap-2 p-2 md:p-6 rounded-2xl md:rounded-3xl bg-white border border-border/50 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 snap-start" data-testid={`card-category-${cat.id}`}>
                  <div className="w-16 h-16 md:w-24 md:h-24 rounded-full md:rounded-3xl bg-primary/5 flex items-center justify-center text-2xl md:text-4xl group-hover:scale-110 transition-transform duration-300 group-hover:bg-primary/10 overflow-hidden shadow-sm group-hover:shadow-primary/20">
                    {cat.icon && (cat.icon.startsWith("http") || cat.icon.startsWith("/") || cat.icon.startsWith("data:")) ? (
                      <img src={cat.icon} alt={cat.name} className="w-full h-full object-cover p-2 md:p-3" onError={(e) => { (e.target as HTMLImageElement).src = "https://cdn-icons-png.flaticon.com/512/3081/3081840.png"; }} />
                    ) : (
                      cat.icon || "•"
                    )}
                  </div>
                  <h3 className="font-bold text-center text-[10px] md:text-lg text-foreground group-hover:text-primary transition-colors leading-tight truncate w-full px-1">{cat.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="py-20 bg-secondary/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

          <div className="container mx-auto px-4 relative z-10">
            {/* الأقسام السحابية - عرض المنتجات حسب كل قسم */}
        <section className="py-8 md:py-16 container mx-auto px-4 space-y-16">
          {cats.map((cat: any) => {
            const categoryProducts = featuredProducts?.filter((p: any) => p.category === cat.id) || [];
            if (categoryProducts.length === 0) return null;

            return (
              <div key={cat.id} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl md:text-2xl shadow-sm">
                      {cat.icon && (cat.icon.startsWith("http") || cat.icon.startsWith("/") || cat.icon.startsWith("data:")) ? (
                        <img src={cat.icon} alt={cat.name} className="w-6 h-6 md:w-8 md:h-8 object-contain" />
                      ) : (
                        cat.icon || "📦"
                      )}
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-foreground">{cat.name}</h2>
                  </div>
                  <Link href={`/shop?category=${cat.id}`}>
                    <Button variant="ghost" className="text-primary font-bold hover:bg-primary/5 rounded-full px-4">
                      عرض الكل <ArrowLeft className="mr-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>

                <div className="flex overflow-x-auto no-scrollbar gap-4 md:gap-6 pb-4 snap-x">
                  {categoryProducts.map((product: any) => (
                    <div key={product.id} className="flex-shrink-0 w-[160px] md:w-[240px] snap-start mb-2">
                      <ProductCard {...product} />
                    </div>
                  ))}
                  <Link href={`/shop?category=${cat.id}`} className="flex-shrink-0 w-[140px] md:w-[200px] snap-start flex flex-col items-center justify-center gap-4 rounded-[2rem] border-2 border-dashed border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors group cursor-pointer h-full min-h-[220px] md:min-h-[350px]">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <ArrowLeft className="h-6 w-6 md:h-8 md:h-8" />
                    </div>
                    <span className="font-bold text-sm md:text-base text-primary">مشاهدة المزيد</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </section>

        {productsLoading && (
          <section className="py-20 container mx-auto px-4">
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          </section>
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
