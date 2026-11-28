import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, EmbedBuilder, Events, GatewayIntentBits, Partials,
  REST, Routes, SlashCommandBuilder, type Message, type MessageReaction, type PartialMessageReaction, type PartialUser, type User
} from 'discord.js';

const TOKEN = need('DISCORD_BOT_TOKEN');
const APP_ID = need('DISCORD_APP_ID');
const API = need('RAGE_API_URL').replace(/\/$/, '');
const SECRET = need('BOT_SHARED_SECRET');


function noticeMessage(c: any, label?: string) {
  const open = c.kind === 'checkin_open';
  const line = (ar: string, en: string) => `\u200F${ar}\n\n${en}`;
  const e = new EmbedBuilder()
    .setColor(open ? 0x22c55e : 0xef4444)
    .setTitle(c.titleAr)
    .setDescription(`\u200F${c.bodyAr}\n\n**${c.titleEn}**\n${c.bodyEn}`)
    .addFields({ name: '🏆', value: `**${c.tournament}**` });
  if (c.teamName) e.addFields({ name: '👥', value: `**${c.teamName}**` });
  if (open && c.time) e.addFields({ name: '⏰ Closes (Cairo) · يقفل', value: `**${c.time}**` });
  e.setFooter({ text: label ? `TEST sample, ${label}` : 'RAGE Tournaments' });
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(c.url).setLabel(`${c.buttonAr} | ${c.buttonEn}`)
  );
  void line;
  return { embeds: [e], components: [row] };
}

function need(k: string): string {
  const v = process.env[k];
  if (!v) { console.error(`Missing env ${k}`); process.exit(1); }
  return v;
}

async function api<T = any>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}/api/bot/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${SECRET}` },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return (await res.json()) as T;
}

const IMG = /\.(png|jpe?g|webp)(\?|$)/i;
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.MessageContent],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// Channels we already know are unlinked, so we do not hit the API for every image elsewhere.
const unlinked = new Map<string, number>();

function isImage(a: { url: string; contentType?: string | null; name?: string | null }) {
  return (a.contentType ?? '').startsWith('image/') || IMG.test(a.name ?? a.url);
}

function bar(c: number) {
  const n = Math.round(c * 10);
  return '▰'.repeat(n) + '▱'.repeat(10 - n);
}

function buildEmbed(sub: any, state: 'pending' | 'approved' | 'rejected' = 'pending') {
  const s = sub.summary;
  const color = state === 'approved' ? 0x3ddc84 : state === 'rejected' ? 0xff5d5d : sub.confidence >= 0.85 ? 0xe5ed43 : 0xffb36b;
  const lines = s.rows.map((r: any) => {
    const same = r.registered_as && r.registered_as.toLowerCase() === r.name.toLowerCase();
    const who = r.registered_as ? (same ? r.registered_as : `${r.registered_as} (read: ${r.name})`) : `❓ ${r.name}`;
    return `\`${String(r.rank ?? '?').padStart(2)}\` ${who} — ${r.kills ?? '?'} K`;
  });
  const issues = (sub.issues ?? []).map((i: string) => i.replace(/:/g, ': ').replace(/\|/g, ', '));
  const e = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${s.tournament} · ${s.stage}${s.room ? ` · ${s.room}` : ''}${s.round ? ` · R${s.round}` : ''}`)
    .setDescription(lines.join('\n').slice(0, 3800))
    .addFields({ name: 'Confidence', value: `${bar(sub.confidence)} ${Math.round(sub.confidence * 100)}%`, inline: true })
    .setFooter({ text: state === 'pending' ? 'Pending — nothing is updated until an organizer approves' : state === 'approved' ? 'Approved — standings updated' : 'Rejected' });
  if (issues.length) e.addFields({ name: 'Check', value: issues.join('\n').slice(0, 1000) });
  return e;
}

function lobbyEmbed(l: any) {
  const flags = (l.flags ?? []).map((f: string) => f.replace(/_/g, ' ').replace(/:/g, ': ').replace(/\|/g, ', '));
  const e = new EmbedBuilder()
    .setColor(flags.length ? 0xffb36b : 0x3ddc84)
    .setTitle(`📋 Room start proof · ${l.tournament}`)
    .addFields(
      { name: 'Room', value: l.room_label ? `${l.room_label}${l.group_name ? ` (${l.group_name})` : ''}` : 'not visible', inline: true },
      { name: 'Mode', value: l.mode ?? 'not visible', inline: true },
      { name: 'Map', value: l.map ?? 'not visible', inline: true },
      { name: 'Players', value: `${l.matched}/${l.total} names match registered players${l.unmatched?.length ? `\nNot matched: ${l.unmatched.join(', ')}` : ''}`.slice(0, 1000) }
    )
    .setFooter({ text: 'Evidence only. It is checked against the results screenshot and never approves anything.' });
  if (flags.length) e.addFields({ name: 'Check', value: flags.join('\n').slice(0, 1000) });
  return e;
}

function buttons(id: string, enabled: boolean) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`approve:${id}`).setLabel('Approve').setStyle(ButtonStyle.Success).setDisabled(!enabled),
    new ButtonBuilder().setCustomId(`reject:${id}`).setLabel('Reject').setStyle(ButtonStyle.Danger)
  );
}

client.on(Events.MessageCreate, async (msg: Message) => {
  try {
    if (msg.author.bot || !msg.guildId) return;
    const imgs = [...msg.attachments.values()].filter(isImage);
    if (!imgs.length) return;
    const t = unlinked.get(msg.channelId);
    if (t && Date.now() - t < 5 * 60_000) return;
    for (const a of imgs.slice(0, 3)) {
      const r = await api('ingest', { channelId: msg.channelId, guildId: msg.guildId, messageId: msg.id, imageUrl: a.url, authorDiscordId: msg.author.id });
      if (r.outcome === 'unlinked') { unlinked.set(msg.channelId, Date.now()); return; }
      unlinked.delete(msg.channelId);
      if (r.outcome === 'pending') {
        await msg.react('⏳').catch(() => {});
        const sent = await msg.reply({
          embeds: [buildEmbed(r)],
          components: [buttons(r.submission_id, Boolean(r.summary?.room))],
          allowedMentions: { repliedUser: false }
        });
        await api('attach', { submissionId: r.submission_id, botMessageId: sent.id });
      } else if (r.outcome === 'lobby') {
        await msg.react('📋').catch(() => {});
        await msg.reply({ embeds: [lobbyEmbed(r.lobby)], allowedMentions: { repliedUser: false } });
      } else if (r.outcome === 'unreadable') {
        await msg.react('❌').catch(() => {});
        await msg.reply({ content: 'Could not read results from this screenshot. Send a clearer, full-screen one.', allowedMentions: { repliedUser: false } });
      } else if (r.outcome === 'not_live') {
        await msg.react('💤').catch(() => {});
      } else if (r.outcome === 'duplicate') {
        await msg.react('♻️').catch(() => {});
      }
    }
  } catch (e) {
    console.error('messageCreate', e);
  }
});

client.on(Events.InteractionCreate, async (i) => {
  if (i.isAutocomplete()) {
    try {
      const r = await api<{ items?: { slug: string; title_en: string; status: string }[] }>('link', { discordUserId: i.user.id, search: i.options.getFocused() });
      await i.respond((r.items ?? []).slice(0, 25).map((t) => ({ name: `${t.title_en} (${t.status})`.slice(0, 100), value: t.slug.slice(0, 100) })));
    } catch { await i.respond([]).catch(() => {}); }
    return;
  }
  try {
    if (i.isButton()) {
      const [decision, id] = i.customId.split(':') as ['approve' | 'reject', string];
      const r = await api('decide', { submissionId: id, discordUserId: i.user.id, decision });
      if (!r.ok) {
        await i.reply({ content: r.error === 'NOT_APPROVER' ? 'Only the organizer can approve results.' : `Failed: ${r.error}`, ephemeral: true });
        return;
      }
      const old = i.message.embeds[0];
      const e = EmbedBuilder.from(old!).setColor(decision === 'approve' ? 0x3ddc84 : 0xff5d5d)
        .setFooter({ text: decision === 'approve' ? `Approved by ${i.user.username} — standings updated` : `Rejected by ${i.user.username}` });
      await i.update({ embeds: [e], components: [] });
      const ref = i.message.reference?.messageId;
      if (ref) { const orig = await i.channel?.messages.fetch(ref).catch(() => null); await orig?.react(decision === 'approve' ? '✅' : '🚫').catch(() => {}); }
      return;
    }
    if (i.isChatInputCommand() && i.commandName === 'rage') {
      const sub = i.options.getSubcommand();
      if (sub === 'help') {
        await i.reply({ content: 'Post a results screenshot in a linked channel. I read it and ask an organizer to approve. `/rage link tournament:<slug>` links this channel.', ephemeral: true });
        return;
      }
      if (sub === 'testnotify') {
        await i.deferReply({ ephemeral: true });
        const r = await api('notify', { preview: { discordUserId: i.user.id } });
        if (!r.ok) { await i.editReply(r.error === 'NOT_APPROVER' ? 'Owner only.' : `Failed: ${r.error}`); return; }
        let dmOk = true;
        for (const smp of r.samples as { label: string; text: string }[]) {
          await i.user.send(noticeMessage((smp as any).card, smp.label)).catch(() => { dmOk = false; });
        }
        // What the organizer sees in the channel for someone who could not be DMed (invented names, test only).
        await (i.channel as any)?.send('⚠️ **TEST - Registration trial**: could not DM (check-in is open):\n• ExamplePlayer (no Discord linked)\n• Team Rage (CaptainName)').catch(() => {});
        await i.editReply(dmOk ? 'Sent you 4 sample DMs and a sample channel list. Samples only, nobody else got anything.' : 'Could not DM you. Check that DMs from server members are allowed, then retry.');
        return;
      }
      if (sub === 'link') {
        const r = await api('link', {
          discordUserId: i.user.id, guildId: i.guildId, channelId: i.channelId,
          tournamentSlug: i.options.getString('tournament', true), roomHint: i.options.getString('room') ?? undefined
        });
        unlinked.delete(i.channelId);
        await i.reply({ content: r.ok ? `Linked this channel to **${r.tournament}** (${r.status}).` : r.error === 'NOT_APPROVER' ? 'Only organizers can link channels.' : `Failed: ${r.error}`, ephemeral: true });
      }
    }
  } catch (e) {
    console.error('interaction', e);
    if (i.isRepliable() && !i.replied && !i.deferred) await i.reply({ content: 'Something went wrong.', ephemeral: true }).catch(() => {});
  }
});

// ✅ reaction by an organizer on the screenshot or on the bot's embed approves; 🚫 rejects.
client.on(Events.MessageReactionAdd, async (r: MessageReaction | PartialMessageReaction, u: User | PartialUser) => {
  try {
    if (u.bot) return;
    const emoji = r.emoji.name;
    if (emoji !== '✅' && emoji !== '🚫') return;
    const res = await api('decide', {
      channelId: r.message.channelId, messageId: r.message.id, discordUserId: u.id, decision: emoji === '✅' ? 'approve' : 'reject'
    });
    if (res.ok) {
      const m = await r.message.fetch().catch(() => null);
      await m?.react(emoji === '✅' ? '✅' : '🚫').catch(() => {});
    }
  } catch (e) {
    console.error('reaction', e);
  }
});

client.once(Events.ClientReady, async (c) => {
  const cmd = new SlashCommandBuilder().setName('rage').setDescription('RAGE results bot')
    .addSubcommand((s) => s.setName('link').setDescription('Link this channel to a tournament')
      .addStringOption((o) => o.setName('tournament').setDescription('Tournament name or slug (pick from the list)').setRequired(true).setAutocomplete(true))
      .addStringOption((o) => o.setName('room').setDescription('Optional fixed room, e.g. Room 2')))
    .addSubcommand((s) => s.setName('testnotify').setDescription('Send yourself sample check-in notices (owner only)'))
    .addSubcommand((s) => s.setName('help').setDescription('How the bot works'));
  await new REST().setToken(TOKEN).put(Routes.applicationCommands(APP_ID), { body: [cmd.toJSON()] });
  console.log(`RAGE results bot ready as ${c.user.tag}`);
});

// ---- Check-in notifications: DM each player/captain; list the ones we could not DM in the channel. ----
// Only tournaments named in NOTIFY_SLUGS (comma separated) are ever notified. Empty = off.
const NOTIFY_SLUGS = (process.env.NOTIFY_SLUGS ?? '').split(',').map((x) => x.trim()).filter(Boolean);
let notifying = false;

async function notifyTick() {
  if (notifying || !NOTIFY_SLUGS.length) return;
  notifying = true;
  try {
    const { notices } = await api<{ notices: any[] }>('notify', { slugs: NOTIFY_SLUGS });
    if (!notices?.length) return;
    const acks: any[] = [];
    const missed = new Map<string, { channelIds: string[]; tournament: string; kind: string; names: string[] }>();
    for (const n of notices) {
      let outcome = 'no_discord' as 'dm' | 'failed' | 'no_discord';
      if (n.discordUserId) {
        try {
          const u = await client.users.fetch(n.discordUserId);
          await u.send(noticeMessage(n.card));
          outcome = 'dm';
        } catch { outcome = 'failed'; }
      }
      acks.push({ tournamentId: n.tournamentId, kind: n.kind, registrationId: n.registrationId, outcome, userId: n.userId, slug: n.slug, tournament: n.tournament, teamName: n.teamName });
      if (outcome !== 'dm') {
        const k = `${n.tournamentId}|${n.kind}`;
        const m = missed.get(k) ?? { channelIds: n.channelIds as string[], tournament: n.tournament as string, kind: n.kind as string, names: [] as string[] };
        m.names.push(n.teamName ? `${n.teamName} (${n.username})` : n.username);
        missed.set(k, m);
      }
    }
    for (const m of missed.values()) {
      const ch = await client.channels.fetch(m.channelIds[0]).catch(() => null);
      if (ch && 'send' in ch) {
        const what = m.kind === 'checkin_open' ? 'check-in is open' : 'check-in closed, not checked in';
        await (ch as any).send(`⚠️ **${m.tournament}**: could not DM (${what}):\n${m.names.map((x) => `• ${x}`).join('\n').slice(0, 1800)}`).catch(() => null);
      }
    }
    await api('notify', { ack: acks });
    console.log(`notify: ${acks.length} notices, ${acks.filter((a) => a.outcome === 'dm').length} DMed`);
  } catch (e) {
    console.error('notify', e);
  } finally {
    notifying = false;
  }
}

client.once(Events.ClientReady, () => { setInterval(notifyTick, 60_000); });

client.login(TOKEN);
