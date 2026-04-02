import { trackingService } from '@/lib/tracking-service'
import { notFound } from 'next/navigation'
import LandingResultLayout from '@/components/LandingResultLayout'

export const dynamic = 'force-dynamic'

export default async function StatusPage(props: {
  params: Promise<{ clickid: string }>
}) {
  const { clickid } = await props.params
  const response = await trackingService.getResponseByClickId(clickid)

  if (!response) {
    return notFound()
  }

  const mapping: Record<string, { title: string; desc: string; type: any; status: string }> = {
    'complete': { title: 'THANK YOU!', desc: 'Survey Completed Successfully', type: 'success', status: 'Complete' },
    'terminate': { title: 'SORRY!', desc: 'Survey session ended.', type: 'error', status: 'Terminated' },
    'quota_full': { title: 'SORRY!', desc: 'The Quota for this survey is FULL', type: 'info', status: 'Quota Full' },
    'security_terminate': { title: 'ERROR!', desc: 'Security Validation Failed', type: 'dark', status: 'Denied' },
    'duplicate_ip': { title: 'SORRY!', desc: 'Duplicate IP Address Detected', type: 'info', status: 'Duplicate' },
    'duplicate_string': { title: 'SORRY!', desc: 'Duplicate Entry Detected', type: 'info', status: 'Duplicate' },
    'in_progress': { title: 'SESSION ACTIVE', desc: 'Your session is still in progress.', type: 'info', status: 'In Progress' }
  }

  const config = mapping[response.status] || mapping['terminate']

  return (
    <LandingResultLayout
      title={config.title}
      description={config.desc}
      type={config.type}
      uid={response.uid || 'N/A'}
      code={response.project_code || 'N/A'}
      ip={response.ip || 'N/A'}
      status={config.status}
      responseId={response.id}
    />
  )
}
