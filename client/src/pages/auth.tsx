import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Mail, User as UserIcon, LogOut, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { apiRequest, setCustomerToken } from "@/lib/api";
import { useCurrentUser, useLogout } from "@/hooks/use-auth";
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



export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("login");
  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const logoutMutation = useLogout();

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
        title: "تم تسجيل الدخول",
        description: "تم الدخول إلى حسابك بنجاح.",
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
        title: "تم إنشاء الحساب",
        description: "أصبح حسابك جاهزًا ويمكنك متابعة الطلبات الآن.",
      });
      setLocation("/");
    },
  });



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
          <div className="mb-10 overflow-hidden rounded-[2rem] border border-white/60 bg-white/80 p-8 shadow-[0_20px_80px_rgba(69,44,16,0.08)] backdrop-blur">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-sm font-bold text-primary">
                  <UserIcon className="h-4 w-4" />
                  حساب العميل
                </div>
                <h1 className="mb-3 text-3xl font-black tracking-tight text-foreground md:text-4xl">
                  مرحباً بك، {user.name || user.username || "أيها العميل"}!
                </h1>
                <p className="text-lg leading-8 text-muted-foreground">{user.email}</p>
              </div>
              <Button variant="outline" className="h-12 rounded-full px-6 font-bold flex items-center gap-2" onClick={() => logoutMutation.mutate()}>
                <LogOut className="h-4 w-4" />
                تسجيل الخروج
              </Button>
            </div>
          </div>

          <Card className="border-white/60 bg-white/90 shadow-[0_12px_40px_rgba(69,44,16,0.06)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                تاريخ الطلبات المكتملة والحالية
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ordersQuery.isLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : ordersQuery.data && ordersQuery.data.length > 0 ? (
                <div className="space-y-4">
                  {ordersQuery.data.map((order: any) => (
                    <div key={order.id} className="rounded-2xl border border-border/60 bg-background/50 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-lg mb-1">{formatPrice(order.total)}</p>
                        <p className="text-sm text-muted-foreground">{formatOrderDate(order.createdAt)}</p>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                            order.status === 'completed' ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                            order.status === 'cancelled' ? "bg-rose-100 text-rose-800 border-rose-200" :
                            "bg-amber-100 text-amber-800 border-amber-200"
                          }`}
                        >
                          {order.status === 'completed' ? "مكتمل" : order.status === 'cancelled' ? "ملغي" : "قيد الانتظار"}
                        </span>
                        <p className="text-xs text-muted-foreground max-w-xs text-right truncate">التوصيل: {order.address}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>لا يوجد لديك أي طلبات سابقة.</p>
                </div>
              )}
            </CardContent>
          </Card>
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
      </main>

      <Footer />
    </div>
  );
}
