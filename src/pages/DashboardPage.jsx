import { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { formatCurrency, formatPercent, getMonthName } from '../utils/formatters';
import {
  filterByPeriod,
  groupByCategory,
  calculateBudgetVsActual,
  calculateFinancialLoad,
  calculateContribution,
  calculateFixedVsVariable,
  getSemaphoreStatus,
  calculateFinancialSummary,
} from '../utils/calculations';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import './DashboardPage.css';

const PIE_COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#0ea5e9'];

export default function DashboardPage() {
  const { user } = useAuth();
  const { partnership, partner, expenses, incomes, budgets, categories, savingsGoals, recurringExpenses, selectedMonth, selectedYear, loading } = useData();
  const [view, setView] = useState('personal');

  if (loading) {
    return (
      <div className="flex items-center justify-center animate-fadeIn" style={{ height: '70vh' }}>
        <div className="loading-screen__spinner animate-spin">💰</div>
      </div>
    );
  }

  // ALERTS: Recurring payments due soon
  const upcomingPayments = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDate();
    // STRICT PRIVACY: Show my personal recurring OR shared ones.
    return recurringExpenses.filter(rec => {
      if (!rec.is_active) return false;
      if (rec.expense_type === 'personal' && rec.user_id !== user?.id) return false;
      
      const diff = rec.day_of_month - currentDay;
      // Show alerts for today, tomorrow, or day after (and 1 day overdue)
      return diff >= -1 && diff <= 3;
    }).sort((a, b) => a.day_of_month - b.day_of_month);
  }, [recurringExpenses, user]);

  // Individual vs Joint Split Logic
  const splitPct = partnership?.user1_split_pct || 50;
  const mySplit = user?.id === partnership?.user1_id ? splitPct : 100 - splitPct;

  // Financial summaries for different views
  const personalSummary = useMemo(() => {
    const personalIncomes = incomes.filter(i => i.income_type === 'personal' && i.user_id === user?.id);
    const sharedIncomesPart = incomes.filter(i => i.income_type === 'shared').map(i => ({
      ...i,
      amount: Number(i.amount) * (mySplit / 100)
    }));
    const personalExpenses = expenses.filter(e => e.expense_type === 'personal' && e.user_id === user?.id);
    const sharedExpensesPart = expenses.filter(e => e.expense_type === 'shared').map(e => ({
      ...e,
      amount: Number(e.amount) * (mySplit / 100)
    }));

    return calculateFinancialSummary([...personalIncomes, ...sharedIncomesPart], [...personalExpenses, ...sharedExpensesPart], selectedMonth, selectedYear, user?.id);
  }, [incomes, expenses, selectedMonth, selectedYear, user, mySplit]);

  const sharedSummary = useMemo(() => {
    const sharedIncomes = incomes.filter(i => i.income_type === 'shared');
    const sharedExpenses = expenses.filter(e => e.expense_type === 'shared');
    return calculateFinancialSummary(sharedIncomes, sharedExpenses, selectedMonth, selectedYear, user?.id);
  }, [incomes, expenses, selectedMonth, selectedYear, user]);

  const activeSummary = view === 'personal' ? personalSummary : sharedSummary;

  // MOVEMENTS LIST: Incomes + Expenses
  const periodExpenses = useMemo(
    () => filterByPeriod(expenses, selectedMonth, selectedYear),
    [expenses, selectedMonth, selectedYear]
  );
  
  const periodIncomes = useMemo(
    () => filterByPeriod(incomes, selectedMonth, selectedYear),
    [incomes, selectedMonth, selectedYear]
  );

  const movements = useMemo(() => {
    const exps = (view === 'personal' 
      ? periodExpenses.filter(e => e.expense_type === 'personal' && e.user_id === user?.id)
      : periodExpenses.filter(e => e.expense_type === 'shared')
    ).map(e => ({ ...e, type: 'expense' }));

    const incs = (view === 'personal'
      ? periodIncomes.filter(i => i.income_type === 'personal' && i.user_id === user?.id)
      : periodIncomes.filter(i => i.income_type === 'shared')
    ).map(i => ({ ...i, type: 'income' }));

    return [...exps, ...incs].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [view, periodExpenses, periodIncomes, user]);

  const myPersonal = periodExpenses.filter((e) => e.user_id === user?.id && e.expense_type === 'personal');

  const myPersonal = periodExpenses.filter((e) => e.user_id === user?.id && e.expense_type === 'personal');
  const sharedExpenses = periodExpenses.filter((e) => e.expense_type === 'shared');
  const mySharedExpenses = sharedExpenses.filter((e) => e.user_id === user?.id);
  const partnerSharedExpenses = sharedExpenses.filter((e) => e.user_id !== user?.id);

  // Totals
  const myPersonalTotal = myPersonal.reduce((s, e) => s + Number(e.amount), 0);
  const sharedTotal = sharedExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const mySharedTotal = mySharedExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const partnerSharedTotal = partnerSharedExpenses.reduce((s, e) => s + Number(e.amount), 0);

  // Financial load & Contribution
  const splitPct = partnership?.user1_split_pct || 50;
  const mySplit = user?.id === partnership?.user1_id ? splitPct : 100 - splitPct;
  const myLoad = calculateFinancialLoad(myPersonalTotal, sharedTotal, mySplit);
  const contribution = calculateContribution(mySharedTotal, partnerSharedTotal);

  // Budget data
  const periodBudgets = budgets.filter((b) => b.month === selectedMonth && b.year === selectedYear);
  const myBudgets = periodBudgets.filter((b) => b.budget_type === 'personal' && b.user_id === user?.id);
  const sharedBudgets = periodBudgets.filter((b) => b.budget_type === 'shared');
  const myBudgetTotal = myBudgets.reduce((s, b) => s + Number(b.amount), 0);
  const sharedBudgetTotal = sharedBudgets.reduce((s, b) => s + Number(b.amount), 0);

  // Analysis
  const personalSemaphore = getSemaphoreStatus(myPersonalTotal, myBudgetTotal);
  const sharedSemaphore = getSemaphoreStatus(sharedTotal, sharedBudgetTotal);
  const myCategoryData = groupByCategory(myPersonal, categories);
  const sharedCategoryData = groupByCategory(sharedExpenses, categories);

  // PROJECTION LOGIC (New suggested feature)
  const today = new Date();
  const isCurrentMonth = today.getMonth() + 1 === selectedMonth && today.getFullYear() === selectedYear;
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const currentDay = isCurrentMonth ? today.getDate() : daysInMonth;
  
  const dailyAverage = myPersonalTotal / currentDay;
  const projectedPersonal = dailyAverage * daysInMonth;
  const projectionDiff = projectedPersonal - myBudgetTotal;
  const projectionStatus = projectedPersonal > myBudgetTotal ? 'danger' : 'success';

  const renderSemaphore = (spent, budget, label) => {
    const sem = getSemaphoreStatus(spent, budget);
    return (
      <div className="semaphore-item">
        <div className="semaphore-item__header">
          <span className="semaphore-item__label">{label}</span>
          <span className="semaphore-item__values">
            <span className="font-bold">{formatCurrency(spent)}</span> / {formatCurrency(budget)}
          </span>
        </div>
        <div className="semaphore-bar">
          <div
            className={`semaphore-bar__fill progress-fill`}
            style={{ 
              width: `${Math.min(sem.percent, 100)}%`, 
              background: sem.status === 'green' ? 'var(--color-success)' : sem.status === 'orange' ? 'var(--color-warning)' : 'var(--color-danger)'
            }}
          />
        </div>
      </div>
    );
  };

  // New Achievement Logic
  const mySavingsRate = myBudgetTotal > 0 ? ((myBudgetTotal - myPersonalTotal) / myBudgetTotal) * 100 : 0;
  const achievements = useMemo(() => {
    const list = [];
    if (mySavingsRate > 20) list.push({ id: 'saver', title: 'Ahorrador Estrella', icon: '⭐', desc: 'Más del 20% de ahorro' });
    if (personalSemaphore.status === 'green' && myPersonal.length > 3) list.push({ id: 'master', title: 'Escudo Presupuestal', icon: '🛡️', desc: 'Gastos bajo control' });
    const completedGoals = savingsGoals.filter(g => g.current_amount >= g.target_amount);
    if (completedGoals.length > 0) list.push({ id: 'goal', title: 'Cazador de Metas', icon: '🏆', desc: 'Hucha completada' });
    return list;
  }, [mySavingsRate, personalSemaphore.status, myPersonal.length, savingsGoals]);

  return (
    <div className="dashboard-page animate-fadeIn">
      <div className="page-header">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="page-header__title">Dashboard</h1>
            <p className="page-header__subtitle">
              Resumen de {getMonthName(selectedMonth)} {selectedYear}
            </p>
          </div>
          <div className="segmented-control glass">
            <button 
              className={`segmented-control__btn ${view === 'personal' ? 'active' : ''}`}
              onClick={() => setView('personal')}
            >
              Personal
            </button>
            <button 
              className={`segmented-control__btn ${view === 'shared' ? 'active' : ''}`}
              onClick={() => setView('shared')}
            >
              Compartido
            </button>
          </div>
        </div>
      </div>

      {/* ALERTS ROW (Recurrentes próximos) */}
      {upcomingPayments.length > 0 && (
        <div className="alerts-row animate-fadeIn mb-lg">
          {upcomingPayments.map(rec => {
            const cat = categories.find(c => c.id === rec.category_id) || { icon: '📦' };
            const today = new Date().getDate();
            const isToday = rec.day_of_month === today;
            const isOverdue = rec.day_of_month < today;
            
            return (
              <div key={rec.id} className={`alert-card glass ${isToday ? 'border--warning' : isOverdue ? 'border--danger' : ''}`}>
                <div className="alert-card__icon">{isToday ? '🔔' : isOverdue ? '⚠️' : '📅'}</div>
                <div className="alert-card__content">
                  <span className="alert-card__title">
                    {isToday ? 'Pagar Hoy' : isOverdue ? 'Vencido' : 'Próximo Pago'}
                  </span>
                  <span className="alert-card__desc">
                    {cat.icon} {rec.merchant || rec.description}: {formatCurrency(rec.amount)} (Día {rec.day_of_month})
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ACHIEVEMENTS ROW (PREMIUM) */}
      {achievements.length > 0 && (
        <div className="achievements-row animate-fadeIn">
          {achievements.map(ach => (
            <div key={ach.id} className="achievement-badge glass glass--hover">
              <span className="achievement-badge__icon">{ach.icon}</span>
              <div className="achievement-badge__info">
                <span className="achievement-badge__title">{ach.title}</span>
                <span className="achievement-badge__desc">{ach.desc}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="financial-summary-row mb-lg animate-fadeIn">
        <div className="summary-item glass" title="Saldo que traes del mes pasado">
          <span className="summary-item__label">Saldo Inicial</span>
          <span className={`summary-item__value ${activeSummary.initialBalance >= 0 ? 'text-success' : 'text-danger'}`}>
            {formatCurrency(activeSummary.initialBalance)}
          </span>
        </div>
        <div className="summary-item glass">
          <span className="summary-item__label">Ingresos ({view === 'personal' ? 'Míos' : 'Compartidos'})</span>
          <span className="summary-item__value text-primary">+{formatCurrency(activeSummary.totalIncomes)}</span>
        </div>
        <div className="summary-item glass">
          <span className="summary-item__label">Gastos</span>
          <span className="summary-item__value text-warning">-{formatCurrency(activeSummary.totalExpenses)}</span>
        </div>
        <div className="summary-item glass highlight" title="Dinero final con el que cierras el mes">
          <span className="summary-item__label">Saldo Final</span>
          <span className={`summary-item__value ${activeSummary.finalBalance >= 0 ? 'text-success' : 'text-danger'}`}>
            {formatCurrency(activeSummary.finalBalance)}
          </span>
        </div>
      </div>

      <div className="dashboard-grid">
        {view === 'personal' ? (
          <>
            {/* PERSONAL CARDS */}
            <div className="stat-card glass glass--hover">
              <span className="stat-card__label">Gastos del Mes</span>
              <span className="stat-card__value">{formatCurrency(myPersonalTotal)}</span>
              <div className={`glass-tag glass-tag--${personalSemaphore.status === 'green' ? 'success' : personalSemaphore.status === 'orange' ? 'warning' : 'danger'}`}>
                {personalSemaphore.label}
              </div>
            </div>

            <div className="stat-card glass glass--hover">
              <span className="stat-card__label">Presupuesto Ejecutado</span>
              <span className="stat-card__value">{formatPercent(personalSemaphore.percent)}</span>
              <span className="text-xs text-tertiary">Restante: {formatCurrency(myBudgetTotal - myPersonalTotal)}</span>
            </div>

            <div className="stat-card glass glass--hover" style={{ borderLeft: `4px solid var(--color-${projectionStatus})` }}>
              <span className="stat-card__label">Proyección al Cierre</span>
              <span className="stat-card__value" style={{ color: `var(--color-${projectionStatus})` }}>
                {formatCurrency(projectedPersonal)}
              </span>
              <span className="text-xs text-tertiary">
                {projectionDiff > 0 
                  ? `Excederás ${formatCurrency(projectionDiff)}` 
                  : `Ahorro proyectado: ${formatCurrency(Math.abs(projectionDiff))}`}
              </span>
            </div>

            <div className="chart-wide glass glass--static">
              <h3 className="section-title">🚦 Control por Categoría</h3>
              <div className="semaphore-list">
                {calculateBudgetVsActual(myBudgets, myPersonal, categories).map(item => (
                  <div key={item.id}>
                    {renderSemaphore(item.spent, item.amount, `${item.categoryIcon} ${item.categoryName}`)}
                  </div>
                ))}
              </div>
            </div>

            <div className="chart-side glass glass--static">
              <h3 className="section-title">🍩 Mis Categorías</h3>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie 
                      data={myCategoryData} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={60} 
                      outerRadius={85} 
                      paddingAngle={5} 
                      dataKey="total"
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {myCategoryData.map((e, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* SHARED CARDS */}
            <div className="stat-card glass glass--hover">
              <span className="stat-card__label">Gasto Compartido Total</span>
              <span className="stat-card__value">{formatCurrency(sharedTotal)}</span>
              <div className={`glass-tag glass-tag--${sharedSemaphore.status === 'green' ? 'success' : sharedSemaphore.status === 'orange' ? 'warning' : 'danger'}`}>
                {sharedSemaphore.label}
              </div>
            </div>

            <div className="stat-card glass glass--hover">
              <span className="stat-card__label">Carga Financiera Total ({user?.display_name?.split(' ')[0]})</span>
              <span className="stat-card__value">{formatCurrency(myLoad)}</span>
              <span className="text-xs text-tertiary">Personal + Mi parte compartida</span>
            </div>

            <div className="full-width glass glass--static">
              <h3 className="section-title">⚖️ Equilibrio de Gastos Compartidos</h3>
              <div className="contribution-container" style={{ padding: 'var(--space-md)' }}>
                <div className="contribution-header flex justify-between text-xs mb-sm">
                  <span>Aporte Real: {user?.display_name?.split(' ')[0]} ({formatPercent(contribution.user1Pct, 0)})</span>
                  <span>Meta: {mySplit}%</span>
                </div>
                <div className="contribution-track" style={{ height: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-full)', position: 'relative' }}>
                  <div className="contribution-fill" style={{ width: `${contribution.user1Pct}%`, background: 'var(--accent-primary)', height: '100%', borderRadius: 'var(--radius-full)' }} />
                  <div className="contribution-marker" style={{ left: `${mySplit}%`, position: 'absolute', top: '-4px', bottom: '-4px', width: '3px', background: 'var(--color-danger)', borderRadius: '2px' }} />
                </div>
                {contribution.difference > 5 && (
                  <div className="mt-md p-sm glass text-xs text-center border--warning" style={{ color: 'var(--color-warning)' }}>
                    {contribution.dominantUser === 'user1' ? user?.display_name : partner?.display_name} aporta un {formatPercent(contribution.difference, 0)} más de lo pactado.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* RECENT MOVEMENTS LIST (FULL DETAIL) */}
      <div className="full-width glass glass--static mt-xl animate-fadeIn" style={{ padding: 'var(--space-xl)' }}>
        <div className="flex justify-between items-center mb-lg">
          <h3 className="section-title">📋 Movimientos Detallados ({view === 'personal' ? 'Míos' : 'Compartidos'})</h3>
          <span className="badge badge--success">En Vivo</span>
        </div>
        
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Detalle / Concepto</th>
                <th>Categoría</th>
                <th>Fecha</th>
                <th className="text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {movements
                .slice(0, 10)
                .map((mov) => {
                  const cat = categories.find(c => c.id === mov.category_id) || { name: (mov.type === 'income' ? 'Ingreso' : 'Otro'), icon: (mov.type === 'income' ? '💰' : '📦') };
                  const isIncome = mov.type === 'income';
                  return (
                    <tr key={mov.id}>
                      <td className="font-bold">
                        {mov.name || mov.title || mov.merchant || (mov.description?.length > 30 ? mov.description.substring(0, 30) + '...' : mov.description) || (isIncome ? 'Ingreso registrado' : 'Gasto registrado')}
                        {view === 'personal' && mov.income_type === 'shared' && <span className="text-xs text-tertiary ml-sm">(Parte compartida)</span>}
                      </td>
                      <td>
                        <span className="cat-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          {cat.icon} {cat.name}
                        </span>
                      </td>
                      <td className="text-tertiary text-xs">{mov.date}</td>
                      <td className={`text-right font-bold ${isIncome ? 'text-success' : ''}`}>
                        {isIncome ? '+' : '-'}{formatCurrency(mov.amount)}
                      </td>
                    </tr>
                  );
                })}
              {movements.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center p-xl text-tertiary italic">No hay registros detallados para mostrar</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
