import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  try {
    const { id: idStr } = await params;
    const id = Number(idStr);
    
    const { data: payment, error } = await supabase
      .from('payment')
      .select(`
        *,
        client:clientid (
          id, fullname, firstname, lastname, email, phone, nationalid, dateofbirth, registrationdate
        ),
        promotion:promotionid (
          id, name, subscriptionmonths
        )
      `)
      .eq('id', id)
      .single();
    
    if (error || !payment) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    
    const transformedPayment = {
      id: payment.id,
      clientId: payment.clientid,
      promotionId: payment.promotionid,
      amount: payment.amount,
      paymentDate: payment.paymentdate,
      nextPaymentDate: payment.nextpaymentdate,
      subscriptionPeriod: payment.subscriptionperiod,
      notes: payment.notes,
      client: payment.client ? {
        id: payment.client.id,
        fullName: payment.client.fullname,
        firstName: payment.client.firstname,
        lastName: payment.client.lastname,
        email: payment.client.email,
        phone: payment.client.phone,
        nationalId: payment.client.nationalid,
        dateOfBirth: payment.client.dateofbirth,
        registrationDate: payment.client.registrationdate,
      } : null,
      promotion: payment.promotion ? {
        id: payment.promotion.id,
        name: payment.promotion.name,
        subscriptionMonths: payment.promotion.subscriptionmonths,
      } : null,
    };
    
    return NextResponse.json(transformedPayment);
  } catch (error) {
    console.error("Error fetching payment:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id: idStr } = await params;
    const id = Number(idStr);
    const data = await request.json();

    const updateData: any = {
      updatedat: new Date().toISOString(),
    };
    
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.paymentDate !== undefined) updateData.paymentdate = data.paymentDate;
    if (data.nextPaymentDate !== undefined) updateData.nextpaymentdate = data.nextPaymentDate;
    if (data.subscriptionPeriod !== undefined) updateData.subscriptionperiod = data.subscriptionPeriod;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.promotionId !== undefined) updateData.promotionid = data.promotionId;
    
    const { data: updated, error } = await supabase
      .from('payment')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        client:clientid (
          id, fullname, firstname, lastname, email, phone, nationalid, dateofbirth, registrationdate
        ),
        promotion:promotionid (
          id, name, subscriptionmonths
        )
      `)
      .single();
    
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Log to history
    try {
      await supabase.from('paymenthistory').insert([{
        paymentid: id,
        action: "UPDATE",
        changes: JSON.stringify(updated),
        createdat: new Date().toISOString(),
      }]);
    } catch (histErr) {
      console.warn("History log failed:", histErr);
    }
    
    const transformedPayment = {
      id: updated.id,
      clientId: updated.clientid,
      promotionId: updated.promotionid,
      amount: updated.amount,
      paymentDate: updated.paymentdate,
      nextPaymentDate: updated.nextpaymentdate,
      subscriptionPeriod: updated.subscriptionperiod,
      notes: updated.notes,
      client: updated.client ? {
        id: updated.client.id,
        fullName: updated.client.fullname,
        firstName: updated.client.firstname,
        lastName: updated.client.lastname,
        email: updated.client.email,
        phone: updated.client.phone,
        nationalId: updated.client.nationalid,
        dateOfBirth: updated.client.dateofbirth,
        registrationDate: updated.client.registrationdate,
      } : null,
      promotion: updated.promotion ? {
        id: updated.promotion.id,
        name: updated.promotion.name,
        subscriptionMonths: updated.promotion.subscriptionmonths,
      } : null,
    };

    return NextResponse.json(transformedPayment);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id: idStr } = await params;
    const id = Number(idStr);

    if (!id || isNaN(id)) {
      return NextResponse.json({ error: "ID paiement invalide" }, { status: 400 });
    }

    // Check if payment exists
    const { data: payment, error: fetchError } = await supabase
      .from('payment')
      .select('id, amount, isdeleted')
      .eq('id', id)
      .single();

    if (fetchError || !payment) {
      return NextResponse.json({ error: "Paiement introuvable" }, { status: 404 });
    }

    if (payment.isdeleted) {
      return NextResponse.json({ error: "Paiement déjà supprimé" }, { status: 400 });
    }

    // Soft delete the payment
    const { error: updateError } = await supabase
      .from('payment')
      .update({
        isdeleted: true,
        deletedat: new Date().toISOString(),
        updatedat: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log the deletion
    try {
      await supabase.from('paymenthistory').insert([{
        paymentid: id,
        action: "DELETE",
        changes: JSON.stringify({ amount: payment.amount, deletedat: new Date().toISOString() }),
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