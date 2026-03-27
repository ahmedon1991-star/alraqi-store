import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Link } from "wouter";

export function Footer() {
  const { data: settings } = useQuery({
    queryKey: ["/api/admin/settings"],
    queryFn: () => apiRequest("/api/admin/settings"),
    staleTime: 5 * 60 * 1000,
  });

  const { data: categories } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["/api/categories"],
    queryFn: () => apiRequest("/api/categories"),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <footer className="relative bg-card border-t border-primary/10 mt-auto overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[radial-gradient(circle_at_50%_0%,_rgba(200,150,62,0.05),_transparent_70%)] pointer-events-none" />

      <div className="container mx-auto px-4 py-16 pb-28 md:pb-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 lg:gap-20">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1 flex flex-col gap-6 items-center md:items-start text-center md:text-right">
            <div className="flex flex-col">
              <img src="/logo.png" alt="الراقي" className="h-28 w-auto object-contain mb-2 hidden md:block brightness-110 contrast-110" />
              <div className="md:hidden">
                <span className="font-display text-5xl md:text-6xl font-black bg-gradient-to-l from-primary to-primary-foreground bg-clip-text text-transparent">الراقي</span>
                <p className="font-heading text-[10px] md:text-sm font-black text-primary/60 tracking-[0.3em] -mt-1 uppercase">تميز وفخامة</p>
              </div>
            </div>
            <p className="text-muted-foreground leading-relaxed text-sm md:text-lg font-medium max-w-sm">
              بوابتك الفاخرة لتجربة أجود المحاصيل السودانية الأصيلة. التزامنا بالجودة يبدأ من المصدر وينتهي برضاكم التام.
            </p>
            <div className="flex gap-4 mt-2">
              {[
                { icon: Facebook, href: settings?.facebook },
                { icon: Instagram, href: settings?.instagram },
                { icon: Twitter, href: settings?.twitter },
              ].map((social, idx) => (
                social.href && (
                  <Button key={idx} asChild size="icon" variant="ghost" className="h-12 w-12 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all duration-300">
                    <a href={social.href} target="_blank" rel="noopener noreferrer">
                      <social.icon className="h-6 w-6" />
                    </a>
                  </Button>
                )
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="col-span-1 text-center md:text-right">
            <h3 className="font-heading font-black text-xl mb-8 text-foreground tracking-wide underline underline-offset-8 decoration-primary/30">روابط سريعة</h3>
            <ul className="space-y-4 text-base md:text-lg text-muted-foreground font-medium">
              <li><Link href="/" className="hover:text-primary transition-colors hover:translate-x-[-4px] inline-block">الرئيسية</Link></li>
              <li><Link href="/shop" className="hover:text-primary transition-colors hover:translate-x-[-4px] inline-block">المتجر</Link></li>
              <li><Link href="/shop?offers=true" className="hover:text-primary transition-colors hover:translate-x-[-4px] inline-block">العروض الذهبية</Link></li>
              <li><a href="#" className="hover:text-primary transition-colors hover:translate-x-[-4px] inline-block">تواصل معنا</a></li>
            </ul>
          </div>

          {/* Categories */}
          <div className="col-span-1 hidden md:block text-right">
            <h3 className="font-heading font-black text-xl mb-8 text-foreground tracking-wide underline underline-offset-8 decoration-primary/30">تسوق حسب القسم</h3>
            <ul className="space-y-4 text-lg text-muted-foreground font-medium">
              {categories?.slice(0, 6).map((category) => (
                <li key={category.id}>
                  <Link href={`/shop?category=${category.id}`} className="hover:text-primary transition-colors hover:translate-x-[-4px] inline-block">
                    {category.name}
                  </Link>
                </li>
              ))}
              {(!categories || categories.length === 0) && (
                <>
                  <li><a href="#" className="hover:text-primary transition-colors inline-block text-lg">التوابل والبهارات</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors inline-block text-lg">الحبوب والبقوليات</a></li>
                </>
              )}
            </ul>
          </div>

          {/* Contact */}
          <div className="col-span-1 text-center md:text-right">
            <h3 className="font-heading font-black text-xl mb-8 text-foreground tracking-wide underline underline-offset-8 decoration-primary/30">تواصل معنا</h3>
            <ul className="space-y-6 text-base md:text-lg text-muted-foreground font-medium">
              <li className="flex flex-col md:flex-row items-center md:items-start gap-4 group">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shrink-0">
                  <Phone className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground/60 font-black tracking-widest uppercase">واتساب</span>
                  <a 
                    href={`https://wa.me/249115588350`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors cursor-pointer font-mono text-lg md:text-xl"
                    dir="ltr"
                  >
                    {settings?.phone || "+249 11 558 8350"}
                  </a>
                </div>
              </li>
              <li className="flex flex-col md:flex-row items-center md:items-start gap-4 group">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shrink-0">
                  <Mail className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground/60 font-black tracking-widest uppercase">البريد الإلكتروني</span>
                  <span className="text-lg">{settings?.email || "info@alraqi-store.com"}</span>
                </div>
              </li>
              <li className="flex flex-col md:flex-row items-center md:items-start gap-4 group">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shrink-0">
                  <MapPin className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground/60 font-black tracking-widest uppercase">الموقع</span>
                   <span className="text-lg">
                    {settings?.address || "السودان، دنقلا، سوق البرقيق"}
                  </span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Bottom Bar */}
      <div className="border-t border-primary/10 py-8 bg-background/50 relative z-10">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6 text-sm md:text-base font-bold text-muted-foreground/60">
          <p className="font-heading">© 2024 متجر الراقي الفاخر. جميع الحقوق محفوظة.</p>
          <div className="flex items-center gap-8">
            <a href="#" className="hover:text-primary transition-colors">سياسة الخصوصية</a>
            <span className="text-primary/20">|</span>
            <a href="#" className="hover:text-primary transition-colors">الشروط والأحكام</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
