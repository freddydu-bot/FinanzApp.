import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency } from '../utils/formatters';
import jsPDF from 'jspdf';

export default function SettingsPage() {
  const { user, logout, isDemoMode } = useAuth();
  const { partnership, partner, expenses, budgets, categories, updateSplit, resetDemoData, createPartnership, selectedMonth, selectedYear } = useData();
  const toast = useToast();
  const [splitValue, setSplitValue] = useState(partnership?.user1_split_pct || 50);

  const isUser1 = user?.id === partnership?.user1_id;
  const mySplit = isUser1 ? splitValue : 100 - splitValue;
  const partnerSplit = isUser1 ? 100 - splitValue : splitValue;

  const handleSaveSplit = () => {
    updateSplit(splitValue);
    toast.success(`Split actualizado: ${mySplit}% / ${partnerSplit}%`);
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      const monthNames = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

      // Header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('FinanzApp — Reporte Mensual', 20, 25);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`${monthNames[selectedMonth]} ${selectedYear} — ${user?.display_name}`, 20, 35);

      // Personal expenses
      const myExpenses = expenses.filter((e) => {
        const d = new Date(e.date + 'T00:00:00');
        return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear &&
          e.user_id === user?.id && e.expense_type === 'personal';
      });
      const myTotal = myExpenses.reduce((s, e) => s + Number(e.amount), 0);

      // Shared expenses
      const sharedExp = expenses.filter((e) => {
        const d = new Date(e.date + 'T00:00:00');
        return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear && e.expense_type === 'shared';
      });
      const sharedTotal = sharedExp.reduce((s, e) => s + Number(e.amount), 0);

      let y = 50;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumen', 20, y);
      y += 10;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Gastos Personales: ${formatCurrency(myTotal)}`, 20, y); y += 7;
      doc.text(`Gastos Compartidos: ${formatCurrency(sharedTotal)}`, 20, y); y += 7;
      doc.text(`Carga Financiera: ${formatCurrency(myTotal + sharedTotal * (mySplit / 100))}`, 20, y); y += 7;
      doc.text(`Split: ${mySplit}% / ${partnerSplit}%`, 20, y); y += 15;

      // Expense table
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Gastos Personales', 20, y); y += 8;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Fecha', 20, y);
      doc.text('Comercio', 55, y);
      doc.text('Categoría', 110, y);
      doc.text('Monto', 160, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      myExpenses.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach((exp) => {
        if (y > 270) { doc.addPage(); y = 20; }
        const cat = categories.find((c) => c.id === exp.category_id) || { name: 'Otro' };
        doc.text(exp.date, 20, y);
        doc.text((exp.merchant || exp.description || '-').substring(0, 25), 55, y);
        doc.text(cat.name.substring(0, 20), 110, y);
        doc.text(formatCurrency(exp.amount), 160, y);
        y += 6;
      });

      doc.save(`FinanzApp_${monthNames[selectedMonth]}_${selectedYear}.pdf`);
      toast.success('PDF exportado exitosamente');
    } catch (err) {
      toast.error('Error al generar el PDF');
      console.error(err);
    }
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1 className="page-header__title">⚙️ Configuración</h1>
        <p className="page-header__subtitle">Gestión de cuenta y preferencias</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        {/* Profile */}
        <div className="glass glass--static" style={{ padding: 'var(--space-xl)' }}>
          <h3 className="section-title">👤 Perfil</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', marginTop: 'var(--space-md)' }}>
            <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-full)', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', color: 'white', fontWeight: 700 }}>
              {user?.display_name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <p className="text-xl font-bold">{user?.display_name}</p>
              <p className="text-sm text-secondary">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Partnership & Split */}
        <div className="glass glass--static" style={{ padding: 'var(--space-xl)' }}>
          <h3 className="section-title">👥 Vínculo con tu Pareja</h3>
          <div style={{ marginTop: 'var(--space-md)' }}>
            {!partnership ? (
              <div className="link-partner-form">
                <p className="text-sm text-secondary mb-md">Vincula a tu pareja para compartir el presupuesto de la casa e iniciar proyecciones conjuntas.</p>
                <div className="form-group">
                  <input 
                    type="email" 
                    className="glass-input" 
                    placeholder="correo.pareja@ejemplo.com" 
                    id="partner-email-input"
                  />
                  <button 
                    className="btn btn--secondary btn--sm" 
                    style={{ marginTop: '1rem' }}
                    onClick={async () => {
                      const emailInputValue = document.getElementById('partner-email-input').value;
                      if (!emailInputValue) {
                        toast.error('Por favor ingresa un correo válido.');
                        return;
                      }
                      try {
                        await createPartnership(emailInputValue);
                        toast.success('¡Pareja vinculada con éxito! ❤️');
                      } catch (e) {
                        toast.error(e.message);
                      }
                    }}
                  >
                    💖 Vincular Pareja
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                    {partner?.display_name?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <p className="font-bold">{partner?.display_name || 'Pareja (Cargando...)'}</p>
                    <p className="text-xs text-secondary">{partner?.email || ''}</p>
                  </div>
                  <div className="glass-tag glass-tag--success" style={{ marginLeft: 'auto' }}>Conectados</div>
                </div>
                
                <div className="form-group">
                  <label>Distribución de gastos compartidos (Split)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <span className="text-sm font-semibold" style={{ minWidth: '80px' }}>{user?.display_name}: {mySplit}%</span>
                    <input type="range" min="0" max="100" value={splitValue} onChange={(e) => setSplitValue(Number(e.target.value))} style={{ flex: 1, cursor: 'pointer' }} />
                    <span className="text-sm font-semibold" style={{ minWidth: '80px', textAlign: 'right' }}>Pareja: {partnerSplit}%</span>
                  </div>
                  <button className="btn btn--primary btn--sm" onClick={handleSaveSplit} style={{ marginTop: 'var(--space-sm)' }}>
                    💾 Guardar Distribución
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Export */}
        <div className="glass glass--static" style={{ padding: 'var(--space-xl)' }}>
          <h3 className="section-title">📄 Exportar</h3>
          <p className="text-sm text-secondary mb-md">Genera un reporte PDF del mes seleccionado</p>
          <button className="btn btn--secondary" onClick={handleExportPDF} id="export-pdf-btn">
            📄 Exportar PDF del Mes
          </button>
        </div>

        {/* Demo controls */}
        {isDemoMode && (
          <div className="glass glass--static" style={{ padding: 'var(--space-xl)', borderLeft: '4px solid var(--color-warning)' }}>
            <h3 className="section-title">🎮 Controles Demo</h3>
            <p className="text-sm text-secondary mb-md">
              Estás en modo demo. Los datos se almacenan en localStorage.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <button className="btn btn--danger" onClick={() => { resetDemoData(); toast.info('Datos demo reiniciados'); }}>
                🔄 Reiniciar Datos Demo
              </button>
            </div>
          </div>
        )}

        {/* Logout */}
        <div className="glass glass--static" style={{ padding: 'var(--space-xl)' }}>
          <button className="btn btn--danger" onClick={logout} id="settings-logout-btn">
            🚪 Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
}

