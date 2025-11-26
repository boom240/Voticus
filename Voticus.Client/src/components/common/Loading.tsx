// src/components/common/Loading.tsx
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

export function Loading() {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" mt={4}>
      <CircularProgress />
    </Box>
  );
}
