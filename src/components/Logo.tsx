export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      aria-hidden="true"
      role="img"
    >
      <rect width="64" height="64" rx="2" fill="#9f1239" />
      <path
        d="M14 44 V20 h16.5 c6.2 0 10.2 3.4 10.2 8.6 0 5.3-4 8.7-10.2 8.7H22.5 V44 H14zm8.5-14.2h6.8c2.6 0 4.1-1.3 4.1-3.4s-1.5-3.4-4.1-3.4h-6.8v6.8z"
        fill="#faf8f5"
      />
      <circle cx="48" cy="18" r="3.5" fill="#faf8f5" opacity="0.92" />
    </svg>
  );
}
