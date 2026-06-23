import { cn } from '../lib/utils';

export function Skeleton({ className }) {
  return (
    <div
      className={cn('animate-pulse bg-gray-200 rounded', className)}
      aria-hidden="true"
    />
  );
}

export function TableRowSkeleton({ columns = 5 }) {
  return (
    <tr className="border-b border-gray-100">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-24 mb-2" />
      <Skeleton className="h-7 w-32" />
    </div>
  );
}

export function TableEmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="p-12 text-center">
      {Icon && (
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
          <Icon size={20} strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-sm font-bold text-gray-900 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">{description}</p>}
      {action}
    </div>
  );
}

export default Skeleton;
