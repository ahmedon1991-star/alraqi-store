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
    <footer className="bg-white border-t mt-auto">
      <div className="container mx-auto px-4 py-16 pb-20 md:pb-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1 flex flex-col gap-6">
            <div className="flex flex-col">
              <img src="/logo.png" alt="الراقي" className="h-20 w-auto object-contain mb-1 hidden md:block" />
              <div className="md:hidden">
                <span className="text-4xl font-black bg-gradient-to-l from-primary to-primary/70 bg-clip-text text-transparent">الراقي</span>
                <p className="text-[10px] font-bold text-primary/60 tracking-[0.2em] -mt-1 uppercase">تميز وفخامة</p>
              </div>
            </div>
            <p className="text-muted-foreground leading-relaxed text-sm font-medium">
              منصتك الأولى لتسوق أجود المنتجات الغذائية والطبيعية. نجمع لك أفضل المنتجات في مكان واحد، بجودة عالية وتوصيل سريع يليق بعملائنا.
            </p>
            <div className="flex gap-2 mt-2">
              {settings?.facebook && (
                <Button asChild size="icon" variant="ghost" className="rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10">
                  <a href={settings.facebook} target="_blank" rel="noopener noreferrer">
                    <Facebook className="h-5 w-5" />
                  </a>
                </Button>
              )}
              {settings?.instagram && (
                <Button asChild size="icon" variant="ghost" className="rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10">
                  <a href={settings.instagram} target="_blank" rel="noopener noreferrer">
                    <Instagram className="h-5 w-5" />
                  </a>
                </Button>
              )}
              {settings?.twitter && (
                <Button asChild size="icon" variant="ghost" className="rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10">
                  <a href={settings.twitter} target="_blank" rel="noopener noreferrer">
                    <Twitter className="h-5 w-5" />
                  </a>
                </Button>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="col-span-1">
            <h3 className="font-bold text-lg mb-6 text-foreground">روابط سريعة</h3>
            <ul className="flex flex-wrap gap-x-6 gap-y-3 md:block md:space-y-3 text-sm text-muted-foreground font-medium text-right">
              <li><a href="/" className="hover:text-primary transition-colors">الرئيسية</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">عن الراقي</a></li>
              <li><a href="/shop" className="hover:text-primary transition-colors">المتجر</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">المدونة</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">تواصل معنا</a></li>
            </ul>
          </div>

          {/* Categories */}
          <div className="col-span-1 hidden md:block">
            <h3 className="font-bold text-lg mb-6 text-foreground">تسوق حسب القسم</h3>
            <ul className="flex flex-wrap gap-x-6 gap-y-3 md:block md:space-y-3 text-sm text-muted-foreground font-medium text-right">
              {categories?.slice(0, 6).map((category) => (
                <li key={category.id}>
                  <Link href={`/shop?category=${category.id}`} className="hover:text-primary transition-colors">
                    {category.name}
                  </Link>
                </li>
              ))}
              {(!categories || categories.length === 0) && (
                <>
                  <li><a href="#" className="hover:text-primary transition-colors">التوابل والبهارات</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">الحبوب والبقوليات</a></li>
                </>
              )}
            </ul>
          </div>

          {/* Contact */}
          <div className="col-span-1">
            <h3 className="font-bold text-lg mb-6 text-foreground">تواصل معنا</h3>
            <ul className="flex flex-wrap gap-x-8 gap-y-4 md:block md:space-y-4 text-sm text-muted-foreground font-medium text-right">
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-primary" />
                <span dir="ltr">{settings?.phone || "+249 91 234 5678"}</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <span>{settings?.email || "info@alraqi-store.com"}</span>
              </li>
              <li className="flex items-start gap-3 w-full md:w-auto">
                <MapPin className="h-5 w-5 text-primary shrink-0" />
                <a 
                  href="https://maps.app.goo.gl/Lx5mCA3y7RiCjo8bA" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors cursor-pointer text-right underline underline-offset-4 decoration-primary/30"
                >
                  {settings?.address || "المملكة العربية السعودية - جدة - حي الروابي - شارع السبعين"}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Bottom Bar */}
      <div className="border-t py-6 pb-24 md:pb-6 bg-gray-50/50">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium text-muted-foreground">
          <p>© 2024 الراقي للمنتجات الغذائية. جميع الحقوق محفوظة.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-primary">سياسة الخصوصية</a>
            <a href="#" className="hover:text-primary">الشروط والأحكام</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
