"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

/* =========================================================
   TYPES
========================================================= */

type Vote = {
  id: number;
  meeting_id: number;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  closed_at: string | null;
  expires_at: string | null;
};

type Participant = {
  id: number;
  full_name: string;
  position: string | null;
  user_id: string | null;
  profile_id: string | null;
};

type MemberGroup = {
  id: number;
  name: string;
  description: string | null;
};

type GroupMember = {
  id: number;
  group_id: number;
  user_id: string;
};

type Profile = {
  id: string;
  full_name: string;
  role: string | null;
  is_active: boolean;
};

type VoteItem = {
  id: number;
  vote_id: number;
  participant_id: number;
  choice: string;
  voted_at: string;
};

type VoteParticipant = {
  id: number;
  vote_id: number;
  participant_id: number;
  created_at: string;
};

type VotingTabProps = {
  meetingId: number;
};

/* =========================================================
   PAGE
========================================================= */

export default function VotingTab({
  meetingId,
}: VotingTabProps) {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [participants, setParticipants] =
    useState<Participant[]>([]);
  const [groups, setGroups] =
    useState<MemberGroup[]>([]);
  const [groupMembers, setGroupMembers] =
    useState<GroupMember[]>([]);
  const [profiles, setProfiles] =
    useState<Profile[]>([]);
  const [voteItems, setVoteItems] =
    useState<VoteItem[]>([]);
  const [voteParticipants, setVoteParticipants] =
    useState<VoteParticipant[]>([]);

  /* =======================================================
     FORM TẠO
  ======================================================= */

  const [title, setTitle] = useState("");
  const [description, setDescription] =
    useState("");

  /*
   * Thời gian biểu quyết.
   *
   * Mặc định 30 phút.
   */
  const [durationMinutes, setDurationMinutes] =
    useState("30");

  /* =======================================================
     NHÓM ĐƯỢC CHỌN
  ======================================================= */

  const [selectedGroupIds, setSelectedGroupIds] =
    useState<number[]>([]);

  /* =======================================================
     ĐẠI BIỂU ĐƯỢC CHỌN
  ======================================================= */

  const [selectedParticipantIds, setSelectedParticipantIds] =
    useState<number[]>([]);

  /* =======================================================
     TRẠNG THÁI
  ======================================================= */

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  /* =======================================================
     HỘP THOẠI THÀNH CÔNG
  ======================================================= */

  const [showSuccessDialog, setShowSuccessDialog] =
    useState(false);

  /* =======================================================
     SỬA NỘI DUNG
  ======================================================= */

  const [editingVoteId, setEditingVoteId] =
    useState<number | null>(null);

  const [editTitle, setEditTitle] =
    useState("");

  const [editDescription, setEditDescription] =
    useState("");

  /* =======================================================
     SỬA DANH SÁCH ĐẠI BIỂU
  ======================================================= */

  const [editingParticipantsVoteId, setEditingParticipantsVoteId] =
    useState<number | null>(null);

  const [editingParticipantIds, setEditingParticipantIds] =
    useState<number[]>([]);

  const [editingGroupIds, setEditingGroupIds] =
    useState<number[]>([]);

  /* =========================================================
     LOAD DATA
  ========================================================= */

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      /* ---------------------------------------------------
         1. NỘI DUNG BIỂU QUYẾT
      --------------------------------------------------- */

      const votesResult = await supabase
        .from("meeting_votes")
        .select(`
          id,
          meeting_id,
          title,
          description,
          status,
          created_at,
          closed_at,
          expires_at
        `)
        .eq("meeting_id", meetingId)
        .order("created_at", {
          ascending: false,
        });

      if (votesResult.error) {
        throw new Error(
          `Không thể tải nội dung biểu quyết: ${votesResult.error.message}`
        );
      }

      /* ---------------------------------------------------
         2. THÀNH PHẦN CUỘC HỌP
      --------------------------------------------------- */

      const participantsResult =
        await supabase
          .from("meeting_participants")
          .select(
            "id, full_name, position, user_id, profile_id"
          )
          .eq("meeting_id", meetingId)
          .order("full_name");

      if (participantsResult.error) {
        throw new Error(
          `Không thể tải thành phần cuộc họp: ${participantsResult.error.message}`
        );
      }

      /* ---------------------------------------------------
         3. NHÓM
      --------------------------------------------------- */

      const groupsResult =
        await supabase
          .from("member_groups")
          .select(
            "id, name, description"
          )
          .order("id", {
            ascending: true,
          });

      if (groupsResult.error) {
        throw new Error(
          `Không thể tải nhóm thành phần: ${groupsResult.error.message}`
        );
      }

      /* ---------------------------------------------------
         4. THÀNH VIÊN NHÓM
      --------------------------------------------------- */

      const groupMembersResult =
        await supabase
          .from("group_members")
          .select(
            "id, group_id, user_id"
          )
          .order("id", {
            ascending: true,
          });

      if (groupMembersResult.error) {
        throw new Error(
          `Không thể tải thành viên nhóm: ${groupMembersResult.error.message}`
        );
      }

      /* ---------------------------------------------------
         5. PROFILES
      --------------------------------------------------- */

      const profilesResult =
        await supabase
          .from("profiles")
          .select(
            "id, full_name, role, is_active"
          )
          .eq("is_active", true);

      if (profilesResult.error) {
        throw new Error(
          `Không thể tải hồ sơ đại biểu: ${profilesResult.error.message}`
        );
      }

      /* ---------------------------------------------------
         6. PHIẾU BIỂU QUYẾT
      --------------------------------------------------- */

      const itemsResult =
        await supabase
          .from("meeting_vote_items")
          .select("*");

      if (itemsResult.error) {
        throw new Error(
          `Không thể tải kết quả biểu quyết: ${itemsResult.error.message}`
        );
      }

      /* ---------------------------------------------------
         7. DANH SÁCH ĐẠI BIỂU
      --------------------------------------------------- */

      const voteParticipantsResult =
        await supabase
          .from("meeting_vote_participants")
          .select(
            "id, vote_id, participant_id, created_at"
          )
          .order("id", {
            ascending: true,
          });

      if (voteParticipantsResult.error) {
        throw new Error(
          `Không thể tải danh sách đại biểu biểu quyết: ${voteParticipantsResult.error.message}`
        );
      }

      setVotes(
        (votesResult.data || []) as Vote[]
      );

      setParticipants(
        (participantsResult.data || []) as Participant[]
      );

      setGroups(
        (groupsResult.data || []) as MemberGroup[]
      );

      setGroupMembers(
        (groupMembersResult.data || []) as GroupMember[]
      );

      setProfiles(
        (profilesResult.data || []) as Profile[]
      );

      setVoteItems(
        (itemsResult.data || []) as VoteItem[]
      );

      setVoteParticipants(
        (voteParticipantsResult.data || []) as VoteParticipant[]
      );
    } catch (err: any) {
      console.error(
        "LỖI TẢI DỮ LIỆU BIỂU QUYẾT:",
        err
      );

      setError(
        err?.message ||
          "Không thể tải dữ liệu biểu quyết."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [meetingId]);

  /* =========================================================
     TỰ ĐỘNG KIỂM TRA BIỂU QUYẾT HẾT HẠN
     
     Kiểm tra mỗi 10 giây.
  ========================================================= */

  useEffect(() => {
    const checkExpiredVotes = async () => {
      const now = new Date();

      const expiredVotes = votes.filter(
        (vote) => {
          if (
            vote.status !== "Đang biểu quyết" &&
            vote.status !== "open"
          ) {
            return false;
          }

          if (!vote.expires_at) {
            return false;
          }

          return (
            new Date(vote.expires_at) <= now
          );
        }
      );

      if (expiredVotes.length === 0) {
        return;
      }

      for (const vote of expiredVotes) {
        const { error } =
          await supabase
            .from("meeting_votes")
            .update({
              status: "Đã kết thúc",
              closed_at:
                new Date().toISOString(),
            })
            .eq("id", vote.id)
            .neq("status", "Đã kết thúc");

        if (error) {
          console.error(
            "LỖI TỰ ĐỘNG KẾT THÚC BIỂU QUYẾT:",
            error
          );
        }
      }

      await loadData();
    };

    checkExpiredVotes();

    const timer = window.setInterval(
      checkExpiredVotes,
      10000
    );

    return () => {
      window.clearInterval(timer);
    };
  }, [votes]);

  /* =========================================================
     ĐẠI BIỂU CÓ THỂ CHỌN
  ========================================================= */

  const availableParticipants =
    useMemo(() => {
      if (
        selectedGroupIds.length === 0
      ) {
        return [];
      }

      const selectedMembers =
        groupMembers.filter(
          (member) =>
            selectedGroupIds.includes(
              member.group_id
            )
        );

      const userIds = new Set(
        selectedMembers.map(
          (member) => member.user_id
        )
      );

      const delegateProfiles =
        profiles.filter(
          (profile) =>
            userIds.has(profile.id) &&
            profile.role === "delegate" &&
            profile.is_active === true
        );

      const delegateIds = new Set(
        delegateProfiles.map(
          (profile) => profile.id
        )
      );

      return participants.filter(
        (participant) => {
          const userId =
            participant.user_id ||
            participant.profile_id;

          return (
            userId &&
            delegateIds.has(userId)
          );
        }
      );
    }, [
      selectedGroupIds,
      groupMembers,
      profiles,
      participants,
    ]);

  /* =========================================================
     TOGGLE GROUP
  ========================================================= */

  function toggleGroup(
    groupId: number
  ) {
    setSelectedGroupIds(
      (current) =>
        current.includes(groupId)
          ? current.filter(
              (id) => id !== groupId
            )
          : [...current, groupId]
    );

    setSelectedParticipantIds([]);
    setError("");
    setMessage("");
  }

  /* =========================================================
     TOGGLE PARTICIPANT
  ========================================================= */

  function toggleParticipant(
    participantId: number
  ) {
    setSelectedParticipantIds(
      (current) =>
        current.includes(participantId)
          ? current.filter(
              (id) => id !== participantId
            )
          : [
              ...current,
              participantId,
            ]
    );

    setError("");
    setMessage("");
  }

  /* =========================================================
     CHỌN TẤT CẢ
  ========================================================= */

  function selectAllParticipants() {
    setSelectedParticipantIds(
      availableParticipants.map(
        (participant) =>
          participant.id
      )
    );

    setError("");
    setMessage("");
  }

  /* =========================================================
     BỎ CHỌN
  ========================================================= */

  function clearParticipants() {
    setSelectedParticipantIds([]);
    setError("");
    setMessage("");
  }

  /* =========================================================
     FORMAT THỜI GIAN
  ========================================================= */

  function formatDateTime(
    value: string | null
  ) {
    if (!value) {
      return "";
    }

    return new Date(value).toLocaleString(
      "vi-VN",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  /* =========================================================
     THỜI GIAN CÒN LẠI
  ========================================================= */

  function getRemainingText(
    expiresAt: string | null
  ) {
    if (!expiresAt) {
      return "";
    }

    const diff =
      new Date(expiresAt).getTime() -
      Date.now();

    if (diff <= 0) {
      return "Đã hết thời gian";
    }

    const totalSeconds =
      Math.floor(diff / 1000);

    const minutes =
      Math.floor(totalSeconds / 60);

    const seconds =
      totalSeconds % 60;

    if (minutes > 0) {
      return `Còn ${minutes} phút ${seconds
        .toString()
        .padStart(2, "0")} giây`;
    }

    return `Còn ${seconds} giây`;
  }

  /* =========================================================
     GỬI LẤY Ý KIẾN
  ========================================================= */

  async function createVote(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!title.trim()) {
      setError(
        "Vui lòng nhập nội dung biểu quyết."
      );
      return;
    }

    if (
      selectedParticipantIds.length === 0
    ) {
      setError(
        "Vui lòng chọn ít nhất một đại biểu tham gia biểu quyết."
      );
      return;
    }

    const duration =
      Number(durationMinutes);

    if (
      !Number.isFinite(duration) ||
      duration < 1
    ) {
      setError(
        "Thời gian biểu quyết phải lớn hơn 0 phút."
      );
      return;
    }

    setSaving(true);

    try {
      const expiresAt =
        new Date(
          Date.now() +
            duration * 60 * 1000
        ).toISOString();

      const selectedParticipants =
        participants.filter(
          (participant) =>
            selectedParticipantIds.includes(
              participant.id
            )
        );

      if (
        selectedParticipants.length === 0
      ) {
        throw new Error(
          "Không tìm thấy đại biểu được chọn."
        );
      }

      /* ---------------------------------------------------
         TẠO BIỂU QUYẾT
      --------------------------------------------------- */

      const {
        data: newVote,
        error: voteError,
      } = await supabase
        .from("meeting_votes")
        .insert({
          meeting_id: meetingId,
          title: title.trim(),
          description:
            description.trim() || null,
          status: "Đang biểu quyết",
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (voteError) {
        throw new Error(
          `Không thể tạo biểu quyết: ${voteError.message}`
        );
      }

      if (!newVote) {
        throw new Error(
          "Không nhận được dữ liệu biểu quyết vừa tạo."
        );
      }

      /* ---------------------------------------------------
         CHỐT DANH SÁCH
      --------------------------------------------------- */

      const participantRows =
        selectedParticipantIds.map(
          (participantId) => ({
            vote_id: newVote.id,
            participant_id:
              participantId,
          })
        );

      const {
        error:
          participantInsertError,
      } = await supabase
        .from(
          "meeting_vote_participants"
        )
        .insert(participantRows);

      if (participantInsertError) {
        await supabase
          .from("meeting_votes")
          .delete()
          .eq("id", newVote.id);

        throw new Error(
          `Không thể chốt danh sách đại biểu: ${participantInsertError.message}`
        );
      }

      /* ---------------------------------------------------
         RESET
      --------------------------------------------------- */

      setTitle("");
      setDescription("");
      setDurationMinutes("30");
      setSelectedGroupIds([]);
      setSelectedParticipantIds([]);

      await loadData();

      setShowSuccessDialog(true);
    } catch (err: any) {
      console.error(
        "LỖI GỬI LẤY Ý KIẾN BIỂU QUYẾT:",
        err
      );

      setError(
        err?.message ||
          "Không thể gửi lấy ý kiến biểu quyết."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =========================================================
     LẤY ĐẠI BIỂU CỦA PHIẾU
  ========================================================= */

  function getVoteParticipants(
    voteId: number
  ) {
    const rows =
      voteParticipants.filter(
        (item) =>
          item.vote_id === voteId
      );

    return rows
      .map((row) =>
        participants.find(
          (participant) =>
            participant.id ===
            row.participant_id
        )
      )
      .filter(
        (
          participant
        ): participant is Participant =>
          Boolean(participant)
      );
  }

  /* =========================================================
     SỬA DANH SÁCH
  ========================================================= */

  function startEditParticipants(
    voteId: number
  ) {
    const currentParticipants =
      getVoteParticipants(voteId);

    setEditingParticipantsVoteId(
      voteId
    );

    setEditingParticipantIds(
      currentParticipants.map(
        (participant) =>
          participant.id
      )
    );

    setEditingGroupIds([]);

    setError("");
    setMessage("");
  }

  /* =========================================================
     ĐẠI BIỂU CÓ THỂ CHỌN KHI SỬA
  ========================================================= */

  const editingAvailableParticipants =
    useMemo(() => {
      if (
        editingGroupIds.length === 0
      ) {
        return [];
      }

      const selectedMembers =
        groupMembers.filter(
          (member) =>
            editingGroupIds.includes(
              member.group_id
            )
        );

      const userIds = new Set(
        selectedMembers.map(
          (member) => member.user_id
        )
      );

      const delegateProfiles =
        profiles.filter(
          (profile) =>
            userIds.has(profile.id) &&
            profile.role === "delegate" &&
            profile.is_active
        );

      const delegateIds = new Set(
        delegateProfiles.map(
          (profile) => profile.id
        )
      );

      return participants.filter(
        (participant) => {
          const userId =
            participant.user_id ||
            participant.profile_id;

          return (
            userId &&
            delegateIds.has(userId)
          );
        }
      );
    }, [
      editingGroupIds,
      groupMembers,
      profiles,
      participants,
    ]);

  /* =========================================================
     TOGGLE GROUP KHI SỬA
  ========================================================= */

  function toggleEditingGroup(
    groupId: number
  ) {
    setEditingGroupIds(
      (current) =>
        current.includes(groupId)
          ? current.filter(
              (id) => id !== groupId
            )
          : [...current, groupId]
    );
  }

  /* =========================================================
     TOGGLE ĐẠI BIỂU KHI SỬA
  ========================================================= */

  function toggleEditingParticipant(
    participantId: number
  ) {
    setEditingParticipantIds(
      (current) =>
        current.includes(participantId)
          ? current.filter(
              (id) => id !== participantId
            )
          : [
              ...current,
              participantId,
            ]
    );
  }

  /* =========================================================
     XÓA ĐẠI BIỂU
  ========================================================= */

  async function removeVoteParticipant(
    voteId: number,
    participantId: number
  ) {
    const participant =
      participants.find(
        (item) =>
          item.id === participantId
      );

    const confirmed =
      window.confirm(
        `Xóa ${
          participant?.full_name ||
          "đại biểu này"
        } khỏi danh sách lấy ý kiến biểu quyết?`
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");
    setSaving(true);

    try {
      const {
        error:
          deleteError,
      } = await supabase
        .from(
          "meeting_vote_participants"
        )
        .delete()
        .eq("vote_id", voteId)
        .eq(
          "participant_id",
          participantId
        );

      if (deleteError) {
        throw new Error(
          `Không thể xóa đại biểu: ${deleteError.message}`
        );
      }

      await loadData();

      if (
        editingParticipantsVoteId ===
        voteId
      ) {
        setEditingParticipantIds(
          (current) =>
            current.filter(
              (id) =>
                id !== participantId
            )
        );
      }

      setMessage(
        "Đã xóa đại biểu khỏi danh sách lấy ý kiến."
      );
    } catch (err: any) {
      console.error(
        "LỖI XÓA ĐẠI BIỂU:",
        err
      );

      setError(
        err?.message ||
          "Không thể xóa đại biểu."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =========================================================
     LƯU DANH SÁCH
  ========================================================= */

  async function saveEditedParticipants(
    voteId: number
  ) {
    if (
      editingParticipantIds.length ===
      0
    ) {
      setError(
        "Biểu quyết phải có ít nhất một đại biểu."
      );
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const currentRows =
        voteParticipants.filter(
          (item) =>
            item.vote_id === voteId
        );

      const currentIds =
        currentRows.map(
          (item) =>
            item.participant_id
        );

      const idsToDelete =
        currentIds.filter(
          (id) =>
            !editingParticipantIds.includes(
              id
            )
        );

      const idsToAdd =
        editingParticipantIds.filter(
          (id) =>
            !currentIds.includes(id)
        );

      if (
        idsToDelete.length > 0
      ) {
        const {
          error:
            deleteError,
        } = await supabase
          .from(
            "meeting_vote_participants"
          )
          .delete()
          .eq("vote_id", voteId)
          .in(
            "participant_id",
            idsToDelete
          );

        if (deleteError) {
          throw new Error(
            `Không thể xóa đại biểu: ${deleteError.message}`
          );
        }
      }

      if (
        idsToAdd.length > 0
      ) {
        const rows =
          idsToAdd.map(
            (participantId) => ({
              vote_id: voteId,
              participant_id:
                participantId,
            })
          );

        const {
          error:
            insertError,
        } = await supabase
          .from(
            "meeting_vote_participants"
          )
          .insert(rows);

        if (insertError) {
          throw new Error(
            `Không thể thêm đại biểu: ${insertError.message}`
          );
        }
      }

      setEditingParticipantsVoteId(
        null
      );

      setEditingParticipantIds([]);
      setEditingGroupIds([]);

      await loadData();

      setMessage(
        "Đã cập nhật danh sách đại biểu."
      );
    } catch (err: any) {
      console.error(
        "LỖI CẬP NHẬT DANH SÁCH:",
        err
      );

      setError(
        err?.message ||
          "Không thể cập nhật danh sách."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =========================================================
     HỦY SỬA DANH SÁCH
  ========================================================= */

  function cancelEditParticipants() {
    setEditingParticipantsVoteId(
      null
    );

    setEditingParticipantIds([]);
    setEditingGroupIds([]);

    setError("");
  }

  /* =========================================================
     SỬA NỘI DUNG
  ========================================================= */

  function startEditVote(
    vote: Vote
  ) {
    setEditingVoteId(vote.id);
    setEditTitle(vote.title);
    setEditDescription(
      vote.description || ""
    );

    setError("");
    setMessage("");
  }

  /* =========================================================
     LƯU NỘI DUNG
  ========================================================= */

  async function saveEditedVote(
    voteId: number
  ) {
    if (!editTitle.trim()) {
      setError(
        "Vui lòng nhập nội dung biểu quyết."
      );
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const {
        error:
          updateError,
      } = await supabase
        .from("meeting_votes")
        .update({
          title: editTitle.trim(),
          description:
            editDescription.trim() ||
            null,
        })
        .eq("id", voteId);

      if (updateError) {
        throw new Error(
          `Không thể sửa nội dung: ${updateError.message}`
        );
      }

      setEditingVoteId(null);
      setEditTitle("");
      setEditDescription("");

      await loadData();

      setMessage(
        "Đã cập nhật nội dung biểu quyết."
      );
    } catch (err: any) {
      console.error(
        "LỖI SỬA NỘI DUNG:",
        err
      );

      setError(
        err?.message ||
          "Không thể sửa nội dung."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =========================================================
     HỦY SỬA NỘI DUNG
  ========================================================= */

  function cancelEditVote() {
    setEditingVoteId(null);
    setEditTitle("");
    setEditDescription("");
    setError("");
  }

  /* =========================================================
     XÓA BIỂU QUYẾT
  ========================================================= */

  async function deleteVote(
    voteId: number
  ) {
    const vote =
      votes.find(
        (item) => item.id === voteId
      );

    if (!vote) {
      return;
    }

    const confirmed =
      window.confirm(
        `Xóa nội dung biểu quyết "${vote.title}"?\n\nToàn bộ danh sách đại biểu và phiếu biểu quyết của nội dung này cũng sẽ bị xóa.`
      );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const {
        error:
          participantsDeleteError,
      } = await supabase
        .from(
          "meeting_vote_participants"
        )
        .delete()
        .eq("vote_id", voteId);

      if (participantsDeleteError) {
        throw new Error(
          `Không thể xóa danh sách đại biểu: ${participantsDeleteError.message}`
        );
      }

      const {
        error:
          itemsDeleteError,
      } = await supabase
        .from("meeting_vote_items")
        .delete()
        .eq("vote_id", voteId);

      if (itemsDeleteError) {
        throw new Error(
          `Không thể xóa kết quả: ${itemsDeleteError.message}`
        );
      }

      const {
        error:
          voteDeleteError,
      } = await supabase
        .from("meeting_votes")
        .delete()
        .eq("id", voteId);

      if (voteDeleteError) {
        throw new Error(
          `Không thể xóa nội dung: ${voteDeleteError.message}`
        );
      }

      if (
        editingVoteId === voteId
      ) {
        cancelEditVote();
      }

      if (
        editingParticipantsVoteId ===
        voteId
      ) {
        cancelEditParticipants();
      }

      await loadData();

      setMessage(
        "Đã xóa nội dung biểu quyết."
      );
    } catch (err: any) {
      console.error(
        "LỖI XÓA BIỂU QUYẾT:",
        err
      );

      setError(
        err?.message ||
          "Không thể xóa biểu quyết."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =========================================================
     KẾT THÚC THỦ CÔNG
  ========================================================= */

  async function closeVote(
    id: number
  ) {
    const confirmed =
      window.confirm(
        "Kết thúc biểu quyết?\n\nSau khi kết thúc, đại biểu sẽ không thể biểu quyết tiếp."
      );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const {
        error,
      } = await supabase
        .from("meeting_votes")
        .update({
          status: "Đã kết thúc",
          closed_at:
            new Date().toISOString(),
        })
        .eq("id", id)
        .neq("status", "Đã kết thúc");

      if (error) {
        throw new Error(
          `Không thể kết thúc biểu quyết: ${error.message}`
        );
      }

      setMessage(
        "Đã kết thúc biểu quyết."
      );

      await loadData();
    } catch (err: any) {
      console.error(
        "LỖI KẾT THÚC BIỂU QUYẾT:",
        err
      );

      setError(
        err?.message ||
          "Không thể kết thúc biểu quyết."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =========================================================
     KIỂM TRA PHIẾU CÒN ĐANG MỞ
  ========================================================= */

  function isVoteOpen(
    vote: Vote
  ) {
    if (
      vote.status === "Đã kết thúc"
    ) {
      return false;
    }

    if (
      vote.status === "Đang biểu quyết" ||
      vote.status === "open"
    ) {
      if (!vote.expires_at) {
        return true;
      }

      return (
        new Date(vote.expires_at).getTime() >
        Date.now()
      );
    }

    return false;
  }

  /* =========================================================
     THỐNG KÊ
  ========================================================= */

  function countChoices(
    voteId: number
  ) {
    const invited =
      voteParticipants.filter(
        (item) =>
          item.vote_id === voteId
      );

    const items =
      voteItems.filter(
        (item) =>
          item.vote_id === voteId &&
          [
            "Đồng ý",
            "Không đồng ý",
            "Ý kiến khác",
          ].includes(item.choice)
      );

    const agree =
      items.filter(
        (item) =>
          item.choice === "Đồng ý"
      ).length;

    const disagree =
      items.filter(
        (item) =>
          item.choice === "Không đồng ý"
      ).length;

    const other =
      items.filter(
        (item) =>
          item.choice === "Ý kiến khác"
      ).length;

    return {
      total: invited.length,
      voted: items.length,
      agree,
      disagree,
      other,
    };
  }

  /* =========================================================
     KẾT QUẢ
  ========================================================= */

  function getApprovalResult(
    voteId: number
  ) {
    const counts =
      countChoices(voteId);

    if (counts.voted === 0) {
      return null;
    }

    const agreePercent =
      (counts.agree /
        counts.voted) *
      100;

    const disagreePercent =
      (counts.disagree /
        counts.voted) *
      100;

    if (
      agreePercent > 50
    ) {
      return {
        type: "approved",
        percent: agreePercent,
      };
    }

    if (
      disagreePercent > 50
    ) {
      return {
        type: "rejected",
        percent: disagreePercent,
      };
    }

    return {
      type: "notPassed",
      percent: Math.max(
        agreePercent,
        disagreePercent
      ),
    };
  }

  /* =========================================================
     STYLE TRẠNG THÁI
  ========================================================= */

  function statusStyle(
    vote: Vote
  ) {
    if (
      vote.status === "Đã kết thúc" ||
      !isVoteOpen(vote)
    ) {
      return "bg-slate-100 text-slate-600";
    }

    return "bg-emerald-50 text-emerald-700";
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="space-y-6">

      {/* =====================================================
          TIÊU ĐỀ
      ===================================================== */}

      <div>
      <h2 className="text-base font-bold text-emerald-900">
      <span className="text-emerald-900">● </span>
          Biểu quyết điện tử
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          Tạo nội dung, chọn thành phần tham gia,
          thiết lập thời gian và tổng hợp kết quả.
        </p>
      </div>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* =====================================================
          MESSAGE
      ===================================================== */}

      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {message}
        </div>
      )}

      {/* =====================================================
          FORM TẠO
      ===================================================== */}

      <form
        onSubmit={createVote}
        className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
      >

        <h3 className="text-sm font-bold text-emerald-900">
          <span className="text-amber-500">
            ✍️{" "}
          </span>
          Tạo nội dung biểu quyết
        </h3>

        <div className="mt-2 space-y-3">

          {/* NỘI DUNG */}

          <div>
            <label className="text-[13px] font-semibold text-slate-700">
              <span className="text-slate-700">
                ●{" "}
              </span>
              Nội dung
            </label>

            <input
              value={title}
              onChange={(event) =>
                setTitle(
                  event.target.value
                )
              }
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-emerald-500"
              placeholder="Ví dụ: Thống nhất dự thảo Kế hoạch..."
            />
          </div>

          {/* CHI TIẾT */}

          <div>
            <label className="text-[13px] font-semibold text-slate-700">
              <span className="text-slate-700">
                ●{" "}
              </span>
              Nội dung chi tiết
            </label>

            <textarea
              rows={3}
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-emerald-500"
              placeholder="Thông tin cần xin ý kiến..."
            />
          </div>

          {/* THỜI GIAN */}

          <div>
            <label className="text-[13px] font-semibold text-slate-700">
              <span className="text-slate-700">
                ●{" "}
              </span>
              Thời gian biểu quyết
            </label>

            <div className="mt-2 flex flex-wrap items-center gap-2">

              <input
                type="number"
                min="1"
                value={durationMinutes}
                onChange={(event) =>
                  setDurationMinutes(
                    event.target.value
                  )
                }
                className="w-28 rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-emerald-500"
              />

              <span className="text-sm text-slate-600">
                phút
              </span>

              <button
                type="button"
                onClick={() =>
                  setDurationMinutes("15")
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                15 phút
              </button>

              <button
                type="button"
                onClick={() =>
                  setDurationMinutes("30")
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                30 phút
              </button>

              <button
                type="button"
                onClick={() =>
                  setDurationMinutes("60")
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                60 phút
              </button>

            </div>

            <p className="mt-1 text-xs text-slate-400">
              Sau thời gian này, biểu quyết sẽ tự động chuyển sang trạng thái Đã kết thúc.
            </p>
          </div>

        </div>

        {/* =================================================
            CHỌN THÀNH PHẦN
        ================================================= */}

        <div className="mt-4 border-t border-slate-100 pt-3">

          <div className="flex items-center justify-between">

            <div>
              <h4 className="text-[13px] font-bold text-slate-800">
                <span className="text-slate-700">
                  ●{" "}
                </span>
                Chọn thành phần tham gia biểu quyết
              </h4>

              <p className="mt-1 text-xs italic text-slate-500">
                Chọn nhóm thành phần, sau đó chọn các đại biểu đã có trong thành phần cuộc họp.
              </p>
            </div>

            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {selectedParticipantIds.length} đại biểu
            </span>

          </div>

          {/* NHÓM */}

          {loading ? (

            <div className="mt-4 py-5 text-center text-sm text-slate-500">
              Đang tải nhóm thành phần...
            </div>

          ) : groups.length === 0 ? (

            <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-700">
              Chưa có nhóm thành phần.
            </div>

          ) : (

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">

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

          {/* ĐẠI BIỂU */}

          {selectedGroupIds.length > 0 && (

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <h4 className="text-sm font-semibold text-slate-800">
                    Đại biểu thuộc nhóm đã chọn
                  </h4>

                  <p className="mt-1 text-xs text-slate-500">
                    {availableParticipants.length} đại biểu
                  </p>
                </div>

                <div className="flex gap-2">

                  <button
                    type="button"
                    onClick={
                      selectAllParticipants
                    }
                    className="cursor-pointer rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    Chọn tất cả
                  </button>

                  <button
                    type="button"
                    onClick={
                      clearParticipants
                    }
                    className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Bỏ chọn
                  </button>

                </div>

              </div>

              {availableParticipants.length === 0 ? (

                <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-xs text-slate-500">
                  Không tìm thấy đại biểu thuộc nhóm đã chọn trong thành phần cuộc họp.
                </div>

              ) : (

                <div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">

                  {availableParticipants.map(
                    (participant) => {

                      const checked =
                        selectedParticipantIds.includes(
                          participant.id
                        );

                      return (
                        <label
                          key={
                            participant.id
                          }
                          className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 transition ${
                            checked
                              ? "bg-emerald-50"
                              : "hover:bg-slate-50"
                          }`}
                        >

                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              toggleParticipant(
                                participant.id
                              )
                            }
                            className="h-4 w-4 cursor-pointer rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
                          />

                          <div className="min-w-0 flex-1">

                            <div className="text-sm font-semibold text-slate-800">
                              {participant.full_name}
                            </div>

                            <div className="mt-0.5 truncate text-xs text-slate-500">
                              {participant.position ||
                                "Chưa cập nhật chức vụ"}
                            </div>

                          </div>

                        </label>
                      );
                    }
                  )}

                </div>

              )}

            </div>

          )}

        </div>

        {/* GỬI */}

        <button
          type="submit"
          disabled={
            saving ||
            selectedParticipantIds.length ===
              0
          }
          className="mt-5 cursor-pointer rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving
            ? "Đang gửi..."
            : "📨 Gửi lấy ý kiến biểu quyết"}
        </button>

      </form>

      {/* =====================================================
          DANH SÁCH
      ===================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">

        <div className="mb-3">
          <h3 className="text-sm font-bold text-emerald-900">
            <span className="text-amber-500">
              🗳️{" "}
            </span>
            Nội dung / kết quả biểu quyết
          </h3>
        </div>

        {loading ? (

          <div className="py-10 text-center text-sm text-slate-400">
            Đang tải...
          </div>

        ) : votes.length === 0 ? (

          <div className="rounded-xl bg-slate-50 py-10 text-center text-sm text-slate-500">
            Chưa có nội dung biểu quyết.
          </div>

        ) : (

          <div className="space-y-4">

            {votes.map(
              (vote, index) => {

                const counts =
                  countChoices(
                    vote.id
                  );

                const result =
                  getApprovalResult(
                    vote.id
                  );

                const invitedParticipants =
                  getVoteParticipants(
                    vote.id
                  );

                const editingParticipants =
                  editingParticipantsVoteId ===
                  vote.id;

                const editingVote =
                  editingVoteId ===
                  vote.id;

                const voteOpen =
                  isVoteOpen(vote);

                return (
                  <div
                    key={vote.id}
                    className="rounded-xl border border-slate-200 p-5"
                  >

                    {/* HEADER */}

                    {editingVote ? (

                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">

                        <h4 className="text-sm font-bold text-emerald-900">
                          Sửa nội dung biểu quyết
                        </h4>

                        <input
                          value={editTitle}
                          onChange={(event) =>
                            setEditTitle(
                              event.target.value
                            )
                          }
                          className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                        />

                        <textarea
                          rows={3}
                          value={
                            editDescription
                          }
                          onChange={(event) =>
                            setEditDescription(
                              event.target.value
                            )
                          }
                          className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
                        />

                        <div className="mt-3 flex flex-wrap gap-2">

                          <button
                            type="button"
                            onClick={() =>
                              saveEditedVote(
                                vote.id
                              )
                            }
                            disabled={saving}
                            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                          >
                            Lưu thay đổi
                          </button>

                          <button
                            type="button"
                            onClick={
                              cancelEditVote
                            }
                            disabled={saving}
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            Hủy
                          </button>

                        </div>

                      </div>

                    ) : (

                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-3">

                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 font-bold text-emerald-700">
                              {index + 1}
                            </div>

                            <h4 className="font-bold text-slate-900">
                              {vote.title}
                            </h4>

                          </div>

                          {vote.description && (
                            <p className="mt-3 text-sm leading-6 text-slate-600">
                              {vote.description}
                            </p>
                          )}

                          {/* THỜI GIAN */}

                          {vote.expires_at && (
                            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">

                              <span className="text-slate-500">
                                ⏱ Hết hạn:
                                {" "}
                                <span className="font-semibold text-slate-700">
                                  {formatDateTime(
                                    vote.expires_at
                                  )}
                                </span>
                              </span>

                              {voteOpen && (
                                <span className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-700">
                                  {getRemainingText(
                                    vote.expires_at
                                  )}
                                </span>
                              )}

                            </div>
                          )}

                        </div>

                        <span
                          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(
                            vote
                          )}`}
                        >
                          {!voteOpen &&
                          vote.status !==
                            "Đã kết thúc"
                            ? "Đã kết thúc"
                            : vote.status ===
                              "open"
                              ? "Đang biểu quyết"
                              : vote.status}
                        </span>

                      </div>

                    )}

                    {/* =================================================
                        ĐẠI BIỂU
                    ================================================= */}

                    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                        <div>
                          <h5 className="text-sm font-bold text-slate-800">
                            Đại biểu được lấy ý kiến
                          </h5>

                          <p className="mt-1 text-xs text-slate-500">
                            {invitedParticipants.length} đại biểu đã được chốt danh sách
                          </p>
                        </div>

                        {!editingParticipants && (
                          <button
                            type="button"
                            onClick={() =>
                              startEditParticipants(
                                vote.id
                              )
                            }
                            disabled={saving}
                            className="w-fit rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                          >
                            ✏️ Sửa danh sách
                          </button>
                        )}

                      </div>

                      {!editingParticipants && (

                        invitedParticipants.length ===
                        0 ? (

                          <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-white px-4 py-5 text-center text-xs text-slate-500">
                            Chưa có đại biểu được chốt.
                          </div>

                        ) : (

                          <div className="mt-3 flex flex-wrap gap-2">

                            {invitedParticipants.map(
                              (participant) => (

                                <div
                                  key={
                                    participant.id
                                  }
                                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
                                >

                                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs text-emerald-700">
                                    👤
                                  </div>

                                  <div className="min-w-0">

                                    <div className="text-xs font-semibold text-slate-800">
                                      {
                                        participant.full_name
                                      }
                                    </div>

                                    <div className="text-[10px] text-slate-400">
                                      {participant.position ||
                                        "Chưa cập nhật chức vụ"}
                                    </div>

                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeVoteParticipant(
                                        vote.id,
                                        participant.id
                                      )
                                    }
                                    disabled={saving}
                                    title="Xóa đại biểu"
                                    className="ml-1 text-xs font-bold text-red-500 hover:text-red-700 disabled:opacity-50"
                                  >
                                    ×
                                  </button>

                                </div>

                              )
                            )}

                          </div>

                        )

                      )}

                      {/* =================================================
                          SỬA DANH SÁCH
                      ================================================= */}

                      {editingParticipants && (

                        <div className="mt-4">

                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">

                            {groups.map(
                              (group) => {

                                const checked =
                                  editingGroupIds.includes(
                                    group.id
                                  );

                                return (
                                  <label
                                    key={
                                      group.id
                                    }
                                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 ${
                                      checked
                                        ? "border-blue-300 bg-blue-50"
                                        : "border-slate-200 bg-white"
                                    }`}
                                  >

                                    <input
                                      type="checkbox"
                                      checked={
                                        checked
                                      }
                                      onChange={() =>
                                        toggleEditingGroup(
                                          group.id
                                        )
                                      }
                                      className="h-4 w-4 rounded border-slate-300 text-blue-700"
                                    />

                                    <span className="text-sm text-slate-700">
                                      {
                                        group.name
                                      }
                                    </span>

                                  </label>
                                );
                              }
                            )}

                          </div>

                          {editingGroupIds.length >
                            0 && (

                            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">

                              <div className="mb-3 flex items-center justify-between">

                                <span className="text-xs font-semibold text-slate-700">
                                  Đại biểu thuộc nhóm đã chọn
                                </span>

                                <span className="text-xs text-blue-700">
                                  {
                                    editingParticipantIds.length
                                  }{" "}
                                  đại biểu
                                </span>

                              </div>

                              <div className="flex flex-wrap gap-2">

                                {editingAvailableParticipants.map(
                                  (
                                    participant
                                  ) => {

                                    const checked =
                                      editingParticipantIds.includes(
                                        participant.id
                                      );

                                    return (
                                      <label
                                        key={
                                          participant.id
                                        }
                                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 ${
                                          checked
                                            ? "border-blue-300 bg-blue-50"
                                            : "border-slate-200 bg-white"
                                        }`}
                                      >

                                        <input
                                          type="checkbox"
                                          checked={
                                            checked
                                          }
                                          onChange={() =>
                                            toggleEditingParticipant(
                                              participant.id
                                            )
                                          }
                                          className="h-4 w-4 rounded border-slate-300 text-blue-700"
                                        />

                                        <span className="text-xs font-semibold text-slate-700">
                                          {
                                            participant.full_name
                                          }
                                        </span>

                                      </label>
                                    );
                                  }
                                )}

                              </div>

                            </div>

                          )}

                          <div className="mt-4 flex flex-wrap gap-2">

                            <button
                              type="button"
                              onClick={() =>
                                saveEditedParticipants(
                                  vote.id
                                )
                              }
                              disabled={saving}
                              className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                            >
                              Lưu danh sách
                            </button>

                            <button
                              type="button"
                              onClick={
                                cancelEditParticipants
                              }
                              disabled={saving}
                              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                              Hủy
                            </button>

                          </div>

                        </div>

                      )}

                    </div>

                    {/* =================================================
                        THỐNG KÊ
                    ================================================= */}

                    <div className="mt-5 grid gap-3 sm:grid-cols-4">

                      <div className="rounded-xl bg-slate-50 p-4">
                        <div className="text-xs text-slate-500">
                          Tổng số phiếu
                        </div>

                        <div className="mt-1 text-xl font-bold text-slate-900">
                          {counts.total}
                        </div>

                        <div className="mt-1 text-[10px] text-slate-400">
                          Số đại biểu được lấy ý kiến
                        </div>
                      </div>

                      <div className="rounded-xl bg-emerald-50 p-4">
                        <div className="text-xs text-emerald-700">
                          Đồng ý
                        </div>

                        <div className="mt-1 text-xl font-bold text-emerald-700">
                          {counts.agree}
                        </div>
                      </div>

                      <div className="rounded-xl bg-red-50 p-4">
                        <div className="text-xs text-red-700">
                          Không đồng ý
                        </div>

                        <div className="mt-1 text-xl font-bold text-red-700">
                          {counts.disagree}
                        </div>
                      </div>

                      <div className="rounded-xl bg-amber-50 p-4">
                        <div className="text-xs text-amber-700">
                          Ý kiến khác
                        </div>

                        <div className="mt-1 text-xl font-bold text-amber-700">
                          {counts.other}
                        </div>
                      </div>

                    </div>

                    {/* =================================================
                        TIẾN ĐỘ
                    ================================================= */}

                    <div className="mt-4 text-xs text-slate-500">

                      Đã biểu quyết:
                      {" "}

                      <span className="font-semibold text-slate-700">
                        {counts.voted}
                      </span>

                      {" / "}

                      <span className="font-semibold text-slate-700">
                        {counts.total}
                      </span>

                      {" đại biểu"}

                    </div>

                    {/* =================================================
                        KẾT QUẢ
                    ================================================= */}

                    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">

                      <h5 className="text-sm font-bold text-slate-800">
                        Kết quả biểu quyết
                      </h5>

                      {result === null ? (

                        <p className="mt-2 text-sm text-slate-500">
                          Chưa có đại biểu thực hiện biểu quyết.
                        </p>

                      ) : result.type ===
                        "approved" ? (

                        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">

                          <p className="text-sm font-semibold text-emerald-800">
                            Nội dung “{vote.title}” đã được biểu quyết thông qua với tỷ lệ{" "}
                            {result.percent.toFixed(
                              1
                            )}
                            % đồng ý.
                          </p>

                        </div>

                      ) : result.type ===
                        "rejected" ? (

                        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">

                          <p className="text-sm font-semibold text-red-800">
                            Nội dung “{vote.title}” không được thông qua với tỷ lệ{" "}
                            {result.percent.toFixed(
                              1
                            )}
                            % không đồng ý.
                          </p>

                        </div>

                      ) : (

                        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">

                          <p className="text-sm font-semibold text-amber-800">
                            Nội dung “{vote.title}” chưa đủ tỷ lệ quá 50% để được thông qua.
                          </p>

                        </div>

                      )}

                    </div>

                    {/* =================================================
                        NÚT QUẢN LÝ
                    ================================================= */}

                    <div className="mt-5 flex flex-wrap gap-2">

                      {!editingVote && (
                        <button
                          type="button"
                          onClick={() =>
                            startEditVote(
                              vote
                            )
                          }
                          disabled={
                            saving ||
                            !voteOpen
                          }
                          className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          ✏️ Sửa nội dung
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          deleteVote(
                            vote.id
                          )
                        }
                        disabled={saving}
                        className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                      >
                        🗑 Xóa
                      </button>

                      {voteOpen && (

                        <button
                          type="button"
                          onClick={() =>
                            closeVote(
                              vote.id
                            )
                          }
                          disabled={saving}
                          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
                        >
                          🔒 Kết thúc biểu quyết
                        </button>

                      )}

                    </div>

                  </div>
                );
              }
            )}

          </div>

        )}

      </div>

      {/* =====================================================
          HỘP THOẠI THÀNH CÔNG
      ===================================================== */}

      {showSuccessDialog && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">

          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">

            <div className="flex items-start gap-4">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xl text-emerald-700">
                ✓
              </div>

              <div>

                <h3 className="text-base font-bold text-slate-900">
                  Gửi lấy ý kiến thành công
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Nội dung biểu quyết đã được gửi đến các đại biểu được lựa chọn.
                </p>

              </div>

            </div>

            <div className="mt-5 flex justify-end">

              <button
                type="button"
                onClick={() =>
                  setShowSuccessDialog(
                    false
                  )
                }
                className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Đồng ý
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

