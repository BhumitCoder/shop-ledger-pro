export const fmtMoney = (n: number) => {
  const v = Math.abs(n || 0);
  return "₹" + v.toLocaleString("en-IN", { maximumFractionDigits: 2 });
};

export const fmtDate = (d: Date | { toDate: () => Date } | undefined | null) => {
  if (!d) return "";
  const date = (d as any).toDate ? (d as any).toDate() : (d as Date);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export const startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export const endOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
