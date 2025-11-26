// src/components/polls/PollCard.tsx
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { Link } from "react-router-dom";
import type { PollDto } from "../../types/poll";

interface PollCardProps {
  poll: PollDto;
}

export function PollCard({ poll }: PollCardProps) {
  return (
    <Card>
      <CardActionArea component={Link} to={`/polls/${poll.id}`}>
        {poll.imageUrl && (
          <CardMedia
            component="img"
            height="160"
            image={poll.imageUrl}
            alt={poll.title}
          />
        )}
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {poll.title}
          </Typography>

          {poll.description && (
            <Typography variant="body2" color="text.secondary">
              {poll.description}
            </Typography>
          )}

          {poll.finishAtUtc && (
            <Box mt={1}>
              <Typography variant="caption" color="text.secondary">
                Ends: {new Date(poll.finishAtUtc).toLocaleString()}
              </Typography>
            </Box>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
