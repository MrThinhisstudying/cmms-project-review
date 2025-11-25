import { IUser } from "./user.types";

export interface ICategory {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface IItem {
  item_id: number;
  category?: ICategory | null;
  name: string;
  info?: string;
  image?: string;
  enabled?: boolean;
  quantity: number;
  quantity_unit?: string;
  code?: string;
  price?: number;
  created_at?: string;
  updated_at?: string;
}

export interface IItemTransaction {
  id: number;
  item: IItem;
  delta: number;
  purpose?: string;
  note?: string;
  user?: IUser | null;
  occurred_at?: string;
  created_at?: string;
}

export type StockOutStatus = "PENDING" | "APPROVED" | "CANCELED";

export interface IStockOut {
  id: number;
  item?: IItem | null;
  quantity?: number;
  purpose?: string;
  note?: string;
  requested_by?: IUser | string | number | null;
  requester_name?: string;
  approved_by?: IUser | string | number | null;
  status: StockOutStatus;
  state?: string;
  items?: IStockOutItem[];
  occurred_at?: string;
  created_at?: string;
  repair?: { repair_id: number } | null;
}

export interface IStockOutItem {
  id?: number;
  item_id?: number;
  name?: string;
  item?: IItem | null;
  quantity?: number;
  qty?: number;
  unit?: string;
  note?: string;
}

export type CategoryPayload = {
  name: string;
  description?: string;
};

export type ItemPayload = {
  category_id: number;
  name: string;
  info?: string;
  image?: string;
  enabled?: boolean;
  quantity?: number;
  quantity_unit?: string;
  code?: string;
  price?: number;
};

export type RestockPayload = {
  qty: number;
  note?: string;
};

export type TransactionPayload = {
  item_id: number;
  quantity: number;
  purpose?: string;
  note?: string;
};

export type StockOutPayload = {
  item_id: number;
  quantity: number;
  purpose?: string;
  note?: string;
};

export interface IInventoryReport {
  total_items: number;
  total_categories: number;
  total_stockouts: number;
  approved_stockouts: number;
  pending_stockouts: number;
  canceled_stockouts: number;
}

export interface IInventoryTab {
  id: number;
  value: number;
  label: string;
  total: number;
  data: IItem[];
}
