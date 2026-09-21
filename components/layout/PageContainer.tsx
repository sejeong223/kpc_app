import { cn } from "@/lib/utils";

type PageContainerMaxWidth = "7xl" | "full";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: PageContainerMaxWidth;
}

export function PageContainer({
  children,
  className,
  maxWidth = "7xl",
}: PageContainerProps) {
  return (
    <div className={cn("min-h-full bg-muted/30 p-6", className)}>
      <div
        className={cn(
          "mx-auto flex w-full flex-col space-y-6",
          maxWidth === "full" ? "max-w-full" : "max-w-7xl",
        )}
      >
        {children}
      </div>
    </div>
  );
}
