import React, { useState } from "react";
import { FormHelperText } from "@mui/material";
import { Close } from "@mui/icons-material";
import PLUS from "../../assets/icons/plus.svg";
import { BoxImage, ButtonUpload, IconButtonContainer } from "./style";

interface FileUploadProps {
  onChange: (file: File | null) => void;
  error: string | undefined;
  value: string | undefined;
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
          <ButtonUpload variant="outlined" component="span">
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
            <Close sx={{ width: "16px", height: "16px" }} />
          </IconButtonContainer>
        </BoxImage>
      )}

      {error && <FormHelperText>{error}</FormHelperText>}
    </div>
  );
};

export default FileUploadComponent;
