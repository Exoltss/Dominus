import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} from 'discord.js';
import { logger } from '../../utils/logger';
import { createTranslatedEmbed, t } from '../../i18n/translator';

export const data = new SlashCommandBuilder()
  .setName('panel')
  .setDescription('Send Main Panel')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    // Defer reply ephemeral so command doesn't show as response
    await interaction.deferReply({ ephemeral: true });

    // First step: Language selection
    const languageEmbed = createTranslatedEmbed(
      {
        color: 0x5865f2,
        title: 'Select Language / Seleccionar Idioma',
        description: '**<:home:1469545532706918617>    Please select your preferred language:**\n<:home:1469545532706918617>    **Por favor selecciona tu idioma preferido:**',
        thumbnail: interaction.guild?.iconURL() || '',
      },
      'es'
    );

    const languageRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('panel_select_en')
        .setLabel('English')
        .setStyle(ButtonStyle.Success)
        .setEmoji('<:right:1469544658525753365>'),
      new ButtonBuilder()
        .setCustomId('panel_select_es')
        .setLabel('Español')
        .setStyle(ButtonStyle.Success)
        .setEmoji('<:right:1469544658525753365>'),
    );

    // Send to channel instead of as reply
    if (interaction.channel && 'send' in interaction.channel) {
      await interaction.channel.send({                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            
        embeds: [languageEmbed],
        components: [languageRow],
      });
      
      // Confirm to admin silently
      await interaction.editReply({
        content: '<:right:1469544658525753365> Successfully sent the panel! / ¡Panel enviado con éxito!',
      });
    }

    logger.info(`Panel language selector sent by ${interaction.user.tag}`);
  } catch (error) {
    logger.error('Error creating panel:', error);
    await interaction.editReply({
      content: 'Failed to send the panel. Please try again later. / No se pudo enviar el panel. Por favor, inténtalo de nuevo más tarde.',
    });
  }
}
