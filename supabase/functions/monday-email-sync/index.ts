import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Reads Monday.com notification emails from a HubSpot inbox and turns each
// Monday item into one Donezy task. Later notifications about the same item
// are added as comments on that task. Idempotent: every HubSpot message id is
// recorded in monday_sync_messages and never processed twice.
// Triggered by pg_cron (see migration 20261005120000_monday_email_sync.sql).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HUBSPOT_API = 'https://api.hubapi.com/conversations/v3/conversations';
const MONDAY_SENDER = 'notifications@monday.com';
// Re-scan this far behind the last successful run; message-id dedup makes overlap free.
const OVERLAP_MS = 2 * 60 * 60 * 1000;

type Route = {
  id: string;
  project_id: string;
  label: string;
  match_terms: string[];
  owner_auth_user_id: string;
  default_assignee_id: string | null;
  default_status: string;
};

const decodeEntities = (s: string) =>
  s.replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[​-‍﻿]/g, '');

const stripHtml = (s: string) =>
  decodeEntities(s.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, ''));

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const normalizeKey = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

// Pull the Monday item name out of the notification's first line / subject.
function parseItemName(headline: string, subject: string): string | null {
  const patterns = [
    /\bon an update on (.+?):?\s*$/i,          // "X mentioned you on an update on <item>:"
    /\breplied to (?:an|your) update on (.+?):?\s*$/i,
    /\bassigned (?:you|your team .+?) to (.+?)(?: on board .+)?:?\s*$/i,
    /\bon (?:the item|item) (.+?):?\s*$/i,
  ];
  for (const source of [headline, subject]) {
    if (!source) continue;
    for (const re of patterns) {
      const m = source.match(re);
      if (m?.[1]) return m[1].trim();
    }
  }
  return subject ? subject.trim() : null;
}

async function hubspot(path: string, token: string) {
  const res = await fetch(`${HUBSPOT_API}${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`HubSpot ${res.status} on ${path}: ${await res.text()}`);
  return res.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const runStartedAt = new Date();
  const summary = { threads: 0, mondayMessages: 0, tasksCreated: 0, commentsAdded: 0, unrouted: 0, skipped: 0, errors: 0 };

  try {
    const token = Deno.env.get('HUBSPOT_MONDAY_SYNC_TOKEN');
    if (!token) throw new Error('HUBSPOT_MONDAY_SYNC_TOKEN secret is not set');
    const inboxId = Deno.env.get('MONDAY_SYNC_HUBSPOT_INBOX_ID') ?? '1851455790'; // Jordan SR Pro

    const { data: state } = await supabase.from('monday_sync_state').select('cursor_ts').eq('id', 1).single();
    const cursor = new Date(state?.cursor_ts ?? Date.now() - 24 * 60 * 60 * 1000);
    const since = new Date(cursor.getTime() - OVERLAP_MS).toISOString();

    const { data: routes, error: routesError } = await supabase
      .from('monday_sync_routes').select('*').eq('active', true);
    if (routesError) throw routesError;

    // Collect threads touched since the cursor.
    const threads: any[] = [];
    let after: string | undefined;
    do {
      const qs = new URLSearchParams({
        inboxId,
        sort: 'latestMessageTimestamp',
        latestMessageTimestampAfter: since,
        limit: '100',
      });
      if (after) qs.set('after', after);
      const page = await hubspot(`/threads?${qs}`, token);
      threads.push(...(page.results ?? []));
      after = page.paging?.next?.after;
    } while (after);
    summary.threads = threads.length;

    for (const thread of threads) {
      const msgs = await hubspot(`/threads/${thread.id}/messages?limit=100`, token);
      const mondayMsgs = (msgs.results ?? [])
        .filter((m: any) => m.type === 'MESSAGE' && new Date(m.createdAt).toISOString() >= since)
        .filter((m: any) => (m.senders ?? []).some(
          (s: any) => s.deliveryIdentifier?.value?.toLowerCase() === MONDAY_SENDER))
        .sort((a: any, b: any) => a.createdAt.localeCompare(b.createdAt));

      for (const m of mondayMsgs) {
        summary.mondayMessages++;
        const { data: seen } = await supabase
          .from('monday_sync_messages').select('hubspot_message_id').eq('hubspot_message_id', m.id).maybeSingle();
        if (seen) continue;

        try {
          const result = await processMessage(supabase, routes as Route[], thread.id, m);
          summary[result]++;
        } catch (err) {
          summary.errors++;
          console.error(`monday-email-sync: message ${m.id} failed`, err);
          // Not recorded as processed, so it is retried on the next run.
        }
      }
    }

    // Only advance the cursor when every message was handled.
    const update: Record<string, unknown> = { last_run_at: runStartedAt.toISOString(), last_result: summary };
    if (summary.errors === 0) update.cursor_ts = runStartedAt.toISOString();
    await supabase.from('monday_sync_state').update(update).eq('id', 1);

    return new Response(JSON.stringify(summary), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('monday-email-sync failed:', error);
    await supabase.from('monday_sync_state')
      .update({ last_run_at: runStartedAt.toISOString(), last_result: { ...summary, fatal: String(error) } })
      .eq('id', 1);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processMessage(
  supabase: any,
  routes: Route[],
  threadId: string,
  m: any,
): Promise<'tasksCreated' | 'commentsAdded' | 'unrouted' | 'skipped'> {
  const subject = decodeEntities(m.subject ?? '');
  const rawText = m.text ? decodeEntities(m.text) : stripHtml(m.richText ?? '');
  const lines = rawText.split('\n').map((l: string) => l.trim());
  const headline = lines.find((l: string) => l.length > 0) ?? '';

  const record = (status: string, detail: string, itemId: string | null = null) =>
    supabase.from('monday_sync_messages').insert({
      hubspot_message_id: m.id, hubspot_thread_id: threadId, status, detail, item_id: itemId,
    });

  // Route to a client by matching terms anywhere in the email.
  const haystack = [subject, rawText, m.richText ?? '', ...(m.senders ?? []).map((s: any) => s.name ?? '')]
    .join('\n').toLowerCase();
  const matched = routes.filter((r) => r.match_terms.some((t) => haystack.includes(t.toLowerCase())));
  if (matched.length !== 1) {
    await record('unrouted', matched.length ? `ambiguous: ${matched.map((r) => r.label).join(', ')}` : headline.slice(0, 300));
    return 'unrouted';
  }
  const route = matched[0];

  const itemName = parseItemName(headline, subject);
  if (!itemName) {
    await record('skipped', 'could not determine Monday item name');
    return 'skipped';
  }

  const pulseId = (haystack.match(/\/pulses\/(\d+)/) ?? [])[1] ?? null;
  const directUrl = (rawText.match(/https:\/\/[a-z0-9-]+\.monday\.com\/boards\/\S+/i) ?? [])[0]
    ?? (rawText.match(/View update on the pulse\s+(\S+)/i) ?? [])[1]
    ?? null;
  const mondayUrl = directUrl?.replace(/[&?]utm_term=\S*$/, '') ?? null;

  // Update body: everything after the headline, up to Monday's footer.
  const bodyLines = lines.slice(lines.indexOf(headline) + 1);
  const footerAt = bodyLines.findIndex((l: string) => /^View update on the pulse/i.test(l));
  const body = (footerAt >= 0 ? bodyLines.slice(0, footerAt) : bodyLines).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  const when = new Date(m.createdAt).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

  // Find an existing link: by Monday pulse id first, then by item name.
  const itemKey = normalizeKey(itemName);
  let existing = null;
  if (pulseId) {
    const { data } = await supabase.from('monday_sync_items').select('*')
      .eq('route_id', route.id).eq('monday_pulse_id', pulseId).maybeSingle();
    existing = data;
  }
  if (!existing) {
    const { data } = await supabase.from('monday_sync_items').select('*')
      .eq('route_id', route.id).eq('item_key', itemKey).maybeSingle();
    existing = data;
  }

  if (existing) {
    if (!existing.task_id) {
      await record('skipped', 'linked task was deleted', existing.id);
      return 'skipped';
    }
    const content = `<p><strong>Monday update</strong> (${escapeHtml(when)}) — ${escapeHtml(headline)}</p>`
      + (body ? `<p>${escapeHtml(body).replace(/\n/g, '<br>')}</p>` : '')
      + (mondayUrl ? `<p><a href="${escapeHtml(mondayUrl)}">Open in Monday</a></p>` : '');
    const { error } = await supabase.from('comments').insert({
      task_id: existing.task_id,
      auth_user_id: route.owner_auth_user_id,
      user_id: route.owner_auth_user_id,
      content,
    });
    if (error) throw error;
    if (pulseId && !existing.monday_pulse_id) {
      await supabase.from('monday_sync_items').update({ monday_pulse_id: pulseId }).eq('id', existing.id);
    }
    await record('comment_added', itemName, existing.id);
    return 'commentsAdded';
  }

  const { data: project } = await supabase.from('projects').select('organization_id').eq('id', route.project_id).single();
  const description = [
    `Created from Monday.com (${route.label})`,
    '',
    `${headline} — ${when}`,
    body ? `\n${body}` : '',
    mondayUrl ? `\nMonday item: ${mondayUrl}` : '',
  ].join('\n').trim();

  const { data: task, error: taskError } = await supabase.from('tasks').insert({
    auth_user_id: route.owner_auth_user_id,
    project_id: route.project_id,
    organization_id: project?.organization_id ?? null,
    title: itemName.slice(0, 250),
    description,
    status: route.default_status,
    priority: 'medium',
    assignee_id: route.default_assignee_id,
  }).select('id').single();
  if (taskError) throw taskError;

  const { data: item, error: itemError } = await supabase.from('monday_sync_items').insert({
    route_id: route.id,
    item_key: itemKey,
    item_name: itemName,
    monday_pulse_id: pulseId,
    monday_url: mondayUrl,
    task_id: task.id,
  }).select('id').single();
  if (itemError) throw itemError;

  await record('task_created', itemName, item.id);
  return 'tasksCreated';
}
