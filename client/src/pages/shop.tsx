import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ProductCard } from "@/components/product/product-card";
import { products, categories } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Search, Filter, SlidersHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Shop() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      {/* Page Header */}
      <div className="bg-secondary/90 text-white py-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('/images/texture-pattern.png')] bg-repeat opacity-20"></div>
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h1 className="text-4xl font-black mb-4">المتجر</h1>
          <p className="text-secondary-foreground/80 max-w-xl mx-auto text-lg">
            تصفح مجموعتنا الكاملة من المنتجات السودانية الأصيلة
          </p>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Sidebar Filters (Desktop) */}
          <aside className="hidden lg:block w-72 shrink-0 space-y-8">
            {/* Search */}
            <div className="relative">
              <Input placeholder="ابحث في المتجر..." className="pl-10" />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>

            {/* Categories */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg">الأقسام</h3>
              <div className="space-y-3">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox id={`cat-${cat.id}`} />
                    <Label htmlFor={`cat-${cat.id}`} className="text-base font-medium cursor-pointer">
                      {cat.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="space-y-4">
              <h3 className="font-bold text-lg">السعر</h3>
              <Slider defaultValue={[50]} max={100} step={1} className="py-4" />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>1000 ج.س</span>
                <span>50000 ج.س</span>
              </div>
            </div>
          </aside>

          {/* Mobile Filter Sheet */}
          <div className="lg:hidden w-full mb-6">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full h-12 font-bold gap-2">
                  <Filter className="h-4 w-4" />
                  تصفية المنتجات
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-3xl h-[80vh]">
                 <div className="py-6 space-y-8">
                    <h2 className="text-xl font-bold mb-4">تصفية النتائج</h2>
                    {/* Add filters here similar to desktop */}
                    <p className="text-muted-foreground">خيارات التصفية...</p>
                 </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Product Grid */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-8">
              <p className="text-muted-foreground font-medium">عرض <span className="text-foreground font-bold">{products.length}</span> منتج</p>
              
              <div className="flex items-center gap-2">
                 <span className="text-sm text-muted-foreground hidden sm:inline">ترتيب حسب:</span>
                 <Button variant="outline" size="sm" className="gap-2 font-normal">
                    الأكثر مبيعاً
                    <SlidersHorizontal className="h-4 w-4" />
                 </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} {...product} />
              ))}
               {/* Duplicate products to fill the grid for visual impact */}
              {products.map((product) => (
                <ProductCard key={`dup-${product.id}`} {...product} id={product.id + 10} />
              ))}
            </div>
            
            <div className="mt-12 flex justify-center">
              <Button variant="outline" size="lg" className="px-8 min-w-[200px]">تحميل المزيد</Button>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
