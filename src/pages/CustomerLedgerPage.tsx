import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Avatar, Box, Button, Card, CardContent, Chip, CircularProgress,
  Divider, IconButton, Menu, MenuItem, Skeleton, Stack, Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CallIcon from "@mui/icons-material/Call";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import EditIcon from "@mui/icons-material/Edit";
import { useAuth } from "@/providers/AuthProvider";
import {
  Customer, Transaction, computeBalance, customerDoc,
  deleteCustomer, deleteTransaction, subscribeTransactions,
} from "@/lib/db";
import { onSnapshot } from "firebase/firestore";
import { fmtDate, fmtMoney } from "@/lib/format";
import { TransactionFormDialog } from "@/components/TransactionFormDialog";
import { CustomerFormDialog } from "@/components/CustomerFormDialog";
import { useSnackbar } from "notistack";
import { uploadCustomerPhoto } from "@/lib/storage";
import { buildLedgerPdf, shareOrDownloadPdf } from "@/lib/pdf";
import ShareIcon from "@mui/icons-material/Share";
import DownloadIcon from "@mui/icons-material/Download";

export default function CustomerLedgerPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const photoRef = useRef<HTMLInputElement>(null);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [txnType, setTxnType] = useState<"credit" | "payment" | null>(null);
  const [editTxn, setEditTxn] = useState<Transaction | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [menu, setMenu] = useState<null | HTMLElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    return onSnapshot(customerDoc(user.uid, id), (snap) => {
      if (snap.exists()) setCustomer({ id: snap.id, ...(snap.data() as any) });
      else nav("/customers", { replace: true });
    });
  }, [user, id, nav]);

  useEffect(() => {
    if (!user || !id) return;
    setLoading(true);
    return subscribeTransactions(user.uid, id, (rows) => { setTxns(rows); setLoading(false); });
  }, [user, id]);

  const balance = useMemo(() => computeBalance(customer?.openingBalance || 0, txns), [customer, txns]);
  const totalCredit = txns.filter((t) => t.type === "credit").reduce((a, b) => a + b.amount, 0);
  const totalPaid = txns.filter((t) => t.type === "payment").reduce((a, b) => a + b.amount, 0);

  const rows = useMemo(() => {
    const ordered = [...txns].sort((a, b) => a.date.toMillis() - b.date.toMillis());
    let run = customer?.openingBalance || 0;
    return ordered.map((t) => { run += t.type === "credit" ? t.amount : -t.amount; return { ...t, running: run }; }).reverse();
  }, [txns, customer]);

  const handleDelete = async () => {
    if (!user) return;
    if (!confirm(`Delete ${customer?.name} and all their entries? This cannot be undone.`)) return;
    try {
      await deleteCustomer(user.uid, customer!.id);
      enqueueSnackbar("Customer deleted", { variant: "success" });
      nav("/customers", { replace: true });
    } catch (e: any) { enqueueSnackbar(e?.message || "Delete failed", { variant: "error" }); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !customer) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadCustomerPhoto(user.uid, customer.id, file);
      const { updateCustomer } = await import("@/lib/db");
      await updateCustomer(user.uid, customer.id, { photoURL: url });
      enqueueSnackbar("Photo updated!", { variant: "success" });
    } catch (e: any) {
      enqueueSnackbar(e?.message || "Upload failed", { variant: "error" });
    } finally {
      setUploadingPhoto(false);
      if (photoRef.current) photoRef.current.value = "";
    }
  };

  const [generatingPdf, setGeneratingPdf] = useState(false);

  const generatePdf = async (action: "share" | "download") => {
    if (!customer) return;
    if (generatingPdf) return;
    if (!customer.name?.trim()) {
      enqueueSnackbar("Customer name missing", { variant: "warning" });
      return;
    }
    if (rows.length === 0) {
      enqueueSnackbar("No entries to export yet", { variant: "info" });
      return;
    }
    setGeneratingPdf(true);
    try {
      const doc = buildLedgerPdf({
        customerName: customer.name,
        customerPhone: customer.phone,
        balance,
        totalCredit,
        totalPaid,
        rows: rows.slice().reverse() as any, // chronological order in PDF
      });
      const safeName = customer.name.replace(/[^a-z0-9]+/gi, "_").slice(0, 40) || "customer";
      const filename = `Ledger_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`;
      if (action === "share") {
        const result = await shareOrDownloadPdf(doc, filename, `Ledger — ${customer.name}`);
        enqueueSnackbar(result === "shared" ? "Ready to share" : "Sharing not supported — downloaded instead", { variant: "success" });
      } else {
        doc.save(filename);
        enqueueSnackbar("PDF downloaded", { variant: "success" });
      }
    } catch (e: any) {
      enqueueSnackbar(e?.message || "Failed to generate PDF", { variant: "error" });
    } finally {
      setGeneratingPdf(false);
    }
  };


  if (!customer) {
    return (
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Skeleton animation="wave" variant="circular" width={44} height={44} />
          <Box flex={1}>
            <Skeleton animation="wave" width="55%" height={20} />
            <Skeleton animation="wave" width="38%" height={14} sx={{ mt: 0.5 }} />
          </Box>
          <Skeleton animation="wave" variant="circular" width={36} height={36} />
          <Skeleton animation="wave" variant="circular" width={36} height={36} />
        </Stack>
        <Skeleton animation="wave" variant="rounded" height={108} />
        <Stack direction="row" spacing={1}>
          <Skeleton animation="wave" variant="rounded" height={36} sx={{ flex: 1 }} />
          <Skeleton animation="wave" variant="rounded" height={36} sx={{ flex: 1 }} />
        </Stack>
        <Skeleton animation="wave" width={60} height={20} />
        {[1, 2, 3].map((i) => <Skeleton animation="wave" key={i} variant="rounded" height={90} />)}
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton onClick={() => nav(-1)}><ArrowBackIcon /></IconButton>
        <Box sx={{ position: "relative", cursor: "pointer" }} onClick={() => photoRef.current?.click()}>
          <Avatar
            src={customer.photoURL}
            sx={{ bgcolor: "primary.main", width: 44, height: 44 }}
          >
            {customer.name[0]?.toUpperCase()}
          </Avatar>
          {uploadingPhoto ? (
            <CircularProgress size={16} sx={{ position: "absolute", bottom: -2, right: -2 }} />
          ) : (
            <Box sx={{ position: "absolute", bottom: -2, right: -2, bgcolor: "white", borderRadius: "50%", p: "1px" }}>
              <PhotoCameraIcon sx={{ fontSize: 12, color: "text.secondary" }} />
            </Box>
          )}
        </Box>
        <input ref={photoRef} type="file" accept="image/*" hidden onChange={handlePhotoUpload} />
        <Box flex={1} minWidth={0}>
          <Typography fontWeight={700} noWrap>{customer.name}</Typography>
          <Typography variant="caption" color="text.secondary">{customer.phone || "No phone"}</Typography>
        </Box>
        {customer.phone && (
          <>
            <IconButton color="primary" component="a" href={`tel:${customer.phone}`}><CallIcon /></IconButton>
            <IconButton sx={{ color: "#25D366" }} component="a" href={`https://wa.me/${customer.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener"><WhatsAppIcon /></IconButton>
          </>
        )}
        <IconButton onClick={(e) => setMenu(e.currentTarget)}><MoreVertIcon /></IconButton>
        <Menu open={!!menu} anchorEl={menu} onClose={() => setMenu(null)}>
          <MenuItem onClick={() => { setEditOpen(true); setMenu(null); }}>Edit customer</MenuItem>
          <MenuItem disabled={generatingPdf} onClick={() => { setMenu(null); generatePdf("download"); }}><DownloadIcon fontSize="small" sx={{ mr: 1 }} />Download PDF</MenuItem>
          <MenuItem disabled={generatingPdf} onClick={() => { setMenu(null); generatePdf("share"); }}><ShareIcon fontSize="small" sx={{ mr: 1 }} />Share PDF</MenuItem>
          <MenuItem onClick={() => { setMenu(null); handleDelete(); }} sx={{ color: "error.main" }}>Delete customer</MenuItem>
        </Menu>
      </Stack>

      {/* Balance card */}
      <Card sx={{
        background: balance > 0
          ? "linear-gradient(135deg,#2e7d32,#43a047)"
          : balance < 0
          ? "linear-gradient(135deg,#c62828,#e53935)"
          : "linear-gradient(135deg,#546e7a,#78909c)",
        color: "white",
      }}>
        <CardContent>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {balance > 0 ? "You will get" : balance < 0 ? "You will give" : "All settled"}
          </Typography>
          <Typography variant="h4" fontWeight={800}>{fmtMoney(Math.abs(balance))}</Typography>
          <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
            <Chip size="small" label={`Credit ${fmtMoney(totalCredit)}`} sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white" }} />
            <Chip size="small" label={`Paid ${fmtMoney(totalPaid)}`} sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white" }} />
          </Stack>
        </CardContent>
      </Card>

      {/* PDF share buttons */}
      <Stack direction="row" spacing={1}>
        <Button fullWidth variant="outlined" startIcon={<ShareIcon />} onClick={() => generatePdf("share")} size="small" disabled={generatingPdf || rows.length === 0}>
          {generatingPdf ? "Generating…" : "Share Ledger"}
        </Button>
        <Button fullWidth variant="outlined" startIcon={<DownloadIcon />} onClick={() => generatePdf("download")} size="small" disabled={generatingPdf || rows.length === 0}>
          Download PDF
        </Button>
      </Stack>

      <Typography variant="subtitle1" fontWeight={700}>Ledger</Typography>

      {/* Transactions */}
      {loading ? (
        <Stack spacing={1}>{[1, 2, 3].map((i) => <Skeleton animation="wave" key={i} variant="rounded" height={90} />)}</Stack>
      ) : (
        <Stack spacing={1}>
          {rows.length === 0 && (
            <Card><CardContent>
              <Typography color="text.secondary" textAlign="center">No entries yet. Use the buttons below to add credit or payment.</Typography>
            </CardContent></Card>
          )}
          {rows.map((t) => (
            <Card key={t.id}>
              <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box flex={1} minWidth={0} pr={1}>
                    <Typography fontWeight={600} noWrap>
                      {t.description || (t.type === "credit" ? "Credit given" : "Payment received")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {fmtDate(t.date)} · {t.paymentMethod || "cash"}
                    </Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography fontWeight={700} color={t.type === "credit" ? "error.main" : "success.main"}>
                      {t.type === "credit" ? "+" : "−"}{fmtMoney(t.amount)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Bal {fmtMoney(Math.abs((t as any).running))}</Typography>
                  </Box>
                </Stack>
                {t.receiptUrl && (
                  <Box mt={1}>
                    <img src={t.receiptUrl} alt="receipt" style={{ maxWidth: "100%", maxHeight: 120, borderRadius: 6, objectFit: "cover" }} />
                  </Box>
                )}
                <Divider sx={{ my: 1 }} />
                <Stack direction="row" spacing={1}>
                  <Button size="small" startIcon={<EditIcon />} onClick={() => setEditTxn(t)}>Edit</Button>
                  <Button size="small" color="error" onClick={async () => {
                    if (!user || !confirm("Delete this entry?")) return;
                    try { await deleteTransaction(user.uid, customer.id, t.id); enqueueSnackbar("Entry deleted", { variant: "success" }); }
                    catch (e: any) { enqueueSnackbar(e?.message, { variant: "error" }); }
                  }}>Delete</Button>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Fixed bottom bar — sits on top of the bottom nav bar */}
      <Box sx={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: "calc(64px + env(safe-area-inset-bottom))",
        zIndex: 15,
        p: 1.5,
        bgcolor: "background.paper",
        borderTop: 1,
        borderColor: "divider",
      }}>
        <Stack direction="row" spacing={1} maxWidth="sm" mx="auto">
          <Button fullWidth size="large" variant="contained" color="error" onClick={() => setTxnType("credit")}>
            You gave ₹
          </Button>
          <Button fullWidth size="large" variant="contained" color="success" onClick={() => setTxnType("payment")}>
            You got ₹
          </Button>
        </Stack>
      </Box>

      {/* Spacer so last card isn't hidden behind both fixed bars */}
      <Box sx={{ height: "calc(80px + 64px + env(safe-area-inset-bottom))" }} />

      {/* Add new transaction */}
      <TransactionFormDialog
        open={!!txnType}
        onClose={() => setTxnType(null)}
        customerId={customer.id}
        type={txnType || "credit"}
      />
      {/* Edit existing transaction */}
      <TransactionFormDialog
        open={!!editTxn}
        onClose={() => setEditTxn(null)}
        customerId={customer.id}
        type={editTxn?.type || "credit"}
        transaction={editTxn}
      />
      <CustomerFormDialog open={editOpen} onClose={() => setEditOpen(false)} customer={customer} />
    </Stack>
  );
}
