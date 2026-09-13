import React from "react";
import { Box, Card, CardContent, Grid, Skeleton, Stack } from "@mui/material";

export const DetailViewSkeleton: React.FC = () => {
  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: "auto" }}>
      {/* Back Button & Title Row */}
      <Box sx={{ mb: 3 }}>
        <Skeleton
          animation="wave"
          variant="rounded"
          width={180}
          height={36}
          sx={{ mb: 2, borderRadius: 2 }}
        />
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={2}
        >
          <Box sx={{ width: { xs: "100%", sm: "60%" } }}>
            <Skeleton
              animation="wave"
              variant="text"
              width="80%"
              height={38}
            />
            <Stack direction="row" spacing={1.5} sx={{ mt: 1 }}>
              <Skeleton
                animation="wave"
                variant="rounded"
                width={100}
                height={26}
                sx={{ borderRadius: "14px" }}
              />
              <Skeleton
                animation="wave"
                variant="rounded"
                width={120}
                height={26}
                sx={{ borderRadius: "14px" }}
              />
            </Stack>
          </Box>
          <Skeleton
            animation="wave"
            variant="rounded"
            width={120}
            height={36}
            sx={{ borderRadius: 2 }}
          />
        </Stack>
      </Box>

      {/* 2-Column Content Layout */}
      <Grid container spacing={3}>
        {/* Left / Main Details */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={3}>
            {/* Description Card */}
            <Card variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Skeleton
                animation="wave"
                variant="text"
                width={160}
                height={26}
                sx={{ mb: 1.5 }}
              />
              <Skeleton
                animation="wave"
                variant="text"
                width="100%"
                height={20}
              />
              <Skeleton
                animation="wave"
                variant="text"
                width="95%"
                height={20}
              />
              <Skeleton
                animation="wave"
                variant="text"
                width="70%"
                height={20}
              />
            </Card>

            {/* Media Gallery / Attachments */}
            <Card variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Skeleton
                animation="wave"
                variant="text"
                width={180}
                height={26}
                sx={{ mb: 2 }}
              />
              <Grid container spacing={2}>
                {Array.from({ length: 3 }).map((_, idx) => (
                  <Grid size={{ xs: 12, sm: 4 }} key={idx}>
                    <Skeleton
                      animation="wave"
                      variant="rounded"
                      height={120}
                      sx={{ borderRadius: 2 }}
                    />
                  </Grid>
                ))}
              </Grid>
            </Card>

            {/* Location Map Preview */}
            <Card variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Skeleton
                animation="wave"
                variant="text"
                width={150}
                height={26}
                sx={{ mb: 2 }}
              />
              <Skeleton
                animation="wave"
                variant="rounded"
                height={200}
                sx={{ borderRadius: 2 }}
              />
            </Card>

            {/* Timeline Stepper */}
            <Card variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Skeleton
                animation="wave"
                variant="text"
                width={170}
                height={26}
                sx={{ mb: 2.5 }}
              />
              {Array.from({ length: 3 }).map((_, idx) => (
                <Box key={idx} sx={{ display: "flex", gap: 2, mb: 2 }}>
                  <Skeleton
                    animation="wave"
                    variant="circular"
                    width={28}
                    height={28}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton
                      animation="wave"
                      variant="text"
                      width="40%"
                      height={20}
                    />
                    <Skeleton
                      animation="wave"
                      variant="text"
                      width="80%"
                      height={16}
                    />
                  </Box>
                </Box>
              ))}
            </Card>
          </Stack>
        </Grid>

        {/* Right Sidebar Details */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={3}>
            {/* Meta Information Card */}
            <Card variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Skeleton
                animation="wave"
                variant="text"
                width={140}
                height={26}
                sx={{ mb: 2 }}
              />
              <Stack spacing={2}>
                {Array.from({ length: 4 }).map((_, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Skeleton
                      animation="wave"
                      variant="text"
                      width={80}
                      height={18}
                    />
                    <Skeleton
                      animation="wave"
                      variant="text"
                      width={110}
                      height={20}
                    />
                  </Box>
                ))}
              </Stack>
            </Card>

            {/* Actions Card */}
            <Card variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Skeleton
                animation="wave"
                variant="text"
                width={110}
                height={24}
                sx={{ mb: 2 }}
              />
              <Stack spacing={1.5}>
                <Skeleton
                  animation="wave"
                  variant="rounded"
                  height={42}
                  sx={{ borderRadius: 2 }}
                />
                <Skeleton
                  animation="wave"
                  variant="rounded"
                  height={42}
                  sx={{ borderRadius: 2 }}
                />
              </Stack>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};
