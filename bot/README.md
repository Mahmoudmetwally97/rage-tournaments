# RAGE results bot

Reads result screenshots posted in linked Discord channels, stores them as PENDING on the site, and waits for an organizer to approve. Nothing is auto-approved.

Flow: screenshot -> `POST /api/bot/ingest` (vision + matching) -> embed with Approve / Reject buttons.
Approve = button, or a ✅ reaction on the screenshot or on the bot's embed, by a Discord user listed as approver (`BOT_OWNER_DISCORD_ID` on the site, or rows in `bot_approvers`).

Commands (approvers only): `/rage link tournament:<slug> [room]` links the current channel. `/rage help`.

Discord app settings: enable **Message Content Intent**. Invite permissions: View Channels, Send Messages, Embed Links, Add Reactions, Read Message History.

Run: `npm install && npm run build && npm start` or the Dockerfile (Railway / Fly / Render).
