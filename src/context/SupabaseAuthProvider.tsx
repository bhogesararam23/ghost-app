"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface SupabaseAuthContextValue {
  authReady: boolean;
  user: any | null;
  session: any | null;
}

const SupabaseAuthContext = createContext<SupabaseAuthContextValue | undefined>(
  undefined
);

export function SupabaseAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function ensureSession() {
      const { data } = await supabase.auth.getUser();

      if (data.user) {
        if (isMounted) {
          setUser(data.user);
          setAuthReady(true);
        }
        return;
      }

      const { data: anonData } = await supabase.auth.signInAnonymously();
      if (isMounted) {
        if (anonData.user) {
          setUser(anonData.user);
          setSession(anonData.session);
        }
        setAuthReady(true);
      }
    }

    ensureSession();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <SupabaseAuthContext.Provider value={{ authReady, user, session }}>
      {children}
    </SupabaseAuthContext.Provider>
  );
}

export function useSupabaseAuth(): SupabaseAuthContextValue {
  const ctx = useContext(SupabaseAuthContext);
  if (!ctx) {
    throw new Error("useSupabaseAuth must be used within SupabaseAuthProvider");
  }
  return ctx;
}
