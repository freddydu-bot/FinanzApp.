import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import Modal from '../components/common/Modal';

export default function CategoriesPage() {
  const { categories, addCategory, updateCategory, deleteCategory } = useData();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', icon: '📦', color: '#6366f1' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.warning('El nombre es requerido'); return; }

    try {
      if (editing) {
        await updateCategory(editing.id, form);
        toast.success('Categoría actualizada');
      } else {
        await addCategory(form);
        toast.success('Categoría creada');
      }
      setShowForm(false);
      setEditing(null);
      setForm({ name: '', icon: '📦', color: '#6366f1' });
    } catch (error) {
      toast.error('Error al guardar la categoría: ' + error.message);
    }
  };

  const handleEdit = (cat) => {
    setEditing(cat);
    setForm({ name: cat.name, icon: cat.icon, color: cat.color });
    setShowForm(true);
  };

  const handleDelete = async (cat) => {
    if (cat.is_default) { toast.warning('No se pueden eliminar categorías predefinidas'); return; }
    if (window.confirm(`¿Eliminar la categoría "${cat.name}"?`)) {
      try {
        await deleteCategory(cat.id);
        toast.success('Categoría eliminada');
      } catch (error) {
        toast.error('Error al eliminar: ' + error.message);
      }
    }
  };

  const defaultCats = categories.filter((c) => c.is_default);
  const customCats = categories.filter((c) => !c.is_default);

  const EMOJI_OPTIONS = ['📦', '🏠', '🛒', '🚗', '💡', '🏥', '📚', '🎬', '👕', '🍽️', '🛡️', '💰', '🐾', '💻', '✨', '🎮', '🏋️', '✈️', '🎵', '🎁', '💊', '📱', '🏦', '🍕', '☕', '🛍️', '🚌', '💅', '📿', '🌿'];

  return (
    <div className="categories-page">
      <div className="page-header">
        <h1 className="page-header__title">🏷️ Categorías</h1>
        <p className="page-header__subtitle">{categories.length} categorías en total</p>
        <div className="page-header__actions">
          <button className="btn btn--primary" onClick={() => { setEditing(null); setForm({ name: '', icon: '📦', color: '#6366f1' }); setShowForm(true); }}>
            ＋ Nueva Categoría
          </button>
        </div>
      </div>

      {/* Default categories */}
      <div className="glass glass--static" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-lg)' }}>
        <h3 className="section-title">📋 Categorías Predefinidas</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
            {defaultCats.map((cat) => (
              <div key={cat.id} className="cat-chip glass--subtle hover-lift" style={{ borderLeft: `4px solid ${cat.color}` }}>
                <span className="cat-chip__icon">{cat.icon}</span>
                <span className="cat-chip__name">{cat.name}</span>
                <div className="cat-chip__actions" style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                  <button onClick={() => handleEdit(cat)} title="Editar" style={{ fontSize: '10px', opacity: 0.6 }}>✏️</button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Custom categories */}
      <div className="glass glass--static" style={{ padding: 'var(--space-xl)' }}>
        <h3 className="section-title">✏️ Categorías Personalizadas</h3>
        {customCats.length === 0 ? (
          <p className="text-sm text-tertiary" style={{ marginTop: 'var(--space-md)' }}>No hay categorías personalizadas aún.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
            {customCats.map((cat) => (
              <div key={cat.id} className="cat-chip glass--subtle hover-lift" style={{ borderLeft: `4px solid ${cat.color}` }}>
                <span className="cat-chip__icon">{cat.icon}</span>
                <span className="cat-chip__name">{cat.name}</span>
                <div className="cat-chip__actions">
                  <button onClick={() => handleEdit(cat)} title="Editar">✏️</button>
                  <button onClick={() => handleDelete(cat)} title="Eliminar">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditing(null); }} title={editing ? '✏️ Editar Categoría' : '➕ Nueva Categoría'} size="sm">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nombre</label>
            <input className="glass-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre de la categoría" required />
          </div>
          <div className="form-group">
            <label>Icono</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {EMOJI_OPTIONS.map((emoji) => (
                <button key={emoji} type="button" onClick={() => setForm({ ...form, icon: emoji })}
                  style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', border: form.icon === emoji ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)', background: form.icon === emoji ? 'var(--accent-primary-light)' : 'var(--bg-input)', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} style={{ width: 48, height: 36, border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)' }} />
              <span className="text-sm text-secondary">{form.color}</span>
            </div>
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

