import { useEffect, useMemo, useState } from "react";
import {
  Box, Button, Card, CardContent, MenuItem, Skeleton, Stack, TextField, Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { useAuth } from "@/providers/AuthProvider";
import { Customer, Expense, Income, Transaction, subscribeCustomers, subscribeExpenses, subscribeIncome, txnsRef } from "@/lib/db";
import { getDocs } from "firebase/firestore";
import { fmtDate, fmtMoney } from "@/lib/format";

type Range = "today" | "week" | "month" | "year" | "all";

function since(range: Range): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (range === "today") return d.getTime();
  if (range === "week") { d.setDate(d.getDate() - 7); return d.getTime(); }
  if (range === "month") { d.setMonth(d.getMonth() - 1); return d.getTime(); }
  if (range === "year") { d.setFullYear(d.getFullYear() - 1); return d.getTime(); }
  return 0;
}

const RANGE_LABELS: Record<Range, string> = {
  today: "Today", week: "Last 7 Days", month: "Last 30 Days", year: "Last 1 Year", all: "All Time",
};

export default function ReportsPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [range, setRange] = useState<Range>("month");
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) return subscribeCustomers(user.uid, setCustomers); }, [user]);
  useEffect(() => { if (user) return subscribeExpenses(user.uid, setExpenses); }, [user]);
  useEffect(() => { if (user) return subscribeIncome(user.uid, setIncome); }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const all: Transaction[] = [];
      await Promise.all(customers.map(async (c) => {
        const s = await getDocs(txnsRef(user.uid, c.id));
        s.forEach((d) => all.push({ ...(d.data() as any), id: d.id, customerId: c.id }));
      }));
      if (!cancelled) { setTxns(all); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user, customers]);

  const from = since(range);
  const filteredTxns = useMemo(() => txns.filter((t) => t.date.toMillis() >= from), [txns, from]);
  const filteredExpenses = useMemo(() => expenses.filter((e) => e.date.toMillis() >= from), [expenses, from]);
  const filteredIncome = useMemo(() => income.filter((i) => i.date.toMillis() >= from), [income, from]);

  const got = filteredTxns.filter((t) => t.type === "payment").reduce((a, b) => a + b.amount, 0);
  const gave = filteredTxns.filter((t) => t.type === "credit").reduce((a, b) => a + b.amount, 0);
  const totalExpenses = filteredExpenses.reduce((a, b) => a + b.amount, 0);
  const totalIncome = filteredIncome.reduce((a, b) => a + b.amount, 0);
  const profit = got + totalIncome - totalExpenses;

  const custMap = useMemo(() => new Map(customers.map((c) => [c.id, c.name])), [customers]);

  const downloadCSV = () => {
    const header = "Date,Type,Category,Customer/Vendor,Amount,Method,Description\n";
    const txnRows = filteredTxns
      .map((t) => [
        t.date.toDate().toISOString().slice(0, 10),
        t.type === "payment" ? "Payment Received" : "Credit Given",
        "Customer",
        (custMap.get(t.customerId) || "").replace(/,/g, " "),
        t.amount,
        t.paymentMethod || "",
        (t.description || "").replace(/[,\n\r]/g, " "),
      ].join(","));
    const expRows = filteredExpenses.map((e) => [
      e.date.toDate().toISOString().slice(0, 10),
      "Expense",
      e.category,
      (e.vendor || "").replace(/,/g, " "),
      e.amount,
      "",
      (e.description || "").replace(/[,\n\r]/g, " "),
    ].join(","));
    const incRows = filteredIncome.map((i) => [
      i.date.toDate().toISOString().slice(0, 10),
      "Income",
      i.category,
      (i.source || "").replace(/,/g, " "),
      i.amount,
      "",
      (i.description || "").replace(/[,\n\r]/g, " "),
    ].join(","));
    const body = [...txnRows, ...expRows, ...incRows].join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `khatabook-report-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPDF = () => {
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Khata Book Report — ${RANGE_LABELS[range]}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 24px; color: #111; font-size: 13px; }
  h1 { color: #1976d2; margin-bottom: 4px; }
  .subtitle { color: #666; margin-bottom: 16px; font-size: 12px; }
  .summary { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
  .stat { background: #f5f5f5; padding: 10px 16px; border-radius: 8px; min-width: 120px; }
  .stat-label { font-size: 11px; color: #666; }
  .stat-value { font-size: 18px; font-weight: 800; margin-top: 2px; }
  .green { color: #2e7d32; } .red { color: #c62828; } .blue { color: #1565c0; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th { background: #1976d2; color: white; padding: 8px; text-align: left; font-size: 12px; }
  td { padding: 7px 8px; border-bottom: 1px solid #eee; font-size: 12px; }
  tr:nth-child(even) { background: #fafafa; }
  @media print { body { margin: 12px; } }
</style>
</head>
<body>
<h1>Khata Book Report</h1>
<div class="subtitle">Period: ${RANGE_LABELS[range]} &nbsp;·&nbsp; Generated: ${new Date().toLocaleDateString("en-IN")}</div>
<div class="summary">
  <div class="stat"><div class="stat-label">Money Received</div><div class="stat-value green">₹${got.toLocaleString("en-IN")}</div></div>
  <div class="stat"><div class="stat-label">Credit Given</div><div class="stat-value red">₹${gave.toLocaleString("en-IN")}</div></div>
  <div class="stat"><div class="stat-label">Expenses</div><div class="stat-value red">₹${totalExpenses.toLocaleString("en-IN")}</div></div>
  <div class="stat"><div class="stat-label">Other Income</div><div class="stat-value green">₹${totalIncome.toLocaleString("en-IN")}</div></div>
  <div class="stat"><div class="stat-label">Net Profit</div><div class="stat-value ${profit >= 0 ? "green" : "red"}">₹${profit.toLocaleString("en-IN")}</div></div>
</div>
${filteredTxns.length > 0 ? `
<h3>Customer Transactions (${filteredTxns.length})</h3>
<table>
  <tr><th>Date</th><th>Customer</th><th>Type</th><th>Amount</th><th>Method</th><th>Details</th></tr>
  ${filteredTxns.sort((a, b) => b.date.toMillis() - a.date.toMillis()).map((t) => `
  <tr>
    <td>${t.date.toDate().toLocaleDateString("en-IN")}</td>
    <td>${custMap.get(t.customerId) || ""}</td>
    <td style="color:${t.type === "payment" ? "#2e7d32" : "#c62828"}">${t.type === "payment" ? "Payment" : "Credit"}</td>
    <td>₹${t.amount.toLocaleString("en-IN")}</td>
    <td>${t.paymentMethod || "cash"}</td>
    <td>${t.description || ""}</td>
  </tr>`).join("")}
</table>` : ""}
${filteredExpenses.length > 0 ? `
<h3>Expenses (${filteredExpenses.length})</h3>
<table>
  <tr><th>Date</th><th>Category</th><th>Vendor</th><th>Amount</th><th>Details</th></tr>
  ${filteredExpenses.sort((a, b) => b.date.toMillis() - a.date.toMillis()).map((e) => `
  <tr>
    <td>${e.date.toDate().toLocaleDateString("en-IN")}</td>
    <td>${e.category}</td>
    <td>${e.vendor || ""}</td>
    <td style="color:#c62828">₹${e.amount.toLocaleString("en-IN")}</td>
    <td>${e.description || ""}</td>
  </tr>`).join("")}
</table>` : ""}
${filteredIncome.length > 0 ? `
<h3>Other Income (${filteredIncome.length})</h3>
<table>
  <tr><th>Date</th><th>Category</th><th>Source</th><th>Amount</th><th>Details</th></tr>
  ${filteredIncome.sort((a, b) => b.date.toMillis() - a.date.toMillis()).map((i) => `
  <tr>
    <td>${i.date.toDate().toLocaleDateString("en-IN")}</td>
    <td>${i.category}</td>
    <td>${i.source || ""}</td>
    <td style="color:#2e7d32">₹${i.amount.toLocaleString("en-IN")}</td>
    <td>${i.description || ""}</td>
  </tr>`).join("")}
</table>` : ""}
</body>
</html>`;
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  };

  const statCard = (label: string, value: string, color: string) => (
    <Card>
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="h6" fontWeight={800} color={color}>{value}</Typography>
      </CardContent>
    </Card>
  );

  return (
    <Stack spacing={2}>
      <TextField select label="Date range" value={range} onChange={(e) => setRange(e.target.value as Range)}>
        {(Object.keys(RANGE_LABELS) as Range[]).map((k) => (
          <MenuItem key={k} value={k}>{RANGE_LABELS[k]}</MenuItem>
        ))}
      </TextField>

      {loading ? (
        <Stack spacing={1}>{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} variant="rounded" height={72} />)}</Stack>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          {statCard("Money Received", fmtMoney(got), "success.main")}
          {statCard("Credit Given", fmtMoney(gave), "error.main")}
          {statCard("Expenses", fmtMoney(totalExpenses), "error.main")}
          {statCard("Other Income", fmtMoney(totalIncome), "success.main")}
          <Box sx={{ gridColumn: "1 / -1" }}>
            <Card sx={{ bgcolor: profit >= 0 ? "success.light" : "error.light" }}>
              <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Typography variant="caption">Net Profit (Received + Income − Expenses)</Typography>
                <Typography variant="h5" fontWeight={800} color={profit >= 0 ? "success.dark" : "error.dark"}>{fmtMoney(profit)}</Typography>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ gridColumn: "1 / -1" }}>
            {statCard(`Total Entries (${filteredTxns.length})`, `${filteredTxns.length} transactions`, "text.primary")}
          </Box>
        </Box>
      )}

      <Stack spacing={1}>
        <Button variant="contained" size="large" startIcon={<PictureAsPdfIcon />} onClick={printPDF} fullWidth>
          Download / Print PDF Report
        </Button>
        <Button variant="outlined" size="large" startIcon={<DownloadIcon />} onClick={downloadCSV} fullWidth>
          Download CSV (Excel)
        </Button>
        <Typography variant="caption" color="text.secondary" textAlign="center">
          CSV opens in Excel, Google Sheets, or LibreOffice.
        </Typography>
      </Stack>
    </Stack>
  );
}
