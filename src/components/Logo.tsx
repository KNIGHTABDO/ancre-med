import Link from "next/link";
import type { JSX } from "react";

interface LogoMarkProps {
  size?: number;
}

export function LogoMark({ size = 20 }: LogoMarkProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="5" r="2.5" />
      <path d="M12 7.5v13" />
      <path d="M8.5 10h7" />
      <path d="M4.5 14.5a7.5 7.5 0 0 0 15 0" />
    </svg>
  );
}

interface LogoProps {
  href?: string;
  size?: number;
}

export function Logo({ href = "/", size = 20 }: LogoProps): JSX.Element {
  return (
    <Link href={href} className="brand-lockup">
      <LogoMark size={size} />
      <span className="brand-wordmark">AncreMed</span>
      <style jsx global>{`
        .brand-lockup {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          color: var(--ink);
          text-decoration: none;
        }
        .brand-lockup svg {
          color: var(--accent);
        }
        .brand-wordmark {
          font-family: var(--font-serif);
          font-size: 21px;
          font-weight: 500;
          letter-spacing: -0.01em;
          line-height: 1;
        }
      `}</style>
    </Link>
  );
}
