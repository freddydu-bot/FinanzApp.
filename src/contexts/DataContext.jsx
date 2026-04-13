import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { isDemoMode, supabase } from '../lib/supabase';
import {
  DEMO_USER_1,
  DEMO_USER_2,
  DEMO_PARTNERSHIP,
  DEFAULT_CATEGORIES,
  DEMO_RECURRING,
  generateDemoExpenses,
  generateDemoBudgets,
} from '../lib/demoData';

const DataContext = createContext();

export function DataProvider({ children }) {
  const { user } = useAuth();
  const [partnership, setPartnership] = useState(null);
  const [partner, setPartner] = useState(null);
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Load data
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (isDemoMode) {
      loadDemoData();
    } else {
      loadRealData();
    }
  }, [user]);

  async function loadRealData() {
    try {
      setLoading(true);
      console.log("DEBUG: Iniciando carga de datos reales para:", user.id);
      
      // 1. Get Partnership
      const { data: pData, error: pError } = await supabase
        .from('partnerships')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle();

      if (pError) console.error("DEBUG: Error cargando partnership:", pError);

      let currentPartnership = pData;
      if (pData) {
        console.log("DEBUG: Partnership encontrada:", pData.id);
        setPartnership(pData);
        // Get Partner Profile
        const partnerId = pData.user1_id === user.id ? pData.user2_id : pData.user1_id;
        const { data: userData } = await supabase.from('profiles').select('*').eq('id', partnerId).maybeSingle();
        setPartner(userData);
      } else {
        console.log("DEBUG: No se encontró partnership activa.");
      }

      // 2. Load Expenses - Fetch everything relevant to this user
      console.log("DEBUG: Cargando gastos...");
      let expQuery = supabase.from('expenses').select('*');
      
      if (currentPartnership) {
        expQuery = expQuery.or(`user_id.eq.${user.id},partnership_id.eq.${currentPartnership.id}`);
      } else {
        expQuery = expQuery.eq('user_id', user.id);
      }
      
      const { data: eData, error: eError } = await expQuery;
      
      if (eError) {
        console.error("DEBUG: Error cargando gastos:", eError);
      } else {
        console.log(`DEBUG: Se cargaron ${eData?.length || 0} gastos.`);
        setExpenses(eData || []);
      }

      // 3. Load Budgets
      let budQuery = supabase.from('budgets').select('*');
      if (currentPartnership) {
        budQuery = budQuery.or(`user_id.eq.${user.id},partnership_id.eq.${currentPartnership.id}`);
      } else {
        budQuery = budQuery.eq('user_id', user.id);
      }
      const { data: bData } = await budQuery;
      setBudgets(bData || []);

      // 4. Load Savings
      let svgQuery = supabase.from('savings_goals').select('*');
      if (currentPartnership) {
        svgQuery = svgQuery.or(`user_id.eq.${user.id},partnership_id.eq.${currentPartnership.id}`);
      } else {
        svgQuery = svgQuery.eq('user_id', user.id);
      }
      const { data: sData } = await svgQuery;
      setSavingsGoals(sData || []);

      // 5. Build Categories list
      setCategories(DEFAULT_CATEGORIES);

    } catch (error) {
      console.error("Real data loading error:", error);
    } finally {
      setLoading(false);
    }
  }

  function loadDemoData() {
    try {
      setPartnership(DEMO_PARTNERSHIP);
      setPartner(user?.id === DEMO_USER_1.id ? DEMO_USER_2 : DEMO_USER_1);

      const savedCats = localStorage.getItem('finance-categories');
      try {
        if (savedCats) {
          setCategories(JSON.parse(savedCats));
        } else {
          setCategories(DEFAULT_CATEGORIES);
          localStorage.setItem('finance-categories', JSON.stringify(DEFAULT_CATEGORIES));
        }
      } catch (e) {
        setCategories(DEFAULT_CATEGORIES);
      }

      const savedExpenses = localStorage.getItem('finance-expenses');
      try {
        if (savedExpenses) {
          setExpenses(JSON.parse(savedExpenses));
        } else {
          const demoExpenses = generateDemoExpenses();
          setExpenses(demoExpenses);
          localStorage.setItem('finance-expenses', JSON.stringify(demoExpenses));
        }
      } catch (e) {
        setExpenses([]);
      }

      const savedBudgets = localStorage.getItem('finance-budgets');
      try {
        if (savedBudgets) {
          setBudgets(JSON.parse(savedBudgets));
        } else {
          const demoBudgets = generateDemoBudgets();
          setBudgets(demoBudgets);
          localStorage.setItem('finance-budgets', JSON.stringify(demoBudgets));
        }
      } catch (e) {
        setBudgets([]);
      }

      const savedRecurring = localStorage.getItem('finance-recurring');
      try {
        if (savedRecurring) {
          setRecurringExpenses(JSON.parse(savedRecurring));
        } else {
          setRecurringExpenses(DEMO_RECURRING);
          localStorage.setItem('finance-recurring', JSON.stringify(DEMO_RECURRING));
        }
      } catch (e) {
        setRecurringExpenses(DEMO_RECURRING);
      }

      const savedGoals = localStorage.getItem('finance-goals');
      const MOCK_GOALS = [
        { id: '1', title: 'Viaje a Europa ✈️', target_amount: 5000000, current_amount: 1500000, goal_type: 'shared', icon: '🌍' },
        { id: '2', title: 'Fondo de Emergencia', target_amount: 3000000, current_amount: 800000, goal_type: 'shared', icon: '🆘' },
      ];
      try {
        if (savedGoals) {
          setSavingsGoals(JSON.parse(savedGoals));
        } else {
          setSavingsGoals(MOCK_GOALS);
          localStorage.setItem('finance-goals', JSON.stringify(MOCK_GOALS));
        }
      } catch (e) {
        setSavingsGoals(MOCK_GOALS);
      }
    } catch (error) {
      console.error("Data loading error:", error);
    } finally {
      setLoading(false);
    }
  }

  // CRUD: Expenses
  const addExpense = useCallback(async (expense) => {
    const id = crypto.randomUUID();
    const newExp = { 
      ...expense, 
      id, 
      user_id: user.id, 
      partnership_id: partnership?.id, 
      created_at: new Date().toISOString() 
    };

    if (isDemoMode) {
      setExpenses(prev => [newExp, ...prev]);
      localStorage.setItem('finance-expenses', JSON.stringify([newExp, ...expenses]));
      return newExp;
    } else {
      const { error } = await supabase.from('expenses').insert(newExp);
      if (error) {
        console.error("Error al guardar gasto:", error);
        throw new Error(error.message);
      }
      setExpenses(prev => [newExp, ...prev]);
      return newExp;
    }
  }, [user, partnership, expenses]);

  const updateExpense = useCallback(async (id, updates) => {
    if (isDemoMode) {
      const newExpenses = expenses.map((e) => (e.id === id ? { ...e, ...updates } : e));
      setExpenses(newExpenses);
      localStorage.setItem('finance-expenses', JSON.stringify(newExpenses));
    } else {
      const { error } = await supabase.from('expenses').update(updates).eq('id', id);
      if (!error) setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    }
  }, [expenses]);

  const deleteExpense = useCallback(async (id) => {
    if (isDemoMode) {
      const newExpenses = expenses.filter((e) => e.id !== id);
      setExpenses(newExpenses);
      localStorage.setItem('finance-expenses', JSON.stringify(newExpenses));
    } else {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (!error) setExpenses(prev => prev.filter(e => e.id !== id));
    }
  }, [expenses]);

  // CRUD: Budgets
  const upsertBudget = useCallback(async (budget) => {
    const budgetData = {
      ...budget,
      partnership_id: partnership?.id,
      user_id: budget.budget_type === 'shared' ? null : (budget.user_id || user.id)
    };

    if (isDemoMode) {
      const existing = budgets.findIndex(
        (b) => b.category_id === budget.category_id && b.budget_type === budget.budget_type && b.month === budget.month
      );
      let newBudgets = [...budgets];
      if (existing >= 0) newBudgets[existing] = { ...newBudgets[existing], ...budgetData };
      else newBudgets.push({ ...budgetData, id: crypto.randomUUID() });
      setBudgets(newBudgets);
      localStorage.setItem('finance-budgets', JSON.stringify(newBudgets));
    } else {
      const { data: existing } = await supabase.from('budgets').select('id')
        .eq('category_id', budget.category_id)
        .eq('budget_type', budget.budget_type)
        .eq('month', budget.month)
        .eq('year', budget.year)
        .maybeSingle();

      if (existing) {
        await supabase.from('budgets').update(budgetData).eq('id', existing.id);
        setBudgets(prev => prev.map(b => b.id === existing.id ? { ...b, ...budgetData } : b));
      } else {
        const id = crypto.randomUUID();
        const { error } = await supabase.from('budgets').insert({ ...budgetData, id });
        if (!error) setBudgets(prev => [...prev, { ...budgetData, id }]);
      }
    }
  }, [user, partnership, budgets]);

  // CRUD: Savings Goals
  const upsertSavingsGoal = useCallback(async (goal) => {
    const goalData = { ...goal, partnership_id: partnership?.id };
    if (isDemoMode) {
      const existingIdx = savingsGoals.findIndex(g => g.id === goal.id);
      let newGoals = [...savingsGoals];
      if (existingIdx >= 0) newGoals[existingIdx] = goalData;
      else newGoals.push(goalData);
      setSavingsGoals(newGoals);
      localStorage.setItem('finance-goals', JSON.stringify(newGoals));
    } else {
      const { error } = await supabase.from('savings_goals').upsert(goalData);
      if (!error) {
        setSavingsGoals(prev => {
          const idx = prev.findIndex(g => g.id === goal.id);
          if (idx >= 0) return prev.map(g => g.id === goal.id ? goalData : g);
          return [...prev, goalData];
        });
      }
    }
  }, [partnership, savingsGoals]);

  const deleteSavingsGoal = useCallback(async (id) => {
    if (isDemoMode) {
      const newGoals = savingsGoals.filter(g => g.id !== id);
      setSavingsGoals(newGoals);
      localStorage.setItem('finance-goals', JSON.stringify(newGoals));
    } else {
      const { error } = await supabase.from('savings_goals').delete().eq('id', id);
      if (!error) setSavingsGoals(prev => prev.filter(g => g.id !== id));
    }
  }, [savingsGoals]);

  // Partnership management
  const createPartnership = useCallback(async (partnerEmail) => {
    if (isDemoMode) return;
    try {
      // 1. Find partner by email in profiles
      const { data: partnerProfile, error: searchError } = await supabase
        .from('profiles')
        .select('id, display_name')
        .eq('email', partnerEmail)
        .single();
      
      if (searchError || !partnerProfile) {
        throw new Error('No se encontró ningún usuario con ese correo electrónico.');
      }

      // 2. Create partnership
      const newP = {
        id: crypto.randomUUID(),
        user1_id: user.id,
        user2_id: partnerProfile.id,
        user1_split_pct: 50,
        name: `Familia ${user.display_name} & ${partnerProfile.display_name}`
      };

      const { error: insertError } = await supabase.from('partnerships').insert(newP);
      if (insertError) throw insertError;

      setPartnership(newP);
      setPartner(partnerProfile);
      return newP;
    } catch (err) {
      console.error("Partnership creation error:", err);
      throw err;
    }
  }, [user]);

  return (
    <DataContext.Provider value={{
      partnership,
      partner,
      categories,
      expenses,
      budgets,
      recurringExpenses,
      savingsGoals,
      loading,
      selectedMonth,
      selectedYear,
      setSelectedMonth,
      setSelectedYear,
      addExpense,
      updateExpense,
      deleteExpense,
      upsertBudget,
      upsertSavingsGoal,
      deleteSavingsGoal,
      createPartnership, // Exported new function
      loadRealData
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
}
