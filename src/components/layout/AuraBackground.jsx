import { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { calculateFinancialSummary } from '../../utils/calculations';
import { motion } from 'framer-motion';

export default function AuraBackground() {
  const { user } = useAuth();
  const { incomes, expenses, selectedMonth, selectedYear } = useData();

  const auraColor = useMemo(() => {
    if (!user || !incomes || !expenses) return 'rgba(99, 102, 241, 0.05)';
    
    const myIncomes = incomes.filter(i => String(i.user_id) === String(user.id));
    const myExpenses = expenses.filter(e => String(e.user_id) === String(user.id));
    
    const summary = calculateFinancialSummary(myIncomes, myExpenses, selectedMonth, selectedYear, user.id);
    
    // Limits can be adjusted, using arbitrary values for visual effect based on COP
    if (summary.finalBalance > 500000) {
      return 'rgba(16, 185, 129, 0.15)'; // Emerald success
    } else if (summary.finalBalance > 0) {
      return 'rgba(99, 102, 241, 0.1)'; // Indigo ok
    } else if (summary.finalBalance > -200000) {
      return 'rgba(245, 158, 11, 0.12)'; // Amber warning
    } else {
      return 'rgba(239, 68, 68, 0.15)'; // Red danger
    }
  }, [incomes, expenses, selectedMonth, selectedYear, user]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: 1,
        background: `radial-gradient(circle at 50% 0%, ${auraColor} 0%, transparent 60%)` 
      }}
      transition={{ duration: 2, ease: "easeInOut" }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '100vh',
        zIndex: 0, // Behind everything
        pointerEvents: 'none'
      }}
    />
  );
}
