import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../contexts/ToastContext';

export default function ExpenseForm({ expense, onClose }) {
  const { user } = useAuth();
  const { partnership, categories, addExpense, updateExpense } = useData();
  const toast = useToast();
  const isEditing = !!expense;

  const [form, setForm] = useState({
    category_id: '',
    expense_type: 'personal',
    cost_type: 'variable',
    amount: '',
    description: '',
    merchant: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (expense) {
      setForm({
        category_id: expense.category_id,
        expense_type: expense.expense_type,
        cost_type: expense.cost_type,
        amount: String(expense.amount),
        description: expense.description || '',
        merchant: expense.merchant || '',
        date: expense.date,
      });
    }
  }, [expense]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    try {
      e.preventDefault();

      if (!form.category_id || !form.amount || Number(form.amount) <= 0) {
        toast.warning('Completa todos los campos requeridos');
        return;
      }

      const expenseData = {
        ...form,
        amount: Number(form.amount),
        user_id: user?.id,
        partnership_id: partnership?.id,
      };

      if (isEditing) {
        updateExpense(expense.id, expenseData);
        toast.success('Gasto actualizado');
      } else {
        addExpense(expenseData);
        toast.success('Gasto registrado');
      }

      onClose();
    } catch (error) {
      console.error("Error en formulario:", error);
      toast.error('Error al procesar el formulario');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="exp-category">Categoría *</label>
        <select
          id="exp-category"
          className="glass-select"
          value={form.category_id}
          onChange={(e) => handleChange('category_id', e.target.value)}
          required
        >
          <option value="">Seleccionar categoría</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="exp-type">Tipo de gasto</label>
          <select
            id="exp-type"
            className="glass-select"
            value={form.expense_type}
            onChange={(e) => handleChange('expense_type', e.target.value)}
          >
            <option value="personal">👤 Personal</option>
            <option value="shared">👥 Compartido</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="exp-cost-type">Tipo de costo</label>
          <select
            id="exp-cost-type"
            className="glass-select"
            value={form.cost_type}
            onChange={(e) => handleChange('cost_type', e.target.value)}
          >
            <option value="fixed">📌 Fijo</option>
            <option value="variable">📊 Variable</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="exp-amount">Monto ($) *</label>
          <input
            id="exp-amount"
            type="number"
            className="glass-input"
            placeholder="0"
            value={form.amount}
            onChange={(e) => handleChange('amount', e.target.value)}
            min="1"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="exp-date">Fecha *</label>
          <input
            id="exp-date"
            type="date"
            className="glass-input"
            value={form.date}
            onChange={(e) => handleChange('date', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="exp-merchant">Comercio</label>
        <input
          id="exp-merchant"
          type="text"
          className="glass-input"
          placeholder="Ej: Éxito, Uber, Netflix..."
          value={form.merchant}
          onChange={(e) => handleChange('merchant', e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="exp-description">Descripción</label>
        <input
          id="exp-description"
          type="text"
          className="glass-input"
          placeholder="Detalle del gasto..."
          value={form.description}
          onChange={(e) => handleChange('description', e.target.value)}
        />
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn--secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn--primary" id="save-expense-btn">
          {isEditing ? '💾 Guardar Cambios' : '➕ Registrar Gasto'}
        </button>
      </div>
    </form>
  );
}
