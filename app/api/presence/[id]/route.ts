import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id: idStr } = await params;
    const id = Number(idStr);
    
    const { data: presence, error } = await supabase
      .from('presence')
      .select('*')
      .eq('id', id)
      .eq('isdeleted', false)
      .single();
    
    if (error || !presence) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    
    return NextResponse.json(presence);
  } catch (error) {
    console.error("Error fetching presence:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id: idStr } = await params;
    const id = Number(idStr);
    
    if (!id || isNaN(id)) {
      return NextResponse.json({ error: "id invalide" }, { status: 400 });
    }

    // Check if presence exists and is not already deleted
    const { data: presence, error: fetchError } = await supabase
      .from('presence')
      .select('id, isdeleted')
      .eq('id', id)
      .single();

    if (fetchError || !presence) {
      return NextResponse.json({ error: "Pointage introuvable" }, { status: 404 });
    }

    if (presence.isdeleted) {
      return NextResponse.json({ error: "Pointage déjà supprimé" }, { status: 400 });
    }

    // Soft delete the presence
    const { error: updateError } = await supabase
      .from('presence')
      .update({
        isdeleted: true,
        deletedat: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "Erreur serveur";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}