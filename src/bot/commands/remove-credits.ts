import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { logger } from '../../utils/logger';
import { CreditsService } from '../services/credits.service';

export const data = new SlashCommandBuilder()
  .setName('remove-credits')
  .setDescription('Remove credits from a user (Admin only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('The user to remove credits from')
      .setRequired(true)
  )
  .addIntegerOption((option) =>
    option
      .setName('amount')
      .setDescription('Amount of credits to remove')
      .setRequired(true)
      .setMinValue(1)
  )
  .addStringOption((option) =>
    option
      .setName('reason')
      .setDescription('Reason for removing credits')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const targetUser = interaction.options.getUser('user', true);
    const amount = interaction.options.getInteger('amount', true);
    const reason = interaction.options.getString('reason') || 'Admin removed credits';

    await interaction.deferReply({ ephemeral: true });

    const result = await CreditsService.removeCredits(
      targetUser.id,
      amount,
      interaction.user.id,
      reason
    );

    await interaction.editReply({
      content: `✅ Successfully removed **${amount}** credits from <@${targetUser.id}>.\nNew balance: **${result.newBalance}** credits.`,
    });

    logger.info(
      `Admin ${interaction.user.tag} removed ${amount} credits from ${targetUser.tag}. Reason: ${reason}`
    );
  } catch (error) {
    logger.error('Error in remove-credits command:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await interaction.editReply({
      content: `❌ Error removing credits: ${errorMessage}`,
    });
  }
}
