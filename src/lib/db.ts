import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, query, orderBy, onSnapshot, where, getDocs, Timestamp, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// ─── Customer ────────────────────────────────────────────────────────────────
export interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  openingBalance: number;
  photoURL?: string;
  createdAt?: Timestamp;
}

export type TxnType = "credit" | "payment";
export type PaymentMethod = "cash" | "upi" | "bank" | "cheque" | "card" | "other";

export interface Transaction {
  id: string;
  customerId: string;
  customerName?: string;
  type: TxnType;
  amount: number;
  description?: string;
  paymentMethod?: PaymentMethod;
  receiptUrl?: string;
  date: Timestamp;
  createdAt?: Timestamp;
}

// ─── Expense ─────────────────────────────────────────────────────────────────
export interface Expense {
  id: string;
  category: string;
  vendor?: string;
  amount: number;
  description?: string;
  receiptUrl?: string;
  date: Timestamp;
  createdAt?: Timestamp;
}

// ─── Income ──────────────────────────────────────────────────────────────────
export interface Income {
  id: string;
  category: string;
  source?: string;
  amount: number;
  description?: string;
  date: Timestamp;
  createdAt?: Timestamp;
}

// ─── Business Profile ────────────────────────────────────────────────────────
export interface BusinessProfile {
  businessName: string;
  ownerName: string;
  phone: string;
  address: string;
}

// ─── Refs ────────────────────────────────────────────────────────────────────
export const customersRef = (uid: string) => collection(db, "users", uid, "customers");
export const customerDoc = (uid: string, id: string) => doc(db, "users", uid, "customers", id);
export const txnsRef = (uid: string, customerId: string) => collection(db, "users", uid, "customers", customerId, "transactions");
export const txnDoc = (uid: string, customerId: string, id: string) => doc(db, "users", uid, "customers", customerId, "transactions", id);
export const expensesRef = (uid: string) => collection(db, "users", uid, "expenses");
export const incomeRef = (uid: string) => collection(db, "users", uid, "income");
export const profileDocRef = (uid: string) => doc(db, "users", uid, "profile", "data");

// ─── Customers ───────────────────────────────────────────────────────────────
export function subscribeCustomers(uid: string, cb: (rows: Customer[]) => void) {
  const q = query(customersRef(uid), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))));
}
export async function createCustomer(uid: string, data: Omit<Customer, "id" | "createdAt">) {
  return addDoc(customersRef(uid), { ...data, createdAt: serverTimestamp() });
}
export async function updateCustomer(uid: string, id: string, data: Partial<Customer>) {
  return updateDoc(customerDoc(uid, id), data as any);
}
export async function deleteCustomer(uid: string, id: string) {
  const txSnap = await getDocs(txnsRef(uid, id));
  await Promise.all(txSnap.docs.map((d) => deleteDoc(d.ref)));
  return deleteDoc(customerDoc(uid, id));
}

// ─── Transactions ────────────────────────────────────────────────────────────
export function subscribeTransactions(uid: string, customerId: string, cb: (rows: Transaction[]) => void) {
  const q = query(txnsRef(uid, customerId), orderBy("date", "desc"));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, customerId, ...(d.data() as any) }))));
}
export async function createTransaction(uid: string, customerId: string, data: Omit<Transaction, "id" | "customerId" | "createdAt">) {
  return addDoc(txnsRef(uid, customerId), { ...data, createdAt: serverTimestamp() });
}
export async function updateTransaction(uid: string, customerId: string, id: string, data: Partial<Transaction>) {
  return updateDoc(txnDoc(uid, customerId, id), data as any);
}
export async function deleteTransaction(uid: string, customerId: string, id: string) {
  return deleteDoc(txnDoc(uid, customerId, id));
}

// ─── Expenses ────────────────────────────────────────────────────────────────
export function subscribeExpenses(uid: string, cb: (rows: Expense[]) => void) {
  const q = query(expensesRef(uid), orderBy("date", "desc"));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))));
}
export async function createExpense(uid: string, data: Omit<Expense, "id" | "createdAt">) {
  return addDoc(expensesRef(uid), { ...data, createdAt: serverTimestamp() });
}
export async function deleteExpense(uid: string, id: string) {
  return deleteDoc(doc(db, "users", uid, "expenses", id));
}

// ─── Income ──────────────────────────────────────────────────────────────────
export function subscribeIncome(uid: string, cb: (rows: Income[]) => void) {
  const q = query(incomeRef(uid), orderBy("date", "desc"));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))));
}
export async function createIncome(uid: string, data: Omit<Income, "id" | "createdAt">) {
  return addDoc(incomeRef(uid), { ...data, createdAt: serverTimestamp() });
}
export async function deleteIncome(uid: string, id: string) {
  return deleteDoc(doc(db, "users", uid, "income", id));
}

// ─── Business Profile ────────────────────────────────────────────────────────
export async function getProfile(uid: string): Promise<BusinessProfile | null> {
  const snap = await getDoc(profileDocRef(uid));
  return snap.exists() ? (snap.data() as BusinessProfile) : null;
}
export async function saveProfile(uid: string, data: BusinessProfile) {
  return setDoc(profileDocRef(uid), data, { merge: true });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
export function computeBalance(opening: number, txns: Transaction[]): number {
  return txns.reduce((bal, t) => bal + (t.type === "credit" ? t.amount : -t.amount), opening || 0);
}

// ─── Backup / Restore ────────────────────────────────────────────────────────
export async function exportAllData(uid: string) {
  const customers: any[] = [];
  const custSnap = await getDocs(customersRef(uid));
  for (const cd of custSnap.docs) {
    const cust = { id: cd.id, ...cd.data(), transactions: [] as any[] };
    const txSnap = await getDocs(txnsRef(uid, cd.id));
    txSnap.forEach((td) => cust.transactions.push({ id: td.id, ...td.data() }));
    customers.push(cust);
  }
  const expSnap = await getDocs(expensesRef(uid));
  const expenses = expSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const incSnap = await getDocs(incomeRef(uid));
  const income = incSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const profSnap = await getDoc(profileDocRef(uid));
  const profile = profSnap.exists() ? profSnap.data() : {};
  return { customers, expenses, income, profile, exportedAt: new Date().toISOString() };
}

export async function importAllData(uid: string, data: any) {
  if (data.profile) await setDoc(profileDocRef(uid), data.profile, { merge: true });
  if (Array.isArray(data.customers)) {
    for (const c of data.customers) {
      const { id, transactions, ...cData } = c;
      await setDoc(customerDoc(uid, id), { ...cData }, { merge: true });
      if (Array.isArray(transactions)) {
        for (const t of transactions) {
          const { id: tid, ...tData } = t;
          await setDoc(txnDoc(uid, id, tid), { ...tData }, { merge: true });
        }
      }
    }
  }
  if (Array.isArray(data.expenses)) {
    for (const e of data.expenses) {
      const { id, ...eData } = e;
      await setDoc(doc(db, "users", uid, "expenses", id), { ...eData }, { merge: true });
    }
  }
  if (Array.isArray(data.income)) {
    for (const i of data.income) {
      const { id, ...iData } = i;
      await setDoc(doc(db, "users", uid, "income", id), { ...iData }, { merge: true });
    }
  }
}
