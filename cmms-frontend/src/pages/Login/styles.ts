import styled from "styled-components";
import AIRPORT_BG from "../../assets/images/airport-bg.jpg";

export const LoginContainer = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  margin: auto;
  align-items: center;
  background-image: url(${AIRPORT_BG});
  background-size: cover;
  background-position: center;
`;

export const LoginFormContainer = styled.form`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 16px;
`;

export const ForgotPasswordFormContainer = styled.form`
  max-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px 16px 16px 16px;
  position: relative;
`;
