import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Shop from "@/pages/shop";
import ProductDetails from "@/pages/product-details";
import Cart from "@/pages/cart";
import AuthPage from "@/pages/auth";
import ProfilePage from "@/pages/profile";
import ResetPasswordPage from "@/pages/reset-password";
import AdminPage from "@/pages/admin";
import AdminLoginPage from "@/pages/admin-login";
import { FloatingAdminButton } from "@/components/FloatingAdminButton";
import { CustomerService } from "@/components/shared/CustomerService";
import { SplashScreen } from "@/components/SplashScreen";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useState, useCallback } from "react";

function Router() {
  return (
    <div className="min-h-screen w-full font-sans" dir="rtl">
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/shop" component={Shop} />
        <Route path="/product/:id" component={ProductDetails} />
        <Route path="/cart" component={Cart} />
        <Route path="/login" component={AuthPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/reset-password" component={ResetPasswordPage} />
        <Route path="/admin-login" component={AdminLoginPage} />
        <Route path="/admin" component={AdminPage} />
        <Route component={NotFound} />
      </Switch>
      <MobileNav />
      <FloatingAdminButton />
      <CustomerService />
    </div>
  );
}

function App() {
  const [splashDone, setSplashDone] = useState(false);
  const handleSplashDone = useCallback(() => setSplashDone(true), []);

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      {!splashDone && <SplashScreen onDone={handleSplashDone} />}
      <Router />
    </QueryClientProvider>
  );
}

export default App;
