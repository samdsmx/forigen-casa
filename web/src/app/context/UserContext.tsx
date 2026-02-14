"use client";

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
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
  // Prevent concurrent fetchAppUser calls
  const fetchingRef = useRef(false);

  const fetchAppUser = async (userId: string): Promise<AppUser | null> => {
    // Skip if already fetching
    if (fetchingRef.current) return appUser;
    fetchingRef.current = true;

    try {
      const { data: appUserData, error: appUserError } = await supabase
        .from("app_user")
        .select("role, sede_id")
        .eq("auth_user_id", userId)
        .maybeSingle();

      if (appUserError) {
        console.error("[UserContext] Error fetching app_user:", appUserError);
        return null;
      }

      if (!appUserData) return null;

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
    } finally {
      fetchingRef.current = false;
    }
  };

  const refreshUser = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

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
    // Listen for auth changes FIRST, then do initial load
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[UserContext] Auth event: ${event}`);

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setAppUser(null);
        setLoading(false);
        return;
      }

      // For all other events: just update user from the session
      // Don't fetch app_user here - let refreshUser handle it
      if (session?.user) {
        setUser(session.user);
      }

      // Only fetch app details on SIGNED_IN (actual login, not initial)
      if (event === 'SIGNED_IN' && session?.user) {
        const details = await fetchAppUser(session.user.id);
        setAppUser(details);
        setLoading(false);
      }
    });

    // Initial load
    refreshUser();

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
