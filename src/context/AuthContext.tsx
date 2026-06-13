import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import type { UserRole, UserProfile, PermissionModule, PermissionAction } from '../types';
import { canAccessModule } from '../lib/permissions';

const ADMIN_EMAIL = 'refaateleraky7@gmail.com';

// Kept for backward compat with legacy Users.tsx page
export function setRoleForEmail(email: string, role: UserRole) {
  try {
    const stored = JSON.parse(localStorage.getItem('eleraky_user_roles') || '{}');
    stored[email] = role;
    localStorage.setItem('eleraky_user_roles', JSON.stringify(stored));
  } catch { /* noop */ }
}

interface AuthContextType {
  user:              User | null;
  userProfile:       UserProfile | null;
  role:              UserRole;
  loading:           boolean;
  error:             string | null;
  login:             (email: string, password: string) => Promise<void>;
  logout:            () => Promise<void>;
  canAccess:         (section: string) => boolean;
  hasPermission:     (module: PermissionModule, action?: PermissionAction) => boolean;
  updateUserProfile: (emailKey: string, data: Partial<UserProfile>) => Promise<void>;
  clearError:        () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user,        setUser]        = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [role,        setRole]        = useState<UserRole>('operations_user');
  const [authDone,    setAuthDone]    = useState(false);
  const [profDone,    setProfDone]    = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const loading = !authDone || (!!user && !profDone);

  const loadProfile = useCallback(async (u: User) => {
    setProfDone(false);
    try {
      const key = (u.email ?? '').toLowerCase();
      const ref = doc(db, 'users', key);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const profile = snap.data() as UserProfile;
        if (profile.status === 'blocked') {
          setError('تم حظر هذا الحساب. تواصل مع مدير النظام.');
          await signOut(auth);
          return;
        }
        if (profile.status === 'inactive') {
          setError('هذا الحساب غير مفعّل. تواصل مع مدير النظام.');
          await signOut(auth);
          return;
        }
        const updated: UserProfile = { ...profile, uid: u.uid, lastLoginAt: new Date().toISOString() };
        setDoc(ref, { uid: u.uid, lastLoginAt: updated.lastLoginAt }, { merge: true }).catch(() => {});
        setUserProfile(updated);
        setRole(updated.role);
      } else if (key === ADMIN_EMAIL) {
        const adminProfile: UserProfile = {
          uid: u.uid, email: key, displayName: 'رفعت العراقي',
          role: 'full_admin', status: 'active',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };
        await setDoc(ref, adminProfile);
        setUserProfile(adminProfile);
        setRole('full_admin');
      } else {
        setError('لا يوجد ملف صلاحيات لهذا الحساب. تواصل مع مدير النظام.');
        await signOut(auth);
      }
    } catch (err) {
      console.error('[AuthContext] loadProfile error:', err);
      const fallbackRole: UserRole = u.email === ADMIN_EMAIL ? 'full_admin' : 'operations_user';
      setUserProfile({
        uid: u.uid, email: u.email ?? '', displayName: u.email ?? '',
        role: fallbackRole, status: 'active',
        createdAt: new Date().toISOString(),
      });
      setRole(fallbackRole);
    } finally {
      setProfDone(true);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await loadProfile(u);
      } else {
        setUserProfile(null);
        setRole('operations_user');
        setProfDone(true);
      }
      setAuthDone(true);
    }, (err) => {
      console.error('[Firebase Auth] onAuthStateChanged error:', err);
      setAuthDone(true);
      setProfDone(true);
    });
    return unsub;
  }, [loadProfile]);

  // action param accepted for API compat but ignored — access is role-based only
  const hasPermission = useCallback((module: PermissionModule, _action?: PermissionAction): boolean => {
    if (!userProfile) return false;
    return canAccessModule(userProfile.role, module);
  }, [userProfile]);

  const canAccess = useCallback((section: string): boolean => {
    if (!userProfile) return false;
    if (userProfile.role === 'full_admin') return true;
    const moduleMap: Record<string, PermissionModule> = {
      'dashboard': 'dashboard', 'designs': 'designs', 'work-orders': 'workOrders',
      'warehouse': 'inventory', 'machines': 'machines', 'invoices': 'invoices',
      'customers': 'customers', 'purchases': 'purchases', 'imports': 'import',
      'finance': 'finance', 'reports': 'reports', 'employees': 'employees',
      'costing': 'fabricCosting', 'settings': 'settings',
    };
    for (const [key, mod] of Object.entries(moduleMap)) {
      if (section.startsWith(key)) return canAccessModule(userProfile.role, mod);
    }
    return false;
  }, [userProfile]);

  const updateUserProfile = useCallback(async (emailKey: string, data: Partial<UserProfile>) => {
    const ref = doc(db, 'users', emailKey.toLowerCase());
    await setDoc(ref, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
    if (emailKey.toLowerCase() === user?.email?.toLowerCase()) {
      setUserProfile(prev => prev ? { ...prev, ...data } : null);
      if (data.role) setRole(data.role);
    }
  }, [user?.email]);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      const messages: Record<string, string> = {
        'auth/user-not-found':         'البريد الإلكتروني غير مسجل في النظام',
        'auth/wrong-password':         'كلمة المرور غير صحيحة',
        'auth/invalid-email':          'صيغة البريد الإلكتروني غير صحيحة',
        'auth/too-many-requests':      'تم تجاوز عدد المحاولات — انتظر قليلاً',
        'auth/invalid-credential':     'البريد الإلكتروني أو كلمة المرور غير صحيحة',
        'auth/network-request-failed': 'خطأ في الاتصال بالإنترنت',
        'auth/operation-not-allowed':  'تسجيل الدخول بالبريد الإلكتروني غير مفعّل — تواصل مع مدير النظام',
        'auth/invalid-api-key':        'خطأ في إعدادات النظام — تواصل مع مدير النظام',
        'auth/user-disabled':          'هذا الحساب موقوف',
      };
      const msg = messages[code] ?? 'حدث خطأ أثناء تسجيل الدخول. برجاء المحاولة مرة أخرى.';
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    try {
      setUserProfile(null);
      setError(null);
      await signOut(auth);
    } catch (err) { console.error('[Firebase Auth] logout error:', err); }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{
      user, userProfile, role, loading, error,
      login, logout, canAccess, hasPermission, updateUserProfile, clearError,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
