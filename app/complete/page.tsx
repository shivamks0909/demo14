import React from "react";
import { WavyOutcomeView } from "@/components/public/WavyOutcomeView";
import { updateResponseStatus } from "@/lib/landingService";

export default async function CompletePage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const uid = (params.uid as string) || "N/A";
  const pid = (params.pid as string) || (params.code as string) || "N/A";
  const sid = (params.oi_session as string) || (params.session as string) || (params.cid as string) || undefined;

  if (uid !== "N/A" || sid) {
      await updateResponseStatus(pid, uid, 'complete', sid, '/complete');
  }

  return <WavyOutcomeView status="Complete" statusKeyword="complete" />;
}
