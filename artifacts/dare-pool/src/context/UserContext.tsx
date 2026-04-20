import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { apiLogin, apiRegister, apiMe, type ApiUser } from "@/lib/api";

interface UserContextValue {
  user: ApiUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("darepool_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    apiMe()
      .then(({ user: me }) => setUser(me))
      .catch(() => { localStorage.removeItem("darepool_token"); setToken(null); })
      .finally(() => setLoading(false));
  }, [token]);

  const login = async (email: string, password: string) => {
    const { token: t } = await apiLogin(email, password);
    localStorage.setItem("darepool_token", t);
    setToken(t);
    const { user: full } = await apiMe();
    setUser(full);
  };

  const register = async (username: string, email: string, password: string) => {
    const { token: t } = await apiRegister(username, email, password);
    localStorage.setItem("darepool_token", t);
    setToken(t);
    const { user: full } = await apiMe();
    setUser(full);
  };

  const logout = () => {
    localStorage.removeItem("darepool_token");
    setToken(null);
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
