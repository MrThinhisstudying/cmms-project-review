export interface CustomTabProps {
  label: string;
  total?: number;
  id: number;
  value?: number;
  data?: any;
}

export interface CustomPagination {
  data: any;
  rowsPerPage: number;
  onPageChange: (newPage: number) => void;
  page: number;
}

export interface INotification {
  id: number;
  message: string;
  created_at: string;
  read?: boolean;
}

export interface ReportData {
  total: number;
  MOI?: number;
  DANG_SU_DUNG?: number;
  SU_DUNG_HAN_CHE?: number;
  DANG_SUA_CHUA?: number;
  THANH_LY?: number;
  HUY_BO?: number;
}
