import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { vehiclesAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { HiPlus, HiOutlineRefresh } from 'react-icons/hi';

const VEHICLE_TYPES = [
  { value: 'truck', label: 'Truck' },
  { value: 'van', label: 'Van' },
  { value: 'car', label: 'Car' },
];

const defaultForm = {
  name: '', registration_number: '', vehicle_type: 'van',
  max_capacity: '', odometer: '', acquisition_cost: '',
};

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await vehiclesAPI.getAll();
      setVehicles(res.data?.data || []);
    } catch (err) {
      toast.error('Failed to load vehicles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVehicles(); }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.registration_number || !form.max_capacity) {
      return toast.error('Name, Reg Number, and Capacity are required.');
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        max_capacity: parseFloat(form.max_capacity),
        odometer: parseFloat(form.odometer) || 0,
        acquisition_cost: parseFloat(form.acquisition_cost) || 0,
      };
      await vehiclesAPI.create(payload);
      toast.success('Vehicle registered successfully!');
      setModalOpen(false);
      setForm(defaultForm);
      fetchVehicles();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create vehicle.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Vehicles</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your fleet assets</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchVehicles} className="btn-secondary flex items-center gap-2" id="refresh-vehicles-btn">
            <HiOutlineRefresh className="w-4 h-4" /> Refresh
          </button>
          <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2" id="add-vehicle-btn">
            <HiPlus className="w-4 h-4" /> Add Vehicle
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Reg No</th>
              <th className="text-left px-6 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Name</th>
              <th className="text-left px-6 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Type</th>
              <th className="text-left px-6 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Capacity (kg)</th>
              <th className="text-left px-6 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Odometer</th>
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
            ) : vehicles.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-16 text-gray-400">No vehicles registered yet. Add your first vehicle!</td></tr>
            ) : (
              vehicles.map((v) => (
                <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono font-semibold text-gray-900">{v.registration_number}</td>
                  <td className="px-6 py-4 text-gray-700">{v.name}</td>
                  <td className="px-6 py-4 capitalize text-gray-600">{v.vehicle_type}</td>
                  <td className="px-6 py-4 text-gray-600">{v.max_capacity}</td>
                  <td className="px-6 py-4 text-gray-600">{v.odometer?.toLocaleString()} km</td>
                  <td className="px-6 py-4"><StatusBadge status={v.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Vehicle Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Register New Vehicle">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Vehicle Name</label>
              <input name="name" value={form.name} onChange={handleChange} className="input-field" placeholder="e.g. Ford Transit" />
            </div>
            <div>
              <label className="label-text">Registration Number</label>
              <input name="registration_number" value={form.registration_number} onChange={handleChange} className="input-field" placeholder="e.g. KA-01-AB-1234" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Vehicle Type</label>
              <select name="vehicle_type" value={form.vehicle_type} onChange={handleChange} className="select-field">
                {VEHICLE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label-text">Max Capacity (kg)</label>
              <input name="max_capacity" type="number" value={form.max_capacity} onChange={handleChange} className="input-field" placeholder="500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Current Odometer (km)</label>
              <input name="odometer" type="number" value={form.odometer} onChange={handleChange} className="input-field" placeholder="0" />
            </div>
            <div>
              <label className="label-text">Acquisition Cost (₹)</label>
              <input name="acquisition_cost" type="number" value={form.acquisition_cost} onChange={handleChange} className="input-field" placeholder="500000" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary" id="submit-vehicle-btn">
              {saving ? 'Saving...' : 'Register Vehicle'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
