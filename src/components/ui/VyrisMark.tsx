import { cn } from "@/lib/utils";

const sizes = {
  sm: "text-lg w-6 h-6",
  md: "text-2xl w-8 h-8",
  lg: "text-3xl w-10 h-10",
};

export function VyrisMark({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-display font-bold text-brass leading-none flex items-center justify-center shrink-0",
        sizes[size],
        className
      )}
      aria-hidden="true"
    >
      V
    </span>
  );
}
