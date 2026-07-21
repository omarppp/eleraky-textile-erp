import React from 'react';
import type { Invoice, WorkOrder, Design } from '../types';
import { formatDate, formatCurrency } from '../lib/utils';

const dash = (v: string | number | null | undefined): string =>
  v === null || v === undefined || v === '' ? '—' : String(v);

interface InvoicePrintTemplateProps {
  invoice:        Invoice;
  workOrder?:     WorkOrder | null;
  design?:        Design | null;
  printedByName?: string;
}

/**
 * Reusable, print-only invoice layout — A4, white background, dark text.
 * Used both as an on-screen preview and as the printed page itself.
 */
export const InvoicePrintTemplate: React.FC<InvoicePrintTemplateProps> = ({
  invoice, workOrder, design, printedByName,
}) => {
  const remaining = invoice.remaining ?? Math.max(0, invoice.total - (invoice.paid ?? 0));

  return (
    <div
      className="print-page mx-auto bg-white text-[#111]"
      dir="rtl"
      style={{ width: '210mm', minHeight: '297mm', padding: '16mm', fontFamily: 'Cairo, sans-serif' }}
    >
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-start justify-between border-b-2 pb-4 mb-6" style={{ borderColor: '#C9963F' }}>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Eleraky Textile" className="w-14 h-14 object-contain" />
          <div>
            <h1 className="text-2xl font-black tracking-wide" style={{ color: '#1B5E2A' }}>Eleraky Textile</h1>
            <p className="text-[11px] text-gray-500 tracking-[2px]">FACTORY MANAGEMENT</p>
          </div>
        </div>
        <div className="text-left">
          <h2 className="text-xl font-bold">فاتورة</h2>
          <p className="text-sm font-semibold mt-1" style={{ color: '#C9963F' }}>{dash(invoice.invoiceNumber)}</p>
          <p className="text-xs text-gray-500 mt-1">{formatDate(invoice.date)}</p>
        </div>
      </div>

      {/* ── Customer ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-[11px] text-gray-500 mb-1">العميل</p>
          <p className="text-sm font-bold">{dash(invoice.customerName)}</p>
          <p className="text-xs text-gray-600 mt-0.5">هاتف: {dash(invoice.phone)}</p>
          <p className="text-xs text-gray-600 mt-0.5">العنوان: {dash(invoice.address)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-[11px] text-gray-500 mb-1">تاريخ الفاتورة</p>
          <p className="text-sm font-bold">{formatDate(invoice.date)}</p>
          {invoice.workOrderNumber && (
            <>
              <p className="text-[11px] text-gray-500 mt-2 mb-1">رقم أمر الشغل</p>
              <p className="text-sm font-bold">{dash(invoice.workOrderNumber)}</p>
            </>
          )}
        </div>
      </div>

      {/* ── Work order details ──────────────────────────────── */}
      {invoice.workOrderId && (
        <div className="border rounded-lg mb-6 overflow-hidden" style={{ borderColor: '#eee' }}>
          <div className="px-4 py-2 text-xs font-bold tracking-wide" style={{ background: '#f0f7f0', color: '#1B5E2A' }}>
            بيانات أمر الشغل
          </div>
          <div className="grid grid-cols-3 gap-3 p-4">
            {[
              { label: 'رقم أمر الشغل',    value: dash(workOrder?.orderNumber ?? invoice.workOrderNumber) },
              { label: 'التصميم',          value: dash(design?.designNumber ?? invoice.designName) },
              { label: 'الصنف',            value: dash(workOrder?.item ?? invoice.item) },
              { label: 'الكمية',           value: dash(workOrder?.quantity ?? invoice.quantity) },
              { label: 'رقم الماكينة',      value: workOrder ? `ماكينة ${dash(workOrder.machineNumber)}` : '—' },
              { label: 'الموظف المسؤول',   value: dash(workOrder?.responsibleEmployeeName) },
              { label: 'تاريخ التسليم',    value: workOrder?.expectedDelivery ? formatDate(workOrder.expectedDelivery) : '—' },
            ].map(r => (
              <div key={r.label}>
                <p className="text-[11px] text-gray-500 mb-0.5">{r.label}</p>
                <p className="text-sm font-semibold">{r.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Items ────────────────────────────────────────────── */}
      <table className="w-full border-collapse mb-6">
        <thead>
          <tr style={{ background: '#C9963F', color: '#fff' }}>
            <th className="px-3 py-2.5 text-right text-xs font-semibold">البيان</th>
            <th className="px-3 py-2.5 text-center text-xs font-semibold">الكمية</th>
            <th className="px-3 py-2.5 text-center text-xs font-semibold">سعر الوحدة</th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((it, i) => (
            <tr key={it.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9f9f9' }}>
              <td className="px-3 py-2.5 text-sm border-b" style={{ borderColor: '#eee' }}>{dash(it.item)}</td>
              <td className="px-3 py-2.5 text-sm text-center border-b" style={{ borderColor: '#eee' }}>{dash(it.quantity)}</td>
              <td className="px-3 py-2.5 text-sm text-center border-b" style={{ borderColor: '#eee' }}>{formatCurrency(it.price)}</td>
              <td className="px-3 py-2.5 text-sm text-left font-semibold border-b" style={{ borderColor: '#eee' }}>{formatCurrency(it.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Totals ───────────────────────────────────────────── */}
      <div className="flex justify-end gap-3 mb-6">
        <div className="rounded-lg px-5 py-3 text-center" style={{ background: '#f0f7f0' }}>
          <p className="text-[11px] text-gray-500 mb-1">المدفوع</p>
          <p className="text-base font-extrabold" style={{ color: '#1B5E2A' }}>{formatCurrency(invoice.paid ?? 0)}</p>
        </div>
        <div className="rounded-lg px-5 py-3 text-center" style={{ background: '#fdf2f2' }}>
          <p className="text-[11px] text-gray-500 mb-1">المتبقي</p>
          <p className="text-base font-extrabold" style={{ color: '#b91c1c' }}>{formatCurrency(remaining)}</p>
        </div>
        <div className="rounded-lg px-6 py-3 text-center text-white" style={{ background: '#C9963F' }}>
          <p className="text-[11px] mb-1 opacity-90">الإجمالي</p>
          <p className="text-xl font-black">{formatCurrency(invoice.total)}</p>
        </div>
      </div>

      {/* ── Notes ────────────────────────────────────────────── */}
      {invoice.notes && (
        <div className="border-t pt-3 mb-8" style={{ borderColor: '#eee' }}>
          <p className="text-[11px] text-gray-500 mb-1">ملاحظات</p>
          <p className="text-sm">{invoice.notes}</p>
        </div>
      )}

      {/* ── Footer ───────────────────────────────────────────── */}
      <div className="mt-10 pt-4 border-t" style={{ borderColor: '#eee' }}>
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-xs text-gray-500 mb-6">توقيع المستلم</p>
            <div className="border-t w-40" style={{ borderColor: '#999' }} />
          </div>
          <div className="text-left">
            <p className="text-xs text-gray-500 mb-6">إعداد: {dash(printedByName)}</p>
            <div className="border-t w-40 mr-0 ml-auto" style={{ borderColor: '#999' }} />
          </div>
        </div>
        <div className="text-center text-gray-400 text-[11px] space-y-1">
          <p>شكراً لتعاملكم مع Eleraky Textile</p>
          <p>تاريخ الطباعة: {formatDate(new Date().toISOString())}</p>
          <p className="text-gray-300">Eleraky Textile — Threads That Inspire, Fabrics That Last</p>
        </div>
      </div>
    </div>
  );
};
