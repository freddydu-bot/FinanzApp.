import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { useToast } from '../contexts/ToastContext';
import './SavingsPage.css';

export default function SavingsPage() {
  const { user } = useAuth();
  const { savingsGoals, upsertSavingsGoal, deleteSavingsGoal, addExpense, categories } = useData();
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [customAmounts, setCustomAmounts] = useState({});
  const [newGoal, setNewGoal] = useState({
    title: '',
    target_amount: '',
    current_amount: 0,
    icon: '💰',
    goal_type: 'shared'
  });

  const handleEditClick = (goal) => {
    setEditingGoal(goal);
    setNewGoal({ ...goal });
    setIsModalOpen(true);
  };

  const handleAddSaving = (goal, amount) => {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    const updated = { ...goal, current_amount: Number(goal.current_amount) + numAmount };
    upsertSavingsGoal(updated);

    if (goal.goal_type === 'shared') {
      const savingCategory = categories.find(c => c.name.toLowerCase().includes('ahorro')) || categories[0];
      const todayDate = new Date().toISOString().split('T')[0];
      addExpense({
        title: `Ahorro: ${goal.title}`,
        amount: numAmount,
        expense_type: 'shared',
        category_id: savingCategory.id,
        user_id: user.id,
        date: todayDate
      });
    }

    setCustomAmounts({ ...customAmounts, [goal.id]: '' });
    toast.success(`¡$${numAmount.toLocaleString()} ahorrados para ${goal.title}! 🚀`);
  };

  const handleSaveGoal = (e) => {
    e.preventDefault();
    if (!newGoal.title || !newGoal.target_amount) return;
    
    upsertSavingsGoal({ 
      ...newGoal, 
      id: editingGoal ? editingGoal.id : crypto.randomUUID(),
      target_amount: Number(newGoal.target_amount) 
    });

    setIsModalOpen(false);
    setEditingGoal(null);
    setNewGoal({ title: '', target_amount: '', current_amount: 0, icon: '💰', goal_type: 'shared' });
    toast.success(editingGoal ? 'Ahorro actualizado correctamente' : 'Nueva meta de ahorro creada');
  };

  return (
    <div className="savings-page animate-fadeIn">
      <div className="page-header">
        <div className="flex justify-between items-center w-full">
          <div>
            <h1 className="page-header__title">Ahorro e Inversión</h1>
            <p className="page-header__subtitle">Gestiona tu futuro con visión estratégica y metas claras</p>
          </div>
          <button className="btn btn--primary" onClick={() => { setEditingGoal(null); setNewGoal({title: '', target_amount: '', current_amount: 0, icon: '💰', goal_type: 'shared'}); setIsModalOpen(true); }}>
            ✨ Nueva Meta
          </button>
        </div>
      </div>

      <div className="savings-grid">
        {savingsGoals.map((goal) => {
          const progress = (goal.current_amount / goal.target_amount) * 100;
          return (
            <div key={goal.id} className="goal-card glass glass--hover animate-fadeInUp">
              <div className="goal-card__header">
                <span className="goal-card__icon">{goal.icon || '💰'}</span>
                <div className="goal-card__title-group">
                  <h3 className="goal-card__title">{goal.title}</h3>
                  <span className={`goal-card__badge-v2 ${goal.goal_type}`}>
                    {goal.goal_type === 'shared' ? '👥 Compartido' : '👤 Personal'}
                  </span>
                </div>
                <div className="goal-card__actions">
                  <button className="goal-card__btn-icon" onClick={() => handleEditClick(goal)} title="Editar">✏️</button>
                  <button className="goal-card__btn-icon delete" onClick={() => deleteSavingsGoal(goal.id)} title="Eliminar">✕</button>
                </div>
              </div>

              <div className="goal-card__content">
                <div className="goal-card__numbers">
                  <div className="goal-card__stat">
                    <span className="goal-card__label">Ahorrado</span>
                    <span className="goal-card__value">{formatCurrency(goal.current_amount)}</span>
                  </div>
                  <div className="goal-card__stat text-right">
                    <span className="goal-card__label">Meta</span>
                    <span className="goal-card__value-target">{formatCurrency(goal.target_amount)}</span>
                  </div>
                </div>

                <div className="goal-card__progress-container">
                  <div className="goal-card__progress-bar">
                    <div 
                      className="goal-card__progress-fill" 
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    >
                      <div className="goal-card__progress-shimmer" />
                    </div>
                  </div>
                  <span className="goal-card__percent">{formatPercent(progress, 0)}</span>
                </div>

                <div className="goal-card__actions-v2">
                  <div className="quick-amounts">
                    <button className="quick-btn" onClick={() => handleAddSaving(goal, 50000)}>+50k</button>
                    <button className="quick-btn" onClick={() => handleAddSaving(goal, 100000)}>+100k</button>
                    <button className="quick-btn" onClick={() => handleAddSaving(goal, 500000)}>+500k</button>
                  </div>
                  
                  <div className="custom-input-group mt-md">
                    <input 
                      type="number" 
                      className="custom-saving-input" 
                      placeholder="Monto personalizado..."
                      value={customAmounts[goal.id] || ''}
                      onChange={(e) => setCustomAmounts({ ...customAmounts, [goal.id]: e.target.value })}
                    />
                    <button 
                      className="btn-save-custom"
                      onClick={() => handleAddSaving(goal, customAmounts[goal.id])}
                    >
                      Ahorrar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        {savingsGoals.length === 0 && (
          <div className="full-width glass p-3xl text-center">
            <p className="text-secondary italic">Aún no tienes metas de ahorro. ¡Crea tu primera meta ahora!</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content glass" onClick={e => e.stopPropagation()}>
            <h2 className="section-title">
              {editingGoal ? '📝 Editar Ahorro' : '✨ Nueva Meta de Ahorro'}
            </h2>
            <form onSubmit={handleSaveGoal} className="flex flex-col gap-lg mt-xl">
              <div className="form-group">
                <label className="label">Nombre del Objetivo</label>
                <input 
                  className="glass-input" 
                  value={newGoal.title} 
                  onChange={e => setNewGoal({...newGoal, title: e.target.value})}
                  placeholder="Ej: Inversión en Bienes Raíces 🏠"
                  required 
                />
              </div>
              <div className="form-group">
                <label className="label">Meta Económica ($)</label>
                <input 
                  className="glass-input" 
                  type="number"
                  value={newGoal.target_amount} 
                  onChange={e => setNewGoal({...newGoal, target_amount: e.target.value})}
                  placeholder="5000000"
                  required 
                />
              </div>
              <div className="flex gap-md mt-xl">
                <button type="submit" className="btn btn--primary flex-1">
                  {editingGoal ? 'Guardar Cambios' : 'Crear Ahorro'}
                </button>
                <button type="button" className="btn btn--secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
