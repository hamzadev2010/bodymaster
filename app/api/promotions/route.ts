import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const { data: promotions, error } = await supabase
      .from('promotion')
      .select('*')
      .eq('isdeleted', false)
      .order('createdat', { ascending: false });
    
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    const transformed = (promotions || []).map((p) => ({
      id: p.id,
      name: p.name,
      notes: p.notes ?? null,
      fixedPrice: p.fixedprice,
      subscriptionMonths: p.subscriptionmonths ?? null,
      startDate: p.startdate,
      endDate: p.enddate ?? null,
      active: p.active ?? true,
      createdAt: p.createdat ?? null,
      updatedAt: p.updatedat ?? null,
      deletedAt: p.deletedat ?? null,
    }));
    
    return NextResponse.json(transformed);
  } catch (e: unknown) {
    console.error("GET /api/promotions error:", e);
    const errorMessage = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json().catch(() => null);
    if (!data) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

    const name = String(data.name || "").trim();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const fixedPriceNum = Number(data.fixedPrice);
    if (!Number.isFinite(fixedPriceNum)) return NextResponse.json({ error: "fixedPrice must be a number" }, { status: 400 });

    if (!data.startDate) return NextResponse.json({ error: "startDate is required" }, { status: 400 });
    const startDate = new Date(data.startDate);
    if (isNaN(startDate.getTime())) return NextResponse.json({ error: "startDate is invalid" }, { status: 400 });

    let endDate: Date | null = null;
    if (data.endDate) {
      const ed = new Date(data.endDate);
      if (isNaN(ed.getTime())) return NextResponse.json({ error: "endDate is invalid" }, { status: 400 });
      endDate = ed;
    }

    const promotionData: any = {
      name,
      notes: data.notes || null,
      fixedprice: fixedPriceNum,
      subscriptionmonths: data.subscriptionMonths || null,
      startdate: startDate.toISOString(),
      enddate: endDate?.toISOString(),
      active: data.active ?? true,
      createdat: new Date().toISOString(),
      updatedat: new Date().toISOString(),
      isdeleted: false,
    };

    const { data: created, error } = await supabase
      .from('promotion')
      .insert([promotionData])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log to history
    try {
      await supabase.from('promotionhistory').insert([{
        promotionid: created.id,
        action: "CREATE",
        changes: JSON.stringify(created),
        createdat: new Date().toISOString(),
      }]);
    } catch (histErr) {
      console.warn("History log failed:", histErr);
    }

    const transformed = {
      id: created.id,
      name: created.name,
      notes: created.notes ?? null,
      fixedPrice: created.fixedprice,
      subscriptionMonths: created.subscriptionmonths ?? null,
      startDate: created.startdate,
      endDate: created.enddate ?? null,
      active: created.active ?? true,
      createdAt: created.createdat ?? null,
      updatedAt: created.updatedat ?? null,
      deletedAt: created.deletedat ?? null,
    } as const;
    
    return NextResponse.json(transformed, { status: 201 });
  } catch (e: unknown) {
    console.error("POST /api/promotions error:", e);
    const errorMessage = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const data = await request.json();
    const promotionId = Number(data.id);

    if (!promotionId || isNaN(promotionId)) {
      return NextResponse.json({ error: "ID promotion invalide" }, { status: 400 });
    }

    // Check if promotion exists
    const { data: promotion, error: fetchError } = await supabase
      .from('promotion')
      .select('id, name, isdeleted')
      .eq('id', promotionId)
      .single();

    if (fetchError || !promotion) {
      return NextResponse.json({ error: "Promotion introuvable" }, { status: 404 });
    }

    if (promotion.isdeleted) {
      return NextResponse.json({ error: "Promotion déjà supprimée" }, { status: 400 });
    }

    // Soft delete the promotion
    const { error: updateError } = await supabase
      .from('promotion')
      .update({
        isdeleted: true,
        deletedat: new Date().toISOString(),
        updatedat: new Date().toISOString(),
      })
      .eq('id', promotionId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Promotion supprimée avec succès" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}