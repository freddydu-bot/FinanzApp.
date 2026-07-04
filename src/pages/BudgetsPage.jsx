import { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency, getMonthName, formatPercent } from '../utils/formatters';
import { filterByPeriod, getSemaphoreStatus } from '../utils/calculations';
import './BudgetsPage.css';

const SEMAPHORE_COLORS = { 
  green: 'var(--color-success)', 
  yellow: '#f5c518',
  blue: '#3b82f6',
  red: 'var(--color-danger)' 
};

export default function BudgetsPage() {
  const { user, isDemoMode } = useAuth();
  const { partnership, categories, budgets, expenses, upsertBudget, selectedMonth, selectedYear, loadRealData, loading } = useData();
  const toast = useToast();
  const [view, setView] = useState('personal');
  // By default, the view is set to 'personal' (useState('personal'))
  // We no longer automatically switch to 'shared'.
  const [editingId, setEditingId] = useState(null);
  const [editAmount, setEditAmount] = useState('');

  // Keep refs of budgets and periodBudgets to avoid triggering the auto-generation useEffect repeatedly
  const budgetsRef = useRef(budgets);
  budgetsRef.current = budgets;

  const periodExpenses = useMemo(() => filterByPeriod(expenses, selectedMonth, selectedYear), [expenses, selectedMonth, selectedYear]);

  const periodBudgets = useMemo(() => budgets.filter((b) => b.month === selectedMonth && b.year === selectedYear), [budgets, selectedMonth, selectedYear]);

  const periodBudgetsRef = useRef(periodBudgets);
  periodBudgetsRef.current = periodBudgets;



  const currentBudgets = useMemo(() => {
    let base = view === 'personal'
      ? periodBudgets.filter((b) => b.budget_type === 'personal' && b.user_id === user?.id)
      : periodBudgets.filter((b) => b.budget_type === 'shared');

    // Inherit budgets from the previous month for categories not yet budgeted this month
    const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
    const prevBudgets = budgets.filter((b) => b.month === prevMonth && b.year === prevYear);
    const prevBase = view === 'personal'
      ? prevBudgets.filter((b) => b.budget_type === 'personal' && b.user_id === user?.id)
      : prevBudgets.filter((b) => b.budget_type === 'shared');

    prevBase.forEach((prevB) => {
      if (!base.find((b) => b.category_id === prevB.category_id)) {
        base.push({
          ...prevB,
          id: `auto-prev-${prevB.id}`,
          month: selectedMonth,
          year: selectedYear,
        });
      }
    });

    // Ensure saving category exists
    const savingCat = categories.find((c) => c.name.toLowerCase().includes('ahorro'));
    if (savingCat && !base.find((b) => b.category_id === savingCat.id)) {
      base.push({
        id: `auto-${savingCat.id}`,
        partnership_id: partnership?.id,
        category_id: savingCat.id,
        user_id: view === 'personal' ? user?.id : null,
        budget_type: view,
        amount: 0,
        month: selectedMonth,
        year: selectedYear,
      });
    }

    // Ensure every category has a budget entry for the selected month
    const existingCatIds = base.map(b => b.category_id);
    categories.forEach((cat) => {
      if (!existingCatIds.includes(cat.id)) {
        base.push({
          id: `auto-init-${cat.id}`,
          partnership_id: partnership?.id,
          category_id: cat.id,
          user_id: view === 'personal' ? user?.id : null,
          budget_type: view,
          amount: 0,
          month: selectedMonth,
          year: selectedYear,
        });
      }
    });

    return base;
  }, [view, periodBudgets, selectedMonth, selectedYear, budgets, categories, partnership, user]);

// Debug: Log current budgets after calculation
console.log('Current Budgets for month', selectedMonth, selectedYear, currentBudgets);
  // Debug: log categories and current budgets length
  console.log('Categories total', categories.length);
  console.log('CurrentBudgets length', currentBudgets.length);




  // Persist auto‑generated budgets for the selected month when the component mounts or the month changes
  useEffect(() => {
    if (loading) return;

    let isCancelled = false;

    (async () => {
      const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
      const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;

      // 1. Copy personal budgets from the previous month
      for (const cat of categories) {
        if (isCancelled) return;
        
        const currentBudget = periodBudgetsRef.current.find((b) =>
          b.category_id === cat.id &&
          b.budget_type === 'personal' &&
          b.user_id === user?.id
        );
        
        // Skip if the current month already has a non-zero budget
        if (currentBudget && Number(currentBudget.amount) > 0) continue;

        const prevBudget = budgetsRef.current.find((b) =>
          b.month === prevMonth &&
          b.year === prevYear &&
          b.category_id === cat.id &&
          b.budget_type === 'personal' &&
          b.user_id === user?.id
        );

        if (prevBudget && Number(prevBudget.amount) > 0) {
          try {
            await upsertBudget({
              ...currentBudget,
              partnership_id: partnership?.id,
              category_id: cat.id,
              user_id: user?.id,
              budget_type: 'personal',
              amount: prevBudget.amount,
              month: selectedMonth,
              year: selectedYear,
            });
          } catch (e) {
            console.error('Error creating personal budget for', cat.name, e);
            toast.error(`Error al copiar presupuesto personal de ${cat.name}: ${e.message}`);
          }
        }
      }

      // 2. Copy shared budgets from the previous month
      for (const cat of categories) {
        if (isCancelled) return;

        const currentBudget = periodBudgetsRef.current.find((b) =>
          b.category_id === cat.id &&
          b.budget_type === 'shared'
        );

        // Skip if the current month already has a non-zero budget
        if (currentBudget && Number(currentBudget.amount) > 0) continue;

        const prevBudget = budgetsRef.current.find((b) =>
          b.month === prevMonth &&
          b.year === prevYear &&
          b.category_id === cat.id &&
          b.budget_type === 'shared'
        );

        if (prevBudget && Number(prevBudget.amount) > 0) {
          try {
            await upsertBudget({
              ...currentBudget,
              partnership_id: partnership?.id,
              category_id: cat.id,
              user_id: null,
              budget_type: 'shared',
              amount: prevBudget.amount,
              month: selectedMonth,
              year: selectedYear,
            });
          } catch (e) {
            console.error('Error creating shared budget for', cat.name, e);
            toast.error(`Error al copiar presupuesto compartido de ${cat.name}: ${e.message}`);
          }
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [selectedMonth, selectedYear, user, partnership, categories, loading]);

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

  // AI Suggestions Logic
  const getSuggestedAmount = (catId) => {
    // Basic recommendation: 10% more than the average of this month's expenses so far
    const spent = relevantExpenses
      .filter((e) => String(e.category_id) === String(catId))
      .reduce((s, e) => s + Number(e.amount), 0);
    return Math.ceil((spent * 1.1) / 1000) * 1000; // Round to nearest 1000
  };

  const applyAiSuggestion = async (budget) => {
    const suggested = getSuggestedAmount(budget.category_id);
    setEditAmount(String(suggested));
    await upsertBudget({ ...budget, amount: suggested });
    toast.success('Sugerencia de IA aplicada');
  };

  return (
    <div className="budgets-page">
      <div className="page-header">
        <div className="flex justify-between items-start flex-wrap gap-md">
          <div className="min-w-[200px]">
            <h1 className="page-header__title">Control Presupuestario</h1>
            <p className="page-header__subtitle">Configura tus límites y deja que la IA te guíe</p>
          </div>
          <div className="flex gap-md items-center">
            <div className="segmented-control glass">
              <button className={`segmented-control__btn ${view === 'personal' ? 'active' : ''}`} onClick={() => setView('personal')}>Personal</button>
              <button className={`segmented-control__btn ${view === 'shared' ? 'active' : ''}`} onClick={() => setView('shared')}>Compartido</button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-sm">
          <button className="glass-btn p-xs" onClick={loadRealData}>🔄 Refrescar datos</button>
        </div>
      </div>

      <div className="dashboard-grid budgets-summary-grid mb-xl">
        <div className="stat-card glass glass--hover">
          <span className="stat-card__label">Presupuesto Total</span>
          <span className="stat-card__value">{formatCurrency(totalBudget)}</span>
          <span className="text-xs text-secondary">{currentBudgets.length} categorías bajo control</span>
        </div>
        <div className="stat-card glass glass--hover border-glow--primary">
          <span className="stat-card__label">Ejecución Real</span>
          <span className="stat-card__value" style={{ color: totalSpent > totalBudget ? 'var(--color-danger)' : 'var(--color-success)' }}>
            {formatCurrency(totalSpent)}
          </span>
          <div className={`glass-tag glass-tag--${totalSpent > totalBudget ? 'danger' : 'success'}`}>
            {formatPercent(globalExecPct)} consumido
          </div>
        </div>
        <div className="stat-card glass glass--hover">
          <span className="stat-card__label">Meta de Ahorro</span>
          <span className="stat-card__value text-success">
            {formatCurrency(totalAvailable > 0 ? totalAvailable : 0)}
          </span>
          <span className="text-xs text-tertiary">Margen libre proyectado</span>
        </div>
      </div>

      <div className="glass glass--static" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="p-xl border-b flex justify-between items-center bg-glass-surface" style={{ borderColor: 'var(--border-color)' }}>
          <h3 className="section-title mb-0">Límites por Categoría</h3>
          <span className="text-xs text-tertiary">Haz clic en el monto para editar</span>
        </div>
        <div className="table-responsive">
          <table className="premium-table">
            <thead>
              <tr>
                <th style={{ width: '25%' }}>Categoría</th>
                <th style={{ textAlign: 'right', width: '20%' }}>Presupuesto</th>
                <th style={{ textAlign: 'right', width: '15%' }}>Ejecutado</th>
                <th style={{ textAlign: 'right', width: '15%' }}>Disponible</th>
                <th style={{ textAlign: 'center', width: '15%' }}>Salud</th>
                <th style={{ width: '10%' }}>IA</th>
              </tr>
            </thead>
            <tbody>
              {currentBudgets.map((budget) => {
                const cat = getCategoryInfo(budget.category_id);
                const spent = relevantExpenses
                  .filter((e) => String(e.category_id) === String(budget.category_id))
                  .reduce((s, e) => s + Number(e.amount), 0);
                const sem = getSemaphoreStatus(spent, budget.amount, cat.name);
                const remaining = budget.amount - spent;
                const isEditing = editingId === budget.id;
                const suggestion = getSuggestedAmount(budget.category_id);

                return (
                  <tr key={budget.id} className={`animate-fadeInUp ${spent > budget.amount && budget.amount > 0 ? 'row--over-budget' : ''}`}>
                    <td>
                      <div className="category-cell">
                        <div className="category-icon-wrapper" style={{ background: `${cat.color}15`, color: cat.color }}>
                          {cat.icon}
                        </div>
                        <div className="flex flex-col">
                          <span className="category-name font-bold">{cat.name}</span>
                          {spent > budget.amount && budget.amount > 0 && (
                            <span className="text-[10px] text-danger font-bold uppercase tracking-wider">Límite excedido</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-xs">
                          <input
                            type="number"
                            className="glass-input text-right w-32"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            onBlur={() => saveEdit(budget)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(budget); if (e.key === 'Escape') setEditingId(null); }}
                            autoFocus
                          />
                        </div>
                      ) : (
                        <div className="price-cell font-bold cursor-pointer hover:text-primary transition-colors" onClick={() => startEdit(budget.id, budget.amount)}>
                          {formatCurrency(budget.amount)}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }} className={`font-semibold ${sem.status === 'red' ? 'text-danger' : ''}`}>
                      {formatCurrency(spent)}
                    </td>
                    <td style={{ textAlign: 'right' }} className={`font-bold ${remaining < 0 ? 'text-danger' : 'text-success'}`}>
                      {formatCurrency(remaining)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="flex flex-col items-center gap-xs">
                        <div className="mini-progress-track">
                          <div className="mini-progress-fill" style={{ width: `${Math.min(sem.percent, 100)}%`, background: SEMAPHORE_COLORS[sem.status] }} />
                        </div>
                        <span className="text-[10px] font-bold" style={{ color: SEMAPHORE_COLORS[sem.status] }}>
                          {sem.percent.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        className="glass-btn p-xs text-xs" 
                        title={`Sugerencia IA: ${formatCurrency(suggestion)}`}
                        onClick={() => applyAiSuggestion(budget)}
                      >
                        🤖
                      </button>
                    </td>
                  </tr>
                );
              })}
              {currentBudgets.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty-state py-xl text-center text-tertiary italic">
                    No has definido límites para este mes. Añade una categoría abajo para empezar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {unbudgetedCategories.length > 0 && (
        <div className="glass glass--static mt-xl p-xl">
          <div className="flex items-center gap-sm mb-lg">
            <span style={{ fontSize: '1.2rem' }}>➕</span>
            <h4 className="section-title m-0">Añadir más categorías al control</h4>
          </div>
          <div className="flex flex-wrap gap-md">
            {unbudgetedCategories.map((cat) => (
              <button key={cat.id} className="glass-btn glass-btn--sm hover-scale flex items-center gap-sm" onClick={() => addBudgetForCategory(cat.id)}>
                <span className="text-lg">{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

