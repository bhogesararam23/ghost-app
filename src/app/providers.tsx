"use client";

import { SupabaseAuthProvider } from "@/context/SupabaseAuthProvider";
import { KeyProvider } from "@/context/KeyContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseAuthProvider>
      <KeyProvider>{children}</KeyProvider>
    </SupabaseAuthProvider>
  );
}


