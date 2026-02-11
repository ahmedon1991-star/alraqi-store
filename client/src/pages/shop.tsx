import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ProductCard } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Search, Filter, SlidersHorizontal, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useState, useMemo } from "react";

export default function Shop() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState([100]);

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
    const maxPrice = priceRange[0] * 100;
    filtered = filtered.filter((p: any) => p.price <= maxPrice);
    return filtered;
  }, [allProducts, searchTerm, selectedCategories, priceRange]);

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
        <h3 className="font-bold text-lg">السعر</h3>
        <Slider value={priceRange} onValueChange={setPriceRange} max={100} step={1} className="py-4" />
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>0 ج.س</span>
          <span>{(priceRange[0] * 100).toLocaleString()} ج.س</span>
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

          <div className="lg:hidden w-full mb-6">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full h-12 font-bold gap-2" data-testid="button-filter-mobile">
                  <Filter className="h-4 w-4" />
                  تصفية المنتجات
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-3xl h-[80vh]">
                <div className="py-6">
                  <h2 className="text-xl font-bold mb-4">تصفية النتائج</h2>
                  {filterContent}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-8">
              <p className="text-muted-foreground font-medium">
                عرض <span className="text-foreground font-bold" data-testid="text-product-count">{filteredProducts.length}</span> منتج
              </p>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
