import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/insforge-server'
import ExcelJS from 'exceljs'
import { PassThrough } from 'stream'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
    try {
        const db = await createServerClient()
        if (!db) {
            return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
        }

        // 1. Fetch data
        const { data: responses, error } = await db.database
            .from('responses')
            .select(`
                *,
                projects (
                    project_code,
                    project_name,
                    country,
                    clients (
                        name
                    )
                )
            `)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Export fetch error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Create a passthrough stream
        const stream = new PassThrough()

        // 2. Setup Excel Workbook
        const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
            stream: stream,
            useStyles: true,
            useSharedStrings: true
        })

        // --- SHEET 1: RESPONSE DATA ---
        const worksheet = workbook.addWorksheet('Response Data')

        // Define Columns matching professional MR standards
        worksheet.columns = [
            { header: 'Hash Identifier', key: 'hash_identifier', width: 15 },
            { header: 'Supplier UID', key: 'supplier_uid', width: 25 },
            { header: 'Client UID Sent', key: 'client_uid_sent', width: 25 },
            { header: 'Supplier Token', key: 'supplier_token', width: 25 },
            { header: 'Project Code', key: 'project_code', width: 15 },
            { header: 'Project Name', key: 'project_name', width: 25 },
            { header: 'Client', key: 'client', width: 20 },
            { header: 'Country', key: 'country', width: 12 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'IP Address', key: 'ip', width: 18 },
            { header: 'Device', key: 'device', width: 12 },
            { header: 'User Agent', key: 'user_agent', width: 40 },
            { header: 'Start Time', key: 'start_time', width: 22 },
            { header: 'End Time', key: 'end_time', width: 22 },
            { header: 'LOI (s)', key: 'loi_seconds', width: 10 },
            { header: 'LOI (mm:ss)', key: 'loi_formatted', width: 12 },
            { header: 'Timestamp', key: 'timestamp', width: 22 },
            { header: 'Date', key: 'date', width: 12 },
            { header: 'Time', key: 'time', width: 12 }
        ]

        // Style headers
        const headerRow = worksheet.getRow(1)
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } } // Slate-800
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
        headerRow.commit()

        // Cache for summary metrics
        const summary = {
            total: 0,
            completes: 0,
            terminates: 0,
            quotas: 0,
            others: 0,
            total_loi_seconds: 0
        }

        // Add Data Rows
        responses?.forEach((r: any, index: number) => {
            const dateObj = new Date(r.created_at)
            const projData = r.projects as any
            const clientData = projData?.clients as any
            const status = (r.status || 'started').toLowerCase()

            // Update summary
            summary.total++
            if (status === 'complete') {
                summary.completes++
                if (r.loi_seconds) summary.total_loi_seconds += r.loi_seconds
            }
            else if (status.includes('terminate')) summary.terminates++
            else if (status.includes('quota')) summary.quotas++
            else summary.others++

            const rowData = {
                hash_identifier: r.hash_identifier || 'N/A',
                supplier_uid: r.supplier_uid || r.uid || 'N/A',
                client_uid_sent: r.client_uid_sent || r.supplier_token || r.uid || 'N/A',
                supplier_token: r.supplier_token || 'N/A',
                project_code: r.project_code || 'N/A',
                project_name: projData?.project_name || 'N/A',
                client: clientData?.name || 'N/A',
                country: projData?.country || 'N/A',
                status: status.toUpperCase(),
                ip: r.ip || r.user_ip || 'N/A',
                device: r.device_type || 'Desktop',
                user_agent: r.user_agent || 'N/A',
                start_time: r.start_time ? new Date(r.start_time).toLocaleString() : 'N/A',
                end_time: r.end_time ? new Date(r.end_time).toLocaleString() : 'N/A',
                loi_seconds: r.loi_seconds || 0,
                loi_formatted: r.loi_seconds ? `${Math.floor(r.loi_seconds / 60)}:${String(r.loi_seconds % 60).padStart(2, '0')}` : '0:00',
                timestamp: dateObj.toLocaleString(),
                date: dateObj.toLocaleDateString('en-GB').replace(/\//g, '-'),
                time: dateObj.toLocaleTimeString('en-GB')
            }

            const row = worksheet.addRow(rowData)

            // Monospace font for UID columns
            row.getCell('supplier_uid').font = { name: 'Courier New' }
            row.getCell('client_uid_sent').font = { name: 'Courier New' }

            // Highlight Client UID if generated
            if (rowData.supplier_uid !== rowData.client_uid_sent) {
                row.getCell('client_uid_sent').font = { name: 'Courier New', bold: true, color: { argb: 'FF4F46E5' } }
            }

            // Alternate row shading
            if (index % 2 === 0) {
                row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
            }

            // Status color coding
            const statusCell = row.getCell('status')
            statusCell.alignment = { horizontal: 'center' }
            if (status === 'complete') statusCell.font = { color: { argb: 'FF059669' }, bold: true }
            else if (status.includes('terminate')) statusCell.font = { color: { argb: 'FFDC2626' }, bold: true }
            else if (status.includes('quota')) statusCell.font = { color: { argb: 'FFD97706' }, bold: true }

            row.commit()
        })

        // --- SHEET 2: SUMMARY ---
        const summarySheet = workbook.addWorksheet('Export Summary')
        summarySheet.addRow(['Opinion Insights - Intelligence Report Summary']).font = { bold: true, size: 14 }
        summarySheet.addRow(['Export Timestamp', new Date().toLocaleString()])
        summarySheet.addRow([])
        summarySheet.addRow(['Metric', 'Value']).font = { bold: true }
        summarySheet.addRow(['Total Entries', summary.total])
        summarySheet.addRow(['Completes', summary.completes])
        summarySheet.addRow(['Terminates', summary.terminates])
        summarySheet.addRow(['Quota Full', summary.quotas])
        summarySheet.addRow(['In Progress / Others', summary.others])
        summarySheet.addRow([])

        const convRate = summary.total > 0 ? (summary.completes / summary.total) * 100 : 0
        summarySheet.addRow(['Conversion Rate', `${convRate.toFixed(2)}%`]).font = { bold: true }

        const avgLoi = summary.completes > 0 ? summary.total_loi_seconds / summary.completes : 0
        summarySheet.addRow(['Average LOI (Seconds)', Math.round(avgLoi)])
        summarySheet.addRow(['Average LOI (mm:ss)', `${Math.floor(avgLoi / 60)}:${String(Math.round(avgLoi % 60)).padStart(2, '0')}`])

        summarySheet.commit()

        // 7. Finalize and Export
        workbook.commit()

        const responseStream = new ReadableStream({
            start(controller) {
                stream.on('data', (chunk) => controller.enqueue(chunk))
                stream.on('end', () => controller.close())
                stream.on('error', (err) => controller.error(err))
            }
        })

        return new Response(responseStream, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="survey-responses-${new Date().toISOString().split('T')[0]}.xlsx"`,
            }
        })

    } catch (err: any) {
        console.error('Export route error:', err)
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
    }
}
