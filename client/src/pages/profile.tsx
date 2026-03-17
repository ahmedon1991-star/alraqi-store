import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Loader2,
  User as UserIcon,
  LogOut,
  Package,
  LayoutDashboard,
  UserCog,
  ShieldCheck,
  MapPin,
  Image as ImageIcon,
  KeyRound,
  Trash2,
  ChevronLeft,
  CreditCard,
  Heart,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { apiRequest, setCustomerToken } from "../lib/api";
import { useCurrentUser, useLogout } from "../hooks/use-auth";
import { formatPrice } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";

function formatOrderDate(value: string | null) {
  if (!value) return "غير متوفر";
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

const profileSchema = z.object({
  name: z.string().min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" }),
  phone: z.string().min(9, { message: "رقم الهاتف غير صحيح" }),
  email: z.string().email({ message: "البريد الإلكتروني غير صحيح" }),
  avatar: z.string().optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: "كلمة المرور الحالية مطلوبة" }),
    newPassword: z.string().min(6, { message: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل" }),
    confirmNewPassword: z.string().min(6, { message: "أكد كلمة المرور الجديدة" }),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    path: ["confirmNewPassword"],
    message: "كلمتا المرور غير متطابقتين",
  });

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("orders");
  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const logoutMutation = useLogout();

  const ordersQuery = useQuery({
    queryKey: ["/api/orders/me"],
    queryFn: () => apiRequest("/api/orders/me"),
    enabled: !!user,
  });

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      avatar: "",
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (values: z.infer<typeof profileSchema>) =>
      apiRequest("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "تم تحديث الملف الشخصي",
        description: "تم حفظ بياناتك الجديدة بنجاح.",
      });
    },
    onError: (error) => handleMutationError(error, "تعذر تحديث البيانات"),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (values: z.infer<typeof passwordSchema>) =>
      apiRequest("/api/auth/password", {
        method: "PATCH",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      passwordForm.reset();
      toast({
        title: "تم تغيير كلمة المرور",
        description: "يمكنك الآن استخدام كلمة المرور الجديدة.",
      });
    },
    onError: (error) => handleMutationError(error, "تعذر تغيير كلمة المرور"),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => apiRequest("/api/auth/me", { method: "DELETE" }),
    onSuccess: () => {
      setCustomerToken(null);
      queryClient.clear();
      setLocation("/");
      toast({
        title: "تم حذف الحساب",
        description: "تم حذف حسابك وجميع بياناتك نهائيًا.",
      });
    },
  });

  useEffect(() => {
    if (user) {
      profileForm.reset({
        name: user.name || "",
        phone: user.phone || "",
        email: user.email || "",
        avatar: user.avatar || "",
      });
    } else if (!isUserLoading) {
      setLocation("/login");
    }
  }, [user, profileForm, isUserLoading, setLocation]);

  function handleMutationError(error: unknown, fallback: string) {
    const message = error instanceof Error ? error.message : fallback;
    toast({
      title: "تعذر إكمال العملية",
      description: message,
      variant: "destructive",
    });
  }

  if (isUserLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F8FA]">
      <Navbar />
      
      {/* Global Style Header */}
      <div className="bg-white border-b relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/20 via-primary to-primary/20" />
        <div className="container mx-auto px-4 py-10 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative group">
              <div className="h-28 w-28 rounded-3xl border-4 border-white shadow-2xl overflow-hidden bg-primary/5 flex items-center justify-center text-4xl font-black text-primary transform rotate-3 group-hover:rotate-0 transition-transform duration-500">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name || ""} className="h-full w-full object-cover" />
                ) : (
                  (user.name || user.email || "U").charAt(0).toUpperCase()
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 p-2 bg-white rounded-2xl shadow-xl border border-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                <ImageIcon className="h-4 w-4 text-primary" />
              </div>
            </div>
            <div className="text-center md:text-right flex-1 space-y-1">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">{user.name || "مرحباً بك"}</h1>
              <p className="text-gray-500 font-bold text-sm opacity-80">{user.email}</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-5">
                <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-2xl text-xs font-black text-primary border border-primary/10">
                  <Package className="h-4 w-4" />
                  {ordersQuery.data?.length || 0} طلبات
                </div>
                <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-2xl text-xs font-black text-emerald-600 border border-emerald-100">
                  <ShieldCheck className="h-4 w-4" />
                  عضو موثق
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                className="rounded-2xl gap-3 font-black h-12 px-6 border-2 hover:bg-gray-50 transition-all" 
                onClick={() => setLocation("/")}
              >
                العودة للتسوق
                <ChevronLeft className="h-5 w-5 rotate-180" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto flex-1 px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Menu */}
          <aside className="lg:col-span-3 space-y-6">
            <Card className="border-none shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden rounded-[2rem] bg-white p-3">
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab("orders")}
                  className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-right font-black transition-all group ${
                    activeTab === "orders" 
                    ? "bg-primary text-white shadow-xl shadow-primary/30" 
                    : "hover:bg-gray-50 text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <LayoutDashboard className={`h-5 w-5 transition-transform group-hover:scale-110 ${activeTab === "orders" ? "text-white" : "text-primary/60"}`} />
                  طلبــــــــاتي
                </button>
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-right font-black transition-all group ${
                    activeTab === "profile" 
                    ? "bg-primary text-white shadow-xl shadow-primary/30" 
                    : "hover:bg-gray-50 text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <UserCog className={`h-5 w-5 transition-transform group-hover:scale-110 ${activeTab === "profile" ? "text-white" : "text-primary/60"}`} />
                  الحســـــــــاب
                </button>
                <button
                  onClick={() => setActiveTab("security")}
                  className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-right font-black transition-all group ${
                    activeTab === "security" 
                    ? "bg-primary text-white shadow-xl shadow-primary/30" 
                    : "hover:bg-gray-50 text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <ShieldCheck className={`h-5 w-5 transition-transform group-hover:scale-110 ${activeTab === "security" ? "text-white" : "text-primary/60"}`} />
                  الأمان والخصـوصية
                </button>
                
                <div className="h-px bg-gray-50 my-4 mx-4" />
                
                <button
                  onClick={() => setLocation("/shop?wishlist=true")}
                  className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-right font-black text-gray-500 hover:bg-gray-50 hover:text-rose-500 transition-all group"
                >
                  <Heart className="h-5 w-5 text-gray-300 group-hover:text-rose-400 group-hover:fill-rose-400/20 transition-colors" />
                  المفضـــــــــلة
                </button>
                <button
                  onClick={() => logoutMutation.mutate()}
                  className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-right font-black text-rose-600 hover:bg-rose-50 transition-all group"
                >
                  <LogOut className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  تسجيل الخروج
                </button>
              </nav>
            </Card>

            <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl border border-primary/10 text-center">
              <Settings className="h-8 w-8 text-primary mx-auto mb-3 opacity-50" />
              <h4 className="font-black text-primary text-sm mb-1">هل تحتاج للمساعدة؟</h4>
              <p className="text-xs text-gray-500 mb-4">نحن جاهزون للإجابة على جميع استفساراتك </p>
              <Button size="sm" className="w-full rounded-full font-black text-xs h-9" variant="outline">تواصل مع الدعم</Button>
            </div>
          </aside>

          {/* Main Dashboard Area */}
          <div className="lg:col-span-9">
            {activeTab === "orders" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black text-gray-900">سجل الطلبات</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-full text-xs font-bold">كل الطلبات</Button>
                    <Button variant="ghost" size="sm" className="rounded-full text-xs font-bold text-gray-500">قيد التنفيذ</Button>
                  </div>
                </div>

                {ordersQuery.isLoading ? (
                  <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : ordersQuery.data?.length ? (
                  <div className="grid gap-4">
                    {ordersQuery.data.map((order: any) => (
                      <Card key={order.id} className="border-none shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                        <div className="flex flex-col md:flex-row">
                          <div className="p-6 flex-1">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <div className="text-xs font-bold text-gray-400 mb-1">رقم الطلب #{order.id.slice(0, 8).toUpperCase()}</div>
                                <h3 className="font-black text-lg text-gray-900">{formatPrice(order.total)}</h3>
                              </div>
                              <span className={`px-4 py-1.5 rounded-full text-xs font-black border ${
                                order.status === "completed" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                order.status === "cancelled" ? "bg-rose-50 text-rose-600 border-rose-100" :
                                "bg-amber-50 text-amber-600 border-amber-100"
                              }`}>
                                {order.status === "completed" ? "تم التوصيل" : order.status === "cancelled" ? "ملغي" : "قيد التنفيذ"}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-6 text-sm text-gray-500">
                              <div className="flex items-center gap-1.5"><Package className="h-4 w-4" /> {formatOrderDate(order.createdAt)}</div>
                              <div className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {order.address || "استلام من الفرع"}</div>
                            </div>
                          </div>
                          <div className="bg-gray-50 p-6 flex flex-col justify-center gap-2 border-t md:border-t-0 md:border-r min-w-[160px]">
                            <Button size="sm" className="w-full rounded-full font-bold h-9 bg-primary/10 text-primary hover:bg-primary/20 border-none shadow-none">تتبع الطلب</Button>
                            <Button size="sm" variant="ghost" className="w-full rounded-full font-bold h-9 text-gray-400">التفاصيل</Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl p-16 text-center shadow-sm">
                    <div className="bg-gray-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Package className="h-10 w-10 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-black text-gray-900 mb-2">لا يوجد لديك طلبات حالياً</h3>
                    <p className="text-gray-500 mb-8 max-w-sm mx-auto">ابدأ رحلة التسوق واستكشف أجمل المنتجات السودانية الأصيلة المتاحة في متجرنا</p>
                    <Button onClick={() => setLocation("/shop")} className="rounded-full px-8 font-black">اكتشف المنتجات</Button>
                  </div>
                )}
              </div>
            )}

            {activeTab === "profile" && (
              <div className="space-y-6">
                <h2 className="text-xl font-black text-gray-900">الملف الشخصي</h2>
                <Card className="border-none shadow-sm p-6 rounded-3xl">
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit((values) => updateProfileMutation.mutate(values))} className="space-y-6">
                      <div className="grid gap-6 md:grid-cols-2">
                        <FormField
                          control={profileForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-bold text-gray-700">الاسم الكامل</FormLabel>
                              <FormControl><Input {...field} className="rounded-xl h-12 bg-gray-50 border-none focus-visible:ring-primary/20 placeholder:text-gray-400 text-right" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={profileForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-bold text-gray-700">رقم الهاتف</FormLabel>
                              <FormControl><Input {...field} className="rounded-xl h-12 bg-gray-50 border-none focus-visible:ring-primary/20 placeholder:text-gray-400 text-right font-mono" dir="ltr" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={profileForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel className="font-bold text-gray-700">البريد الإلكتروني</FormLabel>
                              <FormControl><Input {...field} className="rounded-xl h-12 bg-gray-50 border-none focus-visible:ring-primary/20 placeholder:text-gray-400 text-right font-mono" dir="ltr" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={updateProfileMutation.isPending} className="rounded-full px-12 h-12 font-black shadow-lg shadow-primary/20">
                          {updateProfileMutation.isPending ? "جارٍ الحفظ..." : "حفظ التعديلات"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </Card>
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-6">
                <h2 className="text-xl font-black text-gray-900">الأمان وكلمة المرور</h2>
                
                <Card className="border-none shadow-sm p-6 rounded-3xl mb-6">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="bg-amber-100 p-3 rounded-2xl text-amber-600"><KeyRound className="h-6 w-6" /></div>
                    <div>
                      <h3 className="font-black text-gray-900">تغيير كلمة المرور</h3>
                      <p className="text-xs text-gray-500">يُنصح بتغيير كلمة المرور دورياً لحماية حسابك</p>
                    </div>
                  </div>
                  
                  <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit((values) => changePasswordMutation.mutate(values))} className="space-y-5">
                      <FormField
                        control={passwordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold text-gray-700">كلمة المرور الحالية</FormLabel>
                            <FormControl><Input type="password" {...field} className="rounded-xl h-12 bg-gray-50 border-none focus-visible:ring-primary/20 text-right" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid gap-5 md:grid-cols-2">
                        <FormField
                          control={passwordForm.control}
                          name="newPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-bold text-gray-700">كلمة المرور الجديدة</FormLabel>
                              <FormControl><Input type="password" {...field} className="rounded-xl h-12 bg-gray-50 border-none focus-visible:ring-primary/20 text-right" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={passwordForm.control}
                          name="confirmNewPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-bold text-gray-700">تأكيد كلمة المرور</FormLabel>
                              <FormControl><Input type="password" {...field} className="rounded-xl h-12 bg-gray-50 border-none focus-visible:ring-primary/20 text-right" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={changePasswordMutation.isPending} className="rounded-full px-12 h-12 font-black shadow-lg shadow-primary/10">
                          {changePasswordMutation.isPending ? "جارٍ التحديث..." : "تحديث كلمة المرور"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </Card>

                <Card className="border-rose-100 bg-rose-50/30 p-8 rounded-3xl border-2 border-dashed">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="text-center md:text-right">
                      <h3 className="font-black text-rose-700 mb-1">حذف الحساب نهائياً</h3>
                      <p className="text-xs text-rose-500 max-w-sm">سيتم مسح جميع بياناتك وطلباتك ولا يمكن استعادتها مرة أخرى</p>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="destructive" className="rounded-full px-8 font-black">حذف الحساب</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader className="text-right">
                          <DialogTitle className="text-xl font-black">هل أنت متأكد تماماً؟</DialogTitle>
                          <DialogDescription className="font-medium pt-2">سيتم حذف سجل طلباتك ومعلوماتك ولا يمكن التراجع عن هذا القرار.</DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2 sm:justify-start pt-4">
                          <Button variant="destructive" className="rounded-full font-bold px-6" onClick={() => deleteAccountMutation.mutate()} disabled={deleteAccountMutation.isPending}>{deleteAccountMutation.isPending ? "جارٍ الحذف..." : "نعم، احذف حسابي"}</Button>
                          <DialogClose asChild><Button variant="outline" className="rounded-full font-bold px-6">إلغاء</Button></DialogClose>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
