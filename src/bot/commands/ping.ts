import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { createTranslatedEmbed, t } from '../../i18n/translator';

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Verifica si el bot está funcionando');

export async function execute(interaction: ChatInputCommandInteraction) {
  const ping = interaction.client.ws.ping;
  const lang = 'es'; // Default language

  const embed = createTranslatedEmbed(
    {
      color: 0x00ff00,
      titleKey: 'commands.ping.pong',
      fields: [
        {
          nameKey: 'commands.ping.latency',
          value: `${ping}ms`,
          inline: true,
        },
        {
          name: 'Estado',
          value: '✅ Online',
          inline: true,
        },
      ],
      timestamp: true,
    },
    lang
  );

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}
