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
      <div className="container mx-auto px-2 md:px-4">
        <div className="flex h-14 md:h-20 items-center justify-between gap-1 md:gap-4 flex-row-reverse">
          
          {/* Right: Brand Logo (Primary for RTL) */}
          <div className="flex flex-1 justify-end items-center">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer transition-transform active:scale-95">
                <img
                  src="/logo.png"
                  alt="متجر الراقي"
                  className="h-10 md:h-16 w-auto object-contain"
                />
              </div>
            </Link>
          </div>

          {/* Middle: Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-10 text-[15px] font-bold justify-center flex-1">
            <Link href="/" className={`transition-all hover:text-primary relative group py-2 ${location === "/" ? "text-primary border-b-2 border-primary" : "text-gray-600"}`}>
              الرئيسية
            </Link>
            <Link href="/shop" className={`transition-all hover:text-primary relative group py-2 ${location.startsWith("/shop") ? "text-primary border-b-2 border-primary" : "text-gray-600"}`}>
              المتجر
            </Link>
          </div>

          {/* Left Actions (Cart, Search, Profile) */}
          <div className="flex items-center gap-1 md:gap-3 flex-1 justify-start">
             <Button 
                variant="ghost" 
                size="icon" 
                className={cn("h-9 w-9 text-gray-700 hover:text-primary transition-all rounded-full bg-slate-50 border border-transparent hover:border-primary/20", isSearchOpen ? "bg-primary/10 text-primary border-primary/30" : "")}
                onClick={() => setIsSearchOpen(!isSearchOpen)}
            >
              {isSearchOpen ? <X className="h-4 w-4" /> : <Search className="h-4.5 w-4.5" />}
            </Button>

            <Link href="/cart">
              <div className="relative p-2 rounded-full hover:bg-slate-50 transition-colors cursor-pointer group">
                <ShoppingCart className="h-5 w-5 text-gray-700 group-hover:text-primary transition-colors" />
                {cartCount > 0 && (
                  <Badge className="absolute -left-0 -top-0 flex h-4 w-4 items-center justify-center bg-primary p-0 text-[10px] border-2 border-white ring-1 ring-primary/10 font-bold">
                    {cartCount}
                  </Badge>
                )}
              </div>
            </Link>

            <Link href="/profile">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-700 hover:text-primary rounded-full hover:bg-slate-50">
                <User className="h-4.5 w-4.5" />
              </Button>
            </Link>
            
            {getAdminToken() && (
              <Link href="/admin">
                <Button variant="ghost" size="icon" className="h-9 w-9 text-orange-600 hover:bg-orange-50 rounded-full">
                  <Shield className="h-4.5 w-4.5" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Search Overlay */}
        {isSearchOpen && (
          <div className="md:hidden px-2 pb-3 pt-1 animate-in fade-in slide-in-from-top-2 duration-300">
             <div className="relative group">
                <Input
                  autoFocus
                  placeholder="ابحث عن المنتجات..."
                  className="rounded-xl border-none bg-slate-50 focus:bg-white h-10 pr-9 text-right shadow-inner ring-1 ring-slate-200 focus:ring-2 focus:ring-primary/40 transition-all font-bold"
                  value={mobileSearchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                />
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
             </div>
          </div>
        )}
      </div>
    </nav>
  );
}
