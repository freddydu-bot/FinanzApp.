import { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency, getMonthName } from '../utils/formatters';
import { calculateFinancialSummary } from '../utils/calculations';
import Modal from '../components/common/Modal';
import './IncomesPage.css';

export default function IncomesPage() {
  const { user } = useAuth();
  const { 
    partnership, incomes, expenses, addIncome, updateIncome, deleteIncome, 
    selectedMonth, selectedYear, loading 
  } = useData();
  const toast = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    income_type: 'personal',
  });

  const summary = useMemo(() => {
    // We pass ALL incomes and expenses to calculate the cumulative dragging
    return calculateFinancialSummary(incomes, expenses, selectedMonth, selectedYear);
  }, [incomes, expenses, selectedMonth, selectedYear]);

  const currentIncomes = useMemo(() => {
    return incomes.filter(i => {
      const d = new Date(i.date + 'T12:00:00');
      return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [incomes, selectedMonth, selectedYear]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.amount) {
      toast.warning('Completa todos los campos');
      return;
    }

    const data = {
      ...form,
      amount: Number(form.amount),
    };

    try {
      if (editing) {
        await updateIncome(editing.id, data);
        toast.success('Ingreso actualizado');
      } else {
        await addIncome(data);
        toast.success('Ingreso registrado');
      }
      setShowForm(false);
      setEditing(null);
    } catch (err) {
      toast.error('Error al guardar: ' + err.message);
    }
  };

  const handleEdit = (inc) => {
    setEditing(inc);
    setForm({
      name: inc.name,
      amount: String(inc.amount),
      date: inc.date,
      income_type: inc.income_type,
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar este ingreso?')) {
      try {
        await deleteIncome(id);
        toast.success('Ingreso eliminado');
      } catch (err) {
        toast.error('Error al eliminar');
      }
    }
  };

  if (loading) return null;

  return (
    <div className="incomes-page">
      <div className="page-header">
        <h1 className="page-header__title">💰 Gestión de Ingresos</h1>
        <p className="page-header__subtitle">Control acumulativo de liquidez</p>
      </div>

      {/* FINANCIAL SUMMARY (Points 2, 3, 5) */}
      <div className="financial-summary-grid mb-xl">
        <div className="summary-card glass">
          <span className="summary-card__label">Saldo Inicial (Arrastrado)</span>
          <span className={`summary-card__value ${summary.initialBalance >= 0 ? 'text-success' : 'text-danger'}`}>
             {formatCurrency(summary.initialBalance)}
          </span>
          <span className="summary-card__desc">Del periodo anterior</span>
        </div>
        <div className="summary-card glass">
          <span className="summary-card__label">Ingresos del Mes</span>
          <span className="summary-card__value text-primary">{formatCurrency(summary.totalIncomes)}</span>
          <span className="summary-card__desc">Período actual</span>
        </div>
        <div className="summary-card glass">
          <span className="summary-card__label">Gastos del Mes</span>
          <span className="summary-card__value text-warning">{formatCurrency(summary.totalExpenses)}</span>
          <span className="summary-card__desc">Período actual</span>
        </div>
        <div className="summary-card glass highlight">
          <span className="summary-card__label">Saldo Final</span>
          <span className={`summary-card__value ${summary.finalBalance >= 0 ? 'text-success' : 'text-danger'}`}>
            {formatCurrency(summary.finalBalance)}
          </span>
          <span className="summary-card__desc">Disponible para el próximo mes</span>
        </div>
      </div>

      <div className="flex justify-between items-center mb-lg">
        <h2 className="section-title">Ingresos de {getMonthName(selectedMonth)} {selectedYear}</h2>
        <button className="btn btn--primary" onClick={() => { setEditing(null); setShowForm(true); }}>
          ＋ Nuevo Ingreso
        </button>
      </div>

      <div className="incomes-list glass glass--static">
        {currentIncomes.length === 0 ? (
          <div className="empty-state p-xl text-center">
            <span className="empty-state__icon">💸</span>
            <p className="text-tertiary">No hay ingresos registrados en este período.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th className="text-right">Monto</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {currentIncomes.map((inc) => (
                  <tr key={inc.id}>
                    <td className="font-bold">{inc.name}</td>
                    <td>{inc.date}</td>
                    <td>
                      <span className={`glass-tag ${inc.income_type === 'shared' ? '' : 'glass-tag--success'}`}>
                        {inc.income_type === 'shared' ? '👥 Compartido' : '👤 Personal'}
                      </span>
                    </td>
                    <td className="text-right font-bold text-success">{formatCurrency(inc.amount)}</td>
                    <td className="text-right">
                      <button className="btn-icon" onClick={() => handleEdit(inc)}>✏️</button>
                      <button className="btn-icon text-danger" onClick={() => handleDelete(inc.id)}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? '✏️ Editar Ingreso' : '💰 Nuevo Ingreso'}>
        <form onSubmit={handleSubmit} className="form-stack">
          <div className="form-group">
            <label>Nombre del Ingreso *</label>
            <input 
              className="glass-input" 
              value={form.name} 
              onChange={(e) => setForm({ ...form, name: e.target.value })} 
              placeholder="Ej: Salario Abril, Bono..." 
              required 
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Monto ($) *</label>
              <input 
                type="number" 
                className="glass-input" 
                value={form.amount} 
                onChange={(e) => setForm({ ...form, amount: e.target.value })} 
                required 
              />
            </div>
            <div className="form-group">
              <label>Fecha</label>
              <input 
                type="date" 
                className="glass-input" 
                value={form.date} 
                onChange={(e) => setForm({ ...form, date: e.target.value })} 
              />
            </div>
          </div>
          <div className="form-group">
            <label>Tipo de Ingreso</label>
            <select 
              className="glass-select" 
              value={form.income_type} 
              onChange={(e) => setForm({ ...form, income_type: e.target.value })}
            >
              <option value="personal">👤 Personal</option>
              <option value="shared">👥 Compartido</option>
            </select>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn--secondary" onClick={() => setShowForm(false)}>Cancelar</button>
            <button type="submit" className="btn btn--primary">Guardar Ingreso</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
