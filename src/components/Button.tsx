import Link from "next/link";
import type { JSX, ReactNode } from "react";

interface ButtonProps {
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  children: ReactNode;
  className?: string;
}

export function Button({
  href,
  onClick,
  variant = "primary",
  children,
  className = "",
}: ButtonProps): JSX.Element {
  const cls = `am-btn am-btn-${variant} ${className}`.trim();
  const styles = (
    <style jsx global>{`
      .am-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        height: 42px;
        padding: 0 20px;
        border-radius: var(--radius-md);
        border: 1px solid transparent;
        font-size: 14px;
        font-weight: 500;
        text-decoration: none;
        transition:
          background var(--dur-fast) var(--ease-in-out),
          border-color var(--dur-fast) var(--ease-in-out),
          color var(--dur-fast) var(--ease-in-out);
      }
      .am-btn:active {
        transform: translateY(0.5px);
      }
      .am-btn-primary {
        background: var(--accent);
        color: var(--accent-ink);
      }
      .am-btn-primary:hover {
        background: var(--accent-hover);
      }
      .am-btn-secondary {
        background: var(--bg-raised);
        border-color: var(--border);
        color: var(--ink);
      }
      .am-btn-secondary:hover {
        border-color: var(--border-strong);
        background: var(--bg-sunken);
      }
      .am-btn-ghost {
        background: transparent;
        color: var(--ink-secondary);
      }
      .am-btn-ghost:hover {
        color: var(--ink);
        background: var(--bg-hover);
      }
    `}</style>
  );

  if (href) {
    return (
      <Link href={href} className={cls} onClick={onClick ?? ((): void => undefined)}>
        {children}
        {styles}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} onClick={onClick ?? ((): void => undefined)}>
      {children}
      {styles}
    </button>
  );
}
