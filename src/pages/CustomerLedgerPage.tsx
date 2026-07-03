import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Avatar, Box, Button, Card, CardContent, Chip, Divider, IconButton, Menu, MenuItem, Stack, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CallIcon from "@mui/icons-material/Call";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useAuth } from "@/providers/AuthProvider";
import { Customer, Transaction, computeBalance, customerDoc, deleteCustomer, deleteTransaction, subscribeTransactions } from "@/lib/db";
import { onSnapshot } from "firebase/firestore";
import { fmtDate, fmtMoney } from "@/lib/format";
import { TransactionFormDialog } from "@/components/TransactionFormDialog";
import { CustomerFormDialog } from "@/components/CustomerFormDialog";
import { useSnackbar } from "notistack";

export default function CustomerLedgerPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [txnType, setTxnType] = useState<"credit" | "payment" | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [menu, setMenu] = useState<null | HTMLElement>(null);

  useEffect(() => {
    if (!user || !id) return;
    return onSnapshot(customerDoc(user.uid, id), (snap) => {
      if (snap.exists()) setCustomer({ id: snap.id, ...(snap.data() as any) });
      else nav("/customers", { replace: true });
    });
  }, [user, id, nav]);

  useEffect(() => {
    if (!user || !id) return;
    return subscribeTransactions(user.uid, id, setTxns);
  }, [user, id]);

  const balance = useMemo(() => computeBalance(customer?.openingBalance || 0, txns), [customer, txns]);
  const totalCredit = txns.filter((t) => t.type === "credit").reduce((a, b) => a + b.amount, 0);
  const totalPaid = txns.filter((t) => t.type === "payment").reduce((a, b) => a + b.amount, 0);

  // Build running balance (oldest -> newest)
  const rows = useMemo(() => {
    const ordered = [...txns].sort((a, b) => a.date.toMillis() - b.date.toMillis());
    let run = customer?.openingBalance || 0;
    const withRun = ordered.map((t) => {
      run += t.type === "credit" ? t.amount : -t.amount;
      return { ...t, running: run };
    });
    return withRun.reverse();
  }, [txns, customer]);

  if (!customer) return null;

  const handleDelete = async () => {
    if (!user) return;
    if (!confirm(`Delete ${customer.name} and all their entries? This cannot be undone.`)) return;
    try {
      await deleteCustomer(user.uid, customer.id);
      enqueueSnackbar("Customer deleted", { variant: "success" });
      nav("/customers", { replace: true });
    } catch (e: any) { enqueueSnackbar(e?.message || "Delete failed", { variant: "error" }); }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton onClick={() => nav(-1)}><ArrowBackIcon /></IconButton>
        <Avatar sx={{ bgcolor: "primary.main" }}>{customer.name[0]?.toUpperCase()}</Avatar>
        <Box flex={1} minWidth={0}>
          <Typography fontWeight={700} noWrap>{customer.name}</Typography>
          <Typography variant="caption" color="text.secondary">{customer.phone || "No phone"}</Typography>
        </Box>
        {customer.phone && (
          <>
            <IconButton color="primary" component="a" href={`tel:${customer.phone}`} aria-label="call"><CallIcon /></IconButton>
            <IconButton sx={{ color: "#25D366" }} component="a" href={`https://wa.me/${customer.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener" aria-label="whatsapp"><WhatsAppIcon /></IconButton>
          </>
        )}
        <IconButton onClick={(e) => setMenu(e.currentTarget)}><MoreVertIcon /></IconButton>
        <Menu open={!!menu} anchorEl={menu} onClose={() => setMenu(null)}>
          <MenuItem onClick={() => { setEditOpen(true); setMenu(null); }}>Edit customer</MenuItem>
          <MenuItem onClick={() => { setMenu(null); handleDelete(); }} sx={{ color: "error.main" }}>Delete customer</MenuItem>
        </Menu>
      </Stack>

      <Card sx={{ background: balance > 0 ? "linear-gradient(135deg,#2e7d32,#43a047)" : balance < 0 ? "linear-gradient(135deg,#c62828,#e53935)" : "linear-gradient(135deg,#546e7a,#78909c)", color: "white" }}>
        <CardContent>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>{balance > 0 ? "You will get" : balance < 0 ? "You will give" : "All settled"}</Typography>
          <Typography variant="h4" fontWeight={800}>{fmtMoney(balance)}</Typography>
          <Stack direction="row" spacing={1} mt={1}>
            <Chip size="small" label={`Credit ${fmtMoney(totalCredit)}`} sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white" }} />
            <Chip size="small" label={`Paid ${fmtMoney(totalPaid)}`} sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white" }} />
          </Stack>
        </CardContent>
      </Card>

      <Typography variant="subtitle1" fontWeight={700}>Ledger</Typography>
      <Stack spacing={1}>
        {rows.length === 0 && (
          <Card><CardContent><Typography color="text.secondary" textAlign="center">No entries yet. Add one below.</Typography></CardContent></Card>
        )}
        {rows.map((t) => (
          <Card key={t.id}>
            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography fontWeight={600}>{t.description || (t.type === "credit" ? "Credit given" : "Payment received")}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {fmtDate(t.date)} · {t.paymentMethod || "cash"}
                  </Typography>
                </Box>
                <Box textAlign="right">
                  <Typography fontWeight={700} color={t.type === "credit" ? "error.main" : "success.main"}>
                    {t.type === "credit" ? "+" : "-"}{fmtMoney(t.amount)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Bal {fmtMoney((t as any).running)}</Typography>
                </Box>
              </Stack>
              <Divider sx={{ my: 1 }} />
              <Button size="small" color="error" onClick={async () => {
                if (!user) return;
                if (!confirm("Delete this entry?")) return;
                try { await deleteTransaction(user.uid, customer.id, t.id); enqueueSnackbar("Entry deleted", { variant: "success" }); }
                catch (e: any) { enqueueSnackbar(e?.message, { variant: "error" }); }
              }}>Delete</Button>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Fixed bottom action bar */}
      <Box sx={{ position: "fixed", left: 0, right: 0, bottom: 68, zIndex: 15, p: 1.5, bgcolor: "background.paper", borderTop: 1, borderColor: "divider" }}>
        <Stack direction="row" spacing={1} maxWidth="sm" mx="auto">
          <Button fullWidth size="large" variant="contained" color="error" onClick={() => setTxnType("credit")}>You gave ₹</Button>
          <Button fullWidth size="large" variant="contained" color="success" onClick={() => setTxnType("payment")}>You got ₹</Button>
        </Stack>
      </Box>

      <TransactionFormDialog
        open={!!txnType}
        onClose={() => setTxnType(null)}
        customerId={customer.id}
        type={txnType || "credit"}
      />
      <CustomerFormDialog open={editOpen} onClose={() => setEditOpen(false)} customer={customer} />
    </Stack>
  );
}
