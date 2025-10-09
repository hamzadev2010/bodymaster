import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const includeDeleted = new URL(request.url).searchParams.get("includeDeleted") === "1";
    
    let query = supabase
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
      .order('createdat', { ascending: false })
      .limit(100);
    
    if (!includeDeleted) {
      query = query.eq('isdeleted', false);
    }
    
    const { data: payments, error } = await query;
    
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Transform field names to match frontend expectations
    const transformedPayments = (payments || []).map(payment => ({
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
    }));
    
    return NextResponse.json(transformedPayments);
  } catch (error) {
    console.error('GET /api/payments error:', error);
    const errorMessage = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    const clientId = Number(data.clientId);
    const amount = Number(data.amount);
    
    if (!clientId || isNaN(clientId)) {
      return NextResponse.json({ error: "clientId invalide" }, { status: 400 });
    }
    
    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "amount invalide" }, { status: 400 });
    }
    
    const paymentDate = data.paymentDate ? new Date(data.paymentDate) : new Date();
    if (isNaN(paymentDate.getTime())) {
      return NextResponse.json({ error: "paymentDate invalide" }, { status: 400 });
    }
    
    let nextPaymentDate: Date | null = null;
    if (data.nextPaymentDate) {
      nextPaymentDate = new Date(data.nextPaymentDate);
      if (isNaN(nextPaymentDate.getTime())) {
        return NextResponse.json({ error: "nextPaymentDate invalide" }, { status: 400 });
      }
    }
    
    const paymentData: any = {
      clientid: clientId,
      promotionid: data.promotionId || null,
      amount,
      paymentdate: paymentDate.toISOString(),
      nextpaymentdate: nextPaymentDate?.toISOString(),
      subscriptionperiod: data.subscriptionPeriod || "MONTHLY",
      notes: data.notes || null,
      createdat: new Date().toISOString(),
      updatedat: new Date().toISOString(),
      isdeleted: false,
    };
    
    const { data: created, error } = await supabase
      .from('payment')
      .insert([paymentData])
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
        paymentid: created.id,
        action: "CREATE",
        changes: JSON.stringify(created),
        createdat: new Date().toISOString(),
      }]);
    } catch (histErr) {
      console.warn("History log failed:", histErr);
    }
    
    const transformedPayment = {
      id: created.id,
      clientId: created.clientid,
      promotionId: created.promotionid,
      amount: created.amount,
      paymentDate: created.paymentdate,
      nextPaymentDate: created.nextpaymentdate,
      subscriptionPeriod: created.subscriptionperiod,
      notes: created.notes,
      client: created.client ? {
        id: created.client.id,
        fullName: created.client.fullname,
        firstName: created.client.firstname,
        lastName: created.client.lastname,
        email: created.client.email,
        phone: created.client.phone,
        nationalId: created.client.nationalid,
        dateOfBirth: created.client.dateofbirth,
        registrationDate: created.client.registrationdate,
      } : null,
      promotion: created.promotion ? {
        id: created.promotion.id,
        name: created.promotion.name,
        subscriptionMonths: created.promotion.subscriptionmonths,
      } : null,
    };
    
    return NextResponse.json(transformedPayment, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/payments error:", error);
    const errorMessage = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}