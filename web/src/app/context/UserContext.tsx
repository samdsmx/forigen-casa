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

async function loadAppUser(userId: string): Promise<AppUser | null> {
  try {
    const { data, error } = await supabase
      .from("app_user")
      .select("role, sede_id")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (error || !data) return null;

    const role = (data as any).role as string | undefined;
    const sede_id = (data as any).sede_id as string | undefined;
    let sede_nombre: string | undefined;

    if (sede_id) {
      const { data: sedeData } = await supabase
        .from("sede")
        .select("nombre")
        .eq("id", sede_id)
        .maybeSingle();
      sede_nombre = (sedeData as any)?.nombre;
    }

    return { role, sede_id, sede_nombre };
  } catch {
    return null;
  }
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Single function to sync state from a session
  const syncSession = async (session: any) => {
    if (session?.user) {
      setUser(session.user);
      const details = await loadAppUser(session.user.id);
      setAppUser(details);
    } else {
      setUser(null);
      setAppUser(null);
    }
    setLoading(false);
  };

  const refreshUser = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    await syncSession(session);
  };

  useEffect(() => {
    // 1. Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log(`[UserContext] Auth event: ${_event}`);
        // Use setTimeout to avoid blocking Supabase's internal callback chain
        // This ensures getSession/setSession have finished before we query the DB
        setTimeout(() => syncSession(session), 0);
      }
    );

    // 2. Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      syncSession(session);
    });

    return () => { subscription.unsubscribe(); };
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
