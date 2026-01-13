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
  signature_url?: string;
  department?: IDepartment;
  user_device_groups?: IUserDeviceGroup[];
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
  signature_url?: string;
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
  manager?: { user_id: number; name: string };
  manager_id?: number;
  description?: string;
  scope?: 'PERSONAL' | 'GROUP' | 'DEPARTMENT' | 'ALL';
  created_at?: string;
  updated_at?: string;
}
