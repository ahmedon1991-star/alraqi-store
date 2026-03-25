import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Package,
  ShieldCheck,
  MapPin,
  ChevronLeft,
  Heart,
  FileText,
  Settings,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  RotateCcw,
  Search,
  ChevronRight,
  User as UserIcon,
  LogOut,
  UserCog,
  ShoppingBag,
  Bell,
  Wallet,
  ArrowRight,
  Fingerprint,
  Check,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { apiRequest, setCustomerToken } from "../lib/api";
import { useCurrentUser, useLogout } from "../hooks/use-auth";
import { formatPrice } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";
import { useAddToCart } from "@/hooks/use-cart";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function formatOrderDate(value: string | null) {
  if (!value) return "غير متوفر";
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

const profileSchema = z.object({
  name: z.string().min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" }),
  phone: z.string().min(9, { message: "رقم الهاتف غير صحيح" }),
  email: z.string().email({ message: "البريد الإلكتروني غير صحيح" }),
});

const statusData: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  pending: { label: "قيد المراجعة", icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
  processing: { label: "قيد التجهيز", icon: Package, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
  completed: { label: "تم التوصيل", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
  cancelled: { label: "ملغي", icon: XCircle, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" },
};

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("orders");
  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const logoutMutation = useLogout();
  const addToCartMutation = useAddToCart();
  
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isTrackOpen, setIsTrackOpen] = useState(false);

  const ordersQuery = useQuery({
    queryKey: ["/api/orders/me"],
    queryFn: () => apiRequest("/api/orders/me"),
    enabled: !!user,
  });

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", phone: "", email: "" },
  });

  useEffect(() => {
    if (user) {
      profileForm.reset({
        name: user.name || "",
        phone: user.phone || "",
        email: user.email || "",
      });
    } else if (!isUserLoading) {
      setLocation("/login");
    }
  }, [user, profileForm, isUserLoading, setLocation]);

  const updateProfileMutation = useMutation({
    mutationFn: (values: z.infer<typeof profileSchema>) =>
      apiRequest("/api/auth/me", { method: "PATCH", body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "تم التحديث بنجاح", description: "تم حفظ بياناتك الشخصية." });
    },
  });

  const handleEnableBiometrics = async () => {
    try {
      if (!window.PublicKeyCredential) {
        toast({
          title: "غير مدعوم",
          description: "جهازك أو متصفحك لا يدعم السمات الحيوية (WebAuthn).",
          variant: "destructive",
        });
        return;
      }

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      
      const userIdBuffer = new TextEncoder().encode(user.id);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challenge.buffer,
          rp: { 
            name: "الراقي للمنتجات الغذائية",
            id: window.location.hostname === "localhost" ? undefined : window.location.hostname
          },
          user: {
            id: userIdBuffer,
            name: user?.email || "user",
            displayName: user?.name || "User",
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          timeout: 60000,
          attestation: "direct",
        }
      });

      if (credential) {
        const deviceToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
        await apiRequest("/api/auth/biometric/enable", {
          method: "POST",
          body: JSON.stringify({ token: deviceToken }),
        });

        localStorage.setItem("alraqi_biometric_email", user?.email || "");
        localStorage.setItem("alraqi_biometric_token", deviceToken);

        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        toast({ title: "تم التفعيل", description: "تم تفعيل الدخول بالبصمة/الوجه بنجاح لهذا الجهاز." });
      }
    } catch (error: any) {
      console.error(error);
      toast({
        title: "فشل التفعيل",
        description: error.message || "تعذر إكمال عملية التحقق",
        variant: "destructive",
      });
    }
  };

  const handleReorder = async (itemsJson: string) => {
    try {
      const items = JSON.parse(itemsJson);
      for (const item of items) {
        await addToCartMutation.mutateAsync(item.id);
      }
      toast({ title: "تمت إعادة الطلب", description: "تمت إضافة كافة المنتجات إلى سلتك." });
      setLocation("/cart");
    } catch (e) {
      toast({ title: "خطأ", description: "حدث خطأ أثناء إضافة المنتجات للسلة.", variant: "destructive" });
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F8FA]" dir="rtl">
      <Navbar />
      
      <div className="bg-white border-b sticky top-0 z-40 md:relative">
         <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
               <div className="flex items-center gap-5 w-full md:w-auto">
                  <div className="h-20 w-20 md:h-24 md:w-24 rounded-full border-4 border-primary/10 shadow-xl overflow-hidden bg-primary/5 flex items-center justify-center text-4xl font-black text-primary hover:scale-105 transition-transform cursor-pointer">
                    {user.avatar ? <img src={user.avatar} className="h-full w-full object-cover" /> : user.name?.charAt(0) || "U"}
                  </div>
                  <div className="text-right flex-1">
                     <h1 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight">{user.name || "مرحباً بك"}</h1>
                     <p className="text-gray-500 font-bold text-sm">{user.email}</p>
                     <div className="flex gap-2 mt-3 overflow-x-auto pb-1 invisible-scrollbar">
                        <div className="flex-shrink-0 flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-full text-[10px] md:text-xs font-black text-emerald-600 border border-emerald-100">
                           <ShieldCheck className="h-3 w-3 md:h-4 md:w-4" /> عضو بلاتيني
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-1.5 bg-primary/5 px-3 py-1.5 rounded-full text-[10px] md:text-xs font-black text-primary border border-primary/10">
                           <ShoppingBag className="h-3 w-3 md:h-4 md:w-4" /> {ordersQuery.data?.length || 0} طلبات
                        </div>
                     </div>
                  </div>
               </div>
               
               <div className="hidden md:flex items-center gap-3">
                  <Button variant="outline" className="rounded-2xl font-black h-12 px-6 border-2 hover:bg-gray-50" onClick={() => setLocation("/")}>العودة للتسوق <ChevronLeft className="h-5 w-5 rotate-180 mr-2" /></Button>
               </div>
            </div>
         </div>
      </div>

      <main className="container mx-auto flex-1 px-4 py-6 md:py-10">
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <aside className="lg:col-span-3">
               <div className="md:grid hidden gap-2">
                  {[
                    { id: "orders", label: "طلباتي", icon: ShoppingBag },
                    { id: "profile", label: "الملف الشخصي", icon: UserCog },
                    { id: "wallet", label: "المحفظة", icon: Wallet },
                    { id: "settings", label: "الإعدادات", icon: Settings }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        "flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-right transition-all group",
                        activeTab === item.id ? "bg-primary text-white shadow-xl shadow-primary/30" : "text-gray-500 hover:bg-white hover:text-primary border border-transparent hover:border-primary/20"
                      )}
                    >
                      <item.icon className={cn("h-5 w-5", activeTab === item.id ? "text-white" : "text-primary/40")} />
                      {item.label}
                    </button>
                  ))}
                  <button onClick={() => logoutMutation.mutate()} className="flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-rose-600 hover:bg-rose-50 transition-all mt-6"><LogOut className="h-5 w-5 text-rose-400" /> تسجيل الخروج</button>
               </div>

               <div className="flex md:hidden items-center justify-between gap-2 overflow-x-auto pb-4 invisible-scrollbar">
                  {[
                    { id: "orders", label: "طلباتي", icon: ShoppingBag },
                    { id: "profile", label: "الملف", icon: UserCog },
                    { id: "wallet", label: "المحفظة", icon: Wallet },
                    { id: "settings", label: "الإعدادات", icon: Settings }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        "flex-1 min-w-[100px] flex flex-col items-center justify-center p-4 rounded-2xl font-black text-xs transition-all",
                        activeTab === item.id ? "bg-primary text-white shadow-lg" : "bg-white text-gray-500 shadow-sm"
                      )}
                    >
                      <item.icon className="h-5 w-5 mb-2" />
                      {item.label}
                    </button>
                  ))}
                  <button
                    onClick={() => logoutMutation.mutate()}
                    className="flex-1 min-w-[100px] flex flex-col items-center justify-center p-4 rounded-2xl font-black text-xs transition-all bg-rose-50 text-rose-600 shadow-sm"
                  >
                    <LogOut className="h-5 w-5 mb-2" />
                    خروج
                  </button>
               </div>
            </aside>

            <div className="lg:col-span-9 space-y-6">
               {activeTab === "orders" && (
                 <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between mb-4">
                       <h2 className="text-xl md:text-2xl font-black text-gray-900">سجل طلباتي</h2>
                       <Search className="h-5 w-5 text-gray-400 cursor-pointer hover:text-primary transition-colors" />
                    </div>

                    {ordersQuery.isLoading ? (
                      <div className="flex flex-col items-center py-20 gap-4"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="font-bold text-muted-foreground">جاري استرجاع طلباتك...</p></div>
                    ) : ordersQuery.data?.length ? (
                      <div className="grid gap-5">
                         {ordersQuery.data.map((order: any) => {
                            const status = statusData[order.status] || statusData.pending;
                            const items = JSON.parse(order.items || "[]");
                            return (
                              <Card key={order.id} className="border-none shadow-sm md:shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden rounded-[1.5rem] md:rounded-[2rem] bg-white group hover:shadow-md transition-all duration-300">
                                 <div className="flex flex-col">
                                    <div className="p-5 md:p-6 flex items-center justify-between border-b border-gray-50">
                                       <div className="flex items-center gap-3">
                                          <div className={cn("p-2.5 rounded-2xl", status.bg)}>
                                             <status.icon className={cn("h-5 w-5", status.color)} />
                                          </div>
                                          <div>
                                             <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{formatOrderDate(order.createdAt)}</div>
                                             <h3 className="font-black text-gray-900">طلب #{order.id.slice(0, 8).toUpperCase()}</h3>
                                          </div>
                                       </div>
                                       <div className={cn("px-4 py-1.5 rounded-full text-[10px] md:text-xs font-black border", status.bg, status.color, status.border)}>
                                          {status.label}
                                       </div>
                                    </div>

                                    <div className="p-5 md:p-6">


                                       <div className="flex items-center justify-between mt-4">
                                          <div className="text-right">
                                             <p className="text-[10px] font-bold text-gray-400 mb-1">إجمالي المبلغ</p>
                                             <p className="text-lg md:text-xl font-black text-primary">{formatPrice(order.total)}</p>
                                          </div>
                                          <div className="flex gap-2">
                                             <Button 
                                                size="sm" 
                                                className="rounded-full font-black px-6 h-10 bg-primary/10 text-primary hover:bg-primary/20 border-none shadow-none"
                                                onClick={() => { setSelectedOrder(order); setIsTrackOpen(true); }}
                                             >
                                                تفاصيل الطلب <FileText className="h-4 w-4 mr-1.5" />
                                             </Button>
                                             <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="rounded-full font-black px-6 h-10 border-2"
                                                onClick={() => handleReorder(order.items)}
                                             >
                                                إعادة طلب <RotateCcw className="h-4 w-4 mr-1.5 text-orange-500" />
                                             </Button>
                                          </div>
                                       </div>
                                    </div>
                                 </div>
                              </Card>
                            )
                         })}
                      </div>
                    ) : (
                      <div className="bg-white rounded-[2rem] p-16 text-center shadow-lg shadow-gray-100 animate-in zoom-in-95">
                         <div className="bg-primary/5 h-24 w-24 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                            <ShoppingBag className="h-12 w-12 text-primary/40" />
                         </div>
                         <h3 className="text-2xl font-black text-gray-900 mb-3">سجل طلباتك خالي حالياً</h3>
                         <p className="text-gray-500 mb-10 max-w-sm mx-auto font-medium">ابدأ الآن رحلة تسوق ممتعة واستمتع بأفضل المنتجات السودانية الأصيلة.</p>
                         <Button onClick={() => setLocation("/shop")} className="rounded-full px-10 h-14 text-lg font-black shadow-xl shadow-primary/20">ابدأ التسوق الآن <ArrowRight className="h-5 w-5 mr-2 rotate-180" /></Button>
                      </div>
                    )}
                 </div>
               )}

               {activeTab === "profile" && (
                 <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-2xl font-black text-gray-900">البيانات الشخصية</h2>
                    <Card className="border-none shadow-sm p-8 rounded-[2rem] bg-white">
                       <Form {...profileForm}>
                          <form onSubmit={profileForm.handleSubmit((v) => updateProfileMutation.mutate(v))} className="space-y-6">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={profileForm.control} name="name" render={({ field }) => (
                                   <FormItem><FormLabel className="font-bold pr-2">الاسم الكامل</FormLabel><FormControl><Input {...field} className="h-14 rounded-2xl bg-[#F8F9FB] border-none text-right font-black focus-visible:ring-primary/20" /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={profileForm.control} name="phone" render={({ field }) => (
                                   <FormItem><FormLabel className="font-bold pr-2">رقم الموبايل</FormLabel><FormControl><Input {...field} className="h-14 rounded-2xl bg-[#F8F9FB] border-none text-right font-black focus-visible:ring-primary/20" /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={profileForm.control} name="email" render={({ field }) => (
                                   <FormItem className="md:col-span-2"><FormLabel className="font-bold pr-2">البريد الإلكتروني</FormLabel><FormControl><Input {...field} disabled className="h-14 rounded-2xl bg-gray-100 border-none text-right font-black opacity-70" /></FormControl><FormMessage /></FormItem>
                                )} />
                             </div>
                             <Button type="submit" className="w-full md:w-auto rounded-full px-12 h-14 font-black text-lg shadow-xl shadow-primary/10" disabled={updateProfileMutation.isPending}>
                                {updateProfileMutation.isPending ? "جاري الحفظ..." : "تحديث البيانات"}
                             </Button>
                          </form>
                       </Form>
                    </Card>
                 </div>
               )}
               
               {activeTab === "wallet" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                     <h2 className="text-2xl font-black text-gray-900">محفظتك</h2>
                     <Card className="border-none bg-gradient-to-br from-primary to-[#2c917a] text-white p-10 rounded-[2.5rem] shadow-2xl shadow-primary/20 relative overflow-hidden">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                        <div className="relative z-10">
                           <div className="flex items-center gap-3 mb-8 opacity-90"><Wallet className="h-6 w-6" /><span className="font-bold text-sm tracking-widest uppercase">الرصيد المتاح</span></div>
                           <h3 className="text-5xl font-black mb-10 tracking-tighter">0.00 <span className="text-lg opacity-80">ج.س</span></h3>
                           <div className="flex flex-wrap gap-4">
                              <Button className="bg-white text-primary hover:bg-white/90 rounded-full font-black px-8 h-12 shadow-lg">تعريف الحساب</Button>
                              <Button className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-full font-black px-8 h-12">سجل العمليات</Button>
                           </div>
                        </div>
                     </Card>
                  </div>
               )}

               {activeTab === "settings" && (
                 <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-2xl font-black text-gray-900">إعدادات الحساب والأمان</h2>
                    <Card className="border-none shadow-sm overflow-hidden rounded-[2rem] bg-white">
                      <CardHeader className="bg-gray-50/50 border-b p-8">
                        <CardTitle className="text-xl font-black flex items-center gap-3">
                          <ShieldCheck className="h-6 w-6 text-primary" />
                          الأمان والسمات الحيوية
                        </CardTitle>
                        <CardDescription className="text-gray-500 font-bold">
                          قم بتفعيل الدخول السريع عبر بصمة الإصبع أو التعرف على الوجه
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-8">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 rounded-[1.5rem] bg-[#F8F9FB] border-2 border-dashed border-gray-200">
                          <div className="flex items-center gap-4 text-right">
                            <div className={cn(
                              "h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg transition-all",
                              user.biometricEnabled ? "bg-primary text-white" : "bg-white text-gray-300"
                            )}>
                              <Fingerprint className="h-8 w-8" />
                            </div>
                            <div>
                              <h3 className="font-black text-gray-900">الدخول بالبصمة / الوجه</h3>
                              <p className="text-sm text-gray-500 font-bold">
                                {user.biometricEnabled ? "مفعل على هذا الحساب" : "غير مفعل حالياً"}
                              </p>
                            </div>
                          </div>
                          <Button 
                            onClick={() => handleEnableBiometrics()}
                            variant={user.biometricEnabled ? "outline" : "default"}
                            className="rounded-full px-8 h-12 font-black shadow-lg"
                          >
                            {user.biometricEnabled ? "إعادة ضبط البصمة" : "تفعيل الآن"}
                          </Button>
                        </div>

                        <div className="mt-8 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-amber-600 mt-0.5" />
                          <p className="text-xs text-amber-700 font-bold leading-relaxed">
                            ملاحظة: تفعيل السمات الحيوية يعتمد على تقنية WebAuthn وسيعمل فقط على هذا المتصفح/الجهاز الذي تقوم بتفعيله منه حالياً.
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm p-8 rounded-[2rem] bg-white border-t-4 border-t-rose-500">
                       <h3 className="text-xl font-black text-rose-600 mb-2">منطقة الخطر</h3>
                       <p className="text-gray-500 font-bold mb-6">حذف الحساب سيؤدي إلى فقدان جميع بياناتك وطلباتك بشكل نهائي.</p>
                       <Button variant="destructive" className="rounded-full px-8 h-12 font-black">حذف الحساب نهائياً</Button>
                    </Card>
                  </div>
               )}
            </div>
         </div>
      </main>

      <Dialog open={isTrackOpen} onOpenChange={setIsTrackOpen}>
         <DialogContent className="rounded-[2rem] md:rounded-[2.5rem] p-0 overflow-hidden border-none w-[95vw] max-w-lg max-h-[90vh] flex flex-col hide-scrollbar">
            {selectedOrder && (
              <div className="flex flex-col h-full overflow-y-auto scrollbar-hide">
                 <div className="bg-primary p-6 md:p-8 text-white relative shrink-0">
                    <DialogClose className="absolute top-4 outline-none left-4 md:top-6 md:left-6 text-white/70 hover:text-white"><XCircle className="h-6 w-6 md:h-7 md:w-7" /></DialogClose>
                    <h2 className="text-lg md:text-xl font-black mb-1 md:mb-2 opacity-80">تتبع طلبك</h2>
                    <h3 className="text-2xl md:text-3xl font-black">#{selectedOrder.id.slice(0, 8).toUpperCase()}</h3>
                    <div className="flex items-center gap-2 mt-3 md:mt-4 bg-white/10 w-fit px-3 py-1.5 md:px-4 md:py-1.5 rounded-full text-[10px] md:text-xs font-bold capitalize">
                       <statusData.pending.icon className="h-4 w-4" /> {selectedOrder.status === 'completed' ? 'وصلت بسلام' : 'في الطريق إليك'}
                    </div>
                 </div>
                 
                 <div className="p-5 md:p-8 space-y-6 md:space-y-8 bg-white flex-1 overflow-visible">
                    <div className="space-y-6 md:space-y-8 relative before:absolute before:inset-y-0 before:right-6 md:before:right-7 before:w-0.5 before:bg-gray-100 pb-2">
                       <div className="flex items-start gap-4 md:gap-5 relative group">
                          <div className={cn("z-10 h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-[1rem] md:rounded-2xl flex items-center justify-center transition-all shadow-sm", selectedOrder.createdAt ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-gray-100 text-gray-400")}>
                             <Clock className="h-5 w-5 md:h-6 md:w-6" />
                          </div>
                          <div className="pt-1">
                             <h4 className="text-sm md:text-base font-black text-gray-900 leading-none mb-1 md:mb-2">تم استلام الطلب</h4>
                             <p className="text-[10px] md:text-xs text-muted-foreground font-medium">{formatOrderDate(selectedOrder.createdAt)}</p>
                          </div>
                       </div>
                       
                       <div className="flex items-start gap-4 md:gap-5 relative">
                          <div className={cn("z-10 h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-[1rem] md:rounded-2xl flex items-center justify-center transition-all shadow-sm", (selectedOrder.status !== 'pending') ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-gray-50 text-gray-300")}>
                             <Package className="h-5 w-5 md:h-6 md:w-6" />
                          </div>
                          <div className="pt-1">
                             <h4 className="text-sm md:text-base font-black text-gray-900 leading-none mb-1 md:mb-2">قيد التجهيز</h4>
                             <p className="text-[10px] md:text-xs text-muted-foreground font-medium">نحن نعمل على تغليف منتجاتك بعناية</p>
                          </div>
                       </div>
                       
                       <div className="flex items-start gap-4 md:gap-5 relative">
                          <div className={cn("z-10 h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-[1rem] md:rounded-2xl flex items-center justify-center transition-all shadow-sm", (selectedOrder.status === 'completed') ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-gray-50 text-gray-300")}>
                             <Truck className="h-5 w-5 md:h-6 md:w-6" />
                          </div>
                          <div className="pt-1">
                             <h4 className="text-sm md:text-base font-black text-gray-900 leading-none mb-1 md:mb-2">تم الشحن</h4>
                             <p className="text-[10px] md:text-xs text-muted-foreground font-medium">الطلب في طريقه إلى عنوانك الحالي</p>
                          </div>
                       </div>
                       
                       <div className="flex items-start gap-4 md:gap-5 relative">
                          <div className={cn("z-10 h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-[1rem] md:rounded-2xl flex items-center justify-center transition-all shadow-sm", (selectedOrder.status === 'completed') ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-gray-50 text-gray-300")}>
                             <CheckCircle2 className="h-5 w-5 md:h-6 md:w-6" />
                          </div>
                          <div className="pt-1">
                             <h4 className="text-sm md:text-base font-black text-gray-900 leading-none mb-1 md:mb-2">تم التوصيل</h4>
                             <p className="text-[10px] md:text-xs text-muted-foreground font-medium">نتمنى أن تنال منتجاتنا رضاكم...</p>
                          </div>
                       </div>
                    </div>
                    
                    {/* Order Details / Items */}
                    <div className="mt-6 md:mt-8 border-t pt-5 md:pt-6 bg-white shrink-0">
                      <h4 className="text-sm md:text-base font-black text-gray-900 mb-3 md:mb-4 px-1 md:px-2">تفاصيل المنتجات:</h4>
                      <div className="space-y-3 md:space-y-4">
                        {(() => {
                          try {
                            const items = JSON.parse(selectedOrder.items || '[]');
                            return items.map((item: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between p-3 md:p-4 bg-gray-50 rounded-xl md:rounded-2xl border border-gray-100">
                                <div>
                                  <p className="text-xs md:text-sm font-bold text-gray-900">{item.name}</p>
                                  <p className="text-[10px] md:text-xs text-muted-foreground mt-1">الكمية: {item.quantity}</p>
                                </div>
                                <p className="text-sm md:text-base font-black text-primary shrink-0 mr-2">{formatPrice(item.price)}</p>
                              </div>
                            ));
                          } catch(e) {
                            return <p className="text-gray-500 text-xs md:text-sm">خطأ في عرض تفاصيل المنتجات.</p>;
                          }
                        })()}
                      </div>
                    </div>
                    
                    <div className="bg-[#F8F9FB] rounded-[1.5rem] md:rounded-3xl p-5 md:p-6 mb-4 md:mb-0 shrink-0">
                       <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                          <MapPin className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                          <h4 className="text-sm md:text-base font-black text-gray-900">عنوان التوصيل</h4>
                       </div>
                       <p className="text-xs md:text-sm font-medium text-gray-600 leading-relaxed md:mr-8 break-words">{selectedOrder.address}</p>
                    </div>

                    <div className="shrink-0 mb-2">
                       <Button className="w-full h-12 md:h-14 rounded-2xl md:rounded-full font-black text-base md:text-lg shadow-lg shadow-primary/20" onClick={() => setIsTrackOpen(false)}>إغلاق التفاصيل</Button>
                    </div>
                 </div>
              </div>
            )}
         </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  );
}
