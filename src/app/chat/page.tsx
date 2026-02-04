"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useKeyContext } from "@/context/KeyContext";
import { useSupabaseAuth } from "@/context/SupabaseAuthProvider";
import { decryptMessage, encryptMessage } from "@/lib/messageCrypto";

interface Contact {
  id: string;
  owner_id: string;
  peer_user_id: string;
  session_key_material: string;
  created_at: string;
}

interface MessageRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  contact_id: string;
  ciphertext: string;
  nonce: string;
  synthetic_timestamp: string;
  created_at: string;
}

export default function ChatPage() {
  const { publicKey, tokenId } = useKeyContext();
  const { authReady } = useSupabaseAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    null
  );
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [plainMessages, setPlainMessages] = useState<Record<string, string>>(
    {}
  );
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const selectedContact = useMemo(
    () => contacts.find((c) => c.id === selectedContactId) ?? null,
    [contacts, selectedContactId]
  );

  useEffect(() => {
    if (!authReady) return;
    async function loadUserAndContacts() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      setUserId(auth.user.id);

      const { data, error } = await supabase
        .from("contacts")
        .select("id, owner_id, peer_user_id, session_key_material, created_at")
        .order("created_at", { ascending: true });
      if (error) {
        console.error(error);
        return;
      }
      setContacts(data as Contact[]);
      if (data && data.length > 0 && !selectedContactId) {
        setSelectedContactId(data[0].id);
      }
    }
    loadUserAndContacts();
  }, [authReady, selectedContactId]);

  useEffect(() => {
    if (!selectedContact || !authReady) return;

    let subscription: ReturnType<typeof supabase.channel> | null = null;

    async function loadMessages() {
      if (!selectedContact) return;
      const { data, error } = await supabase
        .from("messages")
        .select(
          "id, sender_id, recipient_id, contact_id, ciphertext, nonce, synthetic_timestamp, created_at"
        )
        .eq("contact_id", selectedContact.id)
        .order("created_at", { ascending: true });
      if (error) {
        console.error(error);
        return;
      }
      setMessages(data as MessageRow[]);
    }

    loadMessages();

    subscription = supabase
      .channel(`messages:${selectedContact.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `contact_id=eq.${selectedContact.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as MessageRow]);
        }
      )
      .subscribe();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [selectedContact, authReady]);

  useEffect(() => {
    async function decryptAll() {
      if (!selectedContact || !publicKey) return;
      const sessionKeyBytes = Buffer.from(
        selectedContact.session_key_material,
        "base64"
      );
      const decrypted: Record<string, string> = {};
      for (const m of messages) {
        try {
          const text = await decryptMessage(
            m.ciphertext,
            m.nonce,
            sessionKeyBytes
          );
          decrypted[m.id] = text;
        } catch {
          decrypted[m.id] = "[decryption failed]";
        }
      }
      setPlainMessages(decrypted);
    }
    decryptAll();
  }, [messages, selectedContact, publicKey]);

  async function handleSend() {
    if (!input.trim() || !selectedContact || !userId || !publicKey) return;
    setSending(true);
    try {
      const sessionKeyBytes = Buffer.from(
        selectedContact.session_key_material,
        "base64"
      );
      const { cipherText, nonce } = await encryptMessage(
        input.trim(),
        sessionKeyBytes
      );
      const synthetic = computeSyntheticTimestamp(new Date());

      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/09257254-ad20-4bdc-a801-8c5fc08b2906",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "H4",
            location: "chat/page.tsx:handleSend",
            message: "Before inserting message",
            data: {
              senderId: userId,
              recipientId: selectedContact.peer_user_id,
              contactId: selectedContact.id,
            },
            timestamp: Date.now(),
          }),
        }
      ).catch(() => { });
      // #endregion

      const { error } = await supabase.from("messages").insert({
        sender_id: userId,
        recipient_id: selectedContact.peer_user_id,
        contact_id: selectedContact.id,
        ciphertext: cipherText,
        nonce,
        synthetic_timestamp: synthetic.toISOString(),
        expires_at: new Date(
          Date.now() + 72 * 60 * 60 * 1000
        ).toISOString(),
      });
      if (error) {
        // #region agent log
        fetch(
          "http://127.0.0.1:7242/ingest/09257254-ad20-4bdc-a801-8c5fc08b2906",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: "debug-session",
              runId: "run1",
              hypothesisId: "H4",
              location: "chat/page.tsx:handleSend",
              message: "Insert message failed",
              data: { error: error.message },
              timestamp: Date.now(),
            }),
          }
        ).catch(() => { });
        // #endregion
        throw error;
      }
      setInput("");
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-black text-zinc-100">
      <aside className="hidden w-72 border-r border-zinc-900 bg-zinc-950/60 p-4 md:flex md:flex-col">
        <div className="mb-4 space-y-1">
          <p className="text-xs uppercase tracking-[0.25em] text-zinc-600">
            Ghost Network
          </p>
          <p className="text-xs text-zinc-500">
            Token:&nbsp;
            <span className="font-mono">{tokenId ?? "…"}</span>
          </p>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto">
          <p className="text-xs text-zinc-500 mb-1">Contacts</p>
          {contacts.length === 0 && (
            <p className="text-xs text-zinc-600">
              No contacts. Share your Token ID and accept a handshake.
            </p>
          )}
          {contacts.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedContactId(c.id)}
              className={`w-full rounded-md px-3 py-2 text-left text-sm border ${c.id === selectedContactId
                  ? "border-zinc-400 bg-zinc-900"
                  : "border-zinc-900 bg-zinc-950 hover:border-zinc-700"
                }`}
            >
              <div className="font-medium text-zinc-100">
                {c.peer_user_id.slice(0, 8)}…
              </div>
              <div className="text-[11px] text-zinc-500">
                since {new Date(c.created_at).toLocaleDateString()}
              </div>
            </button>
          ))}
        </div>
        <div className="mt-4 flex gap-2 text-xs">
          <a
            href="/token"
            className="flex-1 rounded-md border border-zinc-800 px-2 py-1 text-center hover:bg-zinc-900"
          >
            Token
          </a>
          <a
            href="/handshake"
            className="flex-1 rounded-md border border-zinc-800 px-2 py-1 text-center hover:bg-zinc-900"
          >
            Handshake
          </a>
          <a
            href="/settings"
            className="flex-1 rounded-md border border-zinc-800 px-2 py-1 text-center hover:bg-zinc-900"
          >
            Settings
          </a>
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        <header className="flex items-center justify-between border-b border-zinc-900 px-4 py-3">
          <div className="space-y-0.5">
            <p className="text-xs uppercase tracking-[0.25em] text-zinc-600">
              Chat
            </p>
            <p className="text-sm text-zinc-300">
              {selectedContact
                ? `Secure session with ${selectedContact.peer_user_id.slice(
                  0,
                  8
                )}…`
                : "No contact selected"}
            </p>
          </div>
        </header>

        <section className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {selectedContact == null && (
              <p className="text-sm text-zinc-500">
                Select a contact or create a handshake to start messaging.
              </p>
            )}
            {selectedContact != null &&
              messages.map((m) => {
                const mine = m.sender_id === userId;
                const text = plainMessages[m.id] ?? "…";
                return (
                  <div
                    key={m.id}
                    className={`flex ${mine ? "justify-end" : "justify-start"
                      }`}
                  >
                    <div
                      className={`max-w-xs rounded-2xl px-3 py-2 text-sm ${mine
                          ? "bg-zinc-100 text-black"
                          : "bg-zinc-900 text-zinc-100 border border-zinc-800"
                        }`}
                    >
                      <p>{text}</p>
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="border-t border-zinc-900 px-4 py-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="flex-1 rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm outline-none focus:border-zinc-500"
                placeholder={
                  selectedContact
                    ? "Type a message (no attachments, no previews)…"
                    : "Select a contact to start messaging…"
                }
                disabled={!selectedContact}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button
                onClick={handleSend}
                disabled={!selectedContact || sending || !input.trim()}
                className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">
              Messages are stored encrypted and scheduled to auto-delete after
              72 hours.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

function computeSyntheticTimestamp(actual: Date): Date {
  const ms = actual.getTime();
  const intervalMs = 15 * 60 * 1000;
  const rounded = Math.floor(ms / intervalMs) * intervalMs;
  return new Date(rounded);
}


