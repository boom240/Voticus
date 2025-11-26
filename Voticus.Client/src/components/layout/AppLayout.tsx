// src/components/layout/AppLayout.tsx
import type { PropsWithChildren } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";

export function AppLayout({ children }: PropsWithChildren) {
  return (
    <Box minHeight="100vh" bgcolor="#f5f5f5">
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div">
            Voticus
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        {children}
      </Container>
    </Box>
  );
}
