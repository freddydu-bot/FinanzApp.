import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency } from '../../utils/formatters';

export default function CsvImporter({ onClose }) {
  const { user } = useAuth();
  const { partnership, categories, addBulkExpenses } = useData();
  const toast = useToast();
  const [parsedData, setParsedData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({
    date: '', amount: '', merchant: '', description: '', category: '',
  });
  const [step, setStep] = useState(1);
  const [preview, setPreview] = useState([]);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) {
          toast.error('El archivo CSV está vacío');
          return;
        }
        setHeaders(Object.keys(results.data[0]));
        setParsedData(results.data);
        setStep(2);
        toast.info(`${results.data.length} filas encontradas`);
      },
      error: () => toast.error('Error al leer el archivo CSV'),
    });
  }, [toast]);

  const handleMapping = () => {
    if (!mapping.date || !mapping.amount) {
      toast.warning('Mapea al menos Fecha y Monto');
      return;
    }

    const mapped = parsedData.map((row) => ({
      date: row[mapping.date] || new Date().toISOString().split('T')[0],
      amount: Math.abs(parseFloat(String(row[mapping.amount]).replace(/[^0-9.-]/g, '')) || 0),
      merchant: mapping.merchant ? row[mapping.merchant] : '',
      description: mapping.description ? row[mapping.description] : '',
      category_name: mapping.category ? row[mapping.category] : '',
    })).filter((r) => r.amount > 0);

    setPreview(mapped);
    setStep(3);
  };

  const handleImport = () => {
    const expenses = preview.map((row) => {
      const cat = categories.find((c) =>
        c.name.toLowerCase() === (row.category_name || '').toLowerCase()
      );

      return {
        user_id: user.id,
        partnership_id: partnership.id,
        category_id: cat ? cat.id : categories.find((c) => c.name === 'Otros')?.id || categories[0]?.id,
        expense_type: 'personal',
        cost_type: 'variable',
        amount: row.amount,
        description: row.description,
        merchant: row.merchant,
        date: row.date,
        is_recurring: false,
      };
    });

    addBulkExpenses(expenses);
    toast.success(`${expenses.length} gastos importados exitosamente`);
    onClose();
  };

  return (
    <div className="csv-importer">
      {step === 1 && (
        <div className="csv-step">
          <div className="csv-upload-area glass--subtle" style={{ padding: '2rem', textAlign: 'center', borderRadius: 'var(--radius-lg)', border: '2px dashed var(--border-color-strong)' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>📄</span>
            <p className="text-secondary mb-md">Selecciona un archivo CSV con tus gastos</p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              id="csv-file-input"
              style={{ display: 'block', margin: '0 auto' }}
            />
          </div>
          <div style={{ marginTop: '1rem' }}>
            <p className="text-xs text-tertiary">
              El CSV debe tener encabezados. Se mapearán las columnas en el siguiente paso.
            </p>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="csv-step">
          <h4 style={{ marginBottom: '1rem' }}>Mapear columnas</h4>
          <p className="text-sm text-secondary mb-md">
            Asocia las columnas del CSV con los campos del gasto:
          </p>
          {['date', 'amount', 'merchant', 'description', 'category'].map((field) => (
            <div className="form-group" key={field}>
              <label>
                {field === 'date' ? '📅 Fecha *' :
                 field === 'amount' ? '💰 Monto *' :
                 field === 'merchant' ? '🏪 Comercio' :
                 field === 'description' ? '📝 Descripción' : '🏷️ Categoría'}
              </label>
              <select
                className="glass-select"
                value={mapping[field]}
                onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value }))}
              >
                <option value="">— No mapear —</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          ))}
          <div className="form-actions">
            <button className="btn btn--secondary" onClick={() => setStep(1)}>← Atrás</button>
            <button className="btn btn--primary" onClick={handleMapping}>Previsualizar →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="csv-step">
          <h4 style={{ marginBottom: '1rem' }}>
            Previsualización ({preview.length} gastos)
          </h4>
          <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1rem' }}>
            <table className="glass-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Comercio</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 20).map((row, i) => (
                  <tr key={i}>
                    <td>{row.date}</td>
                    <td>{row.merchant || row.description || '—'}</td>
                    <td style={{ fontWeight: 700 }}>{formatCurrency(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 20 && (
              <p className="text-xs text-tertiary" style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                ...y {preview.length - 20} más
              </p>
            )}
          </div>
          <div className="form-actions">
            <button className="btn btn--secondary" onClick={() => setStep(2)}>← Atrás</button>
            <button className="btn btn--primary" onClick={handleImport} id="confirm-import-btn">
              ✅ Importar {preview.length} gastos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
