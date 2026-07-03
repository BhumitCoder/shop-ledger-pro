import { useForm } from "react-hook-form";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Box, Button, Card, CardContent, Link, Stack, TextField, Typography } from "@mui/material";
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useSnackbar } from "notistack";
import { AuthShell } from "./AuthShell";

interface FormData { name: string; email: string; password: string }

export default function RegisterPage() {
  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm<FormData>();
  const nav = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const onSubmit = async (data: FormData) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, data.email.trim(), data.password);
      await updateProfile(cred.user, { displayName: data.name });
      try { await sendEmailVerification(cred.user); } catch {}
      enqueueSnackbar("Account created. Verification email sent.", { variant: "success" });
      nav("/");
    } catch (e: any) {
      enqueueSnackbar(e?.message || "Registration failed", { variant: "error" });
    }
  };

  return (
    <AuthShell>
      <Card sx={{ width: "100%", maxWidth: 420 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom fontWeight={800}>Create account</Typography>
          <Typography color="text.secondary" mb={3}>Start your digital khata</Typography>
          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={2}>
              <TextField label="Your name / Business name" error={!!errors.name} helperText={errors.name?.message}
                {...register("name", { required: "Name is required" })} />
              <TextField label="Email" type="email" autoComplete="email" error={!!errors.email} helperText={errors.email?.message}
                {...register("email", { required: "Email is required" })} />
              <TextField label="Password" type="password" autoComplete="new-password" error={!!errors.password} helperText={errors.password?.message}
                {...register("password", { required: "Password is required", minLength: { value: 6, message: "Min 6 characters" } })} />
              <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create account"}
              </Button>
              <Link component={RouterLink} to="/login" textAlign="center">Already have an account? Sign in</Link>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
