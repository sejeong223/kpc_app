import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

export function PageHeader({
  title,
  description,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("space-y-1", className)}>
      <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
        {title}
      </h1>
      {description && (
        <p className="text-sm text-muted-foreground lg:text-base">
          {description}
        </p>
      )}
    </header>
  );
}
