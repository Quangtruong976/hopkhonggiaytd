"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Meeting = {
  id: number;
  title: string;
  meeting_date: string | null;
};

export default function KiemTraSupabasePage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function testConnection() {
      const { data, error } = await supabase
        .from("meetings")
        .select("id, title, meeting_date")
        .order("id");

      console.log("SUPABASE DATA:", data);
      console.log("SUPABASE ERROR:", error);

      if (error) {
        setError(error.message);
      } else {
        setMeetings(data || []);
      }

      setLoading(false);
    }

    testConnection();
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 p-10">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow">

        <h1 className="text-2xl font-bold text-slate-900">
          Kiểm tra kết nối Supabase
        </h1>

        {loading && (
          <p className="mt-6 text-slate-500">
            Đang kiểm tra...
          </p>
        )}

        {error && (
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
            <strong>Lỗi Supabase:</strong>
            <p className="mt-2">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="mt-6">

            <p className="font-semibold text-emerald-700">
              Kết nối thành công.
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Số cuộc họp đọc được: {meetings.length}
            </p>

            <div className="mt-6 space-y-3">
              {meetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <p className="font-semibold text-slate-900">
                    #{meeting.id} — {meeting.title}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {meeting.meeting_date || "Chưa có ngày"}
                  </p>
                </div>
              ))}
            </div>

          </div>
        )}

      </div>
    </main>
  );
}