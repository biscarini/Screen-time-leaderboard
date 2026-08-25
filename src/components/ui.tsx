"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={[
        "w-full rounded-[10px] px-4 py-[13px] font-display font-semibold text-[15px]",
        "transition-opacity disabled:opacity-60",
        variant === "primary"
          ? "bg-ink text-ground"
          : "bg-surface2 text-ink border border-rule",
      ].join(" ")}
    >
      {pending ? (pendingLabel ?? "Working…") : children}
    </button>
  );
}

export function ErrorNote({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="text-[14px] text-up bg-upSoft border border-up/25 rounded-[10px] px-3 py-2"
    >
      {message}
    </p>
  );
}
