import { useState, useEffect } from 'react';
import { dashboardAPI } from '../services/api';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import {
  HiOutlineTruck,
  HiOutlineUserGroup,
  HiOutlineLocationMarker,
  HiOutlineCurrencyDollar,
  HiOutlineChartBar,
  HiOutlineShieldCheck,
} from 'react-icons/hi';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const PIE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#6b7280'];

export default function Dashboard() {
  const [kpi, setKpi] = useState(null);
  const [charts, setCharts] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [kpiRes, chartsRes, healthRes] = await Promise.all([
          dashboardAPI.getKPI(),
          dashboardAPI.getCharts(),
          dashboardAPI.getFleetHealth(),
        ]);
        setKpi(kpiRes.data?.data || kpiRes.data);
        setCharts(chartsRes.data?.data || chartsRes.data);
        setHealth(healthRes.data?.data || healthRes.data);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-2xl h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-gray-200 rounded-2xl h-80" />
          <div className="bg-gray-200 rounded-2xl h-80" />
        </div>
      </div>
    );
  }

  const vehicleStatusData = charts?.vehicle_status_distribution
    ? Object.entries(charts.vehicle_status_distribution).map(([key, val]) => ({
        name: key.replace(/_/g, ' '),
        value: val,
      }))
    : [];

  const tripTrendData = charts?.trip_trend?.map((t) => ({
    name: t.name,
    distance: t.distance || 0,
    revenue: t.revenue || 0,
  })) || [];

  const healthScore = health?.score ?? 100;
  const healthColor =
    healthScore >= 80 ? 'text-emerald-600' : healthScore >= 50 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Real-time fleet operations overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Fleet Utilization"
          value={`${kpi?.fleet_utilization ?? 0}%`}
          subtitle={`${kpi?.on_trip_vehicles ?? 0} of ${kpi?.total_vehicles ?? 0} active`}
          icon={HiOutlineChartBar}
          color="brand"
        />
        <StatCard
          title="Active Trips"
          value={kpi?.active_trips ?? 0}
          subtitle={`${kpi?.completed_trips ?? 0} completed total`}
          icon={HiOutlineLocationMarker}
          color="green"
        />
        <StatCard
          title="Drivers on Duty"
          value={kpi?.on_duty_drivers ?? 0}
          subtitle={`${kpi?.available_drivers ?? 0} available`}
          icon={HiOutlineUserGroup}
          color="purple"
        />
        <StatCard
          title="Operational Cost"
          value={`₹${(kpi?.total_operational_cost ?? 0).toLocaleString()}`}
          subtitle={`Revenue: ₹${(kpi?.total_revenue ?? 0).toLocaleString()}`}
          icon={HiOutlineCurrencyDollar}
          color="amber"
        />
      </div>

      {/* Second Row: Fleet Health + Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Fleet Health Score */}
        <div className="card col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <HiOutlineShieldCheck className="w-5 h-5 text-brand-600" />
            <h3 className="font-bold text-gray-900">Fleet Health Score</h3>
          </div>
          <div className="text-center py-4">
            <p className={`text-6xl font-extrabold ${healthColor}`}>{healthScore}</p>
            <p className="text-sm text-gray-500 mt-1">out of 100</p>
          </div>
          {health?.alerts?.length > 0 && (
            <div className="space-y-2 mt-4">
              {health.alerts.map((a, i) => (
                <div
                  key={i}
                  className={`px-3 py-2 rounded-lg text-xs font-medium ${
                    a.type === 'critical'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {a.message}
                </div>
              ))}
            </div>
          )}
          {health?.recommendations?.length > 0 && (
            <div className="mt-4 space-y-1">
              <p className="text-xs font-semibold text-gray-500 uppercase">Recommendations</p>
              {health.recommendations.map((r, i) => (
                <p key={i} className="text-xs text-gray-600">• {r}</p>
              ))}
            </div>
          )}
        </div>

        {/* Vehicle Status Chart */}
        <div className="card col-span-1">
          <h3 className="font-bold text-gray-900 mb-4">Vehicle Status Distribution</h3>
          {vehicleStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={vehicleStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {vehicleStatusData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-16">No vehicle data yet.</p>
          )}
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {vehicleStatusData.map((d, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                />
                <span className="capitalize text-gray-600">{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trip Revenue Trend */}
        <div className="card col-span-1">
          <h3 className="font-bold text-gray-900 mb-4">Recent Trip Revenue</h3>
          {tripTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={tripTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  }}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-16">No completed trips yet.</p>
          )}
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-extrabold text-gray-900">{kpi?.available_vehicles ?? 0}</p>
          <p className="text-xs text-gray-500 mt-0.5">Available Vehicles</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-extrabold text-amber-600">{kpi?.in_shop_vehicles ?? 0}</p>
          <p className="text-xs text-gray-500 mt-0.5">In Maintenance</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-extrabold text-gray-900">₹{(kpi?.total_fuel_cost ?? 0).toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-0.5">Fuel Costs</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-extrabold text-gray-900">₹{(kpi?.total_maintenance_cost ?? 0).toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-0.5">Maintenance Costs</p>
        </div>
      </div>
    </div>
  );
}
