import { useForm } from "react-hook-form";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from "@mui/material";
import { PaymentMethod, TxnType, createTransaction } from "@/lib/db";
import { useAuth } from "@/providers/AuthProvider";
import { useSnackbar } from "notistack";
import { Timestamp } from "firebase/firestore";
import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  customerId: string;
  type: TxnType;
}

interface FormData {
  amount: number;
  description: string;
  paymentMethod: PaymentMethod;
  date: string; // yyyy-mm-dd
}

const methods: PaymentMethod[] = ["cash", "upi", "bank", "cheque", "card", "other"];

export function TransactionFormDialog({ open, onClose, customerId, type }: Props) {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<FormData>({
    defaultValues: { amount: 0, description: "", paymentMethod: "cash", date: new Date().toISOString().slice(0, 10) },
  });

  useEffect(() => {
    if (open) reset({ amount: 0, description: "", paymentMethod: "cash", date: new Date().toISOString().slice(0, 10) });
  }, [open, reset]);

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    if (!data.amount || data.amount <= 0) { enqueueSnackbar("Enter a valid amount", { variant: "warning" }); return; }
    try {
      await createTransaction(user.uid, customerId, {
        type,
        amount: Number(data.amount),
        description: data.description.trim(),
        paymentMethod: data.paymentMethod,
        date: Timestamp.fromDate(new Date(data.date)),
      });
      enqueueSnackbar(type === "credit" ? "Credit entry added" : "Payment received", { variant: "success" });
      onClose();
    } catch (e: any) {
      enqueueSnackbar(e?.message || "Failed to save", { variant: "error" });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{type === "credit" ? "You gave (credit)" : "You got (payment)"}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Amount" type="number" autoFocus inputMode="decimal" error={!!errors.amount}
              helperText={errors.amount?.message}
              {...register("amount", { valueAsNumber: true, required: "Amount required", min: { value: 0.01, message: "Must be > 0" } })} />
            <TextField label="Details (optional)" placeholder="e.g. Sugar 5kg" {...register("description")} />
            <TextField select label="Payment method" defaultValue="cash" {...register("paymentMethod")}>
              {methods.map((m) => <MenuItem key={m} value={m}>{m.toUpperCase()}</MenuItem>)}
            </TextField>
            <TextField label="Date" type="date" InputLabelProps={{ shrink: true }} {...register("date", { required: true })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" color={type === "credit" ? "error" : "success"} disabled={isSubmitting}>Save</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
