import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { maintenanceAPI, vehiclesAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { HiPlus, HiOutlineRefresh, HiCheck } from 'react-icons/hi';

const MAINT_TYPES = [
  { value: 'preventive', label: 'Preventive' },
  { value: 'corrective', label: 'Corrective' },
  { value: 'emergency', label: 'Emergency' },
];

const defaultForm = { vehicle_id: '', description: '', maintenance_type: 'corrective', cost: '', date: '' };

export default function Maintenance() {
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mRes, vRes] = await Promise.all([maintenanceAPI.getAll(), vehiclesAPI.getAll()]);
      setLogs(mRes.data?.data || []);
      setVehicles(vRes.data?.data || []);
    } catch (err) {
      toast.error('Failed to load maintenance data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vehicle_id || !form.description) return toast.error('Vehicle and description are required.');
    setSaving(true);
    try {
      await maintenanceAPI.create({
        vehicle_id: parseInt(form.vehicle_id),
        description: form.description,
        maintenance_type: form.maintenance_type,
        cost: parseFloat(form.cost) || 0,
        date: form.date || new Date().toISOString().split('T')[0],
      });
      toast.success('Maintenance log created. Vehicle is now In Shop.');
      setModalOpen(false);
      setForm(defaultForm);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create maintenance log.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async (logId) => {
    try {
      await maintenanceAPI.close(logId);
      toast.success('Maintenance closed. Vehicle is now Available.');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to close maintenance.');
    }
  };

  const eligibleVehicles = vehicles.filter((v) => v.status === 'available' || v.status === 'in_shop');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Maintenance</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track vehicle maintenance and shop status</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="btn-secondary flex items-center gap-2"><HiOutlineRefresh className="w-4 h-4" /> Refresh</button>
          <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2" id="add-maintenance-btn"><HiPlus className="w-4 h-4" /> Log Maintenance</button>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Vehicle</th>
              <th className="text-left px-6 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Date</th>
              <th className="text-left px-6 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Type</th>
              <th className="text-left px-6 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Description</th>
              <th className="text-left px-6 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Cost (₹)</th>
              <th className="text-left px-6 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Status</th>
              <th className="text-left px-6 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(3)].map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-20" /></td>
                  ))}
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-16 text-gray-400">No maintenance logs yet.</td></tr>
            ) : (
              logs.map((m) => (
                <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-gray-900">{m.vehicle_reg || m.vehicle_name}</td>
                  <td className="px-6 py-4 text-gray-600">{m.date}</td>
                  <td className="px-6 py-4"><StatusBadge status={m.maintenance_type} /></td>
                  <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{m.description}</td>
                  <td className="px-6 py-4 text-gray-600">₹{(m.cost || 0).toLocaleString()}</td>
                  <td className="px-6 py-4"><StatusBadge status={m.status} /></td>
                  <td className="px-6 py-4">
                    {m.status === 'active' && (
                      <button
                        onClick={() => handleClose(m.id)}
                        className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-emerald-100 transition-colors flex items-center gap-1"
                      >
                        <HiCheck className="w-3.5 h-3.5" /> Close
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Log Maintenance">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Vehicle *</label>
              <select name="vehicle_id" value={form.vehicle_id} onChange={handleChange} className="select-field">
                <option value="">Select Vehicle</option>
                {eligibleVehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.registration_number} — {v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-text">Type</label>
              <select name="maintenance_type" value={form.maintenance_type} onChange={handleChange} className="select-field">
                {MAINT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label-text">Description *</label>
            <textarea name="description" value={form.description} onChange={handleChange} className="input-field" rows={3} placeholder="Oil change, brake inspection, etc." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Cost (₹)</label>
              <input name="cost" type="number" value={form.cost} onChange={handleChange} className="input-field" placeholder="5000" />
            </div>
            <div>
              <label className="label-text">Date</label>
              <input name="date" type="date" value={form.date} onChange={handleChange} className="input-field" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary" id="submit-maintenance-btn">
              {saving ? 'Saving...' : 'Log Maintenance'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
