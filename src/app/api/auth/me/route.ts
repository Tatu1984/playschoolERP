import { NextResponse } from "next/server";
import { getSession } from "@/backend/services/auth.service";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({
    user: {
      id: session.sub,
      email: session.email,
      name: session.name,
      role: session.role,
      branchId: session.branchId,
    },
  });
}
