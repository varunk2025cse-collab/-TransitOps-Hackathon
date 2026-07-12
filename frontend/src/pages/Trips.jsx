import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { tripsAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { HiOutlineRefresh, HiCheck, HiX } from 'react-icons/hi';

export default function Trips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completeModal, setCompleteModal] = useState(null);
  const [endOdometer, setEndOdometer] = useState('');
  const [revenue, setRevenue] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const res = await tripsAPI.getAll();
      setTrips(res.data?.data || []);
    } catch (err) {
      toast.error('Failed to load trips.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTrips(); }, []);

  const handleComplete = async () => {
    if (!endOdometer) return toast.error('End odometer is required.');
    setSaving(true);
    try {
      await tripsAPI.complete(completeModal.id, {
        end_odometer: parseFloat(endOdometer),
        revenue: parseFloat(revenue) || completeModal.revenue || 0,
      });
      toast.success('Trip completed! Vehicle and driver released.');
      setCompleteModal(null);
      setEndOdometer('');
      setRevenue('');
      fetchTrips();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete trip.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (tripId) => {
    if (!confirm('Cancel this trip? This will release the vehicle and driver.')) return;
    try {
      await tripsAPI.cancel(tripId);
      toast.success('Trip cancelled. Assets released.');
      fetchTrips();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel trip.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Trips</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track all trip dispatches and completions</p>
        </div>
        <button onClick={fetchTrips} className="btn-secondary flex items-center gap-2"><HiOutlineRefresh className="w-4 h-4" /> Refresh</button>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Ref</th>
              <th className="text-left px-6 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Route</th>
              <th className="text-left px-6 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Vehicle</th>
              <th className="text-left px-6 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Driver</th>
              <th className="text-left px-6 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Weight</th>
              <th className="text-left px-6 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Revenue</th>
              <th className="text-left px-6 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Status</th>
              <th className="text-left px-6 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  {[...Array(8)].map((_, j) => (
                    <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-16" /></td>
                  ))}
                </tr>
              ))
            ) : trips.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-16 text-gray-400">No trips yet. Go to Dispatch to create one!</td></tr>
            ) : (
              trips.map((t) => (
                <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono font-semibold text-brand-700">{t.name}</td>
                  <td className="px-6 py-4 text-gray-700">{t.source} → {t.destination}</td>
                  <td className="px-6 py-4 text-gray-600">{t.vehicle_reg || t.vehicle_name}</td>
                  <td className="px-6 py-4 text-gray-600">{t.driver_name}</td>
                  <td className="px-6 py-4 text-gray-600">{t.cargo_weight} kg</td>
                  <td className="px-6 py-4 text-gray-600">₹{(t.revenue || 0).toLocaleString()}</td>
                  <td className="px-6 py-4"><StatusBadge status={t.status} /></td>
                  <td className="px-6 py-4">
                    {t.status === 'dispatched' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setCompleteModal(t); setRevenue(t.revenue || ''); }}
                          className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-emerald-100 transition-colors flex items-center gap-1"
                        >
                          <HiCheck className="w-3.5 h-3.5" /> Complete
                        </button>
                        <button
                          onClick={() => handleCancel(t.id)}
                          className="text-xs bg-red-50 text-red-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-red-100 transition-colors flex items-center gap-1"
                        >
                          <HiX className="w-3.5 h-3.5" /> Cancel
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Complete Trip Modal */}
      <Modal isOpen={!!completeModal} onClose={() => setCompleteModal(null)} title="Complete Trip">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Completing trip <span className="font-bold">{completeModal?.name}</span> from{' '}
            <span className="font-semibold">{completeModal?.source}</span> to{' '}
            <span className="font-semibold">{completeModal?.destination}</span>.
          </p>
          <div>
            <label className="label-text">Final Odometer Reading (km) *</label>
            <input type="number" value={endOdometer} onChange={(e) => setEndOdometer(e.target.value)} className="input-field" placeholder="12500" />
          </div>
          <div>
            <label className="label-text">Revenue (₹)</label>
            <input type="number" value={revenue} onChange={(e) => setRevenue(e.target.value)} className="input-field" placeholder="15000" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setCompleteModal(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleComplete} disabled={saving} className="btn-primary" id="complete-trip-btn">
              {saving ? 'Completing...' : 'Complete Trip'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
