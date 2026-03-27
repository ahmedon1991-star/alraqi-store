import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ShoppingCart, Trash2, Minus, Plus, ArrowLeft, ArrowRight, Wallet, MapPin, Phone, User, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
import { useCart, useUpdateCartQuantity, useRemoveFromCart } from "@/hooks/use-cart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useCurrentUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CartSheet({ children }: { children: React.ReactNode }) {
  const { data } = useCart();
  const { data: user } = useCurrentUser();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const updateQuantity = useUpdateCartQuantity();
  const removeItem = useRemoveFromCart();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"cart" | "checkout">("cart");

  const cartItems = data?.items || [];
  const subtotal = cartItems.reduce((acc: number, item: any) => acc + (item.price || item.product.price) * item.quantity, 0);

  const [checkoutData, setCheckoutData] = useState({ 
    name: user?.name || "", 
    phone: user?.phone || "", 
    address: "", 
    paymentMethod: "cod", 
    bankId: "" 
  });

  useEffect(() => {
    if (user) {
      setCheckoutData(prev => ({ 
        ...prev, 
        name: prev.name || user.name || "", 
        phone: prev.phone || user.phone || "" 
      }));
    }
  }, [user]);

  const { data: banks } = useQuery<any[]>({
    queryKey: ["/api/banks"],
    queryFn: () => apiRequest("/api/banks"),
    enabled: step === "checkout",
  });

  const { data: adminSettings } = useQuery<any>({
    queryKey: ["/api/settings"],
    queryFn: () => apiRequest("/api/settings"),
    enabled: step === "checkout",
  });

  const checkoutMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/orders", {
        method: "POST",
        body: JSON.stringify(checkoutData),
      }),
    onSuccess: (orderResponse) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cart/count"] });
      
      setIsOpen(false);
      setStep("cart");
      
      toast({
        title: "تم الطلب بنجاح",
        description: "جاري تحويلك للواتساب لإتمام عملية الشراء...",
      });
      
      if (orderResponse.whatsappUrl) {
        window.open(orderResponse.whatsappUrl, "_blank");
      }
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "حدث خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutData.name.trim()) return toast({ title: "الاسم مطلوب", variant: "destructive" });
    if (!checkoutData.phone.trim()) return toast({ title: "رقم الهاتف مطلوب", variant: "destructive" });
    if (!checkoutData.address.trim()) return toast({ title: "العنوان مطلوب", variant: "destructive" });
    checkoutMutation.mutate();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(val) => { setIsOpen(val); if (!val) setStep("cart"); }}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="top" className="h-[95vh] md:h-[85vh] rounded-b-[2.5rem] p-0 flex flex-col border-primary/20 bg-background/98 backdrop-blur-2xl overflow-hidden shadow-2xl">
        <SheetHeader className="p-6 border-b border-primary/10 bg-white/50">
          <SheetTitle className="text-right font-display text-2xl md:text-3xl text-primary flex items-center justify-end gap-3">
            {step === "cart" ? (
              <>
                سلة المشتريات
                <ShoppingCart className="h-6 w-6" />
              </>
            ) : (
              <>
                إتمام الطلب
                <CheckCircle2 className="h-6 w-6" />
              </>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar">
          {step === "cart" ? (
            cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="w-24 h-24 rounded-full bg-primary/5 flex items-center justify-center">
                  <ShoppingCart className="h-12 w-12 text-primary/20" />
                </div>
                <p className="text-xl font-bold text-muted-foreground">السلة فارغة حالياً</p>
                <Button onClick={() => setIsOpen(false)} variant="outline" className="rounded-full px-8">تصفح المتجر</Button>
              </div>
            ) : (
              <div className="space-y-4 max-w-3xl mx-auto">
                {cartItems.map((item: any) => (
                  <div key={item.id} className="flex gap-4 p-4 rounded-3xl bg-white border border-primary/5 items-center shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-50 rounded-2xl overflow-hidden shrink-0 p-2 border border-primary/5">
                      <img src={item.image || item.product.image || ""} alt={item.product.name} className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                      <h3 className="font-black text-sm md:text-xl truncate text-foreground">{item.product.name}</h3>
                      {item.measurement && <p className="text-[10px] md:text-xs text-muted-foreground font-bold mt-1">الحجم: {item.measurement}</p>}
                      <p className="text-primary font-mono font-black text-base md:text-2xl mt-1">{(item.price || item.product.price).toLocaleString()} <span className="text-[10px] md:text-sm">ج.س</span></p>
                    </div>
                    <div className="flex items-center gap-2 bg-primary/5 px-2 py-1 rounded-2xl border border-primary/10">
                      <button 
                        onClick={() => updateQuantity.mutate({ id: item.id, quantity: item.quantity + 1 })}
                        className="w-10 h-10 flex items-center justify-center text-primary bg-white rounded-xl shadow-sm hover:scale-110 transition-transform"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <span className="font-black text-lg w-6 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => {
                          if (item.quantity > 1) updateQuantity.mutate({ id: item.id, quantity: item.quantity - 1 });
                          else removeItem.mutate(item.id);
                        }}
                        className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-red-500 bg-white rounded-xl shadow-sm hover:scale-110 transition-transform"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="max-w-2xl mx-auto space-y-6">
              <form onSubmit={handleCheckoutSubmit} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-foreground/70 pr-2 flex items-center justify-end gap-2">الاسم بالكامل <User className="h-3.5 w-3.5" /></label>
                    <Input
                      placeholder="أدخل اسمك لتأكيد الطلب"
                      required
                      value={checkoutData.name}
                      onChange={e => setCheckoutData(prev => ({ ...prev, name: e.target.value }))}
                      className="text-right h-14 rounded-2xl border-primary/10 bg-white shadow-inner focus:border-primary/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-foreground/70 pr-2 flex items-center justify-end gap-2">رقم الهاتف <Phone className="h-3.5 w-3.5" /></label>
                    <Input
                      placeholder="رقم الواتساب للتواصل"
                      required
                      type="tel"
                      value={checkoutData.phone}
                      onChange={e => setCheckoutData(prev => ({ ...prev, phone: e.target.value }))}
                      className="text-right h-14 rounded-2xl border-primary/10 bg-white shadow-inner"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-foreground/70 pr-2 flex items-center justify-end gap-2">عنوان التوصيل <MapPin className="h-3.5 w-3.5" /></label>
                  <Input
                    placeholder="المدينة، الحي، اسم الشارع، معلم بارز"
                    required
                    value={checkoutData.address}
                    onChange={e => setCheckoutData(prev => ({ ...prev, address: e.target.value }))}
                    className="text-right h-14 rounded-2xl border-primary/10 bg-white shadow-inner"
                  />
                </div>

                <div className="space-y-4 pt-2">
                  <label className="text-base font-black text-foreground flex items-center justify-end gap-2">طريقة الدفع <Wallet className="h-4 w-4 text-primary" /></label>
                  <RadioGroup
                    value={checkoutData.paymentMethod}
                    onValueChange={(val) => setCheckoutData(prev => ({ ...prev, paymentMethod: val }))}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div className={cn("flex flex-col items-center justify-center p-4 rounded-3xl border-2 transition-all cursor-pointer relative", checkoutData.paymentMethod === "cod" ? "border-primary bg-primary/5" : "border-primary/5 bg-white hover:border-primary/20")}>
                      <RadioGroupItem value="cod" id="drawer-cod" className="sr-only" />
                      <Label htmlFor="drawer-cod" className="cursor-pointer font-black text-center">الدفع عند الاستلام</Label>
                      {checkoutData.paymentMethod === "cod" && <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-primary" />}
                    </div>
                    <div className={cn("flex flex-col items-center justify-center p-4 rounded-3xl border-2 transition-all cursor-pointer relative", checkoutData.paymentMethod === "bank" ? "border-primary bg-primary/5" : "border-primary/5 bg-white hover:border-primary/20")}>
                      <RadioGroupItem value="bank" id="drawer-bank" className="sr-only" />
                      <Label htmlFor="drawer-bank" className="cursor-pointer font-black text-center">تحويل بنكي</Label>
                      {checkoutData.paymentMethod === "bank" && <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-primary" />}
                    </div>
                  </RadioGroup>
                </div>

                {checkoutData.paymentMethod === "bank" && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <Select value={checkoutData.bankId} onValueChange={(val) => setCheckoutData(prev => ({ ...prev, bankId: val }))}>
                      <SelectTrigger className="h-14 rounded-2xl border-primary/10 bg-white text-right">
                        <SelectValue placeholder="اختر البنك المحول إليه" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        {banks?.map((bank) => (
                          <SelectItem key={bank.id} value={bank.id} className="text-right">{bank.bankName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {checkoutData.bankId && (
                      <div className="rounded-[1.5rem] bg-primary/5 p-6 border border-primary/20 text-right space-y-2 relative overflow-hidden">
                        <div className="absolute top-[-10px] left-[-10px] opacity-10 rotate-12"><Wallet size={80} /></div>
                        {banks?.find(b => b.id === checkoutData.bankId) && (
                          <>
                            <p className="text-xs text-muted-foreground font-black">تفاصيل الحساب:</p>
                            <p className="text-xl font-black text-primary">{banks.find(b => b.id === checkoutData.bankId).accountName}</p>
                            <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-primary/10 mt-2">
                               <button 
                                 type="button" 
                                 onClick={() => { navigator.clipboard.writeText(banks.find(b => b.id === checkoutData.bankId).accountNumber); toast({ title: "تم النسخ" }); }}
                                 className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-1 rounded-lg"
                               >نسخ</button>
                               <span className="font-mono text-lg font-black">{banks.find(b => b.id === checkoutData.bankId).accountNumber}</span>
                            </div>
                            <p className="text-[10px] text-primary/70 font-bold mt-2">💡 يرجى إرفاق صورة إشعار التحويل في الواتساب.</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </form>
            </div>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="p-6 md:p-8 bg-white/80 border-t border-primary/10 space-y-6 rounded-b-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
            <div className="flex justify-between items-center px-2 max-w-3xl mx-auto">
              <div className="text-right">
                 <span className="block text-[10px] text-muted-foreground font-black mb-1 uppercase tracking-widest">الإجمالي التقريبي</span>
                 <span className="text-3xl md:text-5xl font-display text-primary font-black">{(subtotal).toLocaleString()} <span className="text-lg">ج.س</span></span>
              </div>
              <div className="flex flex-col items-end gap-1">
                 <Badge variant="outline" className="rounded-full bg-primary/5 border-primary/10 text-primary font-black px-4 py-1">
                   {cartItems.length} منتجات
                 </Badge>
              </div>
            </div>

            <div className="flex gap-4 max-w-3xl mx-auto">
              {step === "cart" ? (
                <>
                  <Button 
                    onClick={() => {
                      if (!user) {
                        setIsOpen(false);
                        setLocation("/login");
                        return;
                      }
                      setStep("checkout");
                    }} 
                    className="flex-1 h-14 md:h-16 rounded-[1.5rem] md:rounded-3xl text-lg md:text-xl font-black bg-primary text-black shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-95 group"
                  >
                    {user ? "إتمام الطلب الآن" : "سجل دخول للطلب"}
                    <ChevronRight className="mr-2 h-5 w-5 group-hover:translate-x-[-4px] transition-transform" />
                  </Button>
                  <Button onClick={() => setIsOpen(false)} variant="outline" className="flex-1 h-14 md:h-16 rounded-[1.5rem] md:rounded-3xl font-black border-primary/20 hover:bg-primary/5">
                    العودة للمتجر
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    onClick={handleCheckoutSubmit}
                    disabled={checkoutMutation.isPending}
                    className="flex-1 h-14 md:h-16 rounded-[1.5rem] md:rounded-3xl text-lg md:text-xl font-black bg-emerald-500 text-white shadow-xl shadow-emerald-200 hover:bg-emerald-600 hover:scale-[1.02] transition-transform active:scale-95"
                  >
                    {checkoutMutation.isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : "إرسال للواتساب"}
                  </Button>
                  <Button onClick={() => setStep("cart")} variant="outline" className="flex-1 h-14 md:h-16 rounded-[1.5rem] md:rounded-3xl font-black border-primary/20 gap-2">
                    <ArrowLeft className="h-5 w-5" /> تعديل السلة
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

