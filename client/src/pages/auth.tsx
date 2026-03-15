import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Mail,
  User as UserIcon,
  LogOut,
  Package,
  LayoutDashboard,
  UserCog,
  ShieldCheck,
  History,
  KeyRound,
  Trash2,
  RefreshCw,
  ChevronLeft,
  MapPin,
  Image as ImageIcon,
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



const loginSchema = z.object({
  email: z.string().email({ message: "البريد الإلكتروني غير صحيح" }),
  password: z.string().min(6, { message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }),
});

const registerSchema = z
  .object({
    name: z.string().min(2, { message: "الاسم يجب أن يحتوي على حرفين على الأقل" }),
    email: z.string().email({ message: "البريد الإلكتروني غير صحيح" }),
    phone: z.string().min(9, { message: "رقم الهاتف غير صحيح" }),
    password: z.string().min(6, { message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }),
    confirmPassword: z.string().min(6, { message: "أكد كلمة المرور" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "كلمتا المرور غير متطابقتين",
  });

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

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "البريد الإلكتروني غير صحيح" }),
});

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("login");
  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const logoutMutation = useLogout();
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  const ordersQuery = useQuery({
    queryKey: ["/api/orders/me"],
    queryFn: () => apiRequest("/api/orders/me"),
    enabled: !!user,
  });

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
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

  const forgotPasswordForm = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: (values: z.infer<typeof loginSchema>) =>
      apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: (data) => {
      setCustomerToken(data.token);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "أهلاً بك مجدداً!",
        description: "تم تسجيل الدخول بنجاح، جاري توجيهك للمتجر...",
      });
      setLocation("/");
    },
  });

  const registerMutation = useMutation({
    mutationFn: (values: z.infer<typeof registerSchema>) =>
      apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          phone: values.phone,
          password: values.password,
        }),
      }),
    onSuccess: (data) => {
      setCustomerToken(data.token);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "مرحباً بك في أسرة الراقي!",
        description: "تم إنشاء حسابك بنجاح، استمتع بالتسوق معنا.",
      });
      setLocation("/");
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

  const forgotPasswordMutation = useMutation({
    mutationFn: (values: z.infer<typeof forgotPasswordSchema>) =>
      apiRequest("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      setIsForgotPasswordOpen(false);
      forgotPasswordForm.reset();
      toast({
        title: "تم الإرسال",
        description: "تحقق من بريدك الإلكتروني (الرسائل المهملة أو الواردة) لاستعادة كلمة المرور.",
      });
    },
    onError: (error) => handleMutationError(error, "فشل الإرسال"),
  });

  useEffect(() => {
    if (user) {
      profileForm.reset({
        name: user.name || "",
        phone: user.phone || "",
        email: user.email || "",
        avatar: user.avatar || "",
      });
      if (activeTab === "login" || activeTab === "register") {
        setActiveTab("orders");
      }
    } else {
      if (activeTab !== "login" && activeTab !== "register") {
        setActiveTab("login");
      }
    }
  }, [user, profileForm, activeTab]);


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

  if (user) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <main className="container mx-auto flex-1 px-4 py-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            {/* Sidebar / Navigation */}
            <div className="lg:col-span-1">
              <Card className="overflow-hidden border-white/60 bg-white/90 shadow-sm">
                <div className="bg-primary/5 p-6 text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-3xl font-bold text-primary">
                    {user.avatar ? <img src={user.avatar} alt={user.name || ""} className="h-full w-full rounded-full object-cover" /> : (user.name || user.email || "U").charAt(0).toUpperCase()}
                  </div>
                  <h2 className="text-lg font-black">{user.name || "مستخدم"}</h2>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <div className="p-2">
                  <Tabs
                    defaultValue="orders"
                    orientation="vertical"
                    className="w-full"
                    onValueChange={(val) => setActiveTab(val)}
                    value={activeTab}
                  >
                    <TabsList className="flex h-auto w-full flex-col gap-1 bg-transparent p-0">
                      <TabsTrigger
                        value="orders"
                        className="flex w-full justify-start gap-3 rounded-lg px-4 py-3 text-right text-base font-medium data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                      >
                        <Package className="h-5 w-5" />
                        طلباتي
                      </TabsTrigger>
                      <TabsTrigger
                        value="profile"
                        className="flex w-full justify-start gap-3 rounded-lg px-4 py-3 text-right text-base font-medium data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                      >
                        <UserCog className="h-5 w-5" />
                        الملف الشخصي
                      </TabsTrigger>
                      <TabsTrigger
                        value="security"
                        className="flex w-full justify-start gap-3 rounded-lg px-4 py-3 text-right text-base font-medium data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                      >
                        <ShieldCheck className="h-5 w-5" />
                        الأمان والحساب
                      </TabsTrigger>
                      <Button
                        variant="ghost"
                        className="flex w-full justify-start gap-3 rounded-lg px-4 py-3 text-right text-base font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => logoutMutation.mutate()}
                      >
                        <LogOut className="h-5 w-5" />
                        تسجيل الخروج
                      </Button>
                    </TabsList>
                  </Tabs>
                </div>
              </Card>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-3">
              {activeTab === "orders" && (
                <Card className="border-white/60 bg-white/90 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                      <LayoutDashboard className="h-6 w-6 text-primary" />
                      سجل الطلبات
                    </CardTitle>
                    <CardDescription>تتبع حالة طلباتك الحالية واعرض سجل مشترياتك السابق.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {ordersQuery.isLoading ? (
                      <div className="flex justify-center p-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : ordersQuery.data && ordersQuery.data.length > 0 ? (
                      <div className="space-y-6">
                        {ordersQuery.data.map((order: any) => (
                          <div
                            key={order.id}
                            className="overflow-hidden rounded-2xl border border-border/60 bg-background/50 transition-all hover:border-primary/20 hover:shadow-md"
                          >
                            <div className="flex flex-col justify-between gap-4 border-b border-border/50 p-5 sm:flex-row sm:items-center bg-muted/20">
                              <div>
                                <div className="mb-1 flex items-center gap-2">
                                  <span className="font-bold">رقم الطلب #{order.id.slice(0, 8)}</span>
                                  <span className="text-xs text-muted-foreground">• {formatOrderDate(order.createdAt)}</span>
                                </div>
                                <p className="font-bold text-primary">{formatPrice(order.total)}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span
                                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${order.status === "completed"
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                    : order.status === "cancelled"
                                      ? "bg-rose-100 text-rose-800 border-rose-200"
                                      : "bg-amber-100 text-amber-800 border-amber-200"
                                    }`}
                                >
                                  {order.status === "completed"
                                    ? "مكتمل"
                                    : order.status === "cancelled"
                                      ? "ملغي"
                                      : "قيد الانتظار"}
                                </span>
                                <Button variant="outline" size="sm" className="h-9 gap-2 rounded-full text-xs font-bold" onClick={() => toast({ title: "قريباً", description: "سيتم تفعيل إعادة الطلب قريباً" })}>
                                  <RefreshCw className="h-3.5 w-3.5" />
                                  إعادة الطلب
                                </Button>
                              </div>
                            </div>
                            <div className="p-5">
                              <div className="mb-4">
                                <div className="mb-2 flex items-center justify-between text-sm">
                                  <span className="font-bold text-muted-foreground">حالة التوصيل</span>
                                  <span className="text-primary font-bold">{order.status === "completed" ? "تم التوصيل" : "جاري التجهيز"}</span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                  <div
                                    className={`h-full rounded-full transition-all duration-1000 ${order.status === "completed" ? "w-full bg-emerald-500" : order.status === "cancelled" ? "w-full bg-rose-500" : "w-1/3 bg-amber-500"
                                      }`}
                                  />
                                </div>
                              </div>
                              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4 shrink-0 text-primary/60" />
                                <span>{order.address || "العنوان غير محدد"}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                        <div className="mb-4 rounded-full bg-muted p-6">
                          <Package className="h-10 w-10 text-muted-foreground/50" />
                        </div>
                        <h3 className="mb-2 text-lg font-bold text-foreground">لا توجد طلبات بعد</h3>
                        <p>ابدأ التسوق الآن واستمتع بمنتجاتنا المميزة.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {activeTab === "profile" && (
                <Card className="border-white/60 bg-white/90 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-2xl">الملف الشخصي</CardTitle>
                    <CardDescription>قم بتحديث بياناتك الشخصية ومعلومات التواصل.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...profileForm}>
                      <form onSubmit={profileForm.handleSubmit((values) => updateProfileMutation.mutate(values))} className="space-y-6">
                        <FormField
                          control={profileForm.control}
                          name="avatar"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>صورة الملف الشخصي (رابط)</FormLabel>
                              <div className="flex gap-4">
                                <FormControl>
                                  <Input {...field} placeholder="https://..." className="text-right flex-1" dir="ltr" />
                                </FormControl>
                                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border bg-muted flex items-center justify-center">
                                  {field.value ? <img src={field.value} alt="Avatar" className="h-full w-full object-cover" /> : <ImageIcon className="h-5 w-5 text-muted-foreground" />}
                                </div>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid gap-6 md:grid-cols-2">
                          <FormField
                            control={profileForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>الاسم الكامل</FormLabel>
                                <FormControl>
                                  <Input {...field} className="text-right" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={profileForm.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>رقم الهاتف</FormLabel>
                                <FormControl>
                                  <Input {...field} className="text-right" dir="ltr" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={profileForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel>البريد الإلكتروني</FormLabel>
                                <FormControl>
                                  <Input {...field} className="text-right" dir="ltr" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="flex justify-end">
                          <Button type="submit" disabled={updateProfileMutation.isPending} className="min-w-32 font-bold">
                            {updateProfileMutation.isPending ? "جارٍ الحفظ..." : "حفظ التغييرات"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              )}

              {activeTab === "security" && (
                <div className="space-y-6">
                  <Card className="border-white/60 bg-white/90 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-2xl">
                        <KeyRound className="h-6 w-6 text-primary" />
                        تغيير كلمة المرور
                      </CardTitle>
                      <CardDescription>حافظ على أمان حسابك باستخدام كلمة مرور قوية.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Form {...passwordForm}>
                        <form onSubmit={passwordForm.handleSubmit((values) => changePasswordMutation.mutate(values))} className="space-y-4">
                          <FormField
                            control={passwordForm.control}
                            name="currentPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>كلمة المرور الحالية</FormLabel>
                                <FormControl>
                                  <Input type="password" {...field} className="text-right" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="grid gap-4 md:grid-cols-2">
                            <FormField
                              control={passwordForm.control}
                              name="newPassword"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>كلمة المرور الجديدة</FormLabel>
                                  <FormControl>
                                    <Input type="password" {...field} className="text-right" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={passwordForm.control}
                              name="confirmNewPassword"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>تأكيد كلمة المرور</FormLabel>
                                  <FormControl>
                                    <Input type="password" {...field} className="text-right" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="flex justify-end pt-2">
                            <Button type="submit" disabled={changePasswordMutation.isPending} className="font-bold">
                              {changePasswordMutation.isPending ? "جارٍ التحديث..." : "تحديث كلمة المرور"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>

                  <Card className="border-red-100 bg-red-50/50 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-700">
                        <Trash2 className="h-5 w-5" />
                        منطقة الخطر
                      </CardTitle>
                      <CardDescription className="text-red-600/80">حذف الحساب نهائيًا لا يمكن التراجع عنه.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-red-800">هل تريد حذف حسابك وجميع بياناتك؟</p>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="destructive" className="font-bold">
                              حذف الحساب
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader className="text-right">
                              <DialogTitle>هل أنت متأكد تماماً؟</DialogTitle>
                              <DialogDescription>
                                هذا الإجراء لا يمكن التراجع عنه. سيتم حذف حسابك وسجل طلباتك نهائياً من خوادمنا.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="gap-2 sm:justify-start">
                              <Button variant="destructive" onClick={() => deleteAccountMutation.mutate()} disabled={deleteAccountMutation.isPending}>
                                {deleteAccountMutation.isPending ? "جارٍ الحذف..." : "نعم، احذف حسابي"}
                              </Button>
                              <DialogClose asChild>
                                <Button variant="outline">إلغاء</Button>
                              </DialogClose>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(27,112,92,0.12),_transparent_30%),linear-gradient(180deg,_rgba(255,250,244,1),_rgba(247,244,238,1))]" />
        <div className="absolute left-0 top-0 -z-10 h-96 w-96 -translate-x-1/3 -translate-y-1/3 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 -z-10 h-96 w-96 translate-x-1/3 translate-y-1/3 rounded-full bg-secondary/10 blur-3xl" />

        <Card className="w-full max-w-xl border-white/70 bg-white/85 shadow-[0_24px_80px_rgba(69,44,16,0.12)] backdrop-blur">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1 text-sm font-bold text-primary">
              <Mail className="h-4 w-4" />
              حساب العملاء
            </div>
            <CardTitle className="text-3xl font-black text-primary">تسجيل دخول وإنشاء حساب حقيقي</CardTitle>
            <CardDescription className="text-base leading-7">
              ادخل ببريدك الإلكتروني، أنشئ حسابًا جديدًا، أو استخدم Google للوصول السريع.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-6 grid w-full grid-cols-2">
                <TabsTrigger value="login">تسجيل الدخول</TabsTrigger>
                <TabsTrigger value="register">حساب جديد</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Form {...loginForm}>
                  <form
                    onSubmit={loginForm.handleSubmit((values) => loginMutation.mutate(values, { onError: (error) => handleMutationError(error, "تعذر تسجيل الدخول") }))}
                    className="space-y-4"
                  >
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>البريد الإلكتروني</FormLabel>
                          <FormControl>
                            <Input placeholder="name@example.com" {...field} className="h-11 bg-white text-right" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>كلمة المرور</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} className="h-11 bg-white text-right" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end -mt-2">
                      <Button
                        variant="link"
                        className="h-auto px-0 text-xs font-normal text-muted-foreground hover:text-primary"
                        type="button"
                        onClick={() => setIsForgotPasswordOpen(true)}
                      >
                        هل نسيت كلمة المرور؟
                      </Button>
                    </div>

                    <Button type="submit" className="h-11 w-full text-base font-bold" disabled={loginMutation.isPending}>
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                          جارٍ التحقق...
                        </>
                      ) : (
                        "دخول الحساب"
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="register">
                <Form {...registerForm}>
                  <form
                    onSubmit={registerForm.handleSubmit((values) => registerMutation.mutate(values, { onError: (error) => handleMutationError(error, "تعذر إنشاء الحساب") }))}
                    className="space-y-4"
                  >
                    <FormField
                      control={registerForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الاسم الكامل</FormLabel>
                          <FormControl>
                            <Input placeholder="اسمك الكامل" {...field} className="h-11 bg-white text-right" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>البريد الإلكتروني</FormLabel>
                          <FormControl>
                            <Input placeholder="name@example.com" {...field} className="h-11 bg-white text-right" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>رقم الهاتف المعتمد</FormLabel>
                          <FormControl>
                            <Input placeholder="0912345678" type="tel" {...field} className="h-11 bg-white text-right" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>كلمة المرور</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} className="h-11 bg-white text-right" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>تأكيد كلمة المرور</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} className="h-11 bg-white text-right" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="h-11 w-full text-base font-bold" disabled={registerMutation.isPending}>
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          جارٍ إنشاء الحساب...
                        </>
                      ) : (
                        "إنشاء الحساب"
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Dialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
          <DialogContent>
            <DialogHeader className="text-right">
              <DialogTitle>استعادة كلمة المرور</DialogTitle>
              <DialogDescription>
                أدخل البريد الإلكتروني المرتبط بحسابك وسنرسل لك تعليمات إعادة التعيين.
              </DialogDescription>
            </DialogHeader>
            <Form {...forgotPasswordForm}>
              <form
                onSubmit={forgotPasswordForm.handleSubmit((values) => forgotPasswordMutation.mutate(values))}
                className="space-y-4"
              >
                <FormField
                  control={forgotPasswordForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>البريد الإلكتروني</FormLabel>
                      <FormControl>
                        <Input placeholder="name@example.com" {...field} className="text-right" dir="ltr" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="gap-2 sm:justify-start">
                  <Button type="submit" disabled={forgotPasswordMutation.isPending} className="font-bold">
                    {forgotPasswordMutation.isPending ? "جارٍ الإرسال..." : "إرسال رابط التعيين"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsForgotPasswordOpen(false)}>
                    إلغاء
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </main>

      <Footer />
    </div>
  );
}
