import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { CustomerService } from "@/components/shared/CustomerService";
import { SplashScreen } from "@/components/SplashScreen";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useState, useCallback, lazy, Suspense } from "react";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { Loader2 } from "lucide-react";

// Lazy Load Pages for Performance
const Home = lazy(() => import("@/pages/home"));
const Shop = lazy(() => import("@/pages/shop"));
const ProductDetails = lazy(() => import("@/pages/product-details"));
const Cart = lazy(() => import("@/pages/cart"));
const AuthPage = lazy(() => import("@/pages/auth"));
const ProfilePage = lazy(() => import("@/pages/profile"));
const ResetPasswordPage = lazy(() => import("@/pages/reset-password"));
const AdminLoginPage = lazy(() => import("@/pages/admin-login"));
const AdminPage = lazy(() => import("@/pages/admin"));
const NotFound = lazy(() => import("@/pages/not-found"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function Router() {
  return (
    <div className="min-h-screen w-full font-sans" dir="rtl">
      <AnnouncementBar />
      <Suspense fallback={<PageLoader />}>
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
      </Suspense>
      <MobileNav />
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
