import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, runTransaction,
} from 'firebase/firestore';
import type {
  Design, WorkOrder, InventoryItem, InventoryMovement, Invoice,
  ActivityItem, Customer, Supplier, Purchase, ImportShipment,
  JournalEntry, CashVoucher, Cheque, ElectronicTransaction,
  Employee, FabricCosting,
} from '../types';
import { db } from '../firebase';

// ---- Firestore helpers ----
function normalizeTs(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== null && typeof v === 'object' && 'toDate' in v &&
        typeof (v as { toDate?: unknown }).toDate === 'function') {
      out[k] = (v as { toDate(): Date }).toDate().toISOString();
    } else {
      out[k] = v;
    }
  }
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromSnap<T>(snap: { id: string; data(): any }): T {
  return { id: snap.id, ...normalizeTs(snap.data() as Record<string, unknown>) } as unknown as T;
}

async function nextNum(prefix: string): Promise<string> {
  const ref = doc(db, 'counters', prefix.toLowerCase());
  let n = 1;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    n = snap.exists() ? (snap.data().count as number) + 1 : 1;
    tx.set(ref, { count: n });
  });
  return `${prefix}-${String(n).padStart(3, '0')}`;
}

function logActivity(a: Omit<ActivityItem, 'id' | 'timestamp'>) {
  addDoc(collection(db, 'activity'), {
    ...a,
    timestamp: new Date().toISOString(),
  }).catch(() => {});
}

// ---- Context Type ----
interface DataContextType {
  designs:            Design[];
  workOrders:         WorkOrder[];
  inventoryItems:     InventoryItem[];
  inventoryMovements: InventoryMovement[];
  invoices:           Invoice[];
  activity:           ActivityItem[];
  customers:          Customer[];
  suppliers:          Supplier[];
  purchases:          Purchase[];
  imports:            ImportShipment[];
  journal:            JournalEntry[];
  vouchers:           CashVoucher[];
  cheques:            Cheque[];
  electronic:         ElectronicTransaction[];
  employees:          Employee[];
  fabricCostings:     FabricCosting[];
  loading:            boolean;

  addDesign:    (d: Omit<Design, 'id'|'createdAt'|'updatedAt'>) => Promise<void>;
  updateDesign: (id: string, d: Partial<Design>) => Promise<void>;
  deleteDesign: (id: string) => Promise<void>;

  addWorkOrder:    (w: Omit<WorkOrder, 'id'|'createdAt'|'updatedAt'|'orderNumber'>) => Promise<void>;
  updateWorkOrder: (id: string, w: Partial<WorkOrder>) => Promise<void>;
  deleteWorkOrder: (id: string) => Promise<void>;

  addInventoryItem:    (i: Omit<InventoryItem,'id'|'createdAt'|'updatedAt'>) => Promise<void>;
  updateInventoryItem: (id: string, i: Partial<InventoryItem>) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
  addMovement: (m: Omit<InventoryMovement,'id'|'createdAt'>) => Promise<void>;

  addInvoice:    (i: Omit<Invoice,'id'|'createdAt'|'updatedAt'|'invoiceNumber'>) => Promise<void>;
  updateInvoice: (id: string, i: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;

  addCustomer:    (c: Omit<Customer,'id'|'createdAt'|'updatedAt'>) => Promise<void>;
  updateCustomer: (id: string, c: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;

  addSupplier:    (s: Omit<Supplier,'id'|'createdAt'|'updatedAt'>) => Promise<void>;
  updateSupplier: (id: string, s: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;

  addPurchase:    (p: Omit<Purchase,'id'|'createdAt'|'updatedAt'|'purchaseNumber'>) => Promise<void>;
  updatePurchase: (id: string, p: Partial<Purchase>) => Promise<void>;
  deletePurchase: (id: string) => Promise<void>;

  addImport:    (i: Omit<ImportShipment,'id'|'createdAt'|'updatedAt'|'shipmentNumber'>) => Promise<void>;
  updateImport: (id: string, i: Partial<ImportShipment>) => Promise<void>;
  deleteImport: (id: string) => Promise<void>;

  addJournalEntry:  (e: Omit<JournalEntry,'id'|'createdAt'|'entryNumber'>) => Promise<void>;
  addVoucher:       (v: Omit<CashVoucher,'id'|'createdAt'|'voucherNumber'>) => Promise<void>;
  updateVoucher:    (id: string, v: Partial<CashVoucher>) => Promise<void>;
  deleteVoucher:    (id: string) => Promise<void>;
  addCheque:        (c: Omit<Cheque,'id'|'createdAt'|'updatedAt'>) => Promise<void>;
  updateCheque:     (id: string, c: Partial<Cheque>) => Promise<void>;
  deleteCheque:     (id: string) => Promise<void>;
  addElectronic:    (e: Omit<ElectronicTransaction,'id'|'createdAt'|'transactionNumber'>) => Promise<void>;
  updateElectronic: (id: string, e: Partial<ElectronicTransaction>) => Promise<void>;
  deleteElectronic: (id: string) => Promise<void>;

  addEmployee:    (e: Omit<Employee,'id'|'createdAt'|'updatedAt'>) => Promise<void>;
  updateEmployee: (id: string, e: Partial<Employee>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;

  addFabricCosting:    (c: Omit<FabricCosting,'id'|'createdAt'|'updatedAt'|'costingNumber'>) => Promise<void>;
  updateFabricCosting: (id: string, c: Partial<FabricCosting>) => Promise<void>;
  deleteFabricCosting: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

const TOTAL_COLS = 16;

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [designs,            setDesigns]           = useState<Design[]>([]);
  const [workOrders,         setWorkOrders]         = useState<WorkOrder[]>([]);
  const [inventoryItems,     setInventoryItems]     = useState<InventoryItem[]>([]);
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>([]);
  const [invoices,           setInvoices]           = useState<Invoice[]>([]);
  const [activity,           setActivity]           = useState<ActivityItem[]>([]);
  const [customers,          setCustomers]          = useState<Customer[]>([]);
  const [suppliers,          setSuppliers]          = useState<Supplier[]>([]);
  const [purchases,          setPurchases]          = useState<Purchase[]>([]);
  const [imports,            setImports]            = useState<ImportShipment[]>([]);
  const [journal,            setJournal]            = useState<JournalEntry[]>([]);
  const [vouchers,           setVouchers]           = useState<CashVoucher[]>([]);
  const [cheques,            setCheques]            = useState<Cheque[]>([]);
  const [electronic,         setElectronic]         = useState<ElectronicTransaction[]>([]);
  const [employees,          setEmployees]          = useState<Employee[]>([]);
  const [fabricCostings,     setFabricCostings]     = useState<FabricCosting[]>([]);
  const [loading,            setLoading]            = useState(true);

  const readyCols = useRef(new Set<string>());

  const markReady = (name: string) => {
    if (!readyCols.current.has(name)) {
      readyCols.current.add(name);
      if (readyCols.current.size >= TOTAL_COLS) setLoading(false);
    }
  };

  useEffect(() => {
    readyCols.current = new Set<string>();
    const col = (name: string) => collection(db, name);

    const unsubs = [
      onSnapshot(col('designs'),            s => { setDesigns(s.docs.map(d => fromSnap<Design>(d)));                       markReady('designs'); }),
      onSnapshot(col('workOrders'),         s => { setWorkOrders(s.docs.map(d => fromSnap<WorkOrder>(d)));                 markReady('workOrders'); }),
      onSnapshot(col('inventoryItems'),     s => { setInventoryItems(s.docs.map(d => fromSnap<InventoryItem>(d)));         markReady('inventoryItems'); }),
      onSnapshot(col('inventoryMovements'), s => { setInventoryMovements(s.docs.map(d => fromSnap<InventoryMovement>(d))); markReady('inventoryMovements'); }),
      onSnapshot(col('invoices'),           s => { setInvoices(s.docs.map(d => fromSnap<Invoice>(d)));                     markReady('invoices'); }),
      onSnapshot(col('activity'),           s => { setActivity(s.docs.map(d => fromSnap<ActivityItem>(d)));                markReady('activity'); }),
      onSnapshot(col('customers'),          s => { setCustomers(s.docs.map(d => fromSnap<Customer>(d)));                   markReady('customers'); }),
      onSnapshot(col('suppliers'),          s => { setSuppliers(s.docs.map(d => fromSnap<Supplier>(d)));                   markReady('suppliers'); }),
      onSnapshot(col('purchases'),          s => { setPurchases(s.docs.map(d => fromSnap<Purchase>(d)));                   markReady('purchases'); }),
      onSnapshot(col('imports'),            s => { setImports(s.docs.map(d => fromSnap<ImportShipment>(d)));               markReady('imports'); }),
      onSnapshot(col('journal'),            s => { setJournal(s.docs.map(d => fromSnap<JournalEntry>(d)));                 markReady('journal'); }),
      onSnapshot(col('vouchers'),           s => { setVouchers(s.docs.map(d => fromSnap<CashVoucher>(d)));                 markReady('vouchers'); }),
      onSnapshot(col('cheques'),            s => { setCheques(s.docs.map(d => fromSnap<Cheque>(d)));                       markReady('cheques'); }),
      onSnapshot(col('electronic'),         s => { setElectronic(s.docs.map(d => fromSnap<ElectronicTransaction>(d)));     markReady('electronic'); }),
      onSnapshot(col('employees'),          s => { setEmployees(s.docs.map(d => fromSnap<Employee>(d)));                   markReady('employees'); }),
      onSnapshot(col('fabricCostings'),     s => { setFabricCostings(s.docs.map(d => fromSnap<FabricCosting>(d)));         markReady('fabricCostings'); }),
    ];

    return () => unsubs.forEach(u => u());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- DESIGNS ----
  const addDesign = useCallback(async (d: Omit<Design,'id'|'createdAt'|'updatedAt'>) => {
    const now = new Date().toISOString();
    await addDoc(collection(db, 'designs'), { ...d, createdAt: now, updatedAt: now });
    logActivity({ type: 'design', action: 'إضافة', description: `تصميم جديد ${d.designNumber}` });
  }, []);
  const updateDesign = useCallback(async (id: string, d: Partial<Design>) => {
    await updateDoc(doc(db, 'designs', id), { ...d, updatedAt: new Date().toISOString() } as Record<string, unknown>);
  }, []);
  const deleteDesign = useCallback(async (id: string) => {
    await deleteDoc(doc(db, 'designs', id));
  }, []);

  // ---- WORK ORDERS ----
  const addWorkOrder = useCallback(async (w: Omit<WorkOrder,'id'|'createdAt'|'updatedAt'|'orderNumber'>) => {
    const now = new Date().toISOString();
    const orderNumber = await nextNum('WO');
    await addDoc(collection(db, 'workOrders'), { ...w, orderNumber, createdAt: now, updatedAt: now });
    logActivity({ type: 'work_order', action: 'إضافة', description: `أمر شغل ${orderNumber} للعميل ${w.customerName}` });
  }, []);
  const updateWorkOrder = useCallback(async (id: string, w: Partial<WorkOrder>) => {
    await updateDoc(doc(db, 'workOrders', id), { ...w, updatedAt: new Date().toISOString() } as Record<string, unknown>);
  }, []);
  const deleteWorkOrder = useCallback(async (id: string) => {
    await deleteDoc(doc(db, 'workOrders', id));
  }, []);

  // ---- INVENTORY ----
  const addMovement = useCallback(async (m: Omit<InventoryMovement,'id'|'createdAt'>) => {
    await addDoc(collection(db, 'inventoryMovements'), { ...m, createdAt: new Date().toISOString() });
    logActivity({
      type: 'inventory',
      action: m.movementType === 'add' ? 'إضافة' : 'سحب',
      description: `${m.movementType === 'add' ? 'إضافة' : 'سحب'} ${m.quantity} من ${m.itemName}`,
    });
  }, []);
  const addInventoryItem = useCallback(async (i: Omit<InventoryItem,'id'|'createdAt'|'updatedAt'>) => {
    const now = new Date().toISOString();
    const ref = await addDoc(collection(db, 'inventoryItems'), { ...i, createdAt: now, updatedAt: now });
    if (i.quantity > 0) {
      await addDoc(collection(db, 'inventoryMovements'), {
        itemId: ref.id, itemName: i.name, warehouse: i.warehouse,
        movementType: 'add', quantity: i.quantity,
        previousQuantity: 0, newQuantity: i.quantity, date: now, createdAt: now,
      });
    }
  }, []);
  const updateInventoryItem = useCallback(async (id: string, i: Partial<InventoryItem>) => {
    await updateDoc(doc(db, 'inventoryItems', id), { ...i, updatedAt: new Date().toISOString() } as Record<string, unknown>);
  }, []);
  const deleteInventoryItem = useCallback(async (id: string) => {
    await deleteDoc(doc(db, 'inventoryItems', id));
  }, []);

  // ---- INVOICES ----
  const addInvoice = useCallback(async (i: Omit<Invoice,'id'|'createdAt'|'updatedAt'|'invoiceNumber'>) => {
    const now = new Date().toISOString();
    const invoiceNumber = await nextNum('INV');
    await addDoc(collection(db, 'invoices'), { ...i, invoiceNumber, createdAt: now, updatedAt: now });
    logActivity({ type: 'invoice', action: 'إنشاء', description: `فاتورة ${invoiceNumber} للعميل ${i.customerName} — ${i.total} جنيه` });
  }, []);
  const updateInvoice = useCallback(async (id: string, i: Partial<Invoice>) => {
    await updateDoc(doc(db, 'invoices', id), { ...i, updatedAt: new Date().toISOString() } as Record<string, unknown>);
  }, []);
  const deleteInvoice = useCallback(async (id: string) => {
    await deleteDoc(doc(db, 'invoices', id));
  }, []);

  // ---- CUSTOMERS ----
  const addCustomer = useCallback(async (c: Omit<Customer,'id'|'createdAt'|'updatedAt'>) => {
    const now = new Date().toISOString();
    await addDoc(collection(db, 'customers'), { ...c, createdAt: now, updatedAt: now });
    logActivity({ type: 'customer', action: 'إضافة', description: `عميل جديد: ${c.name}` });
  }, []);
  const updateCustomer = useCallback(async (id: string, c: Partial<Customer>) => {
    await updateDoc(doc(db, 'customers', id), { ...c, updatedAt: new Date().toISOString() } as Record<string, unknown>);
  }, []);
  const deleteCustomer = useCallback(async (id: string) => {
    await deleteDoc(doc(db, 'customers', id));
  }, []);

  // ---- SUPPLIERS ----
  const addSupplier = useCallback(async (s: Omit<Supplier,'id'|'createdAt'|'updatedAt'>) => {
    const now = new Date().toISOString();
    await addDoc(collection(db, 'suppliers'), { ...s, createdAt: now, updatedAt: now });
  }, []);
  const updateSupplier = useCallback(async (id: string, s: Partial<Supplier>) => {
    await updateDoc(doc(db, 'suppliers', id), { ...s, updatedAt: new Date().toISOString() } as Record<string, unknown>);
  }, []);
  const deleteSupplier = useCallback(async (id: string) => {
    await deleteDoc(doc(db, 'suppliers', id));
  }, []);

  // ---- PURCHASES ----
  const addPurchase = useCallback(async (p: Omit<Purchase,'id'|'createdAt'|'updatedAt'|'purchaseNumber'>) => {
    const now = new Date().toISOString();
    const purchaseNumber = await nextNum('PUR');
    await addDoc(collection(db, 'purchases'), { ...p, purchaseNumber, createdAt: now, updatedAt: now });
    logActivity({ type: 'purchase', action: 'شراء', description: `فاتورة شراء ${purchaseNumber} — ${p.materialName} (${p.quantity} ${p.unit})` });
  }, []);
  const updatePurchase = useCallback(async (id: string, p: Partial<Purchase>) => {
    await updateDoc(doc(db, 'purchases', id), { ...p, updatedAt: new Date().toISOString() } as Record<string, unknown>);
  }, []);
  const deletePurchase = useCallback(async (id: string) => {
    await deleteDoc(doc(db, 'purchases', id));
  }, []);

  // ---- IMPORTS ----
  const addImport = useCallback(async (i: Omit<ImportShipment,'id'|'createdAt'|'updatedAt'|'shipmentNumber'>) => {
    const now = new Date().toISOString();
    const shipmentNumber = await nextNum('IMP');
    await addDoc(collection(db, 'imports'), { ...i, shipmentNumber, createdAt: now, updatedAt: now });
    logActivity({ type: 'import', action: 'استيراد', description: `شحنة ${shipmentNumber} من ${i.country} — ${i.weightKg} كيلو` });
  }, []);
  const updateImport = useCallback(async (id: string, i: Partial<ImportShipment>) => {
    await updateDoc(doc(db, 'imports', id), { ...i, updatedAt: new Date().toISOString() } as Record<string, unknown>);
  }, []);
  const deleteImport = useCallback(async (id: string) => {
    await deleteDoc(doc(db, 'imports', id));
  }, []);

  // ---- FINANCE ----
  const addJournalEntry = useCallback(async (e: Omit<JournalEntry,'id'|'createdAt'|'entryNumber'>) => {
    const now = new Date().toISOString();
    const entryNumber = await nextNum('JRN');
    await addDoc(collection(db, 'journal'), { ...e, entryNumber, createdAt: now });
    logActivity({ type: 'finance', action: e.type === 'income' ? 'دخل' : 'مصروف', description: e.description });
  }, []);
  const addVoucher = useCallback(async (v: Omit<CashVoucher,'id'|'createdAt'|'voucherNumber'>) => {
    const now = new Date().toISOString();
    const prefix = v.type === 'receipt' ? 'RCV' : 'PAY';
    const voucherNumber = await nextNum(prefix);
    await addDoc(collection(db, 'vouchers'), { ...v, voucherNumber, createdAt: now });
    logActivity({
      type: 'finance',
      action: v.type === 'receipt' ? 'استلام' : 'صرف',
      description: `${v.type === 'receipt' ? 'إذن استلام' : 'إذن صرف'} — ${v.party} — ${v.amount} جنيه`,
    });
  }, []);
  const updateVoucher = useCallback(async (id: string, v: Partial<CashVoucher>) => {
    await updateDoc(doc(db, 'vouchers', id), v as Record<string, unknown>);
  }, []);
  const deleteVoucher = useCallback(async (id: string) => {
    await deleteDoc(doc(db, 'vouchers', id));
  }, []);

  const addCheque = useCallback(async (c: Omit<Cheque,'id'|'createdAt'|'updatedAt'>) => {
    const now = new Date().toISOString();
    await addDoc(collection(db, 'cheques'), { ...c, createdAt: now, updatedAt: now });
    logActivity({ type: 'finance', action: 'شيك', description: `شيك ${c.chequeNumber} من ${c.customerName} بمبلغ ${c.amount}` });
  }, []);
  const updateCheque = useCallback(async (id: string, c: Partial<Cheque>) => {
    await updateDoc(doc(db, 'cheques', id), { ...c, updatedAt: new Date().toISOString() } as Record<string, unknown>);
  }, []);
  const deleteCheque = useCallback(async (id: string) => {
    await deleteDoc(doc(db, 'cheques', id));
  }, []);

  const addElectronic = useCallback(async (e: Omit<ElectronicTransaction,'id'|'createdAt'|'transactionNumber'>) => {
    const now = new Date().toISOString();
    const transactionNumber = await nextNum('ELT');
    await addDoc(collection(db, 'electronic'), { ...e, transactionNumber, createdAt: now });
    logActivity({ type: 'finance', action: 'إلكتروني', description: `معاملة ${e.method} — ${e.amount} جنيه — ${e.party}` });
  }, []);
  const updateElectronic = useCallback(async (id: string, e: Partial<ElectronicTransaction>) => {
    await updateDoc(doc(db, 'electronic', id), e as Record<string, unknown>);
  }, []);
  const deleteElectronic = useCallback(async (id: string) => {
    await deleteDoc(doc(db, 'electronic', id));
  }, []);

  // ---- EMPLOYEES ----
  const addEmployee = useCallback(async (e: Omit<Employee,'id'|'createdAt'|'updatedAt'>) => {
    const now = new Date().toISOString();
    await addDoc(collection(db, 'employees'), { ...e, createdAt: now, updatedAt: now });
    logActivity({ type: 'employee', action: 'إضافة', description: `موظف جديد: ${e.name} — ${e.jobTitle}` });
  }, []);
  const updateEmployee = useCallback(async (id: string, e: Partial<Employee>) => {
    await updateDoc(doc(db, 'employees', id), { ...e, updatedAt: new Date().toISOString() } as Record<string, unknown>);
  }, []);
  const deleteEmployee = useCallback(async (id: string) => {
    await deleteDoc(doc(db, 'employees', id));
  }, []);

  // ---- FABRIC COSTINGS ----
  const addFabricCosting = useCallback(async (c: Omit<FabricCosting,'id'|'createdAt'|'updatedAt'|'costingNumber'>) => {
    const now = new Date().toISOString();
    const costingNumber = await nextNum('CST');
    await addDoc(collection(db, 'fabricCostings'), { ...c, costingNumber, createdAt: now, updatedAt: now });
    logActivity({ type: 'costing', action: 'إضافة', description: `تكلفة قماش ${costingNumber} — ${c.designName}` });
  }, []);
  const updateFabricCosting = useCallback(async (id: string, c: Partial<FabricCosting>) => {
    await updateDoc(doc(db, 'fabricCostings', id), { ...c, updatedAt: new Date().toISOString() } as Record<string, unknown>);
  }, []);
  const deleteFabricCosting = useCallback(async (id: string) => {
    await deleteDoc(doc(db, 'fabricCostings', id));
  }, []);

  return (
    <DataContext.Provider value={{
      designs, workOrders, inventoryItems, inventoryMovements, invoices, activity,
      customers, suppliers, purchases, imports, journal, vouchers, cheques, electronic,
      employees, fabricCostings, loading,
      addDesign, updateDesign, deleteDesign,
      addWorkOrder, updateWorkOrder, deleteWorkOrder,
      addInventoryItem, updateInventoryItem, deleteInventoryItem, addMovement,
      addInvoice, updateInvoice, deleteInvoice,
      addCustomer, updateCustomer, deleteCustomer,
      addSupplier, updateSupplier, deleteSupplier,
      addPurchase, updatePurchase, deletePurchase,
      addImport, updateImport, deleteImport,
      addJournalEntry, addVoucher, updateVoucher, deleteVoucher,
      addCheque, updateCheque, deleteCheque,
      addElectronic, updateElectronic, deleteElectronic,
      addEmployee, updateEmployee, deleteEmployee,
      addFabricCosting, updateFabricCosting, deleteFabricCosting,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be inside DataProvider');
  return ctx;
};
