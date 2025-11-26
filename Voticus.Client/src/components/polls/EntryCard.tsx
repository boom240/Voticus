// src/components/polls/EntryCard.tsx
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import type { EntryDto } from "../../types/poll";

interface EntryCardProps {
  entry: EntryDto;
  onVote: () => void;
  isVoting?: boolean;
}

export function EntryCard({ entry, onVote, isVoting }: EntryCardProps) {
  return (
    <Card>
      {entry.imageUrl && (
        <CardMedia
          component="img"
          height="200"
          image={entry.imageUrl}
          alt={entry.description}
        />
      )}
      <CardContent>
        <Typography variant="body1" gutterBottom>
          {entry.description}
        </Typography>

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">
            Votes: {entry.voteCount}
          </Typography>
          <Button
            variant="contained"
            size="small"
            onClick={onVote}
            disabled={isVoting}
          >
            {isVoting ? "Voting..." : "Vote"}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
