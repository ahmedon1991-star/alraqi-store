import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();

  const params = new URLSearchParams(search);
  const token = params.get("token");
  const email = params.get("email");

  const resetMutation = useMutation({
    mutationFn: (newPassword: string) =>
      apiRequest("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, email, password: newPassword }),
      }),
    onSuccess: () => {
      setIsSuccess(true);
      toast({
        title: "تم تغيير كلمة المرور",
        description: "يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "فشل إعادة التعيين",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        title: "خطأ في التأكيد",
        description: "كلمتا المرور غير متطابقتين.",
        variant: "destructive",
      });
      return;
    }
    if (password.length < 6) {
      toast({
        title: "كلمة مرور ضعيفة",
        description: "يجب أن تكون كلمة المرور 6 أحرف على الأقل.",
        variant: "destructive",
      });
      return;
    }
    resetMutation.mutate(password);
  }

  if (isSuccess) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <main className="flex flex-1 items-center justify-center p-4">
          <Card className="w-full max-w-md text-center border-primary/20 shadow-xl">
            <CardHeader className="space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <CardTitle className="text-2xl font-black">عملية ناجحة!</CardTitle>
              <CardDescription>تم تحديث كلمة المرور الخاصة بك بنجاح.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setLocation("/login")} className="w-full font-bold h-12">
                انتقل لتسجيل الدخول
              </Button>
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
      <main className="relative flex flex-1 items-center justify-center overflow-hidden p-6">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(27,112,92,0.05),_transparent_40%)]" />
        
        <Card className="w-full max-w-md border-white/80 bg-white/90 shadow-2xl backdrop-blur-xl">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <KeyRound className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-3xl font-black text-primary">كلمة مرور جديدة</CardTitle>
              <CardDescription>أدخل كلمة المرور الجديدة لحسابك: {email}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {!token ? (
              <div className="p-4 bg-rose-50 text-rose-700 rounded-xl text-center font-bold">
                رابط إعادة التعيين غير صالح أو منتهي الصلاحية.
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-bold block text-right">كلمة المرور الجديدة</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 text-right"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold block text-right">تأكيد كلمة المرور</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-12 text-right"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="h-12 w-full text-lg font-black" 
                  disabled={resetMutation.isPending}
                >
                  {resetMutation.isPending ? (
                    <>
                      <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                      جارٍ التحديث...
                    </>
                  ) : "تعيين كلمة المرور"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
