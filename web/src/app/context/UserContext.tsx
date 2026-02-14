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
      // Simple direct query - no RPCs, no complex timeouts
      // Let Supabase handle its own timeouts
      const { data: appUserData, error: appUserError } = await supabase
        .from("app_user")
        .select("role, sede_id")
        .eq("auth_user_id", userId)
        .maybeSingle();

      if (appUserError) {
        console.error("[UserContext] Error fetching app_user:", appUserError);
        return null;
      }

      if (!appUserData) {
        console.warn("[UserContext] No app_user record found for user");
        return null;
      }

      // Fetch sede name if exists
      let sedeName = undefined;
      const sedeId = (appUserData as any).sede_id;
      if (sedeId) {
        const { data: sedeData } = await supabase
          .from("sede")
          .select("nombre")
          .eq("id", sedeId)
          .maybeSingle();
        
        sedeName = (sedeData as any)?.nombre;
      }

      return {
        role: (appUserData as any).role as string | undefined,
        sede_id: sedeId as string | undefined,
        sede_nombre: sedeName,
      };
    } catch (err) {
      console.error("[UserContext] Error fetching app details:", err);
      return null;
    }
  };

  const refreshUser = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Simple session check - let Supabase handle timeouts
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (session?.user) {
        setUser(session.user);
        // Fetch app user details
        const details = await fetchAppUser(session.user.id);
        setAppUser(details);
      } else {
        // No session
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
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        if (session?.user) {
          setUser(session.user);
          // Always refresh app user details on auth events
          const details = await fetchAppUser(session.user.id);
          setAppUser(details);
        }
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setAppUser(null);
        setLoading(false);
      } else {
        // For any other event, ensure loading is false
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
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
