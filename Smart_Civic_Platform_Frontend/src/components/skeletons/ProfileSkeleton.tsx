import React from "react";
import { Box, Card, Grid, Skeleton, Stack } from "@mui/material";

export const ProfileSkeleton: React.FC = () => {
  return (
    <Box maxWidth="lg" sx={{ margin: "0 auto", px: { xs: 1, sm: 2, md: 3 }, py: 3 }}>
      {/* Cover & Avatar Banner Card */}
      <Card sx={{ borderRadius: 3, overflow: "hidden", mb: 3 }}>
        <Skeleton
          animation="wave"
          variant="rectangular"
          height={180}
        />
        <Box sx={{ p: 3, pt: 1, position: "relative" }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "center", sm: "flex-end" },
              gap: 3,
              mt: { xs: -8, sm: -10 },
              mb: 2,
            }}
          >
            <Skeleton
              animation="wave"
              variant="circular"
              width={112}
              height={112}
              sx={{ border: "4px solid white", bgcolor: "background.paper" }}
            />
            <Box sx={{ flex: 1, textAlign: { xs: "center", sm: "left" } }}>
              <Skeleton
                animation="wave"
                variant="text"
                width={220}
                height={36}
                sx={{ mx: { xs: "auto", sm: 0 } }}
              />
              <Stack
                direction="row"
                spacing={1.5}
                justifyContent={{ xs: "center", sm: "flex-start" }}
                alignItems="center"
                sx={{ mt: 1 }}
              >
                <Skeleton
                  animation="wave"
                  variant="rounded"
                  width={110}
                  height={24}
                  sx={{ borderRadius: "12px" }}
                />
                <Skeleton
                  animation="wave"
                  variant="text"
                  width={150}
                  height={20}
                />
              </Stack>
            </Box>
            <Skeleton
              animation="wave"
              variant="rounded"
              width={130}
              height={38}
              sx={{ borderRadius: 2 }}
            />
          </Box>
        </Box>
      </Card>

      {/* Tabs Placeholder */}
      <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
        <Skeleton
          animation="wave"
          variant="rounded"
          width={120}
          height={38}
          sx={{ borderRadius: 2 }}
        />
        <Skeleton
          animation="wave"
          variant="rounded"
          width={120}
          height={38}
          sx={{ borderRadius: 2 }}
        />
        <Skeleton
          animation="wave"
          variant="rounded"
          width={140}
          height={38}
          sx={{ borderRadius: 2 }}
        />
      </Box>

      {/* Form Fields Card */}
      <Card variant="outlined" sx={{ p: 4, borderRadius: 3 }}>
        <Skeleton
          animation="wave"
          variant="text"
          width={200}
          height={28}
          sx={{ mb: 3 }}
        />
        <Grid container spacing={3}>
          {Array.from({ length: 6 }).map((_, idx) => (
            <Grid size={{ xs: 12, sm: 6 }} key={idx}>
              <Skeleton
                animation="wave"
                variant="text"
                width="30%"
                height={18}
                sx={{ mb: 1 }}
              />
              <Skeleton
                animation="wave"
                variant="rounded"
                height={48}
                sx={{ borderRadius: 2 }}
              />
            </Grid>
          ))}
        </Grid>
      </Card>
    </Box>
  );
};
