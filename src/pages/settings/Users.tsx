import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Shield, Edit2, Mail } from 'lucide-react';
import { Button, Modal, Input, Select, ConfirmDialog, SectionHeader, Table } from '../../components/ui';
import { useToast } from '../../components/ui';
import { generateId } from '../../lib/utils';
import type { SystemUser, UserRole } from '../../types';
import { roleLabel } from '../../lib/utils';

const USERS_KEY = 'eleraky_system_users';
const ROLES_KEY = 'eleraky_user_roles';

function loadUsers(): SystemUser[] {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); } catch { return []; }
}
function saveUsers(users: SystemUser[]) { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }
function getRoles(): Record<string, UserRole> {
  try { return JSON.parse(localStorage.getItem(ROLES_KEY) || '{}'); } catch { return {}; }
}

const roleOpts = [
  { value: 'full_admin',      label: 'مدير النظام الكامل (Full Access Admin)' },
  { value: 'operations_user', label: 'عمليات / مبيعات (Operations User)' },
  { value: 'finance_user',    label: 'مالية (Finance User)' },
];

const roleColors: Record<UserRole, string> = {
  full_admin:      'bg-green/15 text-green-pale border border-green/30',
  operations_user: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  finance_user:    'bg-amber-500/15 text-amber-400 border border-amber-500/30',
};

const blank = { email: '', name: '', role: 'operations_user' as UserRole, active: true };

export const Users: React.FC = () => {
  const { toast } = useToast();
  const [users,    setUsers]    = useState<SystemUser[]>([]);
  const [open,     setOpen]     = useState(false);
  const [editUser, setEditUser] = useState<SystemUser|null>(null);
  const [form,     setForm]     = useState({ ...blank });
  const [deleteId, setDeleteId] = useState<string|null>(null);

  useEffect(() => {
    let list = loadUsers();
    if (list.length === 0) {
      list = [{
        id: generateId(), email: 'refaateleraky7@gmail.com', name: 'رفعت العراقي',
        role: 'full_admin', active: true, createdAt: new Date().toISOString()
      }];
      saveUsers(list);
    }
    setUsers(list);
  }, []);

  const handleSave = () => {
    if (!form.email || !form.name) { toast('البريد الإلكتروني والاسم مطلوبان', 'error'); return; }
    let updated: SystemUser[];
    if (editUser) {
      updated = users.map(u => u.id === editUser.id ? { ...u, ...form } : u);
      toast('تم تحديث بيانات المستخدم');
    } else {
      const exists = users.find(u => u.email === form.email);
      if (exists) { toast('هذا البريد الإلكتروني مسجل مسبقاً', 'error'); return; }
      const newUser: SystemUser = { ...form, id: generateId(), createdAt: new Date().toISOString() };
      updated = [...users, newUser];
      toast('تم إضافة المستخدم');
    }
    // update roles map
    const roles = getRoles();
    const targetEmail = editUser ? editUser.email : form.email;
    roles[targetEmail] = form.role;
    localStorage.setItem(ROLES_KEY, JSON.stringify(roles));
    saveUsers(updated);
    setUsers(updated);
    setOpen(false); setEditUser(null); setForm({ ...blank });
  };

  const handleEdit = (u: SystemUser) => {
    setEditUser(u);
    setForm({ email: u.email, name: u.name, role: u.role, active: u.active });
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    const updated = users.filter(u => u.id !== id);
    saveUsers(updated);
    setUsers(updated);
    toast('تم حذف المستخدم');
    setDeleteId(null);
  };

  const toggleActive = (u: SystemUser) => {
    const updated = users.map(x => x.id === u.id ? { ...x, active: !x.active } : x);
    saveUsers(updated); setUsers(updated);
    toast(u.active ? 'تم تعطيل المستخدم' : 'تم تفعيل المستخدم');
  };

  const set = (k: keyof typeof blank, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const columns = [
    { key: 'name', title: 'المستخدم', render: (r: SystemUser) => (
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-green/10 border border-green/20 flex items-center justify-center text-green-pale font-bold">{r.name.charAt(0)}</div>
        <div>
          <p className="font-semibold text-gray-200">{r.name}</p>
          <p className="text-xs text-gray-500 flex items-center gap-1"><Mail size={10}/>{r.email}</p>
        </div>
      </div>
    )},
    { key: 'role', title: 'الدور', render: (r: SystemUser) => (
      <span className={`badge ${roleColors[r.role]}`}>
        <Shield size={10} className="inline ml-1" />
        {roleLabel[r.role]}
      </span>
    )},
    { key: 'status', title: 'الحالة', render: (r: SystemUser) => (
      <button onClick={()=>toggleActive(r)} className={`badge cursor-pointer transition-colors ${r.active ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-gray-500/15 text-gray-500 border border-gray-500/30'}`}>
        {r.active ? 'نشط' : 'معطل'}
      </button>
    )},
    { key: 'actions', title: '', render: (r: SystemUser) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" icon={<Edit2 size={13}/>} onClick={()=>handleEdit(r)}>تعديل</Button>
        {r.email !== 'refaateleraky7@gmail.com' && (
          <Button variant="danger" size="sm" icon={<Trash2 size={13}/>} onClick={()=>setDeleteId(r.id)} />
        )}
      </div>
    )},
  ];

  const permSummary: Record<UserRole, string[]> = {
    full_admin:      ['لوحة التحكم','التصاميم','أوامر الشغل','المخازن','الماكينات','الفواتير','العملاء','المشتريات','الاستيراد','الماليات','التقارير','الإدارة'],
    operations_user: ['لوحة التحكم','التصاميم','أوامر الشغل','المخازن','الماكينات','الفواتير','العملاء','المشتريات','الاستيراد'],
    finance_user:    ['لوحة التحكم','الماليات','الفواتير','العملاء','التقارير'],
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="المستخدمون والصلاحيات" subtitle="إدارة حسابات المستخدمين وأدوارهم"
        actions={<Button size="sm" icon={<Plus size={15}/>} onClick={()=>{setEditUser(null);setForm({...blank});setOpen(true);}}>مستخدم جديد</Button>} />

      {/* Roles Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {(['full_admin','operations_user','finance_user'] as UserRole[]).map(role => (
          <div key={role} className="bg-dark-card border border-dark-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-white text-sm">{roleLabel[role]}</h4>
              <span className={`badge ${roleColors[role]}`}>{users.filter(u=>u.role===role).length} مستخدم</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {permSummary[role].map(p => (
                <span key={p} className="text-[10px] bg-dark-raised text-gray-500 px-2 py-0.5 rounded-md border border-dark-border">{p}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Table columns={columns} data={users} rowKey={r=>r.id}
        emptyText="لا يوجد مستخدمون" emptyIcon="👤" />

      <Modal open={open} onClose={()=>{setOpen(false);setEditUser(null);}} title={editUser?'تعديل المستخدم':'مستخدم جديد'} size="sm"
        footer={<div className="flex gap-3"><Button variant="ghost" className="flex-1" onClick={()=>setOpen(false)}>إلغاء</Button><Button className="flex-1" onClick={handleSave}>{editUser?'حفظ التعديلات':'إضافة المستخدم'}</Button></div>}>
        <div className="space-y-4">
          <Input label="الاسم الكامل *" value={form.name} onChange={e=>set('name',e.target.value)} />
          <Input label="البريد الإلكتروني *" type="email" value={form.email} onChange={e=>set('email',e.target.value)}
            disabled={!!editUser && editUser.email === 'refaateleraky7@gmail.com'} />
          <Select label="الدور والصلاحيات *" value={form.role} onChange={e=>set('role',e.target.value as UserRole)} options={roleOpts} />
          <div className="p-3 bg-dark-raised border border-dark-border rounded-xl">
            <p className="text-xs text-gray-500 mb-2">الصلاحيات لهذا الدور:</p>
            <div className="flex flex-wrap gap-1">
              {permSummary[form.role].map(p => (
                <span key={p} className="text-[10px] bg-green/10 text-green-pale border border-green/20 px-2 py-0.5 rounded-md">{p}</span>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={()=>setDeleteId(null)}
        onConfirm={()=>{if(deleteId) handleDelete(deleteId);}}
        title="حذف المستخدم" message="هل تريد حذف هذا المستخدم؟" />
    </div>
  );
};
