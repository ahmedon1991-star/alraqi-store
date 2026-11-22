import { Heart, Home, LayoutGrid, ShoppingBag, User } from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import { useCartCount } from "@/hooks/use-cart";
import { useWishlist } from "@/hooks/use-wishlist";
import { useCurrentUser } from "@/hooks/use-auth";
import { CartSheet } from "@/components/layout/cart-sheet";
import { cn } from "@/lib/utils";

type Item = {
  label: string;
  icon: typeof Home;
  href: string;
  active: boolean;
  count?: number;
  isCart?: boolean;
};

/**
 * Floating bottom navigation for phones: five equal items, the current one
 * highlighted with a filled pill behind its icon.
 */
export function MobileNav() {
  const [location] = useLocation();
  const search = useSearch();
  const cartCount = useCartCount();
  const { count: wishlistCount } = useWishlist();
  const { data: user } = useCurrentUser();

  // The admin panel has its own layout
  if (location.startsWith("/admin")) return null;

  const isWishlist = location === "/shop" && search.includes("wishlist=true");

  const items: Item[] = [
    { label: "الرئيسية", icon: Home, href: "/", active: location === "/" },
    { label: "الأقسام", icon: LayoutGrid, href: "/shop", active: location === "/shop" && !isWishlist },
    { label: "المفضلة", icon: Heart, href: "/shop?wishlist=true", active: isWishlist, count: wishlistCount },
    { label: "السلة", icon: ShoppingBag, href: "/cart", active: location === "/cart", count: cartCount, isCart: true },
    {
      label: user ? "حسابي" : "دخول",
      icon: User,
      href: user ? "/profile" : "/login",
      active: location === "/profile" || location === "/login",
    },
  ];

  return (
    <nav
      aria-label="التنقل السفلي"
      className="md:hidden fixed inset-x-0 bottom-0 z-50 px-3"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 10px)" }}
    >
      <div className="mx-auto grid h-16 max-w-md grid-cols-5 rounded-2xl border border-border bg-card/90 px-1 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl supports-[backdrop-filter]:bg-card/75">
        {items.map((item) => {
          const Icon = item.icon;
          const content = (
            <span className="flex h-full flex-col items-center justify-center gap-1">
              <span
                className={cn(
                  "relative flex h-8 w-14 items-center justify-center rounded-full transition-all duration-200",
                  item.active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                <Icon className="h-[20px] w-[20px]" strokeWidth={item.active ? 2.4 : 2} fill={item.active && item.icon === Heart ? "currentColor" : "none"} />
                {!!item.count && item.count > 0 && (
                  <span
                    className={cn(
                      "absolute -top-1 left-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 font-mono text-[10px] font-bold leading-none ring-2 ring-card",
                      item.active ? "bg-card text-primary" : "bg-primary text-primary-foreground",
                    )}
                  >
                    {item.count > 99 ? "99+" : item.count}
                  </span>
                )}
              </span>
              <span className={cn("text-[11px] leading-none", item.active ? "font-bold text-primary" : "font-medium text-muted-foreground")}>
                {item.label}
              </span>
            </span>
          );

          if (item.isCart) {
            return (
              <CartSheet key={item.label}>
                <button type="button" className="h-full w-full" aria-label={item.label}>
                  {content}
                </button>
              </CartSheet>
            );
          }
          return (
            <Link key={item.label} href={item.href} className="h-full w-full" aria-current={item.active ? "page" : undefined}>
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
