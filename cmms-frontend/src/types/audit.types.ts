export interface AuditTransactionRef {
  id: number;
  actor_user_id?: number;
  reason?: string;
  created_at?: string;
  rolled_back?: boolean;
  rolled_back_at?: string;
}

export interface AuditLog {
  id: number;
  entity_name: string;
  entity_id: string;
  action: "INSERT" | "UPDATE" | "DELETE" | "ROLLBACK";
  actor_user_id?: number;
  actor?: {
    user_id: number;
    name: string;
    email: string;
    avatar?: string;
  };
  before?: any;
  after?: any;
  diff?: Record<string, { before: any; after: any }>;
  reason?: string;
  created_at: string;
  rolled_back?: boolean;
  rolled_back_at?: string;
  transaction?: AuditTransactionRef;
}

export interface AuditContextValue {
  logs: AuditLog[];
  loading: boolean;
  fetchAll: () => Promise<void>;
  rollbackTx: (txId: number, reason?: string) => Promise<boolean>;
}
