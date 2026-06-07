import { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency } from '../utils/formatters';
import Modal from '../components/common/Modal';
import './RecurringPage.css';

export default function RecurringPage() {
  const { user } = useAuth();
  const { partnership, categories, recurringExpenses, addRecurring, updateRecurring, deleteRecurring, loading } = useData();
  const toast = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    category_id: '', expense_type: 'personal', cost_type: 'fixed',
    amount: '', description: '', merchant: '', day_of_month: 1,
  });

  const allRecurring = useMemo(() => {
    return recurringExpenses.filter((r) => r.user_id === user?.id || r.expense_type === 'shared');
  }, [recurringExpenses, user]);

  const totalCommitment = allRecurring.filter(r => r.is_active).reduce((s, r) => s + Number(r.amount), 0);

  const getCatInfo = (catId) => categories.find((c) => c.id === catId) || { name: 'Otro', icon: '📦', color: '#94a3b8' };

  const getSubscriptionIcon = (merchant) => {
    const m = merchant?.toLowerCase() || '';
    if (m.includes('netflix')) return '🍿';
    if (m.includes('spotify')) return '🎧';
    if (m.includes('gym') || m.includes('gimnasio')) return '💪';
    if (m.includes('internet') || m.includes('claro') || m.includes('tigo')) return '🌐';
    if (m.includes('seguro')) return '🛡️';
    if (m.includes('arriendo') || m.includes('renta')) return '🏠';
    return null;
  };

  const isRenewalSoon = (day) => {
    const today = new Date().getDate();
    return day >= today && day <= today + 3;
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: '70vh' }}>
        <div className="loading-screen__spinner animate-spin">🔁</div>
      </div>
    );
  }

  return (
    <div className="recurring-page">
      <div className="page-header">
        <div className="flex justify-between items-start flex-wrap gap-md w-full">
          <div>
            <h1 className="page-header__title">🔄 Administrador de Suscripciones</h1>
            <p className="page-header__subtitle">Gestión inteligente de gastos fijos y recurrentes</p>
          </div>
          <button className="btn btn--primary" onClick={() => { setEditing(null); setForm({ category_id: '', expense_type: 'personal', cost_type: 'fixed', amount: '', description: '', merchant: '', day_of_month: 1 }); setShowForm(true); }}>
            ＋ Nueva Suscripción
          </button>
        </div>
      </div>

      <div className="dashboard-grid mb-xl">
        <div className="stat-card glass border-glow--primary">
          <span className="stat-card__label">Compromiso Mensual</span>
          <span className="stat-card__value">{formatCurrency(totalCommitment)}</span>
          <span className="text-xs text-tertiary">Monto fijo que sale cada mes</span>
        </div>
        <div className="stat-card glass">
          <span className="stat-card__label">Suscripciones Activas</span>
          <span className="stat-card__value">{allRecurring.filter(r => r.is_active).length}</span>
          <span className="text-xs text-secondary">De un total de {allRecurring.length} configuradas</span>
        </div>
      </div>

      <div className="recurring-grid">
        {allRecurring.length === 0 ? (
          <div className="empty-state glass glass--static full-width">
            <span className="empty-state__icon">🔄</span>
            <h3>Sin gastos programados</h3>
            <p>Agrega tus suscripciones o arriendos para que la IA los considere en tu presupuesto.</p>
          </div>
        ) : (
          allRecurring.map((rec) => {
            const cat = getCatInfo(rec.category_id);
            const isOwn = rec.user_id === user?.id;
            const subIcon = getSubscriptionIcon(rec.merchant);
            const soon = isRenewalSoon(rec.day_of_month) && rec.is_active;
            
            return (
              <div key={rec.id} className={`subscription-card glass ${soon ? 'subscription-card--soon' : ''} ${!rec.is_active ? 'subscription-card--paused' : ''} animate-fadeInUp`}>
                {soon && <div className="renewal-badge">Vence pronto</div>}
                <div className="subscription-card__header">
                  <div className="subscription-icon" style={{ background: cat.color + '15', color: cat.color }}>
                    {subIcon || cat.icon}
                  </div>
                  <div className="subscription-status">
                    <span className={`status-dot ${rec.is_active ? 'status-dot--active' : ''}`}></span>
                    {rec.is_active ? 'Activa' : 'Pausada'}
                  </div>
                </div>
                
                <div className="subscription-card__body">
                  <h3 className="subscription-name">{rec.merchant || rec.description || cat.name}</h3>
                  <div className="subscription-amount" style={{ color: cat.color }}>{formatCurrency(rec.amount)}</div>
                  <div className="subscription-meta">
                    <span>🗓 Día {rec.day_of_month}</span>
                    <span className="dot-separator">•</span>
                    <span>{rec.expense_type === 'shared' ? '👥 Compartido' : '👤 Personal'}</span>
                  </div>
                </div>

                <div className="subscription-card__footer">
                  <div className="flex gap-sm">
                    {isOwn ? (
                      <>
                        <button className="icon-btn" onClick={() => handleToggleActive(rec)} title={rec.is_active ? 'Pausar' : 'Activar'}>{rec.is_active ? '⏸' : '▶️'}</button>
                        <button className="icon-btn" onClick={() => handleEdit(rec)} title="Editar">✏️</button>
                        <button className="icon-btn text-danger" onClick={() => handleDelete(rec)} title="Eliminar">🗑️</button>
                      </>
                    ) : (
                      <span className="text-xs text-tertiary px-sm">🔒 Propiedad de partner</span>
                    )}
                  </div>
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
