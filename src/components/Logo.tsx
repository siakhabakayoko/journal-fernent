import Image from "next/image";

type LogoProps = {
  className?: string;
  onDark?: boolean;
  priority?: boolean;
};

export function Logo({ className = "", onDark = false, priority = false }: LogoProps) {
  return (
    <Image
      src="/logo-fernent.png"
      alt="Ferñent"
      width={1023}
      height={269}
      priority={priority}
      className={`object-contain ${onDark ? "brightness-0 invert" : ""} ${className}`.trim()}
    />
  );
}
