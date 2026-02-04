"use client";

import { useEffect, useState } from "react";
import { useKeyContext } from "@/context/KeyContext";

export default function TokenPage() {
  const { tokenId, publicKey } = useKeyContext();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  const handleCopy = async () => {
    if (!tokenId) return;
    try {
      await navigator.clipboard.writeText(tokenId);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 space-y-4">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-[0.25em] text-zinc-600">
            Token ID
          </p>
          <h1 className="text-lg font-semibold text-zinc-100">
            Share this only in person.
          </h1>
          <p className="text-xs text-zinc-500">
            This ID grants full access. Share physically. No backups, no reset,
            no directory.
          </p>
        </header>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 flex items-center justify-between gap-3">
          <div className="font-mono text-sm tracking-[0.25em] text-zinc-100">
            {tokenId ?? "…"}
          </div>
          <button
            onClick={handleCopy}
            className="rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <div className="text-[11px] leading-snug text-zinc-500 space-y-1">
          <p>
            For this web prototype, QR scanning may not be available on all
            devices. You can copy this Token ID and transfer it over an
            out-of-band channel if necessary.
          </p>
          <p className="font-mono break-all text-zinc-600">
            pub:&nbsp;{publicKey ?? "…"}
          </p>
        </div>
      </div>
    </div>
  );
}


