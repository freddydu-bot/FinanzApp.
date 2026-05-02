import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider, useData } from './contexts/DataContext';
import { ToastProvider } from './contexts/ToastContext';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import IncomesPage from './pages/IncomesPage';
import ExpensesPage from './pages/ExpensesPage';
import BudgetsPage from './pages/BudgetsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import CategoriesPage from './pages/CategoriesPage';
import RecurringPage from './pages/RecurringPage';
import SavingsPage from './pages/SavingsPage';
import SettingsPage from './pages/SettingsPage';
import CopilotPage from './pages/CopilotPage';

function ProtectedLoader({ children }) {
  const { loading: dataLoading } = useData();
  
  if (dataLoading) {
    const handleReset = () => {
      localStorage.clear();
      window.location.reload();
    };

    return (
      <div className="loading-screen">
        <div className="loading-screen__spinner animate-spin">📊</div>
        <p>Sincronizando tus datos...</p>
        <button 
          onClick={handleReset}
          className="glass-btn text-xs mt-lg"
          style={{ opacity: 0.7, padding: '0.5rem 1rem' }}
        >
          ¿Tarda demasiado? Reestablecer App
        </button>
      </div>
    );
  }
  
  return <AppShell>{children}</AppShell>;
}

function ProtectedRoute({ children }) {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-screen__spinner animate-spin">🔐</div>
        <p>Verificando acceso...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DataProvider>
      <ProtectedLoader>{children}</ProtectedLoader>
    </DataProvider>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-screen__spinner animate-spin">💰</div>
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/incomes" element={<ProtectedRoute><IncomesPage /></ProtectedRoute>} />
      <Route path="/expenses" element={<ProtectedRoute><ExpensesPage /></ProtectedRoute>} />
      <Route path="/budgets" element={<ProtectedRoute><BudgetsPage /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
      <Route path="/categories" element={<ProtectedRoute><CategoriesPage /></ProtectedRoute>} />
      <Route path="/recurring" element={<ProtectedRoute><RecurringPage /></ProtectedRoute>} />
      <Route path="/savings" element={<ProtectedRoute><SavingsPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/copilot" element={<ProtectedRoute><CopilotPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
