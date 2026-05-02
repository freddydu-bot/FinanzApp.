import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { formatCurrency, getMonthName } from '../utils/formatters';
import { haptic, playSound } from '../utils/haptics';
import './CopilotPage.css';

const insightColors = {
  success: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', text: '#10b981' },
  warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', text: '#f59e0b' },
  danger:  { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  text: '#ef4444' },
  tip:     { bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)', text: '#818cf8' },
};

const scoreGradients = {
  'Excelente': 'linear-gradient(135deg, #10b981, #059669)',
  'Buena':     'linear-gradient(135deg, #6366f1, #8b5cf6)',
  'Regular':   'linear-gradient(135deg, #f59e0b, #d97706)',
  'Crítica':   'linear-gradient(135deg, #ef4444, #dc2626)',
};

function ScoreRing({ score, label, emoji }) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="copilot-score-ring">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r="54" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
        <motion.circle
          cx="70" cy="70" r="54"
          fill="none"
          stroke="url(#scoreGrad)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.8, ease: 'easeOut', delay: 0.3 }}
          transform="rotate(-90 70 70)"
        />
        <defs>
          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="copilot-score-ring__center">
        <span className="copilot-score-ring__emoji">{emoji}</span>
        <span className="copilot-score-ring__number">{score}</span>
        <span className="copilot-score-ring__label">{label}</span>
      </div>
    </div>
  );
}

function CategoryBar({ name, amount, pct, maxAmount }) {
  const width = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
  return (
    <div className="copilot-cat-bar">
      <div className="copilot-cat-bar__header">
        <span className="copilot-cat-bar__name">{name}</span>
        <span className="copilot-cat-bar__amount">{formatCurrency(amount)}</span>
      </div>
      <div className="copilot-cat-bar__track">
        <motion.div
          className="copilot-cat-bar__fill"
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <span className="copilot-cat-bar__pct">{pct}%</span>
    </div>
  );
}

export default function CopilotPage() {
  const { user } = useAuth();
  const { expenses, incomes, selectedMonth, selectedYear } = useData();
  const toast = useToast();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  const myExpenses = useMemo(() =>
    expenses.filter(e => {
      const d = new Date(e.date + 'T12:00:00');
      return String(e.user_id) === String(user?.id) &&
        d.getMonth() + 1 === selectedMonth &&
        d.getFullYear() === selectedYear;
    }),
    [expenses, user, selectedMonth, selectedYear]
  );

  const myIncomes = useMemo(() =>
    incomes.filter(i => {
      const d = new Date(i.date + 'T12:00:00');
      return String(i.user_id) === String(user?.id) &&
        d.getMonth() + 1 === selectedMonth &&
        d.getFullYear() === selectedYear;
    }),
    [incomes, user, selectedMonth, selectedYear]
  );

  const handleAnalyze = async () => {
    setLoading(true);
    haptic.light();
    try {
      const { data, error } = await supabase.functions.invoke('financial-copilot', {
        body: {
          expenses: myExpenses,
          incomes: myIncomes,
          currentMonth: selectedMonth,
          currentYear: selectedYear,
          userName: user?.display_name || user?.email?.split('@')[0]
        }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setReport(data);
      playSound.success();
      haptic.success();
      setChatHistory([]);
    } catch (err) {
      toast.error('Error del Copiloto: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim() || !report) return;
    const q = question.trim();
    setQuestion('');
    setChatHistory(prev => [...prev, { role: 'user', text: q }]);
    setChatLoading(true);
    haptic.light();

    try {
      const context = `
        Datos del usuario: ingresos=${formatCurrency(report.totalIncomes)}, 
        gastos=${formatCurrency(report.totalExpenses)}, 
        balance=${formatCurrency(report.balance)}, 
        ahorro=${report.savingsRate}%, 
        top categoría=${report.top_category?.name} (${formatCurrency(report.top_category?.amount)}).
        Score financiero: ${report.score}/100 (${report.score_label}).
      `;
      const { data, error } = await supabase.functions.invoke('process-transaction', {
        body: {
          text: `Actúa como copiloto financiero personal. Contexto financiero del usuario: ${context}. Pregunta del usuario: "${q}". Responde en máximo 3 oraciones, de forma directa, amigable y con datos concretos. Responde en texto plano, sin JSON.`,
          categories: []
        }
      });

      // process-transaction returns JSON, but for chat we want text
      let answer = 'No pude procesar tu pregunta. Intenta de nuevo.';
      if (data && typeof data === 'object' && data.description) {
        answer = data.description;
      } else if (typeof data === 'string') {
        answer = data;
      }
      
      setChatHistory(prev => [...prev, { role: 'copilot', text: answer }]);
      playSound.pop();
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'copilot', text: 'Error al consultar. Intenta de nuevo.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const hasData = myExpenses.length > 0 || myIncomes.length > 0;

  return (
    <div className="copilot-page">
      <div className="page-header">
        <div>
          <h1 className="page-header__title">🤖 Copiloto Financiero</h1>
          <p className="page-header__subtitle">
            IA que analiza tus finanzas de {getMonthName(selectedMonth)} {selectedYear}
          </p>
        </div>
        <button
          className="btn btn--primary"
          onClick={handleAnalyze}
          disabled={loading || !hasData}
          style={{ minWidth: '160px' }}
        >
          {loading ? (
            <span className="flex items-center gap-sm">
              <span className="animate-spin">⚙️</span> Analizando...
            </span>
          ) : (
            '✨ Analizar mis finanzas'
          )}
        </button>
      </div>

      {!hasData && (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📭</div>
          <h2 style={{ color: 'var(--text-secondary)' }}>Sin datos este mes</h2>
          <p style={{ color: 'var(--text-tertiary)' }}>
            Registra algunos gastos o ingresos en {getMonthName(selectedMonth)} para activar el Copiloto.
          </p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {report && (
          <motion.div
            key="report"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="copilot-report"
          >
            {/* ── SCORE + SUMMARY ─────────────────────────────────── */}
            <div className="copilot-hero glass-panel">
              <ScoreRing
                score={report.score}
                label={report.score_label}
                emoji={report.score_emoji}
              />
              <div className="copilot-hero__text">
                <h2 className="copilot-hero__title">
                  Salud Financiera: <span style={{ background: scoreGradients[report.score_label], WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{report.score_label}</span>
                </h2>
                <p className="copilot-hero__summary">{report.summary}</p>
                <div className="copilot-kpis">
                  <div className="copilot-kpi">
                    <span className="copilot-kpi__label">Ingresos</span>
                    <span className="copilot-kpi__value text-success">{formatCurrency(report.totalIncomes)}</span>
                  </div>
                  <div className="copilot-kpi">
                    <span className="copilot-kpi__label">Gastos</span>
                    <span className="copilot-kpi__value text-danger">{formatCurrency(report.totalExpenses)}</span>
                  </div>
                  <div className="copilot-kpi">
                    <span className="copilot-kpi__label">Tasa de ahorro</span>
                    <span className={`copilot-kpi__value ${Number(report.savingsRate) >= 20 ? 'text-success' : 'text-warning'}`}>
                      {report.savingsRate}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="copilot-grid">
              {/* ── INSIGHTS ───────────────────────────────────────── */}
              <div className="copilot-section">
                <h3 className="copilot-section__title">💡 Insights del Mes</h3>
                <div className="copilot-insights">
                  {report.insights?.map((ins, i) => {
                    const colors = insightColors[ins.type] || insightColors.tip;
                    return (
                      <motion.div
                        key={i}
                        className="copilot-insight glass"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        style={{ borderLeft: `3px solid ${colors.border}`, background: colors.bg }}
                      >
                        <div className="copilot-insight__header">
                          <span className="copilot-insight__icon">{ins.icon}</span>
                          <strong className="copilot-insight__title" style={{ color: colors.text }}>{ins.title}</strong>
                        </div>
                        <p className="copilot-insight__detail">{ins.detail}</p>
                        <p className="copilot-insight__action">→ {ins.action}</p>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* ── CATEGORIES ─────────────────────────────────────── */}
              <div className="copilot-section">
                <h3 className="copilot-section__title">📊 Distribución de Gastos</h3>
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                  {report.topCategories?.length > 0 ? (
                    report.topCategories.map((cat, i) => (
                      <CategoryBar
                        key={i}
                        name={cat.name}
                        amount={cat.amount}
                        pct={cat.pct}
                        maxAmount={report.topCategories[0].amount}
                      />
                    ))
                  ) : (
                    <p style={{ color: 'var(--text-tertiary)', textAlign: 'center' }}>Sin datos de categorías</p>
                  )}
                </div>

                {/* Fixed vs Variable */}
                <div className="copilot-split glass-panel" style={{ marginTop: '1rem', padding: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 1rem', color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Fijos vs Variables
                  </h4>
                  <div className="copilot-split__bar">
                    <motion.div
                      className="copilot-split__fixed"
                      initial={{ width: 0 }}
                      animate={{ width: report.totalExpenses > 0 ? `${(report.fixedTotal / report.totalExpenses * 100).toFixed(0)}%` : '0%' }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                    <motion.div
                      className="copilot-split__variable"
                      initial={{ width: 0 }}
                      animate={{ width: report.totalExpenses > 0 ? `${(report.variableTotal / report.totalExpenses * 100).toFixed(0)}%` : '0%' }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                  </div>
                  <div className="copilot-split__labels">
                    <span>🏠 Fijos: {formatCurrency(report.fixedTotal)}</span>
                    <span>🛍️ Variables: {formatCurrency(report.variableTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── PROJECTIONS & TIP ──────────────────────────────── */}
            <div className="copilot-cards">
              <div className="glass-panel copilot-card copilot-card--tip">
                <span className="copilot-card__icon">💡</span>
                <div>
                  <strong>Consejo para el próximo mes</strong>
                  <p>{report.savings_tip}</p>
                </div>
              </div>
              <div className="glass-panel copilot-card copilot-card--projection">
                <span className="copilot-card__icon">🔮</span>
                <div>
                  <strong>Proyección de cierre</strong>
                  <p>{report.projection}</p>
                </div>
              </div>
            </div>

            {/* ── CHAT WITH COPILOT ──────────────────────────────── */}
            <div className="copilot-chat glass-panel">
              <h3 className="copilot-section__title" style={{ marginBottom: '1rem' }}>
                💬 Pregúntale al Copiloto
              </h3>
              <div className="copilot-chat__history">
                {chatHistory.length === 0 && (
                  <div className="copilot-chat__empty">
                    <span>🤖</span>
                    <p>Pregúntame cualquier cosa sobre tus finanzas de este mes.<br/>
                    <em>Ej: "¿En qué debo recortar para ahorrar más?"</em></p>
                  </div>
                )}
                {chatHistory.map((msg, i) => (
                  <motion.div
                    key={i}
                    className={`copilot-chat__msg copilot-chat__msg--${msg.role}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {msg.role === 'copilot' && <span>🤖 </span>}
                    {msg.text}
                  </motion.div>
                ))}
                {chatLoading && (
                  <div className="copilot-chat__msg copilot-chat__msg--copilot">
                    <span className="animate-pulse">🤖 Pensando...</span>
                  </div>
                )}
              </div>
              <div className="copilot-chat__input">
                <input
                  className="glass-input"
                  placeholder="Escribe tu pregunta aquí..."
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAskQuestion()}
                  disabled={chatLoading}
                />
                <button
                  className="btn btn--primary"
                  onClick={handleAskQuestion}
                  disabled={!question.trim() || chatLoading}
                >
                  Enviar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {hasData && !report && !loading && (
        <motion.div
          className="copilot-prompt glass-panel"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div style={{ fontSize: '5rem', marginBottom: '1.5rem' }}>🤖</div>
          <h2>Listo para analizar {getMonthName(selectedMonth)}</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '500px', textAlign: 'center' }}>
            Tengo <strong style={{ color: 'var(--color-primary)' }}>{myExpenses.length} gastos</strong> y{' '}
            <strong style={{ color: 'var(--color-primary)' }}>{myIncomes.length} ingresos</strong> para analizar.
            <br/>Dale clic al botón para obtener tu reporte de salud financiera personalizado.
          </p>
          <button className="btn btn--primary" onClick={handleAnalyze} style={{ fontSize: '1.1rem', padding: '0.9rem 2.5rem' }}>
            ✨ Generar Reporte de IA
          </button>
        </motion.div>
      )}
    </div>
  );
}
