import React from "react";

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10
                    bg-slate-800/70 shadow-xl backdrop-blur">
      {children}
    </div>
  );
}
export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      className={[
        "rounded-xl px-4 py-2 font-medium",
        "bg-brand-500 hover:bg-brand-600 active:bg-brand-700",
        "text-white shadow",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "transition",
        className,
      ].join(" ")}
      {...rest}
    />
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      className={[
        "w-full rounded-xl border border-white/10 bg-slate-950/40",
        "px-3 py-2 text-slate-100 placeholder:text-slate-400",
        "focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-500/40",
        className,
      ].join(" ")}
      {...rest}
    />
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-sm text-slate-200">{children}</label>;
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-red-400">{children}</p>;
}