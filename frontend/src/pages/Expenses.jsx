import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { expensesAPI, vehiclesAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { HiPlus, HiOutlineRefresh } from 'react-icons/hi';

const CATEGORIES = [
  { value: 'toll', label: 'Toll' },
  { value: 'parking', label: 'Parking' },
  { value: 'fine', label: 'Fine' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other' },
];

const defaultForm = { vehicle_id: '', date: '', category: 'toll', amount: '', description: '' };

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eRes, vRes] = await Promise.all([expensesAPI.getAll(), vehiclesAPI.getAll()]);
      setExpenses(eRes.data?.data || []);
      setVehicles(vRes.data?.data || []);
    } catch (err) {
      toast.error('Failed to load expenses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vehicle_id || !form.amount) return toast.error('Vehicle and amount are required.');
    setSaving(true);
    try {
      await expensesAPI.create({
        vehicle_id: parseInt(form.vehicle_id),
        date: form.date || new Date().toISOString().split('T')[0],
        category: form.category,
        amount: parseFloat(form.amount),
        description: form.description,
      });
      toast.success('Expense recorded!');
      setModalOpen(false);
      setForm(defaultForm);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record expense.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track tolls, fines, insurance, and other costs</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="btn-secondary flex items-center gap-2"><HiOutlineRefresh className="w-4 h-4" /> Refresh</button>
          <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2" id="add-expense-btn"><HiPlus className="w-4 h-4" /> Add Expense</button>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Vehicle</th>
              <th className="text-left px-6 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Date</th>
              <th className="text-left px-6 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Category</th>
              <th className="text-left px-6 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Amount (₹)</th>
              <th className="text-left px-6 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Description</th>
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
            ) : expenses.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-16 text-gray-400">No expenses recorded yet.</td></tr>
            ) : (
              expenses.map((ex) => (
                <tr key={ex.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-gray-900">{ex.vehicle_name}</td>
                  <td className="px-6 py-4 text-gray-600">{ex.date}</td>
                  <td className="px-6 py-4 capitalize text-gray-600">{ex.category}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900">₹{(ex.amount || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{ex.description || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Record Expense">
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
              <label className="label-text">Category</label>
              <select name="category" value={form.category} onChange={handleChange} className="select-field">
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Amount (₹) *</label>
              <input name="amount" type="number" value={form.amount} onChange={handleChange} className="input-field" placeholder="500" />
            </div>
            <div>
              <label className="label-text">Date</label>
              <input name="date" type="date" value={form.date} onChange={handleChange} className="input-field" />
            </div>
          </div>
          <div>
            <label className="label-text">Description</label>
            <input name="description" value={form.description} onChange={handleChange} className="input-field" placeholder="Highway toll booth" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary" id="submit-expense-btn">
              {saving ? 'Saving...' : 'Record Expense'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
