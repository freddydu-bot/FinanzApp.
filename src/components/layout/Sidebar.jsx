import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Sidebar.css';

const navItems = [
  { path: '/', icon: '📊', label: 'Dashboard', id: 'nav-dashboard' },
  { path: '/incomes', icon: '💰', label: 'Ingresos', id: 'nav-incomes' },
  { path: '/expenses', icon: '💳', label: 'Gastos', id: 'nav-expenses' },
  { path: '/budgets', icon: '🎯', label: 'Presupuestos', id: 'nav-budgets' },
  { path: '/analytics', icon: '📈', label: 'Analítica', id: 'nav-analytics' },
  { path: '/categories', icon: '🏷️', label: 'Categorías', id: 'nav-categories' },
  { path: '/recurring', icon: '🔄', label: 'Recurrentes', id: 'nav-recurring' },
  { path: '/savings', icon: '📈', label: 'Ahorro e Inversión', id: 'nav-savings' },
  { path: '/settings', icon: '⚙️', label: 'Configuración', id: 'nav-settings' },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const { user, isDemoMode, switchDemoUser } = useAuth();

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={onMobileClose} />
      )}

      <aside
        className={`sidebar glass--sidebar ${collapsed ? 'sidebar--collapsed' : ''} ${mobileOpen ? 'sidebar--mobile-open' : ''}`}
      >
        {/* Logo */}
        <div className="sidebar__header">
          <div className="sidebar__logo">
            <span className="sidebar__logo-icon">💰</span>
            {!collapsed && <span className="sidebar__logo-text">FinanzApp</span>}
          </div>
          <button className="sidebar__toggle" onClick={onToggle} id="sidebar-toggle">
            {collapsed ? '→' : '←'}
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar__nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
              }
              onClick={onMobileClose}
              id={item.id}
              title={item.label}
            >
              <span className="sidebar__link-icon">{item.icon}</span>
              {!collapsed && <span className="sidebar__link-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="sidebar__footer">
          {isDemoMode && !collapsed && (
            <button className="sidebar__demo-switch" onClick={switchDemoUser} id="demo-switch-btn">
              🔄 Cambiar usuario demo
            </button>
          )}
          <div className="sidebar__user" title={user?.email}>
            <div className="sidebar__user-avatar">
              {user?.display_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            {!collapsed && (
              <div className="sidebar__user-info">
                <span className="sidebar__user-name">{user?.display_name}</span>
                <span className="sidebar__user-email">{user?.email}</span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
