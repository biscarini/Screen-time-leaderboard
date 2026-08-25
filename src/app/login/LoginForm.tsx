"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ErrorNote } from "@/components/ui";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string>();

  async function send(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);
    setStatus("sending");

    const origin =
      process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error: sendError } = await supabaseBrowser().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${origin}/auth/callback?next=/groups` },
    });

    if (sendError) {
      setError(sendError.message);
      setStatus("idle");
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="card p-5 flex flex-col gap-2">
        <span className="eyebrow">Check your email</span>
        <p className="text-[16px] text-ink2">
          We sent a sign-in link to <strong className="text-ink">{email}</strong>. Open it
          on this phone and you&rsquo;re in.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="self-start font-mono text-[11.5px] text-ink3 hover:text-ink pt-1"
        >
          Use a different address
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={send} className="flex flex-col gap-3">
      <input
        className="field"
        type="email"
        name="email"
        inputMode="email"
        autoComplete="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <ErrorNote message={error} />
      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-[10px] bg-ink text-ground px-4 py-[13px] font-display font-semibold text-[15px] disabled:opacity-60"
      >
        {status === "sending" ? "Sending…" : "Email me a link"}
      </button>
      <p className="font-mono text-[11px] text-ink3 leading-relaxed">
        No password. The link signs you in.
      </p>
    </form>
  );
}
