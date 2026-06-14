import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Package, Calculator } from 'lucide-react';
import { useData } from '../context/DataContext';
import { Button, Modal, Input, Select, Textarea, SearchInput, ConfirmDialog, SectionHeader, Table, Badge, Tabs } from '../components/ui';
import { useToast } from '../components/ui';
import { formatDate, formatCurrency } from '../lib/utils';
import type { Purchase, WarehouseType } from '../types';

const warehouseOpts = [
  { value: 'weft',     label: 'مخزن اللحمة' },
  { value: 'warp',     label: 'مخزن السدا' },
  { value: 'finished', label: 'مخزن المنتج النهائي' },
  { value: 'reusable', label: 'مخزن القابل للاستخدام' },
  { value: 'poy',      label: 'مخزن POY' },
];
const unitOpts = [
  { value: 'كيلو', label: 'كيلوجرام' },
  { value: 'طن',   label: 'طن' },
  { value: 'متر',  label: 'متر' },
  { value: 'بكرة', label: 'بكرة' },
  { value: 'عدد',  label: 'عدد' },
];

const blank = {
  supplierName: '', materialName: '', materialType: '',
  warehouse: 'weft' as WarehouseType, quantity: 0, unit: 'كيلو',
  unitPrice: 0, totalPrice: 0, extraExpenses: 0, finalCost: 0, costPerUnit: 0,
  invoiceNumber: '', purchaseDate: new Date().toISOString().split('T')[0], notes: '',
};

export const Purchases: React.FC = () => {
  const { purchases, suppliers, addPurchase, deletePurchase } = useData();
  const { toast } = useToast();
  const [open,     setOpen]     = useState(false);
  const [search,   setSearch]   = useState('');
  const [tabWh,    setTabWh]    = useState<WarehouseType|'all'>('all');
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const [form,     setForm]     = useState({ ...blank });
  const [saving,   setSaving]   = useState(false);

  const filtered = useMemo(() => {
    let list = [...purchases].sort((a,b) => b.createdAt.localeCompare(a.createdAt));
    if (tabWh !== 'all') list = list.filter(p => p.warehouse === tabWh);
    if (search) list = list.filter(p => p.materialName.includes(search) || p.supplierName.includes(search));
    return list;
  }, [purchases, tabWh, search]);

  const stats = useMemo(() => ({
    total:    purchases.reduce((s,p)=>s+p.finalCost,0),
    count:    purchases.length,
    thisMonth: purchases.filter(p=>{
      const d = new Date(p.purchaseDate); const n = new Date();
      return d.getMonth()===n.getMonth() && d.getFullYear()===n.getFullYear();
    }).reduce((s,p)=>s+p.finalCost,0),
  }), [purchases]);

  const supplierOpts = [{ value: '', label: '— اختر المورد —' }, ...suppliers.map(s => ({ value: s.name, label: s.name }))];

  const recalc = (f: typeof blank) => {
    const total      = f.quantity * f.unitPrice;
    const finalCost  = total + (f.extraExpenses || 0);
    const costPerUnit = f.quantity > 0 ? finalCost / f.quantity : 0;
    return { ...f, totalPrice: total, finalCost, costPerUnit };
  };

  const set = (k: keyof typeof blank, v: unknown) => {
    setForm(p => recalc({ ...p, [k]: v }));
  };

  const handleSave = async () => {
    if (!form.supplierName || !form.materialName || !form.quantity || !form.unitPrice) {
      toast('يرجى ملء الحقول المطلوبة', 'error'); return;
    }
    setSaving(true);
    try {
      await addPurchase(form);
      toast('تم تسجيل المشتريات وتحديث المخزن تلقائياً');
      setOpen(false); setForm({ ...blank });
    } catch {
      toast('حدث خطأ أثناء الحفظ. حاول مرة أخرى.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const warehouseLabel: Record<string, string> = { weft:'اللحمة', warp:'السدا', finished:'النهائي', reusable:'قابل للاستخدام', poy:'POY' };
  const warehouseColor: Record<string, string> = { weft:'green', warp:'blue', finished:'purple', reusable:'amber', poy:'cyan' };

  const columns = [
    { key: 'purchaseNumber', title: 'رقم الشراء', render: (r: Purchase) => <span className="font-mono text-green-pale text-xs">{r.purchaseNumber}</span> },
    { key: 'materialName',   title: 'المادة', render: (r: Purchase) => (
      <div className="flex items-center gap-2"><Package size={13} className="text-gray-500"/><span className="font-medium text-gray-200">{r.materialName}</span></div>
    )},
    { key: 'supplierName',  title: 'المورد',    render: (r: Purchase) => <span className="text-gray-400 text-sm">{r.supplierName}</span> },
    { key: 'warehouse',     title: 'المخزن',    render: (r: Purchase) => <Badge color={warehouseColor[r.warehouse] as 'green'}>{warehouseLabel[r.warehouse]}</Badge> },
    { key: 'quantity',      title: 'الكمية',    render: (r: Purchase) => <span className="text-gray-300">{r.quantity.toLocaleString()} {r.unit}</span> },
    { key: 'unitPrice',     title: 'سعر الوحدة', render: (r: Purchase) => <span className="text-gray-400 text-sm">{formatCurrency(r.unitPrice)}</span> },
    { key: 'finalCost',     title: 'التكلفة النهائية', render: (r: Purchase) => <span className="font-bold text-amber-400">{formatCurrency(r.finalCost)}</span> },
    { key: 'costPerUnit',   title: 'تكلفة/وحدة', render: (r: Purchase) => <span className="text-xs text-gray-500">{formatCurrency(r.costPerUnit)}</span> },
    { key: 'purchaseDate',  title: 'التاريخ',   render: (r: Purchase) => <span className="text-gray-500 text-xs">{formatDate(r.purchaseDate)}</span> },
    { key: 'actions', title: '', render: (r: Purchase) => (
      <Button variant="danger" size="sm" icon={<Trash2 size={13}/>} onClick={()=>setDeleteId(r.id)} />
    )},
  ];

  const warehouseTabs = [
    { key: 'all',      label: 'الكل',    count: purchases.length },
    { key: 'weft',     label: 'اللحمة',  count: purchases.filter(p=>p.warehouse==='weft').length },
    { key: 'warp',     label: 'السدا',   count: purchases.filter(p=>p.warehouse==='warp').length },
    { key: 'finished', label: 'نهائي',   count: purchases.filter(p=>p.warehouse==='finished').length },
    { key: 'poy',      label: 'POY',     count: purchases.filter(p=>p.warehouse==='poy').length },
  ];

  return (
    <div className="space-y-5">
      <SectionHeader title="المشتريات" subtitle="شراء المواد الخام — يتم تحديث المخزن تلقائياً"
        actions={<Button size="sm" icon={<Plus size={15}/>} onClick={()=>setOpen(true)}>فاتورة شراء جديدة</Button>} />

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">إجمالي المشتريات</p>
          <p className="text-xl font-bold text-amber-400">{formatCurrency(stats.total)}</p>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">هذا الشهر</p>
          <p className="text-xl font-bold text-green-pale">{formatCurrency(stats.thisMonth)}</p>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">عدد الفواتير</p>
          <p className="text-xl font-bold text-white">{stats.count}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Tabs tabs={warehouseTabs} active={tabWh} onChange={v=>setTabWh(v as WarehouseType|'all')} />
        <SearchInput value={search} onChange={setSearch} placeholder="بحث بالمادة أو المورد..." className="w-64" />
      </div>

      <Table columns={columns} data={filtered} rowKey={r=>r.id}
        emptyText="لا توجد مشتريات" emptyIcon="📦" />

      <Modal open={open} onClose={()=>setOpen(false)} title="فاتورة شراء جديدة" size="lg"
        footer={<div className="flex gap-3"><Button variant="ghost" className="flex-1" onClick={()=>setOpen(false)}>إلغاء</Button><Button className="flex-1" onClick={handleSave} disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ وتحديث المخزن'}</Button></div>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="المورد *" value={form.supplierName} onChange={e=>set('supplierName',e.target.value)} options={supplierOpts} />
            <Input label="تاريخ الشراء *" type="date" value={form.purchaseDate} onChange={e=>set('purchaseDate',e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="اسم المادة *" value={form.materialName} onChange={e=>set('materialName',e.target.value)} placeholder="خيط قطن، بوليستر..." />
            <Input label="نوع المادة" value={form.materialType} onChange={e=>set('materialType',e.target.value)} placeholder="خيط، قماش، POY..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="المخزن الهدف *" value={form.warehouse} onChange={e=>set('warehouse',e.target.value as WarehouseType)} options={warehouseOpts} />
            <Select label="الوحدة" value={form.unit} onChange={e=>set('unit',e.target.value)} options={unitOpts} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="الكمية *" type="number" value={form.quantity||''} onChange={e=>set('quantity',Number(e.target.value))} />
            <Input label="سعر الوحدة *" type="number" value={form.unitPrice||''} onChange={e=>set('unitPrice',Number(e.target.value))} />
          </div>
          <Input label="مصاريف إضافية (شحن، جمارك، نقل...)" type="number" value={form.extraExpenses||''} onChange={e=>set('extraExpenses',Number(e.target.value))} />

          {/* Cost Summary */}
          {form.quantity > 0 && form.unitPrice > 0 && (
            <div className="bg-dark-raised border border-green/20 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-green-pale mb-3"><Calculator size={15}/><span className="text-sm font-semibold">ملخص التكاليف</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">المبلغ الأساسي:</span><span className="text-gray-200">{formatCurrency(form.totalPrice)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">المصاريف الإضافية:</span><span className="text-gray-200">{formatCurrency(form.extraExpenses||0)}</span></div>
              <div className="flex justify-between text-sm font-bold pt-1 border-t border-dark-border"><span className="text-green-pale">التكلفة النهائية:</span><span className="text-green-pale">{formatCurrency(form.finalCost)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-600">تكلفة الوحدة الواحدة:</span><span className="text-gray-400">{formatCurrency(form.costPerUnit)} / {form.unit}</span></div>
            </div>
          )}

          <Input label="رقم فاتورة المورد" value={form.invoiceNumber} onChange={e=>set('invoiceNumber',e.target.value)} />
          <Textarea label="ملاحظات" value={form.notes} onChange={e=>set('notes',e.target.value)} rows={2} />

          <div className="p-3 bg-green/5 border border-green/20 rounded-xl text-xs text-green-pale">
            ✓ سيتم تحديث المخزن تلقائياً بعد حفظ فاتورة الشراء
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={()=>setDeleteId(null)}
        onConfirm={async()=>{ try { await deletePurchase(deleteId!); setDeleteId(null); toast('تم الحذف'); } catch { toast('حدث خطأ أثناء الحذف.', 'error'); } }}
        title="حذف فاتورة الشراء" message="هل تريد حذف هذه الفاتورة؟ لن يتم استرداد الكمية من المخزن." />
    </div>
  );
};
