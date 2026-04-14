import { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency, getMonthName, formatPercent } from '../utils/formatters';
import { filterByPeriod, getSemaphoreStatus } from '../utils/calculations';
import './BudgetsPage.css';

const SEMAPHORE_COLORS = { 
  green: 'var(--color-success)', 
  orange: 'var(--color-warning)', 
  red: 'var(--color-danger)' 
};

export default function BudgetsPage() {
  const { user } = useAuth();
  const { partnership, categories, budgets, expenses, upsertBudget, selectedMonth, selectedYear } = useData();
  const toast = useToast();
  const [view, setView] = useState('personal');
  const [editingId, setEditingId] = useState(null);
  const [editAmount, setEditAmount] = useState('');

  const periodExpenses = useMemo(() => filterByPeriod(expenses, selectedMonth, selectedYear), [expenses, selectedMonth, selectedYear]);
  const periodBudgets = useMemo(() => budgets.filter((b) => b.month === selectedMonth && b.year === selectedYear), [budgets, selectedMonth, selectedYear]);

  const currentBudgets = useMemo(() => {
    let base = view === 'personal'
      ? periodBudgets.filter((b) => b.budget_type === 'personal' && b.user_id === user?.id)
      : periodBudgets.filter((b) => b.budget_type === 'shared');
    
    const savingCat = categories.find(c => c.name.toLowerCase().includes('ahorro'));
    if (savingCat && !base.find(b => b.category_id === savingCat.id)) {
      base.push({
        id: `auto-${savingCat.id}`,
        partnership_id: partnership?.id,
        category_id: savingCat.id,
        user_id: view === 'personal' ? user?.id : null,
        budget_type: view,
        amount: 0,
        month: selectedMonth,
        year: selectedYear
      });
    }
    return base;
  }, [periodBudgets, view, user, categories, partnership, selectedMonth, selectedYear]);

  const relevantExpenses = view === 'personal'
    ? periodExpenses.filter((e) => e.user_id === user?.id && e.expense_type === 'personal')
    : periodExpenses.filter((e) => e.expense_type === 'shared');

  const totalBudget = currentBudgets.reduce((s, b) => s + Number(b.amount), 0);
  const totalSpent = relevantExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalAvailable = totalBudget - totalSpent;
  const globalExecPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const getCategoryInfo = (catId) => categories.find((c) => c.id === catId) || { name: 'Otro', icon: '📦', color: '#94a3b8' };

  const startEdit = (budgetId, amount) => {
    setEditingId(budgetId);
    setEditAmount(String(amount));
  };

  const saveEdit = async (budget) => {
    const newAmount = Number(editAmount);
    if (newAmount < 0) { toast.warning('El monto debe ser positivo'); return; }
    try {
      await upsertBudget({ ...budget, amount: newAmount });
      toast.success('Presupuesto actualizado');
      setEditingId(null);
    } catch (error) {
      toast.error('Error al actualizar el presupuesto: ' + error.message);
    }
  };

  const addBudgetForCategory = async (catId) => {
    try {
      await upsertBudget({
        partnership_id: partnership.id,
        category_id: catId,
        user_id: view === 'personal' ? user.id : null,
        budget_type: view,
        amount: 0,
        month: selectedMonth,
        year: selectedYear,
      });
      setEditingId(null);
      toast.success('Categoría añadida al presupuesto');
    } catch (error) {
      toast.error('Error al añadir la categoría: ' + error.message);
    }
  };

  const budgetedCatIds = currentBudgets.map((b) => b.category_id);
  const unbudgetedCategories = categories.filter((c) => !budgetedCatIds.includes(c.id));

  return (
    <div className="budgets-page animate-fadeIn">
      <div className="page-header">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="page-header__title">Control Presupuestario</h1>
            <p className="page-header__subtitle">{getMonthName(selectedMonth)} {selectedYear}</p>
          </div>
          <div className="segmented-control glass">
            <button className={`segmented-control__btn ${view === 'personal' ? 'active' : ''}`} onClick={() => setView('personal')}>Personal</button>
            <button className={`segmented-control__btn ${view === 'shared' ? 'active' : ''}`} onClick={() => setView('shared')}>Compartido</button>
          </div>
        </div>
      </div>

      <div className="dashboard-grid stagger-children" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="stat-card glass glass--hover">
          <span className="stat-card__label">Presupuesto Total</span>
          <span className="stat-card__value">{formatCurrency(totalBudget)}</span>
          <span className="text-xs text-secondary">{currentBudgets.length} categorías activas</span>
        </div>
        <div className="stat-card glass glass--hover">
          <span className="stat-card__label">Ejecución Real</span>
          <span className="stat-card__value" style={{ color: totalSpent > totalBudget ? 'var(--color-danger)' : 'var(--text-primary)' }}>
            {formatCurrency(totalSpent)}
          </span>
          <div className={`glass-tag glass-tag--${totalSpent > totalBudget ? 'danger' : 'success'}`}>
            {formatPercent(globalExecPct)} consumido
          </div>
        </div>
        <div className="stat-card glass glass--hover">
          <span className="stat-card__label">Saldo Disponible</span>
          <span className="stat-card__value" style={{ color: totalAvailable < 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
            {formatCurrency(totalAvailable)}
          </span>
          <span className="text-xs text-secondary">Ahorro potencial del mes</span>
        </div>
      </div>

      <div className="glass glass--static" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="p-xl border-b flex justify-between items-center" style={{ borderColor: 'var(--border-color)' }}>
          <h3 className="section-title mb-0">Detalle por Categoría</h3>
        </div>
        <table className="premium-table">
          <thead>
            <tr>
              <th style={{ width: '25%' }}>Categoría</th>
              <th style={{ textAlign: 'right', width: '18%' }}>Presupuesto</th>
              <th style={{ textAlign: 'right', width: '18%' }}>Ejecutado</th>
              <th style={{ textAlign: 'right', width: '18%' }}>Disponible</th>
              <th style={{ textAlign: 'center', width: '15%' }}>Estado (%)</th>
              <th style={{ width: '60px' }}></th>
            </tr>
          </thead>
          <tbody>
            {currentBudgets.map((budget) => {
              const cat = getCategoryInfo(budget.category_id);
              const spent = relevantExpenses.filter((e) => e.category_id === budget.category_id).reduce((s, e) => s + Number(e.amount), 0);
              const sem = getSemaphoreStatus(spent, budget.amount, cat.name);
              const remaining = budget.amount - spent;
              const isEditing = editingId === budget.id;

              return (
                <tr key={budget.id} className="animate-fadeInUp">
                  <td>
                    <div className="category-cell">
                      <span className="category-icon">{cat.icon}</span>
                      <span className="category-name font-bold">{cat.name}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {isEditing ? (
                      <input
                        type="number"
                        className="glass-input text-right w-full"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        onBlur={() => saveEdit(budget)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(budget); if (e.key === 'Escape') setEditingId(null); }}
                        autoFocus
                      />
                    ) : (
                      <div className="price-cell font-bold" onClick={() => startEdit(budget.id, budget.amount)}>
                        {formatCurrency(budget.amount)}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', color: sem.status === 'red' ? 'var(--color-danger)' : 'var(--text-primary)' }} className="font-semibold">
                    {formatCurrency(spent)}
                  </td>
                  <td style={{ textAlign: 'right', color: remaining < 0 ? 'var(--color-danger)' : 'var(--color-success)' }} className="font-bold">
                    {formatCurrency(remaining)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="flex flex-col items-center gap-xs">
                      <div className="execution-badge" style={{ background: `${SEMAPHORE_COLORS[sem.status]}15`, color: SEMAPHORE_COLORS[sem.status], padding: '2px 10px', borderRadius: 'var(--radius-sm)', fontSize: '11px', fontWeight: 'bold' }}>
                        {sem.percent.toFixed(0)}%
                      </div>
                      <div className="mini-progress" style={{ width: '100%', maxWidth: '80px' }}>
                        <div className="mini-progress-bar" style={{ width: `${Math.min(sem.percent, 100)}%`, background: SEMAPHORE_COLORS[sem.status] }} />
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="icon-btn" title="Editar" onClick={() => startEdit(budget.id, budget.amount)}>✏️</button>
                  </td>
                </tr>
              );
            })}
            {currentBudgets.length === 0 && (
              <tr>
                <td colSpan="6" className="empty-state">No hay presupuestos definidos para este período</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {unbudgetedCategories.length > 0 && (
        <div className="glass glass--static mt-xl p-xl unbudgeted-section">
          <h4 className="section-title text-sm mb-lg">Añadir Categoría al Presupuesto</h4>
          <div className="flex flex-wrap gap-md">
            {unbudgetedCategories.map((cat) => (
              <button key={cat.id} className="glass-btn hover-scale" onClick={() => addBudgetForCategory(cat.id)}>
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
