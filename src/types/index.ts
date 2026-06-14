// ===================== CORE TYPES =====================
export type Timestamp = Date | string;

// ===================== USER ROLES =====================
export type UserRole = 'full_admin' | 'operations_user' | 'finance_user';

export interface SystemUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}

// ===================== DESIGN =====================
export interface DesignWeft {
  name: string;
  notes?: string;
}

export interface Design {
  id: string;
  designNumber: string;
  wefts: DesignWeft[];
  weft?: string;        // legacy field — kept for backward compat with old Firestore docs
  warp: string;
  hadafatCount: number;
  assignedMachine: number;
  imageUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ===================== WORK ORDER =====================
export type WorkOrderStatus =
  | 'new' | 'in_production' | 'waiting'
  | 'completed' | 'delivered' | 'delayed' | 'cancelled';

export interface WorkOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerId?: string;
  designId: string;
  designNumber?: string;
  item: string;
  quantity: number;
  producedQuantity: number;
  expectedDelivery: string;
  machineNumber: number;
  status: WorkOrderStatus;
  responsibleEmployeeId?: string;
  responsibleEmployeeName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ===================== INVENTORY =====================
export type WarehouseType = 'weft' | 'warp' | 'finished' | 'reusable' | 'poy';
export type MovementType = 'add' | 'withdraw' | 'adjust' | 'transfer' | 'auto_deduction';

export interface InventoryItem {
  id: string;
  name: string;
  type: string;
  quantity: number;
  unit: string;
  warehouse: WarehouseType;
  minStock: number;
  costPerUnit?: number;
  totalValue?: number;
  supplierId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryMovement {
  id: string;
  itemId: string;
  itemName: string;
  warehouse: WarehouseType;
  movementType: MovementType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  referenceId?: string;
  notes?: string;
  date: string;
  createdAt: string;
}

// ===================== CUSTOMER =====================
export interface Customer {
  id: string;
  name: string;
  phone: string;
  phone2?: string;
  address: string;
  companyName?: string;
  email?: string;
  notes?: string;
  openingBalance?: number;
  createdAt: string;
  updatedAt: string;
}

// ===================== SUPPLIER =====================
export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address?: string;
  companyName?: string;
  country?: string;
  email?: string;
  notes?: string;
  openingBalance?: number;
  createdAt: string;
  updatedAt: string;
}

// ===================== PURCHASE =====================
export interface Purchase {
  id: string;
  purchaseNumber: string;
  supplierId?: string;
  supplierName: string;
  materialName: string;
  materialType: string;
  warehouse: WarehouseType;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  extraExpenses?: number;
  finalCost: number;
  costPerUnit: number;
  invoiceNumber?: string;
  purchaseDate: string;
  notes?: string;
  importId?: string;
  createdAt: string;
  updatedAt: string;
}

// ===================== IMPORT =====================
export type ImportStatus = 'planned' | 'ordered' | 'shipped' | 'in_customs' | 'cleared' | 'received' | 'cancelled';

export interface ImportShipment {
  id: string;
  shipmentNumber: string;
  supplierName: string;
  supplierId?: string;
  country: string;
  materialType: string;
  quantity: number;
  weightKg: number;
  purchasePrice: number;
  currency: string;
  exchangeRate: number;
  purchasePriceEGP: number;
  shippingCost: number;
  customsCost: number;
  clearanceCost: number;
  transportCost: number;
  storageCost: number;
  otherExpenses: number;
  totalImportCost: number;
  landedCostPerKg: number;
  arrivalDate?: string;
  expectedArrivalDate?: string;
  status: ImportStatus;
  notes?: string;
  addedToPOY?: boolean;
  wastePercentage?: number;
  wasteWeightKg?: number;
  usableWeightKg?: number;
  pricePerKgBeforeWaste?: number;
  pricePerUsableKg?: number;
  createdAt: string;
  updatedAt: string;
}

// ===================== INVOICE =====================
export interface InvoiceItem {
  id: string;
  item: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName: string;
  phone: string;
  address: string;
  items: InvoiceItem[];
  subtotal: number;
  discount?: number;
  total: number;
  paid?: number;
  remaining?: number;
  notes?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

// ===================== FINANCE =====================
export type JournalEntryType = 'income' | 'expense' | 'transfer' | 'manual';
export type PaymentMethod = 'cash' | 'bank' | 'instapay' | 'vodafone' | 'orange' | 'etisalat' | 'we_pay' | 'cheque' | 'other';
export type AccountType = 'cash' | 'bank' | 'wallet' | 'customer' | 'supplier' | 'expense' | 'income' | 'other';

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  type: JournalEntryType;
  description: string;
  account: string;
  debit: number;
  credit: number;
  balance?: number;
  paymentMethod: PaymentMethod;
  referenceId?: string;
  referenceType?: string;
  notes?: string;
  createdAt: string;
}

export type VoucherType = 'receipt' | 'payment';

export interface CashVoucher {
  id: string;
  voucherNumber: string;
  type: VoucherType;
  date: string;
  amount: number;
  party: string;
  partyType: 'customer' | 'supplier' | 'employee' | 'other';
  reason: string;
  paymentMethod: PaymentMethod;
  receivedBy?: string;
  approvedBy?: string;
  notes?: string;
  createdAt: string;
}

export type ChequeStatus = 'pending' | 'collected' | 'rejected' | 'deposited';

export interface Cheque {
  id: string;
  chequeNumber: string;
  bankName: string;
  customerId?: string;
  customerName: string;
  amount: number;
  issueDate?: string;
  dueDate: string;
  status: ChequeStatus;
  collectionDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ElectronicTransaction {
  id: string;
  transactionNumber: string;
  type: 'incoming' | 'outgoing' | 'transfer';
  method: PaymentMethod;
  sourceAccount: string;
  destinationAccount: string;
  amount: number;
  fees: number;
  netAmount: number;
  referenceNumber?: string;
  date: string;
  party: string;
  description: string;
  attachmentUrl?: string;
  notes?: string;
  createdAt: string;
}

// ===================== MACHINE =====================
export type MachineStatus = 'active' | 'idle' | 'maintenance' | 'stopped';

export interface Machine {
  id: string;
  number: number;
  status: MachineStatus;
  currentWorkOrderId?: string;
  currentDesignId?: string;
  notes?: string;
}

// ===================== ACTIVITY =====================
export interface ActivityItem {
  id: string;
  type: 'work_order' | 'inventory' | 'invoice' | 'design' | 'purchase' | 'import' | 'finance' | 'customer' | 'employee' | 'costing';
  action: string;
  description: string;
  timestamp: string;
}

// ===================== EMPLOYEE =====================
export type EmployeeDepartment = 'sales' | 'operations' | 'production' | 'finance' | 'inventory' | 'management';
export type EmployeeStatus = 'active' | 'inactive';

export interface Employee {
  id: string;
  name: string;
  phone: string;
  email?: string;
  jobTitle: string;
  department: EmployeeDepartment;
  startDate: string;
  status: EmployeeStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ===================== FABRIC COSTING =====================
export interface WeftLine {
  id: string;
  materialName: string;
  color: string;
  pricePerKg: number;
  consumedWeight: number;
  wastePercentage: number;
  wasteWeight: number;
  finalConsumedWeight: number;
  totalCost: number;
  notes?: string;
}

export interface WarpLine {
  id: string;
  materialName: string;
  pricePerKg: number;
  consumedWeight: number;
  wastePercentage: number;
  wasteWeight: number;
  finalConsumedWeight: number;
  totalCost: number;
  notes?: string;
}

export interface ExtraCostLine {
  id: string;
  name: string;
  amount: number;
  notes?: string;
}

export interface FabricCosting {
  id: string;
  costingNumber: string;
  designRef?: string;
  designName: string;
  customerName?: string;
  workOrderRef?: string;
  fabricType: string;
  quantityMeters: number;
  totalWeightKg: number;
  date: string;
  weftLines: WeftLine[];
  totalWeftCost: number;
  warpLines: WarpLine[];
  totalWarpCost: number;
  generalWastePercentage: number;
  generalWasteNotes?: string;
  applyGeneralWasteToMaterial: boolean;
  applyGeneralWasteToQuantity: boolean;
  generalWasteCost: number;
  extraCosts: ExtraCostLine[];
  totalExtraCosts: number;
  totalMaterialCost: number;
  totalWasteWeight: number;
  totalWasteCost: number;
  grandTotalCost: number;
  costPerMeter: number;
  costPerKg: number;
  sellingPricePerMeter: number;
  profitPercentage: number;
  expectedProfitValue: number;
  sellingTotal: number;
  responsibleEmployeeId?: string;
  responsibleEmployeeName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ===================== REPORT FILTER =====================
export interface ReportFilter {
  startDate?: string;
  endDate?: string;
  warehouse?: WarehouseType | 'all';
  status?: WorkOrderStatus | 'all';
  machineNumber?: number | 'all';
  customerName?: string;
}

// ===================== PERMISSIONS =====================
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'print' | 'export';

export type PermissionModule =
  | 'dashboard' | 'designs' | 'workOrders' | 'customers' | 'employees'
  | 'inventory' | 'purchases' | 'fabricCosting' | 'import' | 'finance'
  | 'invoices' | 'reports' | 'machines' | 'settings' | 'accessManagement'
  | 'activityLogs' | 'dataSetup';

export type ModulePermission  = Partial<Record<PermissionAction, boolean>>;
export type ModulePermissions = Partial<Record<PermissionModule, ModulePermission>>;

export type UserStatus = 'active' | 'inactive' | 'blocked';

export interface UserProfile {
  uid:               string;
  email:             string;
  displayName:       string;
  role:              UserRole;
  status:            UserStatus;
  linkedEmployeeId?: string;
  createdAt:         string;
  createdBy?:        string;
  updatedAt?:        string;
  updatedBy?:        string;
  lastLoginAt?:      string;
  notes?:            string;
}

// ===================== SYSTEM SETTINGS =====================
export interface SystemSettings {
  companyName:      string;
  companyPhone?:    string;
  companyAddress?:  string;
  currency:         string;
  currencySymbol:   string;
  defaultTaxRate:   number;
  invoiceNotes?:    string;
  lowStockAlert:    number;
  chequeAlertDays:  number;
  dateFormat:       string;
  updatedAt?:       string;
  updatedBy?:       string;
}
