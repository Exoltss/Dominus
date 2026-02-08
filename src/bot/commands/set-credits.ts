import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { logger } from '../../utils/logger';
import { CreditsService } from '../services/credits.service';

export const data = new SlashCommandBuilder()
  .setName('set-credits')
  .setDescription('Set a user\'s credits to a specific amount (Admin only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('The user to set credits for')
      .setRequired(true)
  )
  .addIntegerOption((option) =>
    option
      .setName('amount')
      .setDescription('New credit amount')
      .setRequired(true)
      .setMinValue(0)
  )
  .addStringOption((option) =>
    option
      .setName('reason')
      .setDescription('Reason for setting credits')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const targetUser = interaction.options.getUser('user', true);
    const amount = interaction.options.getInteger('amount', true);
    const reason = interaction.options.getString('reason') || 'Admin set credits';

    await interaction.deferReply({ ephemeral: true });

    const result = await CreditsService.setCredits(
      targetUser.id,
      amount,
      interaction.user.id,
      reason
    );

    await interaction.editReply({
      content: `✅ Successfully set credits for <@${targetUser.id}> to **${amount}**.\nPrevious balance: **${result.newBalance - (amount - result.newBalance)}** credits.`,
    });

    logger.info(
      `Admin ${interaction.user.tag} set credits for ${targetUser.tag} to ${amount}. Reason: ${reason}`
    );
  } catch (error) {
    logger.error('Error in set-credits command:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await interaction.editReply({
      content: `❌ Error setting credits: ${errorMessage}`,
    });
  }
}
