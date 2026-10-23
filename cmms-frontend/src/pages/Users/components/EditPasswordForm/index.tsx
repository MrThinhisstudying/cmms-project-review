import React, { useEffect } from "react";
import { useForm, Resolver, SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import { Modal as AntdModal, Input as AntdInput } from "antd";
import { IUpdatePassword, IUpdatePasswordForm } from "../../../../types/user.types";
import { CustomButton } from "../../../../components/Button";

const schema = Yup.object().shape({
  password: Yup.string()
    .required("Mật khẩu là bắt buộc")
    .min(6, "Ít nhất 6 ký tự"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Mật khẩu xác nhận không khớp")
    .required("Vui lòng xác nhận mật khẩu"),
});

const EditPasswordForm: React.FC<{
  open: boolean;
  onClose: () => void;
  onSave: (data: IUpdatePassword) => void;
}> = ({ open, onClose, onSave }) => {
  const resolver = yupResolver(
    schema
  ) as unknown as Resolver<IUpdatePasswordForm>;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<IUpdatePasswordForm>({
    resolver,
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const handleFormSubmit: SubmitHandler<IUpdatePasswordForm> = (data) => {
    const { password } = data;
    onSave({ password });
    reset();
    onClose();
  };

  useEffect(() => {
    if (open) {
      reset({
        password: "",
        confirmPassword: "",
      });
    }
  }, [open, reset]);

  return (
    <AntdModal
      open={open}
      onCancel={onClose}
      title="Đặt lại mật khẩu"
      footer={[
        <CustomButton key="cancel" onClick={onClose} variant="outlined">
          Hủy
        </CustomButton>,
        <CustomButton
          key="submit"
          onClick={handleSubmit(handleFormSubmit)}
          variant="contained"
          bgrColor="#1890ff"
        >
          Cập nhật
        </CustomButton>,
      ]}
      centered
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
        <div>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Mật khẩu mới *</label>
          <AntdInput.Password
            {...register("password")}
            placeholder="Nhập mật khẩu mới..."
            status={errors.password ? "error" : ""}
          />
          {errors.password && <span style={{ color: "#B42318", fontSize: 12 }}>{errors.password.message}</span>}
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Xác nhận mật khẩu *</label>
          <AntdInput.Password
            {...register("confirmPassword")}
            placeholder="Xác nhận mật khẩu..."
            status={errors.confirmPassword ? "error" : ""}
          />
          {errors.confirmPassword && <span style={{ color: "#B42318", fontSize: 12 }}>{errors.confirmPassword.message}</span>}
        </div>
      </form>
    </AntdModal>
  );
};

export default EditPasswordForm;
