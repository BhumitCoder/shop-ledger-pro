import { useEffect, useMemo, useState } from "react";
import { Button, Card, CardContent, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useAuth } from "@/providers/AuthProvider";
import { Customer, Transaction, subscribeCustomers, txnsRef } from "@/lib/db";
import { getDocs } from "firebase/firestore";
import { fmtMoney } from "@/lib/format";

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

export default function ReportsPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [range, setRange] = useState<Range>("month");

  useEffect(() => { if (user) return subscribeCustomers(user.uid, setCustomers); }, [user]);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const all: Transaction[] = [];
      await Promise.all(customers.map(async (c) => {
        const s = await getDocs(txnsRef(user.uid, c.id));
        s.forEach((d) => all.push({ ...(d.data() as any), id: d.id, customerId: c.id }));
      }));
      if (!cancelled) setTxns(all);
    })();
    return () => { cancelled = true; };
  }, [user, customers]);

  const filtered = useMemo(() => {
    const from = since(range);
    return txns.filter((t) => t.date.toMillis() >= from);
  }, [txns, range]);

  const got = filtered.filter((t) => t.type === "payment").reduce((a, b) => a + b.amount, 0);
  const gave = filtered.filter((t) => t.type === "credit").reduce((a, b) => a + b.amount, 0);

  const downloadCSV = () => {
    const map = new Map(customers.map((c) => [c.id, c.name]));
    const header = "Date,Customer,Type,Amount,Method,Description\n";
    const body = filtered
      .slice()
      .sort((a, b) => a.date.toMillis() - b.date.toMillis())
      .map((t) => [
        t.date.toDate().toISOString().slice(0, 10),
        (map.get(t.customerId) || "").replace(/,/g, " "),
        t.type,
        t.amount,
        t.paymentMethod || "",
        (t.description || "").replace(/[,\n\r]/g, " "),
      ].join(","))
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `khatabook-${range}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Stack spacing={2}>
      <TextField select label="Date range" value={range} onChange={(e) => setRange(e.target.value as Range)}>
        <MenuItem value="today">Today</MenuItem>
        <MenuItem value="week">Last 7 days</MenuItem>
        <MenuItem value="month">Last 30 days</MenuItem>
        <MenuItem value="year">Last 1 year</MenuItem>
        <MenuItem value="all">All time</MenuItem>
      </TextField>

      <Card><CardContent>
        <Typography variant="body2" color="text.secondary">Money received</Typography>
        <Typography variant="h5" fontWeight={800} color="success.main">{fmtMoney(got)}</Typography>
      </CardContent></Card>
      <Card><CardContent>
        <Typography variant="body2" color="text.secondary">Credit given</Typography>
        <Typography variant="h5" fontWeight={800} color="error.main">{fmtMoney(gave)}</Typography>
      </CardContent></Card>
      <Card><CardContent>
        <Typography variant="body2" color="text.secondary">Net cash flow</Typography>
        <Typography variant="h5" fontWeight={800}>{fmtMoney(got - gave)}</Typography>
      </CardContent></Card>

      <Button variant="contained" size="large" onClick={downloadCSV}>Download report (CSV)</Button>
      <Typography variant="caption" color="text.secondary" textAlign="center">
        Excel-compatible CSV. Open with Excel, Google Sheets, or LibreOffice.
      </Typography>
    </Stack>
  );
}
