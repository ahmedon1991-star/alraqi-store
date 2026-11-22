import { useEffect, useRef, useState } from "react";
import { Heart, Moon, Search, Shield, ShoppingBag, Sun, User, X } from "lucide-react";
import { useTheme } from "next-themes";
import { Link, useLocation, useSearch } from "wouter";
import { useCartCount } from "@/hooks/use-cart";
import { useCurrentUser } from "@/hooks/use-auth";
import { useWishlist } from "@/hooks/use-wishlist";
import { getAdminToken } from "@/lib/api";
import { cn } from "@/lib/utils";
import { CartSheet } from "@/components/layout/cart-sheet";

/** Small round icon button used in the header (no heavy borders). */
const iconButton =
  "relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground/80 transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-0.5 -left-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] font-bold leading-none text-primary-foreground ring-2 ring-background">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      className={iconButton}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "الوضع النهاري" : "الوضع الليلي"}
      title={isDark ? "الوضع النهاري" : "الوضع الليلي"}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

/**
 * Search field that sends the visitor to the shop with the typed text.
 * Results update while typing (short pause) and on Enter.
 */
function SearchField({ className }: { className?: string }) {
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const [term, setTerm] = useState(() => new URLSearchParams(search).get("search") || "");
  const typed = useRef(false);

  // Keep the field in sync when the URL changes (e.g. clearing filters in the shop)
  useEffect(() => {
    if (!typed.current) setTerm(new URLSearchParams(search).get("search") || "");
  }, [search]);

  useEffect(() => {
    if (!typed.current) return;
    const id = setTimeout(() => {
      const q = term.trim();
      if (q) setLocation(`/shop?search=${encodeURIComponent(q)}`);
      else if (location.startsWith("/shop")) setLocation("/shop");
      typed.current = false;
    }, 400);
    return () => clearTimeout(id);
  }, [term, location, setLocation]);

  return (
    <form
      role="search"
      className={cn("relative", className)}
      onSubmit={(e) => {
        e.preventDefault();
        const q = term.trim();
        typed.current = false;
        setLocation(q ? `/shop?search=${encodeURIComponent(q)}` : "/shop");
        (document.activeElement as HTMLElement | null)?.blur();
      }}
    >
      <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        inputMode="search"
        enterKeyHint="search"
        value={term}
        onChange={(e) => { typed.current = true; setTerm(e.target.value); }}
        placeholder="ابحث عن منتج..."
        aria-label="ابحث عن منتج"
        className="h-10 w-full rounded-full border border-border bg-muted/60 pr-10 pl-9 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary/40 focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 [&::-webkit-search-cancel-button]:hidden"
      />
      {term && (
        <button
          type="button"
          aria-label="مسح البحث"
          onClick={() => { typed.current = true; setTerm(""); }}
          className="absolute left-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </form>
  );
}

const NAV_LINKS = [
  { label: "الرئيسية", path: "/" },
  { label: "المتجر", path: "/shop" },
  { label: "العروض", path: "/shop?offers=true" },
];

export function Navbar() {
  const [location] = useLocation();
  const search = useSearch();
  const cartCount = useCartCount();
  const { count: wishlistCount } = useWishlist();
  const { data: user } = useCurrentUser();
  const isAdmin = !!getAdminToken();

  const isActive = (path: string) => {
    const [p, q] = path.split("?");
    if (q) return location === p && search.includes(q);
    if (p === "/shop") return location === "/shop" && !search.includes("offers=true") && !search.includes("wishlist=true");
    return location === p;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="container mx-auto flex h-16 md:h-[76px] items-center gap-3 md:gap-6 px-4">
        {/* Logo (right side in RTL) */}
        <Link href="/" className="shrink-0" aria-label="متجر الراقي — الرئيسية">
          <img
            src="/logo-mark.png"
            alt="متجر الراقي"
            className="h-11 md:h-14 w-auto object-contain"
            onError={(e) => { (e.target as HTMLImageElement).src = "/images/category-spices.png"; }}
          />
        </Link>

        {/* Desktop links */}
        <nav className="hidden md:flex items-center gap-1" aria-label="التنقل الرئيسي">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.path}
              href={link.path}
              className={cn(
                "rounded-full px-4 py-2 text-[15px] font-bold transition-colors",
                isActive(link.path) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Search: fills the middle on phones, fixed width on desktop */}
        <SearchField className="flex-1 md:mr-auto md:max-w-xs md:flex-none md:w-72" />

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-0.5 md:gap-1">
          {isAdmin && (
            <Link href="/admin" className={cn(iconButton, "text-primary")} aria-label="لوحة الإدارة" title="لوحة الإدارة">
              <Shield className="h-5 w-5" />
            </Link>
          )}
          <ThemeToggle />

          {/* On phones these live in the bottom navigation bar */}
          <Link href="/shop?wishlist=true" className={cn(iconButton, "hidden md:inline-flex")} aria-label="المفضلة" title="المفضلة">
            <Heart className="h-5 w-5" />
            <CountBadge count={wishlistCount} />
          </Link>
          <Link href={user ? "/profile" : "/login"} className={cn(iconButton, "hidden md:inline-flex")} aria-label={user ? "حسابي" : "تسجيل الدخول"} title={user ? "حسابي" : "تسجيل الدخول"}>
            {user?.avatar ? <img src={user.avatar} alt="" className="h-7 w-7 rounded-full object-cover" /> : <User className="h-5 w-5" />}
          </Link>
          <div className="hidden md:block">
            <CartSheet>
              <button type="button" className={iconButton} aria-label="السلة" title="السلة">
                <ShoppingBag className="h-5 w-5" />
                <CountBadge count={cartCount} />
              </button>
            </CartSheet>
          </div>
        </div>
      </div>
    </header>
  );
}
