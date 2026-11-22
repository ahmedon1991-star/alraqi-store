import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Link } from "wouter";

type PublicSettings = {
  email?: string;
  phone?: string;
  address?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
};

const DEFAULT_PHONE = "+249 11 558 8350";

export function Footer() {
  // Public settings endpoint (the admin one needs an admin login, so visitors got a 401)
  const { data: settings } = useQuery<PublicSettings>({
    queryKey: ["/api/settings"],
    queryFn: () => apiRequest("/api/settings"),
    staleTime: 5 * 60 * 1000,
  });

  const { data: categories } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["/api/categories"],
    queryFn: () => apiRequest("/api/categories"),
    staleTime: 5 * 60 * 1000,
  });

  const phone = settings?.phone || DEFAULT_PHONE;
  const phoneDigits = phone.replace(/[^0-9]/g, "");
  const displayPhone = phone.trim().startsWith("+") ? phone.trim() : `+${phone.trim()}`;
  const whatsappUrl = `https://wa.me/${phoneDigits}`;
  const email = settings?.email || "info@alraqi-store.com";
  const address = settings?.address || "السودان، دنقلا، سوق البرقيق";

  const socials = [
    { icon: Facebook, href: settings?.facebook, label: "فيسبوك" },
    { icon: Instagram, href: settings?.instagram, label: "انستقرام" },
    { icon: Twitter, href: settings?.twitter, label: "تويتر" },
  ].filter((s) => s.href);

  const linkClass = "hover:text-primary transition-colors";
  const headingClass = "font-heading font-black text-base md:text-xl mb-3 md:mb-8 text-foreground";

  return (
    <footer className="relative bg-card border-t border-primary/10 mt-auto overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[radial-gradient(circle_at_50%_0%,_rgba(200,150,62,0.05),_transparent_70%)] pointer-events-none" />

      <div className="container mx-auto px-4 pt-8 pb-6 md:py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-7 md:gap-12 lg:gap-20">
          {/* Brand */}
          <div className="flex flex-col gap-3 md:gap-6 items-center md:items-start text-center md:text-right">
            <img src="/logo-mark.png" alt="الراقي" className="h-16 md:h-28 w-auto object-contain" />
            <p className="text-muted-foreground leading-relaxed text-sm md:text-lg font-medium max-w-sm">
              بوابتك الفاخرة لتجربة أجود المحاصيل السودانية الأصيلة. التزامنا بالجودة يبدأ من المصدر وينتهي برضاكم التام.
            </p>
            {socials.length > 0 && (
              <div className="flex gap-2 md:gap-4">
                {socials.map((social) => (
                  <Button key={social.label} asChild size="icon" variant="ghost" className="h-10 w-10 md:h-12 md:w-12 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all duration-300">
                    <a href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.label}>
                      <social.icon className="h-5 w-5 md:h-6 md:w-6" />
                    </a>
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links — one row on phones, a list on larger screens */}
          <div className="text-center md:text-right">
            <h3 className={headingClass}>روابط سريعة</h3>
            <ul className="flex flex-wrap justify-center md:flex-col md:justify-start gap-x-5 gap-y-2 md:gap-4 text-sm md:text-lg text-muted-foreground font-medium">
              <li><Link href="/" className={linkClass}>الرئيسية</Link></li>
              <li><Link href="/shop" className={linkClass}>المتجر</Link></li>
              <li><Link href="/shop?offers=true" className={linkClass}>العروض الذهبية</Link></li>
              <li><a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>تواصل معنا</a></li>
            </ul>
          </div>

          {/* Categories (larger screens) */}
          <div className="hidden md:block text-right">
            <h3 className={headingClass}>تسوق حسب القسم</h3>
            <ul className="space-y-4 text-lg text-muted-foreground font-medium">
              {categories?.slice(0, 6).map((category) => (
                <li key={category.id}>
                  <Link href={`/shop?category=${category.id}`} className={linkClass}>
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact — compact rows: small icon beside the value */}
          <div className="text-center md:text-right">
            <h3 className={headingClass}>تواصل معنا</h3>
            <ul className="mx-auto md:mx-0 w-fit max-w-full space-y-2.5 md:space-y-6 text-sm md:text-lg text-muted-foreground font-medium text-right">
              <li>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group hover:text-primary transition-colors">
                  <span className="h-8 w-8 md:h-12 md:w-12 rounded-lg md:rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <Phone className="h-4 w-4 md:h-6 md:w-6" />
                  </span>
                  <span className="flex flex-col">
                    <span className="hidden md:block text-xs text-muted-foreground/60 font-black">واتساب</span>
                    <span className="font-mono" dir="ltr">{displayPhone}</span>
                  </span>
                </a>
              </li>
              <li>
                <a href={`mailto:${email}`} className="flex items-center gap-3 group hover:text-primary transition-colors">
                  <span className="h-8 w-8 md:h-12 md:w-12 rounded-lg md:rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <Mail className="h-4 w-4 md:h-6 md:w-6" />
                  </span>
                  <span className="flex flex-col min-w-0">
                    <span className="hidden md:block text-xs text-muted-foreground/60 font-black">البريد الإلكتروني</span>
                    <span className="break-all">{email}</span>
                  </span>
                </a>
              </li>
              <li className="flex items-center gap-3">
                <span className="h-8 w-8 md:h-12 md:w-12 rounded-lg md:rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <MapPin className="h-4 w-4 md:h-6 md:w-6" />
                </span>
                <span className="flex flex-col">
                  <span className="hidden md:block text-xs text-muted-foreground/60 font-black">الموقع</span>
                  <span>{address}</span>
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      {/* pb-24 on phones keeps the copyright above the fixed bottom navigation bar */}
      <div className="border-t border-primary/10 pt-4 pb-24 md:py-8 bg-background/50 relative z-10">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-2 md:gap-6 text-xs md:text-base font-bold text-muted-foreground/60">
          <p className="font-heading">© {new Date().getFullYear()} متجر الراقي. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  );
}
