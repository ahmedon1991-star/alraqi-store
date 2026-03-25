import { Home, ShoppingBag, ShoppingCart, User, Heart } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useCartCount } from "@/hooks/use-cart";
import { Badge } from "@/components/ui/badge";

export function BottomNav() {
  const [location] = useLocation();
  const cartCount = useCartCount();

  const navItems = [
    { label: "الرئيسية", path: "/", icon: Home },
    { label: "المتجر", path: "/shop", icon: ShoppingBag },
    { label: "السلة", path: "/cart", icon: ShoppingCart, badge: cartCount },
    { label: "حسابي", path: "/profile", icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-gray-100 pb-safe shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)]">
      <div className="flex items-center justify-around h-16 px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <Link key={item.path} href={item.path}>
              <div className={cn(
                "flex flex-col items-center justify-center gap-1 min-w-[64px] transition-all relative",
                isActive ? "text-primary" : "text-gray-400 hover:text-gray-600"
              )}>
                <div className={cn(
                  "p-1.5 rounded-xl transition-all duration-300",
                  isActive ? "bg-primary/10" : ""
                )}>
                  <Icon className={cn("h-5 w-5", isActive ? "stroke-[2.5]" : "stroke-[2]")} />
                </div>
                <span className="text-[10px] font-bold">{item.label}</span>
                
                {item.badge !== undefined && item.badge > 0 && (
                  <Badge className="absolute top-0 right-3 flex h-4 w-4 items-center justify-center bg-primary p-0 text-[8px] border border-white shadow-sm font-black">
                    {item.badge}
                  </Badge>
                )}
                
                {isActive && (
                  <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-primary" />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
