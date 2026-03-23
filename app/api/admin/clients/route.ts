import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/insforge-server";

export async function GET() {
    const db = await createAdminClient();
    if (!db) return NextResponse.json({ error: "InsForge not configured" }, { status: 500 });

    const { data, error } = await db.database
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
    const db = await createAdminClient();
    if (!db) return NextResponse.json({ error: "InsForge not configured" }, { status: 500 });

    try {
        const body = await req.json();
        const { data, error } = await db.database
            .from('clients')
            .insert([body])
            .select()
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
}

export async function DELETE(req: NextRequest) {
    const db = await createAdminClient();
    if (!db) return NextResponse.json({ error: "InsForge not configured" }, { status: 500 });

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: "Missing client ID" }, { status: 400 });
        }

        const { error } = await db.database
            .from('clients')
            .delete()
            .eq('id', id);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
}
