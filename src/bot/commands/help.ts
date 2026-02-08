import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { createTranslatedEmbed, t } from '../../i18n/translator';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Muestra la guía de uso del bot de escrow');

export async function execute(interaction: ChatInputCommandInteraction) {
  // Default to Spanish, will be updated when we have user language preferences
  const lang = 'es';

  const embed = createTranslatedEmbed(
    {
      color: 0x5865f2,
      titleKey: 'commands.help.title',
      descriptionKey: 'commands.help.subtitle',
      fields: [
        {
          nameKey: 'commands.help.seller_section',
          valueKey: 'commands.help.seller_commands',
          inline: false,
        },
        {
          nameKey: 'commands.help.buyer_section',
          valueKey: 'commands.help.buyer_commands',
          inline: false,
        },
        {
          nameKey: 'commands.help.crypto_section',
          valueKey: 'commands.help.crypto_list',
          inline: false,
        },
        {
          nameKey: 'commands.help.fee_section',
          valueKey: 'commands.help.fee_info',
          inline: false,
        },
        {
          nameKey: 'commands.help.support_section',
          valueKey: 'commands.help.support_info',
          inline: true,
        },
      ],
      footerKey: 'commands.help.footer',
      timestamp: true,
    },
    lang
  );

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}
