import { NextRequest, NextResponse } from 'next/server'
import { dashboardService } from '@/lib/dashboardService'
import ExcelJS from 'exceljs'
import { PassThrough } from 'stream'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const filters = {
            status: searchParams.get('status') || undefined,
            ip: searchParams.get('ip') || undefined
        }

        const projectCode = searchParams.get('project_code')
        
        let responses = await dashboardService.getResponses(filters)
        
        if (projectCode) {
            responses = responses.filter((r: any) => r.project_code === projectCode)
        }

        const rows = (responses || []) as any[]

        // Create a passthrough stream
        const stream = new PassThrough()

        // Setup Excel Workbook
        const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
            stream: stream,
            useStyles: true,
            useSharedStrings: true
        })

        // SHEET 1: RESPONSE DATA
        const worksheet = workbook.addWorksheet('Response Data')
        worksheet.columns = [
            { header: 'Hash Identifier', key: 'hash_identifier', width: 15 },
            { header: 'Supplier UID', key: 'supplier_uid', width: 25 },
            { header: 'Client UID Sent', key: 'client_uid_sent', width: 25 },
            { header: 'Client PID', key: 'client_pid', width: 15 },
            { header: 'Supplier Token', key: 'supplier_token', width: 25 },
            { header: 'Project Code', key: 'project_code', width: 15 },
            { header: 'Project Name', key: 'project_name', width: 25 },
            { header: 'Country', key: 'country_code', width: 12 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'IP Address', key: 'ip', width: 18 },
            { header: 'Device', key: 'device_type', width: 12 },
            { header: 'User Agent', key: 'user_agent', width: 40 },
            { header: 'Start Time', key: 'start_time', width: 22 },
            { header: 'LOI (mm:ss)', key: 'loi_formatted', width: 12 },
            { header: 'Timestamp', key: 'created_at', width: 22 },
        ]

        // Style headers
        const headerRow = worksheet.getRow(1)
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
        headerRow.commit()

        const summary = { total: 0, completes: 0, terminates: 0, quotas: 0, others: 0 }

        rows.forEach((r: any, index: number) => {
            const status = (r.status || 'in_progress').toLowerCase()
            summary.total++
            if (status === 'complete') summary.completes++
            else if (status.includes('terminate')) summary.terminates++
            else if (status.includes('quota')) summary.quotas++
            else summary.others++

            const startMs = r.start_time ? new Date(r.start_time).getTime() : null
            const endMs = r.updated_at ? new Date(r.updated_at).getTime() : null
            const loiSec = (startMs && endMs) ? Math.floor((endMs - startMs) / 1000) : 0
            const loiFmt = `${Math.floor(loiSec / 60)}:${String(loiSec % 60).padStart(2, '0')}`

            const row = worksheet.addRow({
                hash_identifier: r.hash_identifier || 'N/A',
                supplier_uid: r.supplier_uid || r.uid || 'N/A',
                client_uid_sent: r.client_uid_sent || 'N/A',
                client_pid: r.client_pid || 'N/A',
                supplier_token: r.supplier_token || 'N/A',
                project_code: r.project_code || 'N/A',
                project_name: r.project_name || 'N/A',
                country_code: r.country_code || 'N/A',
                status: status.toUpperCase(),
                ip: r.ip || 'N/A',
                device_type: r.device_type || 'Desktop',
                user_agent: r.user_agent || 'N/A',
                start_time: r.start_time ? new Date(r.start_time).toLocaleString() : 'N/A',
                loi_formatted: loiFmt,
                created_at: r.created_at ? new Date(r.created_at).toLocaleString() : 'N/A',
            })

            // Alternate row shading
            if (index % 2 === 0) {
                row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
            }

            // Status color
            const statusCell = row.getCell('status')
            statusCell.alignment = { horizontal: 'center' }
            if (status === 'complete') statusCell.font = { color: { argb: 'FF059669' }, bold: true }
            else if (status.includes('terminate')) statusCell.font = { color: { argb: 'FFDC2626' }, bold: true }
            else if (status.includes('quota')) statusCell.font = { color: { argb: 'FFD97706' }, bold: true }

            row.commit()
        })

        // SHEET 2: SUMMARY
        const summarySheet = workbook.addWorksheet('Export Summary')
        summarySheet.addRow(['OpinionInsights — Export Summary']).font = { bold: true, size: 14 }
        summarySheet.addRow(['Export Timestamp', new Date().toLocaleString()])
        summarySheet.addRow([])
        summarySheet.addRow(['Metric', 'Value']).font = { bold: true }
        summarySheet.addRow(['Total Entries', summary.total])
        summarySheet.addRow(['Completes', summary.completes])
        summarySheet.addRow(['Terminates', summary.terminates])
        summarySheet.addRow(['Quota Full', summary.quotas])
        summarySheet.addRow(['In Progress / Others', summary.others])
        summarySheet.addRow([])
        const cvr = summary.total > 0 ? ((summary.completes / summary.total) * 100).toFixed(2) : '0.00'
        summarySheet.addRow(['Conversion Rate', `${cvr}%`]).font = { bold: true }
        if (projectCode) summarySheet.addRow(['Filtered Project', projectCode])
        if (status) summarySheet.addRow(['Filtered Status', status])
        summarySheet.commit()

        workbook.commit()

        const responseStream = new ReadableStream({
            start(controller) {
                stream.on('data', (chunk) => controller.enqueue(chunk))
                stream.on('end', () => controller.close())
                stream.on('error', (err) => controller.error(err))
            }
        })

        const filename = `survey-responses-${new Date().toISOString().split('T')[0]}.xlsx`
        return new Response(responseStream, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${filename}"`,
            }
        })

    } catch (err: any) {
        console.error('[Export] Error:', err)
        return NextResponse.json({ error: err.message || 'Export failed' }, { status: 500 })
    }
}
