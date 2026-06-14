import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Trash2, Eye, Pencil, Copy, Printer, X, Calculator } from 'lucide-react';
import { useData } from '../../context/DataContext';
import {
  Button, Modal, Input, Select, Textarea, SearchInput,
  ConfirmDialog, SectionHeader, Table, Card, useToast,
} from '../../components/ui';
import type { FabricCosting as FC, WeftLine, WarpLine, ExtraCostLine } from '../../types';
import { formatDate, formatCurrency } from '../../lib/utils';

// ── ID helper ──
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

// ── Line calculators ──
const calcWeft = (l: WeftLine): WeftLine => {
  const wasteWeight          = l.consumedWeight * (l.wastePercentage / 100);
  const finalConsumedWeight  = l.consumedWeight + wasteWeight;
  const totalCost            = finalConsumedWeight * l.pricePerKg;
  return { ...l, wasteWeight, finalConsumedWeight, totalCost };
};
const calcWarp = (l: WarpLine): WarpLine => {
  const wasteWeight          = l.consumedWeight * (l.wastePercentage / 100);
  const finalConsumedWeight  = l.consumedWeight + wasteWeight;
  const totalCost            = finalConsumedWeight * l.pricePerKg;
  return { ...l, wasteWeight, finalConsumedWeight, totalCost };
};

// ── Summary calculator ──
interface FormState {
  designRef: string; designName: string; customerName: string;
  workOrderRef: string; fabricType: string; quantityMeters: number;
  totalWeightKg: number; date: string;
  weftLines: WeftLine[]; warpLines: WarpLine[];
  generalWastePercentage: number; generalWasteNotes: string;
  applyGeneralWasteToMaterial: boolean; applyGeneralWasteToQuantity: boolean;
  extraCosts: ExtraCostLine[];
  sellingPricePerMeter: number;
  responsibleEmployeeId: string; responsibleEmployeeName: string;
  notes: string;
}

const calcSummary = (f: FormState) => {
  const totalWeftCost      = f.weftLines.reduce((s, l) => s + l.totalCost, 0);
  const totalWarpCost      = f.warpLines.reduce((s, l) => s + l.totalCost, 0);
  const totalMaterialCost  = totalWeftCost + totalWarpCost;
  const generalWasteCost   = f.applyGeneralWasteToMaterial
    ? totalMaterialCost * (f.generalWastePercentage / 100)
    : 0;
  const totalExtraCosts    = f.extraCosts.reduce((s, c) => s + c.amount, 0);
  const grandTotalCost     = totalMaterialCost + generalWasteCost + totalExtraCosts;
  const costPerMeter       = f.quantityMeters > 0 ? grandTotalCost / f.quantityMeters : 0;
  const costPerKg          = f.totalWeightKg > 0   ? grandTotalCost / f.totalWeightKg  : 0;
  const sellingTotal       = f.sellingPricePerMeter * f.quantityMeters;
  const expectedProfitValue = sellingTotal - grandTotalCost;
  const profitPercentage   = grandTotalCost > 0 ? (expectedProfitValue / grandTotalCost) * 100 : 0;
  const totalWasteWeight   =
    f.weftLines.reduce((s, l) => s + l.wasteWeight, 0) +
    f.warpLines.reduce((s, l) => s + l.wasteWeight, 0);
  const totalWasteCost     =
    f.weftLines.reduce((s, l) => s + l.wasteWeight * l.pricePerKg, 0) +
    f.warpLines.reduce((s, l) => s + l.wasteWeight * l.pricePerKg, 0) +
    generalWasteCost;

  return {
    totalWeftCost, totalWarpCost, totalMaterialCost,
    generalWasteCost, totalExtraCosts, grandTotalCost,
    costPerMeter, costPerKg, sellingTotal, expectedProfitValue,
    profitPercentage, totalWasteWeight, totalWasteCost,
  };
};

const emptyWeft  = (): WeftLine => ({ id: uid(), materialName: '', color: '', pricePerKg: 0, consumedWeight: 0, wastePercentage: 5,  wasteWeight: 0, finalConsumedWeight: 0, totalCost: 0, notes: '' });
const emptyWarp  = (): WarpLine => ({ id: uid(), materialName: '', pricePerKg: 0, consumedWeight: 0, wastePercentage: 3, wasteWeight: 0, finalConsumedWeight: 0, totalCost: 0, notes: '' });
const emptyExtra = (): ExtraCostLine => ({ id: uid(), name: '', amount: 0, notes: '' });

const emptyForm = (): FormState => ({
  designRef: '', designName: '', customerName: '', workOrderRef: '',
  fabricType: '', quantityMeters: 0, totalWeightKg: 0,
  date: new Date().toISOString().split('T')[0],
  weftLines: [emptyWeft()], warpLines: [emptyWarp()],
  generalWastePercentage: 0, generalWasteNotes: '',
  applyGeneralWasteToMaterial: false, applyGeneralWasteToQuantity: false,
  extraCosts: [],
  sellingPricePerMeter: 0,
  responsibleEmployeeId: '', responsibleEmployeeName: '', notes: '',
});

const EXTRA_PRESETS = [
  'تكلفة الصباغة', 'تكلفة الطباعة', 'تكلفة التجهيز', 'تكلفة العمالة',
  'تكلفة تشغيل الماكينة', 'تكلفة الكهرباء', 'تكلفة التغليف', 'تكلفة النقل', 'مصاريف أخرى',
];

// ── Mini input component for line tables ──
const LI: React.FC<{
  value: string | number; onChange: (v: string) => void;
  type?: string; placeholder?: string; className?: string; readOnly?: boolean;
}> = ({ value, onChange, type = 'text', placeholder, className = '', readOnly }) => (
  <input
    type={type}
    value={value}
    readOnly={readOnly}
    onChange={e => !readOnly && onChange(e.target.value)}
    placeholder={placeholder}
    className={`bg-dark-surface border border-dark-border rounded-lg px-2 py-1.5 text-xs text-gray-200 placeholder-gray-600
      focus:outline-none focus:border-green/50 transition-colors
      ${readOnly ? 'text-green-pale bg-dark-raised cursor-default' : ''}
      ${className}`}
  />
);

export const FabricCosting: React.FC = () => {
  const { fabricCostings, employees, addFabricCosting, updateFabricCosting, deleteFabricCosting } = useData();
  const { toast } = useToast();

  const [search,     setSearch]     = useState('');
  const [formOpen,   setFormOpen]   = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteId,   setDeleteId]   = useState<string | null>(null);
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [selected,   setSelected]   = useState<FC | null>(null);
  const [form,       setForm]       = useState<FormState>(emptyForm());
  const [loading,    setLoading]    = useState(false);
  const [printTarget, setPrintTarget] = useState<FC | null>(null);

  const filtered = useMemo(() => {
    let list = [...fabricCostings].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (search) list = list.filter(c =>
      c.costingNumber.includes(search) || c.designName.includes(search) ||
      (c.customerName || '').includes(search) || c.fabricType.includes(search)
    );
    return list;
  }, [fabricCostings, search]);

  const stats = useMemo(() => ({
    total:       fabricCostings.length,
    totalCost:   fabricCostings.reduce((s, c) => s + c.grandTotalCost, 0),
    avgPerMeter: fabricCostings.length > 0
      ? fabricCostings.reduce((s, c) => s + c.costPerMeter, 0) / fabricCostings.length : 0,
    totalWaste:  fabricCostings.reduce((s, c) => s + c.totalWasteCost, 0),
  }), [fabricCostings]);

  const activeEmployees = useMemo(() =>
    employees.filter(e => e.status === 'active'), [employees]);

  const summary = useMemo(() => calcSummary(form), [form]);

  // ── Form setters ──
  const setField = useCallback(<K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(p => ({ ...p, [k]: v })), []);

  const updateWeftLine = useCallback((id: string, changes: Partial<WeftLine>) => {
    setForm(p => ({
      ...p,
      weftLines: p.weftLines.map(l => l.id === id ? calcWeft({ ...l, ...changes }) : l),
    }));
  }, []);

  const updateWarpLine = useCallback((id: string, changes: Partial<WarpLine>) => {
    setForm(p => ({
      ...p,
      warpLines: p.warpLines.map(l => l.id === id ? calcWarp({ ...l, ...changes }) : l),
    }));
  }, []);

  const updateExtraLine = useCallback((id: string, changes: Partial<ExtraCostLine>) => {
    setForm(p => ({
      ...p,
      extraCosts: p.extraCosts.map(l => l.id === id ? { ...l, ...changes } : l),
    }));
  }, []);

  // ── Open form ──
  const openAdd = () => {
    setEditingId(null); setForm(emptyForm()); setFormOpen(true);
  };

  const openEdit = (c: FC) => {
    setEditingId(c.id);
    setForm({
      designRef: c.designRef || '', designName: c.designName,
      customerName: c.customerName || '', workOrderRef: c.workOrderRef || '',
      fabricType: c.fabricType, quantityMeters: c.quantityMeters,
      totalWeightKg: c.totalWeightKg, date: c.date,
      weftLines: c.weftLines.length ? c.weftLines : [emptyWeft()],
      warpLines: c.warpLines.length ? c.warpLines : [emptyWarp()],
      generalWastePercentage: c.generalWastePercentage,
      generalWasteNotes: c.generalWasteNotes || '',
      applyGeneralWasteToMaterial: c.applyGeneralWasteToMaterial,
      applyGeneralWasteToQuantity: c.applyGeneralWasteToQuantity,
      extraCosts: c.extraCosts || [],
      sellingPricePerMeter: c.sellingPricePerMeter,
      responsibleEmployeeId: c.responsibleEmployeeId || '',
      responsibleEmployeeName: c.responsibleEmployeeName || '',
      notes: c.notes || '',
    });
    setFormOpen(true);
  };

  const openDuplicate = (c: FC) => {
    openEdit(c);
    setEditingId(null);
  };

  // ── Save ──
  const handleSave = async () => {
    if (!form.designName.trim() || !form.fabricType.trim() || !form.quantityMeters) {
      toast('يرجى ملء اسم التصميم والصنف والكمية', 'error'); return;
    }
    setLoading(true);
    try {
      const s = calcSummary(form);
      const payload: Omit<FC, 'id' | 'createdAt' | 'updatedAt' | 'costingNumber'> = {
        ...form, ...s,
      };
      if (editingId) {
        await updateFabricCosting(editingId, payload);
        toast('تم تحديث سجل التكاليف');
      } else {
        await addFabricCosting(payload);
        toast('تمت إضافة سجل التكاليف بنجاح');
      }
      setFormOpen(false);
    } catch {
      toast('حدث خطأ أثناء الحفظ. حاول مرة أخرى.', 'error');
    } finally { setLoading(false); }
  };

  const handlePrint = (c: FC) => {
    setPrintTarget(c);
    setTimeout(() => window.print(), 300);
  };

  // ── Table columns ──
  const columns = [
    {
      key: 'costingNumber', title: 'رقم التكلفة',
      render: (c: FC) => <span className="font-mono text-green-pale text-xs font-bold">{c.costingNumber}</span>,
    },
    {
      key: 'design', title: 'التصميم / الصنف',
      render: (c: FC) => (
        <div>
          <p className="text-white font-medium text-sm">{c.designName}</p>
          <p className="text-gray-500 text-xs">{c.fabricType}</p>
        </div>
      ),
    },
    {
      key: 'customer', title: 'العميل',
      render: (c: FC) => <span className="text-gray-300 text-sm">{c.customerName || '—'}</span>,
    },
    {
      key: 'qty', title: 'الكمية / الوزن',
      render: (c: FC) => (
        <div>
          <p className="text-gray-200 text-sm">{c.quantityMeters.toLocaleString()} متر</p>
          <p className="text-gray-500 text-xs">{c.totalWeightKg.toLocaleString()} كيلو</p>
        </div>
      ),
    },
    {
      key: 'cost', title: 'التكلفة الإجمالية',
      render: (c: FC) => (
        <div>
          <p className="text-amber-400 font-bold text-sm">{formatCurrency(c.grandTotalCost)}</p>
          <p className="text-gray-500 text-xs">{formatCurrency(c.costPerMeter)}/متر</p>
        </div>
      ),
    },
    {
      key: 'waste', title: 'تكلفة الهالك',
      render: (c: FC) => (
        <span className="text-red-400 text-sm font-medium">{formatCurrency(c.totalWasteCost)}</span>
      ),
    },
    {
      key: 'selling', title: 'سعر البيع',
      render: (c: FC) => (
        <div>
          <p className="text-green-pale font-semibold text-sm">{formatCurrency(c.sellingPricePerMeter)}/متر</p>
          <p className={`text-xs ${c.profitPercentage >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            هامش {c.profitPercentage.toFixed(1)}%
          </p>
        </div>
      ),
    },
    {
      key: 'date', title: 'التاريخ',
      render: (c: FC) => <span className="text-gray-400 text-xs">{formatDate(c.date)}</span>,
    },
    {
      key: 'actions', title: '',
      render: (c: FC) => (
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button onClick={() => { setSelected(c); setDetailOpen(true); }}
            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
            <Eye size={13}/>
          </button>
          <button onClick={() => openEdit(c)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gold hover:bg-gold/10 transition-all">
            <Pencil size={13}/>
          </button>
          <button onClick={() => openDuplicate(c)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
            <Copy size={13}/>
          </button>
          <button onClick={() => handlePrint(c)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-green-pale hover:bg-green/10 transition-all">
            <Printer size={13}/>
          </button>
          <button onClick={() => setDeleteId(c.id)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <Trash2 size={13}/>
          </button>
        </div>
      ),
    },
  ];

  // ── Render ──
  return (
    <div className="space-y-5">
      <SectionHeader
        title="تكاليف القماش"
        subtitle="حساب تكلفة إنتاج القماش — اللحمة والسدا والهالك والتكاليف الإضافية"
        actions={<Button icon={<Plus size={16}/>} onClick={openAdd}>سجل تكلفة جديد</Button>}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">إجمالي السجلات</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">إجمالي التكاليف</p>
          <p className="text-xl font-bold text-amber-400">{formatCurrency(stats.totalCost)}</p>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">متوسط التكلفة/متر</p>
          <p className="text-xl font-bold text-green-pale">{formatCurrency(stats.avgPerMeter)}</p>
        </div>
        <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500 mb-1">إجمالي تكلفة الهالك</p>
          <p className="text-xl font-bold text-red-400">{formatCurrency(stats.totalWaste)}</p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <div className="flex gap-3 items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="بحث برقم التكلفة أو اسم التصميم أو العميل..." className="flex-1" />
          <span className="text-sm text-gray-500">{filtered.length} سجل</span>
        </div>
      </Card>

      <Card padding={false}>
        <Table
          columns={columns} data={filtered} rowKey={c => c.id}
          emptyText="لا توجد سجلات تكاليف" emptyIcon={<Calculator size={40}/>}
          onRowClick={c => { setSelected(c); setDetailOpen(true); }}
        />
      </Card>

      {/* ══════════════════════════════ FORM MODAL ══════════════════════════════ */}
      <Modal
        open={formOpen} onClose={() => setFormOpen(false)}
        title={editingId ? 'تعديل سجل التكاليف' : 'سجل تكلفة قماش جديد'}
        size="xl"
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setFormOpen(false)}>إلغاء</Button>
            <Button className="flex-1" loading={loading} onClick={handleSave}>
              {editingId ? 'حفظ التعديلات' : 'حفظ السجل'}
            </Button>
          </div>
        }
      >
        <div className="space-y-6">

          {/* ── Section 1: Basic Data ── */}
          <div>
            <h4 className="text-xs font-bold text-green-pale uppercase tracking-widest border-b border-dark-border pb-2 mb-4">بيانات أساسية</h4>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <Input label="اسم التصميم *" value={form.designName}
                onChange={e => setField('designName', e.target.value)} placeholder="اسم التصميم" />
              <Input label="مرجع التصميم" value={form.designRef}
                onChange={e => setField('designRef', e.target.value)} placeholder="D-001" />
              <Input label="صنف القماش *" value={form.fabricType}
                onChange={e => setField('fabricType', e.target.value)} placeholder="قطن، بوليستر..." />
              <Input label="اسم العميل" value={form.customerName}
                onChange={e => setField('customerName', e.target.value)} placeholder="اختياري" />
              <Input label="رقم أمر الشغل" value={form.workOrderRef}
                onChange={e => setField('workOrderRef', e.target.value)} placeholder="WO-001" />
              <Input label="التاريخ *" type="date" value={form.date}
                onChange={e => setField('date', e.target.value)} />
              <Input label="كمية القماش (متر) *" type="number" value={form.quantityMeters || ''}
                onChange={e => setField('quantityMeters', Number(e.target.value))} placeholder="0" />
              <Input label="الوزن الإجمالي (كيلو)" type="number" value={form.totalWeightKg || ''}
                onChange={e => setField('totalWeightKg', Number(e.target.value))} placeholder="0" />
              <Select label="الموظف المسؤول"
                value={form.responsibleEmployeeId}
                onChange={e => {
                  const emp = activeEmployees.find(x => x.id === e.target.value);
                  setField('responsibleEmployeeId', e.target.value);
                  setField('responsibleEmployeeName', emp?.name || '');
                }}
                options={[
                  { value: '', label: '— اختر الموظف —' },
                  ...activeEmployees.map(e => ({ value: e.id, label: `${e.name} — ${e.jobTitle}` })),
                ]}
              />
            </div>
          </div>

          {/* ── Section 2: Weft Lines ── */}
          <div>
            <div className="flex items-center justify-between border-b border-dark-border pb-2 mb-3">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-widest">تكلفة اللحمات (Weft)</h4>
              <Button size="sm" variant="ghost" icon={<Plus size={13}/>}
                onClick={() => setForm(p => ({ ...p, weftLines: [...p.weftLines, emptyWeft()] }))}>
                إضافة سطر
              </Button>
            </div>
            <div className="space-y-2">
              <div className="hidden sm:grid grid-cols-[1fr_80px_80px_80px_60px_70px_70px_90px_28px] gap-1.5 px-1">
                {['المادة', 'اللون', 'سعر/كيلو', 'الوزن (كيلو)', 'هالك%', 'وزن الهالك', 'الوزن النهائي', 'التكلفة', ''].map(h => (
                  <span key={h} className="text-[10px] text-gray-600 font-semibold uppercase">{h}</span>
                ))}
              </div>
              {form.weftLines.map((l, i) => (
                <div key={l.id} className="grid grid-cols-[1fr_80px_80px_80px_60px_70px_70px_90px_28px] gap-1.5 items-center">
                  <LI value={l.materialName} onChange={v => updateWeftLine(l.id, { materialName: v })} placeholder={`لحمة ${i+1}`} />
                  <LI value={l.color} onChange={v => updateWeftLine(l.id, { color: v })} placeholder="اللون" />
                  <LI type="number" value={l.pricePerKg || ''} onChange={v => updateWeftLine(l.id, { pricePerKg: Number(v) })} placeholder="0" />
                  <LI type="number" value={l.consumedWeight || ''} onChange={v => updateWeftLine(l.id, { consumedWeight: Number(v) })} placeholder="0" />
                  <LI type="number" value={l.wastePercentage || ''} onChange={v => updateWeftLine(l.id, { wastePercentage: Number(v) })} placeholder="5" />
                  <LI value={l.wasteWeight.toFixed(2)} onChange={() => {}} readOnly />
                  <LI value={l.finalConsumedWeight.toFixed(2)} onChange={() => {}} readOnly />
                  <LI value={formatCurrency(l.totalCost)} onChange={() => {}} readOnly className="font-bold" />
                  <button onClick={() => setForm(p => ({ ...p, weftLines: p.weftLines.filter(x => x.id !== l.id) }))}
                    className="p-1 text-gray-600 hover:text-red-400 transition-colors flex-shrink-0">
                    <X size={12}/>
                  </button>
                </div>
              ))}
              <div className="flex justify-end pt-1">
                <span className="text-xs text-amber-400 font-bold">
                  إجمالي اللحمات: {formatCurrency(summary.totalWeftCost)}
                </span>
              </div>
            </div>
          </div>

          {/* ── Section 3: Warp Lines ── */}
          <div>
            <div className="flex items-center justify-between border-b border-dark-border pb-2 mb-3">
              <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest">تكلفة السدا (Warp)</h4>
              <Button size="sm" variant="ghost" icon={<Plus size={13}/>}
                onClick={() => setForm(p => ({ ...p, warpLines: [...p.warpLines, emptyWarp()] }))}>
                إضافة سطر
              </Button>
            </div>
            <div className="space-y-2">
              <div className="hidden sm:grid grid-cols-[1fr_80px_80px_60px_70px_70px_90px_28px] gap-1.5 px-1">
                {['المادة', 'سعر/كيلو', 'الوزن (كيلو)', 'هالك%', 'وزن الهالك', 'الوزن النهائي', 'التكلفة', ''].map(h => (
                  <span key={h} className="text-[10px] text-gray-600 font-semibold uppercase">{h}</span>
                ))}
              </div>
              {form.warpLines.map((l, i) => (
                <div key={l.id} className="grid grid-cols-[1fr_80px_80px_60px_70px_70px_90px_28px] gap-1.5 items-center">
                  <LI value={l.materialName} onChange={v => updateWarpLine(l.id, { materialName: v })} placeholder={`سدا ${i+1}`} />
                  <LI type="number" value={l.pricePerKg || ''} onChange={v => updateWarpLine(l.id, { pricePerKg: Number(v) })} placeholder="0" />
                  <LI type="number" value={l.consumedWeight || ''} onChange={v => updateWarpLine(l.id, { consumedWeight: Number(v) })} placeholder="0" />
                  <LI type="number" value={l.wastePercentage || ''} onChange={v => updateWarpLine(l.id, { wastePercentage: Number(v) })} placeholder="3" />
                  <LI value={l.wasteWeight.toFixed(2)} onChange={() => {}} readOnly />
                  <LI value={l.finalConsumedWeight.toFixed(2)} onChange={() => {}} readOnly />
                  <LI value={formatCurrency(l.totalCost)} onChange={() => {}} readOnly className="font-bold" />
                  <button onClick={() => setForm(p => ({ ...p, warpLines: p.warpLines.filter(x => x.id !== l.id) }))}
                    className="p-1 text-gray-600 hover:text-red-400 transition-colors flex-shrink-0">
                    <X size={12}/>
                  </button>
                </div>
              ))}
              <div className="flex justify-end pt-1">
                <span className="text-xs text-blue-400 font-bold">
                  إجمالي السدا: {formatCurrency(summary.totalWarpCost)}
                </span>
              </div>
            </div>
          </div>

          {/* ── Section 4: General Waste ── */}
          <div>
            <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest border-b border-dark-border pb-2 mb-3">الهالك العام للقماش</h4>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <Input label="نسبة الهالك العام %" type="number" value={form.generalWastePercentage || ''}
                onChange={e => setField('generalWastePercentage', Number(e.target.value))} placeholder="0" />
              <div className="flex items-end gap-4 pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.applyGeneralWasteToMaterial}
                    onChange={e => setField('applyGeneralWasteToMaterial', e.target.checked)}
                    className="w-4 h-4 accent-green rounded" />
                  <span className="text-sm text-gray-300">تطبيق على المواد</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.applyGeneralWasteToQuantity}
                    onChange={e => setField('applyGeneralWasteToQuantity', e.target.checked)}
                    className="w-4 h-4 accent-green rounded" />
                  <span className="text-sm text-gray-300">تطبيق على الكمية</span>
                </label>
              </div>
              <Input label="ملاحظات الهالك" value={form.generalWasteNotes}
                onChange={e => setField('generalWasteNotes', e.target.value)} placeholder="اختياري" />
            </div>
            {form.generalWastePercentage > 0 && form.applyGeneralWasteToMaterial && (
              <div className="mt-2 text-xs text-red-400">
                تكلفة الهالك العام: {formatCurrency(summary.generalWasteCost)}
              </div>
            )}
          </div>

          {/* ── Section 5: Extra Costs ── */}
          <div>
            <div className="flex items-center justify-between border-b border-dark-border pb-2 mb-3">
              <h4 className="text-xs font-bold text-purple-400 uppercase tracking-widest">تكاليف إضافية</h4>
              <div className="flex gap-2">
                <select
                  className="bg-dark-surface border border-dark-border rounded-lg px-2 py-1 text-xs text-gray-300"
                  onChange={e => {
                    if (!e.target.value) return;
                    setForm(p => ({ ...p, extraCosts: [...p.extraCosts, { ...emptyExtra(), name: e.target.value }] }));
                    e.target.value = '';
                  }}
                >
                  <option value="">+ إضافة سريعة...</option>
                  {EXTRA_PRESETS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <Button size="sm" variant="ghost" icon={<Plus size={13}/>}
                  onClick={() => setForm(p => ({ ...p, extraCosts: [...p.extraCosts, emptyExtra()] }))}>
                  مخصص
                </Button>
              </div>
            </div>
            {form.extraCosts.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-3">لا توجد تكاليف إضافية</p>
            ) : (
              <div className="space-y-2">
                {form.extraCosts.map(l => (
                  <div key={l.id} className="grid grid-cols-[1fr_130px_28px] gap-2 items-center">
                    <LI value={l.name} onChange={v => updateExtraLine(l.id, { name: v })} placeholder="اسم التكلفة" />
                    <LI type="number" value={l.amount || ''} onChange={v => updateExtraLine(l.id, { amount: Number(v) })} placeholder="المبلغ (جنيه)" />
                    <button onClick={() => setForm(p => ({ ...p, extraCosts: p.extraCosts.filter(x => x.id !== l.id) }))}
                      className="p-1 text-gray-600 hover:text-red-400 transition-colors">
                      <X size={12}/>
                    </button>
                  </div>
                ))}
                <div className="flex justify-end pt-1">
                  <span className="text-xs text-purple-400 font-bold">
                    إجمالي التكاليف الإضافية: {formatCurrency(summary.totalExtraCosts)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── Section 6: Selling Price ── */}
          <div>
            <h4 className="text-xs font-bold text-green-pale uppercase tracking-widest border-b border-dark-border pb-2 mb-3">سعر البيع والربح</h4>
            <div className="grid grid-cols-2 gap-3">
              <Input label="سعر البيع للمتر (جنيه)" type="number" value={form.sellingPricePerMeter || ''}
                onChange={e => setField('sellingPricePerMeter', Number(e.target.value))} placeholder="0" />
              <div className="bg-dark-raised border border-dark-border rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">هامش الربح المتوقع</p>
                <p className={`text-lg font-bold ${summary.profitPercentage >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {summary.profitPercentage.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* ── Section 7: Live Summary ── */}
          {(summary.grandTotalCost > 0 || form.quantityMeters > 0) && (
            <div className="bg-dark-raised border border-green/20 rounded-xl p-4">
              <h4 className="text-xs font-bold text-green-pale uppercase tracking-widest mb-4">ملخص التكلفة</h4>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'إجمالي اللحمات',      value: formatCurrency(summary.totalWeftCost),     color: 'text-amber-400' },
                  { label: 'إجمالي السدا',          value: formatCurrency(summary.totalWarpCost),     color: 'text-blue-400' },
                  { label: 'إجمالي المواد',         value: formatCurrency(summary.totalMaterialCost), color: 'text-white' },
                  { label: 'تكلفة الهالك الكلي',   value: formatCurrency(summary.totalWasteCost),    color: 'text-red-400' },
                  { label: 'التكاليف الإضافية',    value: formatCurrency(summary.totalExtraCosts),   color: 'text-purple-400' },
                  { label: 'التكلفة الإجمالية',    value: formatCurrency(summary.grandTotalCost),    color: 'text-amber-400 text-base font-black' },
                  { label: 'تكلفة المتر',           value: formatCurrency(summary.costPerMeter),      color: 'text-green-pale font-bold' },
                  { label: 'تكلفة الكيلو',          value: formatCurrency(summary.costPerKg),         color: 'text-green-pale' },
                  { label: 'إجمالي المبيعات',       value: formatCurrency(summary.sellingTotal),      color: 'text-emerald-400' },
                  { label: 'صافي الربح',            value: formatCurrency(summary.expectedProfitValue), color: summary.expectedProfitValue >= 0 ? 'text-emerald-400' : 'text-red-400' },
                  { label: 'هامش الربح',            value: `${summary.profitPercentage.toFixed(1)}%`, color: summary.profitPercentage >= 0 ? 'text-emerald-400' : 'text-red-400' },
                  { label: 'وزن الهالك الكلي',     value: `${summary.totalWasteWeight.toFixed(2)} كيلو`, color: 'text-red-400' },
                ].map(r => (
                  <div key={r.label} className="bg-dark-card border border-dark-border rounded-lg p-2.5">
                    <p className="text-[10px] text-gray-500 mb-0.5">{r.label}</p>
                    <p className={`text-sm font-bold ${r.color}`}>{r.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <Textarea label="ملاحظات" value={form.notes}
            onChange={e => setField('notes', e.target.value)} rows={2} />
        </div>
      </Modal>

      {/* ══════════════════════════════ DETAIL MODAL ══════════════════════════════ */}
      {selected && detailOpen && (
        <Modal open={detailOpen} onClose={() => setDetailOpen(false)}
          title={`تفاصيل التكلفة — ${selected.costingNumber}`} size="xl">
          <div className="space-y-5">
            {/* Header info */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'التصميم',           value: selected.designName },
                { label: 'الصنف',             value: selected.fabricType },
                { label: 'العميل',            value: selected.customerName || '—' },
                { label: 'كمية القماش',       value: `${selected.quantityMeters.toLocaleString()} متر` },
                { label: 'الوزن الإجمالي',    value: `${selected.totalWeightKg.toLocaleString()} كيلو` },
                { label: 'التاريخ',           value: formatDate(selected.date) },
                { label: 'الموظف المسؤول',    value: selected.responsibleEmployeeName || '—' },
                { label: 'أمر الشغل',         value: selected.workOrderRef || '—' },
                { label: 'مرجع التصميم',      value: selected.designRef || '—' },
              ].map(r => (
                <div key={r.label} className="bg-dark-raised border border-dark-border rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">{r.label}</p>
                  <p className="text-sm font-medium text-white">{r.value}</p>
                </div>
              ))}
            </div>

            {/* Weft breakdown */}
            {selected.weftLines.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">تكاليف اللحمات</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-dark-border">
                        {['المادة', 'اللون', 'سعر/كيلو', 'الوزن', 'هالك%', 'وزن الهالك', 'الوزن النهائي', 'التكلفة'].map(h => (
                          <th key={h} className="px-2 py-2 text-right text-gray-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-border/40">
                      {selected.weftLines.map(l => (
                        <tr key={l.id}>
                          <td className="px-2 py-2 text-gray-200">{l.materialName}</td>
                          <td className="px-2 py-2 text-gray-400">{l.color}</td>
                          <td className="px-2 py-2 text-gray-300">{formatCurrency(l.pricePerKg)}</td>
                          <td className="px-2 py-2 text-gray-300">{l.consumedWeight} كيلو</td>
                          <td className="px-2 py-2 text-red-400">{l.wastePercentage}%</td>
                          <td className="px-2 py-2 text-red-400">{l.wasteWeight.toFixed(2)} كيلو</td>
                          <td className="px-2 py-2 text-gray-300">{l.finalConsumedWeight.toFixed(2)} كيلو</td>
                          <td className="px-2 py-2 text-amber-400 font-bold">{formatCurrency(l.totalCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-amber-500/30">
                        <td colSpan={7} className="px-2 py-2 text-right text-amber-400 font-bold">إجمالي اللحمات</td>
                        <td className="px-2 py-2 text-amber-400 font-bold">{formatCurrency(selected.totalWeftCost)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Warp breakdown */}
            {selected.warpLines.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">تكاليف السدا</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-dark-border">
                        {['المادة', 'سعر/كيلو', 'الوزن', 'هالك%', 'وزن الهالك', 'الوزن النهائي', 'التكلفة'].map(h => (
                          <th key={h} className="px-2 py-2 text-right text-gray-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-border/40">
                      {selected.warpLines.map(l => (
                        <tr key={l.id}>
                          <td className="px-2 py-2 text-gray-200">{l.materialName}</td>
                          <td className="px-2 py-2 text-gray-300">{formatCurrency(l.pricePerKg)}</td>
                          <td className="px-2 py-2 text-gray-300">{l.consumedWeight} كيلو</td>
                          <td className="px-2 py-2 text-red-400">{l.wastePercentage}%</td>
                          <td className="px-2 py-2 text-red-400">{l.wasteWeight.toFixed(2)} كيلو</td>
                          <td className="px-2 py-2 text-gray-300">{l.finalConsumedWeight.toFixed(2)} كيلو</td>
                          <td className="px-2 py-2 text-blue-400 font-bold">{formatCurrency(l.totalCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-blue-500/30">
                        <td colSpan={6} className="px-2 py-2 text-right text-blue-400 font-bold">إجمالي السدا</td>
                        <td className="px-2 py-2 text-blue-400 font-bold">{formatCurrency(selected.totalWarpCost)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Extra costs */}
            {selected.extraCosts.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-2">التكاليف الإضافية</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {selected.extraCosts.map(c => (
                    <div key={c.id} className="bg-dark-raised border border-dark-border rounded-lg p-2.5">
                      <p className="text-xs text-gray-500 mb-1">{c.name}</p>
                      <p className="text-sm font-bold text-purple-400">{formatCurrency(c.amount)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Final summary */}
            <div className="bg-dark-raised border border-green/20 rounded-xl p-4">
              <h4 className="text-xs font-bold text-green-pale uppercase tracking-widest mb-3">الملخص النهائي</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'إجمالي تكلفة الهالك',  value: formatCurrency(selected.totalWasteCost),     color: 'text-red-400' },
                  { label: 'التكاليف الإضافية',    value: formatCurrency(selected.totalExtraCosts),   color: 'text-purple-400' },
                  { label: 'التكلفة الإجمالية',    value: formatCurrency(selected.grandTotalCost),    color: 'text-amber-400 text-base font-black' },
                  { label: 'تكلفة المتر',           value: formatCurrency(selected.costPerMeter),      color: 'text-green-pale font-bold' },
                  { label: 'تكلفة الكيلو',          value: formatCurrency(selected.costPerKg),         color: 'text-green-pale' },
                  { label: 'سعر البيع/متر',        value: formatCurrency(selected.sellingPricePerMeter), color: 'text-emerald-400' },
                  { label: 'إجمالي المبيعات',       value: formatCurrency(selected.sellingTotal),      color: 'text-emerald-400' },
                  { label: 'صافي الربح',            value: formatCurrency(selected.expectedProfitValue), color: selected.expectedProfitValue >= 0 ? 'text-emerald-400' : 'text-red-400' },
                  { label: 'هامش الربح',            value: `${selected.profitPercentage.toFixed(1)}%`, color: selected.profitPercentage >= 0 ? 'text-emerald-400' : 'text-red-400' },
                ].map(r => (
                  <div key={r.label} className="bg-dark-card border border-dark-border rounded-lg p-2.5">
                    <p className="text-xs text-gray-500 mb-1">{r.label}</p>
                    <p className={`text-sm font-bold ${r.color}`}>{r.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" icon={<Pencil size={14}/>}
                onClick={() => { setDetailOpen(false); openEdit(selected); }}>تعديل</Button>
              <Button variant="outline" icon={<Printer size={14}/>}
                onClick={() => handlePrint(selected)}>طباعة</Button>
              <Button variant="danger" icon={<Trash2 size={14}/>}
                onClick={() => { setDetailOpen(false); setDeleteId(selected.id); }}>حذف</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Print template */}
      {printTarget && (
        <div className="hidden print:block fixed inset-0 bg-white p-8 z-[200]" dir="rtl">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-300">
              <div className="flex items-center gap-4">
                <img src="/logo.png" alt="" className="w-14 h-14 object-contain" />
                <div>
                  <h1 className="text-2xl font-black text-gray-800 tracking-wide">Eleraky Textile</h1>
                  <p className="text-xs text-gray-500 tracking-widest">FABRIC COSTING REPORT</p>
                </div>
              </div>
              <div className="text-left">
                <p className="font-bold text-lg text-gray-800">تقرير تكلفة القماش</p>
                <p className="text-sm text-gray-500">رقم: {printTarget.costingNumber}</p>
                <p className="text-xs text-gray-500">{formatDate(printTarget.date)}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
              <div><span className="text-gray-500">التصميم:</span> <span className="font-medium">{printTarget.designName}</span></div>
              <div><span className="text-gray-500">الصنف:</span> <span className="font-medium">{printTarget.fabricType}</span></div>
              <div><span className="text-gray-500">العميل:</span> <span className="font-medium">{printTarget.customerName || '—'}</span></div>
              <div><span className="text-gray-500">الكمية:</span> <span className="font-medium">{printTarget.quantityMeters.toLocaleString()} متر</span></div>
              <div><span className="text-gray-500">الوزن:</span> <span className="font-medium">{printTarget.totalWeightKg.toLocaleString()} كيلو</span></div>
              <div><span className="text-gray-500">الموظف:</span> <span className="font-medium">{printTarget.responsibleEmployeeName || '—'}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-8 text-sm border-t pt-4">
              <div>
                <p className="font-bold text-gray-700 mb-2">تكاليف اللحمات: <span className="text-green-700">{formatCurrency(printTarget.totalWeftCost)}</span></p>
                <p className="font-bold text-gray-700 mb-2">تكاليف السدا: <span className="text-green-700">{formatCurrency(printTarget.totalWarpCost)}</span></p>
                <p className="font-bold text-gray-700 mb-2">تكاليف الهالك: <span className="text-red-600">{formatCurrency(printTarget.totalWasteCost)}</span></p>
                <p className="font-bold text-gray-700 mb-2">تكاليف إضافية: <span className="text-purple-700">{formatCurrency(printTarget.totalExtraCosts)}</span></p>
              </div>
              <div>
                <p className="font-black text-lg text-gray-800 mb-3">التكلفة الإجمالية: <span className="text-amber-700">{formatCurrency(printTarget.grandTotalCost)}</span></p>
                <p className="font-bold text-gray-700 mb-2">تكلفة المتر: <span className="text-green-700">{formatCurrency(printTarget.costPerMeter)}</span></p>
                <p className="font-bold text-gray-700 mb-2">سعر البيع/متر: <span className="text-green-700">{formatCurrency(printTarget.sellingPricePerMeter)}</span></p>
                <p className="font-bold text-gray-700 mb-2">هامش الربح: <span className={printTarget.profitPercentage >= 0 ? 'text-green-700' : 'text-red-700'}>{printTarget.profitPercentage.toFixed(1)}%</span></p>
              </div>
            </div>
            <p className="text-center text-xs text-gray-400 mt-8 pt-4 border-t">Eleraky Textile — Threads That Inspire, Fabrics That Last</p>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={async () => { try { await deleteFabricCosting(deleteId!); setDeleteId(null); toast('تم حذف السجل'); } catch { toast('حدث خطأ أثناء الحذف.', 'error'); } }}
        title="حذف سجل التكاليف"
        message="هل تريد حذف هذا السجل؟ لا يمكن التراجع."
      />
    </div>
  );
};
