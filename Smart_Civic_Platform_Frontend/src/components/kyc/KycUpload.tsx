import React, { useState, useRef } from "react";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  Card,
  CardContent,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

export interface KycUploadPayload {
  identity_type: string;
  identity_number: string;
  identity_document?: string; // Base64 (single mode)
  front_image?: string; // Base64 (front-back mode)
  back_image?: string; // Base64 (front-back mode)
}

interface KycUploadProps {
  mode: "single" | "front-back";
  mandatory?: boolean;
  initialValues?: Partial<KycUploadPayload>;
  onSubmit: (payload: KycUploadPayload) => Promise<void>;
  onSkip?: () => void;
}

export const KycUpload: React.FC<KycUploadProps> = ({
  mode,
  mandatory = false,
  initialValues = {},
  onSubmit,
  onSkip,
}) => {
  const [identityType, setIdentityType] = useState<string>(
    initialValues.identity_type || "",
  );
  const [identityNumber, setIdentityNumber] = useState<string>(
    initialValues.identity_number || "",
  );
  const [documentBase64, setDocumentBase64] = useState<string | null>(null);
  const [frontBase64, setFrontBase64] = useState<string | null>(null);
  const [backBase64, setBackBase64] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const docInputRef = useRef<HTMLInputElement>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange =
    (setter: React.Dispatch<React.SetStateAction<string | null>>) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        setError("File size exceeds 5MB limit");
        return;
      }
      setError(null);

      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    };

  const handleSubmit = async () => {
    if (!identityType || !identityNumber) {
      setError("Identity Type and Number are required");
      return;
    }

    if (mode === "single" && !documentBase64) {
      setError("Please upload your identity document");
      return;
    }

    if (mode === "front-back" && (!frontBase64 || !backBase64)) {
      setError("Please upload both front and back images of your identity document");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit({
        identity_type: identityType,
        identity_number: identityNumber,
        identity_document: documentBase64 || undefined,
        front_image: frontBase64 || undefined,
        back_image: backBase64 || undefined,
      });
    } catch (err: any) {
      setError(err.message || "Failed to submit KYC");
    } finally {
      setLoading(false);
    }
  };

  const renderUploadBox = (
    label: string,
    fileBase64: string | null,
    setFileBase64: React.Dispatch<React.SetStateAction<string | null>>,
    inputRef: React.RefObject<HTMLInputElement>,
  ) => (
    <Card variant="outlined" sx={{ mb: 2, borderStyle: "dashed" }}>
      <CardContent sx={{ textAlign: "center", py: 4 }}>
        {fileBase64 ? (
          <Box position="relative" display="inline-block">
            {fileBase64.startsWith("data:application/pdf") ? (
              <Typography variant="body1">PDF Document Selected</Typography>
            ) : (
              <img
                src={fileBase64}
                alt={label}
                style={{ maxWidth: "100%", maxHeight: 200, objectFit: "contain" }}
              />
            )}
            <IconButton
              size="small"
              color="error"
              sx={{ position: "absolute", top: -10, right: -10, bgcolor: "background.paper" }}
              onClick={() => setFileBase64(null)}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        ) : (
          <Box>
            <CloudUploadIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
            <Typography variant="subtitle1" gutterBottom>
              Upload {label}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              JPG, PNG or PDF (Max 5MB)
            </Typography>
            <Button variant="outlined" onClick={() => inputRef.current?.click()} sx={{ mt: 1 }}>
              Browse File
            </Button>
            <input
              type="file"
              hidden
              ref={inputRef}
              accept="image/jpeg,image/png,application/pdf"
              onChange={handleFileChange(setFileBase64)}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel id="identity-type-label">Identity Type</InputLabel>
        <Select
          labelId="identity-type-label"
          value={identityType}
          label="Identity Type"
          onChange={(e) => setIdentityType(e.target.value)}
        >
          <MenuItem value="citizenship">Citizenship</MenuItem>
          <MenuItem value="national_id">National ID</MenuItem>
          <MenuItem value="passport">Passport</MenuItem>
          <MenuItem value="driving_license">Driving License</MenuItem>
          <MenuItem value="voter_id">Voter ID</MenuItem>
        </Select>
      </FormControl>

      <TextField
        fullWidth
        label="Identity Number"
        value={identityNumber}
        onChange={(e) => setIdentityNumber(e.target.value)}
        sx={{ mb: 3 }}
      />

      {mode === "single" ? (
        renderUploadBox("Identity Document", documentBase64, setDocumentBase64, docInputRef)
      ) : (
        <Box display="flex" gap={2} flexDirection={{ xs: "column", sm: "row" }}>
          <Box flex={1}>
            {renderUploadBox("Front Image", frontBase64, setFrontBase64, frontInputRef)}
          </Box>
          <Box flex={1}>
            {renderUploadBox("Back Image", backBase64, setBackBase64, backInputRef)}
          </Box>
        </Box>
      )}

      <Box display="flex" gap={2} mt={3}>
        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : "Submit Identity"}
        </Button>
        {!mandatory && onSkip && (
          <Button
            variant="outlined"
            fullWidth
            size="large"
            onClick={onSkip}
            disabled={loading}
          >
            Skip for Now
          </Button>
        )}
      </Box>
    </Box>
  );
};
