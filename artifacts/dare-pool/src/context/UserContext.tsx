import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { getUser, setUser as saveUser } from "@/lib/store";

interface UserContextValue {
  username: string | null;
  login: (name: string) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextValue>({
  username: null,
  login: () => {},
  logout: () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(() => getUser());

  const login = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    saveUser(trimmed);
    setUsername(trimmed);
  };

  const logout = () => {
    localStorage.removeItem("darepool_user");
    setUsername(null);
  };

  useEffect(() => {
    const stored = getUser();
    if (stored) setUsername(stored);
  }, []);

  return (
    <UserContext.Provider value={{ username, login, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
