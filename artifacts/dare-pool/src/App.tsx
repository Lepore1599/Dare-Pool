import { useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserProvider } from "@/context/UserContext";
import { Navbar } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";
import { LoginModal } from "@/components/LoginModal";
import { Home } from "@/pages/Home";
import { CreateDare } from "@/pages/CreateDare";
import { DareDetail } from "@/pages/DareDetail";
import { Leaderboard } from "@/pages/Leaderboard";
import { Profile } from "@/pages/Profile";
import { AdminDashboard } from "@/pages/AdminDashboard";
import { Reels } from "@/pages/Reels";
import { Wallet } from "@/pages/Wallet";
import { Notifications } from "@/pages/Notifications";
import { Store } from "@/pages/Store";
import { Settings } from "@/pages/Settings";
import { AccountInfo } from "@/pages/settings/AccountInfo";
import { SecuritySettings } from "@/pages/settings/SecuritySettings";
import { PrivacySettings } from "@/pages/settings/PrivacySettings";
import { NotificationSettings } from "@/pages/settings/NotificationSettings";
import { PaymentSettings } from "@/pages/settings/PaymentSettings";
import { ContentSettings } from "@/pages/settings/ContentSettings";
import { SupportPage } from "@/pages/settings/SupportPage";
import { AboutSettings } from "@/pages/settings/AboutSettings";
import { BlockedUsers } from "@/pages/settings/BlockedUsers";
import { TermsOfService } from "@/pages/legal/TermsOfService";
import { CommunityGuidelines } from "@/pages/legal/CommunityGuidelines";
import { PrivacyPolicy } from "@/pages/legal/PrivacyPolicy";
import { SafetyDisclaimer } from "@/pages/legal/SafetyDisclaimer";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function AppRoutes() {
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-16">
      <Navbar onLoginClick={() => setLoginOpen(true)} />
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      <Switch>
        <Route path="/" component={() => <Home onLoginClick={() => setLoginOpen(true)} />} />
        <Route path="/create" component={CreateDare} />
        <Route path="/dare/:id">
          {(params) => <DareDetail id={params.id} />}
        </Route>
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/reels" component={() => <Reels onRequestLogin={() => setLoginOpen(true)} />} />
        <Route path="/wallet" component={() => <Wallet onRequestLogin={() => setLoginOpen(true)} />} />
        <Route path="/profile/:id">
          {(params) => <Profile id={params.id} />}
        </Route>
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/store" component={Store} />

        {/* Settings */}
        <Route path="/settings" component={Settings} />
        <Route path="/settings/account" component={AccountInfo} />
        <Route path="/settings/security" component={SecuritySettings} />
        <Route path="/settings/privacy" component={PrivacySettings} />
        <Route path="/settings/notifications" component={NotificationSettings} />
        <Route path="/settings/payments" component={PaymentSettings} />
        <Route path="/settings/content" component={ContentSettings} />
        <Route path="/settings/support" component={SupportPage} />
        <Route path="/settings/about" component={AboutSettings} />
        <Route path="/settings/blocked" component={BlockedUsers} />

        {/* Legal pages */}
        <Route path="/legal/terms" component={TermsOfService} />
        <Route path="/legal/guidelines" component={CommunityGuidelines} />
        <Route path="/legal/privacy" component={PrivacyPolicy} />
        <Route path="/legal/safety" component={SafetyDisclaimer} />

        <Route component={NotFound} />
      </Switch>
      <BottomNav onLoginClick={() => setLoginOpen(true)} />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <UserProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppRoutes />
          </WouterRouter>
        </UserProvider>
        <Toaster position="bottom-center" richColors style={{ bottom: "80px" }} />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
