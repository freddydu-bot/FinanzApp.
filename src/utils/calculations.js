// Semaphore and financial calculation utilities

/**
 * Get semaphore status based on spent vs budget
 * @returns {{ status: 'green'|'orange'|'red', percent: number, label: string }}
 */
export function getSemaphoreStatus(spent, budget, categoryName = '') {
  if (budget <= 0) return { status: 'green', percent: 0, label: 'Sin presupuesto' };
  const percent = (spent / budget) * 100;
  const isSaving = categoryName.toLowerCase().includes('ahorro') || categoryName.toLowerCase().includes('inversión');

  if (isSaving) {
    // For SAVINGS: More is better
    if (percent >= 100) return { status: 'green', percent: Math.min(percent, 150), label: 'Meta cumplida' };
    if (percent >= 70) return { status: 'orange', percent, label: 'En progreso' };
    return { status: 'red', percent, label: 'Bajo ahorro' };
  }

  // For EXPENSES: Less is better
  if (percent >= 100) return { status: 'red', percent: Math.min(percent, 150), label: 'Excedido' };
  if (percent >= 80) return { status: 'orange', percent, label: 'Precaución' };
  return { status: 'green', percent, label: 'Normal' };
}

/**
 * Calculate financial load per user
 * Personal expenses + (split% * shared expenses total)
 */
export function calculateFinancialLoad(personalTotal, sharedTotal, splitPct) {
  return personalTotal + (sharedTotal * (splitPct / 100));
}

/**
 * Calculate who contributes more to shared fund
 * Returns { user1Pct, user2Pct, difference, dominantUser }
 */
export function calculateContribution(user1SharedExpenses, user2SharedExpenses) {
  const total = user1SharedExpenses + user2SharedExpenses;
  if (total === 0) {
    return { user1Pct: 50, user2Pct: 50, difference: 0, dominantUser: null };
  }
  const user1Pct = (user1SharedExpenses / total) * 100;
  const user2Pct = (user2SharedExpenses / total) * 100;
  const difference = Math.abs(user1Pct - user2Pct);
  const dominantUser = user1Pct > user2Pct ? 'user1' : user1Pct < user2Pct ? 'user2' : null;

  return { user1Pct, user2Pct, difference, dominantUser };
}

/**
 * Calculate fixed vs variable breakdown
 * Returns { fixedTotal, variableTotal, fixedPct, variablePct }
 */
export function calculateFixedVsVariable(expenses) {
  const fixedTotal = expenses
    .filter((e) => e.cost_type === 'fixed')
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const variableTotal = expenses
    .filter((e) => e.cost_type === 'variable')
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const total = fixedTotal + variableTotal;

  return {
    fixedTotal,
    variableTotal,
    fixedPct: total > 0 ? (fixedTotal / total) * 100 : 0,
    variablePct: total > 0 ? (variableTotal / total) * 100 : 0,
  };
}

/**
 * Group expenses by category and sum amounts
 */
export function groupByCategory(expenses, categories) {
  const grouped = {};
  expenses.forEach((exp) => {
    if (!grouped[exp.category_id]) {
      const cat = categories.find((c) => c.id === exp.category_id) || {
        name: 'Otro', icon: '📦', color: '#94a3b8',
      };
      grouped[exp.category_id] = {
        category_id: exp.category_id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        total: 0,
        count: 0,
        fixed: 0,
        variable: 0,
      };
    }
    grouped[exp.category_id].total += Number(exp.amount);
    grouped[exp.category_id].count += 1;
    if (exp.cost_type === 'fixed') grouped[exp.category_id].fixed += Number(exp.amount);
    else grouped[exp.category_id].variable += Number(exp.amount);
  });

  return Object.values(grouped).sort((a, b) => b.total - a.total);
}

/**
 * Filter expenses by month and year
 */
export function filterByPeriod(expenses, month, year) {
  return expenses.filter((e) => {
    if (!e.date) return false;
    // Clean date string (take only YYYY-MM-DD if it has a time/timezone)
    const dateStr = e.date.includes('T') ? e.date.split('T')[0] : e.date;
    const d = new Date(dateStr + 'T12:00:00'); // Use noon to avoid timezone shifts
    return d.getMonth() + 1 === month && d.getFullYear() === year;
  });
}
/**
 * Calculate budget vs actual for each category
 */
export function calculateBudgetVsActual(budgets, expenses, categories) {
  return budgets.map((budget) => {
    const cat = categories.find((c) => c.id === budget.category_id) || { name: 'Otro', icon: '📦', color: '#94a3b8' };
    const spent = expenses
      .filter((e) => e.category_id === budget.category_id)
      .reduce((sum, e) => sum + Number(e.amount), 0);
    const semaphore = getSemaphoreStatus(spent, budget.amount);

    return {
      ...budget,
      categoryName: cat.name,
      categoryIcon: cat.icon,
      categoryColor: cat.color,
      spent,
      remaining: budget.amount - spent,
      ...semaphore,
    };
  });
}

/**
 * Calculate financial summary with cumulative dragging and privacy-aware splits
 */
export function calculateFinancialSummary(incomes, expenses, month, year, currentUserId) {
  const getPeriodKey = (dateStr) => {
    if (!dateStr) return { m: 0, y: 0 };
    const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const d = new Date(clean + 'T12:00:00');
    return { m: d.getMonth() + 1, y: d.getFullYear() };
  };

  const isCurrent = (item) => {
    const { m, y } = getPeriodKey(item.date);
    return m === month && y === year;
  };

  const isPrevious = (item) => {
    const { m, y } = getPeriodKey(item.date);
    return (y < year) || (y === year && m < month);
  };

  // PRIVACY LOGIC: Filter data for calculations
  // Personal incomes are only for the owner. Shared are for everyone.
  const myTotalIncomes = incomes.filter(i => isCurrent(i));
  const myTotalExpenses = expenses.filter(e => isCurrent(e));

  const totalIncomes = myTotalIncomes.reduce((s, i) => s + Number(i.amount), 0);
  const totalExpenses = myTotalExpenses.reduce((s, e) => s + Number(e.amount), 0);

  // Dragged balance from all time before current period
  const previousIncomes = incomes.filter(i => isPrevious(i)).reduce((s, i) => s + Number(i.amount), 0);
  const previousExpenses = expenses.filter(e => isPrevious(e)).reduce((s, e) => s + Number(e.amount), 0);

  const initialBalance = previousIncomes - previousExpenses;
  const finalBalance = initialBalance + totalIncomes - totalExpenses;

  // Granular Breakdown for the UI
  const sharedIncomesTotal = myTotalIncomes.filter(i => i.income_type === 'shared').reduce((s, i) => s + Number(i.amount), 0);
  const personalIncomesTotal = myTotalIncomes.filter(i => i.income_type === 'personal' && i.user_id === currentUserId).reduce((s, i) => s + Number(i.amount), 0);

  return {
    initialBalance,
    totalIncomes,
    totalExpenses,
    finalBalance,
    sharedIncomesTotal,
    personalIncomesTotal
  };
}
