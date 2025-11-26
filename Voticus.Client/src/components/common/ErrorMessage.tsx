// src/components/common/ErrorMessage.tsx
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";

interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <Box mt={2}>
      <Alert severity="error">{message}</Alert>
    </Box>
  );
}
