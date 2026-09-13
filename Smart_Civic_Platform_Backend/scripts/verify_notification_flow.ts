import { supabaseAdmin } from "../src/config/supabase";
import { NotificationService } from "../src/service/notification.service";
import { NotificationsRepository } from "../src/modules/notification/repository/notification.repository";

async function runTests() {
  console.log("=== RUNNING NOTIFICATION SYSTEM SELF-TESTS ===");
  const notifService = new NotificationService(supabaseAdmin);
  const notifRepo = new NotificationsRepository(supabaseAdmin);

  // 1. Fetch sample users
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, role, municipality_id, department_id")
    .limit(20);

  if (!profiles || profiles.length === 0) {
    console.log("No profiles available in DB, skipping live recipient queries");
    return;
  }

  const citizens = profiles.filter((p) => p.role === "citizen");
  const staff = profiles.filter((p) => p.role === "staff");
  const deptHeads = profiles.filter((p) => p.role === "department_head");
  const municHeads = profiles.filter((p) => p.role === "municipality_head");

  console.log(`Found: ${citizens.length} citizens, ${staff.length} staff, ${deptHeads.length} dept heads, ${municHeads.length} munic heads`);

  // TEST 1: Direct profile notification with valid complaint_id
  console.log("\n--- TEST 1: Direct Notification with complaint_id ---");
  const targetUser = profiles[0];
  
  // Pick an existing complaint from DB
  const { data: realComplaint } = await supabaseAdmin
    .from("complaints")
    .select("co_uid, municipality_id, title")
    .limit(1)
    .maybeSingle();

  const dummyComplaintId = realComplaint?.co_uid || null;
  
  const directNotif = await notifService.notifyProfile(
    targetUser.id,
    "Test Grievance Update",
    "Your grievance has been updated with testing notes.",
    "system",
    "complaint_update",
    {
      complaintId: dummyComplaintId || undefined,
      municipalityId: targetUser.municipality_id || realComplaint?.municipality_id || undefined,
      priority: "important"
    }
  );

  console.log("Created direct notification:", {
    id: directNotif?.id,
    complaint_id: directNotif?.complaint_id,
    target_profile_id: directNotif?.target_profile_id,
  });

  if (directNotif) {
    // Verify targetUser inbox contains it
    const inbox = await notifRepo.getMyInboundNotifications(targetUser.id);
    const found = inbox.find((n: any) => n.id === directNotif.id);
    console.log("Inbox verification for direct notification:", found ? "PASSED (found in user inbox with complaint_id)" : "FAILED");
    if (found) {
      console.log("Found notification details:", {
        id: found.id,
        complaint_id: found.complaint_id,
        priority: found.priority,
        is_read: found.is_read
      });
    }

    // Clean up test notification
    await supabaseAdmin.from("notification_reads").delete().eq("notification_id", directNotif.id);
    await supabaseAdmin.from("notifications").delete().eq("id", directNotif.id);
  }

  // TEST 2: Municipality Isolation
  console.log("\n--- TEST 2: Municipality Isolation ---");
  const citizenWithMuni = profiles.find((p) => p.role === "citizen" && p.municipality_id);
  const otherMuniId = "5cfd0792-6a8c-401c-8604-f8891593935a";

  if (citizenWithMuni && citizenWithMuni.municipality_id) {
    console.log(`Citizen is in municipality: ${citizenWithMuni.municipality_id}. Broadcasting to other municipality: ${otherMuniId}`);

    // Create notice strictly for otherMuni
    const insertOtherMuniNotif = await supabaseAdmin.from("notifications").insert({
      sender_id: targetUser.id,
      type: "broadcast",
      audience: "all_citizens",
      target_municipality_id: otherMuniId,
      title: "Notice for Other Municipality",
      body: "Community cleanup drive in foreign municipality.",
      channels: ["in_app"],
      is_urgent: false
    }).select().single();

    if (insertOtherMuniNotif.data) {
      const citizenInbox = await notifRepo.getMyInboundNotifications(citizenWithMuni.id);
      const leaked = citizenInbox.some((n: any) => n.id === insertOtherMuniNotif.data.id);
      console.log(`Isolation verification: Citizen in ${citizenWithMuni.municipality_id} received notice from ${otherMuniId}?`, leaked ? "FAILED (LEAKED!)" : "PASSED (100% ISOLATED!)");

      // Cleanup
      await supabaseAdmin.from("notifications").delete().eq("id", insertOtherMuniNotif.data.id);
    }
  }

  // TEST 3: Staff vs Department Head Triage Isolation
  console.log("\n--- TEST 3: Staff vs Department Head Triage Isolation ---");
  const { data: testDept } = await supabaseAdmin.from("departments").select("id, head_profile_id, municipality_id").not("head_profile_id", "is", null).limit(1).maybeSingle();
  if (testDept && testDept.head_profile_id) {
    // Send department triage notification
    const deptNotif = await notifService.notifyDepartment(
      testDept.id,
      "Triage Test Notice",
      "New grievance awaiting departmental allocation.",
      "system",
      "system",
      {
        municipalityId: testDept.municipality_id,
        departmentId: testDept.id,
        priority: "normal"
      }
    );

    if (deptNotif) {
      // 1. Dept Head inbox check
      const deptHeadInbox = await notifRepo.getMyInboundNotifications(testDept.head_profile_id);
      const headReceived = deptHeadInbox.some((n: any) => n.id === deptNotif.id);
      console.log("Department Head received triage notification:", headReceived ? "PASSED" : "FAILED");

      // 2. Regular staff member check (should NOT receive department-level triage)
      const { data: staffMember } = await supabaseAdmin
        .from("staff")
        .select("profile_id")
        .eq("primary_department_id", testDept.id)
        .neq("profile_id", testDept.head_profile_id)
        .limit(1)
        .maybeSingle();

      if (staffMember) {
        const staffInbox = await notifRepo.getMyInboundNotifications(staffMember.profile_id);
        const staffReceived = staffInbox.some((n: any) => n.id === deptNotif.id);
        console.log("Staff member received triage notification (should be false):", staffReceived ? "FAILED (SPAMMED!)" : "PASSED (NO SPAM!)");
      } else {
        console.log("No non-head staff member in this department to verify against");
      }

      // Cleanup
      await supabaseAdmin.from("notification_reads").delete().eq("notification_id", deptNotif.id);
      await supabaseAdmin.from("notifications").delete().eq("id", deptNotif.id);
    }
  }

  console.log("\n=== ALL SELF-TESTS COMPLETED ===");
}

runTests().catch(console.error);
