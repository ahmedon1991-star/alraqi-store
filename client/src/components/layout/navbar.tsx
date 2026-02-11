import { Globe, Heart, ShoppingCart, User, Search, Menu } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

export function Navbar() {
  const [location] = useLocation();

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
        {/* Mobile Menu */}
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
                <Link href="/shop?category=spices" className="hover:text-primary transition-colors">التوابل</Link>
                <Link href="/shop?category=grains" className="hover:text-primary transition-colors">الحبوب</Link>
                <div className="h-px bg-border my-2"></div>
                <Link href="/cart" className="flex items-center gap-2">
                   سلة المشتريات
                </Link>
                <Link href="/login" className="flex items-center gap-2">
                   تسجيل الدخول
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Logo */}
        <Link href="/">
          <div className="flex flex-col items-center cursor-pointer">
            <h1 className="text-2xl font-black text-primary tracking-tight">الراقي</h1>
            <span className="text-xs text-muted-foreground tracking-widest font-bold">للمنتجات السودانية</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <Link href="/">
            <a className={`transition-colors hover:text-primary ${location === '/' ? 'text-primary font-bold' : ''}`}>الرئيسية</a>
          </Link>
          <Link href="/shop">
            <a className={`transition-colors hover:text-primary ${location.startsWith('/shop') ? 'text-primary font-bold' : ''}`}>المتجر</a>
          </Link>
          <Link href="/about">
            <a className="transition-colors hover:text-primary">قصتنا</a>
          </Link>
        </div>

        {/* Search Bar (Desktop) */}
        <div className="hidden lg:flex items-center relative max-w-sm w-full mx-4">
          <Input 
            type="search" 
            placeholder="ابحث عن المنتجات..." 
            className="pl-4 pr-10 rounded-full bg-muted/30 focus-visible:ring-primary/20 border-primary/20"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="hidden sm:flex hover:text-primary hover:bg-primary/5">
            <Globe className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden sm:flex hover:text-primary hover:bg-primary/5">
            <User className="h-5 w-5" />
          </Button>
          <Link href="/cart">
            <Button variant="ghost" size="icon" className="relative hover:text-primary hover:bg-primary/5">
              <ShoppingCart className="h-5 w-5" />
              <Badge className="absolute -top-1 -left-1 h-5 w-5 p-0 flex items-center justify-center bg-primary text-[10px]">
                3
              </Badge>
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
