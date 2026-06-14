import React, { useState, useMemo } from 'react';
import { Plus, Trash2, MapPin, CheckCircle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Button, Modal, Input, Select, Textarea, SearchInput, ConfirmDialog, SectionHeader, Table, Tabs } from '../../components/ui';
import { useToast } from '../../components/ui';
import { formatDate, formatCurrency } from '../../lib/utils';
import type { ImportShipment, ImportStatus } from '../../types';

const statusOpts: { value: ImportStatus; label: string }[] = [
  { value: 'planned',    label: 'مخطط' },
  { value: 'ordered',    label: 'مطلوب' },
  { value: 'shipped',    label: 'في الشحن' },
  { value: 'in_customs', label: 'في الجمارك' },
  { value: 'cleared',    label: 'مُخلَّص' },
  { value: 'received',   label: 'مستلم' },
  { value: 'cancelled',  label: 'ملغى' },
];
const currencyOpts = [
  { value: 'USD', label: 'دولار أمريكي (USD)' },
  { value: 'EUR', label: 'يورو (EUR)' },
  { value: 'CNY', label: 'يوان صيني (CNY)' },
  { value: 'TRY', label: 'ليرة تركية (TRY)' },
  { value: 'EGP', label: 'جنيه مصري (EGP)' },
];

const blankForm = {
  supplierName: '', country: '', materialType: '', quantity: 0, weightKg: 0,
  purchasePrice: 0, currency: 'USD', exchangeRate: 50.5, purchasePriceEGP: 0,
  shippingCost: 0, customsCost: 0, clearanceCost: 0, transportCost: 0,
  storageCost: 0, otherExpenses: 0, totalImportCost: 0, landedCostPerKg: 0,
  wastePercentage: 0, wasteWeightKg: 0, usableWeightKg: 0,
  pricePerKgBeforeWaste: 0, pricePerUsableKg: 0,
  expectedArrivalDate: '', arrivalDate: '',
  status: 'planned' as ImportStatus, addedToPOY: false, notes: '',
};

const calc = (f: typeof blankForm) => {
  const purchasePriceEGP    = f.purchasePrice * f.exchangeRate;
  const totalImportCost     = purchasePriceEGP + f.shippingCost + f.customsCost + f.clearanceCost + f.transportCost + f.storageCost + f.otherExpenses;
  const landedCostPerKg     = f.weightKg > 0 ? totalImportCost / f.weightKg : 0;
  const wasteWeightKg       = f.weightKg * (f.wastePercentage / 100);
  const usableWeightKg      = f.weightKg - wasteWeightKg;
  const pricePerKgBeforeWaste = landedCostPerKg;
  const pricePerUsableKg    = usableWeightKg > 0 ? totalImportCost / usableWeightKg : 0;
  return { ...f, purchasePriceEGP, totalImportCost, landedCostPerKg, wasteWeightKg, usableWeightKg, pricePerKgBeforeWaste, pricePerUsableKg };
};

export const Imports: React.FC = () => {
  const { imports, suppliers, addImport, updateImport, deleteImport, inventoryItems, updateInventoryItem } = useData();
  const { toast } = useToast();
  const [open,     setOpen]     = useState(false);
  const [search,   setSearch]   = useState('');
  const [statusF,  setStatusF]  = useState<ImportStatus|'all'>('all');
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const [form,     setForm]     = useState(blankForm);
  const [saving,   setSaving]   = useState(false);

  const filtered = useMemo(() => {
    let list = [...imports].sort((a,b) => b.createdAt.localeCompare(a.createdAt));
    if (statusF !== 'all') list = list.filter(i => i.status === statusF);
    if (search)  list = list.filter(i => i.supplierName.includes(search) || i.materialType.includes(search) || i.country.includes(search));
    return list;
  }, [imports, statusF, search]);

  const stats = useMemo(() => ({
    totalCost:   imports.reduce((s,i)=>s+i.totalImportCost,0),
    totalWeight: imports.reduce((s,i)=>s+i.weightKg,0),
    inTransit:   imports.filter(i=>['shipped','in_customs','cleared'].includes(i.status)).length,
    received:    imports.filter(i=>i.status==='received').length,
  }), [imports]);

  const supplierOpts = [{ value: '', label: '— اختر المورد —' }, ...suppliers.map(s => ({ value: s.name, label: `${s.name} (${s.country||'غير محدد'})` }))];

  const set = (k: keyof typeof blankForm, v: unknown) => {
    setForm(p => calc({ ...p, [k]: v }));
  };

  const handleSave = async () => {
    if (!form.supplierName || !form.country || !form.materialType || !form.weightKg) {
      toast('يرجى ملء الحقول المطلوبة', 'error'); return;
    }
    setSaving(true);
    try {
      await addImport(form);
      toast('تم تسجيل الشحنة');
      setOpen(false); setForm(blankForm);
    } catch {
      toast('حدث خطأ أثناء الحفظ. حاول مرة أخرى.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddToPOY = async (imp: ImportShipment) => {
    if (imp.addedToPOY) { toast('تم إضافتها مسبقاً لمخزن POY', 'error'); return; }
    const poyItems = inventoryItems.filter(i => i.warehouse === 'poy');
    const addWeight = (imp.wastePercentage ?? 0) > 0 ? (imp.usableWeightKg ?? imp.weightKg) : imp.weightKg;
    const costPerKg = (imp.wastePercentage ?? 0) > 0 ? (imp.pricePerUsableKg ?? imp.landedCostPerKg) : imp.landedCostPerKg;
    try {
      if (poyItems.length > 0) {
        const item = poyItems[0];
        await updateInventoryItem(item.id, { quantity: item.quantity + addWeight, costPerUnit: costPerKg });
      }
      await updateImport(imp.id, { addedToPOY: true, status: 'received' });
      toast(`تم إضافة ${addWeight.toLocaleString()} كيلو صافي إلى مخزن POY`);
    } catch {
      toast('حدث خطأ أثناء الإضافة إلى مخزن POY.', 'error');
    }
  };

  const handleStatusChange = async (id: string, status: ImportStatus) => {
    try {
      await updateImport(id, { status });
    } catch {
      toast('حدث خطأ أثناء تحديث الحالة.', 'error');
    }
  };

  const columns = [
    { key: 'shipmentNumber', title: 'رقم الشحنة', render: (r: ImportShipment) => <span className="font-mono text-green-pale text-xs">{r.shipmentNumber}</span> },
    { key: 'supplier', title: 'المورد / الدولة', render: (r: ImportShipment) => (
      <div>
        <p className="font-medium text-gray-200 text-sm">{r.supplierName}</p>
        <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={10}/>{r.country}</p>
      </div>
    )},
    { key: 'material', title: 'المادة', render: (r: ImportShipment) => (
      <div>
        <p className="text-gray-300 text-sm">{r.materialType}</p>
        <p className="text-xs text-gray-500">{r.weightKg.toLocaleString()} كيلو</p>
      </div>
    )},
    { key: 'cost', title: 'تكلفة الاستيراد', render: (r: ImportShipment) => (
      <div>
        <p className="font-bold text-amber-400">{formatCurrency(r.totalImportCost)}</p>
        <p className="text-xs text-gray-500">{formatCurrency(r.landedCostPerKg)}/كيلو</p>
        {(r.wastePercentage ?? 0) > 0 && (
          <p className="text-xs text-red-400">{formatCurrency(r.pricePerUsableKg ?? 0)}/كيلو صافي</p>
        )}
      </div>
    )},
    { key: 'waste', title: 'الهالك', render: (r: ImportShipment) => (
      (r.wastePercentage ?? 0) > 0 ? (
        <div>
          <p className="text-red-400 text-xs font-medium">{r.wastePercentage}%</p>
          <p className="text-gray-500 text-xs">{(r.wasteWeightKg ?? 0).toLocaleString()} كيلو هالك</p>
          <p className="text-green-pale text-xs">{(r.usableWeightKg ?? 0).toLocaleString()} كيلو صافي</p>
        </div>
      ) : <span className="text-gray-600 text-xs">—</span>
    )},
    { key: 'dates', title: 'التاريخ المتوقع', render: (r: ImportShipment) => (
      <span className="text-gray-400 text-xs">{r.expectedArrivalDate ? formatDate(r.expectedArrivalDate) : '—'}</span>
    )},
    { key: 'status', title: 'الحالة', render: (r: ImportShipment) => (
      <Select value={r.status} onChange={e=>handleStatusChange(r.id,e.target.value as ImportStatus)}
        options={statusOpts} className="text-xs py-1 min-w-0 w-32" />
    )},
    { key: 'poy', title: 'POY', render: (r: ImportShipment) => (
      r.addedToPOY
        ? <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle size={12}/>مُضاف</span>
        : r.status === 'received'
          ? <Button variant="ghost" size="sm" onClick={()=>handleAddToPOY(r)} className="text-xs">إضافة POY</Button>
          : <span className="text-gray-700 text-xs">—</span>
    )},
    { key: 'actions', title: '', render: (r: ImportShipment) => (
      <Button variant="danger" size="sm" icon={<Trash2 size={13}/>} onClick={()=>setDeleteId(r.id)} />
    )},
  ];

  const statusTabs = [
    { key: 'all', label: 'الكل', count: imports.length },
    ...statusOpts.map(s => ({ key: s.value, label: s.label, count: imports.filter(i=>i.status===s.value).length }))
  ];

  return (
    <div className="space-y-5">
      <SectionHeader title="الاستيراد" subtitle="إدارة شحنات الاستيراد وحساب تكلفة الاستيراد الكاملة"
        actions={<Button size="sm" icon={<Plus size={15}/>} onClick={()=>setOpen(true)}>شحنة جديدة</Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">إجمالي تكاليف الاستيراد</p>
          <p className="text-xl font-bold text-amber-400">{formatCurrency(stats.totalCost)}</p>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">إجمالي الوزن المستورد</p>
          <p className="text-xl font-bold text-white">{stats.totalWeight.toLocaleString()} كيلو</p>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">شحنات في الطريق</p>
          <p className="text-xl font-bold text-blue-400">{stats.inTransit}</p>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">شحنات مستلمة</p>
          <p className="text-xl font-bold text-emerald-400">{stats.received}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="overflow-x-auto">
          <Tabs tabs={statusTabs.slice(0,5)} active={statusF} onChange={v=>setStatusF(v as ImportStatus|'all')} />
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث بالمورد / المادة / الدولة..." className="w-64" />
      </div>

      <Table columns={columns} data={filtered} rowKey={r=>r.id}
        emptyText="لا توجد شحنات" emptyIcon="🚢" />

      <Modal open={open} onClose={()=>setOpen(false)} title="تسجيل شحنة استيراد جديدة" size="xl"
        footer={<div className="flex gap-3"><Button variant="ghost" className="flex-1" onClick={()=>setOpen(false)}>إلغاء</Button><Button className="flex-1" onClick={handleSave} disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ الشحنة'}</Button></div>}>
        <div className="space-y-5">
          <h4 className="text-xs font-semibold text-green-pale uppercase tracking-widest pb-2 border-b border-dark-border">بيانات الشحنة</h4>
          <div className="grid grid-cols-2 gap-4">
            <Select label="المورد *" value={form.supplierName} onChange={e=>set('supplierName',e.target.value)} options={supplierOpts} />
            <Input  label="الدولة *" value={form.country} onChange={e=>set('country',e.target.value)} placeholder="الصين، تركيا..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="نوع المادة *" value={form.materialType} onChange={e=>set('materialType',e.target.value)} placeholder="POY بوليستر، خيوط..." />
            <Input label="الكمية (عدد طرود/بكرات)" type="number" value={form.quantity||''} onChange={e=>set('quantity',Number(e.target.value))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="الوزن الإجمالي (كيلو) *" type="number" value={form.weightKg||''} onChange={e=>set('weightKg',Number(e.target.value))} />
            <Select label="الحالة" value={form.status} onChange={e=>set('status',e.target.value as ImportStatus)} options={statusOpts} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="تاريخ الوصول المتوقع" type="date" value={form.expectedArrivalDate} onChange={e=>set('expectedArrivalDate',e.target.value)} />
            <Input label="تاريخ الوصول الفعلي" type="date" value={form.arrivalDate} onChange={e=>set('arrivalDate',e.target.value)} />
          </div>

          <h4 className="text-xs font-semibold text-green-pale uppercase tracking-widest pb-2 border-b border-dark-border">حساب تكلفة الاستيراد</h4>
          <div className="grid grid-cols-3 gap-4">
            <Input label="سعر الشراء (بالعملة)" type="number" value={form.purchasePrice||''} onChange={e=>set('purchasePrice',Number(e.target.value))} />
            <Select label="العملة" value={form.currency} onChange={e=>set('currency',e.target.value)} options={currencyOpts} />
            <Input label="سعر الصرف (جنيه)" type="number" value={form.exchangeRate||''} onChange={e=>set('exchangeRate',Number(e.target.value))} step="0.1" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <Input label="تكلفة الشحن (جنيه)" type="number" value={form.shippingCost||''} onChange={e=>set('shippingCost',Number(e.target.value))} />
            <Input label="رسوم الجمارك (جنيه)" type="number" value={form.customsCost||''} onChange={e=>set('customsCost',Number(e.target.value))} />
            <Input label="رسوم التخليص (جنيه)" type="number" value={form.clearanceCost||''} onChange={e=>set('clearanceCost',Number(e.target.value))} />
            <Input label="نقل وترحيل (جنيه)" type="number" value={form.transportCost||''} onChange={e=>set('transportCost',Number(e.target.value))} />
            <Input label="تخزين (جنيه)" type="number" value={form.storageCost||''} onChange={e=>set('storageCost',Number(e.target.value))} />
            <Input label="مصاريف أخرى (جنيه)" type="number" value={form.otherExpenses||''} onChange={e=>set('otherExpenses',Number(e.target.value))} />
          </div>

          <h4 className="text-xs font-semibold text-red-400 uppercase tracking-widest pb-2 border-b border-dark-border">نسبة الهالك (اختياري)</h4>
          <div className="grid grid-cols-2 gap-4">
            <Input label="نسبة الهالك %" type="number" value={form.wastePercentage||''} onChange={e=>set('wastePercentage',Number(e.target.value))} placeholder="0" step="0.1" />
            <div className="bg-dark-raised border border-dark-border rounded-xl p-3 text-xs text-gray-400">
              {form.wastePercentage > 0 && form.weightKg > 0 ? (
                <div className="space-y-1">
                  <p>وزن الهالك: <span className="text-red-400 font-bold">{form.wasteWeightKg.toFixed(2)} كيلو</span></p>
                  <p>الوزن الصافي: <span className="text-green-pale font-bold">{form.usableWeightKg.toFixed(2)} كيلو</span></p>
                </div>
              ) : <p className="text-gray-600">أدخل نسبة الهالك لحساب الوزن الصافي</p>}
            </div>
          </div>

          {form.weightKg > 0 && (
            <div className="bg-dark-raised border border-amber-500/20 rounded-xl p-4">
              <p className="text-xs font-semibold text-amber-400 mb-3 uppercase tracking-widest">ملخص التكاليف</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="text-center">
                  <p className="text-xs text-gray-500">سعر الشراء (جنيه)</p>
                  <p className="font-bold text-gray-200">{formatCurrency(form.purchasePriceEGP)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">التكلفة الإجمالية</p>
                  <p className="font-bold text-amber-400">{formatCurrency(form.totalImportCost)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">سعر الكيلو الإجمالي</p>
                  <p className="font-bold text-green-pale">{formatCurrency(form.landedCostPerKg)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">الوزن المستورد</p>
                  <p className="font-bold text-white">{form.weightKg.toLocaleString()} كيلو</p>
                </div>
              </div>
              {form.wastePercentage > 0 && (
                <div className="mt-3 pt-3 border-t border-dark-border grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="text-center">
                    <p className="text-xs text-red-400">نسبة الهالك</p>
                    <p className="font-bold text-red-400">{form.wastePercentage}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-red-400">وزن الهالك</p>
                    <p className="font-bold text-red-400">{form.wasteWeightKg.toFixed(2)} كيلو</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-green-pale">الوزن الصافي</p>
                    <p className="font-bold text-green-pale">{form.usableWeightKg.toFixed(2)} كيلو</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-green-pale">سعر الكيلو الصافي</p>
                    <p className="font-bold text-green-pale">{formatCurrency(form.pricePerUsableKg)}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <Textarea label="ملاحظات" value={form.notes} onChange={e=>set('notes',e.target.value)} rows={2} />
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={()=>setDeleteId(null)}
        onConfirm={async()=>{ try { await deleteImport(deleteId!); setDeleteId(null); toast('تم الحذف'); } catch { toast('حدث خطأ أثناء الحذف.', 'error'); } }}
        title="حذف الشحنة" message="هل تريد حذف هذه الشحنة؟" />
    </div>
  );
};
