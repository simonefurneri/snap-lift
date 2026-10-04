import 'server-only';
import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/supabase/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const { errorResponse, adminClient } = await verifyAdminSession();
  if (errorResponse) {
    return errorResponse;
  }
  if (!adminClient) {
    return NextResponse.json(
      { error: 'Client di amministrazione non disponibile.' },
      { status: 500 }
    );
  }

  try {
    const { data: profiles, error } = await adminClient
      .from('profiles')
      .select('id, email, display_name, weight_unit, is_approved, is_admin, approved_at, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching admin users list:', error);
      return NextResponse.json(
        { error: 'Impossibile recuperare l\'elenco degli utenti.' },
        { status: 500 }
      );
    }

    const pending = (profiles || []).filter((u) => !u.is_approved);
    const approved = (profiles || []).filter((u) => u.is_approved);

    return NextResponse.json({
      pending,
      approved,
      totalPending: pending.length,
      totalApproved: approved.length,
    });
  } catch (err: any) {
    console.error('Error in /api/admin/users:', err);
    return NextResponse.json(
      { error: err.message || 'Errore durante il recupero degli utenti.' },
      { status: 500 }
    );
  }
}
