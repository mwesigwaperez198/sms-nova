interface NovaraLogoProps {
  size?: number;
  variant?: "white" | "black" | "auto";
  className?: string;
}

export function NovaraLogo({ size = 32, variant = "white", className }: NovaraLogoProps) {
  const src = variant === "black"
    ? "/novara-black-logo.png"
    : "/novara-white-logo.png";

  return (
    <img
      src={src}
      alt="NOVARA"
      width={size}
      height={size}
      className={className}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        display: "block",
        flexShrink: 0,
      }}
    />
  );
}
