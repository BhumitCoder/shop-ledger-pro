import { Avatar, Button, Card, CardContent, Divider, Stack, Switch, Typography } from "@mui/material";
import { useAuth } from "@/providers/AuthProvider";
import { auth } from "@/lib/firebase";
import { sendEmailVerification, signOut } from "firebase/auth";
import { useThemeMode } from "@/theme/ThemeModeProvider";
import { useSnackbar } from "notistack";

export default function SettingsPage() {
  const { user } = useAuth();
  const { mode, toggle } = useThemeMode();
  const { enqueueSnackbar } = useSnackbar();

  return (
    <Stack spacing={2}>
      <Card><CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ width: 56, height: 56, bgcolor: "primary.main", fontSize: 24 }}>
            {(user?.displayName || user?.email || "?")[0].toUpperCase()}
          </Avatar>
          <Stack>
            <Typography fontWeight={700}>{user?.displayName || "No name"}</Typography>
            <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
            <Typography variant="caption" color={user?.emailVerified ? "success.main" : "warning.main"}>
              {user?.emailVerified ? "Email verified" : "Email not verified"}
            </Typography>
          </Stack>
        </Stack>
      </CardContent></Card>

      {!user?.emailVerified && (
        <Button variant="outlined" onClick={async () => {
          try { await sendEmailVerification(user!); enqueueSnackbar("Verification email sent", { variant: "success" }); }
          catch (e: any) { enqueueSnackbar(e?.message, { variant: "error" }); }
        }}>Send verification email</Button>
      )}

      <Card><CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography>Dark mode</Typography>
          <Switch checked={mode === "dark"} onChange={toggle} />
        </Stack>
        <Divider sx={{ my: 1 }} />
        <Typography variant="caption" color="text.secondary">
          Data auto-syncs with your Firebase account and works offline.
        </Typography>
      </CardContent></Card>

      <Button variant="contained" color="error" size="large" onClick={() => signOut(auth)}>Sign out</Button>

      <Typography variant="caption" color="text.secondary" textAlign="center">
        Khata Book v0.1 · Built with Firebase
      </Typography>
    </Stack>
  );
}
