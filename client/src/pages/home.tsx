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
import { CategoryIcon } from "@/components/ui/category-icon";

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
        <section className="py-6 md:py-12 container mx-auto px-4 overflow-hidden">
          <div className="flex items-center justify-between mb-6 md:mb-10">
            <h2 className="font-heading text-2xl md:text-5xl font-black text-foreground flex items-center gap-4">
              <span className="w-1.5 h-10 md:h-16 bg-gradient-to-b from-primary to-primary-foreground rounded-full shadow-[0_0_15px_rgba(200,150,62,0.4)]" />
              تصفح الأقسام
            </h2>
            <Link href="/shop">
              <Button variant="link" className="text-primary font-black md:text-xl pr-0 h-auto py-0 hover:scale-105 transition-transform group flex items-center gap-2">
                عرض الكل <ArrowLeft className="h-5 w-5 md:h-7 md:w-7 group-hover:-translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          <div className="flex gap-4 md:gap-10 overflow-x-auto no-scrollbar pb-6 snap-x">
            {cats.map((cat: any) => (
              <Link href={`/shop?category=${cat.id}`} key={cat.id}>
                <div className="flex-shrink-0 w-24 md:w-48 group cursor-pointer flex flex-col items-center gap-3 transition-all duration-500 snap-start">
                  <div className="w-20 h-20 md:w-40 md:h-40 rounded-[2rem] md:rounded-[4rem] bg-card border border-primary/20 flex items-center justify-center text-3xl md:text-7xl group-hover:scale-110 group-hover:border-primary/60 group-hover:shadow-[0_0_40px_rgba(200,150,62,0.2)] transition-all overflow-hidden relative">
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CategoryIcon 
                      icon={cat.icon} 
                      className="h-10 w-10 md:h-24 md:w-24 text-primary relative z-10" 
                      imgClassName="p-4 md:p-8" 
                    />
                  </div>
                  <h3 className="font-heading font-black text-center text-[11px] md:text-2xl text-muted-foreground group-hover:text-primary transition-colors tracking-wide">{cat.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Cloud Product Sections */}
        <section className="relative py-10 md:py-20">
          <div className="container mx-auto px-4 space-y-16 md:space-y-32">
            {cats.map((cat: any) => {
              const categoryProducts = featuredProducts?.filter((p: any) => p.category === cat.id) || [];
              if (categoryProducts.length === 0) return null;

              return (
                <div key={cat.id} className="animate-fade-up">
                  <div className="flex items-center justify-between mb-8 md:mb-14">
                    <div className="flex items-center gap-4 md:gap-8">
                      <div className="font-heading text-2xl md:text-6xl font-black text-foreground flex items-center gap-4">
                        <span className="w-1.5 h-10 md:h-20 bg-gradient-to-b from-primary to-primary-foreground rounded-full" />
                        {cat.name}
                      </div>
                    </div>
                    <Link href={`/shop?category=${cat.id}`}>
                      <Button variant="link" className="text-primary font-black md:text-xl pr-0 h-auto py-0 hover:scale-105 transition-transform flex items-center gap-2">
                        <span>عرض الكل</span> <ArrowLeft className="h-5 w-5 md:h-7 md:w-7" />
                      </Button>
                    </Link>
                  </div>

                  <div className="flex overflow-x-auto no-scrollbar gap-2 md:gap-4 pb-6 snap-x">
                    {categoryProducts.slice(0, 6).map((product: any) => (
                      <div key={product.id} className="flex-shrink-0 w-[115px] md:w-[220px] snap-start mb-2">
                        <ProductCard {...product} />
                      </div>
                    ))}
                    <Link href={`/shop?category=${cat.id}`} className="flex-shrink-0 w-[80px] md:w-[150px] snap-start flex flex-col items-center justify-center gap-2 rounded-[1.5rem] md:rounded-[3rem] border-2 border-dashed border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer">
                      <div className="w-8 h-8 md:w-16 md:h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <ArrowLeft className="h-4 w-4 md:h-8 md:w-8" />
                      </div>
                      <span className="font-heading font-black text-[10px] md:text-xl text-primary">المزيد</span>
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

        <section className="py-20 container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            <FeatureItem icon={<ShieldCheck className="h-10 w-10 md:h-16 md:w-16" />} title="جودة استثنائية" desc="منتجات مختارة بعناية فائقة تليق بذائقتكم" color="text-primary" />
            <FeatureItem icon={<Truck className="h-10 w-10 md:h-16 md:w-16" />} title="توصيل ملكي" desc="خدمة توصيل سريعة وآمنة إلى باب المنزل" color="text-primary" />
            <FeatureItem icon={<Send className="h-10 w-10 md:h-16 md:w-16" />} title="خدمة النخبة" desc="دعم فني مخصص لضمان رضاكم التام" color="text-primary" />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function FeatureItem({ icon, title, desc, color }: { icon: any, title: string, desc: string, color: string }) {
  return (
    <div className="flex flex-col items-center text-center p-8 rounded-[3rem] bg-card border border-primary/10 shadow-lg hover:border-primary/40 transition-all duration-500 group">
      <div className={cn("mb-6 bg-primary/5 p-6 rounded-full group-hover:scale-110 transition-transform", color)}>
        {icon}
      </div>
      <h3 className="font-heading text-2xl md:text-3xl font-black text-foreground mb-4">{title}</h3>
      <p className="text-sm md:text-lg text-muted-foreground font-medium leading-relaxed">{desc}</p>
    </div>
  );
}
