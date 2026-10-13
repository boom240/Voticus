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
  canVote: boolean;
}

export function EntryCard({ entry, onVote, isVoting, canVote }: EntryCardProps) {
  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        boxShadow: 2,
      }}
    >
      {entry.imageUrl && (
        <CardMedia
          component="img"
          image={entry.imageUrl}
          alt={entry.description}
          sx={{
            width: "100%",
            height: 200,
            objectFit: "cover",
          }}
        />
      )}
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="body1" gutterBottom noWrap>
          {entry.description}
        </Typography>

        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mt: 1 }}
        >
          <Typography variant="body2" color="text.secondary">
            Votes: {entry.voteCount}
          </Typography>
          <Button
            variant="contained"
            size="small"
            onClick={onVote}
            disabled={isVoting || !canVote}
          >
            {!canVote ? "Login to vote" : isVoting ? "Voting..." : "Vote"}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
