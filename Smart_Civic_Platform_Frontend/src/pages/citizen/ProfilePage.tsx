import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  Grid,
  Avatar,
  TextField,
  Button,
  Tabs,
  Tab,
  Chip,
  CircularProgress,
  Alert,
  MenuItem,
  Divider,
  Tooltip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import type { Province, District, Municipality, Ward } from "../../api/types";
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Settings as SettingsIcon,
  Lock as LockIcon,
  LocationOn,
  Email,
  Phone,
  Cake,
  BadgeOutlined,
  Security,
  Home,
  ListAlt,
  CalendarMonth,
  NotificationsOutlined,
  Wc,
  Assignment,
  PhotoCamera,
  Verified as VerifiedIcon,
  CheckCircle,
  HourglassEmpty,
  ErrorOutlined,
  Close as CloseIcon,
  ZoomIn,
  DeleteForever,
  WarningAmberOutlined,
} from "@mui/icons-material";
import { fetchWithAuth, BASE_URL, citizenApi, publicApi } from "../../api";
import { useAuth } from "../../hooks/useAuth";
import Swal from "sweetalert2";
import { CitizenKycOnboarding } from "../../components/kyc/CitizenKycOnboarding";
import { KycFilePreviewCard } from "../../components/kyc/KycFilePreviewCard";
import { profileApi } from "../../api/modules/profile.api";
import { isAtLeast18, isValidNepalPhone } from "../../validation/kyc.validators";

interface CitizenDetails {
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  current_address: string | null;
  permanent_address: string | null;
  ward_id: string | null;
  notification_pref: string | null;
  permanent_province_id?: string | null;
  permanent_district_id?: string | null;
  permanent_municipality_id?: string | null;
  permanent_ward_id?: string | null;
  permanent_tole?: string | null;
  current_province_id?: string | null;
  current_district_id?: string | null;
  current_municipality_id?: string | null;
  current_ward_id?: string | null;
  current_tole?: string | null;
  kyc_status?: string | null;
  identity_type?: string | null;
  identity_number?: string | null;
  identity_front_image_url?: string | null;
  identity_back_image_url?: string | null;
  profile_picture?: string | null;
  kyc_verified_at?: string | null;
  kyc_rejection_reason?: string | null;
}

interface ProfileData {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  municipality_id: string | null;
  department_id: string | null;
  created_at: string;
  profile_picture?: string | null;
  citizen_details: CitizenDetails | null;
}

interface RecentComplaint {
  id: string;
  co_uid: string;
  title: string;
  status: string;
  created_at: string;
}

interface DashboardData {
  summary: {
    totalComplaints: number;
    resolvedComplaints: number;
    pendingComplaints: number;
    activeIncidentsReported: number;
    unreadNotifications: number;
  };
  recentComplaints: RecentComplaint[];
}

function splitFullName(fullName: string): {
  first: string;
  middle: string;
  last: string;
} {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0 || (parts.length === 1 && parts[0] === "")) {
    return { first: "", middle: "", last: "" };
  }
  if (parts.length === 1) return { first: parts[0], middle: "", last: "" };
  if (parts.length === 2) return { first: parts[0], middle: "", last: parts[1] };
  return {
    first: parts[0],
    middle: parts.slice(1, -1).join(" "),
    last: parts[parts.length - 1],
  };
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatStatusLabel(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const STATUS_COLORS: Record<string, "warning" | "info" | "success" | "error" | "default"> = {
  pending: "warning",
  under_review: "info",
  in_progress: "info",
  resolved: "success",
  rejected: "error",
  closed: "default",
};

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  const [openSettingsModal, setOpenSettingsModal] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    phone: "",
    gender: "",
    date_of_birth: "",
    current_address: "",
    permanent_address: "",
    notification_pref: "",
  });
  const [saving, setSaving] = useState(false);

  // Structured Address State
  const [provinces, setProvinces] = useState<Province[]>([]);

  // Current Address
  const [currDistricts, setCurrDistricts] = useState<District[]>([]);
  const [currMunicipalities, setCurrMunicipalities] = useState<Municipality[]>([]);
  const [currWards, setCurrWards] = useState<Ward[]>([]);
  const [currProvinceId, setCurrProvinceId] = useState<string>("");
  const [currDistrictId, setCurrDistrictId] = useState<string>("");
  const [currMunicipalityId, setCurrMunicipalityId] = useState<string>("");
  const [currWardId, setCurrWardId] = useState<string>("");
  const [currTole, setCurrTole] = useState<string>("");
  const [loadingCurrDistricts, setLoadingCurrDistricts] = useState(false);
  const [loadingCurrMunicipalities, setLoadingCurrMunicipalities] = useState(false);
  const [loadingCurrWards, setLoadingCurrWards] = useState(false);

  // Permanent Address
  const [permDistricts, setPermDistricts] = useState<District[]>([]);
  const [permMunicipalities, setPermMunicipalities] = useState<Municipality[]>([]);
  const [permWards, setPermWards] = useState<Ward[]>([]);
  const [permProvinceId, setPermProvinceId] = useState<string>("");
  const [permDistrictId, setPermDistrictId] = useState<string>("");
  const [permMunicipalityId, setPermMunicipalityId] = useState<string>("");
  const [permWardId, setPermWardId] = useState<string>("");
  const [permTole, setPermTole] = useState<string>("");
  const [loadingPermDistricts, setLoadingPermDistricts] = useState(false);
  const [loadingPermMunicipalities, setLoadingPermMunicipalities] = useState(false);
  const [loadingPermWards, setLoadingPermWards] = useState(false);
  const [loadingProvinces, setLoadingProvinces] = useState(false);

  const [sameAsPermanent, setSameAsPermanent] = useState<boolean>(false);

  const loadProvinces = async () => {
    setLoadingProvinces(true);
    try {
      const res = await publicApi.getProvinces();
      if (res.success && res.data) {
        setProvinces(res.data);
        return res.data;
      }
    } catch (err) {
      console.error("Failed to load provinces:", err);
    } finally {
      setLoadingProvinces(false);
    }
    return [];
  };

  // Fetch provinces reference once
  useEffect(() => {
    loadProvinces();
  }, []);

  const handleOpenSettings = async () => {
    if (profile) {
      const cd = profile.citizen_details;
      const { first, middle, last } = splitFullName(profile.full_name);
      setForm({
        first_name: cd?.first_name || first,
        middle_name: cd?.middle_name || middle,
        last_name: cd?.last_name || last,
        phone: profile.phone || "",
        gender: cd?.gender || "prefer_not_to_say",
        date_of_birth: cd?.date_of_birth || "",
        current_address: cd?.current_address || "",
        permanent_address: cd?.permanent_address || "",
        notification_pref: cd?.notification_pref || "both",
      });

      // Ensure provinces are loaded
      let currentProvinces = provinces;
      if (currentProvinces.length === 0) {
        currentProvinces = await loadProvinces();
      }

      // Populate Current Address cascading dropdowns
      const cProv = cd?.current_province_id || "";
      const cDist = cd?.current_district_id || "";
      const cMuni = cd?.current_municipality_id || "";
      const cWard = cd?.current_ward_id || "";
      const cTole = cd?.current_tole || "";

      setCurrProvinceId(cProv);
      setCurrDistrictId(cDist);
      setCurrMunicipalityId(cMuni);
      setCurrWardId(cWard);
      setCurrTole(cTole);

      if (cProv) {
        setLoadingCurrDistricts(true);
        publicApi.getDistricts(cProv).then((r) => {
          if (r.success && r.data) setCurrDistricts(r.data);
        }).catch(console.error).finally(() => setLoadingCurrDistricts(false));
      }
      if (cDist) {
        setLoadingCurrMunicipalities(true);
        publicApi.getMunicipalities(cDist).then((r) => {
          if (r.success && r.data) setCurrMunicipalities(r.data);
        }).catch(console.error).finally(() => setLoadingCurrMunicipalities(false));
      }
      if (cMuni) {
        setLoadingCurrWards(true);
        publicApi.getWards(cMuni).then((r) => {
          if (r.success && r.data) setCurrWards(r.data);
        }).catch(console.error).finally(() => setLoadingCurrWards(false));
      }

      // Populate Permanent Address cascading dropdowns
      const pProv = cd?.permanent_province_id || "";
      const pDist = cd?.permanent_district_id || "";
      const pMuni = cd?.permanent_municipality_id || "";
      const pWard = cd?.permanent_ward_id || "";
      const pTole = cd?.permanent_tole || "";

      setPermProvinceId(pProv);
      setPermDistrictId(pDist);
      setPermMunicipalityId(pMuni);
      setPermWardId(pWard);
      setPermTole(pTole);

      if (pProv) {
        setLoadingPermDistricts(true);
        publicApi.getDistricts(pProv).then((r) => {
          if (r.success && r.data) setPermDistricts(r.data);
        }).catch(console.error).finally(() => setLoadingPermDistricts(false));
      }
      if (pDist) {
        setLoadingPermMunicipalities(true);
        publicApi.getMunicipalities(pDist).then((r) => {
          if (r.success && r.data) setPermMunicipalities(r.data);
        }).catch(console.error).finally(() => setLoadingPermMunicipalities(false));
      }
      if (pMuni) {
        setLoadingPermWards(true);
        publicApi.getWards(pMuni).then((r) => {
          if (r.success && r.data) setPermWards(r.data);
        }).catch(console.error).finally(() => setLoadingPermWards(false));
      }

      setSameAsPermanent(false);
    }
    setOpenSettingsModal(true);
  };

  const handleCurrProvinceChange = async (provId: string) => {
    setCurrProvinceId(provId);
    setCurrDistrictId("");
    setCurrMunicipalityId("");
    setCurrWardId("");
    setCurrDistricts([]);
    setCurrMunicipalities([]);
    setCurrWards([]);
    if (!provId) return;
    setLoadingCurrDistricts(true);
    try {
      const res = await publicApi.getDistricts(provId);
      if (res.success && res.data) setCurrDistricts(res.data);
    } catch (err) {
      console.error("Failed to load districts:", err);
    } finally {
      setLoadingCurrDistricts(false);
    }
  };

  const handleCurrDistrictChange = async (distId: string) => {
    setCurrDistrictId(distId);
    setCurrMunicipalityId("");
    setCurrWardId("");
    setCurrMunicipalities([]);
    setCurrWards([]);
    if (!distId) return;
    setLoadingCurrMunicipalities(true);
    try {
      const res = await publicApi.getMunicipalities(distId);
      if (res.success && res.data) setCurrMunicipalities(res.data);
    } catch (err) {
      console.error("Failed to load municipalities:", err);
    } finally {
      setLoadingCurrMunicipalities(false);
    }
  };

  const handleCurrMunicipalityChange = async (muniId: string) => {
    setCurrMunicipalityId(muniId);
    setCurrWardId("");
    setCurrWards([]);
    if (!muniId) return;
    setLoadingCurrWards(true);
    try {
      const res = await publicApi.getWards(muniId);
      if (res.success && res.data) setCurrWards(res.data);
    } catch (err) {
      console.error("Failed to load wards:", err);
    } finally {
      setLoadingCurrWards(false);
    }
  };

  const handlePermProvinceChange = async (provId: string) => {
    setPermProvinceId(provId);
    setPermDistrictId("");
    setPermMunicipalityId("");
    setPermWardId("");
    setPermDistricts([]);
    setPermMunicipalities([]);
    setPermWards([]);
    if (!provId) return;
    setLoadingPermDistricts(true);
    try {
      const res = await publicApi.getDistricts(provId);
      if (res.success && res.data) setPermDistricts(res.data);
    } catch (err) {
      console.error("Failed to load permanent districts:", err);
    } finally {
      setLoadingPermDistricts(false);
    }
  };

  const handlePermDistrictChange = async (distId: string) => {
    setPermDistrictId(distId);
    setPermMunicipalityId("");
    setPermWardId("");
    setPermMunicipalities([]);
    setPermWards([]);
    if (!distId) return;
    setLoadingPermMunicipalities(true);
    try {
      const res = await publicApi.getMunicipalities(distId);
      if (res.success && res.data) setPermMunicipalities(res.data);
    } catch (err) {
      console.error("Failed to load permanent municipalities:", err);
    } finally {
      setLoadingPermMunicipalities(false);
    }
  };

  const handlePermMunicipalityChange = async (muniId: string) => {
    setPermMunicipalityId(muniId);
    setPermWardId("");
    setPermWards([]);
    if (!muniId) return;
    setLoadingPermWards(true);
    try {
      const res = await publicApi.getWards(muniId);
      if (res.success && res.data) setPermWards(res.data);
    } catch (err) {
      console.error("Failed to load permanent wards:", err);
    } finally {
      setLoadingPermWards(false);
    }
  };

  const handleSameAsPermanentToggle = (checked: boolean) => {
    setSameAsPermanent(checked);
    if (checked) {
      setPermProvinceId(currProvinceId);
      setPermDistricts(currDistricts);
      setPermDistrictId(currDistrictId);
      setPermMunicipalities(currMunicipalities);
      setPermMunicipalityId(currMunicipalityId);
      setPermWards(currWards);
      setPermWardId(currWardId);
      setPermTole(currTole);
    }
  };

  const buildAddressString = (
    provId: string,
    distId: string,
    muniId: string,
    wardId: string,
    tole: string,
    pList: Province[],
    dList: District[],
    mList: Municipality[],
    wList: Ward[]
  ) => {
    const prov = pList.find((p) => p.id === provId)?.name || "";
    const dist = dList.find((d) => d.id === distId)?.name || "";
    const muni = mList.find((m) => m.id === muniId)?.official_name || "";
    const ward = wList.find((w) => w.id === wardId)?.ward_no;
    const parts: string[] = [];
    if (tole && tole.trim()) parts.push(tole.trim());
    if (ward !== undefined && ward !== null) parts.push(`Ward ${ward}`);
    if (muni) parts.push(muni);
    if (dist) parts.push(dist);
    if (prov) parts.push(prov);
    return parts.join(", ");
  };

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [previewDocTitle, setPreviewDocTitle] = useState<string>("");
  const [showReupload, setShowReupload] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [profileRes, dashboardRes] = await Promise.all([
          fetchWithAuth(`${BASE_URL}/auth/me`),
          fetchWithAuth(`${BASE_URL}/citizen/dashboard`),
        ]);

        const profileResult = await profileRes.json();
        if (profileResult.success && profileResult.data) {
          const data = profileResult.data as ProfileData;
          setProfile(data);
          const cd = data.citizen_details;
          const { first, middle, last } = splitFullName(data.full_name);
          setForm({
            first_name: cd?.first_name || first,
            middle_name: cd?.middle_name || middle,
            last_name: cd?.last_name || last,
            phone: data.phone || "",
            gender: cd?.gender || "prefer_not_to_say",
            date_of_birth: cd?.date_of_birth || "",
            current_address: cd?.current_address || "",
            permanent_address: cd?.permanent_address || "",
            notification_pref: cd?.notification_pref || "both",
          });
        } else {
          setError("Failed to load profile.");
        }

        const dashboardResult = await dashboardRes.json();
        if (dashboardResult.success && dashboardResult.data) {
          setDashboard(dashboardResult.data as DashboardData);
        }
      } catch {
        setError("Failed to load profile. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSaveProfile = async () => {
    try {
      const kycVerified = profile?.citizen_details?.kyc_status === "verified";

      if (!kycVerified && form.date_of_birth && !isAtLeast18(form.date_of_birth)) {
        Swal.fire({
          icon: "warning",
          title: "Invalid Date of Birth",
          text: "You must be at least 18 years old to update your profile.",
        });
        return;
      }

      if (form.phone && !isValidNepalPhone(form.phone)) {
        Swal.fire({
          icon: "warning",
          title: "Invalid Phone Number",
          text: "Please enter a valid 10-digit Nepal mobile number (e.g. 98XXXXXXXX or 97XXXXXXXX).",
        });
        return;
      }

      setSaving(true);

      // 1. Prepare and Save Structured Addresses
      let newCurrentAddress = form.current_address;
      let newPermanentAddress = form.permanent_address;

      const hasCurrentStructured = Boolean(currProvinceId && currDistrictId && currMunicipalityId && currWardId);
      const hasPermStructured = !kycVerified && Boolean(permProvinceId && permDistrictId && permMunicipalityId && permWardId);

      const addressPayload: any = {};

      if (hasCurrentStructured) {
        newCurrentAddress = buildAddressString(
          currProvinceId,
          currDistrictId,
          currMunicipalityId,
          currWardId,
          currTole,
          provinces,
          currDistricts,
          currMunicipalities,
          currWards
        ) || form.current_address;

        addressPayload.current = {
          province_id: currProvinceId,
          district_id: currDistrictId,
          municipality_id: currMunicipalityId,
          ward_id: currWardId,
          tole: currTole.trim() || undefined,
          full_address: newCurrentAddress,
        };
      }

      if (hasPermStructured) {
        newPermanentAddress = buildAddressString(
          permProvinceId,
          permDistrictId,
          permMunicipalityId,
          permWardId,
          permTole,
          provinces,
          permDistricts,
          permMunicipalities,
          permWards
        ) || form.permanent_address;

        addressPayload.permanent = {
          province_id: permProvinceId,
          district_id: permDistrictId,
          municipality_id: permMunicipalityId,
          ward_id: permWardId,
          tole: permTole.trim() || undefined,
          full_address: newPermanentAddress,
        };
      }

      if (addressPayload.current || addressPayload.permanent) {
        await citizenApi.updateAddress(addressPayload);
      }

      // 2. Save General Profile Details (phone, gender, preferences, name if unverified)
      const payload: Record<string, string> = {};
      if (!kycVerified) {
        if (form.first_name !== (profile?.citizen_details?.first_name || "")) payload.first_name = form.first_name;
        if (form.middle_name !== (profile?.citizen_details?.middle_name || "")) payload.middle_name = form.middle_name;
        if (form.last_name !== (profile?.citizen_details?.last_name || "")) payload.last_name = form.last_name;
        if (form.date_of_birth !== (profile?.citizen_details?.date_of_birth || "")) payload.date_of_birth = form.date_of_birth;
      }
      if (form.phone !== (profile?.phone || "")) payload.phone = form.phone;
      if (form.gender !== (profile?.citizen_details?.gender || "")) payload.gender = form.gender;
      if (form.notification_pref !== (profile?.citizen_details?.notification_pref || "")) payload.notification_pref = form.notification_pref;

      if (Object.keys(payload).length > 0) {
        const res = await fetchWithAuth(`${BASE_URL}/citizen/profile`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.message || "Failed to update profile");
      }

      const newFirstName = !kycVerified ? form.first_name : (profile?.citizen_details?.first_name || "");
      const newMiddleName = !kycVerified ? form.middle_name : (profile?.citizen_details?.middle_name || "");
      const newLastName = !kycVerified ? form.last_name : (profile?.citizen_details?.last_name || "");
      const fullName = !kycVerified
        ? `${form.first_name}${form.middle_name ? " " + form.middle_name : ""} ${form.last_name}`.trim()
        : profile!.full_name;

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              full_name: fullName,
              phone: form.phone,
              municipality_id: currMunicipalityId || prev.municipality_id,
              citizen_details: {
                ...prev.citizen_details!,
                first_name: newFirstName,
                middle_name: newMiddleName,
                last_name: newLastName,
                gender: form.gender,
                date_of_birth: !kycVerified ? form.date_of_birth : prev.citizen_details?.date_of_birth || "",
                current_address: newCurrentAddress,
                permanent_address: newPermanentAddress,
                current_province_id: currProvinceId || prev.citizen_details?.current_province_id,
                current_district_id: currDistrictId || prev.citizen_details?.current_district_id,
                current_municipality_id: currMunicipalityId || prev.citizen_details?.current_municipality_id,
                current_ward_id: currWardId || prev.citizen_details?.current_ward_id,
                current_tole: currTole || prev.citizen_details?.current_tole,
                permanent_province_id: hasPermStructured ? permProvinceId : prev.citizen_details?.permanent_province_id,
                permanent_district_id: hasPermStructured ? permDistrictId : prev.citizen_details?.permanent_district_id,
                permanent_municipality_id: hasPermStructured ? permMunicipalityId : prev.citizen_details?.permanent_municipality_id,
                permanent_ward_id: hasPermStructured ? permWardId : prev.citizen_details?.permanent_ward_id,
                permanent_tole: hasPermStructured ? permTole : prev.citizen_details?.permanent_tole,
                ward_id: currWardId || prev.citizen_details?.ward_id,
                notification_pref: form.notification_pref,
              },
            }
          : prev,
      );

      setForm((prev) => ({
        ...prev,
        current_address: newCurrentAddress,
        permanent_address: newPermanentAddress,
      }));

      setOpenSettingsModal(false);
      Swal.fire({ icon: "success", title: "Profile Settings Updated", timer: 1500, showConfirmButton: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update profile";
      Swal.fire({ icon: "error", title: "Error", text: msg });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      Swal.fire({ icon: "error", title: "Passwords do not match" });
      return;
    }
    try {
      setChangingPassword(true);
      const res = await fetchWithAuth(`${BASE_URL}/auth/change-password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to change password");
      if (result.data?.access_token) {
        localStorage.setItem("access_token", result.data.access_token);
      }
      if (result.data?.refresh_token) {
        localStorage.setItem("refresh_token", result.data.refresh_token);
      }
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
      Swal.fire({ icon: "success", title: "Password Changed", timer: 1500, showConfirmButton: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to change password";
      Swal.fire({ icon: "error", title: "Error", text: msg });
    } finally {
      setChangingPassword(false);
    }
  };

  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleDeleteAccount = async () => {
    const { value: formValues } = await Swal.fire({
      title: "Delete Your Account?",
      html: `
        <div style="text-align: left; font-size: 0.95rem; color: #475569;">
          <p style="margin-bottom: 12px; color: #dc2626; font-weight: 600;">
            ⚠️ This action is permanent and cannot be undone.
          </p>
          <p style="margin-bottom: 16px; font-size: 0.875rem;">
            All your submitted grievances, personal profile records, and uploaded KYC verification documents will be completely erased.
          </p>
          <label style="display: block; margin-bottom: 6px; font-weight: 500; font-size: 0.875rem; color: #1e293b;">
            Enter your current password to confirm:
          </label>
          <input id="swal-input-password" type="password" class="swal2-input" placeholder="Current Password" style="margin: 0 0 16px 0; width: 100%; box-sizing: border-box;" />
          <label style="display: block; margin-bottom: 6px; font-weight: 500; font-size: 0.875rem; color: #1e293b;">
            Type <strong>DELETE</strong> in capital letters:
          </label>
          <input id="swal-input-confirm" type="text" class="swal2-input" placeholder="DELETE" style="margin: 0; width: 100%; box-sizing: border-box;" />
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Permanently Delete Account",
      cancelButtonText: "Cancel",
      focusCancel: true,
      preConfirm: () => {
        const password = (document.getElementById("swal-input-password") as HTMLInputElement)?.value;
        const confirmText = (document.getElementById("swal-input-confirm") as HTMLInputElement)?.value;
        if (!password) {
          Swal.showValidationMessage("Please enter your current password.");
          return false;
        }
        if (confirmText !== "DELETE") {
          Swal.showValidationMessage("Please type DELETE in capital letters to confirm.");
          return false;
        }
        return { password };
      },
    });

    if (!formValues?.password) return;

    setDeletingAccount(true);
    try {
      await citizenApi.deleteAccount(formValues.password);
      await Swal.fire({
        icon: "success",
        title: "Account Deleted",
        text: "Your account has been deleted successfully. You will now be redirected to the login page.",
        confirmButtonColor: "#3b82f6",
        timer: 3000,
      });
      await logout({ skipServer: true });
      navigate("/login");
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || "Failed to delete account. Please check your password.";
      Swal.fire({
        icon: "error",
        title: "Deletion Failed",
        text: errMsg,
        confirmButtonColor: "#dc2626",
      });
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      Swal.fire({
        icon: "warning",
        title: "File Too Large",
        text: "Please select an image smaller than 2MB.",
      });
      return;
    }

    if (!file.type.startsWith("image/")) {
      Swal.fire({
        icon: "warning",
        title: "Invalid File Type",
        text: "Please select a valid image file (JPG, PNG, WebP).",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      try {
        setUploadingAvatar(true);
        const res = await profileApi.updateProfilePicture(base64Data);
        const newUrl = res.data?.profile_picture || res.profile_picture || base64Data;

        setProfile((prev) =>
          prev
            ? {
                ...prev,
                profile_picture: newUrl,
                citizen_details: prev.citizen_details
                  ? { ...prev.citizen_details, profile_picture: newUrl }
                  : prev.citizen_details,
              }
            : prev
        );

        Swal.fire({
          icon: "success",
          title: "Profile Picture Updated",
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (err: any) {
        Swal.fire({
          icon: "error",
          title: "Upload Failed",
          text: err.response?.data?.message || err.message || "Failed to update profile picture.",
        });
      } finally {
        setUploadingAvatar(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !profile) {
    return (
      <Box p={3} maxWidth="md" mx="auto">
        <Alert severity="error">{error || "Profile not found"}</Alert>
      </Box>
    );
  }

  const cd = profile.citizen_details;
  const displayName = cd
    ? `${cd.first_name || ""}${cd.middle_name ? " " + cd.middle_name : ""} ${cd.last_name || ""}`.trim()
    : profile.full_name;

  const currentAvatarUrl = cd?.profile_picture || profile.profile_picture || undefined;
  const isKycVerified = cd?.kyc_status === "verified";
  const isKycPending = cd?.kyc_status === "pending";

  const recentComplaints = dashboard?.recentComplaints || [];

  return (
    <Box maxWidth="lg" sx={{ margin: "0 auto", px: { xs: 1, sm: 2, md: 3 }, py: 3 }}>
      {/* ─── Cover + Avatar ─── */}
      <Card sx={{ borderRadius: 3, overflow: "hidden", mb: 2 }}>
        <Box
          sx={{
            height: { xs: 140, sm: 200 },
            background: "linear-gradient(135deg, #1976d2 0%, #9c27b0 50%, #ff6f00 100%)",
            position: "relative",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              bottom: { xs: -48, sm: -56 },
              left: { xs: 16, sm: 32 },
              zIndex: 2,
            }}
          >
            <Box position="relative" display="inline-block">
              <Avatar
                src={currentAvatarUrl}
                alt={displayName}
                sx={{
                  width: { xs: 96, sm: 112 },
                  height: { xs: 96, sm: 112 },
                  bgcolor: "primary.dark",
                  fontSize: { xs: "2.5rem", sm: "3rem" },
                  fontWeight: "bold",
                  border: "4px solid white",
                  boxShadow: isKycVerified
                    ? "0 0 0 3px #2563EB, 0 4px 16px rgba(37,99,235,0.35)"
                    : "0 2px 12px rgba(0,0,0,0.15)",
                }}
              >
                {getInitials(displayName)}
              </Avatar>

              {/* Verified Badge */}
              {isKycVerified && (
                <Tooltip title="KYC Identity Verified" arrow>
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: 2,
                      right: 2,
                      bgcolor: "#2563EB",
                      borderRadius: "50%",
                      width: 28,
                      height: 28,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "2px solid white",
                      boxShadow: "0 2px 8px rgba(37,99,235,0.4)",
                      zIndex: 3,
                    }}
                  >
                    <VerifiedIcon sx={{ fontSize: 18, color: "white" }} />
                  </Box>
                </Tooltip>
              )}

              {/* Upload photo button */}
              <Tooltip title="Upload Profile Picture" arrow>
                <IconButton
                  component="label"
                  size="small"
                  disabled={uploadingAvatar}
                  sx={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    bgcolor: "background.paper",
                    boxShadow: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    "&:hover": { bgcolor: "grey.100" },
                    zIndex: 3,
                  }}
                >
                  {uploadingAvatar ? (
                    <CircularProgress size={16} />
                  ) : (
                    <PhotoCamera sx={{ fontSize: 16 }} color="primary" />
                  )}
                  <input
                    type="file"
                    hidden
                    ref={fileInputRef}
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarChange}
                  />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            pt: { xs: 6, sm: 7 },
            pb: 2,
            px: { xs: 2, sm: 3 },
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography variant="h5" fontWeight="bold">
              {displayName}
            </Typography>
            <Box display="flex" alignItems="center" gap={1} mt={0.5} flexWrap="wrap">
              <Box display="flex" alignItems="center" gap={0.5}>
                <Email fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {profile.email}
                </Typography>
              </Box>
              <Chip label="Citizen" size="small" color="primary" variant="outlined" />
              {isKycVerified ? (
                <Chip
                  icon={<VerifiedIcon sx={{ fontSize: "16px !important", color: "#2563EB !important" }} />}
                  label="KYC Verified"
                  size="small"
                  sx={{
                    bgcolor: "rgba(37, 99, 235, 0.08)",
                    color: "#2563EB",
                    border: "1px solid #93C5FD",
                    fontWeight: 700,
                  }}
                />
              ) : isKycPending ? (
                <Chip
                  icon={<HourglassEmpty sx={{ fontSize: "14px !important" }} />}
                  label="KYC Pending"
                  size="small"
                  color="warning"
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
              ) : (
                <Chip
                  label="KYC Unverified"
                  size="small"
                  color="default"
                  variant="outlined"
                  sx={{ color: "text.secondary" }}
                />
              )}
            </Box>
          </Box>
          <Button
            variant="contained"
            size="small"
            startIcon={<SettingsIcon />}
            onClick={handleOpenSettings}
            sx={{
              mt: { xs: 1, sm: 0 },
              bgcolor: "#2563EB",
              "&:hover": { bgcolor: "#1d4ed8" },
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
              px: 2.5,
              py: 0.8,
              boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
            }}
          >
            Settings
          </Button>
        </Box>
      </Card>

      {/* ─── Stats Row ─── */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: "Total Complaints", value: dashboard?.summary.totalComplaints ?? 0, color: "primary" },
          { label: "Resolved", value: dashboard?.summary.resolvedComplaints ?? 0, color: "success" },
          { label: "Pending", value: dashboard?.summary.pendingComplaints ?? 0, color: "warning" },
          { label: "Member Since", value: formatDate(profile.created_at), color: "info" },
        ].map((stat) => (
          <Grid item xs={6} sm={3} key={stat.label}>
            <Card sx={{ p: 2, textAlign: "center", borderRadius: 2 }}>
              <Typography variant="h5" fontWeight="bold" color={`${stat.color}.main`}>
                {typeof stat.value === "number" ? stat.value : stat.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stat.label}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ─── Tabs ─── */}
      <Card sx={{ borderRadius: 2, mb: 3 }}>
        <Tabs
          value={tabIndex}
          onChange={(_e, v) => setTabIndex(v)}
          sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}
        >
          <Tab label="About" icon={<BadgeOutlined fontSize="small" />} iconPosition="start" />
          <Tab label="Address" icon={<LocationOn fontSize="small" />} iconPosition="start" />
          <Tab label="KYC Settings" icon={<Assignment fontSize="small" />} iconPosition="start" />
          <Tab label="Activity" icon={<ListAlt fontSize="small" />} iconPosition="start" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* ═══ About Tab ═══ */}
          {tabIndex === 0 && (
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5}>
                <Typography variant="h6" fontWeight="bold">
                  Personal Details
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<SettingsIcon />}
                  onClick={handleOpenSettings}
                  sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
                >
                  Edit Details
                </Button>
              </Box>
              <Grid container spacing={3}>
              {[
                { label: "First Name", value: form.first_name, icon: <BadgeOutlined fontSize="small" /> },
                { label: "Middle Name", value: form.middle_name || "—", icon: <BadgeOutlined fontSize="small" /> },
                { label: "Last Name", value: form.last_name, icon: <BadgeOutlined fontSize="small" /> },
                { label: "Phone", value: form.phone || "—", icon: <Phone fontSize="small" /> },
                { label: "Gender", value: form.gender ? form.gender.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—", icon: <Wc fontSize="small" /> },
                { label: "Date of Birth", value: form.date_of_birth ? formatDate(form.date_of_birth) : "—", icon: <Cake fontSize="small" /> },
                { label: "Notification Preference", value: form.notification_pref === "both" ? "Email & SMS" : form.notification_pref === "email" ? "Email Only" : form.notification_pref === "sms" ? "SMS Only" : "None", icon: <NotificationsOutlined fontSize="small" /> },
              ].map((field) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={field.label}>
                  <Card variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
                    <Box display="flex" alignItems="center" gap={1} mb={0.5} color="text.secondary">
                      {field.icon}
                      <Typography variant="caption" fontWeight="medium">
                        {field.label}
                      </Typography>
                    </Box>
                    <Typography variant="body1" fontWeight={field.value !== "—" ? "medium" : "regular"} color={field.value !== "—" ? "text.primary" : "text.disabled"}>
                      {field.value}
                    </Typography>
                  </Card>
                </Grid>
              ))}
              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 1 }} />
                <Box display="flex" flexWrap="wrap" gap={3} color="text.secondary">
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Email fontSize="small" />
                    <Typography variant="body2">{profile.email}</Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <CalendarMonth fontSize="small" />
                    <Typography variant="body2">
                      Joined {formatDate(profile.created_at)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}

          {/* ═══ Address Tab ═══ */}
          {tabIndex === 1 && (
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5}>
                <Typography variant="h6" fontWeight="bold">
                  Residential Addresses
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={handleOpenSettings}
                  sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
                >
                  Edit Address
                </Button>
              </Box>
              <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: "100%" }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                    <Home color="primary" fontSize="small" />
                    <Typography fontWeight="bold">Permanent Address</Typography>
                  </Box>
                  <Typography
                    variant="body1"
                    color={form.permanent_address ? "text.primary" : "text.disabled"}
                    sx={{ whiteSpace: "pre-wrap", minHeight: 60 }}
                  >
                    {form.permanent_address || "No permanent address registered"}
                  </Typography>
                  {cd?.ward_id && (
                    <Chip
                      icon={<LocationOn />}
                      label={`Ward: ${cd.ward_id.slice(0, 8)}...`}
                      size="small"
                      variant="outlined"
                      sx={{ mt: 1.5 }}
                    />
                  )}
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: "100%" }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                    <LocationOn color="secondary" fontSize="small" />
                    <Typography fontWeight="bold">Current Address</Typography>
                  </Box>
                  <Typography
                    variant="body1"
                    color={form.current_address ? "text.primary" : "text.disabled"}
                    sx={{ whiteSpace: "pre-wrap", minHeight: 60 }}
                  >
                    {form.current_address || "No current address registered"}
                  </Typography>
                </Card>
              </Grid>
            </Grid>
            </Box>
          )}

          {/* ═══ KYC Tab ═══ */}
          {tabIndex === 2 && (
            <Box>
              {isKycVerified && !showReupload ? (
                <Box>
                  <Alert
                    severity="success"
                    icon={<CheckCircle fontSize="inherit" />}
                    sx={{ mb: 3, borderRadius: 2 }}
                    action={
                      <Button
                        color="inherit"
                        size="small"
                        onClick={() => setShowReupload(true)}
                        sx={{ fontWeight: 600, textTransform: "none" }}
                      >
                        Re-upload Documents
                      </Button>
                    }
                  >
                    <Typography variant="subtitle2" fontWeight={700}>
                      Identity Verified Officially
                    </Typography>
                    Your citizen KYC verification is complete and confirmed. Your official profile picture and identity records are verified.
                  </Alert>

                  <Grid container spacing={3}>
                    {/* Left: Verified Profile Picture Card */}
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Card variant="outlined" sx={{ p: 3, textAlign: "center", borderRadius: 3, height: "100%" }}>
                        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                          Verified Profile Picture
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Official citizen identification portrait
                        </Typography>

                        <Box position="relative" display="inline-block" my={1}>
                          <Avatar
                            src={currentAvatarUrl}
                            alt={displayName}
                            sx={{
                              width: 120,
                              height: 120,
                              mx: "auto",
                              fontSize: "3rem",
                              fontWeight: "bold",
                              bgcolor: "primary.main",
                              border: "4px solid #2563EB",
                              boxShadow: "0 4px 20px rgba(37,99,235,0.25)",
                            }}
                          >
                            {getInitials(displayName)}
                          </Avatar>
                          <Box
                            sx={{
                              position: "absolute",
                              bottom: 4,
                              right: 4,
                              bgcolor: "#2563EB",
                              borderRadius: "50%",
                              width: 32,
                              height: 32,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: "2px solid white",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                            }}
                          >
                            <VerifiedIcon sx={{ fontSize: 20, color: "white" }} />
                          </Box>
                        </Box>

                        <Box mt={2}>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<PhotoCamera />}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingAvatar}
                            sx={{ textTransform: "none", borderRadius: 2 }}
                          >
                            {uploadingAvatar ? "Uploading..." : "Change Profile Photo"}
                          </Button>
                        </Box>
                      </Card>
                    </Grid>

                    {/* Right: Verified Credentials & Document Proofs */}
                    <Grid size={{ xs: 12, md: 8 }}>
                      <Card variant="outlined" sx={{ p: 3, borderRadius: 3, height: "100%" }}>
                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                          <Typography variant="subtitle1" fontWeight={700}>
                            Identity Credentials & Documents
                          </Typography>
                          <Chip
                            icon={<VerifiedIcon sx={{ fontSize: "16px !important" }} />}
                            label="Verified"
                            color="success"
                            size="small"
                            sx={{ fontWeight: 700 }}
                          />
                        </Box>

                        <Grid container spacing={2} mb={3}>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <Box sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 2 }}>
                              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                DOCUMENT TYPE
                              </Typography>
                              <Typography variant="body1" fontWeight={600} textTransform="capitalize">
                                {cd?.identity_type ? cd.identity_type.replace(/_/g, " ") : "Citizenship Card"}
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <Box sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 2 }}>
                              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                IDENTITY NUMBER
                              </Typography>
                              <Typography variant="body1" fontWeight={600}>
                                {cd?.identity_number || "—"}
                              </Typography>
                            </Box>
                          </Grid>
                          {cd?.kyc_verified_at && (
                            <Grid size={{ xs: 12 }}>
                              <Box sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 2 }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                  VERIFIED ON
                                </Typography>
                                <Typography variant="body2" fontWeight={500}>
                                  {formatDate(cd.kyc_verified_at)}
                                </Typography>
                              </Box>
                            </Grid>
                          )}
                        </Grid>

                        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                          Verified Document Images
                        </Typography>
                        <Grid container spacing={2}>
                          {cd?.identity_front_image_url && (
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <Card
                                variant="outlined"
                                sx={{
                                  p: 1,
                                  borderRadius: 2,
                                  textAlign: "center",
                                  cursor: "pointer",
                                  "&:hover": { borderColor: "primary.main" },
                                }}
                                onClick={() => {
                                  setPreviewDocUrl(cd.identity_front_image_url!);
                                  setPreviewDocTitle("Front Identity Document");
                                }}
                              >
                                <Box
                                  component="img"
                                  src={cd.identity_front_image_url}
                                  alt="Front Document"
                                  sx={{
                                    width: "100%",
                                    height: 120,
                                    objectFit: "cover",
                                    borderRadius: 1,
                                  }}
                                />
                                <Box display="flex" alignItems="center" justifyContent="center" gap={0.5} mt={1}>
                                  <ZoomIn fontSize="small" color="primary" />
                                  <Typography variant="caption" fontWeight={600}>
                                    Front Document (Click to view)
                                  </Typography>
                                </Box>
                              </Card>
                            </Grid>
                          )}
                          {cd?.identity_back_image_url && (
                            <Grid size={{ xs: 12, sm: 6 }}>
                              <Card
                                variant="outlined"
                                sx={{
                                  p: 1,
                                  borderRadius: 2,
                                  textAlign: "center",
                                  cursor: "pointer",
                                  "&:hover": { borderColor: "primary.main" },
                                }}
                                onClick={() => {
                                  setPreviewDocUrl(cd.identity_back_image_url!);
                                  setPreviewDocTitle("Back Identity Document");
                                }}
                              >
                                <Box
                                  component="img"
                                  src={cd.identity_back_image_url}
                                  alt="Back Document"
                                  sx={{
                                    width: "100%",
                                    height: 120,
                                    objectFit: "cover",
                                    borderRadius: 1,
                                  }}
                                />
                                <Box display="flex" alignItems="center" justifyContent="center" gap={0.5} mt={1}>
                                  <ZoomIn fontSize="small" color="primary" />
                                  <Typography variant="caption" fontWeight={600}>
                                    Back Document (Click to view)
                                  </Typography>
                                </Box>
                              </Card>
                            </Grid>
                          )}
                        </Grid>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>
              ) : isKycPending && !showReupload ? (
                <Box>
                  <Alert
                    severity="warning"
                    icon={<HourglassEmpty fontSize="inherit" />}
                    sx={{ mb: 3, borderRadius: 2 }}
                    action={
                      <Button
                        color="inherit"
                        size="small"
                        onClick={() => setShowReupload(true)}
                        sx={{ fontWeight: 600, textTransform: "none" }}
                      >
                        Update / Re-submit
                      </Button>
                    }
                  >
                    <Typography variant="subtitle2" fontWeight={700}>
                      Identity Verification In Progress
                    </Typography>
                    Your citizen KYC verification request has been submitted and is currently under review by municipal verification officers.
                  </Alert>

                  {/* Verification Timeline Stepper */}
                  <Card variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                      Application Status Timeline
                    </Typography>
                    <Box sx={{ mt: 2, mb: 1 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                          <Box sx={{ p: 2, bgcolor: "rgba(34,197,94,0.08)", borderRadius: 2, border: "1px solid #86EFAC" }}>
                            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                              <CheckCircle sx={{ color: "#16A34A", fontSize: 20 }} />
                              <Typography variant="subtitle2" fontWeight={700} color="#15803D">
                                1. Application Submitted
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              Credentials & document proofs recorded securely
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Box sx={{ p: 2, bgcolor: "rgba(245,158,11,0.08)", borderRadius: 2, border: "1px solid #FCD34D" }}>
                            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                              <HourglassEmpty sx={{ color: "#D97706", fontSize: 20 }} />
                              <Typography variant="subtitle2" fontWeight={700} color="#B45309">
                                2. Municipal Verification
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              Ward officer reviewing records (24–48 hours)
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 2, border: "1px solid #E2E8F0" }}>
                            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                              <VerifiedIcon sx={{ color: "#94A3B8", fontSize: 20 }} />
                              <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                                3. Official Verified ID
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="text.disabled">
                              Citizen badge active upon officer approval
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>
                  </Card>

                  {/* Submitted Documents Details */}
                  <Card variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="subtitle1" fontWeight={700}>
                        Submitted Document Records
                      </Typography>
                      <Chip
                        icon={<HourglassEmpty sx={{ fontSize: "14px !important" }} />}
                        label="Pending Approval"
                        color="warning"
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </Box>

                    <Grid container spacing={2} mb={3}>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 2 }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            DOCUMENT TYPE
                          </Typography>
                          <Typography variant="body1" fontWeight={600} textTransform="capitalize">
                            {cd?.identity_type ? cd.identity_type.replace(/_/g, " ") : "Citizenship Card"}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 2 }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            DOCUMENT NUMBER
                          </Typography>
                          <Typography variant="body1" fontWeight={700} color="primary.main">
                            {cd?.identity_number || "—"}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                      Attached Document Files:
                    </Typography>
                    <Grid container spacing={2}>
                      {cd?.identity_front_image_url && (
                        <Grid item xs={12} sm={6}>
                          <KycFilePreviewCard
                            label="Document Front"
                            fileData={cd.identity_front_image_url}
                            height={160}
                          />
                        </Grid>
                      )}
                      {cd?.identity_back_image_url && (
                        <Grid item xs={12} sm={6}>
                          <KycFilePreviewCard
                            label="Document Back"
                            fileData={cd.identity_back_image_url}
                            height={160}
                          />
                        </Grid>
                      )}
                    </Grid>
                  </Card>
                </Box>
              ) : cd?.kyc_status === "rejected" && !showReupload ? (
                <Box>
                  <Alert
                    severity="error"
                    icon={<ErrorOutlined fontSize="inherit" />}
                    sx={{ mb: 3, borderRadius: 2 }}
                    action={
                      <Button
                        color="inherit"
                        size="small"
                        onClick={() => setShowReupload(true)}
                        sx={{ fontWeight: 700, textTransform: "none" }}
                      >
                        Re-apply KYC Now
                      </Button>
                    }
                  >
                    <Typography variant="subtitle2" fontWeight={700}>
                      Identity Verification Rejected
                    </Typography>
                    {cd.kyc_rejection_reason || "Your document verification was rejected by municipal officers. Please re-upload clear photos of your valid identity document."}
                  </Alert>

                  <Card variant="outlined" sx={{ p: 3, borderRadius: 3, textAlign: "center", bgcolor: "#FFF5F5", borderColor: "#FCA5A5" }}>
                    <Typography variant="h6" fontWeight={700} color="error.main" gutterBottom>
                      Action Required: Submit Corrected Verification Documents
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 600, mx: "auto", mb: 3 }}>
                      Common reasons for rejection include blurry or cut-off photographs, mismatched name or birth date, or expired identity credentials.
                    </Typography>
                    <Button
                      variant="contained"
                      color="error"
                      onClick={() => setShowReupload(true)}
                      sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, px: 3, py: 1 }}
                    >
                      Start KYC Re-application Wizard
                    </Button>
                  </Card>
                </Box>
              ) : (
                <Box>
                  {showReupload && (
                    <Box mb={2.5} display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle2" color="text.secondary">
                        Re-submitting identity verification details
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setShowReupload(false)}
                        sx={{ textTransform: "none", borderRadius: 2 }}
                      >
                        Cancel & Return
                      </Button>
                    </Box>
                  )}

                  <CitizenKycOnboarding
                    initialData={{
                      identity_type: cd?.identity_type || "citizenship",
                      identity_number: cd?.identity_number || "",
                      identity_front_image_url: cd?.identity_front_image_url || null,
                      identity_back_image_url: cd?.identity_back_image_url || null,
                      profile_picture: currentAvatarUrl || null,
                    }}
                    profileDetails={{
                      full_name: displayName,
                      email: profile.email,
                      phone: form.phone || profile.phone || "",
                      gender: form.gender || cd?.gender || "",
                      date_of_birth: form.date_of_birth || cd?.date_of_birth || "",
                      permanent_address: form.permanent_address || cd?.permanent_address || "",
                      current_address: form.current_address || cd?.current_address || "",
                    }}
                    onSuccess={(updated) => {
                      setProfile((prev) =>
                        prev
                          ? {
                              ...prev,
                              profile_picture: updated.profile_picture || prev.profile_picture,
                              citizen_details: {
                                ...prev.citizen_details!,
                                kyc_status: "pending",
                                identity_type: updated.identity_type,
                                identity_number: updated.identity_number,
                                identity_front_image_url: updated.front_image || prev.citizen_details?.identity_front_image_url || null,
                                identity_back_image_url: updated.back_image || prev.citizen_details?.identity_back_image_url || null,
                                profile_picture: updated.profile_picture || prev.citizen_details?.profile_picture || null,
                              },
                            }
                          : prev
                      );
                      setShowReupload(false);
                    }}
                    onCancel={showReupload ? () => setShowReupload(false) : undefined}
                  />
                </Box>
              )}
            </Box>
          )}

          {/* ═══ Activity Tab ═══ */}
          {tabIndex === 3 && (
            <>
              {recentComplaints.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <ListAlt sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
                  <Typography color="text.secondary" gutterBottom>
                    No complaints submitted yet.
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{ mt: 1 }}
                    onClick={() => navigate("/citizen/complaints/new")}
                  >
                    Submit Your First Complaint
                  </Button>
                </Box>
              ) : (
                <Box>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Typography fontWeight="bold">Recent Complaints</Typography>
                    <Button
                      size="small"
                      onClick={() => navigate("/citizen/complaints")}
                    >
                      View All
                    </Button>
                  </Box>
                  {recentComplaints.map((complaint) => (
                    <Card
                      key={complaint.co_uid}
                      variant="outlined"
                      sx={{
                        p: 2,
                        mb: 1.5,
                        borderRadius: 2,
                        cursor: "pointer",
                        "&:hover": { bgcolor: "action.hover" },
                      }}
                      onClick={() => navigate(`/citizen/complaints/${complaint.co_uid}`)}
                    >
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Box flex={1}>
                          <Typography variant="body1" fontWeight="medium">
                            {complaint.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(complaint.created_at)}
                          </Typography>
                        </Box>
                        <Chip
                          label={formatStatusLabel(complaint.status)}
                          color={STATUS_COLORS[complaint.status] || "default"}
                          size="small"
                          sx={{ ml: 1, flexShrink: 0 }}
                        />
                      </Box>
                    </Card>
                  ))}
                </Box>
              )}
            </>
          )}
        </Box>
      </Card>

      {/* ─── Security / Change Password ─── */}
      <Card sx={{ borderRadius: 2, p: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Security color="primary" />
          <Typography variant="h6" fontWeight="bold">
            Security & Password
          </Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              type="password"
              label="Current Password"
              value={passwordForm.current_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              type="password"
              label="New Password"
              value={passwordForm.new_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              type="password"
              label="Confirm New Password"
              value={passwordForm.confirm_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
              size="small"
            />
          </Grid>
          <Grid item xs={12} display="flex" justifyContent="flex-end">
            <Button
              variant="contained"
              startIcon={changingPassword ? <CircularProgress size={18} color="inherit" /> : <Security />}
              onClick={handlePasswordChange}
              disabled={changingPassword}
            >
              {changingPassword ? "Changing..." : "Change Password"}
            </Button>
          </Grid>
        </Grid>
      </Card>

      {/* ─── Danger Zone: Delete Account ─── */}
      <Card
        sx={{
          borderRadius: 2,
          p: 3,
          mt: 3,
          border: "1px solid #fee2e2",
          bgcolor: "#fff5f5",
          boxShadow: "0 1px 3px rgba(239, 68, 68, 0.05)",
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <Box display="flex" alignItems="flex-start" gap={1.5} maxWidth="700px">
            <WarningAmberOutlined sx={{ color: "#dc2626", mt: 0.3 }} />
            <Box>
              <Typography variant="h6" fontWeight="bold" sx={{ color: "#991b1b" }}>
                Danger Zone: Delete Account
              </Typography>
              <Typography variant="body2" sx={{ color: "#7f1d1d", mt: 0.5 }}>
                Permanently remove your citizen account, submitted complaints, identity documents, and profile data. Once deleted, this account cannot be recovered.
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            color="error"
            startIcon={deletingAccount ? <CircularProgress size={18} color="inherit" /> : <DeleteForever />}
            onClick={handleDeleteAccount}
            disabled={deletingAccount}
            sx={{
              bgcolor: "#dc2626",
              "&:hover": { bgcolor: "#b91c1c" },
              fontWeight: 600,
              textTransform: "none",
              px: 3,
              py: 1,
              borderRadius: 2,
            }}
          >
            {deletingAccount ? "Deleting Account..." : "Delete Account"}
          </Button>
        </Box>
      </Card>

      {/* ─── Document Preview Dialog ─── */}
      <Dialog
        open={Boolean(previewDocUrl)}
        onClose={() => setPreviewDocUrl(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ m: 0, p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6" fontWeight="bold">
            {previewDocTitle || "Document Preview"}
          </Typography>
          <IconButton onClick={() => setPreviewDocUrl(null)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ textAlign: "center", bgcolor: "#f8fafc", p: 3 }}>
          {previewDocUrl && (
            <img
              src={previewDocUrl}
              alt={previewDocTitle}
              style={{
                maxWidth: "100%",
                maxHeight: "70vh",
                objectFit: "contain",
                borderRadius: 8,
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDocUrl(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ─── Profile Settings Dialog ─── */}
      <Dialog
        open={openSettingsModal}
        onClose={() => !saving && setOpenSettingsModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, overflow: "hidden" },
        }}
      >
        <DialogTitle
          sx={{
            m: 0,
            p: 2.5,
            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box
              sx={{
                bgcolor: "rgba(255,255,255,0.15)",
                borderRadius: 2,
                p: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <SettingsIcon sx={{ color: "white" }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} color="white">
                Profile Settings
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>
                Update your contact details, residential address, and preferences
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={() => !saving && setOpenSettingsModal(false)}
            size="small"
            sx={{ color: "rgba(255,255,255,0.8)", "&:hover": { color: "white" } }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: { xs: 2, sm: 3 }, bgcolor: "#f8fafc" }}>
          {/* Identity & KYC Verification Status Notice */}
          {isKycVerified ? (
            <Alert
              severity="info"
              icon={<VerifiedIcon sx={{ color: "#2563EB" }} />}
              sx={{
                mb: 3,
                borderRadius: 2,
                border: "1px solid #bfdbfe",
                bgcolor: "#eff6ff",
                "& .MuiAlert-message": { width: "100%" },
              }}
            >
              <Typography variant="subtitle2" fontWeight={700} color="#1e40af">
                Identity Verified via Official KYC
              </Typography>
              <Typography variant="body2" color="#1e3a8a">
                Your citizen identity is officially verified. Legal name and birth date are locked and cannot be edited. You can update your contact number, current & permanent address, and notifications below.
              </Typography>
            </Alert>
          ) : (
            <Alert
              severity="warning"
              icon={<HourglassEmpty />}
              sx={{ mb: 3, borderRadius: 2 }}
            >
              <Typography variant="subtitle2" fontWeight={700}>
                KYC Not Yet Verified
              </Typography>
              <Typography variant="body2">
                Your identity has not been verified yet. You can update your name before submitting your KYC verification.
              </Typography>
            </Alert>
          )}

          {/* Section 1: Account Information (Email Permanent Lock + Legal Name) */}
          <Typography
            variant="subtitle2"
            fontWeight={700}
            color="text.secondary"
            textTransform="uppercase"
            letterSpacing={0.5}
            mb={1.5}
          >
            1. Account & Legal Identity
          </Typography>
          <Card variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 2, bgcolor: "white" }}>
            <Grid container spacing={2}>
              {/* Email Address - Strictly Non-Editable */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email Address"
                  value={profile.email}
                  disabled
                  InputProps={{
                    startAdornment: <Email sx={{ color: "text.disabled", mr: 1 }} fontSize="small" />,
                    endAdornment: (
                      <Chip
                        icon={<LockIcon sx={{ fontSize: "14px !important" }} />}
                        label="Permanent (Non-editable)"
                        size="small"
                        variant="outlined"
                        sx={{ bgcolor: "#f1f5f9", borderColor: "#cbd5e1", color: "#64748b", fontWeight: 600 }}
                      />
                    ),
                  }}
                  helperText="The registered email address is permanently tied to your account and cannot be modified."
                />
              </Grid>

              {/* First Name */}
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="first_name"
                  value={form.first_name}
                  onChange={handleFormChange}
                  disabled={isKycVerified}
                  InputProps={{
                    endAdornment: isKycVerified ? (
                      <Tooltip title="Locked: Verified via official KYC" arrow>
                        <VerifiedIcon sx={{ color: "#2563EB", fontSize: 18 }} />
                      </Tooltip>
                    ) : undefined,
                  }}
                  helperText={isKycVerified ? "Verified via KYC (Locked)" : "Legal first name"}
                />
              </Grid>

              {/* Middle Name */}
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Middle Name (Optional)"
                  name="middle_name"
                  value={form.middle_name}
                  onChange={handleFormChange}
                  disabled={isKycVerified}
                  InputProps={{
                    endAdornment: isKycVerified ? (
                      <Tooltip title="Locked: Verified via official KYC" arrow>
                        <VerifiedIcon sx={{ color: "#2563EB", fontSize: 18 }} />
                      </Tooltip>
                    ) : undefined,
                  }}
                  helperText={isKycVerified ? "Verified via KYC (Locked)" : "Optional"}
                />
              </Grid>

              {/* Last Name */}
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Last Name"
                  name="last_name"
                  value={form.last_name}
                  onChange={handleFormChange}
                  disabled={isKycVerified}
                  InputProps={{
                    endAdornment: isKycVerified ? (
                      <Tooltip title="Locked: Verified via official KYC" arrow>
                        <VerifiedIcon sx={{ color: "#2563EB", fontSize: 18 }} />
                      </Tooltip>
                    ) : undefined,
                  }}
                  helperText={isKycVerified ? "Verified via KYC (Locked)" : "Legal family/last name"}
                />
              </Grid>
            </Grid>
          </Card>

          {/* Section 2: Contact & Structured Residential Address */}
          <Typography
            variant="subtitle2"
            fontWeight={700}
            color="text.secondary"
            textTransform="uppercase"
            letterSpacing={0.5}
            mb={1.5}
          >
            2. Contact & Structured Address
          </Typography>
          <Card variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 2, bgcolor: "white" }}>
            <Grid container spacing={2}>
              {/* Contact No / Phone */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Contact Number (Mobile)"
                  name="phone"
                  value={form.phone}
                  onChange={handleFormChange}
                  placeholder="e.g. 98XXXXXXXX"
                  InputProps={{
                    startAdornment: <Phone sx={{ color: "primary.main", mr: 1 }} fontSize="small" />,
                  }}
                  helperText="10-digit Nepal mobile number (e.g. 98XXXXXXXX or 97XXXXXXXX)"
                  error={Boolean(form.phone && !isValidNepalPhone(form.phone))}
                />
              </Grid>

              {/* Gender */}
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Gender"
                  name="gender"
                  value={form.gender || "prefer_not_to_say"}
                  onChange={handleFormChange}
                  InputProps={{
                    startAdornment: <Wc sx={{ color: "primary.main", mr: 1 }} fontSize="small" />,
                  }}
                >
                  <MenuItem value="male">Male</MenuItem>
                  <MenuItem value="female">Female</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                  <MenuItem value="prefer_not_to_say">Prefer not to say</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
              </Grid>

              {/* ─── Current Address (Dropdowns) ─── */}
              <Grid item xs={12}>
                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                  <LocationOn color="secondary" fontSize="small" />
                  <Typography variant="subtitle1" fontWeight={700} color="secondary.main">
                    Current Address (अस्थायी / बसोबास ठेगाना)
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                  Select your current residence from official administrative units. Your civic grievances will automatically route to this municipality and ward.
                </Typography>
              </Grid>

              {/* Current Province */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel id="curr-province-label">Province</InputLabel>
                  <Select
                    labelId="curr-province-label"
                    value={currProvinceId}
                    label="Province"
                    onChange={(e) => handleCurrProvinceChange(e.target.value)}
                  >
                    <MenuItem value=""><em>-- Select Province --</em></MenuItem>
                    {loadingProvinces && <MenuItem disabled value="_loading">Loading Provinces...</MenuItem>}
                    {provinces.map((prov) => (
                      <MenuItem key={prov.id} value={prov.id}>
                        {prov.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Current District */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small" disabled={!currProvinceId || loadingCurrDistricts}>
                  <InputLabel id="curr-district-label">
                    {loadingCurrDistricts ? "Loading Districts..." : "District"}
                  </InputLabel>
                  <Select
                    labelId="curr-district-label"
                    value={currDistrictId}
                    label={loadingCurrDistricts ? "Loading Districts..." : "District"}
                    onChange={(e) => handleCurrDistrictChange(e.target.value)}
                  >
                    <MenuItem value=""><em>-- Select District --</em></MenuItem>
                    {currDistricts.map((dist) => (
                      <MenuItem key={dist.id} value={dist.id}>
                        {dist.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Current Municipality */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small" disabled={!currDistrictId || loadingCurrMunicipalities}>
                  <InputLabel id="curr-municipality-label">
                    {loadingCurrMunicipalities ? "Loading Municipalities..." : "Municipality / Local Body"}
                  </InputLabel>
                  <Select
                    labelId="curr-municipality-label"
                    value={currMunicipalityId}
                    label={loadingCurrMunicipalities ? "Loading Municipalities..." : "Municipality / Local Body"}
                    onChange={(e) => handleCurrMunicipalityChange(e.target.value)}
                  >
                    <MenuItem value=""><em>-- Select Municipality --</em></MenuItem>
                    {currMunicipalities.map((muni) => (
                      <MenuItem key={muni.id} value={muni.id}>
                        {muni.official_name} ({muni.local_level_type ? muni.local_level_type.replace(/_/g, " ") : "Municipality"})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Current Ward */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small" disabled={!currMunicipalityId || loadingCurrWards}>
                  <InputLabel id="curr-ward-label">
                    {loadingCurrWards ? "Loading Wards..." : "Ward Number"}
                  </InputLabel>
                  <Select
                    labelId="curr-ward-label"
                    value={currWardId}
                    label={loadingCurrWards ? "Loading Wards..." : "Ward Number"}
                    onChange={(e) => setCurrWardId(e.target.value)}
                  >
                    <MenuItem value=""><em>-- Select Ward --</em></MenuItem>
                    {currWards.map((w) => (
                      <MenuItem key={w.id} value={w.id}>
                        Ward {w.ward_no} {w.ward_office_name ? `(${w.ward_office_name})` : ""}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Current Tole / Locality */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Current Tole / Locality / Street"
                  value={currTole}
                  onChange={(e) => setCurrTole(e.target.value)}
                  placeholder="e.g. Maitighar, New Baneshwor"
                  helperText="Street, tole, or neighborhood name"
                />
              </Grid>

              {/* Current Address Preview */}
              <Grid item xs={12}>
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: "#f1f5f9",
                    borderRadius: 1.5,
                    border: "1px dashed #cbd5e1",
                  }}
                >
                  <Typography variant="caption" fontWeight={600} color="text.secondary">
                    Current Address Preview:
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="#0f172a" sx={{ mt: 0.5 }}>
                    {buildAddressString(
                      currProvinceId,
                      currDistrictId,
                      currMunicipalityId,
                      currWardId,
                      currTole,
                      provinces,
                      currDistricts,
                      currMunicipalities,
                      currWards
                    ) || form.current_address || "None specified"}
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 1.5 }} />
              </Grid>

              {/* ─── Permanent Address (Dropdowns or Locked KYC) ─── */}
              <Grid item xs={12}>
                <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} mb={0.5}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Home color="primary" fontSize="small" />
                    <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                      Permanent Address (स्थायी ठेगाना)
                    </Typography>
                  </Box>
                  {isKycVerified ? (
                    <Chip
                      icon={<VerifiedIcon sx={{ fontSize: "14px !important", color: "#2563EB !important" }} />}
                      label="Verified via KYC (Locked)"
                      size="small"
                      sx={{ bgcolor: "#eff6ff", borderColor: "#93c5fd", color: "#1e40af", fontWeight: 700 }}
                      variant="outlined"
                    />
                  ) : (
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={sameAsPermanent}
                          onChange={(e) => handleSameAsPermanentToggle(e.target.checked)}
                        />
                      }
                      label={<Typography variant="caption" fontWeight={600}>Same as Current Address</Typography>}
                    />
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                  {isKycVerified
                    ? "Permanent address matches your official citizenship/KYC document and is permanently locked."
                    : "Official permanent address as recorded in your citizenship certificate or land ownership record."}
                </Typography>
              </Grid>

              {isKycVerified ? (
                <Grid item xs={12}>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: "#eff6ff",
                      borderRadius: 2,
                      border: "1px solid #bfdbfe",
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                      <VerifiedIcon sx={{ color: "#2563EB", fontSize: 18 }} />
                      <Typography variant="subtitle2" fontWeight={700} color="#1e40af">
                        Official Permanent Residence
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="#1e3a8a" fontWeight={500}>
                      {form.permanent_address || "Verified Government Record"}
                    </Typography>
                  </Box>
                </Grid>
              ) : (
                <>
                  {/* Permanent Province */}
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="perm-province-label">Province</InputLabel>
                      <Select
                        labelId="perm-province-label"
                        value={permProvinceId}
                        label="Province"
                        onChange={(e) => handlePermProvinceChange(e.target.value)}
                      >
                        <MenuItem value=""><em>-- Select Province --</em></MenuItem>
                        {loadingProvinces && <MenuItem disabled value="_loading">Loading Provinces...</MenuItem>}
                        {provinces.map((prov) => (
                          <MenuItem key={prov.id} value={prov.id}>
                            {prov.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Permanent District */}
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small" disabled={!permProvinceId || loadingPermDistricts}>
                      <InputLabel id="perm-district-label">
                        {loadingPermDistricts ? "Loading Districts..." : "District"}
                      </InputLabel>
                      <Select
                        labelId="perm-district-label"
                        value={permDistrictId}
                        label={loadingPermDistricts ? "Loading Districts..." : "District"}
                        onChange={(e) => handlePermDistrictChange(e.target.value)}
                      >
                        <MenuItem value=""><em>-- Select District --</em></MenuItem>
                        {permDistricts.map((dist) => (
                          <MenuItem key={dist.id} value={dist.id}>
                            {dist.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Permanent Municipality */}
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small" disabled={!permDistrictId || loadingPermMunicipalities}>
                      <InputLabel id="perm-municipality-label">
                        {loadingPermMunicipalities ? "Loading Municipalities..." : "Municipality / Local Body"}
                      </InputLabel>
                      <Select
                        labelId="perm-municipality-label"
                        value={permMunicipalityId}
                        label={loadingPermMunicipalities ? "Loading Municipalities..." : "Municipality / Local Body"}
                        onChange={(e) => handlePermMunicipalityChange(e.target.value)}
                      >
                        <MenuItem value=""><em>-- Select Municipality --</em></MenuItem>
                        {permMunicipalities.map((muni) => (
                          <MenuItem key={muni.id} value={muni.id}>
                            {muni.official_name} ({muni.local_level_type ? muni.local_level_type.replace(/_/g, " ") : "Municipality"})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Permanent Ward */}
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small" disabled={!permMunicipalityId || loadingPermWards}>
                      <InputLabel id="perm-ward-label">
                        {loadingPermWards ? "Loading Wards..." : "Ward Number"}
                      </InputLabel>
                      <Select
                        labelId="perm-ward-label"
                        value={permWardId}
                        label={loadingPermWards ? "Loading Wards..." : "Ward Number"}
                        onChange={(e) => setPermWardId(e.target.value)}
                      >
                        <MenuItem value=""><em>-- Select Ward --</em></MenuItem>
                        {permWards.map((w) => (
                          <MenuItem key={w.id} value={w.id}>
                            Ward {w.ward_no} {w.ward_office_name ? `(${w.ward_office_name})` : ""}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Permanent Tole / Locality */}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Permanent Tole / Locality / Street"
                      value={permTole}
                      onChange={(e) => setPermTole(e.target.value)}
                      placeholder="e.g. Ward No. 2, Pokhara"
                      helperText="Permanent street or tole name"
                    />
                  </Grid>

                  {/* Permanent Address Preview */}
                  <Grid item xs={12}>
                    <Box
                      sx={{
                        p: 1.5,
                        bgcolor: "#f1f5f9",
                        borderRadius: 1.5,
                        border: "1px dashed #cbd5e1",
                      }}
                    >
                      <Typography variant="caption" fontWeight={600} color="text.secondary">
                        Permanent Address Preview:
                      </Typography>
                      <Typography variant="body2" fontWeight={600} color="#0f172a" sx={{ mt: 0.5 }}>
                        {buildAddressString(
                          permProvinceId,
                          permDistrictId,
                          permMunicipalityId,
                          permWardId,
                          permTole,
                          provinces,
                          permDistricts,
                          permMunicipalities,
                          permWards
                        ) || form.permanent_address || "None specified"}
                      </Typography>
                    </Box>
                  </Grid>
                </>
              )}
            </Grid>
          </Card>

          {/* Section 3: Preferences & Personal Details */}
          <Typography
            variant="subtitle2"
            fontWeight={700}
            color="text.secondary"
            textTransform="uppercase"
            letterSpacing={0.5}
            mb={1.5}
          >
            3. Preferences & Personal Details
          </Typography>
          <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: "white" }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Notification Preference"
                  name="notification_pref"
                  value={form.notification_pref || "both"}
                  onChange={handleFormChange}
                  InputProps={{
                    startAdornment: <NotificationsOutlined sx={{ color: "primary.main", mr: 1 }} fontSize="small" />,
                  }}
                  helperText="Select how you wish to receive updates regarding your complaints"
                >
                  <MenuItem value="both">Email & SMS</MenuItem>
                  <MenuItem value="email">Email Only</MenuItem>
                  <MenuItem value="sms">SMS Only</MenuItem>
                  <MenuItem value="none">None</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Date of Birth"
                  name="date_of_birth"
                  value={form.date_of_birth || ""}
                  onChange={handleFormChange}
                  disabled={isKycVerified}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    startAdornment: (
                      <Cake sx={{ color: isKycVerified ? "text.disabled" : "primary.main", mr: 1 }} fontSize="small" />
                    ),
                    endAdornment: isKycVerified ? (
                      <Tooltip title="Locked: Verified via official KYC" arrow>
                        <VerifiedIcon sx={{ color: "#2563EB", fontSize: 18 }} />
                      </Tooltip>
                    ) : undefined,
                  }}
                  helperText={isKycVerified ? "Verified via KYC (Locked)" : "Must be at least 18 years old"}
                />
              </Grid>
            </Grid>
          </Card>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, bgcolor: "#f1f5f9", justifyContent: "space-between" }}>
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => {
              if (profile) {
                const cd = profile.citizen_details;
                const { first, middle, last } = splitFullName(profile.full_name);
                setForm({
                  first_name: cd?.first_name || first,
                  middle_name: cd?.middle_name || middle,
                  last_name: cd?.last_name || last,
                  phone: profile.phone || "",
                  gender: cd?.gender || "prefer_not_to_say",
                  date_of_birth: cd?.date_of_birth || "",
                  current_address: cd?.current_address || "",
                  permanent_address: cd?.permanent_address || "",
                  notification_pref: cd?.notification_pref || "both",
                });
              }
              setOpenSettingsModal(false);
            }}
            disabled={saving}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveProfile}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              px: 3,
              bgcolor: "#2563EB",
              "&:hover": { bgcolor: "#1d4ed8" },
            }}
          >
            {saving ? "Saving Changes..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
