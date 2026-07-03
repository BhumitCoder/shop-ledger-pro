import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { app } from "@/lib/firebase";

const storage = getStorage(app);

export async function uploadReceiptPhoto(uid: string, file: File): Promise<string> {
  const storageRef = ref(storage, `users/${uid}/receipts/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function uploadCustomerPhoto(uid: string, customerId: string, file: File): Promise<string> {
  const storageRef = ref(storage, `users/${uid}/customers/${customerId}/photo`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function deleteStorageFile(url: string) {
  try {
    const fileRef = ref(storage, url);
    await deleteObject(fileRef);
  } catch (_) {}
}
