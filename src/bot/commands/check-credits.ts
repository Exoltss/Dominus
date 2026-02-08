import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import { logger } from '../../utils/logger';
import { CreditsService } from '../services/credits.service';

export const data = new SlashCommandBuilder()
  .setName('check-credits')
  .setDescription('Check your credit balance')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('Check another user\'s credits (optional)')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const targetUser = interaction.options.getUser('user') || interaction.user;

    await interaction.deferReply({ ephemeral: true });

    const credits = await CreditsService.getCredits(targetUser.id);

    const embed = new EmbedBuilder()
      .setColor(0x26AD10)
      .setTitle('💳 Credit Balance')
      .setDescription(
        targetUser.id === interaction.user.id
          ? `You have **${credits}** credits.`
          : `<@${targetUser.id}> has **${credits}** credits.`
      )
      .setThumbnail(targetUser.displayAvatarURL())
      .setFooter({ text: 'Use /xtools-panel to spend credits' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    logger.info(`${interaction.user.tag} checked credits for ${targetUser.tag}: ${credits}`);
  } catch (error) {
    logger.error('Error in check-credits command:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await interaction.editReply({
      content: `❌ Error checking credits: ${errorMessage}`,
    });
  }
}
