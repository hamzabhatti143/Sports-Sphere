interface LoadingSkeletonProps {
  lines?: number;
  height?: string;
  className?: string;
}

export default function LoadingSkeleton({
  lines = 3,
  height = 'h-4',
  className = '',
}: LoadingSkeletonProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`${height} bg-line rounded-md animate-pulse`}
          style={{ width: i === lines - 1 ? '70%' : '100%' }}
        />
      ))}
    </div>
  );
}

export function SlotCardSkeleton() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="h-5 bg-line rounded-md w-1/3 mb-4" />
      <div className="h-6 bg-line rounded-md w-3/4 mb-3" />
      <div className="h-4 bg-line rounded-md w-1/2 mb-2" />
      <div className="h-4 bg-line rounded-md w-2/3 mb-5" />
      <div className="h-10 bg-line rounded-lg w-full" />
    </div>
  );
}

export function SlotGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SlotCardSkeleton key={i} />
      ))}
    </div>
  );
}
