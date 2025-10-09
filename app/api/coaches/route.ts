import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function sanitize(input: unknown, { max = 120, pattern }: { max?: number; pattern?: RegExp } = {}) {
  let s = (input ?? "").toString().replace(/[<>]/g, "").trim();
  if (max && s.length > max) s = s.slice(0, max);
  if (pattern && s && !pattern.test(s)) s = "";
  return s || null;
}

export async function GET() {
  try {
    const { data: coaches, error } = await supabase
      .from('coach')
      .select('*')
      .eq('isdeleted', false)
      .order('createdat', { ascending: false });
    
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Transform field names to match frontend expectations
    const transformedCoaches = (coaches || []).map(coach => ({
      ...coach,
      fullName: coach.fullname,
      dateOfBirth: coach.dateofbirth,
      nationalId: coach.nationalid,
      registrationDate: coach.registrationdate,
      endOfServiceDate: coach.endofservicedate,
      createdAt: coach.createdat,
      updatedAt: coach.updatedat,
    }));
    
    return NextResponse.json(transformedCoaches);
  } catch (error) {
    console.error('GET /api/coaches error:', error);
    const errorMessage = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    const fullName = sanitize(data.fullName, { max: 80, pattern: /^[A-ZÀ-ÖØ-Þ'\-\s]+$/ });
    if (!fullName) return NextResponse.json({ error: "fullName required (uppercase letters only)" }, { status: 400 });
    
    const specialty = sanitize(data.specialty, { max: 100 });
    const email = sanitize(data.email, { max: 100 });
    const phone = sanitize(data.phone, { max: 20 });
    const notes = sanitize(data.notes, { max: 500 });
    const nationalId = sanitize(data.nationalId, { max: 20 });
    
    let dateOfBirth: Date | null = null;
    if (data.dateOfBirth) {
      const dob = new Date(data.dateOfBirth);
      if (!isNaN(dob.getTime())) dateOfBirth = dob;
    }
    
    let endOfServiceDate: Date | null = null;
    if (data.endOfServiceDate) {
      const eosd = new Date(data.endOfServiceDate);
      if (!isNaN(eosd.getTime())) endOfServiceDate = eosd;
    }
    
    const coachData: any = {
      fullname: fullName,
      specialty,
      email,
      phone,
      notes,
      nationalid: nationalId,
      dateofbirth: dateOfBirth?.toISOString(),
      registrationdate: new Date().toISOString(),
      endofservicedate: endOfServiceDate?.toISOString(),
      subscriptionperiod: data.subscriptionPeriod || null,
      haspromotion: Boolean(data.hasPromotion),
      promotionperiod: data.promotionPeriod || null,
      createdat: new Date().toISOString(),
      updatedat: new Date().toISOString(),
      isdeleted: false,
    };
    
    const { data: created, error } = await supabase
      .from('coach')
      .insert([coachData])
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
      await supabase.from('coachhistory').insert([{
        coachid: created.id,
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
      dateOfBirth: created.dateofbirth,
      nationalId: created.nationalid,
      registrationDate: created.registrationdate,
      endOfServiceDate: created.endofservicedate,
      createdAt: created.createdat,
      updatedAt: created.updatedat,
    };
    
    return NextResponse.json(transformed, { status: 201 });
  } catch (e: unknown) {
    console.error("POST /api/coaches error:", e);
    const errorMessage = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const data = await request.json();
    const coachId = Number(data.id);

    if (!coachId || isNaN(coachId)) {
      return NextResponse.json({ error: "ID coach invalide" }, { status: 400 });
    }

    // Check if coach exists
    const { data: coach, error: fetchError } = await supabase
      .from('coach')
      .select('id, fullname, isdeleted')
      .eq('id', coachId)
      .single();

    if (fetchError || !coach) {
      return NextResponse.json({ error: "Coach introuvable" }, { status: 404 });
    }

    if (coach.isdeleted) {
      return NextResponse.json({ error: "Coach déjà supprimé" }, { status: 400 });
    }

    // Soft delete the coach
    const { error: updateError } = await supabase
      .from('coach')
      .update({
        isdeleted: true,
        deletedat: new Date().toISOString(),
        updatedat: new Date().toISOString(),
      })
      .eq('id', coachId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log the deletion
    try {
      await supabase.from('coachhistory').insert([{
        coachid: coachId,
        action: "DELETE",
        changes: JSON.stringify({ fullname: coach.fullname, deletedat: new Date().toISOString() }),
        createdat: new Date().toISOString(),
      }]);
    } catch (histErr) {
      console.warn("History log failed:", histErr);
    }

    return NextResponse.json({ success: true, message: "Coach supprimé avec succès" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}