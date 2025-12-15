import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type AppLoaderProps = {
  label?: string;
  className?: string;
};

function AppLoader({ label = "Loading", className }: AppLoaderProps) {
  return (
    <div
      aria-busy
      aria-label={label}
      className={cn(
        "flex min-h-dvh items-center justify-center bg-background px-6 py-8",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border/60 bg-card px-6 py-5 shadow-sm">
        <div className="flex items-center gap-3" aria-live="polite">
          <Spinner className="size-5 text-primary" />
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <div className="flex w-full flex-col gap-2">
          <Skeleton className="h-2 w-48" />
          <Skeleton className="h-2 w-40" />
        </div>
      </div>
    </div>
  );
}

export { AppLoader };








