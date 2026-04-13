import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isDemoMode } from '../lib/supabase';
import { DEMO_USER_1, DEMO_USER_2 } from '../lib/demoData';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state
  useEffect(() => {
    if (isDemoMode) {
      // Check if a demo user is "logged in"
      const savedUser = localStorage.getItem('finance-demo-user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          display_name: session.user.user_metadata?.display_name || session.user.email.split('@')[0],
        });
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          display_name: session.user.user_metadata?.display_name || session.user.email.split('@')[0],
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    if (isDemoMode) {
      // Demo login
      const demoUser = email === DEMO_USER_2.email ? DEMO_USER_2 : DEMO_USER_1;
      setUser(demoUser);
      localStorage.setItem('finance-demo-user', JSON.stringify(demoUser));
      return { user: demoUser };
    }

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError.message);
      throw authError;
    }
    return data;
  }, []);

  const register = useCallback(async (email, password, displayName) => {
    setError(null);
    if (isDemoMode) {
      const newUser = { ...DEMO_USER_1, email, display_name: displayName };
      setUser(newUser);
      localStorage.setItem('finance-demo-user', JSON.stringify(newUser));
      return { user: newUser };
    }

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (authError) {
      setError(authError.message);
      throw authError;
    }
    return data;
  }, []);

  const logout = useCallback(async () => {
    if (isDemoMode) {
      setUser(null);
      localStorage.removeItem('finance-demo-user');
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const switchDemoUser = useCallback(() => {
    if (!isDemoMode) return;
    const newUser = user?.id === DEMO_USER_1.id ? DEMO_USER_2 : DEMO_USER_1;
    setUser(newUser);
    localStorage.setItem('finance-demo-user', JSON.stringify(newUser));
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      login,
      register,
      logout,
      switchDemoUser,
      isDemoMode,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
