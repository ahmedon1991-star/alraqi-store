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
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1 flex flex-col gap-4">
            <div className="flex flex-col">
              <img src="/logo.png" alt="الراقي" className="h-20 w-auto object-contain mb-1" />
            </div>
            <p className="text-muted-foreground leading-relaxed text-sm">
              منصتك الأولى لتسوق المنتجات السودانية الأصيلة. نجمع لك خيرات السودان في مكان واحد، بجودة عالية وتوصيل سريع.
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
            <ul className="space-y-3 text-sm text-muted-foreground font-medium">
              <li><a href="#" className="hover:text-primary transition-colors">الرئيسية</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">عن الراقي</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">المتجر</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">المدونة</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">تواصل معنا</a></li>
            </ul>
          </div>

          {/* Categories */}
          <div className="col-span-1">
            <h3 className="font-bold text-lg mb-6 text-foreground">تسوق حسب القسم</h3>
            <ul className="space-y-3 text-sm text-muted-foreground font-medium">
              {categories?.slice(0, 5).map((category) => (
                <li key={category.id}>
                  <Link href={`/?category=${category.id}`} className="hover:text-primary transition-colors">
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
            <ul className="space-y-4 text-sm text-muted-foreground font-medium">
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-primary" />
                <span dir="ltr">{settings?.phone || "+249 91 234 5678"}</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <span>{settings?.email || "info@alraqi-sudanese.com"}</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary shrink-0" />
                <span>{settings?.address || "الخرطوم، السودان - شارع النيل"}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Bottom Bar */}
      <div className="border-t py-6 bg-gray-50/50">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium text-muted-foreground">
          <p>© 2024 الراقي للمنتجات السودانية. جميع الحقوق محفوظة.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-primary">سياسة الخصوصية</a>
            <a href="#" className="hover:text-primary">الشروط والأحكام</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
