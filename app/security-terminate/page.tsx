import React from "react";
import { WavyOutcomeView } from "@/components/public/WavyOutcomeView";
import { updateResponseStatus } from "@/lib/landingService";

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const uid = (params.uid as string) || "N/A";
  const pid = (params.pid as string) || (params.code as string) || "N/A";
  const sid = (params.oi_session as string) || (params.session as string) || (params.cid as string) || undefined;

  if (uid !== "N/A" || sid) {
      await updateResponseStatus(pid, uid, 'security_terminate', sid, '/security-terminate');
  }

  return <WavyOutcomeView status="Security Terminate" statusKeyword="security" />;
}
