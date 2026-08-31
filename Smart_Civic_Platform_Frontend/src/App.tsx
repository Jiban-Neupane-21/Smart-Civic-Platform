import AppRoute from "./routes/AppRoutes";
import { NotificationProvider } from "./hooks/useNotificationPolling";

function App() {
  return (
    <NotificationProvider>
      <AppRoute />
    </NotificationProvider>
  );
}

export default App;
