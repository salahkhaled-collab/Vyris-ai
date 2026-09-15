import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-panel border border-line rounded-2xl", className)} {...rest}>
      {children}
    </div>
  );
}
