export type Role = "ADMIN" | "MANAGER" | "CHEF" | "WAITER" | "CASHIER";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string | null;
  isActive?: boolean;
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
  _count?: { menuItems: number };
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  cost: number;
  imageUrl?: string | null;
  isAvailable: boolean;
  isVeg: boolean;
  spiceLevel: number;
  categoryId: string;
  category?: Category;
}

export type TableStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "CLEANING";

export interface RestaurantTable {
  id: string;
  number: number;
  capacity: number;
  status: TableStatus;
  location?: string | null;
  orders?: Order[];
}

export type ReservationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "SEATED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW";

export interface Reservation {
  id: string;
  customerId?: string | null;
  customerName: string;
  customerPhone?: string | null;
  partySize: number;
  date: string;
  tableId?: string | null;
  table?: RestaurantTable | null;
  status: ReservationStatus;
  notes?: string | null;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  loyaltyPoints: number;
  notes?: string | null;
  createdAt: string;
  _count?: { orders: number };
}

export type OrderType = "DINE_IN" | "TAKEAWAY" | "DELIVERY";
export type OrderStatus = "OPEN" | "PREPARING" | "READY" | "SERVED" | "COMPLETED" | "CANCELLED";
export type OrderItemStatus = "PENDING" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  menuItem: MenuItem;
  quantity: number;
  price: number;
  notes?: string | null;
  status: OrderItemStatus;
}

export interface Payment {
  id: string;
  orderId: string;
  method: "CASH" | "CARD" | "ONLINE" | "WALLET";
  amount: number;
  tip: number;
  createdAt: string;
}

export interface Order {
  id: string;
  type: OrderType;
  status: OrderStatus;
  tableId?: string | null;
  table?: RestaurantTable | null;
  customerId?: string | null;
  customer?: Customer | null;
  waiterId?: string | null;
  waiter?: { id: string; name: string } | null;
  subtotal: number;
  taxRate: number;
  tax: number;
  discount: number;
  total: number;
  items: OrderItem[];
  payments: Payment[];
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  reorderLevel: number;
  costPerUnit: number;
  supplier?: string | null;
  updatedAt: string;
}

export interface InventoryTransaction {
  id: string;
  inventoryItemId: string;
  type: "PURCHASE" | "USAGE" | "ADJUSTMENT" | "WASTE";
  quantity: number;
  note?: string | null;
  createdAt: string;
}

export interface DashboardSummary {
  ordersToday: number;
  completedToday: number;
  revenueToday: number;
  avgOrderValue: number;
  tableStats: { total: number; available: number; occupied: number; reserved: number };
  lowStockCount: number;
  lowStockItems: InventoryItem[];
  revenueSeries: { date: string; revenue: number; orders: number }[];
  topMenuItems: { name: string; quantity: number }[];
}
