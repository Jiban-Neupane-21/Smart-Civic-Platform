import React from "react";
import { Box, Card, CardContent, Grid, Skeleton, Stack } from "@mui/material";

export interface DashboardSkeletonProps {
  cardCount?: number;
  layout?: "split" | "full" | "analytics";
  titleWidth?: number | string;
}

export const DashboardSkeleton: React.FC<DashboardSkeletonProps> = ({
  cardCount = 4,
  layout = "split",
  titleWidth = 260,
}) => {
  return (
    <Box sx={{ p: { xs: 2, md: 4 }, minHeight: "100vh" }}>
      {/* Header Section */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 4,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Skeleton
            animation="wave"
            variant="text"
            width={titleWidth}
            height={44}
          />
          <Skeleton
            animation="wave"
            variant="text"
            width={380}
            height={24}
            sx={{ mt: 0.5 }}
          />
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Skeleton
            animation="wave"
            variant="rounded"
            width={110}
            height={38}
            sx={{ borderRadius: 2 }}
          />
        </Stack>
      </Box>

      {/* KPI Metric Stat Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {Array.from({ length: cardCount }).map((_, idx) => (
          <Grid
            key={idx}
            size={{
              xs: 12,
              sm: cardCount === 3 ? 12 / 3 : 6,
              md: cardCount === 3 ? 4 : 3,
            }}
          >
            <Card
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 3,
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box sx={{ width: "70%" }}>
                  <Skeleton
                    animation="wave"
                    variant="text"
                    width="60%"
                    height={18}
                  />
                  <Skeleton
                    animation="wave"
                    variant="text"
                    width="50%"
                    height={42}
                    sx={{ my: 0.5 }}
                  />
                  <Skeleton
                    animation="wave"
                    variant="text"
                    width="70%"
                    height={18}
                  />
                </Box>
                <Skeleton
                  animation="wave"
                  variant="circular"
                  width={48}
                  height={48}
                />
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Layout Body */}
      {layout === "split" && (
        <Grid container spacing={4}>
          {/* Main Column (e.g. Recent Complaints / Activity) */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Stack spacing={4}>
              <Card
                variant="outlined"
                sx={{ borderRadius: 3, overflow: "hidden" }}
              >
                <Box
                  sx={{
                    p: 2.5,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Skeleton
                    animation="wave"
                    variant="text"
                    width={180}
                    height={28}
                  />
                  <Skeleton
                    animation="wave"
                    variant="text"
                    width={70}
                    height={24}
                  />
                </Box>
                <CardContent sx={{ p: 0 }}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Box
                      key={i}
                      sx={{
                        p: 2.5,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderBottom:
                          i < 3 ? "1px solid rgba(0,0,0,0.06)" : "none",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "65%" }}>
                        <Skeleton
                          animation="wave"
                          variant="rounded"
                          width={40}
                          height={40}
                          sx={{ borderRadius: 2 }}
                        />
                        <Box sx={{ width: "80%" }}>
                          <Skeleton
                            animation="wave"
                            variant="text"
                            width="85%"
                            height={22}
                          />
                          <Skeleton
                            animation="wave"
                            variant="text"
                            width="40%"
                            height={16}
                          />
                        </Box>
                      </Box>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Skeleton
                          animation="wave"
                          variant="rounded"
                          width={75}
                          height={24}
                          sx={{ borderRadius: "12px" }}
                        />
                        <Skeleton
                          animation="wave"
                          variant="rounded"
                          width={85}
                          height={24}
                          sx={{ borderRadius: "12px" }}
                        />
                      </Stack>
                    </Box>
                  ))}
                </CardContent>
              </Card>

              <Card variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
                <Skeleton
                  animation="wave"
                  variant="text"
                  width={200}
                  height={28}
                  sx={{ mb: 2 }}
                />
                <Skeleton
                  animation="wave"
                  variant="rounded"
                  height={180}
                  sx={{ borderRadius: 2 }}
                />
              </Card>
            </Stack>
          </Grid>

          {/* Sidebar Column (e.g. Quick Actions / Notices) */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Stack spacing={3}>
              <Card variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
                <Skeleton
                  animation="wave"
                  variant="text"
                  width={150}
                  height={26}
                  sx={{ mb: 2 }}
                />
                <Stack spacing={1.5}>
                  <Skeleton
                    animation="wave"
                    variant="rounded"
                    height={44}
                    sx={{ borderRadius: 2 }}
                  />
                  <Skeleton
                    animation="wave"
                    variant="rounded"
                    height={44}
                    sx={{ borderRadius: 2 }}
                  />
                </Stack>
              </Card>

              <Card variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
                <Skeleton
                  animation="wave"
                  variant="text"
                  width={160}
                  height={26}
                  sx={{ mb: 2 }}
                />
                {Array.from({ length: 3 }).map((_, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      py: 1.5,
                      borderBottom:
                        idx < 2 ? "1px solid rgba(0,0,0,0.06)" : "none",
                    }}
                  >
                    <Skeleton
                      animation="wave"
                      variant="text"
                      width="90%"
                      height={20}
                    />
                    <Skeleton
                      animation="wave"
                      variant="text"
                      width="50%"
                      height={16}
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                ))}
              </Card>
            </Stack>
          </Grid>
        </Grid>
      )}

      {layout === "analytics" && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Skeleton
                animation="wave"
                variant="text"
                width={220}
                height={28}
                sx={{ mb: 2 }}
              />
              <Skeleton
                animation="wave"
                variant="rounded"
                height={280}
                sx={{ borderRadius: 2 }}
              />
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Skeleton
                animation="wave"
                variant="text"
                width={180}
                height={28}
                sx={{ mb: 2 }}
              />
              <Skeleton
                animation="wave"
                variant="rounded"
                height={280}
                sx={{ borderRadius: 2 }}
              />
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};
