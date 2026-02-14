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
      // Increase timeout for serverless environment (Vercel can be slow on cold starts)
      const timeoutMs = 15000; // 15 seconds - more reasonable for serverless
      
      const fetchWithTimeout = async () => {
        // Try RPCs first (faster when they work)
        try {
          const rolePromise = supabase.rpc('user_role');
          const sedeIdPromise = supabase.rpc('user_sede_id');
          
          const timeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('RPC timeout')), timeoutMs)
          );

          const [roleResult, sedeIdResult] = await Promise.race([
            Promise.all([rolePromise, sedeIdPromise]),
            timeout
          ]) as any;

          return {
            role: roleResult?.data || null,
            sedeId: sedeIdResult?.data || null,
            source: 'rpc'
          };
        } catch (rpcError) {
          console.warn('[UserContext] RPC failed, falling back to direct query:', rpcError);
          
          // Fallback to direct query if RPCs fail
          const { data: appUserData, error: queryError } = await supabase
            .from("app_user")
            .select("role, sede_id")
            .eq("auth_user_id", userId)
            .maybeSingle(); // Use maybeSingle to avoid errors if not found

          if (queryError) {
            console.error('[UserContext] Direct query also failed:', queryError);
            return { role: null, sedeId: null, source: 'error' };
          }

          return {
            role: (appUserData as any)?.role || null,
            sedeId: (appUserData as any)?.sede_id || null,
            source: 'query'
          };
        }
      };

      const { role, sedeId, source } = await fetchWithTimeout();
      console.log(`[UserContext] Fetched app_user via ${source}:`, { role, sedeId });

      // Fetch sede name if we have a sede_id (with its own timeout)
      let sedeName = undefined;
      if (sedeId) {
        try {
          const sedePromise = supabase
            .from("sede")
            .select("nombre")
            .eq("id", sedeId as string)
            .maybeSingle();
          
          const timeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Sede fetch timeout')), 5000)
          );

          const { data: sedeData } = await Promise.race([sedePromise, timeout]) as any;
          sedeName = sedeData?.nombre;
        } catch (err) {
          console.warn("[UserContext] Sede name fetch failed, continuing without it");
        }
      }

      return {
        role: role as string | undefined,
        sede_id: sedeId as string | undefined,
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
    setError(null);
    
    try {
      // Use a timeout to prevent indefinite hang
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout")), 10000)
      );

      let sessionRes;
      try {
        sessionRes = (await Promise.race([sessionPromise, timeoutPromise])) as any;
      } catch (e) {
        // If timeout, log out to avoid stuck state
        console.warn("[UserContext] Session check timed out. Logging out for safety.");
        setError("La conexión tardó demasiado. Por favor, inicia sesión de nuevo.");
        setUser(null);
        setAppUser(null);
        setLoading(false);
        return;
      }

      const { data: { session }, error: sessionError } = sessionRes;

      if (sessionError) {
        throw sessionError;
      }

      if (session?.user) {
        setUser(session.user);
        // Fetch app user details
        const details = await fetchAppUser(session.user.id);
        setAppUser(details);
      } else {
        // Explicitly no session from Supabase -> Logout
        setUser(null);
        setAppUser(null);
      }
    } catch (err: any) {
      console.error("[UserContext] Error refreshing user:", err);
      setError(err.message || "Error al cargar usuario");
      // Clear user on error
      setUser(null);
      setAppUser(null);
    } finally {
      // Always ensure loading is set to false
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
