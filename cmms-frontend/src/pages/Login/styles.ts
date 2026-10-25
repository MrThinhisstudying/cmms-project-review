import styled from "styled-components";
import AIRPORT_BG from "../../assets/images/airport-bg.jpg";

export const LoginContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  position: relative;
  background-image: url(${AIRPORT_BG});
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  padding: 24px 16px;
  box-sizing: border-box;

  @media (max-width: 640px) {
    padding: 16px 12px;
  }
`;

export const LoginCard = styled.div`
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 20px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.2);
  width: 440px;
  max-width: 100%;
  padding: 36px 36px 32px 36px;
  margin: auto 0;
  box-sizing: border-box;
  animation: fadeIn 0.4s ease-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(12px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @media (max-width: 480px) {
    padding: 28px 20px 24px 20px;
  }
`;

export const BrandHeader = styled.div`
  text-align: center;
  margin-bottom: 28px;

  .logo {
    height: 52px;
    width: auto;
    max-width: 260px;
    object-fit: contain;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.06));
    margin-bottom: 12px;
  }

  .system-title {
    font-size: 17px;
    font-weight: 800;
    color: #1e3a8a;
    letter-spacing: 0.5px;
    margin: 0 0 4px 0;
    text-transform: uppercase;
  }

  .airport-subtitle {
    font-size: 13px;
    font-weight: 600;
    color: #475467;
    margin: 0;
  }

  .divider {
    height: 3px;
    width: 48px;
    background: linear-gradient(90deg, #2563eb, #60a5fa);
    border-radius: 999px;
    margin: 12px auto 0 auto;
  }
`;

export const LoginFooter = styled.footer`
  text-align: center;
  padding: 10px 16px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8), 0 2px 8px rgba(0, 0, 0, 0.6);

  p {
    margin: 2px 0;
  }

  .brand-note {
    font-size: 11.5px;
    color: rgba(255, 255, 255, 0.95);
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
  }
`;
