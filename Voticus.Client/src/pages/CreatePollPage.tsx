// src/pages/CreatePollPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";

import { createPoll } from "../api/polls";

export function CreatePollPage() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [finishAt, setFinishAt] = useState(""); // HTML datetime-local value
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    try {
      setSubmitting(true);

      // Convert datetime-local (local time) to an ISO string if present
      const finishAtUtc =
        finishAt.trim() !== ""
            ? new Date(finishAt).toISOString()
            : undefined;

      const created = await createPoll({
        title: title.trim(),
        description: description.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        finishAtUtc: finishAtUtc,
      } as any); // quick-and-dirty cast to match current createPoll signature

      // After creating, navigate to the detail page for that poll
      navigate(`/polls/${created.id}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create poll.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Typography variant="h4" gutterBottom>
        Create Poll
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <Stack spacing={2}>
          <TextField
            label="Title"
            value={title}
            required
            onChange={(e) => setTitle(e.target.value)}
          />

          <TextField
            label="Description"
            value={description}
            multiline
            minRows={3}
            onChange={(e) => setDescription(e.target.value)}
          />

          <TextField
            label="Image URL"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />

          <TextField
            label="Finish time"
            type="datetime-local"
            value={finishAt}
            onChange={(e) => setFinishAt(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <Stack direction="row" spacing={2}>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
            >
              {submitting ? "Creating..." : "Create Poll"}
            </Button>
          </Stack>
        </Stack>
      </form>
    </>
  );
}
