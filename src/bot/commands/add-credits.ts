import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { logger } from '../../utils/logger';
import { CreditsService } from '../services/credits.service';

export const data = new SlashCommandBuilder()
  .setName('add-credits')
  .setDescription('Add credits to a user (Admin only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('The user to add credits to')
      .setRequired(true)
  )
  .addIntegerOption((option) =>
    option
      .setName('amount')
      .setDescription('Amount of credits to add')
      .setRequired(true)
      .setMinValue(1)
  )
  .addStringOption((option) =>
    option
      .setName('reason')
      .setDescription('Reason for adding credits')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const targetUser = interaction.options.getUser('user', true);
    const amount = interaction.options.getInteger('amount', true);
    const reason = interaction.options.getString('reason') || 'Admin added credits';

    await interaction.deferReply({ ephemeral: true });

    const result = await CreditsService.addCredits(
      targetUser.id,
      amount,
      interaction.user.id,
      reason
    );

    await interaction.editReply({
      content: `✅ Successfully added **${amount}** credits to <@${targetUser.id}>.\nNew balance: **${result.newBalance}** credits.`,
    });

    logger.info(
      `Admin ${interaction.user.tag} added ${amount} credits to ${targetUser.tag}. Reason: ${reason}`
    );
  } catch (error) {
    logger.error('Error in add-credits command:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await interaction.editReply({
      content: `❌ Error adding credits: ${errorMessage}`,
    });
  }
}
