import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, Plus, Edit2, ShieldCheck, Search,
  UserX, User, Mail, Save, X, RefreshCw, Eye, EyeOff,
  Clock, Lock, ChevronDown,
} from 'lucide-react';
import {
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { collection, onSnapshot, setDoc, doc } from 'firebase/firestore';
import { db, getSecondaryAuth } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui';
import { AccessDenied } from '../../components/PermissionGate';
import { ROLE_LABELS, ROLE_COLORS, ROLE_MODULES, MODULE_LABELS } from '../../lib/permissions';
import type { UserProfile, UserRole, UserStatus } from '../../types';

// ─── Arabic error messages for Firebase Auth codes ──────────────────────────
const AUTH_ERRORS: Record<string, string> = {
  'auth/email-already-in-use':   'هذا البريد الإلكتروني مستخدم بالفعل',
  'auth/invalid-email':          'صيغة البريد الإلكتروني غير صحيحة',
  'auth/weak-password':          'كلمة المرور ضعيفة — يجب أن تكون 6 أحرف على الأقل',
  'auth/operation-not-allowed':  'إنشاء الحسابات غير مفعّل — راجع إعدادات المشروع',
  'auth/network-request-failed': 'خطأ في الاتصال بالإنترنت',
  'auth/too-many-requests':      'تم تجاوز عدد الطلبات — انتظر قليلاً',
};

const statusColors: Record<UserStatus, string> = {
  active:   'bg-green/10 text-green-pale border border-green/20',
  inactive: 'bg-gray-500/10 text-gray-400 border border-gray-500/20',
  blocked:  'bg-red-500/10 text-red-400 border border-red-500/20',
};
const statusLabels: Record<UserStatus, string> = {
  active:  'نشط',
  inactive: 'غير نشط',
  blocked: 'محظور',
};

const blankForm = {
  email: '', displayName: '', password: '',
  role: 'operations_user' as UserRole,
  status: 'active' as UserStatus,
  linkedEmployeeId: '', notes: '',
};

export const AccessManagement: React.FC = () => {
  const { hasPermission, userProfile: me, updateUserProfile } = useAuth();
  const { employees } = useData();
  const { toast } = useToast();

  const [profiles,   setProfiles]   = useState<UserProfile[]>([]);
  const [search,     setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilt, setStatusFilt] = useState<UserStatus | 'all'>('all');
  const [open,       setOpen]       = useState(false);
  const [editTarget, setEditTarget] = useState<UserProfile | null>(null);
  const [form,       setForm]       = useState({ ...blankForm });
  const [saving,     setSaving]     = useState(false);
  const [showPwd,    setShowPwd]    = useState(false);
  const [viewRole,   setViewRole]   = useState<UserRole | null>(null);

  const canView = hasPermission('accessManagement', 'view');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), snap => {
      setProfiles(
        snap.docs
          .map(d => d.data() as UserProfile)
          .filter(p => !!p.email)
      );
    });
    return unsub;
  }, []);

  const openAdd = () => {
    setEditTarget(null);
    setForm({ ...blankForm });
    setShowPwd(false);
    setOpen(true);
  };

  const openEdit = (p: UserProfile) => {
    setEditTarget(p);
    setForm({
      email: p.email,
      displayName: p.displayName,
      password: '',
      role: p.role,
      status: p.status ?? 'active',
      linkedEmployeeId: p.linkedEmployeeId ?? '',
      notes: p.notes ?? '',
    });
    setShowPwd(false);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.displayName.trim()) {
      toast('الاسم الكامل مطلوب', 'error');
      return;
    }

    if (editTarget) {
      // ── Edit existing user ──────────────────────────────────────────
      setSaving(true);
      try {
        const docKey = editTarget.uid || editTarget.email.toLowerCase();
        const now = new Date().toISOString();
        const data: Partial<UserProfile> = {
          displayName:      form.displayName.trim(),
          role:             form.role,
          status:           form.status,
          linkedEmployeeId: form.linkedEmployeeId || '',
          notes:            form.notes || '',
          updatedAt:        now,
          updatedBy:        me?.email ?? '',
        };
        await setDoc(doc(db, 'users', docKey), data, { merge: true });
        if (docKey === me?.uid) {
          await updateUserProfile(docKey, data);
        }
        toast('تم تحديث بيانات المستخدم', 'success');
        setOpen(false);
      } catch {
        toast('حدث خطأ أثناء الحفظ — حاول مرة أخرى', 'error');
      } finally {
        setSaving(false);
      }
      return;
    }

    // ── Create new user ─────────────────────────────────────────────
    if (!form.email.trim()) {
      toast('البريد الإلكتروني مطلوب', 'error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast('صيغة البريد الإلكتروني غير صحيحة', 'error');
      return;
    }
    if (!form.password || form.password.length < 6) {
      toast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
      return;
    }

    setSaving(true);
    try {
      // Use secondary auth instance so the admin stays logged in
      const secondaryAuth = getSecondaryAuth();
      const cred = await createUserWithEmailAndPassword(
        secondaryAuth,
        form.email.trim().toLowerCase(),
        form.password,
      );
      const newUid = cred.user.uid;

      // Update display name on the new account
      await updateProfile(cred.user, { displayName: form.displayName.trim() });

      // Sign out from secondary auth immediately — keeps admin session intact
      await firebaseSignOut(secondaryAuth);

      // Create Firestore profile at users/{uid}
      const now = new Date().toISOString();
      await setDoc(doc(db, 'users', newUid), {
        uid:              newUid,
        email:            form.email.trim().toLowerCase(),
        displayName:      form.displayName.trim(),
        role:             form.role,
        status:           form.status,
        linkedEmployeeId: form.linkedEmployeeId || '',
        notes:            form.notes || '',
        createdAt:        now,
        createdBy:        me?.email ?? '',
        updatedAt:        now,
        updatedBy:        me?.email ?? '',
      });

      toast(`تم إنشاء حساب ${form.displayName.trim()} بنجاح`, 'success');
      setOpen(false);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      const msg = AUTH_ERRORS[code] ?? 'حدث خطأ أثناء إنشاء الحساب — حاول مرة أخرى';
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (p: UserProfile, next: UserStatus) => {
    if (p.uid === me?.uid) {
      toast('لا يمكنك تغيير حالة حسابك الخاص', 'error');
      return;
    }
    const docKey = p.uid || p.email.toLowerCase();
    try {
      await setDoc(doc(db, 'users', docKey),
        { status: next, updatedAt: new Date().toISOString(), updatedBy: me?.email ?? '' },
        { merge: true });
      const label = next === 'active' ? 'تم تفعيل الحساب' : next === 'blocked' ? 'تم حظر الحساب' : 'تم إيقاف الحساب';
      toast(label, 'success');
    } catch {
      toast('فشل تغيير الحالة — حاول مرة أخرى', 'error');
    }
  };

  const filtered = profiles.filter(p => {
    if (search && !p.displayName?.includes(search) && !p.email?.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter !== 'all' && p.role !== roleFilter) return false;
    if (statusFilt !== 'all' && (p.status ?? 'active') !== statusFilt) return false;
    return true;
  });

  const stats = {
    total:    profiles.length,
    active:   profiles.filter(p => (p.status ?? 'active') === 'active').length,
    inactive: profiles.filter(p => p.status === 'inactive').length,
    blocked:  profiles.filter(p => p.status === 'blocked').length,
  };

  if (!canView) return <AccessDenied />;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green/10 border border-green/20 flex items-center justify-center">
            <Shield size={20} className="text-green-pale" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">إدارة الصلاحيات</h1>
            <p className="text-gray-400 text-sm">إنشاء وإدارة حسابات المستخدمين</p>
          </div>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-green text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-green-light transition-colors shadow-brand">
          <Plus size={16} /> مستخدم جديد
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي',    value: stats.total,    color: 'text-blue-400' },
          { label: 'نشطون',     value: stats.active,   color: 'text-green-pale' },
          { label: 'غير نشطين', value: stats.inactive, color: 'text-gray-400' },
          { label: 'محظورون',   value: stats.blocked,  color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-dark-card border border-dark-border rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Roles Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => (
          <button key={r} onClick={() => setViewRole(viewRole === r ? null : r)}
            className={`p-3 rounded-xl border text-right transition-all ${
              viewRole === r ? 'border-green/40 bg-green/5' : 'border-dark-border bg-dark-card hover:border-dark-border/80'
            }`}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-bold ${ROLE_COLORS[r]}`}>
                {ROLE_LABELS[r]}
              </span>
              <ChevronDown size={12} className={`text-gray-500 transition-transform ${viewRole === r ? 'rotate-180' : ''}`} />
            </div>
            <p className="text-gray-600 text-xs">{profiles.filter(p => p.role === r).length} مستخدم</p>
            {viewRole === r && (
              <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-dark-border/50">
                {ROLE_MODULES[r].map(m => (
                  <span key={m} className="text-[10px] text-gray-400 bg-dark-surface border border-dark-border/50 px-1.5 py-0.5 rounded">
                    {MODULE_LABELS[m]}
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-44 relative">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو البريد..."
            className="w-full bg-dark-card border border-dark-border rounded-xl pr-9 pl-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green/50" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as UserRole | 'all')}
          className="bg-dark-card border border-dark-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-green/50">
          <option value="all">كل الأدوار</option>
          {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
        <select value={statusFilt} onChange={e => setStatusFilt(e.target.value as UserStatus | 'all')}
          className="bg-dark-card border border-dark-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-green/50">
          <option value="all">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="inactive">غير نشط</option>
          <option value="blocked">محظور</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-dark-surface/50 border-b border-dark-border">
              <tr className="text-gray-400 text-xs">
                {['المستخدم', 'الدور', 'الموظف المرتبط', 'الحالة', 'آخر دخول', 'إجراءات'].map(h => (
                  <th key={h} className="text-right px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-gray-500">لا يوجد مستخدمون</td></tr>
              )}
              {filtered.map(p => {
                const rowKey = p.uid || p.email;
                const linkedEmp = employees.find(e => e.id === p.linkedEmployeeId);
                const isMe = p.uid ? p.uid === me?.uid : p.email === me?.email;
                return (
                  <motion.tr key={rowKey} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="border-b border-dark-border/50 hover:bg-dark-hover/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-green/10 border border-green/20 flex items-center justify-center flex-shrink-0">
                          <User size={15} className="text-green-pale" />
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{p.displayName || '—'}</p>
                          <p className="text-gray-500 text-xs flex items-center gap-1">
                            <Mail size={9} />{p.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold ${ROLE_COLORS[p.role] ?? ''}`}>
                        {ROLE_LABELS[p.role] ?? p.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {linkedEmp ? (
                        <span>{linkedEmp.name} <span className="text-gray-600">— {linkedEmp.jobTitle}</span></span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold ${statusColors[p.status ?? 'active']}`}>
                        {statusLabels[p.status ?? 'active']}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.lastLoginAt ? (
                        <span className="text-gray-400 text-xs flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(p.lastLoginAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      ) : <span className="text-gray-600 text-xs">لم يسجل بعد</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(p)} title="تعديل"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-green-pale hover:bg-green/10 transition-colors">
                          <Edit2 size={13} />
                        </button>
                        {!isMe && (
                          <>
                            {p.status !== 'active' && (
                              <button onClick={() => toggleStatus(p, 'active')} title="تفعيل"
                                className="p-1.5 rounded-lg text-gray-400 hover:text-green-pale hover:bg-green/10 transition-colors">
                                <ShieldCheck size={13} />
                              </button>
                            )}
                            {p.status === 'active' && (
                              <button onClick={() => toggleStatus(p, 'inactive')} title="إيقاف"
                                className="p-1.5 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
                                <UserX size={13} />
                              </button>
                            )}
                            {p.status !== 'blocked' && (
                              <button onClick={() => toggleStatus(p, 'blocked')} title="حظر"
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                <Lock size={13} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-lg shadow-card-lg max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between p-5 border-b border-dark-border sticky top-0 bg-dark-card z-10">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Shield size={17} className="text-green-pale" />
                {editTarget ? 'تعديل بيانات المستخدم' : 'إنشاء مستخدم جديد'}
              </h2>
              <button onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-dark-hover transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Email */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">البريد الإلكتروني *</label>
                <input value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  disabled={!!editTarget}
                  placeholder="user@example.com"
                  className="w-full bg-dark-surface border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green/50 disabled:opacity-50 disabled:cursor-not-allowed" />
              </div>

              {/* Display Name */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">الاسم الكامل *</label>
                <input value={form.displayName}
                  onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                  placeholder="اسم المستخدم الكامل"
                  className="w-full bg-dark-surface border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green/50" />
              </div>

              {/* Password — only for new users */}
              {!editTarget && (
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">كلمة المرور المؤقتة *</label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="6 أحرف على الأقل"
                      className="w-full bg-dark-surface border border-dark-border rounded-xl px-3 py-2.5 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green/50"
                    />
                    <button type="button" onClick={() => setShowPwd(v => !v)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">ستُنشأ حساب تسجيل الدخول تلقائياً. أبلغ المستخدم بكلمة المرور ليقوم بتغييرها.</p>
                </div>
              )}

              {/* Role */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">الدور *</label>
                <select value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
                  className="w-full bg-dark-surface border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green/50">
                  <option value="full_admin">مدير النظام الكامل</option>
                  <option value="operations_user">تشغيل</option>
                  <option value="marketing_user">ماركتينج / مبيعات</option>
                  <option value="finance_user">مالية</option>
                </select>
                {/* Role modules preview */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {ROLE_MODULES[form.role].map(m => (
                    <span key={m} className="text-[10px] text-gray-400 bg-dark-surface/60 border border-dark-border/50 px-1.5 py-0.5 rounded">
                      {MODULE_LABELS[m]}
                    </span>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">الحالة</label>
                <select value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as UserStatus }))}
                  disabled={editTarget?.uid === me?.uid}
                  className="w-full bg-dark-surface border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green/50 disabled:opacity-50">
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                  <option value="blocked">محظور</option>
                </select>
              </div>

              {/* Link to Employee */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">ربط بموظف (اختياري)</label>
                <select value={form.linkedEmployeeId}
                  onChange={e => setForm(f => ({ ...f, linkedEmployeeId: e.target.value }))}
                  className="w-full bg-dark-surface border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green/50">
                  <option value="">— بدون ربط —</option>
                  {employees.filter(e => e.status === 'active').map(e => (
                    <option key={e.id} value={e.id}>{e.name} — {e.jobTitle}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">ملاحظات</label>
                <textarea value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="ملاحظات اختيارية..."
                  className="w-full bg-dark-surface border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green/50 resize-none" />
              </div>
            </div>

            <div className="flex items-center justify-between p-5 border-t border-dark-border sticky bottom-0 bg-dark-card">
              <button onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-dark-border rounded-xl hover:border-gray-600 transition-colors">
                إلغاء
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 bg-green text-white px-5 py-2 rounded-xl font-bold text-sm hover:bg-green-light transition-colors disabled:opacity-60 shadow-brand">
                {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                {saving ? 'جارٍ الحفظ...' : editTarget ? 'حفظ التعديلات' : 'إنشاء الحساب'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
