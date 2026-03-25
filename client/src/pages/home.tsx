import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/home/hero";
import { ProductCard } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Truck, ShieldCheck, Loader2, Send, ShoppingBag } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, seedDatabase } from "@/lib/api";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

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
        {/* Categories Section - Compact Grid */}
        <section className="py-6 md:py-10 container mx-auto px-4 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-3xl font-black text-foreground">تصفح الأقسام</h2>
            <Link href="/shop">
              <Button variant="link" className="text-primary font-bold pr-0 h-auto py-0">
                عرض الكل <ArrowLeft className="mr-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 snap-x">
            {cats.map((cat: any) => (
              <Link href={`/shop?category=${cat.id}`} key={cat.id}>
                <div className="flex-shrink-0 w-20 md:w-32 group cursor-pointer flex flex-col items-center gap-1.5 p-1.5 md:p-4 rounded-xl md:rounded-3xl bg-white border border-border/50 shadow-sm hover:shadow-lg transition-all duration-300 snap-start">
                  <div className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-primary/5 flex items-center justify-center text-xl md:text-3xl group-hover:scale-110 transition-transform">
                    {cat.icon && (cat.icon.startsWith("http") || cat.icon.startsWith("/") || cat.icon.startsWith("data:")) ? (
                      <img src={cat.icon} alt={cat.name} className="w-full h-full object-cover p-2 md:p-3" onError={(e) => { (e.target as HTMLImageElement).src = "https://cdn-icons-png.flaticon.com/512/3081/3081840.png"; }} />
                    ) : (
                      cat.icon || "•"
                    )}
                  </div>
                  <h3 className="font-bold text-center text-[10px] md:text-base text-gray-700 group-hover:text-primary transition-colors whitespace-nowrap overflow-hidden text-ellipsis w-full">{cat.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Cloud Product Sections */}
        <section className="bg-secondary/5 relative">
          <div className="container mx-auto px-2 md:px-4 space-y-4 md:space-y-8 py-4 md:py-10">
            {cats.map((cat: any) => {
              const categoryProducts = featuredProducts?.filter((p: any) => p.category === cat.id) || [];
              if (categoryProducts.length === 0) return null;

              return (
                <div key={cat.id} className="bg-white/40 rounded-3xl p-3 md:p-6 border border-white shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between mb-3 md:mb-6">
                    <div className="flex items-center gap-2 md:gap-4">
                      <div className="w-8 h-8 md:w-14 md:h-14 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm border border-border/50">
                        {cat.icon && (cat.icon.startsWith("http") || cat.icon.startsWith("/") || cat.icon.startsWith("data:")) ? (
                          <img src={cat.icon} alt={cat.name} className="w-5 h-5 md:w-8 md:w-8 object-contain" />
                        ) : (
                          <ShoppingBag className="h-5 w-5 md:h-8 md:w-8" />
                        )}
                      </div>
                      <h2 className="text-base md:text-2xl font-black text-foreground">{cat.name}</h2>
                    </div>
                    <Link href={`/shop?category=${cat.id}`}>
                      <Button variant="link" className="text-rose-500 font-bold hover:no-underline px-0 text-xs md:text-base flex items-center gap-1 h-auto py-0">
                        <span>عرض الكل</span> <ArrowLeft className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>

                  <div className="flex overflow-x-auto no-scrollbar gap-2.5 md:gap-6 pb-2 snap-x pr-1">
                    {categoryProducts.slice(0, 10).map((product: any) => (
                      <div key={product.id} className="flex-shrink-0 w-[130px] md:w-[260px] snap-start mb-1 h-full">
                        <ProductCard {...product} />
                      </div>
                    ))}
                    <Link href={`/shop?category=${cat.id}`} className="flex-shrink-0 w-[80px] md:w-[150px] snap-start flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer self-stretch">
                      <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <ArrowLeft className="h-4 w-4 md:h-6 md:w-6" />
                      </div>
                      <span className="font-bold text-[10px] md:text-base text-primary">المزيد</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {productsLoading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Small Shop All Button */}
        <div className="py-6 text-center">
          <Link href="/shop">
            <Button className="rounded-full px-6 h-10 text-base font-bold shadow-md shadow-primary/10">
              تصفح كل المنتجات
            </Button>
          </Link>
        </div>

        {/* Features - Compact */}
        <section className="py-8 container mx-auto px-4">
          <div className="grid grid-cols-3 gap-2 md:gap-6">
            <FeatureItem icon={<ShieldCheck className="h-5 w-5 md:h-8 md:w-8" />} title="جودة مضمونة" desc="مختارة بعناية" color="bg-green-100 text-green-600" />
            <FeatureItem icon={<Truck className="h-5 w-5 md:h-8 md:w-8" />} title="شحن سريع" desc="توصيل آمن" color="bg-blue-100 text-blue-600" />
            <FeatureItem icon={<Send className="h-5 w-5 md:h-8 md:w-8" />} title="تواصل معنا" desc="دعم فني 24/7" color="bg-orange-100 text-orange-600" />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function FeatureItem({ icon, title, desc, color }: { icon: any, title: string, desc: string, color: string }) {
  return (
    <div className="flex flex-col items-center text-center p-2 rounded-2xl bg-white border border-border/40 shadow-sm">
      <div className={cn("w-10 h-10 md:w-16 md:h-16 rounded-xl flex items-center justify-center mb-1 md:mb-3", color)}>
        {icon}
      </div>
      <h3 className="text-[10px] md:text-xl font-black text-slate-800">{title}</h3>
      <p className="hidden md:block text-xs text-muted-foreground/80 font-medium">{desc}</p>
    </div>
  );
}
