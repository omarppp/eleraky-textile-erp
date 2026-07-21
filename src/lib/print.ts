import type { Invoice } from '../types';

/**
 * Opens the standalone, permission-gated invoice print page in a new tab.
 * That page loads the real invoice (and its work order, if any) and
 * triggers the browser print dialog once the layout is ready.
 */
export function handlePrintInvoice(invoice: Invoice, onError?: (message: string) => void): void {
  try {
    const win = window.open(`/invoices/${invoice.id}/print`, '_blank', 'noopener,noreferrer');
    if (!win) throw new Error('popup-blocked');
  } catch {
    onError?.('حدث خطأ أثناء تجهيز الطباعة');
  }
}
