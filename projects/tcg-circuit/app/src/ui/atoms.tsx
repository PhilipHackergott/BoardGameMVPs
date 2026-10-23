import React from "react";

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

export function Button({ variant = "default", size = "md", className = "", ...rest }: BtnProps) {
  const v = variant === "primary" ? "btn-primary" : variant === "ghost" ? "btn-ghost" : variant === "danger" ? "btn-danger" : "";
  const s = size === "lg" ? "btn-lg" : size === "sm" ? "btn-sm" : "";
  return <button className={`btn ${v} ${s} ${className}`} {...rest} />;
}

export function Panel({ title, children, className = "", style }: { title?: string; children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`panel ${className}`} style={style}>
      {title && <div className="panel-head">{title}</div>}
      {children}
    </div>
  );
}
