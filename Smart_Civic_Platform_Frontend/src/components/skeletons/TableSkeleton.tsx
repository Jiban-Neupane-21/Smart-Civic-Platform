import React from "react";
import {
  Box,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Stack,
} from "@mui/material";

export type SkeletonColumnType =
  | "text"
  | "chip"
  | "badge"
  | "avatar"
  | "actions"
  | "date"
  | "number";

export interface ColumnDefinition {
  header?: string;
  type?: SkeletonColumnType;
  width?: string | number;
  align?: "left" | "center" | "right";
}

interface TableRowsSkeletonProps {
  rows?: number;
  columns?: (SkeletonColumnType | ColumnDefinition)[] | number;
}

export const TableRowsSkeleton: React.FC<TableRowsSkeletonProps> = ({
  rows = 6,
  columns = 6,
}) => {
  const colDefs: ColumnDefinition[] = Array.isArray(columns)
    ? columns.map((col) => (typeof col === "string" ? { type: col } : col))
    : Array.from({ length: columns }, () => ({ type: "text" as SkeletonColumnType }));

  const renderCellSkeleton = (col: ColumnDefinition) => {
    switch (col.type) {
      case "avatar":
        return (
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Skeleton
              animation="wave"
              variant="circular"
              width={38}
              height={38}
            />
            <Box sx={{ width: "70%" }}>
              <Skeleton
                animation="wave"
                variant="text"
                width="80%"
                height={20}
              />
              <Skeleton
                animation="wave"
                variant="text"
                width="50%"
                height={14}
              />
            </Box>
          </Stack>
        );

      case "chip":
        return (
          <Skeleton
            animation="wave"
            variant="rounded"
            width={col.width || 85}
            height={26}
            sx={{ borderRadius: "16px", display: "inline-block" }}
          />
        );

      case "badge":
        return (
          <Skeleton
            animation="wave"
            variant="rounded"
            width={col.width || 90}
            height={24}
            sx={{ borderRadius: "6px", display: "inline-block" }}
          />
        );

      case "actions":
        return (
          <Stack direction="row" spacing={1} justifyContent={col.align || "center"}>
            <Skeleton
              animation="wave"
              variant="rounded"
              width={32}
              height={32}
              sx={{ borderRadius: "8px" }}
            />
            <Skeleton
              animation="wave"
              variant="rounded"
              width={32}
              height={32}
              sx={{ borderRadius: "8px" }}
            />
          </Stack>
        );

      case "date":
        return (
          <Skeleton
            animation="wave"
            variant="text"
            width={col.width || 90}
            height={20}
          />
        );

      case "number":
        return (
          <Skeleton
            animation="wave"
            variant="text"
            width={col.width || 40}
            height={20}
          />
        );

      case "text":
      default:
        return (
          <Skeleton
            animation="wave"
            variant="text"
            width={col.width || "75%"}
            height={22}
          />
        );
    }
  };

  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <TableRow key={rIdx} sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
          {colDefs.map((col, cIdx) => (
            <TableCell key={cIdx} align={col.align || "left"} sx={{ py: 2 }}>
              {renderCellSkeleton(col)}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
};

export interface TableSkeletonProps {
  rows?: number;
  columns?: (SkeletonColumnType | ColumnDefinition)[] | number;
  headers?: string[];
  showFilterBar?: boolean;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 6,
  columns = 6,
  headers,
  showFilterBar = true,
}) => {
  const colDefs: ColumnDefinition[] = Array.isArray(columns)
    ? columns.map((col) => (typeof col === "string" ? { type: col } : col))
    : Array.from({ length: columns }, (_, i) => ({
        header: headers?.[i] || "",
        type: "text" as SkeletonColumnType,
      }));

  return (
    <Box sx={{ width: "100%" }}>
      {showFilterBar && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2.5,
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ width: { xs: "100%", sm: "auto" } }}>
            <Skeleton
              animation="wave"
              variant="rounded"
              width={260}
              height={40}
              sx={{ borderRadius: 2 }}
            />
            <Skeleton
              animation="wave"
              variant="rounded"
              width={140}
              height={40}
              sx={{ borderRadius: 2 }}
            />
          </Stack>
          <Skeleton
            animation="wave"
            variant="rounded"
            width={120}
            height={40}
            sx={{ borderRadius: 2 }}
          />
        </Box>
      )}

      <TableContainer
        component={Paper}
        elevation={1}
        sx={{ borderRadius: 3, overflow: "hidden", border: "1px solid", borderColor: "divider" }}
      >
        <Table sx={{ minWidth: 700 }}>
          <TableHead sx={{ bgcolor: "grey.50" }}>
            <TableRow>
              {colDefs.map((col, idx) => (
                <TableCell key={idx} align={col.align || "left"} sx={{ py: 2 }}>
                  {col.header ? (
                    <span style={{ fontWeight: 700, color: "#64748b" }}>
                      {col.header}
                    </span>
                  ) : (
                    <Skeleton
                      animation="wave"
                      variant="text"
                      width={col.width || 100}
                      height={20}
                    />
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRowsSkeleton rows={rows} columns={colDefs} />
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
