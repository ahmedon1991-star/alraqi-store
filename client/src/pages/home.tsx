import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/home/hero";
import { ProductCard } from "@/components/product/product-card";
import { products, categories } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Truck, ShieldCheck, Headphones } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const featuredProducts = products.slice(0, 4);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <Hero />
      
      <main className="flex-1">
        {/* Categories Section */}
        <section className="py-20 container mx-auto px-4">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl font-black text-foreground">تصفح الأقسام</h2>
            <Link href="/shop">
              <Button variant="link" className="text-primary font-bold">
                عرض الكل <ArrowLeft className="mr-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {categories.map((cat) => (
              <Link href={`/shop?category=${cat.id}`} key={cat.id}>
                <div className="group cursor-pointer flex flex-col items-center gap-4 p-6 rounded-2xl bg-white border border-border/50 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
                  <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center text-4xl group-hover:scale-110 transition-transform duration-300 group-hover:bg-primary/10">
                    {cat.icon}
                  </div>
                  <h3 className="font-bold text-center text-foreground group-hover:text-primary transition-colors">{cat.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured Products */}
        <section className="py-20 bg-secondary/5 relative overflow-hidden">
           {/* Decorative bg elements */}
           <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
           <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-primary font-bold tracking-wider text-sm uppercase mb-2 block">منتجات مختارة</span>
              <h2 className="text-4xl font-black text-foreground mb-4">الأكثر طلباً هذا الأسبوع</h2>
              <p className="text-muted-foreground text-lg">تشكيلة مميزة من المنتجات التي نالت استحسان عملائنا، بجودة مضمونة وطعم لا يقاوم.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} {...product} />
              ))}
            </div>

            <div className="mt-16 text-center">
               <Link href="/shop">
                <Button size="lg" className="rounded-full px-8 h-12 text-lg font-bold shadow-lg shadow-primary/20">
                  تصفح كل المنتجات
                </Button>
               </Link>
            </div>
          </div>
        </section>

        {/* Features/Benefits */}
        <section className="py-20 container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center p-8 rounded-3xl bg-white border border-border/50 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-6">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">جودة مضمونة 100%</h3>
              <p className="text-muted-foreground">جميع منتجاتنا طبيعية ومختارة بعناية من أفضل المزارع السودانية.</p>
            </div>
            <div className="flex flex-col items-center text-center p-8 rounded-3xl bg-white border border-border/50 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-6">
                <Truck className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">شحن سريع ومبرد</h3>
              <p className="text-muted-foreground">نضمن وصول منتجاتك طازجة وفي أسرع وقت ممكن لأي مكان.</p>
            </div>
            <div className="flex flex-col items-center text-center p-8 rounded-3xl bg-white border border-border/50 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-6">
                <Headphones className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">خدمة عملاء متميزة</h3>
              <p className="text-muted-foreground">فريقنا جاهز لمساعدتك والإجابة على استفساراتك على مدار الساعة.</p>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
