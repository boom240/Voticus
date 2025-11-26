// src/components/layout/AppLayout.tsx
import type { PropsWithChildren } from "react";
import type { PaletteMode } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import HowToVoteIcon from "@mui/icons-material/HowToVote";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";

interface AppLayoutProps extends PropsWithChildren {
  colorMode: PaletteMode;
  onToggleColorMode: () => void;
}

export function AppLayout({
  children,
  colorMode,
  onToggleColorMode,
}: AppLayoutProps) {
  return (
    <Box
      minHeight="100vh"
      display="flex"
      flexDirection="column"
      sx={{ bgcolor: "background.default" }}
    >
      <AppBar position="static" elevation={2}>
        <Toolbar sx={{ justifyContent: "space-between" }}>
          {/* Left: icon + title (clickable home) */}
          <Box display="flex" alignItems="center">
            <IconButton
              component={RouterLink}
              to="/"
              edge="start"
              color="inherit"
              sx={{ mr: 1 }}
            >
              <HowToVoteIcon />
            </IconButton>
            <Typography
              variant="h6"
              component={RouterLink}
              to="/"
              sx={{
                textDecoration: "none",
                color: "inherit",
                fontWeight: 600,
                letterSpacing: 0.5,
              }}
            >
              Voticus
            </Typography>
          </Box>

          {/* Right: nav + theme toggle */}
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              color="inherit"
              size="small"
              component={RouterLink}
              to="/"
            >
              Home
            </Button>
            <Button color="inherit" size="small" disabled>
              Account
            </Button>
            <Button color="inherit" size="small" disabled>
              Settings
            </Button>
            <Button color="inherit" size="small" disabled>
              About
            </Button>

            <IconButton
              color="inherit"
              aria-label="Toggle light/dark mode"
              onClick={onToggleColorMode}
            >
              {colorMode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Main content */}
      <Container
        maxWidth="lg"
        sx={{ mt: 4, mb: 4, flex: 1, display: "flex" }}
      >
        <Box width="100%">{children}</Box>
      </Container>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          borderTop: (theme) => `1px solid ${theme.palette.divider}`,
          py: 2,
          px: 2,
          textAlign: "center",
          bgcolor: "background.paper",
        }}
      >
        <Typography variant="caption" color="text.secondary">
          © {new Date().getFullYear()} Voticus · Built with .NET 8 · SQLite ·
          React + MUI
        </Typography>
      </Box>
    </Box>
  );
}
