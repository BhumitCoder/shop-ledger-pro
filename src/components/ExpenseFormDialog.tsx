import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from "@mui/material";
import { createExpense, createIncome } from "@/lib/db";
import { useAuth } from "@/providers/AuthProvider";
import { useSnackbar } from "notistack";
import { Timestamp } from "firebase/firestore";

const EXPENSE_CATEGORIES = ["Stock/Inventory", "Rent", "Salary", "Electricity", "Transport", "Food", "Repair", "Stationery", "Marketing", "Other"];
const INCOME_CATEGORIES = ["Sale", "Commission", "Interest", "Rent Received", "Other"];

interface Props {
  open: boolean;
  onClose: () => void;
  mode: "expense" | "income";
}

interface FormData {
  amount: number;
  category: string;
  vendor: string;
  description: string;
  date: string;
}

export function ExpenseFormDialog({ open, onClose, mode }: Props) {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const cats = mode === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<FormData>({
    defaultValues: { amount: 0, category: cats[0], vendor: "", description: "", date: new Date().toISOString().slice(0, 10) },
  });

  useEffect(() => {
    if (open) reset({ amount: 0, category: cats[0], vendor: "", description: "", date: new Date().toISOString().slice(0, 10) });
  }, [open, mode]);

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    if (!data.amount || data.amount <= 0) { enqueueSnackbar("Enter a valid amount", { variant: "warning" }); return; }
    try {
      const payload = {
        amount: Number(data.amount),
        category: data.category,
        description: data.description.trim(),
        date: Timestamp.fromDate(new Date(data.date)),
      };
      if (mode === "expense") {
        await createExpense(user.uid, { ...payload, vendor: data.vendor.trim() });
        enqueueSnackbar("Expense added", { variant: "success" });
      } else {
        await createIncome(user.uid, { ...payload, source: data.vendor.trim() });
        enqueueSnackbar("Income added", { variant: "success" });
      }
      onClose();
    } catch (e: any) {
      enqueueSnackbar(e?.message || "Failed to save", { variant: "error" });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{mode === "expense" ? "Add Expense" : "Add Income"}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Amount (₹)"
              type="number"
              autoFocus
              inputMode="decimal"
              error={!!errors.amount}
              helperText={errors.amount?.message}
              {...register("amount", { valueAsNumber: true, required: "Amount required", min: { value: 0.01, message: "Must be > 0" } })}
            />
            <TextField select label="Category" defaultValue={cats[0]} {...register("category")}>
              {cats.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <TextField
              label={mode === "expense" ? "Vendor / Shop (optional)" : "Source (optional)"}
              {...register("vendor")}
            />
            <TextField label="Details (optional)" {...register("description")} />
            <TextField label="Date" type="date" InputLabelProps={{ shrink: true }} {...register("date", { required: true })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" color={mode === "expense" ? "error" : "success"} disabled={isSubmitting}>Save</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
