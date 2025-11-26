// src/components/polls/CreateEntryForm.tsx
import { useState } from "react";

import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";

import { createEntry } from "../../api/polls";
import type { EntryDto } from "../../types/poll";

interface CreateEntryFormProps {
  pollId: number;
  onCreated: (entry: EntryDto) => void;
}

export function CreateEntryForm({ pollId, onCreated }: CreateEntryFormProps) {
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!description.trim()) {
      setError("Description is required.");
      return;
    }

    try {
      setSubmitting(true);

      const created = await createEntry(pollId, {
        description: description.trim(),
        imageUrl: imageUrl.trim() || undefined,
      });

      // inform parent
      onCreated(created);

      // reset form
      setDescription("");
      setImageUrl("");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create entry.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Add Entry
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={2}>
        <TextField
          label="Description"
          value={description}
          required
          multiline
          minRows={2}
          onChange={(e) => setDescription(e.target.value)}
        />

        <TextField
          label="Image URL (optional)"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />

        <Button
          type="submit"
          variant="contained"
          disabled={submitting}
        >
          {submitting ? "Adding..." : "Add Entry"}
        </Button>
      </Stack>
    </form>
  );
}
