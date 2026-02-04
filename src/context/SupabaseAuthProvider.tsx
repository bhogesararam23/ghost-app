"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface SupabaseAuthContextValue {
  authReady: boolean;
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
      ).catch(() => {});
      // #endregion
      if (data.user) {
        if (isMounted) setAuthReady(true);
        return;
      }

      await supabase.auth.signInAnonymously();
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
      ).catch(() => {});
      // #endregion
      if (isMounted) setAuthReady(true);
    }

    ensureSession();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <SupabaseAuthContext.Provider value={{ authReady }}>
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


