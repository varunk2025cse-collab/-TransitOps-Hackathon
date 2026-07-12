import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { driversAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { HiPlus, HiOutlineRefresh, HiExclamation } from 'react-icons/hi';

const defaultForm = {
  name: '', license_number: '', license_category: '',
  license_expiry: '', contact_number: '', email: '', safety_score: '100',
};

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const res = await driversAPI.getAll();
      setDrivers(res.data?.data || []);
    } catch (err) {
      toast.error('Failed to load drivers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDrivers(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.license_number || !form.license_expiry) {
      return toast.error('Name, License Number, and Expiry are required.');
    }
    setSaving(true);
    try {
      await driversAPI.create({
        ...form,
        safety_score: parseInt(form.safety_score) || 100,
      });
      toast.success('Driver registered successfully!');
      setModalOpen(false);
      setForm(defaultForm);
      fetchDrivers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create driver.');
    } finally {
      setSaving(false);
    }
  };

  const getSafetyColor = (score) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Drivers</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage driver profiles and compliance</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchDrivers} className="btn-secondary flex items-center gap-2"><HiOutlineRefresh className="w-4 h-4" /> Refresh</button>
          <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2" id="add-driver-btn"><HiPlus className="w-4 h-4" /> Add Driver</button>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Name</th>
              <th className="text-left px-6 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">License</th>
              <th className="text-left px-6 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Expiry</th>
              <th className="text-left px-6 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Contact</th>
              <th className="text-left px-6 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Safety</th>
              <th className="text-left px-6 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-200 rounded animate-pulse w-20" /></td>
                  ))}
                </tr>
              ))
            ) : drivers.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-16 text-gray-400">No drivers registered yet.</td></tr>
            ) : (
              drivers.map((d) => (
                <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-gray-900 flex items-center gap-2">
                    {d.name}
                    {d.is_license_expired && <HiExclamation className="w-4 h-4 text-red-500" title="License expired!" />}
                  </td>
                  <td className="px-6 py-4 font-mono text-gray-600">{d.license_number}</td>
                  <td className="px-6 py-4 text-gray-600">{d.license_expiry}</td>
                  <td className="px-6 py-4 text-gray-600">{d.contact_number || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`font-bold ${getSafetyColor(d.safety_score)}`}>{d.safety_score}</span>
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={d.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Register New Driver">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Full Name</label>
              <input name="name" value={form.name} onChange={handleChange} className="input-field" placeholder="John Doe" />
            </div>
            <div>
              <label className="label-text">License Number</label>
              <input name="license_number" value={form.license_number} onChange={handleChange} className="input-field" placeholder="DL-12345" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">License Category</label>
              <input name="license_category" value={form.license_category} onChange={handleChange} className="input-field" placeholder="LMV/HMV" />
            </div>
            <div>
              <label className="label-text">License Expiry</label>
              <input name="license_expiry" type="date" value={form.license_expiry} onChange={handleChange} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Contact Number</label>
              <input name="contact_number" value={form.contact_number} onChange={handleChange} className="input-field" placeholder="+91 9876543210" />
            </div>
            <div>
              <label className="label-text">Safety Score (0–100)</label>
              <input name="safety_score" type="number" min="0" max="100" value={form.safety_score} onChange={handleChange} className="input-field" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary" id="submit-driver-btn">
              {saving ? 'Saving...' : 'Register Driver'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
