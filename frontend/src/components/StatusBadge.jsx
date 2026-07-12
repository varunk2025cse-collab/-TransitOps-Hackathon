export default function StatusBadge({ status }) {
  const styles = {
    available: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    on_trip: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    in_shop: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    retired: 'bg-gray-100 text-gray-600 ring-gray-500/20',
    off_duty: 'bg-gray-100 text-gray-600 ring-gray-500/20',
    suspended: 'bg-red-50 text-red-700 ring-red-600/20',
    draft: 'bg-gray-100 text-gray-600 ring-gray-500/20',
    dispatched: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    cancelled: 'bg-red-50 text-red-700 ring-red-600/20',
    active: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    closed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    preventive: 'bg-cyan-50 text-cyan-700 ring-cyan-600/20',
    corrective: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    emergency: 'bg-red-50 text-red-700 ring-red-600/20',
  };

  const label = (status || '').replace(/_/g, ' ');

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold capitalize ring-1 ring-inset ${
        styles[status] || 'bg-gray-100 text-gray-600 ring-gray-500/20'
      }`}
    >
      {label}
    </span>
  );
}
