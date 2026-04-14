import { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { isDemoMode } from '../lib/supabase';
import { formatCurrency, formatDate, getMonthName } from '../utils/formatters';
import { filterByPeriod, getSemaphoreStatus } from '../utils/calculations';
import Modal from '../components/common/Modal';
import ExpenseForm from '../components/expenses/ExpenseForm';
import CsvImporter from '../components/expenses/CsvImporter';
import './ExpensesPage.css';

export default function ExpensesPage() {
  const { user } = useAuth();
  const { expenses, categories, budgets, deleteExpense, selectedMonth, selectedYear, loading, partnership } = useData();
  const toast = useToast();

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: '70vh' }}>
        <div className="loading-screen__spinner animate-spin">💸</div>
      </div>
    );
  }

  const [showForm, setShowForm] = useState(false);
  const [showCsv, setShowCsv] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterCostType, setFilterCostType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const periodExpenses = useMemo(
    () => filterByPeriod(expenses, selectedMonth, selectedYear),
    [expenses, selectedMonth, selectedYear]
  );

  // Apply filters - STRICT PRIVACY: Partner personal expenses are NEVER shown
  const filteredExpenses = useMemo(() => {
    return periodExpenses
      .filter((e) => {
        // Only show my personal expenses OR shared expenses
        const isMine = e.user_id === user?.id;
        const isShared = e.expense_type === 'shared';
        
        if (!isMine && !isShared) return false;

        if (filterType === 'personal') return e.expense_type === 'personal' && isMine;
        if (filterType === 'shared') return e.expense_type === 'shared';
        
        return true; 
      })
      .filter((e) => filterCategory === 'all' || e.category_id === filterCategory)
      .filter((e) => filterCostType === 'all' || e.cost_type === filterCostType)
      .filter((e) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          (e.description || '').toLowerCase().includes(q) ||
          (e.merchant || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [periodExpenses, filterType, filterCategory, filterCostType, searchQuery, user]);

  const totalFiltered = filteredExpenses.reduce((s, e) => s + Number(e.amount), 0);

  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar este gasto definitivamente?')) {
      deleteExpense(id);
      toast.success('Gasto eliminado');
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setShowForm(true);
  };

  const getCategoryInfo = (catId) => {
    return categories.find((c) => c.id === catId) || { name: 'Otro', icon: '📦', color: '#94a3b8' };
  };

  return (
    <div className="expenses-page">
      <div className="page-header">
        <h1 className="page-header__title">💳 Gastos</h1>
        <p className="page-header__subtitle">
          {getMonthName(selectedMonth)} {selectedYear} — {filteredExpenses.length} registros
        </p>
        <div className="page-header__actions">
          <button className="btn btn--primary" onClick={() => { setEditingExpense(null); setShowForm(true); }} id="new-expense-btn">
            ＋ Nuevo Gasto
          </button>
          <button className="btn btn--secondary" onClick={() => setShowCsv(true)} id="import-csv-btn">
            📥 Importar CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="expense-filters glass glass--static animate-fadeIn">
        <div className="expense-filters__row">
          <div className="filter-group">
            <label>Tipo de Gasto</label>
            <select className="glass-select" value={filterType} onChange={(e) => setFilterType(e.target.value)} id="filter-type">
              <option value="all">Todos mis registros</option>
              <option value="personal">👤 Mis Gastos Personales</option>
              <option value="shared">👥 Gastos Compartidos</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Categoría</label>
            <select className="glass-select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} id="filter-category">
              <option value="all">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Tipo de Costo</label>
            <select className="glass-select" value={filterCostType} onChange={(e) => setFilterCostType(e.target.value)} id="filter-cost-type">
              <option value="all">Fijos y Variables</option>
              <option value="fixed">📌 Costos Fijos</option>
              <option value="variable">📊 Costos Variables</option>
            </select>
          </div>
          <div className="filter-group filter-group--search">
            <label>Buscar Comercio</label>
            <input
              className="glass-input"
              placeholder="Ej: Cine, Mercado..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="filter-search"
            />
          </div>
        </div>
        <div className="expense-filters__total">
          Total en vista: <strong>{formatCurrency(totalFiltered)}</strong>
        </div>
      </div>

      {/* Expense list */}
      <div className="expense-list" style={{ display: 'block', opacity: 1, visibility: 'visible' }}>
        {filteredExpenses.length === 0 ? (
          <div className="empty-state glass glass--static">
            <span className="empty-state__icon">📭</span>
            <h3>Sin registros</h3>
            <p>No hay gastos que coincidan con los filtros seleccionados para este mes.</p>
          </div>
        ) : (
          <div className="list-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredExpenses.map((exp) => {
              const cat = getCategoryInfo(exp.category_id);
              const isOwn = exp.user_id === user?.id;
              const isPartnerPersonal = !isOwn && exp.expense_type === 'personal';
              
              // Privacy Masking: if it's partner's personal expense, hide merchant and description
              const displayMerchant = isPartnerPersonal ? 'Gasto del Partner' : (exp.merchant || exp.description || 'Sin descripción');
              
              return (
                <div key={exp.id} className="expense-item glass" style={{ opacity: 1, visibility: 'visible', display: 'flex' }}>
                  <div className="expense-item__icon" style={{ background: cat.color + '20', color: cat.color }}>
                    {cat.icon}
                  </div>
                  <div className="expense-item__info">
                    <div className="expense-item__top">
                      <span className="expense-item__merchant" style={{ fontStyle: isPartnerPersonal ? 'italic' : 'normal', opacity: isPartnerPersonal ? 0.7 : 1 }}>
                        {displayMerchant}
                      </span>
                      <span className="expense-item__amount" style={{ color: cat.color }}>
                        {formatCurrency(exp.amount)}
                      </span>
                    </div>
                    <div className="expense-item__bottom">
                      <span className="expense-item__date">{formatDate(exp.date)}</span>
                      <span className="expense-item__category">{cat.name}</span>
                      <span className={`glass-tag ${exp.expense_type === 'shared' ? '' : 'glass-tag--success'}`} style={{ fontSize: '10px' }}>
                        {exp.expense_type === 'shared' ? '👥 Compartido' : (isOwn ? '👤 Personal' : '💑 Partner')}
                      </span>
                      {isPartnerPersonal && <span className="glass-tag" style={{ fontSize: '10px', background: 'rgba(0,0,0,0.2)' }}>🔒 Privado</span>}
                    </div>
                  </div>
                  <div className="expense-item__actions">
                    {isOwn ? (
                      <>
                        <button className="expense-item__btn" onClick={() => handleEdit(exp)} title="Editar">✏️</button>
                        <button className="expense-item__btn expense-item__btn--delete" onClick={() => handleDelete(exp.id)} title="Eliminar">🗑️</button>
                      </>
                    ) : (
                      <span className="text-xs text-tertiary" title="Privacidad protegida">🔒</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New/Edit Expense Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingExpense(null); }}
        title={editingExpense ? '✏️ Editar Gasto' : '➕ Nuevo Gasto'}
        size="md"
      >
        <ExpenseForm
          expense={editingExpense}
          onClose={() => { setShowForm(false); setEditingExpense(null); }}
        />
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        isOpen={showCsv}
        onClose={() => setShowCsv(false)}
        title="📥 Importar desde CSV"
        size="lg"
      >
        <CsvImporter onClose={() => setShowCsv(false)} />
      </Modal>
    </div>
  );
}

