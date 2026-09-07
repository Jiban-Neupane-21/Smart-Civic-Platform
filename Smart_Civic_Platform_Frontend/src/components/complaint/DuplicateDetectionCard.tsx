import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Stack,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  ThumbUp as ThumbUpIcon,
  LocationOn as LocationOnIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon,
  People as PeopleIcon,
  WarningAmber as WarningAmberIcon,
} from '@mui/icons-material';
import type { DuplicateMatch } from '../../api/modules/citizen.api';

interface DuplicateDetectionCardProps {
  duplicates: DuplicateMatch[];
  isUpvoting: boolean;
  upvotingId: string | null;
  onUpvote: (complaintId: string, trackingId: string) => void;
  onDismiss: () => void;
}

export const DuplicateDetectionCard: React.FC<DuplicateDetectionCardProps> = ({
  duplicates,
  isUpvoting,
  upvotingId,
  onUpvote,
  onDismiss,
}) => {
  if (!duplicates || duplicates.length === 0) return null;

  return (
    <Card
      elevation={0}
      sx={{
        mb: 3,
        border: '1.5px solid',
        borderColor: 'warning.light',
        borderRadius: 3,
        backgroundColor: '#fffdfa',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          p: 2,
          backgroundColor: '#fff8e1',
          borderBottom: '1px solid',
          borderColor: 'warning.light',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <WarningAmberIcon color="warning" />
        <Box flex={1}>
          <Typography variant="subtitle1" fontWeight={700} color="warning.dark">
            Existing Grievance Detected Nearby ({duplicates.length} found)
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Neighbors in your area have already filed a report for this issue. Upvoting an existing grievance helps municipal teams prioritize it without creating duplicate tickets!
          </Typography>
        </Box>
      </Box>

      <CardContent sx={{ p: 2.5 }}>
        <Stack spacing={2}>
          {duplicates.slice(0, 3).map((match) => {
            const { complaint, similarity_score, distance_label, reasons, has_user_upvoted } = match;
            const isCurrentlyUpvoting = isUpvoting && upvotingId === complaint.co_uid;

            return (
              <Box
                key={complaint.co_uid}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: similarity_score >= 75 ? 'warning.main' : 'grey.200',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                {/* Header row: Tracking ID, Distance, Match % */}
                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mb={1}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle2" fontWeight={800} color="primary.main" fontFamily="monospace">
                      #{complaint.tracking_id}
                    </Typography>
                    <Chip
                      label={complaint.status.replace('_', ' ').toUpperCase()}
                      size="small"
                      color={
                        complaint.status === 'in_progress'
                          ? 'primary'
                          : complaint.status === 'resolved'
                          ? 'success'
                          : 'warning'
                      }
                      sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                    />
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      icon={<LocationOnIcon sx={{ fontSize: '0.85rem !important' }} />}
                      label={distance_label}
                      size="small"
                      variant="outlined"
                      sx={{ height: 22, fontSize: '0.7rem' }}
                    />
                    <Chip
                      label={`${similarity_score}% Match`}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        backgroundColor: similarity_score >= 75 ? '#ffebee' : '#fff3e0',
                        color: similarity_score >= 75 ? '#c62828' : '#e65100',
                      }}
                    />
                  </Stack>
                </Box>

                {/* Complaint Title & Excerpt */}
                <Typography variant="body1" fontWeight={700} color="text.primary" sx={{ mb: 0.5 }}>
                  {complaint.title}
                </Typography>
                {complaint.description && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mb: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {complaint.description}
                  </Typography>
                )}

                {/* Reasons tags & department */}
                <Box display="flex" flexWrap="wrap" gap={0.8} mb={2}>
                  {complaint.department_name && (
                    <Chip
                      label={complaint.department_name}
                      size="small"
                      sx={{ height: 20, fontSize: '0.65rem', bgcolor: 'grey.100' }}
                    />
                  )}
                  {reasons.map((reason, idx) => (
                    <Chip
                      key={idx}
                      label={reason}
                      size="small"
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.65rem', color: 'text.secondary' }}
                    />
                  ))}
                </Box>

                <Divider sx={{ my: 1.5 }} />

                {/* Action Row */}
                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                  <Stack direction="row" spacing={0.8} alignItems="center" color="text.secondary">
                    <PeopleIcon fontSize="small" color="action" />
                    <Typography variant="caption" fontWeight={600}>
                      {complaint.upvote_count} citizen{complaint.upvote_count > 1 ? 's' : ''} affected
                    </Typography>
                  </Stack>

                  {has_user_upvoted ? (
                    <Chip
                      icon={<CheckCircleIcon />}
                      label="You Are Following This Grievance"
                      color="success"
                      variant="filled"
                      size="small"
                      sx={{ fontWeight: 700 }}
                    />
                  ) : (
                    <Button
                      variant="contained"
                      color="warning"
                      size="small"
                      startIcon={
                        isCurrentlyUpvoting ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <ThumbUpIcon fontSize="small" />
                        )
                      }
                      disabled={isUpvoting}
                      onClick={() => onUpvote(complaint.co_uid, complaint.tracking_id)}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        borderRadius: 2,
                        px: 2,
                        boxShadow: 'none',
                        '&:hover': {
                          boxShadow: '0 2px 6px rgba(237, 108, 2, 0.3)',
                        },
                      }}
                    >
                      I Am Also Affected (+1 Upvote & Follow)
                    </Button>
                  )}
                </Box>
              </Box>
            );
          })}
        </Stack>

        {/* Footer Dismiss / Continue anyway */}
        <Box
          mt={2.5}
          pt={1.5}
          borderTop="1px dashed"
          borderColor="grey.300"
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="caption" color="text.secondary">
            Is your issue physically different or at a separate location?
          </Typography>
          <Button
            size="small"
            color="inherit"
            endIcon={<ArrowForwardIcon fontSize="small" />}
            onClick={onDismiss}
            sx={{ textTransform: 'none', fontWeight: 600, color: 'text.primary' }}
          >
            My issue is different (Continue submitting)
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default DuplicateDetectionCard;
