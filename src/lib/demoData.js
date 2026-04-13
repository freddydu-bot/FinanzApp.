// Demo data for local testing without Supabase
import { nanoid } from 'nanoid';

const DEMO_USER_1 = {
  id: 'demo-user-1',
  email: 'carlos@demo.com',
  display_name: 'Carlos',
  avatar_url: null,
  created_at: new Date().toISOString(),
};

const DEMO_USER_2 = {
  id: 'demo-user-2',
  email: 'maria@demo.com',
  display_name: 'María',
  avatar_url: null,
  created_at: new Date().toISOString(),
};

const DEMO_PARTNERSHIP = {
  id: 'demo-partnership-1',
  user1_id: DEMO_USER_1.id,
  user2_id: DEMO_USER_2.id,
  invite_token: 'demo-token',
  status: 'active',
  user1_split_pct: 50,
  created_at: new Date().toISOString(),
};

const DEFAULT_CATEGORIES = [
  { id: 'cat-1', name: 'Vivienda', icon: '🏠', color: '#8b5cf6', is_default: true },
  { id: 'cat-2', name: 'Alimentación', icon: '🛒', color: '#10b981', is_default: true },
  { id: 'cat-3', name: 'Transporte', icon: '🚗', color: '#3b82f6', is_default: true },
  { id: 'cat-4', name: 'Servicios Públicos', icon: '💡', color: '#f59e0b', is_default: true },
  { id: 'cat-5', name: 'Salud', icon: '🏥', color: '#ef4444', is_default: true },
  { id: 'cat-6', name: 'Educación', icon: '📚', color: '#6366f1', is_default: true },
  { id: 'cat-7', name: 'Entretenimiento', icon: '🎬', color: '#ec4899', is_default: true },
  { id: 'cat-8', name: 'Ropa', icon: '👕', color: '#14b8a6', is_default: true },
  { id: 'cat-9', name: 'Restaurantes', icon: '🍽️', color: '#f97316', is_default: true },
  { id: 'cat-10', name: 'Seguros', icon: '🛡️', color: '#64748b', is_default: true },
  { id: 'cat-11', name: 'Ahorro e Inversión', icon: '💰', color: '#22c55e', is_default: true },
  { id: 'cat-12', name: 'Mascotas', icon: '🐾', color: '#a855f7', is_default: true },
  { id: 'cat-13', name: 'Tecnología', icon: '💻', color: '#0ea5e9', is_default: true },
  { id: 'cat-14', name: 'Cuidado Personal', icon: '✨', color: '#f472b6', is_default: true },
  { id: 'cat-15', name: 'Otros', icon: '📦', color: '#94a3b8', is_default: true },
];

const now = new Date();
const currentMonth = now.getMonth() + 1;
const currentYear = now.getFullYear();

function randomDate(month, year) {
  const day = Math.floor(Math.random() * 28) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Generate demo expenses for current and previous month
function generateDemoExpenses() {
  const expenses = [];
  const months = [currentMonth, currentMonth === 1 ? 12 : currentMonth - 1];
  const years = [currentYear, currentMonth === 1 ? currentYear - 1 : currentYear];

  const personalExpensesUser1 = [
    { cat: 'cat-3', merchant: 'Uber', desc: 'Viaje al trabajo', amount: 15000, cost_type: 'variable' },
    { cat: 'cat-9', merchant: 'Restaurante El Cielo', desc: 'Almuerzo con colegas', amount: 45000, cost_type: 'variable' },
    { cat: 'cat-7', merchant: 'Spotify', desc: 'Suscripción mensual', amount: 17000, cost_type: 'fixed' },
    { cat: 'cat-13', merchant: 'Amazon', desc: 'Mouse inalámbrico', amount: 89000, cost_type: 'variable' },
    { cat: 'cat-8', merchant: 'Zara', desc: 'Camisa formal', amount: 120000, cost_type: 'variable' },
    { cat: 'cat-6', merchant: 'Platzi', desc: 'Suscripción anual', amount: 55000, cost_type: 'fixed' },
    { cat: 'cat-3', merchant: 'Terpel', desc: 'Gasolina', amount: 80000, cost_type: 'variable' },
    { cat: 'cat-5', merchant: 'Farmacia', desc: 'Medicamentos', amount: 35000, cost_type: 'variable' },
    { cat: 'cat-14', merchant: 'Barbería', desc: 'Corte de pelo', amount: 25000, cost_type: 'variable' },
  ];

  const personalExpensesUser2 = [
    { cat: 'cat-8', merchant: 'H&M', desc: 'Vestido nuevo', amount: 159000, cost_type: 'variable' },
    { cat: 'cat-5', merchant: 'Consultorio Dental', desc: 'Limpieza dental', amount: 180000, cost_type: 'variable' },
    { cat: 'cat-7', merchant: 'Netflix', desc: 'Suscripción', amount: 33000, cost_type: 'fixed' },
    { cat: 'cat-14', merchant: 'Spa Relax', desc: 'Sesión de masajes', amount: 95000, cost_type: 'variable' },
    { cat: 'cat-6', merchant: 'Coursera', desc: 'Curso de diseño', amount: 120000, cost_type: 'fixed' },
    { cat: 'cat-3', merchant: 'DiDi', desc: 'Viajes mensuales', amount: 65000, cost_type: 'variable' },
    { cat: 'cat-9', merchant: 'Café Juan Valdez', desc: 'Cafés del mes', amount: 48000, cost_type: 'variable' },
    { cat: 'cat-12', merchant: 'Gabrica', desc: 'Comida para gato', amount: 75000, cost_type: 'fixed' },
  ];

  const sharedExpenses = [
    { cat: 'cat-1', merchant: 'Inmobiliaria ABC', desc: 'Arriendo mensual', amount: 1800000, cost_type: 'fixed' },
    { cat: 'cat-4', merchant: 'EPM', desc: 'Servicios públicos', amount: 280000, cost_type: 'fixed' },
    { cat: 'cat-2', merchant: 'Éxito', desc: 'Mercado quincenal', amount: 350000, cost_type: 'variable' },
    { cat: 'cat-2', merchant: 'D1', desc: 'Mercado complementario', amount: 120000, cost_type: 'variable' },
    { cat: 'cat-4', merchant: 'Claro', desc: 'Internet y TV', amount: 95000, cost_type: 'fixed' },
    { cat: 'cat-10', merchant: 'Sura', desc: 'Seguro hogar', amount: 65000, cost_type: 'fixed' },
    { cat: 'cat-7', merchant: 'Cinemark', desc: 'Cine fin de semana', amount: 56000, cost_type: 'variable' },
    { cat: 'cat-9', merchant: 'Crepes & Waffles', desc: 'Cena de pareja', amount: 110000, cost_type: 'variable' },
    { cat: 'cat-12', merchant: 'Veterinaria PetCare', desc: 'Control veterinario', amount: 85000, cost_type: 'variable' },
  ];

  months.forEach((month, idx) => {
    const year = years[idx];

    personalExpensesUser1.forEach((exp) => {
      expenses.push({
        id: nanoid(),
        user_id: DEMO_USER_1.id,
        partnership_id: DEMO_PARTNERSHIP.id,
        category_id: exp.cat,
        expense_type: 'personal',
        cost_type: exp.cost_type,
        amount: exp.amount + Math.floor(Math.random() * 20000 - 10000),
        description: exp.desc,
        merchant: exp.merchant,
        date: randomDate(month, year),
        is_recurring: exp.cost_type === 'fixed',
        created_at: new Date().toISOString(),
      });
    });

    personalExpensesUser2.forEach((exp) => {
      expenses.push({
        id: nanoid(),
        user_id: DEMO_USER_2.id,
        partnership_id: DEMO_PARTNERSHIP.id,
        category_id: exp.cat,
        expense_type: 'personal',
        cost_type: exp.cost_type,
        amount: exp.amount + Math.floor(Math.random() * 20000 - 10000),
        description: exp.desc,
        merchant: exp.merchant,
        date: randomDate(month, year),
        is_recurring: exp.cost_type === 'fixed',
        created_at: new Date().toISOString(),
      });
    });

    sharedExpenses.forEach((exp) => {
      const userId = Math.random() > 0.5 ? DEMO_USER_1.id : DEMO_USER_2.id;
      expenses.push({
        id: nanoid(),
        user_id: userId,
        partnership_id: DEMO_PARTNERSHIP.id,
        category_id: exp.cat,
        expense_type: 'shared',
        cost_type: exp.cost_type,
        amount: exp.amount + Math.floor(Math.random() * 30000 - 15000),
        description: exp.desc,
        merchant: exp.merchant,
        date: randomDate(month, year),
        is_recurring: exp.cost_type === 'fixed',
        created_at: new Date().toISOString(),
      });
    });
  });

  return expenses;
}

function generateDemoBudgets() {
  const budgets = [];
  const months = [currentMonth, currentMonth === 1 ? 12 : currentMonth - 1];
  const years = [currentYear, currentMonth === 1 ? currentYear - 1 : currentYear];

  const personalBudgets = [
    { cat: 'cat-3', amount: 150000 },
    { cat: 'cat-5', amount: 200000 },
    { cat: 'cat-6', amount: 100000 },
    { cat: 'cat-7', amount: 80000 },
    { cat: 'cat-8', amount: 200000 },
    { cat: 'cat-9', amount: 100000 },
    { cat: 'cat-13', amount: 150000 },
    { cat: 'cat-14', amount: 60000 },
    { cat: 'cat-15', amount: 50000 },
  ];

  const sharedBudgets = [
    { cat: 'cat-1', amount: 1900000 },
    { cat: 'cat-2', amount: 600000 },
    { cat: 'cat-4', amount: 400000 },
    { cat: 'cat-7', amount: 150000 },
    { cat: 'cat-9', amount: 200000 },
    { cat: 'cat-10', amount: 80000 },
    { cat: 'cat-11', amount: 500000 },
    { cat: 'cat-12', amount: 200000 },
  ];

  months.forEach((month, idx) => {
    const year = years[idx];

    [DEMO_USER_1.id, DEMO_USER_2.id].forEach((userId) => {
      personalBudgets.forEach((b) => {
        budgets.push({
          id: nanoid(),
          partnership_id: DEMO_PARTNERSHIP.id,
          category_id: b.cat,
          user_id: userId,
          budget_type: 'personal',
          amount: b.amount,
          month,
          year,
        });
      });
    });

    sharedBudgets.forEach((b) => {
      budgets.push({
        id: nanoid(),
        partnership_id: DEMO_PARTNERSHIP.id,
        category_id: b.cat,
        user_id: null,
        budget_type: 'shared',
        amount: b.amount,
        month,
        year,
      });
    });
  });

  return budgets;
}

const DEMO_RECURRING = [
  {
    id: 'rec-1',
    user_id: DEMO_USER_1.id,
    partnership_id: DEMO_PARTNERSHIP.id,
    category_id: 'cat-7',
    expense_type: 'personal',
    cost_type: 'fixed',
    amount: 17000,
    description: 'Suscripción Spotify',
    merchant: 'Spotify',
    day_of_month: 15,
    is_active: true,
  },
  {
    id: 'rec-2',
    user_id: DEMO_USER_1.id,
    partnership_id: DEMO_PARTNERSHIP.id,
    category_id: 'cat-1',
    expense_type: 'shared',
    cost_type: 'fixed',
    amount: 1800000,
    description: 'Arriendo mensual',
    merchant: 'Inmobiliaria ABC',
    day_of_month: 1,
    is_active: true,
  },
  {
    id: 'rec-3',
    user_id: DEMO_USER_2.id,
    partnership_id: DEMO_PARTNERSHIP.id,
    category_id: 'cat-7',
    expense_type: 'personal',
    cost_type: 'fixed',
    amount: 33000,
    description: 'Suscripción Netflix',
    merchant: 'Netflix',
    day_of_month: 20,
    is_active: true,
  },
  {
    id: 'rec-4',
    user_id: DEMO_USER_2.id,
    partnership_id: DEMO_PARTNERSHIP.id,
    category_id: 'cat-4',
    expense_type: 'shared',
    cost_type: 'fixed',
    amount: 95000,
    description: 'Internet y TV',
    merchant: 'Claro',
    day_of_month: 5,
    is_active: true,
  },
];

export {
  DEMO_USER_1,
  DEMO_USER_2,
  DEMO_PARTNERSHIP,
  DEFAULT_CATEGORIES,
  DEMO_RECURRING,
  generateDemoExpenses,
  generateDemoBudgets,
};
