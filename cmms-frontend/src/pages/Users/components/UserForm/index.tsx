import React, { useEffect } from "react";
import { Modal as AntdModal, Input as AntdInput, Select as AntdSelect } from "antd";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { ICreateUser, IUser } from "../../../../types/user.types";
import FileUploadComponent from "../../../../components/FileUpload";
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
    <AntdModal
      open={open}
      onCancel={onClose}
      title={isEdit ? "Chỉnh sửa người dùng" : "Thêm người dùng"}
      footer={[
        <CustomButton key="cancel" onClick={onClose} variant="outlined">
          Hủy
        </CustomButton>,
        <CustomButton key="submit" onClick={handleSubmit(onSubmit)} variant="contained" bgrColor="#1890ff">
          Xác nhận
        </CustomButton>,
      ]}
      centered
      width={600}
    >
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
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

        <div>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Tên *</label>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <AntdInput {...field} status={errors.name ? "error" : ""} placeholder="Nhập tên..." />
            )}
          />
          {errors.name && <span style={{ color: "#B42318", fontSize: 12 }}>{errors.name.message}</span>}
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Email *</label>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <AntdInput {...field} status={errors.email ? "error" : ""} placeholder="Nhập email..." />
            )}
          />
          {errors.email && <span style={{ color: "#B42318", fontSize: 12 }}>{errors.email.message}</span>}
        </div>

        {!isEdit && (
          <>
            <div>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Mật khẩu *</label>
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <AntdInput.Password {...field} status={errors.password ? "error" : ""} placeholder="Nhập mật khẩu..." />
                )}
              />
              {errors.password && <span style={{ color: "#B42318", fontSize: 12 }}>{errors.password.message}</span>}
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Xác nhận mật khẩu *</label>
              <Controller
                name="confirmPassword"
                control={control}
                render={({ field }) => (
                  <AntdInput.Password {...field} status={errors.confirmPassword ? "error" : ""} placeholder="Xác nhận mật khẩu..." />
                )}
              />
              {errors.confirmPassword && <span style={{ color: "#B42318", fontSize: 12 }}>{errors.confirmPassword.message}</span>}
            </div>
          </>
        )}

        <div>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Số CCCD *</label>
          <Controller
            name="citizen_identification_card"
            control={control}
            render={({ field }) => (
              <AntdInput {...field} status={errors.citizen_identification_card ? "error" : ""} placeholder="Nhập số CCCD..." />
            )}
          />
          {errors.citizen_identification_card && <span style={{ color: "#B42318", fontSize: 12 }}>{errors.citizen_identification_card.message}</span>}
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Chức vụ *</label>
          <Controller
            name="position"
            control={control}
            render={({ field }) => (
              <AntdInput {...field} status={errors.position ? "error" : ""} placeholder="Nhập chức vụ..." />
            )}
          />
          {errors.position && <span style={{ color: "#B42318", fontSize: 12 }}>{errors.position.message}</span>}
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Vai trò *</label>
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <AntdSelect {...field} style={{ width: "100%" }} status={errors.role ? "error" : ""}>
                <AntdSelect.Option value="staff">Staff</AntdSelect.Option>
                <AntdSelect.Option value="admin">Admin</AntdSelect.Option>
                <AntdSelect.Option value="manager">Manager</AntdSelect.Option>
              </AntdSelect>
            )}
          />
          {errors.role && <span style={{ color: "#B42318", fontSize: 12 }}>{errors.role.message}</span>}
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Phòng ban *</label>
          <Controller
            name="dept_id"
            control={control}
            render={({ field }) => (
              <AntdSelect {...field} style={{ width: "100%" }} status={errors.dept_id ? "error" : ""}>
                {departments.map((dept) => (
                  <AntdSelect.Option key={dept.dept_id} value={dept.dept_id}>
                    {dept.name}
                  </AntdSelect.Option>
                ))}
              </AntdSelect>
            )}
          />
          {errors.dept_id && <span style={{ color: "#B42318", fontSize: 12 }}>{errors.dept_id.message}</span>}
        </div>
      </form>
    </AntdModal>
  );
};

export default UserForm;
