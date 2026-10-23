import styled from "styled-components";

export const ButtonUpload = styled.div`
  width: 100px;
  height: 100px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 8px;
  border: 1px dashed #D0D5DD;
  background: #FFF;
  cursor: pointer;
  transition: border-color 0.2s;

  &:hover {
    border-color: #115eaf;
  }
`;

export const BoxImage = styled.div`
  position: relative;
  width: max-content;
`;

export const IconButtonContainer = styled.button`
  position: absolute;
  top: -8px;
  right: -8px;
  padding: 4px;
  border-radius: 50%;
  color: #fff;
  background-color: rgba(0, 0, 0, 0.7);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: rgba(0, 0, 0, 0.85);
  }
`;
