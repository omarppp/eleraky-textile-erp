import React, { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Eye, Phone, Mail, Briefcase, Users } from 'lucide-react';
import { useData } from '../../context/DataContext';
import {
  Button, Modal, Input, Select, Textarea, SearchInput,
  ConfirmDialog, SectionHeader, Table, Badge, Card, useToast,
} from '../../components/ui';
import type { Employee, EmployeeDepartment, EmployeeStatus } from '../../types';
import { formatDate } from '../../lib/utils';

const DEPARTMENTS: { value: EmployeeDepartment; label: string }[] = [
  { value: 'management', label: 'الإدارة' },
  { value: 'sales',      label: 'المبيعات' },
  { value: 'operations', label: 'العمليات' },
  { value: 'production', label: 'الإنتاج' },
  { value: 'finance',    label: 'المالية' },
  { value: 'inventory',  label: 'المستودعات' },
];

const DEPT_LABEL: Record<EmployeeDepartment, string> = {
  management: 'الإدارة', sales: 'المبيعات', operations: 'العمليات',
  production: 'الإنتاج', finance: 'المالية', inventory: 'المستودعات',
};

const DEPT_COLOR: Record<EmployeeDepartment, string> = {
  management: 'gold', sales: 'blue', operations: 'green',
  production: 'amber', finance: 'emerald', inventory: 'purple',
};

const emptyForm = () => ({
  name: '', phone: '', email: '',
  jobTitle: '', department: 'operations' as EmployeeDepartment,
  startDate: new Date().toISOString().split('T')[0],
  status: 'active' as EmployeeStatus, notes: '',
});

export const Employees: React.FC = () => {
  const { employees, workOrders, fabricCostings, addEmployee, updateEmployee, deleteEmployee } = useData();
  const { toast } = useToast();

  const [search,     setSearch]     = useState('');
  const [deptF,      setDeptF]      = useState('');
  const [statusF,    setStatusF]    = useState('');
  const [modalOpen,  setModalOpen]  = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected,   setSelected]   = useState<Employee | null>(null);
  const [editing,    setEditing]    = useState(false);
  const [form,       setForm]       = useState(emptyForm());
  const [loading,    setLoading]    = useState(false);

  const filtered = useMemo(() => {
    let list = [...employees].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (search)  list = list.filter(e => e.name.includes(search) || e.jobTitle.includes(search) || e.phone.includes(search));
    if (deptF)   list = list.filter(e => e.department === deptF);
    if (statusF) list = list.filter(e => e.status === statusF);
    return list;
  }, [employees, search, deptF, statusF]);

  const stats = useMemo(() => ({
    total:    employees.length,
    active:   employees.filter(e => e.status === 'active').length,
    inactive: employees.filter(e => e.status === 'inactive').length,
  }), [employees]);

  const openAdd = () => { setEditing(false); setForm(emptyForm()); setModalOpen(true); };
  const openEdit = (e: Employee) => {
    setEditing(true); setSelected(e);
    setForm({
      name: e.name, phone: e.phone, email: e.email || '',
      jobTitle: e.jobTitle, department: e.department,
      startDate: e.startDate?.split('T')[0] ?? '', status: e.status, notes: e.notes || '',
    });
    setModalOpen(true);
  };
  const openDetail = (e: Employee) => { setSelected(e); setDetailOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.jobTitle.trim()) {
      toast('يرجى ملء الاسم ورقم الهاتف والمسمى الوظيفي', 'error'); return;
    }
    setLoading(true);
    try {
      if (editing && selected) {
        await updateEmployee(selected.id, form);
        toast('تم تحديث بيانات الموظف');
      } else {
        await addEmployee(form);
        toast('تمت إضافة الموظف بنجاح');
      }
      setModalOpen(false);
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await deleteEmployee(selected.id);
      toast('تم حذف الموظف');
      setDeleteOpen(false); setSelected(null);
    } finally { setLoading(false); }
  };

  const set = (k: keyof ReturnType<typeof emptyForm>, v: unknown) =>
    setForm(p => ({ ...p, [k]: v }));

  const getEmployeeStats = (emp: Employee) => ({
    totalWO:     workOrders.filter(w => w.responsibleEmployeeId === emp.id).length,
    completedWO: workOrders.filter(w => w.responsibleEmployeeId === emp.id && (w.status === 'completed' || w.status === 'delivered')).length,
    delayedWO:   workOrders.filter(w => w.responsibleEmployeeId === emp.id && w.status === 'delayed').length,
    inProdWO:    workOrders.filter(w => w.responsibleEmployeeId === emp.id && w.status === 'in_production').length,
    costings:    fabricCostings.filter(c => c.responsibleEmployeeId === emp.id).length,
  });

  const columns = [
    {
      key: 'name', title: 'الموظف',
      render: (e: Employee) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green/10 border border-green/20 flex items-center justify-center flex-shrink-0">
            <span className="text-green-pale font-bold text-sm">{e.name.charAt(0)}</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{e.name}</p>
            <p className="text-gray-500 text-xs flex items-center gap-1"><Briefcase size={10}/>{e.jobTitle}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'dept', title: 'القسم',
      render: (e: Employee) => (
        <Badge color={DEPT_COLOR[e.department] as Parameters<typeof Badge>[0]['color']}>{DEPT_LABEL[e.department]}</Badge>
      ),
    },
    {
      key: 'phone', title: 'التواصل',
      render: (e: Employee) => (
        <div>
          <p className="text-gray-300 text-sm flex items-center gap-1"><Phone size={11}/>{e.phone}</p>
          {e.email && <p className="text-gray-500 text-xs flex items-center gap-1"><Mail size={10}/>{e.email}</p>}
        </div>
      ),
    },
    {
      key: 'startDate', title: 'تاريخ التعيين',
      render: (e: Employee) => <span className="text-gray-400 text-xs">{formatDate(e.startDate)}</span>,
    },
    {
      key: 'status', title: 'الحالة',
      render: (e: Employee) => (
        <Badge color={e.status === 'active' ? 'emerald' : 'red'}>
          {e.status === 'active' ? 'نشط' : 'غير نشط'}
        </Badge>
      ),
    },
    {
      key: 'wo', title: 'أوامر الشغل',
      render: (e: Employee) => {
        const s = getEmployeeStats(e);
        return (
          <div className="text-xs">
            <span className="text-gray-300">{s.totalWO} إجمالي</span>
            {s.delayedWO > 0 && <span className="text-red-400 mr-2">{s.delayedWO} متأخر</span>}
          </div>
        );
      },
    },
    {
      key: 'actions', title: '',
      render: (e: Employee) => (
        <div className="flex items-center gap-1" onClick={ev => ev.stopPropagation()}>
          <button onClick={() => openDetail(e)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
            <Eye size={14}/>
          </button>
          <button onClick={() => openEdit(e)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gold hover:bg-gold/10 transition-all">
            <Pencil size={14}/>
          </button>
          <button onClick={() => { setSelected(e); setDeleteOpen(true); }}
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <Trash2 size={14}/>
          </button>
        </div>
      ),
    },
  ];

  const detailStats = selected ? getEmployeeStats(selected) : null;
  const relatedWO   = selected ? workOrders.filter(w => w.responsibleEmployeeId === selected.id) : [];
  const relatedCST  = selected ? fabricCostings.filter(c => c.responsibleEmployeeId === selected.id) : [];

  return (
    <div className="space-y-5">
      <SectionHeader
        title="الموظفين"
        subtitle="إدارة موظفي المصنع وتتبع أدائهم"
        actions={<Button icon={<Plus size={16}/>} onClick={openAdd}>إضافة موظف</Button>}
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">إجمالي الموظفين</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">نشطون</p>
          <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">غير نشطين</p>
          <p className="text-2xl font-bold text-red-400">{stats.inactive}</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم أو المسمى أو الهاتف..." />
          </div>
          <div className="min-w-40">
            <Select value={deptF} onChange={e => setDeptF(e.target.value)}
              options={DEPARTMENTS.map(d => ({ value: d.value, label: d.label }))}
              placeholder="كل الأقسام" />
          </div>
          <div className="min-w-36">
            <Select value={statusF} onChange={e => setStatusF(e.target.value)}
              options={[{ value: 'active', label: 'نشط' }, { value: 'inactive', label: 'غير نشط' }]}
              placeholder="كل الحالات" />
          </div>
          {(search || deptF || statusF) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setDeptF(''); setStatusF(''); }}>
              مسح الفلاتر
            </Button>
          )}
          <span className="text-sm text-gray-500 mr-auto">{filtered.length} موظف</span>
        </div>
      </Card>

      <Card padding={false}>
        <Table
          columns={columns} data={filtered} rowKey={e => e.id}
          emptyText="لا يوجد موظفون" emptyIcon={<Users size={40}/>}
          onRowClick={openDetail}
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'} size="lg"
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setModalOpen(false)}>إلغاء</Button>
            <Button className="flex-1" loading={loading} onClick={handleSave}>
              {editing ? 'حفظ التعديلات' : 'إضافة الموظف'}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="الاسم الكامل *" value={form.name} onChange={e => set('name', e.target.value)} placeholder="اسم الموظف" />
          <Input label="رقم الهاتف *" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="01xxxxxxxxx" />
          <Input label="البريد الإلكتروني" value={form.email} onChange={e => set('email', e.target.value)} placeholder="user@eleraky.com" type="email" />
          <Input label="المسمى الوظيفي *" value={form.jobTitle} onChange={e => set('jobTitle', e.target.value)} placeholder="مشرف إنتاج، محاسب..." />
          <Select label="القسم *" value={form.department}
            onChange={e => set('department', e.target.value as EmployeeDepartment)}
            options={DEPARTMENTS.map(d => ({ value: d.value, label: d.label }))} />
          <Select label="الحالة *" value={form.status}
            onChange={e => set('status', e.target.value as EmployeeStatus)}
            options={[{ value: 'active', label: 'نشط' }, { value: 'inactive', label: 'غير نشط' }]} />
          <Input label="تاريخ التعيين" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          <div className="sm:col-span-2">
            <Textarea label="ملاحظات" value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      {selected && detailOpen && (
        <Modal open={detailOpen} onClose={() => setDetailOpen(false)}
          title={`ملف الموظف — ${selected.name}`} size="lg">
          <div className="space-y-4">
            {/* Profile */}
            <div className="flex items-center gap-4 p-4 bg-dark-raised border border-dark-border rounded-xl">
              <div className="w-14 h-14 rounded-2xl bg-green/10 border border-green/20 flex items-center justify-center flex-shrink-0">
                <span className="text-green-pale font-bold text-xl">{selected.name.charAt(0)}</span>
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">{selected.name}</h3>
                <p className="text-gray-400 text-sm">{selected.jobTitle}</p>
                <Badge color={DEPT_COLOR[selected.department] as Parameters<typeof Badge>[0]['color']} className="mt-1">
                  {DEPT_LABEL[selected.department]}
                </Badge>
              </div>
              <Badge color={selected.status === 'active' ? 'emerald' : 'red'} className="mr-auto">
                {selected.status === 'active' ? 'نشط' : 'غير نشط'}
              </Badge>
            </div>

            {/* Contact info */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'الهاتف',          value: selected.phone },
                { label: 'البريد الإلكتروني', value: selected.email || '—' },
                { label: 'تاريخ التعيين',    value: formatDate(selected.startDate) },
                { label: 'القسم',            value: DEPT_LABEL[selected.department] },
              ].map(r => (
                <div key={r.label} className="bg-dark-raised border border-dark-border rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">{r.label}</p>
                  <p className="text-sm font-medium text-white">{r.value}</p>
                </div>
              ))}
            </div>

            {/* Performance KPIs */}
            {detailStats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'أوامر الشغل', value: detailStats.totalWO,     color: 'text-white' },
                  { label: 'في الإنتاج',  value: detailStats.inProdWO,    color: 'text-blue-400' },
                  { label: 'مكتملة',      value: detailStats.completedWO, color: 'text-emerald-400' },
                  { label: 'متأخرة',      value: detailStats.delayedWO,   color: 'text-red-400' },
                ].map(k => (
                  <div key={k.label} className="bg-dark-raised border border-dark-border rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">{k.label}</p>
                    <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Related Work Orders */}
            {relatedWO.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-300 mb-2">أوامر الشغل المسندة</p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {relatedWO.slice(0, 8).map(w => (
                    <div key={w.id} className="flex items-center justify-between bg-dark-raised border border-dark-border/50 rounded-lg px-3 py-2">
                      <span className="font-mono text-gold text-xs">{w.orderNumber}</span>
                      <span className="text-gray-300 text-xs flex-1 mx-3">{w.customerName} — {w.item}</span>
                      <span className={`text-xs badge ${w.status === 'delayed' ? 'badge-red' : w.status === 'completed' ? 'badge-green' : 'badge-blue'}`}>
                        {w.status === 'new' ? 'جديد' : w.status === 'in_production' ? 'في الإنتاج' : w.status === 'completed' ? 'مكتمل' : w.status === 'delayed' ? 'متأخر' : w.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related Costings */}
            {relatedCST.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-300 mb-2">سجلات التكاليف ({relatedCST.length})</p>
                <div className="space-y-1.5">
                  {relatedCST.slice(0, 4).map(c => (
                    <div key={c.id} className="flex items-center justify-between bg-dark-raised border border-dark-border/50 rounded-lg px-3 py-2">
                      <span className="font-mono text-green-pale text-xs">{c.costingNumber}</span>
                      <span className="text-gray-300 text-xs flex-1 mx-3">{c.designName}</span>
                      <span className="text-amber-400 text-xs font-bold">{c.grandTotalCost.toLocaleString('ar-EG')} جنيه</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selected.notes && (
              <div className="bg-dark-raised border border-dark-border rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">ملاحظات</p>
                <p className="text-sm text-gray-300">{selected.notes}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" icon={<Pencil size={14}/>}
                onClick={() => { setDetailOpen(false); openEdit(selected); }}>تعديل</Button>
              <Button variant="danger" icon={<Trash2 size={14}/>}
                onClick={() => { setDetailOpen(false); setDeleteOpen(true); }}>حذف</Button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={deleteOpen} onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete} loading={loading}
        title="حذف الموظف"
        message={`هل أنت متأكد من حذف الموظف "${selected?.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
      />
    </div>
  );
};
