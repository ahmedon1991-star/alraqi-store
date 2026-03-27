import { Home, LayoutGrid, ShoppingBag, User, Heart, Shield } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { useCartCount } from "@/hooks/use-cart";
import { useWishlist } from "@/hooks/use-wishlist";
import { useCurrentUser } from "@/hooks/use-auth";
import { getAdminToken } from "@/lib/api";

export function MobileNav() {
  const [location] = useLocation();
  const cartCount = useCartCount();
  const { count: wishlistCount } = useWishlist();
  const { data: user } = useCurrentUser();
  const adminToken = getAdminToken();

  // Hide on admin routes
  if (location.startsWith("/admin")) {
    return null;
  }

  const navItems = [
    {
      label: "الرئيسية",
      icon: Home,
      href: "/",
      active: location === "/",
    },
    {
      label: "الأقسام",
      icon: LayoutGrid,
      href: "/shop",
      active: location === "/shop" && !new URLSearchParams(window.location.search).get("wishlist"),
    },
    {
      label: "المفضلة",
      icon: Heart,
      href: "/shop?wishlist=true",
      active: new URLSearchParams(window.location.search).get("wishlist") === "true",
      count: wishlistCount,
    },
    {
      label: "السلة",
      icon: ShoppingBag,
      href: "/cart",
      active: location === "/cart",
      count: cartCount,
    },
    {
      label: user ? "حسابي" : "دخول",
      icon: User,
      href: user ? "/profile" : "/login",
      active: location === "/profile" || location === "/login",
    },
  ];

  if (adminToken) {
    navItems.push({
      label: "الإدارة",
      icon: Shield,
      href: "/admin",
      active: location.startsWith("/admin"),
    });
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-100 pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-between h-16 px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href}>
              <div className={`flex flex-col items-center justify-center gap-1 group relative cursor-pointer min-w-[64px]`}>
                <div className="relative">
                  <Icon
                    className={`h-6 w-6 transition-all duration-300 ${item.active
                        ? "text-primary scale-110 fill-primary/10"
                        : "text-gray-400 group-hover:text-primary/70"
                      }`}
                  />
                  {item.count !== undefined && item.count > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-primary text-[10px] border-2 border-white animate-in zoom-in duration-300">
                      {item.count}
                    </Badge>
                  )}
                </div>
                <span className={`text-[9px] font-black transition-colors duration-300 ${item.active ? "text-primary" : "text-gray-500"
                  }`}>
                  {item.label}
                </span>
                {item.active && (
                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
