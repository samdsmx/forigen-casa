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
        return null;
      }

      let sedeName = undefined;
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
      // Race promise with a timeout to prevent infinite hanging
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000));

      const { data: { session }, error: sessionError } = (await Promise.race([sessionPromise, timeoutPromise])) as any;

      if (sessionError) throw sessionError;

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

      // Handle state updates based on event type
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          setUser(session.user);
          // Refresh app user details if missing or user changed
          if (!appUser || user?.id !== session.user.id) {
             const details = await fetchAppUser(session.user.id);
             setAppUser(details);
          }
        }
        // Ensure we stop loading state if we were stuck
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setAppUser(null);
        setLoading(false);
      } else if (event === 'INITIAL_SESSION') {
         // Usually handled by refreshUser, but good to be safe
         if (session?.user) {
            setUser(session.user);
            if (!appUser) {
              const details = await fetchAppUser(session.user.id);
              setAppUser(details);
            }
         } else {
            setUser(null);
            setAppUser(null);
         }
         setLoading(false);
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
