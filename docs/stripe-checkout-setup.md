# Stripe Checkout setup

The storefront is ready to use Stripe-hosted Checkout. It stays on the email order fallback until
all required server-side credentials are configured. Visitors can also use the persistent
“Pay what you want” action without selecting a print.

Checkout Sessions explicitly disable Stripe Managed Payments because the storefront sells physical
prints, which aren't eligible for Stripe's merchant-of-record product.

## Test-mode environment

Add these values to the local development environment and the Vercel Preview environment:

```text
STRIPE_SEC_KEY=sk_test_...
STRIPE_PUB_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CHECKOUT_ENABLED=true
STRIPE_LIVE_MODE_ENABLED=false
STRIPE_AUTOMATIC_TAX_ENABLED=false
STRIPE_PROMOTIONS_CONSENT_ENABLED=false
```

`STRIPE_SEC_KEY` is the server secret used by this storefront. The conventional
`STRIPE_SECRET_KEY` name is also supported. `STRIPE_PUB_KEY` is reserved for a future
browser-side Stripe integration and isn't required by the current Stripe-hosted Checkout flow.
Never expose the secret or webhook key through a `NEXT_PUBLIC_` variable.

Keep `STRIPE_PROMOTIONS_CONSENT_ENABLED=false` until the Stripe Checkout marketing terms have been
accepted in the Stripe Dashboard. When it is off, shop contacts are still created after payment,
but their promotional-consent status is recorded as not collected.

`SANITY_WRITE_TOKEN`, `NEXT_PUBLIC_SANITY_PROJECT_ID`, and
`NEXT_PUBLIC_SANITY_DATASET` must also be available. Checkout remains disabled if Stripe can take a
payment but the webhook cannot create the corresponding CMS order.

## Slack purchase notifications

Paid orders can alert the team through the same Slack bot used by website chat. The bot needs
`chat:write` access and must be a member of the destination channel.

```text
SLACK_BOT_TOKEN=xoxb-...
SLACK_SHOP_CHANNEL_ID=C...
```

`SLACK_SHOP_CHANNEL_ID` is optional. When it is not set, purchase alerts use
`SLACK_CHAT_CHANNEL_ID`, then `SLACK_CHANNEL_ID`. `SHOP_STUDIO_BASE_URL` can optionally point the
alert's “Open order in CMS” button at a particular deployment.

Each Stripe Session produces a deterministic Slack message ID. Webhook retries therefore retry a
failed alert without posting duplicate purchase messages.

## Stripe webhook

Create a Stripe webhook endpoint for:

```text
https://YOUR_HOST/api/shop/stripe/webhook
```

Subscribe it to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `charge.refunded`
- `refund.updated`
- `refund.failed`
- `charge.dispute.created`
- `charge.dispute.updated`
- `charge.dispute.closed`
- `charge.dispute.funds_withdrawn`
- `charge.dispute.funds_reinstated`

**The refund and dispute events must be subscribed explicitly.** Without them the endpoint
still returns 200 and nothing breaks visibly — refunds silently never correct the ledger and
disputes are never seen at all, which is how an evidence deadline gets missed.

Use the endpoint signing secret as `STRIPE_WEBHOOK_SECRET`.

If the deployment uses a **restricted** key (`rk_…`) rather than a standard one, it needs
*Charges: read*, *Refunds: read*, *Payment intents: read*, *Checkout sessions: read*, and
**Disputes: write** — the write permission is what allows submitting evidence when a real
chargeback lands.

In Marketing CMS → Shop → Payments & settings, set:

- Payment processor: Stripe
- Connection status: Test mode
- Webhook status: Configured
- Contact sync: on, if paid customers should be linked to Outreach

For local testing, use the Stripe CLI:

```text
stripe listen --forward-to localhost:3000/api/shop/stripe/webhook
```

Use the `whsec_...` value printed by the CLI in the local environment.

## Syncing the product catalog

Sanity is the source of truth for storefront products. Preview a bulk sync of every Health
Visualization into Shop Products and reusable Stripe Products and Prices:

```text
npm run shop:sync-stripe
```

Apply the sync to the configured Stripe sandbox and Sanity dataset:

```text
npm run shop:sync-stripe -- --write
```

The command is idempotent. Missing Shop Product documents are created from Health Visualizations;
existing Shop Product descriptions, prices, inventory settings, and other overrides are preserved.
Stripe IDs and the last-synced price snapshot are written back to Sanity. If a price changes, the
sync creates a new Stripe Price, makes it the product default, and archives the superseded managed
price.

Live-mode catalog writes require all three safeguards:

```text
STRIPE_LIVE_MODE_ENABLED=true
npm run shop:sync-stripe -- --write --live
```

Checkout reuses a synced Stripe Price only when its amount and currency match the current Sanity
product. This prevents stale Stripe pricing from overriding the CMS. The guided poster chatbot
remains available as a parallel path for bulk, expedited, international, or otherwise unusual
requests.

## What happens after payment

The webhook verifies Stripe's signature, retrieves the paid Checkout Session, and atomically creates
one `marketingOrder` document keyed to the Stripe Session ID. Replayed webhook events cannot create
duplicate orders. When contact sync is enabled in Shop Settings, the buyer is matched or added as a
Marketing contact and their promotional-consent state is recorded. If the Slack bot and a channel
are configured, the same webhook posts a purchase alert with the order number, customer, items,
total, and a link to the CMS order. Shipping addresses are intentionally omitted from Slack.

Print prices are always loaded from the server-side Sanity catalog. Prices sent from a browser are
ignored. Pay-what-you-want payments are recorded as support in the CMS and do not request a shipping
address unless the same Checkout Session includes a print.

## Live-mode safety

Live secret keys are rejected until:

```text
STRIPE_LIVE_MODE_ENABLED=true
```

Do not enable that flag until a test-mode purchase, webhook delivery, CMS order, confirmation page,
refund procedure, and fulfillment workflow have all been reviewed.

To intentionally expose test checkout on the production deployment, which is normally blocked, set:

```text
STRIPE_TEST_MODE_ON_PRODUCTION=true
```

This should only be used for a short, coordinated test.

Enable `STRIPE_AUTOMATIC_TAX_ENABLED=true` only after Stripe Tax registrations and product tax
settings have been reviewed.

## Refunds and disputes

Money that comes back after a sale is handled by re-deriving the order's ledger from live Stripe
state rather than by accumulating events, so a redelivered or out-of-order webhook always produces
the same answer.

- **Refunds** (full or partial) update `settlementState`, `amountRefunded`, and `netCollected` on
  the order, and post a Slack alert saying whether it is still shippable.
- **Disputes** create a `marketingDispute` record in the private outreach dataset plus a dedicated
  Slack channel named `shop-dispute-<dispute id>`. The card in that channel shows the amount, the
  reason, whether funds are actually held (a chargeback) or not (an inquiry), and the hard evidence
  deadline.
- **Replying:** anything typed in the dispute channel is stored as a note on the dispute. Nothing is
  ever sent automatically. Reaching the customer is a `mailto:` button that opens your own mail
  client; reaching Stripe is the **Submit evidence to Stripe** button, behind a confirmation, because
  Stripe normally accepts one submission and it cannot be retracted.
- **Backstop:** a daily cron (`/api/shop/disputes/reconcile`, 13:00 UTC, in `vercel.json`) lists
  recent disputes directly from Stripe and re-reconciles recent orders. Discovery therefore does not
  depend on the webhook — a dropped delivery costs a day of latency, not a deadline. It authenticates
  with `CRON_SECRET` or `MARKETING_API_KEY`.

Set `SHOP_DISPUTE_CHANNELS_ENABLED=false` to keep everything in the main shop channel instead of
creating a channel per dispute.

Orders carry a `settlementState` that is worker-owned and read-only; `status` remains the human
fulfilment lifecycle. They never contend, so marking an order fulfilled cannot be undone by a
dispute update, and a dispute cannot be hidden by someone editing the status.
