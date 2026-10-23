import React, { useState } from "react";
import { CloseOutlined } from "@ant-design/icons";
import PLUS from "../../assets/icons/plus.svg";
import { BoxImage, ButtonUpload, IconButtonContainer } from "./style";

interface FileUploadProps {
  onChange: (file: File | null) => void;
  error?: string;
  value?: string;
}

const FileUploadComponent: React.FC<FileUploadProps> = ({
  onChange,
  error,
  value,
}) => {
  const [preview, setPreview] = useState<string | null>(value ?? "");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        onChange(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearPreview = () => {
    setPreview(null);
    onChange(null);
  };

  return (
    <div>
      <input
        accept="image/*"
        type="file"
        id="file-upload"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      {!preview ? (
        <label htmlFor="file-upload">
          <ButtonUpload>
            <img src={PLUS} height={24} width={24} alt="Upload" />
          </ButtonUpload>
        </label>
      ) : (
        <BoxImage>
          <img
            src={preview}
            alt="Preview"
            style={{
              width: "100px",
              height: "100px",
              objectFit: "cover",
              borderRadius: "8px",
            }}
          />
          <IconButtonContainer onClick={handleClearPreview}>
            <CloseOutlined style={{ fontSize: "12px" }} />
          </IconButtonContainer>
        </BoxImage>
      )}

      {error && (
        <span style={{ color: "#B42318", fontSize: "12px", marginTop: "4px", display: "block" }}>
          {error}
        </span>
      )}
    </div>
  );
};

export default FileUploadComponent;
