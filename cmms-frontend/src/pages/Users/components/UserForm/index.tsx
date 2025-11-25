import React, { useEffect, useState } from "react";
import {
  TextField,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { ICreateUser, IUser } from "../../../../types/user.types";
import FileUploadComponent from "../../../../components/FileUpload";
import {
  DialogContainer,
  DialogContentContainer,
  DialogTitleContainer,
} from "./style";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { CustomButton } from "../../../../components/Button";
import { useDepartmentsContext } from "../../../../context/DepartmentsContext/DepartmentsContext";

interface UserFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (user: ICreateUser) => void;
  selectedUser: IUser | null;
}

const getUserSchema = (isEdit: boolean) =>
  yup.object({
    name: yup.string().required("Tên người dùng là bắt buộc"),
    email: yup
      .string()
      .email("Email không hợp lệ")
      .required("Email là bắt buộc"),
    password: isEdit
      ? yup.string().optional()
      : yup
          .string()
          .required("Mật khẩu là bắt buộc")
          .min(6, "Mật khẩu ít nhất 6 ký tự"),
    confirmPassword: isEdit
      ? yup.string().optional()
      : yup
          .string()
          .required("Xác nhận mật khẩu là bắt buộc")
          .oneOf([yup.ref("password")], "Mật khẩu xác nhận không khớp"),
    position: yup.string().required("Chức vụ là bắt buộc"),
    role: yup.string().required("Vai trò là bắt buộc"),
    citizen_identification_card: yup
      .string()
      .required("Số căn cước công dân là bắt buộc"),
    avatar: yup.string().optional(),
    status: yup.string().optional(),
    dept_id: yup
      .number()
      .nullable()
      .required("Phòng ban là bắt buộc")
      .moreThan(0, "Phòng ban là bắt buộc"),
  });

const UserForm: React.FC<UserFormProps> = ({
  open,
  onClose,
  onSave,
  selectedUser,
}) => {
  const isEdit = !!selectedUser;
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const toggleShowPassword = () => setShowPassword((prev) => !prev);
  const toggleShowConfirm = () => setShowConfirm((prev) => !prev);

  const schema = getUserSchema(isEdit);

  const { departments } = useDepartmentsContext();

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<yup.InferType<typeof schema>>({
    resolver: yupResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      position: "",
      role: "staff",
      citizen_identification_card: "",
      avatar: "",
      status: "active",
      dept_id: 0,
    },
  });

  useEffect(() => {
    if (open && selectedUser) {
      setValue("name", selectedUser.name);
      setValue("email", selectedUser.email);
      setValue("position", selectedUser.position);
      setValue("role", selectedUser.role);
      setValue(
        "citizen_identification_card",
        selectedUser.citizen_identification_card
      );
      setValue("avatar", selectedUser.avatar);
      setValue("status", selectedUser.status);
      setValue("dept_id", selectedUser.department?.dept_id || 0);
    } else {
      reset();
    }
  }, [open, selectedUser, setValue, reset]);

  const onSubmit = (data: ICreateUser & { confirmPassword?: string }) => {
    const user: ICreateUser = {
      name: data.name,
      email: data.email,
      position: data.position,
      role: data.role,
      citizen_identification_card: data.citizen_identification_card,
      avatar: data.avatar || "",
      status: data.status || "active",
      dept_id: Number(data.dept_id),
      ...(isEdit ? {} : { password: data.password }),
    };
    onSave(user);
    onClose();
  };

  const handleAvatarChange = (file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setValue("avatar", reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <DialogContainer open={open} onClose={onClose}>
      <DialogTitleContainer>
        {isEdit ? "Chỉnh sửa người dùng" : "Thêm người dùng"}
      </DialogTitleContainer>
      <DialogContentContainer>
        <Controller
          name="avatar"
          control={control}
          render={({ field }) => (
            <FileUploadComponent
              value={field.value}
              onChange={handleAvatarChange}
              error={errors.avatar?.message}
            />
          )}
        />

        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Tên"
              fullWidth
              error={!!errors.name}
              helperText={errors.name?.message}
            />
          )}
        />

        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Email"
              fullWidth
              error={!!errors.email}
              helperText={errors.email?.message}
            />
          )}
        />

        {!isEdit && (
          <>
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Mật khẩu"
                  fullWidth
                  type={showPassword ? "text" : "password"}
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={toggleShowPassword} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />

            <Controller
              name="confirmPassword"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Xác nhận mật khẩu"
                  fullWidth
                  type={showConfirm ? "text" : "password"}
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword?.message}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={toggleShowConfirm} edge="end">
                          {showConfirm ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />
          </>
        )}

        <Controller
          name="citizen_identification_card"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Số CCCD"
              fullWidth
              error={!!errors.citizen_identification_card}
              helperText={errors.citizen_identification_card?.message}
              onBeforeInput={(e) => {
                const ev = e as unknown as React.FormEvent<HTMLInputElement> & {
                  data: string;
                };
                if (!/^[0-9]$/.test(ev.data)) {
                  e.preventDefault();
                }
              }}
            />
          )}
        />

        <Controller
          name="position"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Chức vụ"
              fullWidth
              error={!!errors.position}
              helperText={errors.position?.message}
            />
          )}
        />

        <FormControl fullWidth error={!!errors.role}>
          <InputLabel>Vai trò</InputLabel>
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <Select {...field} label="Vai trò">
                <MenuItem value="staff">Staff</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="manager">Manager</MenuItem>
              </Select>
            )}
          />
          {errors.role && (
            <FormHelperText>{errors.role?.message}</FormHelperText>
          )}
        </FormControl>

        <FormControl fullWidth error={!!errors.dept_id}>
          <InputLabel>Phòng ban</InputLabel>
          <Controller
            name="dept_id"
            control={control}
            render={({ field }) => (
              <Select {...field} label="Phòng ban">
                {departments.map((dept) => (
                  <MenuItem key={dept.dept_id} value={dept.dept_id}>
                    {dept.name}
                  </MenuItem>
                ))}
              </Select>
            )}
          />
          {errors.dept_id && (
            <FormHelperText>{errors.dept_id.message}</FormHelperText>
          )}
        </FormControl>
      </DialogContentContainer>

      <DialogActions>
        <CustomButton
          onClick={onClose}
          color="secondary"
          variant="outlined"
          padding="4px 12px"
        >
          Hủy
        </CustomButton>
        <CustomButton
          onClick={handleSubmit(onSubmit)}
          color="primary"
          variant="contained"
          padding="4px 12px"
        >
          Xác nhận
        </CustomButton>
      </DialogActions>
    </DialogContainer>
  );
};

export default UserForm;
