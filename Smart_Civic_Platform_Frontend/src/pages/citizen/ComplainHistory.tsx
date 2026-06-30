import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  InputAdornment,
  MenuItem,
} from "@mui/material";
import { Search } from "@mui/icons-material";

interface ReportData {
  id: string;
  title: string;
  category: string;
  date: string;
  status: "Pending" | "In Progress" | "Resolved";
}

const mockComplaints: ReportData[] = [
  {
    id: "CMP-1024",
    title: "Streetlight out on Main St.",
    category: "Infrastructure",
    date: "2026-06-08",
    status: "Pending",
  },
  {
    id: "CMP-0984",
    title: "Missed garbage collection",
    category: "Waste Routing",
    date: "2026-06-01",
    status: "Resolved",
  },
  {
    id: "CMP-0871",
    title: "Water mainline leakage",
    category: "Utilities",
    date: "2026-05-14",
    status: "In Progress",
  },
];

export const ComplaintReport: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const getStatusChipColor = (status: ReportData["status"]) => {
    switch (status) {
      case "Resolved":
        return "success";
      case "In Progress":
        return "info";
      case "Pending":
        return "warning";
      default:
        return "default";
    }
  };

  const filteredComplaints = mockComplaints.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "All" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        Your Complaint History & Reports
      </Typography>

      {/* Filter Toolbar */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <TextField
          size="small"
          placeholder="Search ID or Keyword..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 250 }}
        />
        <TextField
          select
          size="small"
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="All">All Statuses</MenuItem>
          <MenuItem value="Pending">Pending</MenuItem>
          <MenuItem value="In Progress">In Progress</MenuItem>
          <MenuItem value="Resolved">Resolved</MenuItem>
        </TextField>
      </Box>

      {/* Complaints Table */}
      <TableContainer
        component={Paper}
        sx={{ borderRadius: 2, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
      >
        <Table>
          <TableHead sx={{ bgcolor: "#f5f5f5" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>Ticket ID</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Issue Title</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Category</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Submission Date</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredComplaints.length > 0 ? (
              filteredComplaints.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell
                    sx={{ fontWeight: "medium", color: "primary.main" }}
                  >
                    {row.id}
                  </TableCell>
                  <TableCell>{row.title}</TableCell>
                  <TableCell>{row.category}</TableCell>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>
                    <Chip
                      label={row.status}
                      color={getStatusChipColor(row.status)}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography color="textSecondary">
                    No complaints found matches the criteria.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
