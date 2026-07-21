import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowRight } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { canViewFinance } from '../../lib/permissions';
import { AccessDenied } from '../../components/PermissionGate';
import { InvoicePrintTemplate } from '../../components/InvoicePrintTemplate';
import { Spinner, Button, useToast } from '../../components/ui';

export const PrintInvoice: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role, userProfile } = useAuth();
  const { invoices, workOrders, designs, loading } = useData();
  const { toast } = useToast();
  const printedOnce = useRef(false);

  const [printing, setPrinting] = useState(false);

  const canPrint = canViewFinance(role);
  const invoice = invoices.find(i => i.id === id) || null;
  const workOrder = invoice?.workOrderId ? workOrders.find(w => w.id === invoice.workOrderId) || null : null;
  const design = invoice?.designId ? designs.find(d => d.id === invoice.designId) || null : null;

  const triggerPrint = () => {
    setPrinting(true);
    try {
      window.print();
    } catch {
      toast('حدث خطأ أثناء تجهيز الطباعة', 'error');
    } finally {
      setPrinting(false);
    }
  };

  // Auto-open the browser print dialog once the invoice is ready
  useEffect(() => {
    if (printedOnce.current) return;
    if (loading || !canPrint || !invoice) return;
    printedOnce.current = true;
    const t = setTimeout(() => triggerPrint(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, canPrint, invoice]);

  if (!canPrint) return <AccessDenied />;

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <Spinner size={32} />
          <p className="text-gray-400 text-sm">جارٍ تجهيز الطباعة...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6" dir="rtl">
        <div className="text-center space-y-3">
          <p className="text-white font-bold">تعذّر العثور على الفاتورة</p>
          <Button variant="ghost" icon={<ArrowRight size={14} />} onClick={() => navigate('/invoices')}>
            العودة للفواتير
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="print-preview-bg min-h-screen bg-gray-200" dir="rtl">
      {/* Toolbar — hidden on print */}
      <div className="no-print sticky top-0 z-10 bg-dark-card border-b border-dark-border px-4 py-3 flex items-center justify-between">
        <Button variant="ghost" size="sm" icon={<ArrowRight size={14} />} onClick={() => navigate(-1)}>
          رجوع
        </Button>
        <Button size="sm" icon={<Printer size={14} />} loading={printing} onClick={triggerPrint}>
          طباعة الفاتورة
        </Button>
      </div>

      <div className="py-6 print-preview-bg">
        <InvoicePrintTemplate
          invoice={invoice}
          workOrder={workOrder}
          design={design}
          printedByName={userProfile?.displayName}
        />
      </div>
    </div>
  );
};
