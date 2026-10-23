import { yupResolver } from "@hookform/resolvers/yup";
import { Modal as AntdModal } from "antd";
import React from "react";
import { useForm, Resolver } from "react-hook-form";
import * as yup from "yup";
import { CustomButton } from "../../../../components/Button";
import { ForgotPasswordFormContainer } from "../../styles";
import Input from "../../../../components/Input";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: ({ email }: { email: string }) => void;
}

const ForgotPasswordDialog: React.FC<DialogProps> = ({
  onClose,
  open,
  onSubmit,
}) => {
  const schema = yup.object().shape({
    email: yup
      .string()
      .required("Xin vui lòng nhập đầy đủ email")
      .email("Xin vui lòng điền đúng định dạng email"),
  });

  const resolver = yupResolver(schema) as unknown as Resolver<{ email: string }>;

  const {
    control,
    formState: { errors },
    handleSubmit,
  } = useForm<{ email: string }>({
    defaultValues: {
      email: "",
    },
    resolver,
  });

  return (
    <AntdModal
      open={open}
      onCancel={onClose}
      footer={null}
      title="Tìm tài khoản của bạn"
      centered
    >
      <ForgotPasswordFormContainer onSubmit={handleSubmit(onSubmit)}>
        <p style={{ color: "#475467", fontWeight: 400, fontSize: 14, margin: "0 0 16px 0" }}>
          Vui lòng nhập địa chỉ email của bạn để lấy lại mật khẩu.
        </p>
        <Input
          control={control}
          error={errors?.email?.message || ""}
          label="Tên đăng nhập"
          name="email"
          placeholder={"Tài khoản"}
        />
        <CustomButton
          variant="contained"
          type="submit"
          fullWidth
          style={{ marginTop: 16 }}
        >
          Quên mật khẩu
        </CustomButton>
      </ForgotPasswordFormContainer>
    </AntdModal>
  );
};

export default ForgotPasswordDialog;
