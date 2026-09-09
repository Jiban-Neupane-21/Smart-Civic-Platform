import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
} from "@mui/material";
import {
  ZoomIn,
  Close,
  PictureAsPdf,
  Image as ImageIcon,
  DeleteOutlined,
  OpenInNew,
} from "@mui/icons-material";

export interface KycFilePreviewCardProps {
  label: string;
  fileData: string | null | undefined;
  fileTypeHint?: "image" | "pdf" | "auto";
  required?: boolean;
  onRemove?: () => void;
  aspectRatio?: string;
  height?: number | string;
}

export const KycFilePreviewCard: React.FC<KycFilePreviewCardProps> = ({
  label,
  fileData,
  fileTypeHint = "auto",
  required = false,
  onRemove,
  aspectRatio = "16/9",
  height = 140,
}) => {
  const [openModal, setOpenModal] = useState(false);

  if (!fileData) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: 2,
          textAlign: "center",
          bgcolor: "grey.50",
          borderStyle: "dashed",
          height,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography variant="caption" color="text.secondary" fontWeight={500}>
          {label}
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5 }}>
          {required ? "(Missing required document)" : "(Not uploaded)"}
        </Typography>
      </Paper>
    );
  }

  const isPdf =
    fileTypeHint === "pdf" ||
    (fileTypeHint === "auto" &&
      (fileData.startsWith("data:application/pdf") ||
        fileData.endsWith(".pdf") ||
        fileData.includes("application/pdf")));

  return (
    <>
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 2,
          overflow: "hidden",
          transition: "all 0.2s ease",
          "&:hover": {
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            borderColor: "primary.main",
          },
          position: "relative",
          bgcolor: "#fff",
        }}
      >
        {/* Header label and action buttons */}
        <Box
          sx={{
            py: 0.8,
            px: 1.5,
            bgcolor: "grey.50",
            borderBottom: "1px solid",
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, minWidth: 0 }}>
            {isPdf ? (
              <PictureAsPdf fontSize="small" color="error" />
            ) : (
              <ImageIcon fontSize="small" color="primary" />
            )}
            <Typography variant="caption" fontWeight={600} noWrap title={label}>
              {label}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Tooltip title="View full size">
              <IconButton size="small" onClick={() => setOpenModal(true)} sx={{ p: 0.5 }}>
                <ZoomIn fontSize="small" />
              </IconButton>
            </Tooltip>
            {onRemove && (
              <Tooltip title="Remove file">
                <IconButton size="small" color="error" onClick={onRemove} sx={{ p: 0.5 }}>
                  <DeleteOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Preview Area */}
        <Box
          onClick={() => setOpenModal(true)}
          sx={{
            height,
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            bgcolor: isPdf ? "#fef2f2" : "#f8fafc",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {isPdf ? (
            <Box textAlign="center" p={2}>
              <PictureAsPdf sx={{ fontSize: 44, color: "#ef4444", mb: 0.5 }} />
              <Typography variant="body2" fontWeight={600} color="text.primary">
                PDF Document
              </Typography>
              <Chip
                label="Click to preview PDF"
                size="small"
                color="error"
                variant="outlined"
                sx={{ mt: 1, fontSize: "0.68rem", height: 20 }}
              />
            </Box>
          ) : (
            <Box
              component="img"
              src={fileData}
              alt={label}
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                p: 0.5,
              }}
            />
          )}

          {/* Hover hint */}
          <Box
            sx={{
              position: "absolute",
              bottom: 4,
              right: 6,
              bgcolor: "rgba(0,0,0,0.65)",
              color: "#fff",
              borderRadius: 1,
              px: 0.8,
              py: 0.2,
              fontSize: "0.65rem",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 0.4,
            }}
          >
            <ZoomIn sx={{ fontSize: 13 }} /> Click to enlarge
          </Box>
        </Box>
      </Paper>

      {/* Full-Screen Lightbox / Preview Modal */}
      <Dialog
        open={openModal}
        onClose={() => setOpenModal(false)}
        maxWidth="md"
        fullWidth
        scroll="paper"
        PaperProps={{
          sx: { borderRadius: 2.5, maxHeight: "90vh" },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pb: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            {isPdf ? (
              <PictureAsPdf color="error" />
            ) : (
              <ImageIcon color="primary" />
            )}
            <Typography variant="h6" fontWeight={700}>
              {label}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setOpenModal(false)}>
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 2, textAlign: "center", bgcolor: "#0f172a" }}>
          {isPdf ? (
            <Box sx={{ height: 550, width: "100%" }}>
              <iframe
                src={fileData}
                title={label}
                width="100%"
                height="100%"
                style={{ border: "none", borderRadius: 8, backgroundColor: "#fff" }}
              />
            </Box>
          ) : (
            <Box
              component="img"
              src={fileData}
              alt={label}
              sx={{
                maxWidth: "100%",
                maxHeight: 560,
                objectFit: "contain",
                borderRadius: 1.5,
                boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
              }}
            />
          )}
        </DialogContent>

        <DialogActions sx={{ px: 2.5, py: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
          {isPdf && (
            <Button
              startIcon={<OpenInNew />}
              onClick={() => {
                const newWin = window.open();
                if (newWin) {
                  newWin.document.write(
                    `<iframe src="${fileData}" style="border:0; top:0; left:0; bottom:0; right:0; width:100%; height:100%;" allowfullscreen></iframe>`
                  );
                }
              }}
              color="primary"
            >
              Open in New Window
            </Button>
          )}
          <Button onClick={() => setOpenModal(false)} variant="contained" color="inherit">
            Close Preview
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
