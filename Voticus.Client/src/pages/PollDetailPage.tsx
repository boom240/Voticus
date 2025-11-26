// src/pages/PollDetailPage.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";

import { Loading } from "../components/common/Loading";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { getPollById, voteForEntry } from "../api/polls";
import { EntryCard } from "../components/polls/EntryCard";
import { CreateEntryForm } from "../components/polls/CreateEntryForm";

import type { PollDto, EntryDto } from "../types/poll";

export function PollDetailPage() {
  const { id } = useParams();
  const pollId = Number(id);

  const [poll, setPoll] = useState<PollDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [votingEntryId, setVotingEntryId] = useState<number | null>(null);
  const [sortByVotes, setSortByVotes] = useState(true);

  useEffect(() => {
    if (!pollId || Number.isNaN(pollId)) {
      setError("Invalid poll id");
      setLoading(false);
      return;
    }

    getPollById(pollId)
      .then(setPoll)
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Failed to load poll";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [pollId]);

  const entriesSorted: EntryDto[] = (() => {
    if (!poll?.entries) return [];
    const entries = [...poll.entries];

    if (sortByVotes) {
      entries.sort((a, b) => b.voteCount - a.voteCount);
    }

    return entries;
  })();

  const handleVote = async (entryId: number) => {
    if (!poll) return;

    try {
      setVotingEntryId(entryId);
      await voteForEntry(poll.id, entryId);

      // Optimistically update vote count locally
      setPoll((prev) =>
        prev
          ? {
              ...prev,
              entries: prev.entries?.map((e) =>
                e.id === entryId
                  ? { ...e, voteCount: e.voteCount + 1 }
                  : e
              ),
            }
          : prev
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to vote";
      setError(message);
    } finally {
      setVotingEntryId(null);
    }
  };

    const handleEntryCreated = (entry: EntryDto) => {
    setPoll((prev) =>
      prev
        ? {
            ...prev,
            entries: [...(prev.entries ?? []), entry],
          }
        : prev
    );
  };

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} />;
  if (!poll) return <Typography>Poll not found.</Typography>;

  return (
    <>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h4">{poll.title}</Typography>
        <Button
          variant="outlined"
          onClick={() => setSortByVotes((prev) => !prev)}
        >
          {sortByVotes ? "Sort by original order" : "Sort by votes"}
        </Button>
      </Stack>

      {poll.description && (
        <Typography variant="body1" paragraph>
          {poll.description}
        </Typography>
      )}

      {poll.finishAtUtc && (
        <Typography variant="body2" color="text.secondary" paragraph>
          Ends: {new Date(poll.finishAtUtc).toLocaleString()}
        </Typography>
      )}

      {entriesSorted.length === 0 ? (
        <Typography>No entries yet.</Typography>
      ) : (
        <Grid container spacing={3}>
          {entriesSorted.map((entry) => (
            <Grid key={entry.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <EntryCard
                entry={entry}
                onVote={() => handleVote(entry.id)}
                isVoting={votingEntryId === entry.id}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <CreateEntryForm
        pollId={poll.id}
        onCreated={handleEntryCreated}
      />
    </>
  );
}
