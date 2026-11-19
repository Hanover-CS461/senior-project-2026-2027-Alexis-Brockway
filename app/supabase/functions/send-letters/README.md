# send-letters

The Edge Function that emails a writer. It drains `public.email_outbox` and
posts each queued letter to Resend.

Added for **issue #8, phase 1** (Nov 20, 2026).

## What gets emailed, and what does not

| Moment | Letter | Queued by |
|---|---|---|
| The form is submitted | a receipt | a trigger on `authors` |
| An editor records **Accepted** | an acceptance | the decision buttons |
| An editor records **Rejected** | a rejection | the decision buttons |
| An editor records **Hold** | **nothing** | — |

Hold sends nothing, and that is a database rule: `email_outbox.kind` will not
accept `'hold'`. Internal moves (In review, Shortlist) never email anyone.

Recording a decision is one act; sending the letter is another. That is why
an undo can still withdraw a letter that has not gone out.

## Before you deploy: the DNS question

Resend will only deliver from a domain you have verified with SPF and DKIM
records. `kenningsliteraryjournal.com` belongs to the club, so **until they
grant DNS access, send from Resend's test sender.** It can only deliver to
the address that owns the Resend account — which is exactly what makes it
safe to test with real letters.

## Setup

```bash
# 1. One secret pair. Never in app/.env — the browser must not have these.
supabase secrets set RESEND_API_KEY=re_xxxxxxxx
supabase secrets set FROM_EMAIL=onboarding@resend.dev   # until DNS is sorted

# 2. Deploy. verify_jwt stays TRUE (see ../config.toml): the caller's own
#    token is what lets the function ask Postgres `is_editor()`.
supabase functions deploy send-letters
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are
provided to the function by the platform. Do not set them yourself.

## Proving it works without mailing anyone

The function takes `{"dryRun": true}` — it renders every queued letter and
writes nothing. This is the safe way to check the wording:

```bash
curl -s "$SUPABASE_URL/functions/v1/send-letters" \
  -H "Authorization: Bearer $EDITOR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}' | jq .
```

Then one real send, to your own inbox only:

```bash
curl -s "$SUPABASE_URL/functions/v1/send-letters" \
  -H "Authorization: Bearer $EDITOR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | jq .
```

A receipt queued more than 30 days ago is marked `skipped` rather than sent —
that is a seed re-paste or a restored dump, not a writer waiting for word.
Decision letters are exempt: a writer can legitimately wait months.

## The gate

The function never trusts itself. Before the service-role client exists, it
calls `is_editor()` **with the caller's token**, so the same database
function that guards every editor action decides who may send. A reader who
calls the endpoint directly gets a 403 from Postgres.

## Why the app cannot send on its own

`email_outbox` has no UPDATE policy. Only this function, with the service
role, can mark a row `sent`. The browser can queue and withdraw; it cannot
pretend a letter went out.

## Turning it on for real

1. Add Resend's SPF/DKIM records to the club's DNS and verify the domain.
2. `supabase secrets set FROM_EMAIL=letters@kenningsliteraryjournal.com`
3. Send one letter to a real inbox and confirm it is not in spam.
4. Update `AGENTS.md` §8 #8 and `docs/handoff.md`.
