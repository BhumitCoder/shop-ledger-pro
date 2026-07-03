import { useEffect, useRef, useState } from "react";
import {
  Avatar, Button, Card, CardContent, CircularProgress, Divider,
  Stack, Switch, TextField, Typography,
} from "@mui/material";
import BusinessIcon from "@mui/icons-material/Business";
import BackupIcon from "@mui/icons-material/Backup";
import RestoreIcon from "@mui/icons-material/Restore";
import { useAuth } from "@/providers/AuthProvider";
import { auth } from "@/lib/firebase";
import { sendEmailVerification, signOut } from "firebase/auth";
import { useThemeMode } from "@/theme/ThemeModeProvider";
import { useSnackbar } from "notistack";
import { BusinessProfile, exportAllData, getProfile, importAllData, saveProfile } from "@/lib/db";

export default function SettingsPage() {
  const { user } = useAuth();
  const { mode, toggle } = useThemeMode();
  const { enqueueSnackbar } = useSnackbar();
  const fileRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<BusinessProfile>({ businessName: "", ownerName: "", phone: "", address: "" });
  const [saving, setSaving] = useState(false);
  const [backing, setBacking] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (!user) return;
    getProfile(user.uid).then((p) => { if (p) setProfile(p); });
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await saveProfile(user.uid, profile);
      enqueueSnackbar("Business profile saved", { variant: "success" });
    } catch (e: any) {
      enqueueSnackbar(e?.message || "Failed to save", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    if (!user) return;
    setBacking(true);
    try {
      const data = await exportAllData(user.uid);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `khatabook-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      enqueueSnackbar("Backup downloaded!", { variant: "success" });
    } catch (e: any) {
      enqueueSnackbar(e?.message || "Backup failed", { variant: "error" });
    } finally {
      setBacking(false);
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!confirm("This will merge backup data into your account. Continue?")) return;
    setRestoring(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importAllData(user.uid, data);
      enqueueSnackbar("Data restored successfully!", { variant: "success" });
    } catch (e: any) {
      enqueueSnackbar(e?.message || "Restore failed — invalid backup file", { variant: "error" });
    } finally {
      setRestoring(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Stack spacing={2}>
      {/* User profile card */}
      <Card>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{ width: 56, height: 56, bgcolor: "primary.main", fontSize: 24 }}>
              {(user?.displayName || user?.email || "?")[0].toUpperCase()}
            </Avatar>
            <Stack>
              <Typography fontWeight={700}>{user?.displayName || profile.ownerName || "No name"}</Typography>
              <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
              <Typography variant="caption" color={user?.emailVerified ? "success.main" : "warning.main"}>
                {user?.emailVerified ? "✓ Email verified" : "⚠ Email not verified"}
              </Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {!user?.emailVerified && (
        <Button variant="outlined" onClick={async () => {
          try { await sendEmailVerification(user!); enqueueSnackbar("Verification email sent", { variant: "success" }); }
          catch (e: any) { enqueueSnackbar(e?.message, { variant: "error" }); }
        }}>Send verification email</Button>
      )}

      {/* Business profile */}
      <Card>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" mb={2}>
            <BusinessIcon color="primary" />
            <Typography fontWeight={700}>Business Profile</Typography>
          </Stack>
          <Stack spacing={2}>
            <TextField
              label="Business Name"
              size="small"
              value={profile.businessName}
              onChange={(e) => setProfile((p) => ({ ...p, businessName: e.target.value }))}
            />
            <TextField
              label="Owner Name"
              size="small"
              value={profile.ownerName}
              onChange={(e) => setProfile((p) => ({ ...p, ownerName: e.target.value }))}
            />
            <TextField
              label="Phone"
              size="small"
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
            />
            <TextField
              label="Address"
              size="small"
              multiline
              minRows={2}
              value={profile.address}
              onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))}
            />
            <Button variant="contained" onClick={handleSaveProfile} disabled={saving}>
              {saving ? <CircularProgress size={20} /> : "Save Profile"}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography>Dark mode</Typography>
            <Switch checked={mode === "dark"} onChange={toggle} />
          </Stack>
          <Divider sx={{ my: 1 }} />
          <Typography variant="caption" color="text.secondary">
            Data auto-syncs with Firebase and works offline.
          </Typography>
        </CardContent>
      </Card>

      {/* Backup & Restore */}
      <Card>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" mb={2}>
            <BackupIcon color="primary" />
            <Typography fontWeight={700}>Backup & Restore</Typography>
          </Stack>
          <Stack spacing={1.5}>
            <Button
              variant="outlined"
              startIcon={backing ? <CircularProgress size={16} /> : <BackupIcon />}
              onClick={handleBackup}
              disabled={backing}
              fullWidth
            >
              Download Backup (JSON)
            </Button>
            <Button
              variant="outlined"
              color="warning"
              startIcon={restoring ? <CircularProgress size={16} /> : <RestoreIcon />}
              onClick={() => fileRef.current?.click()}
              disabled={restoring}
              fullWidth
            >
              {restoring ? "Restoring…" : "Restore from Backup"}
            </Button>
            <input ref={fileRef} type="file" accept=".json" hidden onChange={handleRestoreFile} />
            <Typography variant="caption" color="text.secondary">
              Backup includes all customers, ledger entries, expenses, and income.
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Button variant="contained" color="error" size="large" onClick={() => signOut(auth)}>Sign out</Button>

      <Typography variant="caption" color="text.secondary" textAlign="center">
        Khata Book v1.0 · Powered by Firebase
      </Typography>
    </Stack>
  );
}
