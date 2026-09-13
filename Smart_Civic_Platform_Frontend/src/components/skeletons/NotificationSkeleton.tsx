import React from "react";
import { Box, Card, Divider, List, ListItem, ListItemAvatar, ListItemText, Skeleton, Stack } from "@mui/material";

export const NotificationItemsSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <List sx={{ p: 0 }}>
      {Array.from({ length: count }).map((_, idx) => (
        <React.Fragment key={idx}>
          <ListItem alignItems="flex-start" sx={{ p: 2.5 }}>
            <ListItemAvatar sx={{ minWidth: 56 }}>
              <Skeleton
                animation="wave"
                variant="circular"
                width={44}
                height={44}
              />
            </ListItemAvatar>
            <ListItemText
              primary={
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: "70%" }}>
                    <Skeleton
                      animation="wave"
                      variant="text"
                      width="60%"
                      height={22}
                    />
                    <Skeleton
                      animation="wave"
                      variant="rounded"
                      width={65}
                      height={20}
                      sx={{ borderRadius: "10px" }}
                    />
                  </Stack>
                  <Skeleton
                    animation="wave"
                    variant="text"
                    width={80}
                    height={16}
                  />
                </Box>
              }
              secondary={
                <Box sx={{ width: "90%" }}>
                  <Skeleton
                    animation="wave"
                    variant="text"
                    width="95%"
                    height={18}
                  />
                  <Skeleton
                    animation="wave"
                    variant="text"
                    width="60%"
                    height={18}
                  />
                </Box>
              }
            />
          </ListItem>
          {idx < count - 1 && <Divider component="li" />}
        </React.Fragment>
      ))}
    </List>
  );
};

export const NotificationSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <Card sx={{ borderRadius: 3, boxShadow: "0 4px 20px rgba(0,0,0,0.08)", overflow: "hidden" }}>
      {/* Header Tabs & Actions */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
          bgcolor: "background.paper",
        }}
      >
        <Stack direction="row" spacing={1} sx={{ overflowX: "auto" }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              animation="wave"
              variant="rounded"
              width={i === 0 ? 60 : 100}
              height={36}
              sx={{ borderRadius: "18px" }}
            />
          ))}
        </Stack>
        <Skeleton
          animation="wave"
          variant="rounded"
          width={130}
          height={32}
          sx={{ borderRadius: 2 }}
        />
      </Box>
      <Divider />

      <NotificationItemsSkeleton count={count} />
    </Card>
  );
};
