"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

/* =========================================================
   TYPES
========================================================= */

type MemberGroup = {
  id: number;
  name: string;
  description: string | null;
};

type GroupMember = {
  id: number;
  group_id: number;
  user_id: string;
  created_at?: string;
};

type Profile = {
  id: string;
  username: string;
  full_name: string;
  position: string | null;
  organization: string | null;
  role: string | null;
  is_active: boolean;
};

type MeetingParticipant = {
  id: number;
  meeting_id: number;
  full_name: string;
  position: string | null;
  organization: string | null;
  role: string | null;
  attendance_status: string | null;
  created_at: string;
  user_id: string | null;
  response_at: string | null;
  response_note: string | null;
  checked_in_at: string | null;
  profile_id: string | null;
};

type ParticipantsTabProps = {
  meetingId: number;
};

/* =========================================================
   PAGE
========================================================= */

export default function ParticipantsTab({
  meetingId,
}: ParticipantsTabProps) {
  const [groups, setGroups] = useState<MemberGroup[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [participants, setParticipants] = useState<
    MeetingParticipant[]
  >([]);

  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>(
    []
  );

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  /* =======================================================
     LOAD DATA
  ======================================================= */

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      /* ---------------------------------------------------
         1. NHÓM THÀNH PHẦN
      --------------------------------------------------- */

      const groupsResult = await supabase
        .from("member_groups")
        .select("id, name, description")
        .order("id", {
          ascending: true,
        });

      if (groupsResult.error) {
        throw new Error(
          `Không thể tải nhóm thành phần: ${groupsResult.error.message}`
        );
      }

      /* ---------------------------------------------------
         2. GROUP MEMBERS
      --------------------------------------------------- */

      const groupMembersResult = await supabase
        .from("group_members")
        .select("id, group_id, user_id, created_at")
        .order("id", {
          ascending: true,
        });

      if (groupMembersResult.error) {
        throw new Error(
          `Không thể tải dữ liệu phân nhóm: ${groupMembersResult.error.message}`
        );
      }

      /* ---------------------------------------------------
         3. PROFILES
         
         Không chỉ lấy một vài cột.
         Lấy đầy đủ hồ sơ cần cho trang.
      --------------------------------------------------- */

      const profilesResult = await supabase
        .from("profiles")
        .select(
          "id, username, full_name, position, organization, role, is_active"
        )
        .eq("is_active", true)
        .order("full_name", {
          ascending: true,
        });

      if (profilesResult.error) {
        throw new Error(
          `Không thể tải danh sách đại biểu: ${profilesResult.error.message}`
        );
      }

      /* ---------------------------------------------------
         4. THÀNH PHẦN CUỘC HỌP
      --------------------------------------------------- */

      const participantsResult = await supabase
        .from("meeting_participants")
        .select("*")
        .eq("meeting_id", meetingId)
        .order("id", {
          ascending: true,
        });

      if (participantsResult.error) {
        throw new Error(
          `Không thể tải thành phần cuộc họp: ${participantsResult.error.message}`
        );
      }

      /* ---------------------------------------------------
         SET STATE
      --------------------------------------------------- */

      setGroups((groupsResult.data || []) as MemberGroup[]);

      setGroupMembers(
        (groupMembersResult.data || []) as GroupMember[]
      );

      setProfiles((profilesResult.data || []) as Profile[]);

      setParticipants(
        (participantsResult.data || []) as MeetingParticipant[]
      );

      /* ---------------------------------------------------
         DEBUG
      --------------------------------------------------- */

      console.log(
        "========== PARTICIPANTS DEBUG =========="
      );

      console.log(
        "GROUPS:",
        groupsResult.data || []
      );

      console.log(
        "GROUP MEMBERS:",
        groupMembersResult.data || []
      );

      console.log(
        "PROFILES:",
        profilesResult.data || []
      );

      console.log(
        "MEETING PARTICIPANTS:",
        participantsResult.data || []
      );

      console.log(
        "========================================"
      );
    } catch (err: any) {
      console.error(
        "LỖI TẢI DỮ LIỆU PARTICIPANTS:",
        err
      );

      setError(
        err?.message ||
          "Không thể tải dữ liệu thành phần cuộc họp."
      );

      setGroups([]);
      setGroupMembers([]);
      setProfiles([]);
      setParticipants([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [meetingId]);

  /* =========================================================
     AVAILABLE PROFILES
     
     QUAN TRỌNG:
     
     group_members
          ↓
     user_id
          ↓
     profiles.id
     
     Chỉ lấy role = delegate.
  ========================================================= */

  const availableProfiles = useMemo(() => {
    if (selectedGroupIds.length === 0) {
      return [];
    }

    /* -----------------------------------------------------
       Lấy toàn bộ group_members thuộc nhóm đang chọn
    ----------------------------------------------------- */

    const selectedGroupMembers = groupMembers.filter(
      (member) =>
        selectedGroupIds.includes(member.group_id)
    );

    console.log(
      "NHÓM ĐƯỢC CHỌN:",
      selectedGroupIds
    );

    console.log(
      "GROUP MEMBERS CỦA NHÓM:",
      selectedGroupMembers
    );

    /* -----------------------------------------------------
       Lấy user_id
       
       Set tự loại người trùng nếu một người
       thuộc nhiều nhóm.
    ----------------------------------------------------- */

    const userIds = Array.from(
      new Set(
        selectedGroupMembers.map(
          (member) => member.user_id
        )
      )
    );

    console.log(
      "USER IDS:",
      userIds
    );

    /* -----------------------------------------------------
       Tìm profile theo ID
    ----------------------------------------------------- */

    const matchedProfiles = profiles.filter(
      (profile) =>
        userIds.includes(profile.id)
    );

    console.log(
      "PROFILE TÌM THẤY:",
      matchedProfiles
    );

    /* -----------------------------------------------------
       CHỈ ĐẠI BIỂU
       
       operator không được đưa vào danh sách đại biểu.
    ----------------------------------------------------- */

    const delegateProfiles =
      matchedProfiles.filter(
        (profile) =>
          profile.role === "delegate" &&
          profile.is_active === true
      );

    console.log(
      "ĐẠI BIỂU DELEGATE:",
      delegateProfiles
    );

    return delegateProfiles;
  }, [
    selectedGroupIds,
    groupMembers,
    profiles,
  ]);

  /* =========================================================
     EXISTING PARTICIPANTS
  ========================================================= */

  const existingParticipantIds = useMemo(() => {
    return new Set(
      participants
        .map(
          (participant) =>
            participant.user_id ||
            participant.profile_id
        )
        .filter(
          (value): value is string =>
            Boolean(value)
        )
    );
  }, [participants]);

  /* =========================================================
     TOGGLE GROUP
  ========================================================= */

  function toggleGroup(groupId: number) {
    setSelectedGroupIds((current) => {
      if (current.includes(groupId)) {
        return current.filter(
          (id) => id !== groupId
        );
      }

      return [...current, groupId];
    });

    setSelectedUserIds([]);
    setMessage("");
    setError("");
  }

  /* =========================================================
     TOGGLE USER
  ========================================================= */

  function toggleUser(userId: string) {
    setSelectedUserIds((current) => {
      if (current.includes(userId)) {
        return current.filter(
          (id) => id !== userId
        );
      }

      return [...current, userId];
    });

    setMessage("");
    setError("");
  }

  /* =========================================================
     SELECT ALL
  ========================================================= */

  function selectAllAvailable() {
    const ids = availableProfiles
      .filter(
        (profile) =>
          !existingParticipantIds.has(
            profile.id
          )
      )
      .map(
        (profile) => profile.id
      );

    setSelectedUserIds(ids);
    setMessage("");
    setError("");
  }

  /* =========================================================
     CLEAR
  ========================================================= */

  function clearSelection() {
    setSelectedUserIds([]);
    setMessage("");
    setError("");
  }

  /* =========================================================
     ADD PARTICIPANTS
  ========================================================= */

  async function addParticipants() {
    if (selectedUserIds.length === 0) {
      setError(
        "Vui lòng chọn ít nhất một đại biểu."
      );
      return;
    }

    setAdding(true);
    setError("");
    setMessage("");

    try {
      const selectedProfiles =
        profiles.filter(
          (profile) =>
            selectedUserIds.includes(
              profile.id
            ) &&
            profile.role === "delegate" &&
            profile.is_active === true &&
            !existingParticipantIds.has(
              profile.id
            )
        );

      if (selectedProfiles.length === 0) {
        throw new Error(
          "Các đại biểu được chọn đã có trong cuộc họp."
        );
      }

      const rows =
        selectedProfiles.map(
          (profile) => ({
            meeting_id: meetingId,

            full_name:
              profile.full_name,

            position:
              profile.position,

            organization:
              profile.organization,

            role:
              profile.role,

            attendance_status:
              "Chưa xác nhận",

            user_id:
              profile.id,

            profile_id:
              profile.id,
          })
        );

      const { error: insertError } =
        await supabase
          .from("meeting_participants")
          .insert(rows);

      if (insertError) {
        console.error(
          "LỖI THÊM ĐẠI BIỂU:",
          insertError
        );

        throw insertError;
      }

      setMessage(
        `Đã thêm ${selectedProfiles.length} đại biểu vào cuộc họp.`
      );

      setSelectedUserIds([]);

      await loadData();
    } catch (err: any) {
      console.error(
        "LỖI THÊM THÀNH PHẦN:",
        err
      );

      setError(
        `Không thể thêm đại biểu: ${
          err?.message ||
          "Lỗi không xác định"
        }`
      );
    } finally {
      setAdding(false);
    }
  }

  /* =========================================================
     REMOVE PARTICIPANT
  ========================================================= */

  async function removeParticipant(
    participant: MeetingParticipant
  ) {
    const confirmed =
      window.confirm(
        `Bạn có chắc muốn xóa "${participant.full_name}" khỏi thành phần cuộc họp?`
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(
      participant.id
    );

    setError("");
    setMessage("");

    try {
      const { error: deleteError } =
        await supabase
          .from("meeting_participants")
          .delete()
          .eq(
            "id",
            participant.id
          );

      if (deleteError) {
        throw deleteError;
      }

      setParticipants(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              participant.id
          )
      );

      setMessage(
        `Đã xóa ${participant.full_name} khỏi cuộc họp.`
      );
    } catch (err: any) {
      console.error(
        "LỖI XÓA ĐẠI BIỂU:",
        err
      );

      setError(
        `Không thể xóa đại biểu: ${
          err?.message ||
          "Lỗi không xác định"
        }`
      );
    } finally {
      setDeletingId(null);
    }
  }

  /* =========================================================
     STATISTICS
  ========================================================= */

  const notYetAddedCount =
    availableProfiles.filter(
      (profile) =>
        !existingParticipantIds.has(
          profile.id
        )
    ).length;

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="space-y-5">

      {/* =====================================================
          TITLE
      ===================================================== */}

      <div>
      <h2 className="text-base font-bold text-emerald-900">
      <span className="text-emerald-900">● </span>
          Thành phần / Đại biểu
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          Chọn nhóm thành phần để đưa các đại biểu vào cuộc họp.
        </p>
      </div>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* =====================================================
          MESSAGE
      ===================================================== */}

      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      {/* =====================================================
          1. CHỌN NHÓM
      ===================================================== */}

      <section className="rounded-xl border border-slate-200 bg-white p-4">

        <div className="flex items-center justify-between">

          <div>
            <h3 className="text-sm font-bold text-slate-900">
              1. Chọn nhóm thành phần
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Có thể chọn nhiều nhóm. Người trùng sẽ tự động được loại bỏ.
            </p>
          </div>

          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {selectedGroupIds.length} nhóm
          </span>

        </div>

        {loading ? (

          <div className="py-8 text-center text-sm text-slate-500">
            Đang tải nhóm thành phần...
          </div>

        ) : groups.length === 0 ? (

          <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-700">
            Chưa có nhóm thành phần.
          </div>

        ) : (

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">

            {groups.map(
              (group) => {

                const checked =
                  selectedGroupIds.includes(
                    group.id
                  );

                return (
                  <label
                    key={group.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition ${
                      checked
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-slate-200 hover:border-emerald-200 hover:bg-slate-50"
                    }`}
                  >

                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        toggleGroup(
                          group.id
                        )
                      }
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
                    />

                    <div className="min-w-0">

                      <div
                        className={`text-sm ${
                          checked
                            ? "font-semibold text-emerald-800"
                            : "text-slate-700"
                        }`}
                      >
                        {group.name}
                      </div>

                      {group.description && (
                        <div className="mt-0.5 truncate text-[11px] text-slate-400">
                          {group.description}
                        </div>
                      )}

                    </div>

                  </label>
                );
              }
            )}

          </div>
        )}

      </section>

      {/* =====================================================
          2. CHỌN ĐẠI BIỂU
      ===================================================== */}

      {selectedGroupIds.length > 0 && (

        <section className="rounded-xl border border-slate-200 bg-white p-4">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h3 className="text-sm font-bold text-slate-900">
                2. Chọn đại biểu
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Có{" "}
                <strong className="text-slate-700">
                  {availableProfiles.length}
                </strong>{" "}
                đại biểu thuộc nhóm đã chọn.

                {notYetAddedCount > 0 &&
                  ` ${notYetAddedCount} người chưa được đưa vào cuộc họp.`}
              </p>

            </div>

            <div className="flex gap-2">

              <button
                type="button"
                onClick={
                  selectAllAvailable
                }
                className="cursor-pointer rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
              >
                Chọn tất cả
              </button>

              <button
                type="button"
                onClick={
                  clearSelection
                }
                className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Bỏ chọn
              </button>

            </div>

          </div>

          {availableProfiles.length === 0 ? (

            <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">

              <p className="text-sm font-medium text-slate-600">
                Không tìm thấy đại biểu trong nhóm này.
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Kiểm tra lại dữ liệu group_members và profiles.
              </p>

            </div>

          ) : (

            <div className="mt-4 max-h-80 overflow-y-auto rounded-lg border border-slate-200">

              {availableProfiles.map(
                (profile) => {

                  const checked =
                    selectedUserIds.includes(
                      profile.id
                    );

                  const alreadyAdded =
                    existingParticipantIds.has(
                      profile.id
                    );

                  return (
                    <label
                      key={profile.id}
                      className={`flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2.5 last:border-b-0 ${
                        alreadyAdded
                          ? "bg-slate-50 opacity-60"
                          : checked
                          ? "bg-emerald-50"
                          : "hover:bg-slate-50"
                      }`}
                    >

                      <input
                        type="checkbox"
                        checked={
                          alreadyAdded
                            ? true
                            : checked
                        }
                        disabled={
                          alreadyAdded
                        }
                        onChange={() =>
                          toggleUser(
                            profile.id
                          )
                        }
                        className="h-4 w-4 cursor-pointer rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
                      />

                      <div className="min-w-0 flex-1">

                        <div className="flex flex-wrap items-center gap-2">

                          <span className="text-sm font-semibold text-slate-800">
                            {profile.full_name}
                          </span>

                          {alreadyAdded && (
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                              Đã có trong cuộc họp
                            </span>
                          )}

                        </div>

                        <div className="mt-0.5 text-xs text-slate-500">

                          {profile.position ||
                            "Chưa cập nhật chức vụ"}

                          {" • "}

                          {profile.organization ||
                            "Chưa cập nhật đơn vị"}

                        </div>

                      </div>

                    </label>
                  );
                }
              )}

            </div>
          )}

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">

            <div className="text-xs text-slate-500">

              Đã chọn{" "}

              <strong className="text-slate-800">
                {selectedUserIds.length}
              </strong>{" "}

              đại biểu

            </div>

            <button
              type="button"
              onClick={
                addParticipants
              }
              disabled={
                adding ||
                selectedUserIds.length === 0
              }
              className="cursor-pointer rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {adding
                ? "Đang thêm..."
                : "+ Thêm vào cuộc họp"}
            </button>

          </div>

        </section>
      )}

      {/* =====================================================
          3. THÀNH PHẦN CUỘC HỌP
      ===================================================== */}

      <section className="rounded-xl border border-slate-200 bg-white">

        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">

          <div>

            <h3 className="text-sm font-bold text-slate-900">
              3. Thành phần cuộc họp
            </h3>

            <p className="mt-0.5 text-xs text-slate-500">
              {participants.length} đại biểu
            </p>

          </div>

        </div>

        {loading ? (

          <div className="py-10 text-center text-sm text-slate-500">
            Đang tải thành phần...
          </div>

        ) : participants.length === 0 ? (

          <div className="px-4 py-10 text-center">

            <div className="text-3xl">
              👥
            </div>

            <p className="mt-2 text-sm font-medium text-slate-600">
              Chưa có đại biểu
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Chọn nhóm thành phần ở phía trên để thêm đại biểu.
            </p>

          </div>

        ) : (

          <div className="divide-y divide-slate-100">

            {participants.map(
              (participant, index) => (

                <div
                  key={
                    participant.id
                  }
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"
                >

                  <div className="w-7 shrink-0 text-center text-xs font-semibold text-slate-400">
                    {index + 1}
                  </div>

                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-sm">
                    👤
                  </div>

                  <div className="min-w-0 flex-1">

                    <div className="text-sm font-semibold text-slate-800">
                      {participant.full_name}
                    </div>

                    <div className="mt-0.5 truncate text-xs text-slate-500">

                      {participant.position ||
                        "Chưa cập nhật chức vụ"}

                      {" • "}

                      {participant.organization ||
                        "Chưa cập nhật đơn vị"}

                    </div>

                  </div>

                  <div className="hidden sm:block">

                  <span
  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
    participant.attendance_status === "Đã xác nhận tham dự"
      ? "bg-emerald-100 text-emerald-700"
      : participant.attendance_status === "Không tham dự"
        ? "bg-amber-100 text-red-700"
        : "bg-slate-100 text-slate-500"
  }`}
>
  {participant.attendance_status || "Chưa xác nhận"}
</span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      removeParticipant(
                        participant
                      )
                    }
                    disabled={
                      deletingId ===
                      participant.id
                    }
                    className="shrink-0 cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingId ===
                    participant.id
                      ? "..."
                      : "Xóa"}
                  </button>

                </div>

              )
            )}

          </div>

        )}

      </section>

      {/* =====================================================
          NOTE
      ===================================================== */}

      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-700">

        <strong>Lưu ý:</strong>{" "}
        Khi một đại biểu thuộc nhiều nhóm thành phần,
        hệ thống chỉ đưa người đó vào cuộc họp một lần.
        Thông tin họ tên, chức vụ và đơn vị được lưu vào
        hồ sơ cuộc họp tại thời điểm thêm đại biểu.

      </div>

    </div>
  );
}

