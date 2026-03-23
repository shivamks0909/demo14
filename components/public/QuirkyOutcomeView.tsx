"use client";
import React, { useState, useEffect } from "react";
import { useSessionParams } from "@/lib/page-params";

interface QuirkyOutcomeViewProps {
  status: string;
  statusKeyword: string;
}

export function QuirkyOutcomeView({ status, statusKeyword }: QuirkyOutcomeViewProps) {
  const params = useSessionParams();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (params.session && params.session !== "-") {
      setIsLoading(true);
      fetch(`/api/respondent-stats/${params.session}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { setStats(data); setIsLoading(false); })
        .catch(() => setIsLoading(false));
    }
  }, [params.session]);

  const sanitize = (val: string | null | undefined) => {
    if (!val) return "-";
    const bad = ["n/a", "[uid]", "{uid}", "[rid]", "{rid}", "null", "undefined", "-"];
    return bad.includes(val.toLowerCase().trim()) ? "-" : val;
  };

  const displayUid = sanitize(stats?.supplierRid || params.uid);
  const displayPid = sanitize(stats?.projectCode || params.pid);
  const displayIp = stats?.ip || params.ip || "-";
  const displayLoi = stats?.loi !== undefined ? `${stats.loi} mins` : (params.loi || "-");
  let displayDate = params.timestamp || "-";
  if (stats?.endTime) displayDate = new Date(stats.endTime * 1000).toLocaleString();

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fff", color: "#000", fontFamily: '"Inter", sans-serif' }}>
      <style>{`
        .page-title-content h1 { padding-top: 200px; color: #000; text-align: center; margin-bottom: 50px; font-size: 42px; font-weight: 500; }
        .table-quirky th, .table-quirky td { border: 1px solid #dee2e6; padding: 0.75rem; text-align: center; color: black; }
        .table-quirky th { border-bottom: 2px solid #dee2e6; font-weight: bold; }
      `}</style>
      <main className="w-full">
        <section>
          <div className="container mx-auto max-w-7xl px-4">
            <div className="page-title-content text-center">
              <h1>
                <b>Thank you!<br />Your survey has been{" "}
                  <span style={{ textTransform: "uppercase", color: "red", textDecoration: "underline" }}>{statusKeyword}</span>
                </b>
              </h1>
            </div>
          </div>
          <div className="container mx-auto max-w-7xl px-4 mt-8 pb-20">
            <div className="w-full overflow-x-auto">
              <table className="w-full table-quirky border-collapse bg-white">
                <tbody>
                  <tr>
                    <th>UID</th><th>PID</th><th>STATUS</th><th>IP Address</th><th>LOI</th><th>Date</th>
                  </tr>
                  <tr>
                    <td>{isLoading ? "Loading..." : displayUid}</td>
                    <td>{isLoading ? "Loading..." : displayPid}</td>
                    <td>{status}</td>
                    <td>{isLoading ? "Loading..." : displayIp}</td>
                    <td>{isLoading ? "Loading..." : displayLoi}</td>
                    <td>{isLoading ? "Loading..." : displayDate}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
