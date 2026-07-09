import React from "react";
import {
  Box,
  Typography,
  Card,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Divider,
  Button,
} from "@mui/material";
import {
  ErrorOutlined,
  CheckCircleOutlined,
  InfoOutlined,
  ClearAll,
} from "@mui/icons-material";

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  time: string;
  type: "update" | "resolve" | "alert";
}

const mockNotifications: NotificationItem[] = [
  {
    id: 1,
    title: "Complaint Resolved",
    message:
      "Your complaint regarding ticket #CMP-0984 (Garbage collection) has been marked as complete.",
    time: "2 hours ago",
    type: "resolve",
  },
  {
    id: 2,
    title: "Schedule Update",
    message:
      "Municipality Department changed the garbage routing layout for Ward 3 this Friday.",
    time: "1 day ago",
    type: "update",
  },
  {
    id: 3,
    title: "Budget Allocation Alert",
    message:
      "The annual civic infrastructure development budget vote opens tomorrow.",
    time: "3 days ago",
    type: "alert",
  },
];

export const Notifications: React.FC = () => {
  const getAvatarIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "resolve":
        return (
          <Avatar sx={{ bgcolor: "success.light", color: "success.main" }}>
            <CheckCircleOutlined />
          </Avatar>
        );
      case "alert":
        return (
          <Avatar sx={{ bgcolor: "error.light", color: "error.main" }}>
            <ErrorOutlined />
          </Avatar>
        );
      default:
        return (
          <Avatar sx={{ bgcolor: "info.light", color: "info.main" }}>
            <InfoOutlined />
          </Avatar>
        );
    }
  };

  return (
    <Box p={3} maxWidth="md" sx={{ margin: "0 auto" }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4" fontWeight="bold">
          Notifications
        </Typography>
        <Button size="small" startIcon={<ClearAll />} color="secondary">
          Mark all as read
        </Button>
      </Box>

      <Card sx={{ borderRadius: 2 }}>
        <List sx={{ p: 0 }}>
          {mockNotifications.map((notif, index) => (
            <React.Fragment key={notif.id}>
              <ListItem
                alignItems="flex-start"
                sx={{ p: 2.5, "&:hover": { bgcolor: "#fbfbfb" } }}
              >
                <ListItemAvatar>{getAvatarIcon(notif.type)}</ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="subtitle1" fontWeight="bold">
                      {notif.title}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography
                        variant="body2"
                        color="text.primary"
                        component="span"
                        sx={{ display: "block", my: 0.5 }}
                      >
                        {notif.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {notif.time}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
              {index < mockNotifications.length - 1 && (
                <Divider component="li" />
              )}
            </React.Fragment>
          ))}
        </List>
      </Card>
    </Box>
  );
};
