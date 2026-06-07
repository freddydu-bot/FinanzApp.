import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { formatCurrency, formatPercent, getMonthName } from '../utils/formatters';
import { filterByPeriod, groupByCategory, calculateFixedVsVariable, calculateBudgetVsActual } from '../utils/calculations';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line,
  PieChart, Pie, Cell, Legend, CartesianGrid,
} from 'recharts';

const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#0ea5e9'];

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { partnership, partner, expenses, budgets, categories, selectedMonth, selectedYear, loading, incomes } = useData();

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: '70vh' }}>
        <div className="loading-screen__spinner animate-spin">📈</div>
      </div>
    );
  }

  const currentExpenses = useMemo(() => filterByPeriod(expenses, selectedMonth, selectedYear), [expenses, selectedMonth, selectedYear]);
  const myPersonal = currentExpenses.filter((e) => e.user_id === user?.id && e.expense_type === 'personal');
  const partnerPersonal = currentExpenses.filter((e) => e.user_id !== user?.id && e.expense_type === 'personal');
  const shared = currentExpenses.filter((e) => e.expense_type === 'shared');

  // Budget vs actual
  const myBudgets = budgets.filter((b) => b.month === selectedMonth && b.year === selectedYear && b.budget_type === 'personal' && b.user_id === user?.id);
  const budgetVsActual = useMemo(() => {
    return calculateBudgetVsActual(myBudgets, myPersonal, categories).map((item) => ({
      name: item.categoryName,
      Presupuesto: item.amount,
      Ejecutado: item.spent,
      icon: item.categoryIcon,
    }));
  }, [myBudgets, myPersonal, categories]);

  // Monthly trend (last 6 months)
  const monthlyTrend = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      let m = selectedMonth - i;
      let y = selectedYear;
      if (m <= 0) { m += 12; y -= 1; }
      const monthExp = filterByPeriod(expenses, m, y);
      const personal = monthExp.filter((e) => e.user_id === user?.id && e.expense_type === 'personal').reduce((s, e) => s + Number(e.amount), 0);
      const sharedAmt = monthExp.filter((e) => e.expense_type === 'shared').reduce((s, e) => s + Number(e.amount), 0);
      data.push({
        month: getMonthName(m).substring(0, 3),
        Personal: personal,
        Compartido: sharedAmt,
        Total: personal + sharedAmt,
      });
    }
    return data;
  }, [expenses, selectedMonth, selectedYear, user]);

  // Category distribution
  const myCatData = groupByCategory(myPersonal, categories);
  const myFixedVar = calculateFixedVsVariable(myPersonal);

  // Budget Evolution (last 6 months)
  const budgetEvolution = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      let m = selectedMonth - i;
      let y = selectedYear;
      if (m <= 0) { m += 12; y -= 1; }
      
      const monthExp = filterByPeriod(expenses, m, y);
      const personalSpent = monthExp.filter((e) => e.user_id === user?.id && e.expense_type === 'personal').reduce((s, e) => s + Number(e.amount), 0);
      
      const monthBudgets = budgets.filter((b) => b.month === m && b.year === y && b.budget_type === 'personal' && b.user_id === user?.id);
      const totalBudget = monthBudgets.reduce((s, b) => s + Number(b.amount), 0);
      
      data.push({
        month: getMonthName(m).substring(0, 3),
        Ejecutado: personalSpent,
        Presupuesto: totalBudget,
      });
    }
    return data;
  }, [expenses, budgets, selectedMonth, selectedYear, user]);

  // Executive Insights Calculations
  const myPersonalTotal = myPersonal.reduce((s, e) => s + Number(e.amount), 0);
  const myBudgetTotal = myBudgets.reduce((s, b) => s + Number(b.amount), 0);
  const totalSaved = myBudgetTotal - myPersonalTotal;
  const savingsRate = myBudgetTotal > 0 ? totalSaved / myBudgetTotal : 0;
  
  const sharedTotal = shared.reduce((s, e) => s + Number(e.amount), 0);
  const myContribution = shared.filter(e => e.user_id === user?.id).reduce((s, e) => s + Number(e.amount), 0);
  
  // Predictive Calculations
  const today = new Date();
  const isCurrentMonth = today.getMonth() + 1 === selectedMonth && today.getFullYear() === selectedYear;
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const currentDay = isCurrentMonth ? today.getDate() : daysInMonth;
  const burnRate = myPersonalTotal / (currentDay || 1);
  const projectedTotal = burnRate * daysInMonth;
  const totalIncomes = incomes.filter(i => i.user_id === user?.id && (new Date(i.date).getMonth() + 1 === selectedMonth)).reduce((s, i) => s + Number(i.amount), 0);
  const projectedBalance = totalIncomes - projectedTotal;

  return (
    <div className="analytics-page">
      <div className="page-header">
        <h1 className="page-header__title">📊 Inteligencia Financiera</h1>
        <p className="page-header__subtitle">Insights estratégicos y proyecciones de {getMonthName(selectedMonth)}</p>
      </div>

      <div className="analytics-top-grid mb-lg">
        {/* EXECUTIVE INSIGHT PANEL (PAZ MENTAL) */}
        <div className="executive-insight glass animate-slideUp">
          <div className="executive-insight__main">
            <div className="executive-insight__badge">Reporte de Paz Mental</div>
            <h2 className="executive-insight__title">
              {totalSaved > 0 
                ? `Vas por buen camino, ${user?.display_name?.split(' ')[0]}.` 
                : `Es momento de ajustar el cinturón.`}
            </h2>
            <p className="executive-insight__text">
              Este mes has logrado un ahorro del <span className="highlight">{formatPercent(savingsRate, 1)}</span> respecto a tu presupuesto. 
              {savingsRate > 0.1 ? ' ¡Excelente capacidad de gestión! ' : ' Intenta reducir gastos variables para mejorar el margen. '}
            </p>
          </div>
          <div className="executive-insight__stats">
            <div className="insight-stat">
              <span className="insight-stat__label">Eficiencia</span>
              <span className="insight-stat__value">{formatPercent(100 - (myFixedVar.fixedTotal / (myPersonalTotal || 1) * 100), 0)}</span>
            </div>
            <div className="insight-stat">
              <span className="insight-stat__label">Fijo vs Var</span>
              <span className="insight-stat__value">{Math.round(myFixedVar.fixedTotal / (myFixedVar.variableTotal || 1))}:1</span>
            </div>
          </div>
        </div>

        {/* PREDICTIVE PROJECTION CARD (NEW) */}
        <div className={`projection-card glass glass--static animate-slideUp delay-100 border--${projectedBalance >= 0 ? 'success' : 'danger'}`}>
          <div className="projection-card__header flex justify-between items-center mb-md">
            <span className="badge badge--primary">Proyección de IA</span>
            <span className="text-xs text-tertiary">Día {currentDay} de {daysInMonth}</span>
          </div>
          <h3 className="projection-card__title m-0">
            {projectedBalance >= 0 
              ? 'Pronóstico: Superávit' 
              : 'Pronóstico: Déficit'}
          </h3>
          <p className="projection-card__desc mt-sm mb-lg">
            Si sigues gastando a este ritmo (${formatCurrency(burnRate)}/día), cerrarás el mes con un saldo de:
          </p>
          <div className={`projection-card__value ${projectedBalance >= 0 ? 'text-success' : 'text-danger'} font-bold text-2xl`}>
            {formatCurrency(projectedBalance)}
          </div>
          <div className="mt-lg pt-md border-t border-color-soft flex items-center gap-sm">
            <span className="text-xl">🔮</span>
            <span className="text-xs italic text-secondary">
              {projectedBalance > totalIncomes * 0.2 
                ? '¡Increíble! Te proyectas para un ahorro masivo este mes.' 
                : projectedBalance > 0 
                ? 'Vas bien, pero no bajes la guardia.' 
                : 'Cuidado: la proyección indica que gastarás más de lo que ingresas.'}
            </span>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Budget vs Actual Evolution (New Coordinate Chart) */}
        <div className="full-width glass glass--static" style={{ padding: 'var(--space-xl)' }}>
          <h3 className="section-title">🚀 Evolución: Presupuesto vs Ejecutado (6 meses)</h3>
          <p className="text-xs text-tertiary mb-md">Comparativa histórica de tus metas personales vs tus gastos reales</p>
          <div style={{ width: '100%', height: 350, marginTop: '1rem' }}>
            <ResponsiveContainer>
              <LineChart data={budgetEvolution}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--text-tertiary)" />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} stroke="var(--text-tertiary)" />
                <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }} />
                <Legend verticalAlign="top" height={36} />
                <Line type="monotone" dataKey="Presupuesto" stroke="#6366f1" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Ejecutado" stroke="#ec4899" strokeWidth={3} dot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Trend Breakdown */}
        <div className="chart-wide glass glass--static" style={{ padding: 'var(--space-xl)' }}>
          <h3 className="section-title">📉 Tendencia de Gastos</h3>
          <div style={{ width: '100%', height: 300, marginTop: '1rem' }}>
            <ResponsiveContainer>
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--text-tertiary)" />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} stroke="var(--text-tertiary)" />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="Personal" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Compartido" fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fixed vs Variable comparison (Only User) */}
        <div className="chart-side glass glass--static" style={{ padding: 'var(--space-xl)' }}>
          <h3 className="section-title">⚖️ Mi Fijo vs Variable</h3>
          <div style={{ width: '100%', height: 260, marginTop: '1rem' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie 
                  data={[
                    { name: 'Fijo', value: myFixedVar.fixedTotal },
                    { name: 'Variable', value: myFixedVar.variableTotal }
                  ]} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={60} 
                  outerRadius={80} 
                  paddingAngle={5} 
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  <Cell fill="#6366f1" />
                  <Cell fill="#ec4899" />
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Budget vs Actual by Category */}
        <div className="chart-wide glass glass--static" style={{ padding: 'var(--space-xl)' }}>
          <h3 className="section-title">🎯 Cumplimiento por Categoría</h3>
          <div style={{ width: '100%', height: 300, marginTop: '1rem' }}>
            <ResponsiveContainer>
              <BarChart data={budgetVsActual} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} stroke="var(--text-tertiary)" />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} stroke="var(--text-tertiary)" />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="Presupuesto" fill="#6366f1" radius={[0, 4, 4, 0]} opacity={0.3} />
                <Bar dataKey="Ejecutado" fill="#ec4899" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category distribution pie */}
        <div className="chart-side glass glass--static" style={{ padding: 'var(--space-xl)' }}>
          <h3 className="section-title">🍩 Distribución de Gastos</h3>
          <div style={{ width: '100%', height: 280, marginTop: '1rem' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie 
                  data={myCatData} 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={95} 
                  paddingAngle={2} 
                  dataKey="total" 
                  nameKey="name"
                  label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                >
                  {myCatData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
