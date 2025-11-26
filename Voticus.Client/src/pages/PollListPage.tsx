// src/pages/PollListPage.tsx
import { useEffect, useState } from "react";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { Link } from "react-router-dom";

import { getPolls } from "../api/polls";
import type { PollDto } from "../types/poll";
import { PollCard } from "../components/polls/PollCard";
import { Loading } from "../components/common/Loading";
import { ErrorMessage } from "../components/common/ErrorMessage";

export function PollListPage() {
  const [polls, setPolls] = useState<PollDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPolls()
      .then(setPolls)
      .catch((err: unknown) => {
        console.error("Error fetching polls:", err);
        const message =
          err instanceof Error ? err.message : "Failed to load polls";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4">Polls</Typography>
        <Button variant="contained" component={Link} to="/polls/new">
          Create Poll
        </Button>
      </Stack>

      {polls.length === 0 ? (
        <Typography>No polls yet. Create your first one!</Typography>
      ) : (
        <Grid container spacing={3}>
          {polls.map((poll) => (
            <Grid key={poll.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <PollCard poll={poll} />
            </Grid>
          ))}
        </Grid>
      )}
    </>
  );
}
