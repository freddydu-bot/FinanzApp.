import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getMonthName } from '../../utils/formatters';
import './TopBar.css';

export default function TopBar({ onMenuClick }) {
  const { logout, isDemoMode } = useAuth();
  const { selectedMonth, selectedYear, setSelectedMonth, setSelectedYear } = useData();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="topbar glass--subtle">
      <div className="topbar__left">
        <button className="topbar__menu-btn" onClick={onMenuClick} id="mobile-menu-btn">
          ☰
        </button>
        <div className="topbar__period">
          <button
            className="topbar__period-arrow"
            onClick={() => {
              if (selectedMonth === 1) {
                setSelectedMonth(12);
                setSelectedYear(selectedYear - 1);
              } else {
                setSelectedMonth(selectedMonth - 1);
              }
            }}
            id="prev-month-btn"
          >
            ‹
          </button>
          <span className="topbar__period-label">
            {getMonthName(selectedMonth)} {selectedYear}
          </span>
          <button
            className="topbar__period-arrow"
            onClick={() => {
              if (selectedMonth === 12) {
                setSelectedMonth(1);
                setSelectedYear(selectedYear + 1);
              } else {
                setSelectedMonth(selectedMonth + 1);
              }
            }}
            id="next-month-btn"
          >
            ›
          </button>
        </div>
      </div>

      <div className="topbar__right">
        {isDemoMode && (
          <span className="glass-tag glass-tag--warning">DEMO</span>
        )}
        <button
          className="topbar__icon-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          id="theme-toggle-btn"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button
          className="topbar__icon-btn"
          onClick={logout}
          title="Cerrar sesión"
          id="logout-btn"
        >
          🚪
        </button>
      </div>
    </header>
  );
}
