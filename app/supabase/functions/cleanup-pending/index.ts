// @ts-nocheck
// Edge Function: cleanup-pending-signups
// Deletes auth users with pending_registration=true older than a threshold and logs deletions

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const THRESHOLD_HOURS = Number(Deno.env.get('CLEANUP_PENDING_HOURS') || '48');

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return new Response(JSON.stringify({ success: false, error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch all users via Admin API (may paginate)
    const usersRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      },
    });

    if (!usersRes.ok) {
      const body = await usersRes.text();
      console.error('Failed to fetch users:', body);
      return new Response(JSON.stringify({ success: false, error: 'Failed to fetch users' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const users = await usersRes.json();
    const cutoff = Date.now() - THRESHOLD_HOURS * 60 * 60 * 1000;

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const deleted: any[] = [];
    for (const user of users) {
      try {
        const pendingMeta = user.raw_user_meta_data && (user.raw_user_meta_data.pending_registration === true || user.raw_user_meta_data.pending_registration === 'true');
        const createdAt = user.created_at ? new Date(user.created_at).getTime() : 0;
        if (pendingMeta && createdAt > 0 && createdAt < cutoff) {
          // Delete user via Admin API
          const delRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${SERVICE_KEY}`,
              apikey: SERVICE_KEY,
            },
          });

          if (delRes.ok) {
            // Log deletion to table
            await supabase.from('pending_signup_cleanup_log').insert({ user_id: user.id, reason: 'pending_registration_expired', details: { user }, deleted_at: new Date().toISOString() });
            deleted.push({ id: user.id });
          } else {
            const body = await delRes.text();
            console.warn('Failed to delete user', user.id, body);
          }
        }
      } catch (e) {
        console.error('Error processing user', user.id, e);
      }
    }

    return new Response(JSON.stringify({ success: true, deleted_count: deleted.length, deleted }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('cleanup-pending error', error);
    return new Response(JSON.stringify({ success: false, error: error.message || String(error) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
