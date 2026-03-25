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
    <nav className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_4px_6px_-2px_rgba(0,0,0,0.05)] transition-all duration-300">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex h-16 md:h-24 items-center justify-between gap-2 md:gap-8 flex-row-reverse">
          
          {/* Right: Brand Logo */}
          <div className="flex h-full items-center justify-end">
            <Link href="/">
              <div className="group relative flex items-center cursor-pointer">
                <div className="absolute -inset-2 rounded-xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-all duration-300 scale-95 group-hover:scale-100" />
                <img
                  src="/logo.png"
                  alt="متجر الراقي"
                  className="h-11 md:h-20 w-auto object-contain relative z-10 transition-transform duration-300 group-hover:translate-y-[-2px]"
                  onError={(e) => { (e.target as HTMLImageElement).src = "/images/category-spices.png"; }}
                />
              </div>
            </Link>
          </div>

          {/* Middle: Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-12 text-[16px] font-black justify-center flex-1">
            {[
              { label: "الرئيسية", path: "/" },
              { label: "المتجر", path: "/shop" },
              { label: "العروض", path: "/shop?offers=true" },
            ].map((link) => {
              const isActive = location === link.path || (link.path.includes("?") && location.includes(link.path.split("?")[0]));
              return (
                <Link key={link.label} href={link.path} className={cn(
                  "relative py-2 transition-all duration-300 group",
                  isActive ? "text-primary" : "text-gray-500 hover:text-primary"
                )}>
                  {link.label}
                  <span className={cn(
                    "absolute bottom-0 right-0 h-0.5 bg-primary transition-all duration-300 rounded-full",
                    isActive ? "w-full" : "w-0 group-hover:w-full"
                  )} />
                </Link>
              );
            })}
          </div>

          {/* Left Actions (Cart, Search, Profile) */}
          <div className="flex items-center gap-2 md:gap-4 justify-start">
             <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "h-10 w-10 md:h-12 md:w-12 text-gray-700 hover:text-primary transition-all rounded-2xl bg-gray-50/50 border border-gray-100 hover:border-primary/20 hover:shadow-sm",
                  isSearchOpen ? "bg-primary/10 text-primary border-primary/30" : ""
                )}
                onClick={() => setIsSearchOpen(!isSearchOpen)}
            >
              {isSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </Button>

            <Link href="/cart">
              <div className="relative h-10 w-10 md:h-12 md:w-12 flex items-center justify-center rounded-2xl bg-gray-50/50 border border-gray-100 hover:border-primary/20 hover:bg-white hover:shadow-sm transition-all cursor-pointer group">
                <ShoppingCart className="h-5 w-5 text-gray-700 group-hover:text-primary transition-colors" />
                {cartCount > 0 && (
                  <Badge className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center bg-primary p-0 text-[10px] border-2 border-white shadow-md font-black animate-in zoom-in">
                    {cartCount}
                  </Badge>
                )}
              </div>
            </Link>

            <Link href="/profile">
              <Button variant="ghost" size="icon" className="h-10 w-10 md:h-12 md:w-12 text-gray-700 hover:text-primary rounded-2xl bg-gray-50/50 border border-gray-100 hover:border-primary/20 hover:bg-white hover:shadow-sm transition-all group">
                {user ? (
                  user.avatar ? <img src={user.avatar} className="h-5 w-5 rounded-full object-cover" /> : <User className="h-5 w-5 group-hover:scale-110 transition-transform" />
                ) : <User className="h-5 w-5" />}
              </Button>
            </Link>
            
            {getAdminToken() && (
              <Link href="/admin">
                <Button variant="ghost" size="icon" className="h-10 w-10 md:h-12 md:w-12 text-orange-600 hover:bg-orange-50 rounded-2xl border border-orange-100 animate-pulse">
                  <Shield className="h-5 w-5" />
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
