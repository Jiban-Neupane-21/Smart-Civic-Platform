import React, { useEffect, useState } from "react";
import {
  FileText,
  AlertTriangle,
  Bell,
  CheckCircle,
  Clock,
  ChevronRight,
} from "lucide-react";
import type { CitizenDashboardData } from "../../types/dashboard.type";

export const CitizenDashboard: React.FC = () => {
  const [data, setData] = useState<CitizenDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Replace with your actual API integration setup
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/citizen/dashboard", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const result = await response.json();

        if (result.success) {
          setData(result.data);
        } else {
          setError(result.message || "Failed to fetch dashboard data.");
        }
      } catch (err) {
        setError("A network error occurred. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getStatusClass = (status?: string) => {
    switch (status) {
      case "resolved":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "pending":
      case "open":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-4xl mx-auto mt-10 bg-red-50 text-red-700 rounded-lg border border-red-200">
        <h2 className="font-bold text-lg">Error Loading Dashboard</h2>
        <p>{error || "Something went wrong."}</p>
      </div>
    );
  }

  const { summary, recentComplaints, recentIncidents, recentNotifications } =
    data;

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Citizen Dashboard
          </h1>
          <p className="text-gray-500 mt-1">
            Track your submitted complaints, community incidents, and local
            notices.
          </p>
        </div>

        {/* KPI Metrics Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                Total Complaints
              </p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">
                {summary.totalComplaints}
              </h3>
              <p className="text-xs text-green-600 mt-2 font-medium">
                {summary.resolvedComplaints} Resolved
              </p>
            </div>
            <div className="p-4 bg-blue-50 text-blue-600 rounded-lg">
              <FileText size={24} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                Pending Action
              </p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">
                {summary.pendingComplaints}
              </h3>
              <p className="text-xs text-amber-600 mt-2 font-medium">
                Awaiting municipal review
              </p>
            </div>
            <div className="p-4 bg-amber-50 text-amber-600 rounded-lg">
              <Clock size={24} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                Active Incidents
              </p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">
                {summary.activeIncidentsReported}
              </h3>
              <p className="text-xs text-gray-500 mt-2">
                Public updates reported
              </p>
            </div>
            <div className="p-4 bg-red-50 text-red-600 rounded-lg">
              <AlertTriangle size={24} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                Notifications
              </p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">
                {summary.unreadNotifications}
              </h3>
              <p className="text-xs text-blue-600 mt-2 font-medium">
                Unread updates
              </p>
            </div>
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-lg">
              <Bell size={24} />
            </div>
          </div>
        </div>

        {/* Main Content Layout Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Column 1 & 2: Complaints & Incidents */}
          <div className="lg:col-span-2 space-y-8">
            {/* Recent Complaints */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FileText size={20} className="text-blue-500" /> Recent
                  Complaints
                </h2>
                <button className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
                  View All <ChevronRight size={16} />
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {recentComplaints.length === 0 ? (
                  <p className="p-6 text-gray-500 text-sm text-center">
                    No complaints filed yet.
                  </p>
                ) : (
                  recentComplaints.map((complaint) => (
                    <div
                      key={complaint.id}
                      className="p-5 flex justify-between items-center hover:bg-gray-50 transition"
                    >
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm">
                          {complaint.title}
                        </h4>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(complaint.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide ${getStatusClass(complaint.status)}`}
                      >
                        {complaint.status?.replace("_", " ")}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Incidents */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <AlertTriangle size={20} className="text-amber-500" /> Hazard
                  & Incident Reports
                </h2>
                <button className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
                  View All <ChevronRight size={16} />
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {recentIncidents.length === 0 ? (
                  <p className="p-6 text-gray-500 text-sm text-center">
                    No community incidents reported.
                  </p>
                ) : (
                  recentIncidents.map((incident) => (
                    <div
                      key={incident.id}
                      className="p-5 flex justify-between items-center hover:bg-gray-50 transition"
                    >
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm">
                          {incident.title}
                        </h4>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(incident.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide ${getStatusClass(incident.status)}`}
                      >
                        {incident.status || "Active"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Column 3: Notifications Feed */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-fit">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Bell size={20} className="text-indigo-500" /> Notifications
              </h2>
              {summary.unreadNotifications > 0 && (
                <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {summary.unreadNotifications} New
                </span>
              )}
            </div>
            <div className="divide-y divide-gray-100">
              {recentNotifications.length === 0 ? (
                <p className="p-6 text-gray-500 text-sm text-center">
                  No new notifications.
                </p>
              ) : (
                recentNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-5 hover:bg-gray-50 transition border-l-4 ${notif.is_read ? "border-transparent" : "border-indigo-500 bg-indigo-50/30"}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <h4
                        className={`text-sm ${notif.is_read ? "font-medium text-gray-700" : "font-bold text-gray-900"}`}
                      >
                        {notif.title}
                      </h4>
                      {!notif.is_read && (
                        <span className="h-2 w-2 rounded-full bg-indigo-600 mt-1.5 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-2">
                      {new Date(notif.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
