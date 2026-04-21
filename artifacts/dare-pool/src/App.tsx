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
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function AppRoutes() {
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    // Extra bottom padding so content isn't hidden behind the bottom nav
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
