import { yupResolver } from "@hookform/resolvers/yup";
import { Box, Dialog, IconButton, Typography } from "@mui/material";
import React from "react";
import { useForm, Resolver } from "react-hook-form";
import * as yup from "yup";
import CloseIcon from "../../../../assets/icons/close-icon.svg";
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
    <Dialog onClose={onClose} open={open}>
      <ForgotPasswordFormContainer onSubmit={handleSubmit(onSubmit)}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography
            color="#101828"
            fontWeight={600}
            fontSize={18}
            sx={{ whiteSpace: "normal", wordBreak: "break-word", flex: 1 }}
          >
            Tìm tài khoản của bạn
          </Typography>
          <IconButton onClick={() => onClose()}>
            <img src={CloseIcon} alt="close" />
          </IconButton>
        </Box>
        <Typography color="#475467" fontWeight={400} fontSize={14}>
          Vui lòng nhập địa chỉ email của bạn để lấy lại mật khẩu.
        </Typography>
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
          sx={{ minWidth: "100%" }}
        >
          Quên mật khẩu
        </CustomButton>
      </ForgotPasswordFormContainer>
    </Dialog>
  );
};

export default ForgotPasswordDialog;
