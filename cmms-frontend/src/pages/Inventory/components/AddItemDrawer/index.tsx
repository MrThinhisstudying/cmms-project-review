import React, { useEffect } from "react";
import Drawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import { useForm, Controller, SubmitHandler, Resolver } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useInventoryContext } from "../../../../context/InventoryContext/InventoryContext";
import { CustomButton } from "../../../../components/Button";
import FileUploadComponent from "../../../../components/FileUpload";

interface FormValues {
  name: string;
  category_id: string;
  info?: string;
  quantity?: number | null;
  quantity_unit?: string;
  restock?: number | null;
  restock_note?: string;
  image?: string;
  code?: string;
  price?: number;
}

const schema = yup
  .object({
    name: yup
      .string()
      .trim()
      .required("Vui lòng nhập tên vật tư")
      .max(200, "Tên quá dài"),
    category_id: yup.string().required("Vui lòng chọn danh mục"),
    info: yup.string().optional().max(1000, "Mô tả quá dài"),
    code: yup.string().optional().max(100, "Mã vật tư quá dài"),
    price: yup
      .number()
      .typeError("Giá trị phải là số")
      .min(0, "Giá trị không được âm")
      .nullable(),
    quantity: yup
      .number()
      .typeError("Số lượng phải là số")
      .min(0, "Số lượng không được âm")
      .nullable(),
    quantity_unit: yup.string().optional().max(64, "Đơn vị quá dài"),
    restock: yup
      .number()
      .typeError("Số lượng phải là số")
      .min(0, "Số lượng phải lớn hơn hoặc bằng 0")
      .nullable(),
    restock_note: yup.string().optional().max(500, "Ghi chú quá dài"),
  })
  .required();

interface Props {
  openDrawer: boolean;
  toggleDrawer: (open: boolean, data: any) => void;
  data: any;
  categories: any[];
  onSaved?: (payload?: any) => void;
  onError?: (payload?: any) => void;
}

export default function AddItemDrawer({
  openDrawer,
  toggleDrawer,
  data,
  categories,
  onSaved,
  onError,
}: Props) {
  const { createItem, restockItem, updateItem } = useInventoryContext();

  const resolver = yupResolver(schema) as Resolver<FormValues>;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver,
    defaultValues: {
      name: "",
      category_id: "",
      info: "",
      quantity: 0,
      quantity_unit: "",
      restock: 0,
      restock_note: "",
      image: "",
      code: "",
      price: 0,
    },
  });

  useEffect(() => {
    if (data) {
      reset({
        name: data.name ?? "",
        category_id:
          data.category && typeof data.category === "object" && data.category.id
            ? String(data.category.id)
            : "",
        info: data.info ?? "",
        quantity: data.quantity ?? 0,
        quantity_unit: data.quantity_unit ?? "",
        restock: 0,
        restock_note: "",
        image: data.image ?? "",
        code: data.code ?? "",
        price: data.price ?? 0,
      });
    } else if (openDrawer) {
      reset({
        name: "",
        category_id: "",
        info: "",
        quantity: 0,
        quantity_unit: "",
        restock: 0,
        restock_note: "",
        image: "",
        code: "",
        price: 0,
      });
    }
  }, [data, openDrawer, categories, reset]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    try {
      if (data) {
        const updatePayload: Partial<{
          category_id: number;
          name: string;
          info: string;
          quantity_unit: string;
          image: string | null;
          code: string;
          price: number;
        }> = {
          name: values.name?.trim(),
          info: values.info ?? "",
          quantity_unit: values.quantity_unit ?? "",
          image: values.image ?? null,
          code: values.code ?? "",
          price: values.price ?? 0,
        };

        if (values.category_id !== "" && values.category_id != null) {
          updatePayload.category_id = Number(values.category_id);
        }

        await updateItem(data.item_id, updatePayload);

        const restockQty = Number(values.restock ?? 0);
        if (restockQty > 0) {
          await restockItem(data.item_id, {
            qty: restockQty,
            note: values.restock_note ?? "Nhập tồn",
          });
        }

        onSaved?.({ message: "Cập nhật vật tư thành công" });
      } else {
        await createItem({
          category_id: Number(values.category_id),
          name: values.name.trim(),
          info: values.info ?? "",
          quantity: values.quantity ? Number(values.quantity) : 0,
          quantity_unit: values.quantity_unit ?? "",
          image: values.image ?? "",
          code: values.code ?? "",
          price: values.price ?? 0,
        });

        reset({
          name: "",
          category_id: "",
          info: "",
          quantity: 0,
          quantity_unit: "",
          restock: 0,
          restock_note: "",
          image: "",
          code: "",
          price: 0,
        });

        onSaved?.({ message: "Thêm vật tư thành công" });
      }
    } catch (err: any) {
      onError?.({ message: err?.message ?? "Có lỗi xảy ra" });
    }
  };

  return (
    <Drawer
      anchor="right"
      open={openDrawer}
      onClose={() => {}}
      ModalProps={{ disableEscapeKeyDown: true }}
    >
      <Box sx={{ width: 640, p: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography fontSize={20} fontWeight={600}>
            {data ? "Chỉnh sửa vật tư" : "Thêm vật tư mới"}
          </Typography>
          <CloseIcon
            onClick={() => toggleDrawer(false, null)}
            style={{ cursor: "pointer" }}
          />
        </Box>

        <Box
          component="form"
          sx={{ mt: 3 }}
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <Controller
            name="image"
            control={control}
            render={({ field }) => (
              <FileUploadComponent
                value={field.value}
                onChange={(file) => {
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      field.onChange(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  } else {
                    field.onChange("");
                  }
                }}
                error={errors.image?.message as string | undefined}
              />
            )}
          />

          <Controller
            name="code"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Mã vật tư"
                fullWidth
                margin="normal"
                size="small"
                error={!!errors.code}
                helperText={errors.code?.message as string}
              />
            )}
          />

          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Tên vật tư"
                fullWidth
                margin="normal"
                size="small"
                error={!!errors.name}
                helperText={errors.name?.message as string}
              />
            )}
          />

          <Controller
            name="category_id"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                fullWidth
                label="Danh mục"
                margin="normal"
                size="small"
                error={!!errors.category_id}
                helperText={errors.category_id?.message as string}
              >
                <MenuItem value="">
                  <em>-- Chọn loại --</em>
                </MenuItem>
                {categories?.map((c) => (
                  <MenuItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          <Controller
            name="info"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Mô tả"
                fullWidth
                margin="normal"
                size="small"
                multiline
                rows={3}
                error={!!errors.info}
                helperText={errors.info?.message as string}
              />
            )}
          />

          {!data && (
            <Controller
              name="quantity"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Số lượng ban đầu"
                  type="number"
                  fullWidth
                  margin="normal"
                  size="small"
                  inputProps={{ step: "0.0001" }}
                  error={!!errors.quantity}
                  helperText={errors.quantity?.message as string}
                />
              )}
            />
          )}

          {data && (
            <TextField
              label="Số lượng hiện có"
              value={String(data.quantity ?? 0)}
              fullWidth
              margin="normal"
              size="small"
              InputProps={{ readOnly: true }}
            />
          )}

          <Controller
            name="quantity_unit"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Đơn vị (ví dụ: kg, cái...)"
                fullWidth
                margin="normal"
                size="small"
                error={!!errors.quantity_unit}
                helperText={errors.quantity_unit?.message as string}
              />
            )}
          />
          <Controller
            name="price"
            control={control}
            render={({ field }) => {
              const formatCurrency = (value: number | string) => {
                if (value === null || value === undefined || value === "")
                  return "";
                return new Intl.NumberFormat("vi-VN").format(Number(value));
              };

              const parseCurrency = (value: string) => {
                return (
                  Number(value.replace(/\./g, "").replace(/[^0-9]/g, "")) || 0
                );
              };

              return (
                <TextField
                  label="Giá vật tư (VNĐ)"
                  fullWidth
                  margin="normal"
                  size="small"
                  value={formatCurrency(field.value ?? "")}
                  onChange={(e) =>
                    field.onChange(parseCurrency(e.target.value))
                  }
                  error={!!errors.price}
                  helperText={errors.price?.message as string}
                  inputProps={{
                    inputMode: "numeric",
                    pattern: "[0-9]*",
                    style: { textAlign: "right", fontWeight: 500 },
                  }}
                />
              );
            }}
          />

          {data && (
            <>
              <Controller
                name="restock"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Số lượng nhập thêm (tùy chọn)"
                    type="number"
                    fullWidth
                    margin="normal"
                    size="small"
                    inputProps={{ step: "0.0001" }}
                    error={!!errors.restock}
                    helperText={errors.restock?.message as string}
                  />
                )}
              />
              <Controller
                name="restock_note"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Ghi chú (tùy chọn)"
                    fullWidth
                    margin="normal"
                    size="small"
                    error={!!errors.restock_note}
                    helperText={errors.restock_note?.message as string}
                  />
                )}
              />
            </>
          )}

          <Box sx={{ display: "flex", gap: 2, mt: 3, width: "100%" }}>
            <CustomButton
              variant="contained"
              id="cancel_button"
              fullWidth={false}
              onClick={() => toggleDrawer(false, null)}
              sx={{ height: "40px", flex: 1 }}
            >
              Huỷ
            </CustomButton>
            <CustomButton
              variant="contained"
              id="save_button"
              fullWidth={false}
              type="submit"
              disabled={isSubmitting}
              sx={{ height: "40px", flex: 1 }}
            >
              {data ? "Cập nhật" : "Thêm"}
            </CustomButton>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
}
