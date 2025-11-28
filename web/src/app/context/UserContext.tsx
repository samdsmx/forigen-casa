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
        // If row doesn't exist, we just return null (valid for new users)
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
      // Don't crash auth flow if profile fetch fails
      return null;
    }
  };

  const refreshUser = async () => {
    setLoading(true);
    try {
      // Use a timeout to prevent indefinite hang, but don't log out on timeout alone
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000));

      let sessionRes;
      try {
        sessionRes = (await Promise.race([sessionPromise, timeoutPromise])) as any;
      } catch (e) {
        // If timeout, assume we might still be logged in locally or just network is slow.
        // DO NOT set user to null immediately if we already have one.
        // If we don't have one, we can't do much.
        console.warn("[UserContext] Session check timed out, preserving state if possible.");
        setError("La conexión es lenta. Si experimentas problemas, recarga la página.");
        setLoading(false);
        return;
      }

      const { data: { session }, error: sessionError } = sessionRes;

      if (sessionError) {
        throw sessionError;
      }

      if (session?.user) {
        setUser(session.user);
        // Only fetch details if needed
        if (!appUser || user?.id !== session.user.id) {
            const details = await fetchAppUser(session.user.id);
            setAppUser(details);
        }
      } else {
        // Explicitly no session from Supabase -> Logout
        setUser(null);
        setAppUser(null);
      }
    } catch (err: any) {
      console.error("[UserContext] Error refreshing user:", err);
      setError(err.message || "Error al cargar usuario");
      // Only clear user if we are sure it's an Auth error, not network
      // But for safety, if we can't verify session, we usually logout.
      // However, to fix "app ya no funciona", we will be lenient if user was already set.
      if (!user) {
         setUser(null);
         setAppUser(null);
      }
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
          // Refresh app user details if missing or user changed
          if (!appUser || user?.id !== session.user.id) {
             const details = await fetchAppUser(session.user.id);
             setAppUser(details);
          }
        } else if (event === 'SIGNED_IN') {
             // Signed in but no session user? Rare.
        }
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setAppUser(null);
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
