import { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

// Define session data response type
interface SessionResponse {
  authenticated: boolean;
  user?: User;
}

interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: "admin" | "departmentHead" | "teacher";
  departmentId?: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  initialized: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  initialized: false,
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Initialize state with cached user data if available
  const [user, setUser] = useState<User | null>(() => {
    const cachedUser = localStorage.getItem('SuiviScolaire_user');
    return cachedUser ? JSON.parse(cachedUser) : null;
  });
  const [authInitialized, setAuthInitialized] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Check session status
  const { data: sessionData, isLoading, refetch } = useQuery<SessionResponse>({
    queryKey: ["/api/auth/session"],
    refetchOnWindowFocus: true,
    // Only staleTime to reduce unnecessary fetches
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update user state when session data changes
  useEffect(() => {
    // Only process if we have valid session data
    if (sessionData) {
      if (sessionData.authenticated && sessionData.user) {
        setUser(sessionData.user);
        localStorage.setItem('SuiviScolaire_user', JSON.stringify(sessionData.user));
      } else if (!sessionData.authenticated) {
        setUser(null);
        localStorage.removeItem('SuiviScolaire_user');
      }
    }
    
    if (!isLoading) {
      setAuthInitialized(true);
    }
  }, [sessionData, isLoading]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/login", credentials);
      return response.json();
    },
    onSuccess: (data) => {
      setUser(data);
      // Store user data in localStorage
      localStorage.setItem('SuiviScolaire_user', JSON.stringify(data));
      toast({
        title: "Connexion réussie",
        description: `Bienvenue, ${data.fullName}`,
      });
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Échec de la connexion",
        description: error.message || "Nom d'utilisateur ou mot de passe incorrect",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/logout", {});
      return response.json();
    },
    onSuccess: () => {
      setUser(null);
      // Clear localStorage on logout
      localStorage.removeItem('SuiviScolaire_user');
      toast({
        title: "Déconnexion réussie",
        description: "Vous avez été déconnecté avec succès",
      });
      navigate("/login");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Échec de la déconnexion",
        description: error.message || "Une erreur s'est produite lors de la déconnexion",
      });
    },
  });

  const login = async (username: string, password: string) => {
    await loginMutation.mutateAsync({ username, password });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: isLoading || loginMutation.isPending,
        initialized: authInitialized,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
