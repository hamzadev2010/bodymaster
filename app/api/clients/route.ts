import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function sanitize(input: unknown, { max = 120, pattern }: { max?: number; pattern?: RegExp } = {}) {
  let s = (input ?? "").toString().replace(/[<>]/g, "").trim();
  if (max && s.length > max) s = s.slice(0, max);
  if (pattern && s && !pattern.test(s)) {
    s = "";
  }
  return s || null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeDeleted = searchParams.get("includeDeleted") === "1";
    
    let query = supabase
      .from('client')
      .select('*')
      .order('createdat', { ascending: false });
    
    if (!includeDeleted) {
      query = query.eq('isdeleted', false);
    }
    
    const { data: clients, error } = await query;
    
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Transform field names to match frontend expectations
    const transformedClients = (clients || []).map(client => ({
      ...client,
      fullName: client.fullname,
      firstName: client.firstname,
      lastName: client.lastname,
      dateOfBirth: client.dateofbirth,
      nationalId: client.nationalid,
      registrationDate: client.registrationdate,
      createdAt: client.createdat,
      updatedAt: client.updatedat,
    }));
    
    return NextResponse.json(transformedClients);
  } catch (error) {
    console.error('GET /api/clients error:', error);
    const errorMessage = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    const fullName = sanitize(data.fullName, { max: 80, pattern: /^[A-ZÀ-ÖØ-Þ'\-\s]+$/ });
    if (!fullName) return NextResponse.json({ error: "fullName required (uppercase letters only)" }, { status: 400 });
    
    const email = sanitize(data.email, { max: 100 });
    const phone = sanitize(data.phone, { max: 20 });
    const notes = sanitize(data.notes, { max: 500 });
    const nationalId = sanitize(data.nationalId, { max: 20 });
    
    let dateOfBirth: Date | null = null;
    if (data.dateOfBirth) {
      const dob = new Date(data.dateOfBirth);
      if (!isNaN(dob.getTime())) {
        const age = (new Date().getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        if (age < 13) return NextResponse.json({ error: "L'âge minimum est 13 ans" }, { status: 400 });
        dateOfBirth = dob;
      }
    }
    
    const clientData: any = {
      fullname: fullName,
      email,
      phone,
      notes,
      nationalid: nationalId,
      dateofbirth: dateOfBirth?.toISOString(),
      registrationdate: new Date().toISOString(),
      subscriptionperiod: data.subscriptionPeriod || null,
      haspromotion: Boolean(data.hasPromotion),
      promotionperiod: data.promotionPeriod || null,
      createdat: new Date().toISOString(),
      updatedat: new Date().toISOString(),
      isdeleted: false,
    };
    
    const { data: created, error } = await supabase
      .from('client')
      .insert([clientData])
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error:', error);
      if (error.code === '23505') {
        return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Log to history
    try {
      await supabase.from('clienthistory').insert([{
        clientid: created.id,
        action: "CREATE",
        changes: JSON.stringify(created),
        createdat: new Date().toISOString(),
      }]);
    } catch (histErr) {
      console.warn("History log failed:", histErr);
    }
    
    const transformed = {
      ...created,
      fullName: created.fullname,
      firstName: created.firstname,
      lastName: created.lastname,
      dateOfBirth: created.dateofbirth,
      nationalId: created.nationalid,
      registrationDate: created.registrationdate,
      createdAt: created.createdat,
      updatedAt: created.updatedat,
    };
    
    return NextResponse.json(transformed, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/clients error:", error);
    const errorMessage = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const data = await request.json();
    const clientId = Number(data.id);

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

    return NextResponse.json({ success: true, message: "Client supprimé avec succès" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}