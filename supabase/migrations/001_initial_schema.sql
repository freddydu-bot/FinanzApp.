-- =============================================
-- FINANCE MULTIUSER APP — DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES TABLE
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS: See own profile + partner's profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can view partner profile"
  ON profiles FOR SELECT USING (
    id IN (
      SELECT CASE WHEN user1_id = auth.uid() THEN user2_id ELSE user1_id END
      FROM partnerships
      WHERE (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (id = auth.uid());

-- ============================================
-- 2. PARTNERSHIPS TABLE
-- ============================================
CREATE TABLE partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES profiles(id),
  user2_id UUID REFERENCES profiles(id),
  invite_token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','dissolved')),
  user1_split_pct INTEGER NOT NULL DEFAULT 50 CHECK (user1_split_pct BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE partnerships ENABLE ROW LEVEL SECURITY;

-- user2_split_pct = 100 - user1_split_pct (computed in app)

CREATE POLICY "Users can view own partnerships"
  ON partnerships FOR SELECT USING (
    user1_id = auth.uid() OR user2_id = auth.uid()
  );

CREATE POLICY "Users can create partnerships"
  ON partnerships FOR INSERT WITH CHECK (user1_id = auth.uid());

CREATE POLICY "Users can update own partnerships"
  ON partnerships FOR UPDATE USING (
    user1_id = auth.uid() OR user2_id = auth.uid()
  );

-- Allow anyone to read partnerships by invite_token (for joining)
CREATE POLICY "Anyone can find partnership by invite token"
  ON partnerships FOR SELECT USING (
    status = 'pending' AND invite_token IS NOT NULL
  );

-- ============================================
-- 3. CATEGORIES TABLE
-- ============================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📦',
  color TEXT DEFAULT '#6366f1',
  is_default BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id),
  partnership_id UUID REFERENCES partnerships(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Everyone can see default categories
CREATE POLICY "Anyone can view default categories"
  ON categories FOR SELECT USING (is_default = TRUE);

-- Users can see their partnership's custom categories
CREATE POLICY "Users can view partnership categories"
  ON categories FOR SELECT USING (
    partnership_id IN (
      SELECT id FROM partnerships
      WHERE (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can create partnership categories"
  ON categories FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    partnership_id IN (
      SELECT id FROM partnerships
      WHERE (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can update partnership categories"
  ON categories FOR UPDATE USING (
    created_by = auth.uid() OR is_default = TRUE
  );

CREATE POLICY "Users can delete custom categories"
  ON categories FOR DELETE USING (
    created_by = auth.uid() AND is_default = FALSE
  );

-- ============================================
-- 4. RECURRING EXPENSES TABLE (before expenses due to FK)
-- ============================================
CREATE TABLE recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  partnership_id UUID NOT NULL REFERENCES partnerships(id),
  category_id UUID NOT NULL REFERENCES categories(id),
  expense_type TEXT NOT NULL CHECK (expense_type IN ('personal','shared')),
  cost_type TEXT NOT NULL CHECK (cost_type IN ('fixed','variable')),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  merchant TEXT,
  day_of_month INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view relevant recurring expenses"
  ON recurring_expenses FOR SELECT USING (
    user_id = auth.uid() OR 
    partnership_id IN (
      SELECT id FROM partnerships WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own recurring expenses"
  ON recurring_expenses FOR ALL USING (user_id = auth.uid());

-- ============================================
-- 5. EXPENSES TABLE
-- ============================================
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  partnership_id UUID NOT NULL REFERENCES partnerships(id),
  category_id UUID NOT NULL REFERENCES categories(id),
  expense_type TEXT NOT NULL CHECK (expense_type IN ('personal','shared')),
  cost_type TEXT NOT NULL CHECK (cost_type IN ('fixed','variable')),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  merchant TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_expense_id UUID REFERENCES recurring_expenses(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- CRITICAL PRIVACY: Users can only see:
-- 1. Their own personal expenses (full detail)
-- 2. All shared expenses in their partnership (full detail)
-- NEVER partner's personal expense details
CREATE POLICY "Users see own personal + all shared expenses"
  ON expenses FOR SELECT USING (
    (user_id = auth.uid())
    OR
    (expense_type = 'shared' AND partnership_id IN (
      SELECT id FROM partnerships
      WHERE (user1_id = auth.uid() OR user2_id = auth.uid())
    ))
  );

CREATE POLICY "Users can insert own expenses"
  ON expenses FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own expenses"
  ON expenses FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own expenses"
  ON expenses FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- 6. BUDGETS TABLE
-- ============================================
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id UUID NOT NULL REFERENCES partnerships(id),
  category_id UUID NOT NULL REFERENCES categories(id),
  user_id UUID REFERENCES profiles(id), -- NULL for shared budgets
  budget_type TEXT NOT NULL CHECK (budget_type IN ('personal','shared')),
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year >= 2024),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(partnership_id, category_id, user_id, budget_type, month, year)
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view partnership budgets"
  ON budgets FOR SELECT USING (
    partnership_id IN (
      SELECT id FROM partnerships
      WHERE (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage partnership budgets"
  ON budgets FOR ALL USING (
    partnership_id IN (
      SELECT id FROM partnerships
      WHERE (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

-- ============================================
-- 7. AGGREGATED PARTNER SUMMARY FUNCTION
-- ============================================
-- Returns partner's personal expenses as aggregated totals only
-- NEVER exposes description, merchant, or individual amounts
CREATE OR REPLACE FUNCTION get_partner_expense_summary(
  p_month INTEGER,
  p_year INTEGER
) RETURNS TABLE (
  category_id UUID,
  category_name TEXT,
  category_icon TEXT,
  category_color TEXT,
  total_amount DECIMAL,
  expense_count BIGINT,
  fixed_total DECIMAL,
  variable_total DECIMAL
) AS $$
DECLARE
  v_partner_id UUID;
  v_partnership_id UUID;
BEGIN
  -- Find the partner
  SELECT
    CASE WHEN p.user1_id = auth.uid() THEN p.user2_id ELSE p.user1_id END,
    p.id
  INTO v_partner_id, v_partnership_id
  FROM partnerships p
  WHERE (p.user1_id = auth.uid() OR p.user2_id = auth.uid())
  LIMIT 1;

  IF v_partner_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    e.category_id,
    c.name AS category_name,
    c.icon AS category_icon,
    c.color AS category_color,
    COALESCE(SUM(e.amount), 0) AS total_amount,
    COUNT(*) AS expense_count,
    COALESCE(SUM(CASE WHEN e.cost_type = 'fixed' THEN e.amount ELSE 0 END), 0) AS fixed_total,
    COALESCE(SUM(CASE WHEN e.cost_type = 'variable' THEN e.amount ELSE 0 END), 0) AS variable_total
  FROM expenses e
  JOIN categories c ON c.id = e.category_id
  WHERE e.user_id = v_partner_id
    AND e.partnership_id = v_partnership_id
    AND e.expense_type = 'personal'
    AND EXTRACT(MONTH FROM e.date) = p_month
    AND EXTRACT(YEAR FROM e.date) = p_year
  GROUP BY e.category_id, c.name, c.icon, c.color;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. SEED DEFAULT CATEGORIES
-- ============================================
INSERT INTO categories (name, icon, color, is_default) VALUES
  ('Vivienda', '🏠', '#8b5cf6', TRUE),
  ('Alimentación', '🛒', '#10b981', TRUE),
  ('Transporte', '🚗', '#3b82f6', TRUE),
  ('Servicios Públicos', '💡', '#f59e0b', TRUE),
  ('Salud', '🏥', '#ef4444', TRUE),
  ('Educación', '📚', '#6366f1', TRUE),
  ('Entretenimiento', '🎬', '#ec4899', TRUE),
  ('Ropa', '👕', '#14b8a6', TRUE),
  ('Restaurantes', '🍽️', '#f97316', TRUE),
  ('Seguros', '🛡️', '#64748b', TRUE),
  ('Ahorro e Inversión', '💰', '#22c55e', TRUE),
  ('Mascotas', '🐾', '#a855f7', TRUE),
  ('Tecnología', '💻', '#0ea5e9', TRUE),
  ('Cuidado Personal', '✨', '#f472b6', TRUE),
  ('Otros', '📦', '#94a3b8', TRUE);

-- ============================================
-- 9. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_expenses_user_date ON expenses(user_id, date);
CREATE INDEX idx_expenses_partnership_type ON expenses(partnership_id, expense_type);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_budgets_partnership_period ON budgets(partnership_id, month, year);
CREATE INDEX idx_partnerships_invite_token ON partnerships(invite_token);
CREATE INDEX idx_partnerships_users ON partnerships(user1_id, user2_id);
CREATE INDEX idx_categories_partnership ON categories(partnership_id);

-- ============================================
-- 10. UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_partnerships_updated_at BEFORE UPDATE ON partnerships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_recurring_expenses_updated_at BEFORE UPDATE ON recurring_expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 11. SAVINGS GOALS TABLE
-- ============================================
CREATE TABLE savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id UUID REFERENCES partnerships(id),
  user_id UUID REFERENCES profiles(id), -- NULL for shared goals
  title TEXT NOT NULL,
  target_amount DECIMAL(12,2) NOT NULL CHECK (target_amount > 0),
  current_amount DECIMAL(12,2) DEFAULT 0 CHECK (current_amount >= 0),
  icon TEXT DEFAULT '💰',
  goal_type TEXT NOT NULL CHECK (goal_type IN ('personal','shared')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own and partnership goals"
  ON savings_goals FOR SELECT USING (
    (user_id = auth.uid())
    OR
    (goal_type = 'shared' AND partnership_id IN (
      SELECT id FROM partnerships
      WHERE (user1_id = auth.uid() OR user2_id = auth.uid())
    ))
  );

CREATE POLICY "Users can manage own and partnership goals"
  ON savings_goals FOR ALL USING (
    (user_id = auth.uid())
    OR
    (goal_type = 'shared' AND partnership_id IN (
      SELECT id FROM partnerships
      WHERE (user1_id = auth.uid() OR user2_id = auth.uid())
    ))
  );

CREATE TRIGGER update_savings_goals_updated_at BEFORE UPDATE ON savings_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
