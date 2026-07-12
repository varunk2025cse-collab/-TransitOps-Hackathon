import { NavLink, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import {
  HiOutlineViewGrid,
  HiOutlineTruck,
  HiOutlineUserGroup,
  HiOutlineLocationMarker,
  HiOutlineClipboardList,
  HiOutlineCog,
  HiOutlineBeaker,
  HiOutlineCurrencyDollar,
  HiOutlineLogout,
} from 'react-icons/hi';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: HiOutlineViewGrid },
  { to: '/vehicles', label: 'Vehicles', icon: HiOutlineTruck },
  { to: '/drivers', label: 'Drivers', icon: HiOutlineUserGroup },
  { to: '/dispatch', label: 'Dispatch', icon: HiOutlineLocationMarker },
  { to: '/trips', label: 'Trips', icon: HiOutlineClipboardList },
  { to: '/maintenance', label: 'Maintenance', icon: HiOutlineWrench },
  { to: '/fuel-logs', label: 'Fuel Logs', icon: HiOutlineBeaker },
  { to: '/expenses', label: 'Expenses', icon: HiOutlineCurrencyDollar },
];

export default function Sidebar() {
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const logout = useStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      className={`fixed top-0 left-0 h-full bg-white border-r border-gray-100 z-30 transition-all duration-300 flex flex-col ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-5 gap-3 border-b border-gray-100 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-extrabold text-lg shadow-lg shrink-0">
          T
        </div>
        {sidebarOpen && (
          <div className="animate-fade-in">
            <h1 className="text-lg font-bold text-gray-900 leading-none">TransitOps</h1>
            <p className="text-[10px] font-medium text-brand-600 tracking-wider uppercase">AI Fleet Intelligence</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-brand-50 text-brand-700 shadow-sm'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span className="animate-fade-in">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200 w-full"
          id="logout-btn"
        >
          <HiOutlineLogout className="w-5 h-5 shrink-0" />
          {sidebarOpen && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
