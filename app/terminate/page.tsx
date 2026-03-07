import LandingResultLayout from '@/components/LandingResultLayout'
import { getLandingPageData, updateResponseStatus } from '@/lib/landingService'
import { redirect } from 'next/navigation'

export const dynamic = "force-dynamic"

export default async function TerminatePage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await props.searchParams
    const { headers } = await import('next/headers')
    const headerList = await headers()

    const cookieUid = headerList.get('cookie')?.split(';').find(c => c.trim().startsWith('last_uid='))?.split('=')[1]
    const cookiePid = headerList.get('cookie')?.split(';').find(c => c.trim().startsWith('last_pid='))?.split('=')[1]

    const pid = (params.pid as string) || (params.code as string) || cookiePid || ''
    const uid = (params.uid as string) || cookieUid || ''
    const oiSession = (params.oi_session as string) || (params.session_token as string) || null
    const clickid = oiSession || (params.clickid as string) || (params.cid as string) || null

    // 1. Update record in DB
    const updated = clickid || (pid && uid) ? await updateResponseStatus(pid, uid, 'terminated', clickid, 'terminated') : null

    // 2. Fetch data (including supplier redirect templates)
    const data = await getLandingPageData(params, {
        headers: { get: (name: string) => headerList.get(name) }
    } as any)

    // 3. Extract supplier redirect URL passed from route.ts (or fallback to DB)
    const fallbackUrl = data.supplier?.terminate_redirect_url
        ? data.supplier.terminate_redirect_url.replace('{{pid}}', pid || data.pid).replace('{{uid}}', uid || data.uid)
        : undefined;
    const redirectUrl = (params.sUrl as string) || fallbackUrl;

    const title = (params.title as string) || "SORRY!"
    const desc = (params.desc as string) || "The link you are looking for is TERMINATED"

    return (
        <LandingResultLayout
            title={title}
            description={desc}
            type="error"
            uid={uid || data.uid}
            code={pid || data.pid}
            ip={data.ip}
            status="Terminate"
            responseId={updated?.id || data.response?.id || undefined}
            redirectUrl={redirectUrl}
        />
    )
}
