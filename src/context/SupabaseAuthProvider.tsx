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
      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/09257254-ad20-4bdc-a801-8c5fc08b2906",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "H1",
            location: "SupabaseAuthProvider.tsx:ensureSession",
            message: "After getUser",
            data: { hasUser: !!data.user },
            timestamp: Date.now(),
          }),
        }
      ).catch(() => { });
      // #endregion

      if (data.user) {
        if (isMounted) {
          setUser(data.user);
          // getUser doesn't return session, so we might need getSession if session is needed, 
          // but for now user is the main requirement.
          setAuthReady(true);
        }
        return;
      }

      const { data: anonData } = await supabase.auth.signInAnonymously();
      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/09257254-ad20-4bdc-a801-8c5fc08b2906",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "H1",
            location: "SupabaseAuthProvider.tsx:ensureSession",
            message: "After signInAnonymously",
            data: {},
            timestamp: Date.now(),
          }),
        }
      ).catch(() => { });
      // #endregion
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


