import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { fuelLogsAPI, vehiclesAPI } from '../services/api';
import Modal from '../components/Modal';
import { HiPlus, HiOutlineRefresh } from 'react-icons/hi';

const defaultForm = { vehicle_id: '', date: '', liters: '', cost: '', odometer_at_fill: '', notes: '' };

export default function FuelLogs() {
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fRes, vRes] = await Promise.all([fuelLogsAPI.getAll(), vehiclesAPI.getAll()]);
      setLogs(fRes.data?.data || []);
      setVehicles(vRes.data?.data || []);
    } catch (err) {
      toast.error('Failed to load fuel logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vehicle_id || !form.liters || !form.cost) return toast.error('Vehicle, liters, and cost are required.');
    setSaving(true);
    try {
      await fuelLogsAPI.create({
        vehicle_id: parseInt(form.vehicle_id),
        date: form.date || new Date().toISOString().split('T')[0],
        liters: parseFloat(form.liters),
        cost: parseFloat(form.cost),
        odometer_at_fill: parseFloat(form.odometer_at_fill) || 0,
        notes: form.notes,
      });
      toast.success('Fuel log added!');
      setModalOpen(false);
      setForm(defaultForm);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add fuel log.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Fuel Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track fuel consumption and costs</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="btn-secondary flex items-center gap-2"><HiOutlineRefresh className="w-4 h-4" /> Refresh</button>
          <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2" id="add-fuel-btn"><HiPlus className="w-4 h-4" /> Add Fuel Log</button>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Vehicle</th>
              <th className="text-left px-6 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Date</th>
              <th className="text-left px-6 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Liters</th>
              <th className="text-left px-6 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Cost (₹)</th>
              <th className="text-left px-6 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Odometer</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(3)].map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  {[...Array(5)].map((_, j) => (
                    <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-20" /></td>
                  ))}
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-16 text-gray-400">No fuel logs yet.</td></tr>
            ) : (
              logs.map((f) => (
                <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-gray-900">{f.vehicle_name}</td>
                  <td className="px-6 py-4 text-gray-600">{f.date}</td>
                  <td className="px-6 py-4 text-gray-600">{f.liters} L</td>
                  <td className="px-6 py-4 text-gray-600">₹{(f.cost || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-gray-600">{f.odometer_at_fill ? `${f.odometer_at_fill.toLocaleString()} km` : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Fuel Log">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Vehicle *</label>
              <select name="vehicle_id" value={form.vehicle_id} onChange={handleChange} className="select-field">
                <option value="">Select Vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.registration_number} — {v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-text">Date</label>
              <input name="date" type="date" value={form.date} onChange={handleChange} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label-text">Liters *</label>
              <input name="liters" type="number" step="0.1" value={form.liters} onChange={handleChange} className="input-field" placeholder="40" />
            </div>
            <div>
              <label className="label-text">Cost (₹) *</label>
              <input name="cost" type="number" value={form.cost} onChange={handleChange} className="input-field" placeholder="4000" />
            </div>
            <div>
              <label className="label-text">Odometer</label>
              <input name="odometer_at_fill" type="number" value={form.odometer_at_fill} onChange={handleChange} className="input-field" placeholder="12000" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary" id="submit-fuel-btn">
              {saving ? 'Saving...' : 'Add Fuel Log'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
