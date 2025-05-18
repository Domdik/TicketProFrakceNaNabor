// Tento Discord bot vytvoří ticketový systém pro nábor do frakce na FiveM RP serveru
// Vyžaduje discord.js v14+ a vhodné nastavení bot tokenu a ID kanálů

const { Client, GatewayIntentBits, Partials, ChannelType, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, Events } = require('discord.js');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const TOKEN = 'TOKEN';
const GUILD_ID = 'Server ID';
const CATEGORY_ID = 'ID Kategorie';
const SUPPORT_ROLE_ID = 'Support Role ID';
const LOG_CHANNEL_ID = 'Roomka na Logy ID';
const START_CHANNEL_ID = 'Roomka kde se odešle při zapnutí bota zpráva ID';

client.once('ready', async () => {
  console.log(`Bot je připraven jako ${client.user.tag}`);

  const channel = await client.channels.fetch(START_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) return;

  const messages = await channel.messages.fetch({ limit: 5 });
  const alreadySent = messages.find(msg => msg.author.id === client.user.id && msg.components.length > 0);

  if (alreadySent) return;

  const embed = new EmbedBuilder()
    .setTitle('📋 Nábory do frakce Benny\'s (Mechanik)')
    .setDescription('Klikni na tlačítko níže pro vyplnění přihlášky na pozici Mechanik v Benny\'s.')
    .setColor('#ffa800');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('nabor_mechanik')
      .setLabel('📩 Přihlásit se jako Mechanik')
      .setStyle(ButtonStyle.Primary)
  );

  await channel.send({ embeds: [embed], components: [row] });
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isButton() && interaction.customId === 'nabor_mechanik') {
    const modal = new ModalBuilder()
      .setCustomId('form_mechanik')
      .setTitle('Přihláška – Mechanik v Benny\'s');

    const nameInput = new TextInputBuilder()
      .setCustomId('ingame_name')
      .setLabel('Vaše Jméno (např. Karel Vrták)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const ageInput = new TextInputBuilder()
      .setCustomId('vek_postavy')
      .setLabel('Váš Věk')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const motivationInput = new TextInputBuilder()
      .setCustomId('motivace')
      .setLabel('Proč se chcete u nás stát mechanikem?')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const experienceInput = new TextInputBuilder()
      .setCustomId('zkusenosti')
      .setLabel('Zkušenosti s prací v autoservisu?')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nameInput),
      new ActionRowBuilder().addComponents(ageInput),
      new ActionRowBuilder().addComponents(motivationInput),
      new ActionRowBuilder().addComponents(experienceInput),
    );

    await interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId === 'form_mechanik') {
    const name = interaction.fields.getTextInputValue('ingame_name');
    const age = interaction.fields.getTextInputValue('vek_postavy');
    const motivation = interaction.fields.getTextInputValue('motivace');
    const experience = interaction.fields.getTextInputValue('zkusenosti');

    const guild = await client.guilds.fetch(GUILD_ID);
    const member = await guild.members.fetch(interaction.user.id);

    const channel = await guild.channels.create({
      name: `ticket-${interaction.user.username.toLowerCase()}`,
      type: ChannelType.GuildText,
      parent: CATEGORY_ID,
      topic: interaction.user.id,
      permissionOverwrites: [
        { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: SUPPORT_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
      ]
    });

    const embed = new EmbedBuilder()
      .setTitle('📥 Nová přihláška – Mechanik')
      .addFields(
        { name: '👤 RP Jméno', value: name },
        { name: '🎂 Věk postavy', value: age },
        { name: '📝 Motivace', value: motivation },
        { name: '🔧 Zkušenosti', value: experience },
        { name: '📎 Discord', value: `${interaction.user.tag}` }
      )
      .setColor('#ffa800')
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('🔒 Zavřít ticket')
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({ content: `<@&${SUPPORT_ROLE_ID}> Nová přihláška!`, embeds: [embed], components: [row] });
    await interaction.reply({ content: `✅ Přihláška byla odeslána! Otevřel jsem ti ticket: ${channel}`, ephemeral: true });
  }

  if (interaction.isButton() && interaction.customId === 'close_ticket') {
    if (!interaction.member.roles.cache.has(SUPPORT_ROLE_ID)) {
      return interaction.reply({ content: '⛔ Nemáš oprávnění zavřít ticket.', ephemeral: true });
    }

    await interaction.reply({ content: '🔒 Ticket bude archivován za 5 sekund.', ephemeral: true });

    setTimeout(async () => {
      const logChannel = await interaction.guild.channels.fetch(LOG_CHANNEL_ID);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle('📁 Ticket archivován')
          .setDescription(`Ticket <#${interaction.channel.id}> byl uzavřen.`)
          .setColor('#888888')
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
      }

      await interaction.channel.delete().catch(console.error);
    }, 5000);
  }
});

client.login(TOKEN);
