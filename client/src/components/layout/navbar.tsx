import { Globe, ShoppingCart, User, Search, Menu } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useCartCount } from "@/hooks/use-cart";

export function Navbar() {
  const [location] = useLocation();
  const cartCount = useCartCount();

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="flex flex-col gap-6 mt-10 font-bold text-lg">
                <Link href="/" className="hover:text-primary transition-colors">الرئيسية</Link>
                <Link href="/shop" className="hover:text-primary transition-colors">المنتجات</Link>
                <div className="h-px bg-border my-2"></div>
                <Link href="/cart" className="flex items-center gap-2">سلة المشتريات</Link>
                <Link href="/login" className="flex items-center gap-2">تسجيل الدخول</Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <Link href="/">
          <div className="flex flex-col items-center cursor-pointer">
            <h1 className="text-2xl font-black text-primary tracking-tight">الراقي</h1>
            <span className="text-xs text-muted-foreground tracking-widest font-bold">للمنتجات السودانية</span>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <Link href="/" className={`transition-colors hover:text-primary ${location === '/' ? 'text-primary font-bold' : ''}`}>الرئيسية</Link>
          <Link href="/shop" className={`transition-colors hover:text-primary ${location.startsWith('/shop') ? 'text-primary font-bold' : ''}`}>المتجر</Link>
        </div>

        <div className="hidden lg:flex items-center relative max-w-sm w-full mx-4">
          <Input
            type="search"
            placeholder="ابحث عن المنتجات..."
            className="pl-4 pr-10 rounded-full bg-muted/30 focus-visible:ring-primary/20 border-primary/20"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>

        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="icon" className="hidden sm:flex hover:text-primary hover:bg-primary/5">
              <User className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/cart">
            <Button variant="ghost" size="icon" className="relative hover:text-primary hover:bg-primary/5">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <Badge className="absolute -top-1 -left-1 h-5 w-5 p-0 flex items-center justify-center bg-primary text-[10px]" data-testid="badge-cart-count">
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
