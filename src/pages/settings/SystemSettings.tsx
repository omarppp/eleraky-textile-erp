import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, RefreshCw, Building2, DollarSign, Bell, FileText } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui';
import { AccessDenied } from '../../components/PermissionGate';
import type { SystemSettings } from '../../types';

const DEFAULTS: SystemSettings = {
  companyName:     'Eleraky Textile',
  companyPhone:    '',
  companyAddress:  '',
  currency:        'EGP',
  currencySymbol:  'ج.م',
  defaultTaxRate:  14,
  invoiceNotes:    'شكراً لتعاملكم مع Eleraky Textile',
  lowStockAlert:   10,
  chequeAlertDays: 7,
  dateFormat:      'DD/MM/YYYY',
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="text-xs text-gray-400 mb-1.5 block">{label}</label>
    {children}
  </div>
);

const inputCls = 'w-full bg-dark-surface border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green/50';

export const SystemSettingsPage: React.FC = () => {
  const { hasPermission, userProfile } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<SystemSettings>(DEFAULTS);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  const canView = hasPermission('settings', 'view');
  const canEdit = hasPermission('settings', 'edit');

  useEffect(() => {
    if (!canView) return;
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'system'));
        if (snap.exists()) setSettings({ ...DEFAULTS, ...snap.data() as SystemSettings });
      } catch (e) {
        console.error('[SystemSettings] load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [canView]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'system'), {
        ...settings,
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile?.email ?? '',
      }, { merge: true });
      toast('تم حفظ الإعدادات بنجاح', 'success');
    } catch (e) {
      console.error(e);
      toast('فشل حفظ الإعدادات', 'error');
    } finally {
      setSaving(false);
    }
  };

  const upd = (key: keyof SystemSettings, value: string | number) =>
    setSettings(s => ({ ...s, [key]: value }));

  if (!canView) return <AccessDenied />;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 rounded-full border-2 border-green/30 border-t-green animate-spin" />
      </div>
    );
  }

  const sections = [
    {
      icon: <Building2 size={16} className="text-green-pale" />,
      title: 'معلومات الشركة',
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="اسم الشركة *">
            <input value={settings.companyName} disabled={!canEdit}
              onChange={e => upd('companyName', e.target.value)}
              className={inputCls + (!canEdit ? ' opacity-60 cursor-not-allowed' : '')} />
          </Field>
          <Field label="رقم الهاتف">
            <input value={settings.companyPhone ?? ''} disabled={!canEdit}
              onChange={e => upd('companyPhone', e.target.value)}
              placeholder="01234567890"
              className={inputCls + (!canEdit ? ' opacity-60 cursor-not-allowed' : '')} />
          </Field>
          <Field label="العنوان">
            <input value={settings.companyAddress ?? ''} disabled={!canEdit}
              onChange={e => upd('companyAddress', e.target.value)}
              placeholder="عنوان المصنع"
              className={inputCls + (!canEdit ? ' opacity-60 cursor-not-allowed' : '')} />
          </Field>
          <Field label="تنسيق التاريخ">
            <select value={settings.dateFormat} disabled={!canEdit}
              onChange={e => upd('dateFormat', e.target.value)}
              className={inputCls + (!canEdit ? ' opacity-60 cursor-not-allowed' : '')}>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </Field>
        </div>
      ),
    },
    {
      icon: <DollarSign size={16} className="text-green-pale" />,
      title: 'العملة والضرائب',
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="العملة">
            <select value={settings.currency} disabled={!canEdit}
              onChange={e => upd('currency', e.target.value)}
              className={inputCls + (!canEdit ? ' opacity-60 cursor-not-allowed' : '')}>
              <option value="EGP">جنيه مصري (EGP)</option>
              <option value="USD">دولار أمريكي (USD)</option>
              <option value="EUR">يورو (EUR)</option>
              <option value="SAR">ريال سعودي (SAR)</option>
            </select>
          </Field>
          <Field label="رمز العملة">
            <input value={settings.currencySymbol} disabled={!canEdit}
              onChange={e => upd('currencySymbol', e.target.value)}
              placeholder="ج.م"
              className={inputCls + (!canEdit ? ' opacity-60 cursor-not-allowed' : '')} />
          </Field>
          <Field label="نسبة الضريبة الافتراضية (%)">
            <input type="number" value={settings.defaultTaxRate} disabled={!canEdit}
              onChange={e => upd('defaultTaxRate', Number(e.target.value))}
              min="0" max="100"
              className={inputCls + (!canEdit ? ' opacity-60 cursor-not-allowed' : '')} />
          </Field>
        </div>
      ),
    },
    {
      icon: <Bell size={16} className="text-green-pale" />,
      title: 'التنبيهات',
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="تنبيه المخزون المنخفض (الحد الأدنى)">
            <input type="number" value={settings.lowStockAlert} disabled={!canEdit}
              onChange={e => upd('lowStockAlert', Number(e.target.value))}
              min="0"
              className={inputCls + (!canEdit ? ' opacity-60 cursor-not-allowed' : '')} />
          </Field>
          <Field label="تنبيه الشيكات المستحقة (عدد الأيام)">
            <input type="number" value={settings.chequeAlertDays} disabled={!canEdit}
              onChange={e => upd('chequeAlertDays', Number(e.target.value))}
              min="0"
              className={inputCls + (!canEdit ? ' opacity-60 cursor-not-allowed' : '')} />
          </Field>
        </div>
      ),
    },
    {
      icon: <FileText size={16} className="text-green-pale" />,
      title: 'إعدادات الفواتير',
      content: (
        <Field label="ملاحظات الفاتورة الافتراضية">
          <textarea value={settings.invoiceNotes ?? ''} disabled={!canEdit}
            onChange={e => upd('invoiceNotes', e.target.value)}
            rows={3}
            className={inputCls + ' resize-none' + (!canEdit ? ' opacity-60 cursor-not-allowed' : '')} />
        </Field>
      ),
    },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green/10 border border-green/20 flex items-center justify-center">
            <Settings size={20} className="text-green-pale" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">إعدادات النظام</h1>
            <p className="text-gray-400 text-sm">System Settings</p>
          </div>
        </div>
        {canEdit && (
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 bg-green text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-green-light transition-colors disabled:opacity-60 shadow-brand">
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
          </button>
        )}
      </div>

      {/* Settings sections */}
      {sections.map(sec => (
        <motion.div key={sec.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-dark-card border border-dark-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-dark-border/50">
            {sec.icon}
            <h2 className="text-sm font-bold text-white">{sec.title}</h2>
          </div>
          {sec.content}
        </motion.div>
      ))}

      {settings.updatedAt && (
        <p className="text-xs text-gray-600 text-left">
          آخر تحديث: {new Date(settings.updatedAt).toLocaleString('ar-EG')} بواسطة {settings.updatedBy}
        </p>
      )}
    </div>
  );
};
