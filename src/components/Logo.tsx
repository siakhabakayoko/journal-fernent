import Image from "next/image";

type LogoProps = {
  className?: string;
  onDark?: boolean;
  priority?: boolean;
};

/** Red serif mensuel wordmark (public/logo-fernent.png). Stays red on light and dark. */
export function Logo({ className = "", onDark = false, priority = false }: LogoProps) {
  return (
    <Image
      src="/logo-fernent.png"
      alt="Ferñent"
      width={2115}
      height={318}
      priority={priority}
      className={`object-contain ${onDark ? "brightness-110" : ""} ${className}`.trim()}
    />
  );
}
