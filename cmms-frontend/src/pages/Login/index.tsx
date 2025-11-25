import { LoginContainer } from "./styles";
import { yupResolver } from "@hookform/resolvers/yup";
import { Box, Typography } from "@mui/material";
import { useRef, useState } from "react";
import { useForm, Resolver } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import * as yup from "yup";
import { LoginFormContainer } from "./styles";
import Toast from "./../../components/Toast";
import ACV_LOGO from "../../assets/images/acv-logo.png";
import { useAuthContext } from "../../context/AuthContext/AuthContext";
import { signIn } from "../../apis/signIn";
import ForgotPasswordDialog from "./components/ForgotPasswordDialog";
import { CustomButton } from "../../components/Button";
import CheckBox from "../../components/CheckBox";
import Input from "../../components/Input";
import { forgotPassword } from "../../apis/users";
import { setToken } from "../../utils/auth";

interface ILoginForm {
  email: string;
  password: string;
  remember?: boolean;
}

export type ToastContent = {
  type: "error" | "success" | "info";
  content: string;
  duration?: number;
};

const Login = () => {
  const navigate = useNavigate();
  const { updateUser } = useAuthContext();
  const [openToast, setOpenToast] = useState(false);
  const toast = useRef<ToastContent>({
    type: "success",
    content: "",
  });

  const schema = yup.object().shape({
    email: yup
      .string()
      .required("Xin vui lòng nhập đầy đủ email")
      .email("Xin vui lòng điền đúng định dạng email"),
    password: yup.string().required("Xin vui lòng nhập đầy đủ mật khẩu"),
    remember: yup.boolean(),
  });

  const resolver = yupResolver(schema) as unknown as Resolver<ILoginForm>;

  const {
    control,
    formState: { errors },
    handleSubmit,
  } = useForm<ILoginForm>({
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
    resolver,
  });

  const [openForgotPasswordDialog, setOpenForgotPasswordDialog] =
    useState(false);

  const handleCloseForgotPassword = () => {
    setOpenForgotPasswordDialog(false);
  };

  const handleOpenForgotPassword = () => {
    setOpenForgotPasswordDialog(true);
  };

  const showToast = (content: ToastContent) => {
    toast.current = content;
    setOpenToast(true);
  };

  const handleLogin = async (data: ILoginForm) => {
    try {
      const token = await signIn(data.email, data.password);

      if (token) {
        showToast({
          content: "Đăng nhập thành công",
          type: "success",
        });

        updateUser(token);
        setToken(token, data.remember || false);
        navigate("/trang_chu");
      } else {
        showToast({
          content:
            "Đăng nhập không thành công. Vui lòng kiểm tra lại tài khoản và mật khẩu",
          type: "error",
        });
      }
    } catch (error: any) {
      showToast({
        content:
          "Đăng nhập không thành công. Vui lòng kiểm tra lại tài khoản và mật khẩu",
        type: "error",
      });
    }
  };

  const handleForgotPassword = async (data: { email: string }) => {
    try {
      await forgotPassword(data.email);

      showToast({
        content: "Vui lòng kiểm tra email của bạn",
        type: "success",
      });

      handleCloseForgotPassword();
    } catch (error: any) {
      showToast({
        content:
          error.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại",
        type: "error",
      });
    }
  };
  return (
    <LoginContainer>
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="space-between"
        minHeight="100vh"
        width="100%"
      >
        <Box
          flexGrow={1}
          display="flex"
          justifyContent="center"
          alignItems="center"
          px={2}
        >
          <Box
            bgcolor="white"
            p={4}
            borderRadius={2}
            boxShadow={3}
            width={400}
            maxWidth="100%"
            zIndex={1}
          >
            <Box mb={3} textAlign="center">
              <img src={ACV_LOGO} height={50} width={250} alt="ACV Logo" />
              <Typography
                variant="body2"
                color="textSecondary"
                mt={1}
                fontSize={16}
                fontWeight="bold"
              >
                Tổng công ty Cảng hàng không Việt Nam - CTCP
              </Typography>
            </Box>

            <LoginFormContainer onSubmit={handleSubmit(handleLogin)}>
              <Box display="flex" flexDirection="column" gap="14px">
                <Input
                  control={control}
                  error={errors?.email?.message || ""}
                  label="Tên đăng nhập"
                  name="email"
                  placeholder="Tài khoản"
                />
                <Input
                  control={control}
                  type="password"
                  error={errors?.password?.message || ""}
                  label="Mật khẩu"
                  name="password"
                  placeholder="Mật khẩu"
                />
              </Box>
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                mt={2}
              >
                <CheckBox
                  control={control}
                  name="remember"
                  label={
                    <Typography color="#1D2939" fontWeight={500} fontSize={14}>
                      Ghi nhớ đăng nhập
                    </Typography>
                  }
                />
                <Typography
                  color="#115eaf"
                  fontWeight={500}
                  fontSize={14}
                  sx={{
                    cursor: "pointer",
                    "&:hover": { textDecoration: "underline" },
                  }}
                  onClick={handleOpenForgotPassword}
                >
                  Tôi quên mật khẩu
                </Typography>
              </Box>
              <CustomButton variant="contained" type="submit">
                Đăng nhập
              </CustomButton>
            </LoginFormContainer>
          </Box>
        </Box>

        <Box textAlign="center" p={2}>
          <Typography
            variant="body2"
            color="white"
            fontSize={14}
            fontWeight="bold"
          >
            Tổng công ty Cảng hàng không Việt Nam - CTCP
          </Typography>
        </Box>

        <ForgotPasswordDialog
          open={openForgotPasswordDialog}
          onClose={handleCloseForgotPassword}
          onSubmit={handleForgotPassword}
        />
        <Toast
          content={toast.current.content}
          variant={toast.current.type}
          open={openToast}
          onClose={() => setOpenToast(false)}
        />
      </Box>
    </LoginContainer>
  );
};

export default Login;
