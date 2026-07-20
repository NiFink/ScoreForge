import { getPlayerEmoji } from "@/lib/colors";

type PlayerAvatarProps = {
  color: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const sizeClasses: Record<NonNullable<PlayerAvatarProps["size"]>, string> = {
  sm: "w-5 h-5 text-[11px]",
  md: "w-6 h-6 text-sm",
  lg: "w-7 h-7 text-base",
  xl: "w-8 h-8 text-lg",
};

// Tier-Emoji auf einem Badge in der Spielerfarbe - ersetzt die frühere
// flache Farbkreis-Emoji-Darstellung.
export function PlayerAvatar({ color, size = "md", className }: PlayerAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex flex-none items-center justify-center rounded-full leading-none ${sizeClasses[size]} ${className ?? ""}`}
      style={{ backgroundColor: color }}
    >
      {getPlayerEmoji(color)}
    </span>
  );
}
