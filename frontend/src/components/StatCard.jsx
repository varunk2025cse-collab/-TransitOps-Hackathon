export default function StatCard({ title, value, subtitle, icon: Icon, color = 'brand', trend }) {
  const colorMap = {
    brand: 'from-brand-500 to-brand-700',
    green: 'from-emerald-500 to-emerald-700',
    amber: 'from-amber-500 to-amber-700',
    red: 'from-red-500 to-red-700',
    purple: 'from-purple-500 to-purple-700',
    cyan: 'from-cyan-500 to-cyan-700',
  };

  return (
    <div className="card group animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-extrabold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          {trend && (
            <p className={`text-xs font-semibold mt-2 ${trend > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </p>
          )}
        </div>
        {Icon && (
          <div
            className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
          >
            <Icon className="w-6 h-6 text-white" />
          </div>
        )}
      </div>
    </div>
  );
}
