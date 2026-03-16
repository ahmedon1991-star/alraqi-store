import { LogOut, Menu, Search, Shield, ShoppingCart, User, Heart } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useCartCount } from "@/hooks/use-cart";
import { useCurrentUser, useLogout } from "@/hooks/use-auth";
import { getAdminToken } from "@/lib/api";
import { useWishlist } from "@/hooks/use-wishlist";

export function Navbar() {
  const [location] = useLocation();
  const cartCount = useCartCount();
  const { count: wishlistCount } = useWishlist();
  const currentUserQuery = useCurrentUser();
  const logoutMutation = useLogout();
  const user = currentUserQuery.data;

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-20 items-center justify-between gap-4 px-4">
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="mt-10 flex flex-col gap-6 text-lg font-bold">
                <Link href="/" className="transition-colors hover:text-primary">
                  الرئيسية
                </Link>
                <Link href="/shop" className="transition-colors hover:text-primary">
                  المنتجات
                </Link>
                <Link href="/cart" className="flex items-center gap-2">
                  سلة المشتريات
                </Link>

                {user ? (
                  <>
                    <Link href="/profile" className="flex items-center gap-2">
                      مرحبا، {user.name || "العميل"}
                    </Link>
                    <button
                      type="button"
                      onClick={() => logoutMutation.mutate()}
                      className="flex items-center gap-2 text-right text-rose-600"
                    >
                      تسجيل الخروج
                    </button>
                  </>
                ) : (
                  <Link href="/login" className="flex items-center gap-2">
                    تسجيل الدخول
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <Link href="/">
          <div className="cursor-pointer flex items-center">
            <img
              src="/logo.png"
              alt="الراقي"
              className="h-14 w-auto object-contain"
            />
          </div>
        </Link>

        <div className="hidden items-center gap-8 text-sm font-medium md:flex">
          <Link href="/" className={`transition-colors hover:text-primary ${location === "/" ? "font-bold text-primary" : ""}`}>
            الرئيسية
          </Link>
          <Link href="/shop" className={`transition-colors hover:text-primary ${location.startsWith("/shop") ? "font-bold text-primary" : ""}`}>
            المتجر
          </Link>

        </div>

        <div className="relative mx-4 hidden w-full max-w-sm items-center lg:flex">
          <Input
            type="search"
            placeholder="ابحث عن المنتجات..."
            className="rounded-full border-primary/20 bg-muted/30 pl-4 pr-10 focus-visible:ring-primary/20"
          />
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link href="/profile" className="hidden text-right sm:block cursor-pointer hover:opacity-80 transition-opacity">
                <p className="text-sm font-bold text-foreground">{user.name || user.email || user.username}</p>
                <p className="text-xs text-muted-foreground">{user.email || "حساب عميل"}</p>
              </Link>
              <Link href="/profile">
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden sm:flex hover:bg-primary/5 hover:text-primary"
                >
                  <User className="h-5 w-5" />
                </Button>
              </Link>
            </>
          ) : (
            <Link href="/login">
              <Button variant="ghost" size="icon" className="hidden sm:flex hover:bg-primary/5 hover:text-primary">
                <User className="h-5 w-5" />
              </Button>
            </Link>
          )}

          <Link href="/shop?wishlist=true">
            <Button variant="ghost" size="icon" className="relative hover:bg-primary/5 hover:text-red-500">
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <Badge
                  className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center bg-red-500 p-0 text-[10px] hover:bg-red-600"
                  data-testid="badge-wishlist-count"
                >
                  {wishlistCount}
                </Badge>
              )}
            </Button>
          </Link>

          <Link href="/cart">
            <Button variant="ghost" size="icon" className="relative hover:bg-primary/5 hover:text-primary">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <Badge
                  className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center bg-primary p-0 text-[10px]"
                  data-testid="badge-cart-count"
                >
                  {cartCount}
                </Badge>
              )}
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
