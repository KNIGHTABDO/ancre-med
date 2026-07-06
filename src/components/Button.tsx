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
        padding: 0 22px;
        border-radius: var(--radius-full);
        border: 1px solid transparent;
        font-size: 14px;
        font-weight: 500;
        text-decoration: none;
        transition:
          background var(--dur-fast) var(--ease-in-out),
          border-color var(--dur-fast) var(--ease-in-out),
          color var(--dur-fast) var(--ease-in-out),
          box-shadow var(--dur-fast) var(--ease-in-out),
          transform var(--dur-fast) var(--ease-spring);
      }
      .am-btn:active {
        transform: scale(0.97);
      }
      .am-btn-primary {
        background: linear-gradient(
          180deg,
          color-mix(in srgb, var(--accent) 85%, white) 0%,
          var(--accent) 100%
        );
        color: var(--accent-ink);
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.35),
          0 4px 14px color-mix(in srgb, var(--accent) 35%, transparent);
      }
      .am-btn-primary:hover {
        background: linear-gradient(
          180deg,
          color-mix(in srgb, var(--accent-hover) 85%, white) 0%,
          var(--accent-hover) 100%
        );
        transform: translateY(-1px);
      }
      .am-btn-secondary {
        background: var(--glass-bg);
        -webkit-backdrop-filter: blur(var(--blur-sm)) saturate(var(--glass-saturate));
        backdrop-filter: blur(var(--blur-sm)) saturate(var(--glass-saturate));
        border-color: var(--glass-border);
        color: var(--ink);
        box-shadow: inset 0 1px 0 0 var(--glass-highlight), var(--shadow-sm);
      }
      .am-btn-secondary:hover {
        border-color: var(--border-strong);
        background: var(--glass-bg-strong);
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
