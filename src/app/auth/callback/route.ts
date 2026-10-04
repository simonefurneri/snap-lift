import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ProfileInsert } from '@/types/database.types';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/plans';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Ensure profile exists for this user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single();

        if (!profile) {
          const displayName = user.user_metadata?.full_name || 
                              user.user_metadata?.name || 
                              user.email?.split('@')[0] || 
                              'Atleta';
          const newProfile: ProfileInsert = {
            id: user.id,
            display_name: displayName,
            weight_unit: 'kg',
            progression_pct: 2.5,
            load_step: 1.25,
          };
          await supabase.from('profiles').insert(newProfile as any);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Impossibile completare l'autenticazione`);
}
