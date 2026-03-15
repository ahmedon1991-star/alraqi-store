import { useState } from "react";
import { useLocation } from "wouter";
import { Loader2, LockKeyhole } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiRequest, setAdminToken } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data = await apiRequest("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      setAdminToken(data.token);
      toast({
        title: "تم تسجيل الدخول",
        description: "مرحبًا بك في لوحة الإدارة.",
      });
      setLocation("/admin");
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تسجيل الدخول";
      toast({
        title: "فشل تسجيل الدخول",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
        <div className="absolute inset-0 -z-10 bg-primary/5" />
        <div className="absolute right-0 top-0 -z-10 h-96 w-96 translate-x-1/3 -translate-y-1/3 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 -z-10 h-96 w-96 -translate-x-1/3 translate-y-1/3 rounded-full bg-secondary/10 blur-3xl" />

        <Card className="w-full max-w-md border-white/70 bg-white/85 shadow-[0_20px_80px_rgba(69,44,16,0.08)] backdrop-blur">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <LockKeyhole className="h-6 w-6" />
            </div>
            <CardTitle className="text-3xl font-black text-primary">دخول الأدمن</CardTitle>
            <CardDescription>
              استخدم بيانات الإدارة للوصول إلى أدوات التحكم الكاملة.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11 text-right"
                placeholder="اسم المستخدم"
              />
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="h-11 text-right"
                placeholder="كلمة المرور"
              />
              <Button type="submit" className="h-11 w-full text-base font-bold" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    جارٍ التحقق...
                  </>
                ) : (
                  "دخول لوحة الإدارة"
                )}
              </Button>
            </form>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              بيانات الدخول الافتراضية: <span dir="ltr">admin / admin12345</span>
            </p>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
