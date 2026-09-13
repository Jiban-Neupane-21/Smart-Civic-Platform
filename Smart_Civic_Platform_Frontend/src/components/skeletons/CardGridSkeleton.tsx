import React from "react";
import { Box, Card, CardContent, Grid, Skeleton, Stack } from "@mui/material";

export interface CardGridSkeletonProps {
  count?: number;
  columns?: { xs?: number; sm?: number; md?: number; lg?: number };
  cardHeight?: number;
}

export const CardGridSkeleton: React.FC<CardGridSkeletonProps> = ({
  count = 6,
  columns = { xs: 12, sm: 6, md: 4 },
  cardHeight = 180,
}) => {
  return (
    <Grid container spacing={3}>
      {Array.from({ length: count }).map((_, idx) => (
        <Grid
          key={idx}
          size={{
            xs: columns.xs || 12,
            sm: columns.sm || 6,
            md: columns.md || 4,
            lg: columns.lg || 4,
          }}
        >
          <Card
            variant="outlined"
            sx={{
              p: 3,
              borderRadius: 3,
              minHeight: cardHeight,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Skeleton
                  animation="wave"
                  variant="rounded"
                  width={80}
                  height={24}
                  sx={{ borderRadius: "12px" }}
                />
                <Skeleton
                  animation="wave"
                  variant="text"
                  width={60}
                  height={18}
                />
              </Box>
              <Skeleton
                animation="wave"
                variant="text"
                width="85%"
                height={26}
                sx={{ mb: 1 }}
              />
              <Skeleton
                animation="wave"
                variant="text"
                width="100%"
                height={18}
              />
              <Skeleton
                animation="wave"
                variant="text"
                width="60%"
                height={18}
              />
            </Box>

            <Box sx={{ pt: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Skeleton
                animation="wave"
                variant="circular"
                width={32}
                height={32}
              />
              <Skeleton
                animation="wave"
                variant="rounded"
                width={90}
                height={32}
                sx={{ borderRadius: 2 }}
              />
            </Box>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};
