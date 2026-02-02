import React from "react";

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-white/20 bg-slate-800/80 shadow-2xl backdrop-blur-sm">
      {children}
    </div>
  );
}

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      className={[
        "rounded-xl px-4 py-2.5 font-semibold",
        "bg-brand-500 hover:bg-brand-600 active:bg-brand-700",
        "text-white shadow-lg shadow-brand-500/25",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "transition-all duration-150",
        "focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:ring-offset-2 focus:ring-offset-slate-900",
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
        "w-full rounded-xl border-2 border-slate-700 bg-slate-900/70",
        "px-4 py-2.5 text-slate-100 placeholder:text-slate-500",
        "focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-500",
        "transition-all duration-150",
        className,
      ].join(" ")}
      {...rest}
    />
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-semibold text-slate-300">{children}</label>;
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold text-red-400">{children}</p>;
}
