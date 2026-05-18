# GoInvo Chatbot Service

The site chat now stores visitor conversations in Sanity as `chatThread` documents and can mirror them into a Slack channel.

## Runtime Flow

1. The global `ChatWidget` creates a visitor thread through `POST /api/chat/threads`.
2. The API writes a `chatThread` document in Sanity and posts the first message to Slack.
3. Visitor replies call `POST /api/chat/threads/[threadId]`, append to Sanity, and post into the Slack thread.
4. If the first visitor message waits too long without a real teammate reply, `GET /api/chat/threads/[threadId]` appends one no-response fallback message for the visitor.
5. Teammate replies in the Slack thread are received by `POST /api/slack/events`, appended to Sanity, and shown to the visitor on the next widget poll.
6. Slack's "Mark resolved" button calls `POST /api/slack/interactions` and updates the Sanity status.

## Required Environment Variables

```bash
SANITY_WRITE_TOKEN=...
CHAT_WIDGET_ENABLED=true
CHAT_WIDGET_ALLOWED_HOSTS=goinvo.com,www.goinvo.com,localhost,127.0.0.1
CHAT_IP_HASH_SALT=...
NEXT_PUBLIC_SITE_URL=https://www.goinvo.com

RESEND_API_KEY=re_...
CHAT_NO_RESPONSE_EMAIL_ENABLED=true
CHAT_NO_RESPONSE_EMAIL_FROM="GoInvo <hello@goinvo.com>"
CHAT_NO_RESPONSE_EMAIL_REPLY_TO=hello@goinvo.com

SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_CHAT_CHANNEL_ID=C...
CHAT_SLACK_DEDICATED_CHANNELS=true
CHAT_SLACK_CHANNEL_PING=<!here>
```

Slack posting is optional. Without Slack variables, the widget still stores threads in Sanity.

The production Slack channel is `#website-chatbot` (`C0B5EC9LGFJ`).

## Slack App Setup

Create the app from [slack/website-chatbot.manifest.json](slack/website-chatbot.manifest.json). The manifest configures:

```text
Events API:       https://www.goinvo.com/api/slack/events
Interactivity:    https://www.goinvo.com/api/slack/interactions
OAuth redirect:   http://localhost:3000/api/slack/oauth
OAuth redirect:   https://www.goinvo.com/api/slack/oauth
Bot events:        message.channels
Bot scopes:        chat:write, channels:history, channels:write, files:write, users:read
```

After installing the app to the GoInvo workspace:

1. Copy the Bot User OAuth Token into `SLACK_BOT_TOKEN`.
2. Copy the app Signing Secret into `SLACK_SIGNING_SECRET`.
3. Set `SLACK_CHAT_CHANNEL_ID=C0B5EC9LGFJ`.
4. Invite the bot to `#website-chatbot`.
5. Redeploy the website so Vercel has the new environment variables.

I verified from Codex on May 18, 2026 that `#website-chatbot` exists as public channel `C0B5EC9LGFJ`.

## Slack CLI on Windows

If the Windows installer reports that a different `slack` command already exists, install Slack's CLI under an alias:

```powershell
Invoke-WebRequest -Uri https://downloads.slack-edge.com/slack-cli/install-windows.ps1 -OutFile 'install-windows.ps1'
.\install-windows.ps1 -Alias slackcli
slackcli version
slackcli login
```

Slack's Windows installer does not pass flags through the piped `irm ... | iex` form, so the installer must be downloaded first when using `-Alias`.

Slack event and interaction mutations are verified with the app signing secret. The Events API URL-verification challenge is answered without writing data so the app can be created before the signing secret is present in Vercel.

Each new website chat creates a dedicated public Slack channel named like `#website-chat-{visitor}-{id}` when `CHAT_SLACK_DEDICATED_CHANNELS` is not `false`. The hub channel `#website-chatbot` receives a ping and a link to that conversation channel. If channel creation fails because the bot is missing `channels:write` or workspace policy blocks channel creation, the app falls back to a threaded message in `#website-chatbot`.

Teammate replies made in the dedicated conversation channel, either as top-level messages or thread replies, are pushed to `/api/slack/events`, appended to the Sanity `chatThread`, and shown in the website widget on the next poll. Visitor follow-up messages are posted back into the dedicated Slack channel. In fallback mode, Slack replies should be made in the thread created by the bot, and visitor follow-up messages are posted back into that same Slack thread.

Visitor messages can include one attachment up to 4 MB. Supported types are common images (`jpg`, `png`, `gif`, `webp`), small videos (`mp4`, `webm`, `mov`), PDFs, and plain text/CSV files. Attachments are sent to Slack with `files.getUploadURLExternal` and `files.completeUploadExternal`, so the Slack app must have the `files:write` bot scope and be reinstalled after adding that scope.

If attachments show `Upload failed`, check the server logs and the attachment error field in Sanity. A common cause is an old bot token that was issued before `files:write` was added. In that case, Slack returns `missing_scope` with `needed: files:write`; reinstall the Slack app, then update `SLACK_BOT_TOKEN` locally and in Vercel with the new Bot User OAuth Token.

## No-Response Fallback

The fallback copy and delay live in `siteConfig.chat.noResponse`. After 60 seconds without a non-fallback team reply, the next visitor poll appends exactly one GoInvo team message. If the visitor has not shared contact details, it asks for name and email; if a name exists but email is unknown, it asks for email only. The reply API extracts explicit names and email addresses from that follow-up and stores them on the Sanity thread.

When an email address is available and `RESEND_API_KEY` is configured, the same no-response backup sends one follow-up email from `CHAT_NO_RESPONSE_EMAIL_FROM` with `CHAT_NO_RESPONSE_EMAIL_REPLY_TO` set to `hello@goinvo.com` by default. The Sanity thread stores `noResponseEmailAttemptedAt`, `noResponseEmailSentAt`, and the Resend provider ID so polling cannot send duplicate follow-ups.

## OAuth Setup Helper

The route `/api/slack/oauth` exists only to make first-time setup easier. It is disabled unless `SLACK_OAUTH_SETUP_ENABLED=true` and the incoming `state` matches `SLACK_OAUTH_SETUP_STATE`. Use it locally to exchange Slack's install code for a bot token, copy the generated env values, then turn it off again.
