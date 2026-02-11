import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { products } from "@/lib/mock-data";
import { Trash2, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function Cart() {
  // Mock cart items
  const cartItems = [products[0], products[2]];
  const total = cartItems.reduce((acc, item) => acc + item.price, 0);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-12">
        <h1 className="text-3xl font-black mb-8">سلة المشتريات (2)</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Cart Items List */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <div key={item.id} className="flex gap-4 p-4 rounded-2xl bg-white border border-border/50 items-center">
                <div className="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg truncate">{item.name}</h3>
                  <p className="text-muted-foreground text-sm mb-2">{item.category}</p>
                  <div className="font-mono font-bold text-primary">{item.price.toLocaleString()} ج.س</div>
                </div>

                <div className="flex flex-col items-end gap-2">
                   <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-500">
                      <Trash2 className="h-5 w-5" />
                   </Button>
                   <div className="flex items-center gap-3 bg-muted/30 px-3 py-1 rounded-lg">
                      <span className="text-sm font-bold">1</span>
                   </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-3xl border border-border/50 sticky top-24 shadow-sm">
              <h2 className="font-bold text-xl mb-6">ملخص الطلب</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-muted-foreground">
                  <span>المجموع الفرعي</span>
                  <span className="font-mono">{total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>الشحن</span>
                  <span className="font-mono">1,500</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>الضريبة</span>
                  <span className="font-mono">0</span>
                </div>
                <div className="h-px bg-border my-2"></div>
                <div className="flex justify-between font-black text-xl">
                  <span>الإجمالي</span>
                  <span className="text-primary font-mono">{(total + 1500).toLocaleString()} ج.س</span>
                </div>
              </div>

              <div className="space-y-3">
                 <Button className="w-full h-12 rounded-full font-bold text-lg shadow-lg hover:shadow-primary/20">
                    إتمام الشراء
                 </Button>
                 <Link href="/shop">
                  <Button variant="outline" className="w-full h-12 rounded-full font-bold">
                      <ArrowRight className="h-4 w-4 ml-2" />
                      مواصلة التسوق
                  </Button>
                 </Link>
              </div>

              <div className="mt-6">
                <div className="flex gap-2">
                   <Input placeholder="كود الخصم" className="rounded-l-none rounded-r-xl" />
                   <Button className="rounded-r-none rounded-l-xl">تطبيق</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
