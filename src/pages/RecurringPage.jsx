import { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency } from '../utils/formatters';
import Modal from '../components/common/Modal';

export default function RecurringPage() {
  const { user } = useAuth();
  const { partnership, categories, recurringExpenses, addRecurring, updateRecurring, deleteRecurring, loading } = useData();

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: '70vh' }}>
        <div className="loading-screen__spinner animate-spin">🔁</div>
      </div>
    );
  }
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    category_id: '', expense_type: 'personal', cost_type: 'fixed',
    amount: '', description: '', merchant: '', day_of_month: 1,
  });

  const allRecurring = useMemo(() => {
    // STRICT PRIVACY: Only my personal OR shared ones. Never partner's personal.
    return recurringExpenses.filter((r) => r.user_id === user?.id || r.expense_type === 'shared');
  }, [recurringExpenses, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category_id || !form.amount) { 
      toast.warning('Completa los campos requeridos'); 
      return; 
    }

    try {
      const data = { 
        ...form, 
        amount: Number(form.amount), 
        day_of_month: Number(form.day_of_month), 
        user_id: editing ? editing.user_id : user.id, 
        partnership_id: partnership?.id, 
        is_active: editing ? editing.is_active : true 
    };

    if (editing) {
      await updateRecurring(editing.id, data);
      toast.success('Gasto recurrente actualizado');
    } else {
      await addRecurring(data);
      toast.success('Gasto recurrente creado');
    }
    setShowForm(false);
    setEditing(null);
    } catch (err) {
      console.error("Error submitting recurring:", err);
      toast.error('Error al procesar: ' + err.message);
    }
  };

  const handleEdit = (rec) => {
    setEditing(rec);
    setForm({ 
      category_id: rec.category_id, 
      expense_type: rec.expense_type, 
      cost_type: rec.cost_type, 
      amount: String(rec.amount), 
      description: rec.description || '', 
      merchant: rec.merchant || '', 
      day_of_month: rec.day_of_month 
    });
    setShowForm(true);
  };

  const handleToggleActive = (rec) => {
    updateRecurring(rec.id, { is_active: !rec.is_active });
    toast.info(rec.is_active ? 'Gasto recurrente pausado' : 'Gasto recurrente activado');
  };

  const handleDelete = (rec) => {
    if (window.confirm('¿Eliminar este gasto recurrente?')) {
      deleteRecurring(rec.id);
      toast.success('Gasto recurrente eliminado');
    }
  };

  const getCatInfo = (catId) => categories.find((c) => c.id === catId) || { name: 'Otro', icon: '📦', color: '#94a3b8' };

  return (
    <div className="recurring-page">
      <div className="page-header">
        <h1 className="page-header__title">🔄 Gastos Recurrentes</h1>
        <p className="page-header__subtitle">{allRecurring.length} gastos configurados en la pareja</p>
        <div className="page-header__actions">
          <button className="btn btn--primary" onClick={() => { setEditing(null); setForm({ category_id: '', expense_type: 'personal', cost_type: 'fixed', amount: '', description: '', merchant: '', day_of_month: 1 }); setShowForm(true); }}>
            ＋ Nuevo Recurrente
          </button>
        </div>
      </div>

      <div className="recurring-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: 1, visibility: 'visible' }}>
        {allRecurring.length === 0 ? (
          <div className="empty-state glass glass--static">
            <span className="empty-state__icon">🔄</span>
            <h3>Sin gastos recurrentes</h3>
            <p>Los gastos recurrentes se programan aquí para aparecer automáticamente cada mes.</p>
          </div>
        ) : (
          allRecurring.map((rec) => {
            const cat = getCatInfo(rec.category_id);
            const isOwn = rec.user_id === user?.id;
            
            return (
              <div key={rec.id} className={`expense-item glass ${!rec.is_active ? 'recurring-inactive' : ''}`} style={{ display: 'flex', opacity: 1, visibility: 'visible' }}>
                <div className="expense-item__icon" style={{ background: cat.color + '20', color: cat.color }}>
                  {cat.icon}
                </div>
                <div className="expense-item__info">
                  <div className="expense-item__top">
                    <span className="expense-item__merchant">{rec.merchant || rec.description || cat.name}</span>
                    <span className="expense-item__amount" style={{ color: cat.color }}>{formatCurrency(rec.amount)}</span>
                  </div>
                  <div className="expense-item__bottom">
                    <span className="expense-item__date">Día {rec.day_of_month} de cada mes</span>
                    <span className={`glass-tag ${rec.expense_type === 'shared' ? '' : 'glass-tag--success'}`} style={{ fontSize: '10px' }}>
                      {rec.expense_type === 'shared' ? '👥 Compartido' : `👤 ${isOwn ? 'Mío' : 'Partner'}`}
                    </span>
                    {!rec.is_active && <span className="glass-tag glass-tag--danger" style={{ fontSize: '10px' }}>⏸ Pausado</span>}
                  </div>
                </div>
                <div className="expense-item__actions">
                  {isOwn ? (
                    <>
                      <button className="expense-item__btn" onClick={() => handleToggleActive(rec)} title={rec.is_active ? 'Pausar' : 'Activar'}>{rec.is_active ? '⏸' : '▶️'}</button>
                      <button className="expense-item__btn" onClick={() => handleEdit(rec)} title="Editar">✏️</button>
                      <button className="expense-item__btn expense-item__btn--delete" onClick={() => handleDelete(rec)} title="Eliminar">🗑️</button>
                    </>
                  ) : (
                    <span className="text-xs text-tertiary">🔒</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditing(null); }} title={editing ? '✏️ Editar Recurrente' : '➕ Nuevo Recurrente'} size="md">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Categoría *</label>
            <select className="glass-select" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} required>
              <option value="">Seleccionar</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Tipo</label>
              <select className="glass-select" value={form.expense_type} onChange={(e) => setForm({ ...form, expense_type: e.target.value })}>
                <option value="personal">👤 Personal</option>
                <option value="shared">👥 Compartido</option>
              </select>
            </div>
            <div className="form-group">
              <label>Costo</label>
              <select className="glass-select" value={form.cost_type} onChange={(e) => setForm({ ...form, cost_type: e.target.value })}>
                <option value="fixed">📌 Fijo</option>
                <option value="variable">📊 Variable</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Monto ($) *</label>
              <input type="number" className="glass-input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} min="1" required />
            </div>
            <div className="form-group">
              <label>Día del mes</label>
              <input type="number" className="glass-input" value={form.day_of_month} onChange={(e) => setForm({ ...form, day_of_month: e.target.value })} min="1" max="31" />
            </div>
          </div>
          <div className="form-group">
            <label>Comercio</label>
            <input className="glass-input" value={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.value })} placeholder="Ej: Netflix, Spotify..." />
          </div>
          <div className="form-group">
            <label>Descripción</label>
            <input className="glass-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalle..." />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn--secondary" onClick={() => { setShowForm(false); setEditing(null); }}>Cancelar</button>
            <button type="submit" className="btn btn--primary">{editing ? '💾 Guardar' : '➕ Crear'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
