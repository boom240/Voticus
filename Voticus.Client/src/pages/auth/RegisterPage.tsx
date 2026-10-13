// src/pages/auth/RegisterPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [success, setSuccess] = useState<boolean>(false);
  const [errorMessages, setErrorMessages] = useState<string[] | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await register(email, password);

    if (!result.success) {
      setSuccess(false);
      setErrorMessages(result.errors ?? ["Registration failed."]);
      return;
    }

    setErrorMessages(null);
    setSuccess(true);

    setTimeout(() => navigate("/login"), 1500);
  };

  return (
    <Stack spacing={3} maxWidth={400}>
      <Typography variant="h5">Register</Typography>

      {errorMessages && (
        <Alert severity="error">
          {errorMessages.length === 1 ? (
            errorMessages[0]
          ) : (
            <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
              {errorMessages.map((msg, idx) => (
                <li key={idx}>{msg}</li>
              ))}
            </ul>
          )}
        </Alert>
      )}
      {success && <Alert severity="success">Account created!</Alert>}

      <form onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <TextField
            label="Email"
            type="email"
            required
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <TextField
            label="Password"
            type="password"
            required
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button variant="contained" type="submit">
            Register
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
