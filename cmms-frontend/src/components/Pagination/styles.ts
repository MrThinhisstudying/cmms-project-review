import styled from "styled-components";

export const ButtonCustom = styled.button<{ disabled?: boolean }>`
  width: max-content;
  display: flex;
  padding: 8px 10px;
  justify-content: center;
  align-items: center;
  gap: 8px;
  border-radius: 8px;
  border: 1px solid #D0D5DD;
  background: #FFF;
  box-shadow: 0px 1px 2px 0px rgba(16, 24, 40, 0.05);
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  opacity: ${(props) => (props.disabled ? 0.5 : 1)};
  outline: none;

  &:hover:not(:disabled) {
    background: #F9FAFB;
  }

  @media (max-width: 600px) {
    padding: 6px 8px;
    border-radius: 6px;
    min-width: 32px;
  }
`;

export const BoxPage = styled.div`
  width: max-content;
  display: flex;
  padding: 8px;
  justify-content: center;
  align-items: center;
  gap: 8px;
  border-radius: 8px;
  background: #FFF;
`;

export const BoxButton = styled.div`
  display: flex;
  padding: 12px 16px 8px 16px;
  gap: 8px;
  justify-content: space-between;
  align-items: center;
  align-self: stretch;
  border-top: 1px solid #EAECF0;
  width: 100%;
`;
