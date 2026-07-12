import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { vehiclesAPI, driversAPI, tripsAPI } from '../services/api';
import { HiOutlineLightningBolt, HiExclamation } from 'react-icons/hi';

export default function Dispatch() {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [form, setForm] = useState({
    source: '', destination: '', vehicle_id: '', driver_id: '',
    cargo_weight: '', planned_distance: '', revenue: '',
  });
  const [weightWarning, setWeightWarning] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vRes, dRes] = await Promise.all([vehiclesAPI.getAll(), driversAPI.getAll()]);
        setVehicles(vRes.data?.data || []);
        setDrivers(dRes.data?.data || []);
      } catch (err) {
        toast.error('Failed to load dispatch data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter for available-only assets
  const availableVehicles = vehicles.filter((v) => v.status === 'available');
  const availableDrivers = drivers.filter((d) => d.status === 'available' && !d.is_license_expired);

  const handleChange = (e) => {
    const updated = { ...form, [e.target.name]: e.target.value };
    setForm(updated);

    // Live weight validation
    if (e.target.name === 'cargo_weight' || e.target.name === 'vehicle_id') {
      const weight = parseFloat(updated.cargo_weight) || 0;
      const vehicle = vehicles.find((v) => v.id === parseInt(updated.vehicle_id));
      if (vehicle && weight > vehicle.max_capacity) {
        setWeightWarning(`⚠ Weight (${weight} kg) exceeds ${vehicle.name} capacity (${vehicle.max_capacity} kg)`);
      } else {
        setWeightWarning('');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.source || !form.destination || !form.vehicle_id || !form.driver_id || !form.cargo_weight) {
      return toast.error('All required fields must be filled.');
    }
    if (weightWarning) {
      return toast.error('Cargo weight exceeds vehicle capacity!');
    }
    setDispatching(true);
    try {
      const payload = {
        source: form.source,
        destination: form.destination,
        vehicle_id: parseInt(form.vehicle_id),
        driver_id: parseInt(form.driver_id),
        cargo_weight: parseFloat(form.cargo_weight),
        planned_distance: parseFloat(form.planned_distance) || 0,
        revenue: parseFloat(form.revenue) || 0,
      };
      const res = await tripsAPI.dispatch(payload);
      const data = res.data;
      if (data.status === 'success') {
        toast.success(`🚀 Trip ${data.data?.name || ''} dispatched! Assets locked.`);
        setForm({ source: '', destination: '', vehicle_id: '', driver_id: '', cargo_weight: '', planned_distance: '', revenue: '' });
        // Refresh available lists
        const [vRes, dRes] = await Promise.all([vehiclesAPI.getAll(), driversAPI.getAll()]);
        setVehicles(vRes.data?.data || []);
        setDrivers(dRes.data?.data || []);
      } else {
        toast.error(data.message || 'Dispatch failed.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Dispatch failed. Check business rules.';
      toast.error(msg);
    } finally {
      setDispatching(false);
    }
  };

  const selectedVehicle = vehicles.find((v) => v.id === parseInt(form.vehicle_id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Dispatch Center</h1>
        <p className="text-sm text-gray-500 mt-0.5">Create and dispatch trips with smart validation</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dispatch Form */}
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <HiOutlineLightningBolt className="w-5 h-5 text-brand-600" />
              New Trip Dispatch
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Source Location *</label>
                  <input name="source" value={form.source} onChange={handleChange} className="input-field" placeholder="Warehouse A" />
                </div>
                <div>
                  <label className="label-text">Destination *</label>
                  <input name="destination" value={form.destination} onChange={handleChange} className="input-field" placeholder="Client B" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Vehicle *</label>
                  <select name="vehicle_id" value={form.vehicle_id} onChange={handleChange} className="select-field" id="dispatch-vehicle-select">
                    <option value="">Select Vehicle</option>
                    {availableVehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.registration_number} — {v.name} ({v.max_capacity} kg)
                      </option>
                    ))}
                  </select>
                  {availableVehicles.length === 0 && !loading && (
                    <p className="text-xs text-amber-600 mt-1">No vehicles available for dispatch.</p>
                  )}
                </div>
                <div>
                  <label className="label-text">Driver *</label>
                  <select name="driver_id" value={form.driver_id} onChange={handleChange} className="select-field" id="dispatch-driver-select">
                    <option value="">Select Driver</option>
                    {availableDrivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} (Safety: {d.safety_score})
                      </option>
                    ))}
                  </select>
                  {availableDrivers.length === 0 && !loading && (
                    <p className="text-xs text-amber-600 mt-1">No eligible drivers available.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label-text">Cargo Weight (kg) *</label>
                  <input name="cargo_weight" type="number" value={form.cargo_weight} onChange={handleChange} className={`input-field ${weightWarning ? 'ring-2 ring-red-400 border-red-400' : ''}`} placeholder="450" />
                  {weightWarning && (
                    <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                      <HiExclamation className="w-3.5 h-3.5" /> {weightWarning}
                    </p>
                  )}
                </div>
                <div>
                  <label className="label-text">Planned Distance (km)</label>
                  <input name="planned_distance" type="number" value={form.planned_distance} onChange={handleChange} className="input-field" placeholder="120" />
                </div>
                <div>
                  <label className="label-text">Revenue (₹)</label>
                  <input name="revenue" type="number" value={form.revenue} onChange={handleChange} className="input-field" placeholder="15000" />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={dispatching || !!weightWarning}
                  className="btn-primary flex items-center gap-2 text-base px-8 py-3"
                  id="dispatch-submit-btn"
                >
                  {dispatching ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Dispatching...
                    </>
                  ) : (
                    <>
                      <HiOutlineLightningBolt className="w-5 h-5" /> Dispatch Trip
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Vehicle Info Panel */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-bold text-gray-900 mb-3">Selected Vehicle</h3>
            {selectedVehicle ? (
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-500">Name:</span> <span className="font-semibold">{selectedVehicle.name}</span></p>
                <p><span className="text-gray-500">Reg:</span> <span className="font-mono">{selectedVehicle.registration_number}</span></p>
                <p><span className="text-gray-500">Type:</span> <span className="capitalize">{selectedVehicle.vehicle_type}</span></p>
                <p><span className="text-gray-500">Max Capacity:</span> <span className="font-bold text-brand-600">{selectedVehicle.max_capacity} kg</span></p>
                <p><span className="text-gray-500">Odometer:</span> {selectedVehicle.odometer?.toLocaleString()} km</p>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Select a vehicle to see details.</p>
            )}
          </div>

          <div className="card bg-gradient-to-br from-brand-50 to-white">
            <h3 className="font-bold text-brand-800 mb-2 text-sm">💡 Smart Dispatch Rules</h3>
            <ul className="text-xs text-brand-700 space-y-1.5">
              <li>• Only <span className="font-semibold">Available</span> vehicles shown</li>
              <li>• Expired/Suspended drivers hidden</li>
              <li>• Cargo weight validated in real-time</li>
              <li>• Assets auto-lock on dispatch</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
