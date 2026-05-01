import { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';

export default function SmartValidationModal({ parsedData, onClose, onConfirm }) {
  const { categories } = useData();
  
  const [form, setForm] = useState({
    type: parsedData.type || 'expense',
    amount: parsedData.amount || 0,
    category_id: categories.find(c => c.name.toLowerCase() === parsedData.category_name?.toLowerCase())?.id || categories[0]?.id || '',
    merchant: parsedData.merchant && parsedData.merchant.toLowerCase() !== 'no especificado' ? parsedData.merchant : '',
    cost_type: parsedData.cost_type || 'variable',
    date: parsedData.date || new Date().toISOString().split('T')[0],
    description: parsedData.description || ''
  });

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleConfirm = () => {
    onConfirm(form);
  };

  const isIncome = form.type === 'income';

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel animate-fadeIn" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2 className="modal-title">🤖 Confirmar Registro</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body p-lg">
          <p className="text-sm text-tertiary mb-md">
            La Inteligencia Artificial ha interpretado tu audio/texto. Por favor revisa y ajusta si es necesario antes de guardar.
          </p>

          <div className="form-row">
            <div className="form-group">
              <label>Tipo</label>
              <select className="glass-select" value={form.type} onChange={(e) => handleChange('type', e.target.value)}>
                <option value="expense">📉 Gasto</option>
                <option value="income">📈 Ingreso</option>
              </select>
            </div>
            <div className="form-group">
              <label>Monto ($)</label>
              <input 
                type="number" 
                className="glass-input font-bold" 
                style={{ color: isIncome ? 'var(--color-success)' : 'var(--color-danger)' }}
                value={form.amount} 
                onChange={(e) => handleChange('amount', e.target.value)} 
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Categoría</label>
              <select className="glass-select" value={form.category_id} onChange={(e) => handleChange('category_id', e.target.value)}>
                <option value="">Seleccionar categoría</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
            {!isIncome && (
              <div className="form-group">
                <label>Subtipo</label>
                <select className="glass-select" value={form.cost_type} onChange={(e) => handleChange('cost_type', e.target.value)}>
                  <option value="variable">Variable</option>
                  <option value="fixed">Fijo</option>
                </select>
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Comercio / Fuente</label>
              <input 
                type="text" 
                className="glass-input" 
                value={form.merchant} 
                onChange={(e) => handleChange('merchant', e.target.value)} 
                placeholder="Ej: Uber, Éxito, Salario..."
              />
            </div>
            <div className="form-group">
              <label>Fecha</label>
              <input 
                type="date" 
                className="glass-input" 
                value={form.date} 
                onChange={(e) => handleChange('date', e.target.value)} 
              />
            </div>
          </div>

          <div className="form-group mt-sm">
            <label>Descripción</label>
            <input 
              type="text" 
              className="glass-input" 
              value={form.description} 
              onChange={(e) => handleChange('description', e.target.value)} 
            />
          </div>

        </div>
        <div className="modal-footer mt-md">
          <button className="btn btn--secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary flex items-center gap-sm" onClick={handleConfirm}>
            ✅ Confirmar y Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
