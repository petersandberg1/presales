import React from "react";

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-[#30363d] bg-[#161b22]">
      {children}
    </div>
  );
}

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      className={[
        "rounded-md px-4 py-2.5 font-semibold",
        "bg-brand-500 hover:bg-brand-600 active:bg-brand-700",
        "text-white",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "transition-all duration-150",
        "focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:ring-offset-2 focus:ring-offset-[#0d1117]",
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
        "w-full rounded-md border border-[#30363d] bg-[#0d1117]",
        "px-4 py-2.5 text-[#e6edf3] placeholder:text-[#484f58]",
        "focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-500",
        "transition-all duration-150",
        className,
      ].join(" ")}
      {...rest}
    />
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-semibold text-[#8b949e]">{children}</label>;
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold text-red-400">{children}</p>;
}
