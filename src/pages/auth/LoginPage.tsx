import { useForm } from "react-hook-form";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Box, Button, Card, CardContent, Link, Stack, TextField, Typography } from "@mui/material";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useSnackbar } from "notistack";
import { AuthShell } from "./AuthShell";

interface FormData { email: string; password: string }

export default function LoginPage() {
  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm<FormData>();
  const nav = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const onSubmit = async (data: FormData) => {
    try {
      await signInWithEmailAndPassword(auth, data.email.trim(), data.password);
      nav("/");
    } catch (e: any) {
      enqueueSnackbar(e?.message || "Login failed", { variant: "error" });
    }
  };

  return (
    <AuthShell>
      <Card sx={{ width: "100%", maxWidth: 420 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom fontWeight={800}>Welcome back</Typography>
          <Typography color="text.secondary" mb={3}>Sign in to your Khata Book</Typography>
          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={2}>
              <TextField label="Email" type="email" autoComplete="email" error={!!errors.email} helperText={errors.email?.message}
                {...register("email", { required: "Email is required" })} />
              <TextField label="Password" type="password" autoComplete="current-password" error={!!errors.password} helperText={errors.password?.message}
                {...register("password", { required: "Password is required" })} />
              <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
                {isSubmitting ? "Signing in..." : "Sign in"}
              </Button>
              <Box display="flex" justifyContent="space-between">
                <Link component={RouterLink} to="/forgot-password">Forgot password?</Link>
                <Link component={RouterLink} to="/register">Create account</Link>
              </Box>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
