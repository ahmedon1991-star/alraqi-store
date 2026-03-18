import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  Loader2,
  Mail,
  Lock,
  Fingerprint,
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
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { apiRequest, setCustomerToken, setAdminToken } from "../lib/api";
import { useCurrentUser } from "../hooks/use-auth";
import { queryClient } from "@/lib/queryClient";

const loginSchema = z.object({
  email: z.string().email({ message: "البريد الإلكتروني غير صحيح" }),
  password: z.string().min(6, { message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }),
  remember: z.boolean().default(true),
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

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "البريد الإلكتروني غير صحيح" }),
});

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("login");
  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: true },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", phone: "", password: "", confirmPassword: "" },
  });

  const forgotPasswordForm = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  useEffect(() => {
    if (user && !isUserLoading) {
      setLocation("/profile");
    }
  }, [user, isUserLoading, setLocation]);

  function handleMutationError(error: unknown, fallback: string) {
    const message = error instanceof Error ? error.message : fallback;
    toast({ title: "خطأ", description: message, variant: "destructive" });
  }

  const loginMutation = useMutation({
    mutationFn: (values: z.infer<typeof loginSchema>) =>
      apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: values.email,
          password: values.password,
        }),
      }),
    onSuccess: (data, variables) => {
      if (data.isAdmin) {
        setAdminToken(data.token);
        toast({ title: "مرحباً أيها المدير!", description: "تم تسجيل دخولك كمسؤول بنجاح." });
        window.location.href = "/admin";
      } else {
        setCustomerToken(data.token, variables.remember);
        queryClient.setQueryData(["/api/auth/me"], data.user);
        toast({ title: "أهلاً بك مجدداً!", description: "تم تسجيل الدخول بنجاح." });
        window.location.href = "/profile";
      }
    },
    onError: (error) => handleMutationError(error, "تعذر تسجيل الدخول"),
  });

  const handleBiometricLogin = async () => {
    try {
      const savedEmail = localStorage.getItem("alraqi_biometric_email");
      const deviceToken = localStorage.getItem("alraqi_biometric_token");

      if (!savedEmail || !deviceToken) {
        toast({
          title: "البصمة غير منشطة",
          description: "يرجى تسجيل الدخول أولاً وتفعيل الدخول بالبصمة من الملف الشخصي.",
          variant: "destructive",
        });
        return;
      }

      if (window.PublicKeyCredential) {
        try {
          await navigator.credentials.get({
            publicKey: {
              challenge: new Uint8Array([1,2,3,4]).buffer,
              timeout: 60000,
              userVerification: "required",
              allowCredentials: []
            }
          });
        } catch (e) {
          console.error("Biometric prompt error:", e);
          if ((e as Error).name === "NotAllowedError") return;
        }
      }

      const data = await apiRequest("/api/auth/biometric/login", {
        method: "POST",
        body: JSON.stringify({ email: savedEmail, deviceToken }),
      });

      if (data.isAdmin) {
        setAdminToken(data.token);
        toast({ title: "مرحباً أيها المدير!", description: "تم الدخول بالبصمة بنجاح." });
        window.location.href = "/admin";
      } else {
        setCustomerToken(data.token, true);
        queryClient.setQueryData(["/api/auth/me"], data.user);
        toast({ title: "أهلاً بك!", description: "تم الدخول بالبصمة بنجاح." });
        window.location.href = "/profile";
      }
    } catch (error: any) {
      toast({
        title: "فشل الدخول",
        description: error.message || "تعذر التحقق من البصمة",
        variant: "destructive",
      });
    }
  };

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
      setCustomerToken(data.token, true); // Register always remembers
      queryClient.setQueryData(["/api/auth/me"], data.user);
      toast({ title: "مرحباً بك!", description: "تم إنشاء حسابك بنجاح." });
      window.location.href = "/profile";
    },
    onError: (error) => handleMutationError(error, "تعذر إنشاء الحساب"),
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
      toast({ title: "تم الإرسال", description: "تحقق من بريدك الإلكتروني لاستعادة كلمة المرور." });
    },
    onError: (error) => handleMutationError(error, "فشل الإرسال"),
  });

  useEffect(() => {
    if (user && !isUserLoading) {
      setLocation("/profile");
    }
  }, [user, isUserLoading, setLocation]);



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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(27,112,92,0.12),_transparent_30%),linear-gradient(180deg,_rgba(255,250,244,1),_rgba(247,244,238,1))]" />
        
        <Card className="w-full max-w-xl border-white/70 bg-white/85 shadow-[0_24px_80px_rgba(69,44,16,0.12)] backdrop-blur">
          <CardHeader className="space-y-3 text-center">
            <div className="flex justify-center">
              <img src="/logo.png" alt="الراقي" className="h-24 w-auto object-contain" />
            </div>
            <CardTitle className="text-2xl font-black text-primary">تسجيل الدخول / إنشاء حساب</CardTitle>
            <CardDescription className="text-base font-medium">ابدأ تجربة تسوق فريدة للمنتجات السودانية الأصيلة</CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-8 grid w-full grid-cols-2 h-12 bg-gray-100 p-1 rounded-xl">
                <TabsTrigger value="login" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">تسجيل الدخول</TabsTrigger>
                <TabsTrigger value="register" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">حساب جديد</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit((values) => loginMutation.mutate(values))} className="space-y-5">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold text-gray-700">البريد الإلكتروني</FormLabel>
                          <FormControl><Input placeholder="name@example.com" {...field} className="h-12 bg-white text-right rounded-xl border-gray-200" dir="ltr" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold text-gray-700">كلمة المرور</FormLabel>
                          <FormControl><Input type="password" placeholder="••••••••" {...field} className="h-12 bg-white text-right rounded-xl border-gray-200" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="remember"
                      render={({ field }) => (
                        <div className="flex items-center justify-between -mt-2">
                          <div className="flex items-center gap-2">
                            <Checkbox 
                              id="remember" 
                              checked={field.value} 
                              onCheckedChange={field.onChange} 
                            />
                            <Label htmlFor="remember" className="text-sm font-bold text-gray-600 cursor-pointer">تذكرني</Label>
                          </div>
                          <Button variant="link" className="h-auto px-0 text-gray-500 hover:text-primary font-bold" type="button" onClick={() => setIsForgotPasswordOpen(true)}>نسيت كلمة المرور؟</Button>
                        </div>
                      )}
                    />

                    <Button type="submit" className="h-12 w-full text-base font-black rounded-xl shadow-lg shadow-primary/20" disabled={loginMutation.isPending}>
                      {loginMutation.isPending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : "دخول"}
                    </Button>

                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-200" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-3 font-bold text-gray-500">أو الدخول عبر</span>
                      </div>
                    </div>

                    <Button 
                      type="button" 
                      variant="outline" 
                      className="h-12 w-full text-base font-bold rounded-xl border-2 border-gray-100 hover:bg-gray-50 gap-2"
                      onClick={() => handleBiometricLogin()}
                    >
                      <Fingerprint className="h-5 w-5 text-primary" />
                      الدخول بالسمات الحيوية (البصمة/الوجه)
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit((values) => registerMutation.mutate(values))} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold text-gray-700">الاسم الكامل</FormLabel>
                          <FormControl><Input placeholder="اسمك الكامل" {...field} className="h-11 bg-white text-right rounded-xl" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold text-gray-700">البريد الإلكتروني</FormLabel>
                          <FormControl><Input placeholder="name@example.com" {...field} className="h-11 bg-white text-right rounded-xl" dir="ltr" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold text-gray-700">رقم الهاتف</FormLabel>
                          <FormControl><Input placeholder="0912345678" type="tel" {...field} className="h-11 bg-white text-right rounded-xl" dir="ltr" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold text-gray-700">كلمة المرور</FormLabel>
                            <FormControl><Input type="password" {...field} className="h-11 bg-white text-right rounded-xl" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold text-gray-700">تأكيد المرور</FormLabel>
                            <FormControl><Input type="password" {...field} className="h-11 bg-white text-right rounded-xl" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button type="submit" className="h-12 w-full text-base font-black rounded-xl mt-4" disabled={registerMutation.isPending}>
                      {registerMutation.isPending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : "إنشاء حساب جديد"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      <Dialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="text-right">
            <DialogTitle className="text-xl font-black">استعادة كلمة المرور</DialogTitle>
          </DialogHeader>
          <Form {...forgotPasswordForm}>
            <form onSubmit={forgotPasswordForm.handleSubmit((values) => forgotPasswordMutation.mutate(values))} className="space-y-4 pt-4">
              <FormField
                control={forgotPasswordForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">بريدك الإلكتروني</FormLabel>
                    <FormControl><Input {...field} className="text-right h-11" dir="ltr" placeholder="example@gmail.com" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-3 justify-end pt-2">
                <Button type="submit" disabled={forgotPasswordMutation.isPending} className="font-bold px-8 rounded-full">{forgotPasswordMutation.isPending ? "جارٍ الإرسال..." : "إرسال الرابط"}</Button>
                <DialogClose asChild><Button variant="outline" className="font-bold rounded-full">إلغاء</Button></DialogClose>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
