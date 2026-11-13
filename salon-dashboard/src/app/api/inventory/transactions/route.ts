import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, name, email, role")
      .eq("id", user.id)
      .maybeSingle();

    const roleLower = (profile?.role || "").toLowerCase();
    if (!["administrator", "admin", "staff"].includes(roleLower)) {
      return NextResponse.json(
        { error: "Unauthorized: only admin and staff can view inventory transactions." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const inventoryId = searchParams.get("inventoryId");

    let query = supabase
      .from("inventory_transactions")
      .select(
        `
        *,
        inventory:inventory_id (id, name, category, unit, quantity, status),
        appointment:appointment_id (id, customer_name, service_name, appointment_date, appointment_time)
      `
      )
      .order("created_at", { ascending: false });

    if (inventoryId) {
      query = query.eq("inventory_id", inventoryId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[INVENTORY TRANSACTIONS GET ERROR]:", error);
      return NextResponse.json(
        { error: error.message || "Failed to load inventory transactions." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      transactions: data || [],
      currentUser: {
        id: user.id,
        name:
          profile?.name?.trim() ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "Admin User",
        email: profile?.email || user.email || "",
        role: profile?.role || "Administrator",
      },
    });
  } catch (err: any) {
    console.error("[INVENTORY TRANSACTIONS GET EXCEPTION]:", err);
    return NextResponse.json(
      { error: err?.message || "Server error loading inventory transactions." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(
        { error: "Authentication required to issue or adjust inventory." },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, name, email, role")
      .eq("id", user.id)
      .maybeSingle();

    const roleLower = (profile?.role || "").toLowerCase();
    if (!["administrator", "admin", "staff"].includes(roleLower)) {
      return NextResponse.json(
        { error: "Unauthorized: Customers are not permitted to issue or modify inventory." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      inventoryId,
      transactionType = "ISSUE",
      quantity,
      issuedBy,
      issuedByName,
      issuedTo,
      issuedToId,
      issuedToType,
      appointmentId,
      reason,
      notes,
      isNegativeAdjustment = false,
    } = body;

    if (!inventoryId) {
      return NextResponse.json(
        { error: "Please select a valid inventory item." },
        { status: 400 }
      );
    }

    const parsedQty = Number(quantity);
    if (!Number.isInteger(parsedQty) || parsedQty <= 0) {
      return NextResponse.json(
        { error: "Quantity must be a positive whole number greater than zero." },
        { status: 400 }
      );
    }

    const validTypes = [
      "RESTOCK",
      "ISSUE",
      "RETURN",
      "ADJUSTMENT",
      "WASTE",
      "EXPIRED",
      "DAMAGED",
    ];
    const normalizedType = String(transactionType || "ISSUE").trim().toUpperCase();
    if (!validTypes.includes(normalizedType)) {
      return NextResponse.json(
        { error: `Unsupported transaction type: ${normalizedType}` },
        { status: 400 }
      );
    }

    // Execute atomic DB function (locks inventory row FOR UPDATE, verifies stock, updates stock, inserts audit record)
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "record_inventory_transaction",
      {
        p_inventory_id: inventoryId,
        p_transaction_type: normalizedType,
        p_quantity: parsedQty,
        p_issued_to: issuedTo || null,
        p_issued_to_id: issuedToId || null,
        p_issued_to_type: issuedToType || null,
        p_appointment_id: appointmentId || null,
        p_reason: reason || null,
        p_notes: notes || null,
        p_is_negative_adjustment: Boolean(isNegativeAdjustment),
        p_issued_by: issuedBy || null,
        p_issued_by_name: issuedByName || null,
      }
    );

    if (rpcError) {
      console.error("[INVENTORY TRANSACTION RPC ERROR]:", rpcError.message);
      const status = /insufficient stock|positive whole number|not found/i.test(
        rpcError.message
      )
        ? 400
        : /unauthorized|authentication/i.test(rpcError.message)
          ? 403
          : 500;
      return NextResponse.json(
        { error: rpcError.message || "Failed to record inventory transaction." },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      transaction: rpcResult?.transaction,
      inventory: rpcResult?.inventory,
    });
  } catch (err: any) {
    console.error("[INVENTORY TRANSACTION POST EXCEPTION]:", err);
    return NextResponse.json(
      { error: err?.message || "Server error processing inventory transaction." },
      { status: 500 }
    );
  }
}

