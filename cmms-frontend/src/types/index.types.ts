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
  moi: number;
  dang_su_dung: number;
  thanh_ly: number;
  huy_bo: number;
}
