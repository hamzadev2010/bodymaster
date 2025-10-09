import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const clientId = Number(id);
    
    const { data: client, error } = await supabase
      .from('client')
      .select('*')
      .eq('id', clientId)
      .single();
    
    if (error || !client) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    
    return NextResponse.json(client);
  } catch (error) {
    console.error('GET /api/clients/[id] error:', error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const clientId = Number(id);
    
    if (isNaN(clientId) || !Number.isInteger(clientId) || clientId <= 0) {
      return NextResponse.json({ error: "Invalid client ID" }, { status: 400 });
    }
    
    const data = await req.json();
    
    const updateData: any = {
      updatedat: new Date().toISOString(),
    };
    
    if (data.fullName !== undefined) updateData.fullname = data.fullName;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.nationalId !== undefined) updateData.nationalid = data.nationalId;
    if (data.dateOfBirth !== undefined) updateData.dateofbirth = data.dateOfBirth;
    if (data.subscriptionPeriod !== undefined) updateData.subscriptionperiod = data.subscriptionPeriod;
    if (data.hasPromotion !== undefined) updateData.haspromotion = data.hasPromotion;
    if (data.promotionPeriod !== undefined) updateData.promotionperiod = data.promotionPeriod;
    
    const { data: updated, error } = await supabase
      .from('client')
      .update(updateData)
      .eq('id', clientId)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Log to history
    try {
      await supabase.from('clienthistory').insert([{
        clientid: clientId,
        action: "UPDATE",
        changes: JSON.stringify(updated),
        createdat: new Date().toISOString(),
      }]);
    } catch (histErr) {
      console.warn("History log failed:", histErr);
    }
    
    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/clients/[id] error:', error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id: idStr } = await params;
    const clientId = Number(idStr);

    if (!clientId || isNaN(clientId)) {
      return NextResponse.json({ error: "ID client invalide" }, { status: 400 });
    }

    // Check if client exists
    const { data: client, error: fetchError } = await supabase
      .from('client')
      .select('id, fullname, isdeleted')
      .eq('id', clientId)
      .single();

    if (fetchError || !client) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
    }

    if (client.isdeleted) {
      return NextResponse.json({ error: "Client déjà supprimé" }, { status: 400 });
    }

    // Soft delete the client
    const { error: updateError } = await supabase
      .from('client')
      .update({
        isdeleted: true,
        deletedat: new Date().toISOString(),
        updatedat: new Date().toISOString(),
      })
      .eq('id', clientId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Soft delete related payments
    await supabase
      .from('payment')
      .update({
        isdeleted: true,
        deletedat: new Date().toISOString(),
        updatedat: new Date().toISOString(),
      })
      .eq('clientid', clientId)
      .eq('isdeleted', false);

    // Soft delete related presence records
    await supabase
      .from('presence')
      .update({
        isdeleted: true,
        deletedat: new Date().toISOString(),
      })
      .eq('clientid', clientId)
      .eq('isdeleted', false);

    // Log the deletion
    try {
      await supabase.from('clienthistory').insert([{
        clientid: clientId,
        action: "DELETE",
        changes: JSON.stringify({ fullname: client.fullname, deletedat: new Date().toISOString() }),
        createdat: new Date().toISOString(),
      }]);
    } catch (histErr) {
      console.warn("History log failed:", histErr);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}