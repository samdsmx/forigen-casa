"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

interface AppUser {
  role?: string;
  sede_id?: string;
  sede_nombre?: string;
}

interface UserContextType {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppUser = async (userId: string) => {
    try {
      // Fetch role and sede_id from app_user
      const { data: appUserData, error: appUserError } = await supabase
        .from("app_user")
        .select("role, sede_id")
        .eq("auth_user_id", userId)
        .single();

      if (appUserError) {
        console.error("[UserContext] Error fetching app_user:", appUserError);
        // Don't block the UI if app_user is missing, but maybe warn
        return null;
      }

      let sedeName = undefined;
      // Force explicit type casting or optional chaining because TS inference might be strict on generated types
      const userSedeId = (appUserData as any)?.sede_id;

      if (userSedeId) {
        const { data: sedeData } = await supabase
          .from("sede")
          .select("nombre")
          .eq("id", userSedeId)
          .single();
        sedeName = (sedeData as any)?.nombre;
      }

      return {
        role: (appUserData as any)?.role,
        sede_id: userSedeId,
        sede_nombre: sedeName,
      };
    } catch (err) {
      console.error("[UserContext] Unexpected error fetching app details:", err);
      return null;
    }
  };

  const refreshUser = async () => {
    setLoading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (session?.user) {
        setUser(session.user);
        const details = await fetchAppUser(session.user.id);
        setAppUser(details);
      } else {
        setUser(null);
        setAppUser(null);
      }
    } catch (err: any) {
      console.error("[UserContext] Error refreshing user:", err);
      setError(err.message || "Error al cargar usuario");
      setUser(null);
      setAppUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial load
    refreshUser();

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[UserContext] Auth event: ${event}`);

      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        // Only fetch details if we don't have them or if the user changed
        if (!appUser || user?.id !== session.user.id) {
          const details = await fetchAppUser(session.user.id);
          setAppUser(details);
        }
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setAppUser(null);
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
         // Just update the user object, details likely haven't changed
         setUser(session.user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <UserContext.Provider value={{ user, appUser, loading, error, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within a UserProvider");
  }
  return context;
}
