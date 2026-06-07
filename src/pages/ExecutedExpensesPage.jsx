import { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { formatCurrency } from '../utils/formatters';
import './ExecutedExpensesPage.css';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function ExecutedExpensesPage() {
  const { user } = useAuth();
  const { categories, expenses, selectedYear, setSelectedYear } = useData();
  const [sortOrder, setSortOrder] = useState('category'); // 'category' | 'amount'
  const [view, setView] = useState('personal'); // 'personal' | 'shared'

  // Generate years for filter (e.g., current year +/- 5)
  const currentY = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentY - 2 + i);

  const matrixData = useMemo(() => {
    // Initialize matrix
    const data = categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      months: Array(12).fill(0),
      total: 0
    }));

    // Filter expenses by selected year and view
    const yearExpenses = expenses.filter(e => {
      if (!e.date) return false;
      const yearStr = e.date.split('-')[0];
      if (parseInt(yearStr, 10) !== selectedYear) return false;
      
      if (view === 'personal') {
        return e.expense_type === 'personal' && e.user_id === user?.id;
      } else {
        return e.expense_type === 'shared';
      }
    });

    // Add a 'Sin Categoría' row if it doesn't exist, just in case
    if (!data.find(c => c.id === 'unmapped')) {
      data.push({
        id: 'unmapped',
        name: 'Sin Categoría',
        icon: '❓',
        color: '#94a3b8',
        months: Array(12).fill(0),
        total: 0
      });
    }

    // Populate matrix
    yearExpenses.forEach(exp => {
      const parts = exp.date.split('-');
      if (parts.length >= 2) {
        const mIdx = parseInt(parts[1], 10) - 1; // 0-11
        let catIdx = data.findIndex(c => String(c.id) === String(exp.category_id));
        
        // Fallback for missing or invalid categories
        if (catIdx < 0) {
          catIdx = data.findIndex(c => c.name.toLowerCase() === 'otros');
          if (catIdx < 0) catIdx = data.findIndex(c => c.id === 'unmapped');
        }
        
        if (catIdx >= 0) {
          data[catIdx].months[mIdx] += Number(exp.amount || 0);
          data[catIdx].total += Number(exp.amount || 0);
        }
      }
    });

    // Sort logic
    if (sortOrder === 'amount') {
      data.sort((a, b) => b.total - a.total);
    } else {
      data.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Filter out categories with absolute 0 total to keep it clean (optional, but requested by typical analytics)
    // Actually, requirement says group by category, maybe show all. Let's show all that have data or are default.
    // For better UX, let's keep all or just the ones with data > 0? 
    // Requirement says "Agrupar automáticamente los gastos por categoría". We will keep all.
    // Remove 'Sin Categoría' if it has 0 total and isn't needed
    return data.filter(r => r.id !== 'unmapped' || r.total > 0);
  }, [categories, expenses, selectedYear, sortOrder, view, user]);

  // Calculate bottom totals
  const monthlyTotals = Array(12).fill(0);
  let grandTotal = 0;

  matrixData.forEach(row => {
    row.months.forEach((val, idx) => {
      monthlyTotals[idx] += val;
    });
    grandTotal += row.total;
  });

  return (
    <div className="executed-expenses-page">
      <div className="page-header">
        <div className="flex justify-between items-start flex-wrap gap-md">
          <div className="min-w-[200px]">
            <h1 className="page-header__title">Gastos Ejecutados</h1>
            <p className="page-header__subtitle">Análisis anual de ejecución real por categoría y mes</p>
          </div>
          
          <div className="flex gap-md items-center" style={{ flexWrap: 'wrap' }}>
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
             <select 
              className="glass-input" 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            
            <div className="segmented-control glass">
              <button 
                className={`segmented-control__btn ${sortOrder === 'category' ? 'active' : ''}`} 
                onClick={() => setSortOrder('category')}
              >
                A-Z
              </button>
              <button 
                className={`segmented-control__btn ${sortOrder === 'amount' ? 'active' : ''}`} 
                onClick={() => setSortOrder('amount')}
              >
                Mayor Total
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="table-responsive">
        <table className="matrix-table">
          <thead>
            <tr>
              <th>Categoría</th>
              {MONTHS.map(m => (
                <th key={m}>{m.substring(0, 3)}</th>
              ))}
              <th className="total-col">Total Anual</th>
            </tr>
          </thead>
          <tbody>
            {matrixData.map(row => (
              <tr key={row.id}>
                <td>
                  <div className="cat-label">
                    <span className="cat-icon" style={{ background: `${row.color}20`, color: row.color }}>
                      {row.icon}
                    </span>
                    <span>{row.name}</span>
                  </div>
                </td>
                {row.months.map((val, idx) => (
                  <td key={idx} className={val === 0 ? 'empty-cell' : ''}>
                    {val > 0 ? formatCurrency(val) : '-'}
                  </td>
                ))}
                <td className="total-col">
                  {row.total > 0 ? formatCurrency(row.total) : '-'}
                </td>
              </tr>
            ))}
            
            <tr className="total-row">
              <td>Total General</td>
              {monthlyTotals.map((val, idx) => (
                <td key={idx}>
                   {val > 0 ? formatCurrency(val) : '-'}
                </td>
              ))}
              <td className="total-col">{formatCurrency(grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
