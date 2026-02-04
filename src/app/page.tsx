"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useKeyContext } from "@/context/KeyContext";
import { useSupabaseAuth } from "@/context/SupabaseAuthProvider";

export default function Home() {
  const router = useRouter();
  const { isInitialized, hasIdentity } = useKeyContext();
  const { authReady } = useSupabaseAuth();

  useEffect(() => {
    if (!authReady || !isInitialized) return;
    if (hasIdentity) {
      router.replace("/chat");
    } else {
      router.replace("/onboarding");
    }
  }, [authReady, isInitialized, hasIdentity, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
      <div className="text-center space-y-2">
        <p className="text-xs uppercase tracking-[0.25em] text-zinc-600">
          Ghost Network
        </p>
        <p className="text-sm text-zinc-500">
          Initializing secure environment&hellip;
        </p>
      </div>
    </div>
  );
}

