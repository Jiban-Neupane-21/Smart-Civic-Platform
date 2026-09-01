import React from "react";
import { Box, Button } from "@mui/material";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MunicipalityKycOnboarding } from "../../components/kyc/MunicipalityKycOnboarding";

export default function MunicipalityKycUpdatePage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1100, margin: "0 auto" }}>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <Button 
          startIcon={<ArrowLeft size={18} />} 
          onClick={() => navigate("/municipality_head/profile")} 
          sx={{ color: "text.secondary", "&:hover": { bgcolor: "grey.100" }, textTransform: "none" }}
        >
          Back to Profile
        </Button>
      </Box>
      <MunicipalityKycOnboarding />
    </Box>
  );
}
