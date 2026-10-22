import Link from "next/link";

export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <img
      src="/logo.png?v=2"
      alt=""
      width={size}
      height={size}
      className="logo-mark"
      style={{ width: size, height: size }}
    />
  );
}

export function Wordmark({
  size = 34,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const textSize = size >= 72 ? "text-5xl md:text-7xl" : size >= 44 ? "text-3xl" : size <= 24 ? "text-[0.95rem]" : "text-[1.35rem]";
  return (
    <div className={`wordmark ${className}`}>
      <span className={`wordmark-text ${textSize}`}>Adopt</span>
      <BrandMark size={size} />
      <span className={`wordmark-text ${textSize}`}>Luck</span>
    </div>
  );
}

export function Brand({ compact }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex h-fit min-w-0 items-center" aria-label="Adopt Luck">
      <Wordmark size={compact ? 22 : 30} />
    </Link>
  );
}

