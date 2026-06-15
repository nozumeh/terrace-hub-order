import { Star } from "lucide-react";

interface Props {
  avg: number | null;
  count: number;
  size?: "sm" | "md";
  className?: string;
}

export function RatingBadge({ avg, count, size = "sm", className = "" }: Props) {
  if (!avg || count === 0) {
    return (
      <span className={`inline-flex items-center gap-0.5 text-[11px] text-muted-foreground ${className}`}>
        <Star className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
        <span>Sin reseñas</span>
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-0.5 font-medium ${size === "sm" ? "text-[11px]" : "text-sm"} text-gold ${className}`}>
      <Star className={`fill-gold ${size === "sm" ? "h-3 w-3" : "h-4 w-4"}`} />
      <span>{avg.toFixed(1)}</span>
      <span className="text-muted-foreground">({count})</span>
    </span>
  );
}