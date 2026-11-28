import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, EmbedBuilder, Events, GatewayIntentBits, Partials,
  REST, Routes, SlashCommandBuilder, type Message, type MessageReaction, type PartialMessageReaction, type PartialUser, type User
} from 'discord.js';

const TOKEN = need('DISCORD_BOT_TOKEN');
const APP_ID = need('DISCORD_APP_ID');
const API = need('RAGE_API_URL').replace(/\/$/, '');
const SECRET = need('BOT_SHARED_SECRET');

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
      .addStringOption((o) => o.setName('tournament').setDescription('Tournament slug').setRequired(true))
      .addStringOption((o) => o.setName('room').setDescription('Optional fixed room, e.g. Room 2')))
    .addSubcommand((s) => s.setName('help').setDescription('How the bot works'));
  await new REST().setToken(TOKEN).put(Routes.applicationCommands(APP_ID), { body: [cmd.toJSON()] });
  console.log(`RAGE results bot ready as ${c.user.tag}`);
});

client.login(TOKEN);
