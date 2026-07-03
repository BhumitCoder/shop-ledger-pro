import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, query, orderBy, onSnapshot, collectionGroup, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  openingBalance: number; // positive = customer owes you; negative = you owe them
  photoURL?: string;
  createdAt?: Timestamp;
}

export type TxnType = "credit" | "payment"; // credit = customer took goods (owes you), payment = customer paid you
export type PaymentMethod = "cash" | "upi" | "bank" | "cheque" | "card" | "other";

export interface Transaction {
  id: string;
  customerId: string;
  customerName?: string;
  type: TxnType;
  amount: number;
  description?: string;
  paymentMethod?: PaymentMethod;
  date: Timestamp; // when the txn happened
  createdAt?: Timestamp;
}

export const customersRef = (uid: string) => collection(db, "users", uid, "customers");
export const customerDoc = (uid: string, id: string) => doc(db, "users", uid, "customers", id);
export const txnsRef = (uid: string, customerId: string) =>
  collection(db, "users", uid, "customers", customerId, "transactions");
export const txnDoc = (uid: string, customerId: string, id: string) =>
  doc(db, "users", uid, "customers", customerId, "transactions", id);

export function subscribeCustomers(uid: string, cb: (rows: Customer[]) => void) {
  const q = query(customersRef(uid), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
  });
}

export async function createCustomer(uid: string, data: Omit<Customer, "id" | "createdAt">) {
  return addDoc(customersRef(uid), { ...data, createdAt: serverTimestamp() });
}
export async function updateCustomer(uid: string, id: string, data: Partial<Customer>) {
  return updateDoc(customerDoc(uid, id), data as any);
}
export async function deleteCustomer(uid: string, id: string) {
  // delete transactions subcollection first
  const txSnap = await getDocs(txnsRef(uid, id));
  await Promise.all(txSnap.docs.map((d) => deleteDoc(d.ref)));
  return deleteDoc(customerDoc(uid, id));
}

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

// All transactions across all customers (uses collectionGroup)
export function subscribeAllTransactions(uid: string, cb: (rows: Transaction[]) => void) {
  const q = query(
    collectionGroup(db, "transactions"),
    where("ownerId", "==", uid),
    orderBy("date", "desc"),
  );
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))));
}

/** Compute per-customer balance from transactions. Positive = customer owes user. */
export function computeBalance(opening: number, txns: Transaction[]): number {
  return txns.reduce((bal, t) => bal + (t.type === "credit" ? t.amount : -t.amount), opening || 0);
}
