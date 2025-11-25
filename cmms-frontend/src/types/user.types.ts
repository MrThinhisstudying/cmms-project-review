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
  department?: IDepartment;
  created_at: Date;
  updated_at?: Date;
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
  dept_id?: number;
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
  description?: string;
  created_at?: string;
  updated_at?: string;
}
