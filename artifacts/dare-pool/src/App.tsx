import { useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserProvider } from "@/context/UserContext";
import { Navbar } from "@/components/Navbar";
import { LoginModal } from "@/components/LoginModal";
import { Home } from "@/pages/Home";
import { CreateDare } from "@/pages/CreateDare";
import { DareDetail } from "@/pages/DareDetail";
import { Leaderboard } from "@/pages/Leaderboard";
import { Profile } from "@/pages/Profile";
import { AdminDashboard } from "@/pages/AdminDashboard";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function AppRoutes() {
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Navbar onLoginClick={() => setLoginOpen(true)} />
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      <Switch>
        <Route path="/" component={() => <Home onLoginClick={() => setLoginOpen(true)} />} />
        <Route path="/create" component={CreateDare} />
        <Route path="/dare/:id">
          {(params) => <DareDetail id={params.id} />}
        </Route>
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/profile/:id">
          {(params) => <Profile id={params.id} />}
        </Route>
        <Route path="/admin" component={AdminDashboard} />
        <Route component={NotFound} />
      </Switch>
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
        <Toaster position="bottom-right" richColors />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
