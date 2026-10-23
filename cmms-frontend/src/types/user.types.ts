export interface IUser {
  user_id: number;
  name: string;
  email: string;
  password: string;
  position: string;
  status: string;
  role: string;
  citizen_identification_card: string;
  avatar: string;
  phone_number?: string;
  employee_code?: string;
  signature_url?: string;
  date_of_birth?: string;
  place_of_birth?: string;
  gender?: string;
  ethnicity?: string;
  cccd_issue_date?: string;
  permanent_address?: string;
  temporary_address?: string;
  hometown?: string;
  department?: IDepartment;
  user_device_groups?: IUserDeviceGroup[];
  user_departments?: IUserDepartment[];
  must_change_password?: boolean;
  created_at: Date;
  updated_at?: Date;
}

export interface IUserDeviceGroup {
    id: number;
    group_id: number;
    is_group_lead: boolean;
    device_group?: {
        id: number;
        name: string;
    };
}

export interface ICreateUser {
  name: string;
  email: string;
  password?: string | null;
  position: string;
  status?: string;
  role: string;
  citizen_identification_card: string;
  avatar?: string;
  phone_number?: string;
  employee_code?: string;
  signature_url?: string;
  date_of_birth?: string;
  place_of_birth?: string;
  gender?: string;
  ethnicity?: string;
  cccd_issue_date?: string;
  permanent_address?: string;
  temporary_address?: string;
  hometown?: string;
  dept_id?: number;
  // For UI form handling
  group_id?: number;
  is_group_lead?: boolean;
}

export interface IUpdatePassword {
  password: string;
}

export interface IUpdatePasswordForm extends IUpdatePassword {
  confirmPassword: string;
}

export interface UsersContextValue {
  users: IUser[];
  setUsers: React.Dispatch<React.SetStateAction<IUser[]>>;
  loading: boolean;
  fetchUsers: () => void;
}

export interface IDepartment {
  dept_id: number;
  name: string;
  permissions?: string[];
  manager?: { user_id: number; name: string; email?: string; phone_number?: string };
  manager_id?: number;
  deputy?: { user_id: number; name: string; email?: string; phone_number?: string };
  deputy_id?: number;
  description?: string;
  scope?: 'PERSONAL' | 'GROUP' | 'DEPARTMENT' | 'ALL';
  level?: 'PHONG_BAN' | 'DOI' | 'TO' | 'NHOM' | 'UNASSIGNED';
  is_technical?: boolean;
  member_count?: number;
  devices_count?: number;
  device_groups?: any[];
  created_at?: string;
  updated_at?: string;
  parent_id?: number;
  parent?: IDepartment;
  children?: any[];
}

export interface IUserDepartment {
  id: number;
  user_id: number;
  dept_id: number;
  role_in_dept: 'MEMBER' | 'DEPUTY_LEAD' | 'LEAD';
  is_primary: boolean;
  department?: IDepartment;
}
