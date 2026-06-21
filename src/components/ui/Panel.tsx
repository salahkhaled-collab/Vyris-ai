import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-panel border border-line rounded-2xl", className)}>
      {children}
    </div>
  );
}
