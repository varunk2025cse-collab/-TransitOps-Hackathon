import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import useStore from '../store/useStore';
import { HiMenuAlt2 } from 'react-icons/hi';

export default function Layout() {
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const toggleSidebar = useStore((s) => s.toggleSidebar);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center px-6 gap-4 shrink-0">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            id="toggle-sidebar-btn"
          >
            <HiMenuAlt2 className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-sm font-bold shadow-md">
              T
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
