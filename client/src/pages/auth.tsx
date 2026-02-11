import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  email: z.string().email({ message: "البريد الإلكتروني غير صحيح" }),
  password: z.string().min(6, { message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }),
});

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "تم تسجيل الدخول بنجاح",
        description: "أهلاً بك مرة أخرى في الراقي",
      });
      setLocation("/");
    }, 1500);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 bg-primary/5 -z-10" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 -z-10" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 -z-10" />

        <Card className="w-full max-w-md border-border/50 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-2 pb-6">
            <CardTitle className="text-3xl font-black text-primary">أهلاً بك في الراقي</CardTitle>
            <CardDescription className="text-base">
              سجل دخولك أو أنشئ حساباً جديداً لمتابعة طلباتك
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">تسجيل الدخول</TabsTrigger>
                <TabsTrigger value="register">حساب جديد</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>البريد الإلكتروني</FormLabel>
                          <FormControl>
                            <Input placeholder="name@example.com" {...field} className="h-11 bg-white" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>كلمة المرور</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} className="h-11 bg-white" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" className="w-full h-11 text-base font-bold mt-4" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          جاري التسجيل...
                        </>
                      ) : (
                        "تسجيل الدخول"
                      )}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="register">
                <div className="text-center py-8 text-muted-foreground">
                  <p>نموذج إنشاء الحساب سيكون متاحاً قريباً.</p>
                  <Button variant="link" className="mt-2" onClick={() => document.querySelector('[value="login"]')?.dispatchEvent(new MouseEvent('click', {bubbles: true}))}>
                    العودة لتسجيل الدخول
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
      
      <Footer />
    </div>
  );
}
