import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ProductCard } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Search, Filter, SlidersHorizontal, Loader2, Heart, X, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useState, useMemo, useEffect } from "react";
import { useWishlist } from "@/hooks/use-wishlist";

import { useLocation, useSearch } from "wouter";

export default function Shop() {
  const [location] = useLocation();
  const search = useSearch();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState([100]);
  const [maxPriceValue] = useState(10000000); // no hard cap
  const [showWishlistOnly, setShowWishlistOnly] = useState(false);
  const [showOffersOnly, setShowOffersOnly] = useState(false);
  const { items: wishlistItems } = useWishlist();

  const { data: productsData, isLoading } = useQuery({
    queryKey: ["/api/products"],
    queryFn: () => apiRequest("/api/products"),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: () => apiRequest("/api/categories"),
  });

  const allProducts = productsData || [];
  const cats = categoriesData || [];

  // Check URL params for filters
  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get("wishlist") === "true") {
      setShowWishlistOnly(true);
    } else {
      setShowWishlistOnly(false);
    }
    
    const catId = params.get("category");
    if (catId) {
      setSelectedCategories([catId]);
    } else {
      setSelectedCategories([]);
    }

    const searchParam = params.get("search");
    if (searchParam) {
      setSearchTerm(searchParam);
    } else {
      setSearchTerm("");
    }

    if (params.get("offers") === "true") {
      setShowOffersOnly(true);
    } else {
      setShowOffersOnly(false);
    }
  }, [location, search]);

  const filteredProducts = useMemo(() => {
    let filtered = allProducts;
    if (searchTerm) {
      filtered = filtered.filter((p: any) =>
        p.name.includes(searchTerm) || (p.nameEn && p.nameEn.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((p: any) => selectedCategories.includes(p.category));
    }
    // No price filter by default (slider is 0-100 mapped to 0-maxPriceValue)
    if (priceRange[0] < 100) {
      const maxPrice = (priceRange[0] / 100) * maxPriceValue;
      filtered = filtered.filter((p: any) => p.price <= maxPrice);
    }

    if (showWishlistOnly) {
      filtered = filtered.filter((p: any) => wishlistItems.includes(p.id));
    }

    if (showOffersOnly) {
      filtered = filtered.filter((p: any) => p.originalPrice && Number(p.originalPrice) > Number(p.price));
    }

    return filtered;
  }, [allProducts, searchTerm, selectedCategories, priceRange, showWishlistOnly, showOffersOnly, wishlistItems]);

  function toggleCategory(catId: string) {
    setSelectedCategories(prev =>
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    );
  }

  const filterContent = (
    <div className="space-y-8">
      <div className="relative">
        <Input
          placeholder="ابحث في المتجر..."
          className="pl-10"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          data-testid="input-search"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>

      <div className="space-y-4">
        <div
          className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${showWishlistOnly ? "bg-red-50 border-red-200 text-red-700" : "bg-white border-border hover:border-primary/50"}`}
          onClick={() => setShowWishlistOnly(!showWishlistOnly)}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${showWishlistOnly ? "bg-red-100" : "bg-gray-100"}`}>
            <Heart className={`h-4 w-4 ${showWishlistOnly ? "fill-red-600 text-red-600" : "text-gray-500"}`} />
          </div>
          <div className="flex-1 font-bold text-sm">
            المفضلة فقط
          </div>
        </div>

        <div
          className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${showOffersOnly ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-white border-border hover:border-primary/50"}`}
          onClick={() => setShowOffersOnly(!showOffersOnly)}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${showOffersOnly ? "bg-amber-100" : "bg-gray-100"}`}>
            <Sparkles className={`h-4 w-4 ${showOffersOnly ? "text-amber-600" : "text-gray-500"}`} />
          </div>
          <div className="flex-1 font-bold text-sm">
            العروض المتاحة فقط
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-lg">الأقسام</h3>
        <div className="space-y-3">
          {cats.map((cat: any) => (
            <div key={cat.id} className="flex items-center space-x-2 space-x-reverse">
              <Checkbox
                id={`cat-${cat.id}`}
                checked={selectedCategories.includes(cat.id)}
                onCheckedChange={() => toggleCategory(cat.id)}
              />
              <Label htmlFor={`cat-${cat.id}`} className="text-base font-medium cursor-pointer">
                {cat.name}
              </Label>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <h3 className="font-bold text-lg">السعر (أقصى حد)</h3>
        <Slider value={priceRange} onValueChange={setPriceRange} max={100} step={1} className="py-4" />
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>بدون حد</span>
          <span>{priceRange[0] < 100 ? `${Math.round((priceRange[0] / 100) * maxPriceValue).toLocaleString()} ج.س` : "الكل"}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <div className="bg-secondary/90 text-white py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/texture-pattern.png')] bg-repeat opacity-20"></div>
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h1 className="text-4xl font-black mb-4">المتجر</h1>
          <p className="text-secondary-foreground/80 max-w-xl mx-auto text-lg">
            تصفح مجموعتنا الكاملة من المنتجات السودانية الأصيلة
          </p>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="hidden lg:block w-72 shrink-0">
            {filterContent}
          </aside>

          <div className="lg:hidden w-full mb-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full h-12 font-bold gap-2 rounded-2xl border-primary/20 bg-primary/5 text-primary" data-testid="button-filter-mobile">
                  <Filter className="h-4 w-4" />
                  خيارات التصفية والبحث
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-[2.5rem] h-[85vh] p-0 overflow-hidden">
                <div className="h-1.5 w-12 bg-gray-300 rounded-full mx-auto mt-3 mb-1 shrink-0"></div>
                <div className="py-6 px-6 overflow-y-auto h-full pb-20 no-scrollbar">
                  <h2 className="text-2xl font-black mb-6">تصفية النتائج</h2>
                  {filterContent}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="flex-1 min-w-0">
            {/* Horizontal Category Sliding Bar */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-6 -mx-1 px-1">
              <Button
                variant={selectedCategories.length === 0 ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategories([])}
                className={cn(
                  "rounded-full px-6 h-10 font-bold shrink-0 transition-all",
                  selectedCategories.length === 0 ? "shadow-md shadow-primary/20" : "bg-white border-border/60"
                )}
              >
                الكل
              </Button>
              {cats.map((cat: any) => (
                <Button
                  key={cat.id}
                  size="sm"
                  variant={selectedCategories.includes(cat.id) ? "default" : "outline"}
                  onClick={() => toggleCategory(cat.id)}
                  className={cn(
                    "rounded-full px-6 h-10 font-bold shrink-0 whitespace-nowrap transition-all",
                    selectedCategories.includes(cat.id) ? "shadow-md shadow-primary/20" : "bg-white border-border/60"
                  )}
                >
                  {cat.name}
                </Button>
              ))}
            </div>
            <div className="flex items-center justify-between mb-8">
              <p className="text-muted-foreground font-medium">
                عرض <span className="text-foreground font-bold" data-testid="text-product-count">{filteredProducts.length}</span> منتج
                {showWishlistOnly && <span className="mr-1 text-red-600 font-bold">(المفضلة)</span>}
              </p>

              {(showWishlistOnly || showOffersOnly) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowWishlistOnly(false);
                    setShowOffersOnly(false);
                  }}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-2 font-bold"
                >
                  <X className="h-4 w-4" />
                  إلغاء التصفية
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <p className="text-xl">لا توجد منتجات مطابقة</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-6">
                {filteredProducts.map((product: any) => (
                  <ProductCard key={product.id} {...product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
