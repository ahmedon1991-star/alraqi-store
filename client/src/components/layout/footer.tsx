import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Footer() {
  return (
    <footer className="bg-white border-t mt-auto">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1 flex flex-col gap-4">
            <div className="flex flex-col">
              <h2 className="text-3xl font-black text-primary tracking-tight">الراقي</h2>
              <span className="text-sm text-muted-foreground font-bold">للمنتجات السودانية</span>
            </div>
            <p className="text-muted-foreground leading-relaxed text-sm">
              منصتك الأولى لتسوق المنتجات السودانية الأصيلة. نجمع لك خيرات السودان في مكان واحد، بجودة عالية وتوصيل سريع.
            </p>
            <div className="flex gap-2 mt-2">
              <Button size="icon" variant="ghost" className="rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10">
                <Facebook className="h-5 w-5" />
              </Button>
              <Button size="icon" variant="ghost" className="rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10">
                <Instagram className="h-5 w-5" />
              </Button>
              <Button size="icon" variant="ghost" className="rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10">
                <Twitter className="h-5 w-5" />
              </Button>
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
              <li><a href="#" className="hover:text-primary transition-colors">التوابل والبهارات</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">الحبوب والبقوليات</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">الزيوت الطبيعية</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">التمور والحلويات</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">منتجات العناية</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="col-span-1">
            <h3 className="font-bold text-lg mb-6 text-foreground">تواصل معنا</h3>
            <ul className="space-y-4 text-sm text-muted-foreground font-medium">
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-primary" />
                <span dir="ltr">+249 91 234 5678</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <span>info@alraqi-sudanese.com</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary shrink-0" />
                <span>الخرطوم، السودان - شارع النيل</span>
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
