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
  const ends =
    poll.finishAtUtc != null
      ? new Date(poll.finishAtUtc).toLocaleString()
      : null;

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        boxShadow: 3,
      }}
    >
      <CardActionArea
        component={Link}
        to={`/polls/${poll.id}`}
        sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}
      >
        {poll.imageUrl && (
          <CardMedia
            component="img"
            image={poll.imageUrl}
            alt={poll.title}
            sx={{
              width: "100%",
              height: 180,
              objectFit: "cover",
            }}
          />
        )}
        <CardContent sx={{ width: "100%" }}>
          <Typography variant="h6" gutterBottom noWrap>
            {poll.title}
          </Typography>

          {poll.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 1 }}
              noWrap
            >
              {poll.description}
            </Typography>
          )}

          {ends && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Ends: {ends}
              </Typography>
            </Box>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
