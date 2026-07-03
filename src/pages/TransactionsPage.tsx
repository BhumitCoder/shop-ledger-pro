import { useEffect, useMemo, useState } from "react";
import { Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { useAuth } from "@/providers/AuthProvider";
import { Customer, Transaction, subscribeCustomers, txnsRef } from "@/lib/db";
import { getDocs } from "firebase/firestore";
import { fmtDate, fmtMoney } from "@/lib/format";
import { useNavigate } from "react-router-dom";

interface Row extends Transaction { customerName: string }

export default function TransactionsPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => { if (user) return subscribeCustomers(user.uid, setCustomers); }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const all: Row[] = [];
      await Promise.all(customers.map(async (c) => {
        const snap = await getDocs(txnsRef(user.uid, c.id));
        snap.forEach((d) => { const t = d.data() as Transaction; all.push({ ...(t as any), id: d.id, customerId: c.id, customerName: c.name }); });
      }));
      all.sort((a, b) => b.date.toMillis() - a.date.toMillis());
      if (!cancelled) setRows(all);
    })();
    return () => { cancelled = true; };
  }, [user, customers]);

  const totals = useMemo(() => {
    let got = 0, gave = 0;
    rows.forEach((t) => { if (t.type === "payment") got += t.amount; else gave += t.amount; });
    return { got, gave };
  }, [rows]);

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1}>
        <Chip label={`Received ${fmtMoney(totals.got)}`} color="success" sx={{ flex: 1 }} />
        <Chip label={`Given ${fmtMoney(totals.gave)}`} color="error" sx={{ flex: 1 }} />
      </Stack>
      <Stack spacing={1}>
        {rows.length === 0 && (
          <Card><CardContent><Typography textAlign="center" color="text.secondary">No entries yet.</Typography></CardContent></Card>
        )}
        {rows.map((t) => (
          <Card key={`${t.customerId}-${t.id}`} onClick={() => nav(`/customers/${t.customerId}`)} sx={{ cursor: "pointer" }}>
            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography fontWeight={600}>{t.customerName}</Typography>
                  <Typography variant="caption" color="text.secondary">{t.description || (t.type === "credit" ? "Credit given" : "Payment received")}</Typography><br />
                  <Typography variant="caption" color="text.secondary">{fmtDate(t.date)} · {t.paymentMethod}</Typography>
                </Box>
                <Typography fontWeight={700} color={t.type === "credit" ? "error.main" : "success.main"}>
                  {t.type === "credit" ? "+" : "-"}{fmtMoney(t.amount)}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}
