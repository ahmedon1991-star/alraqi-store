import { LogOut, Menu, Search, Shield, ShoppingCart, User, Heart, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useCartCount } from "@/hooks/use-cart";
import { useCurrentUser, useLogout } from "@/hooks/use-auth";
import { getAdminToken } from "@/lib/api";
import { useWishlist } from "@/hooks/use-wishlist";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [location] = useLocation();
  const cartCount = useCartCount();
  const { count: wishlistCount } = useWishlist();
  const currentUserQuery = useCurrentUser();
  const logoutMutation = useLogout();
  const user = currentUserQuery.data;
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mobileSearchTerm, setMobileSearchTerm] = useState("");
  const [, setLocation] = useLocation();

  const handleSearch = (val: string) => {
    setMobileSearchTerm(val);
    if (val.trim()) {
      setLocation(`/shop?search=${encodeURIComponent(val.trim())}`);
    } else if (location.startsWith("/shop")) {
      setLocation("/shop");
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur-md shadow-sm transition-all duration-300">
      <div className="container mx-auto px-4">
        <div className="flex h-16 md:h-20 items-center justify-between gap-4 overflow-hidden relative">
          {/* Mobile Search Toggle */}
          <div className="md:hidden flex-1 flex justify-start">
            <Button 
                variant="ghost" 
                size="icon" 
                className={cn("text-gray-500 hover:text-primary transition-all rounded-full", isSearchOpen ? "bg-primary/10 text-primary" : "")}
                onClick={() => setIsSearchOpen(!isSearchOpen)}
            >
              {isSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-6 w-6" />}
            </Button>
          </div>

          <Link href="/">
            <div className="cursor-pointer flex items-center justify-center flex-1 md:flex-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 md:static md:translate-x-0 md:translate-y-0">
              <img
                src="/logo.png"
                alt="متجر الراقي للمنتجات السودانية والأغذية"
                className="h-12 md:h-16 w-auto object-contain transition-all hover:scale-105 duration-300"
              />
            </div>
          </Link>

          <div className="hidden items-center gap-10 text-sm font-black md:flex flex-1 justify-center">
            <Link href="/" className={`transition-colors hover:text-primary relative group py-2 ${location === "/" ? "text-primary border-b-2 border-primary" : "text-gray-600"}`}>
              الرئيسية
            </Link>
            <Link href="/shop" className={`transition-colors hover:text-primary relative group py-2 ${location.startsWith("/shop") ? "text-primary border-b-2 border-primary" : "text-gray-600"}`}>
              المتجر
            </Link>
          </div>

          <div className="relative mx-4 hidden w-full max-w-sm items-center lg:flex">
            <form onSubmit={(e) => e.preventDefault()} className="w-full relative">
               <Input
                 name="search"
                 type="search"
                 placeholder="ابحث عن منتج مخصص..."
                 className="rounded-full border-primary/20 bg-muted/30 pl-4 pr-10 focus-visible:ring-primary/20 h-10 transition-all focus:bg-white text-right"
                 onChange={(e) => handleSearch(e.target.value)}
               />
               <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </form>
          </div>

          <div className="flex items-center gap-1 md:gap-2 justify-end flex-1">
            <Link href="/shop?wishlist=true">
              <Button variant="ghost" size="icon" className="relative hidden sm:flex hover:bg-primary/5 hover:text-red-500 rounded-full">
                <Heart className="h-5 w-5" />
                {wishlistCount > 0 && (
                  <Badge className="absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center bg-red-500 p-0 text-[10px] animate-pulse">
                    {wishlistCount}
                  </Badge>
                )}
              </Button>
            </Link>

            <Link href="/cart">
              <Button variant="ghost" size="icon" className="relative hover:bg-primary/5 hover:text-primary rounded-full group">
                <ShoppingCart className="h-5 w-5 md:h-6 md:w-6" />
                {cartCount > 0 && (
                  <Badge className="absolute -left-1 -top-1 flex h-4 w-4 md:h-5 md:w-5 items-center justify-center bg-primary p-0 text-[10px] border-2 border-white">
                    {cartCount}
                  </Badge>
                )}
              </Button>
            </Link>

            {getAdminToken() && (
              <Link href="/admin">
                <Button variant="ghost" size="icon" className="text-orange-600 hover:bg-orange-50 hidden md:flex rounded-full">
                  <Shield className="h-5 w-5" />
                </Button>
              </Link>
            )}

            {user ? (
              <Link href="/profile">
                <Button variant="ghost" size="icon" className="hidden sm:flex hover:bg-primary/5 hover:text-primary rounded-full">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="ghost" size="icon" className="hidden sm:flex hover:bg-primary/5 hover:text-primary rounded-full">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Search Overlay */}
        {isSearchOpen && (
          <div className="md:hidden pb-4 px-2 animate-in slide-in-from-top-4 duration-300">
             <form onSubmit={(e) => e.preventDefault()} className="relative">
                <Input
                  autoFocus
                  placeholder="ابحث عن المنتجات الغذائية..."
                  className="rounded-2xl border-primary/20 bg-muted/30 focus-visible:ring-primary/20 h-12 pr-10 text-right"
                  value={mobileSearchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                />
                <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
             </form>
          </div>
        )}
      </div>
    </nav>
  );
}
