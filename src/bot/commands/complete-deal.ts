import { Client, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { BlockchainFactory } from '../../blockchain/factory';
import { config } from '../../config';
import { t, Language } from '../../i18n/translator';

export const data = new SlashCommandBuilder()
  .setName('complete-deal')
  .setDescription('Completa un deal manualmente (solo admin)')
  .addIntegerOption(option =>
    option.setName('deal')
      .setDescription('Número del deal')
      .setRequired(true)
  )
  .addStringOption(option =>
    option.setName('address')
      .setDescription('Dirección del receptor')
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction, client: Client) {
  const dealNumber = interaction.options.getInteger('deal', true);
  const recipientAddress = interaction.options.getString('address', true);

  // Check if user is admin
  const adminIds = config.admin.userIds;
  if (!adminIds.includes(interaction.user.id)) {
    await interaction.reply({
      content: '❌ No tienes permiso para usar este comando',
      ephemeral: true,
    });
    return;
  }

  const prisma = new PrismaClient();

  try {
    await interaction.deferReply({ ephemeral: true });

    const deal = await prisma.deal.findUnique({
      where: { dealNumber },
      include: {
        wallet: true,
        buyer: true,
        seller: true,
      },
    });

    if (!deal) {
      await interaction.editReply({
        content: `❌ Deal #${dealNumber} no encontrado`,
      });
      return;
    }

    if (deal.status === 'COMPLETED') {
      await interaction.editReply({
        content: `⚠️ El deal #${dealNumber} ya está completado`,
      });
      return;
    }

    if (!deal.wallet) {
      await interaction.editReply({
        content: `❌ El deal #${dealNumber} no tiene wallet asociada`,
      });
      return;
    }

    // Get balance from wallet
    const balance = await BlockchainFactory.getBalance(
      deal.cryptocurrency as any,
      deal.wallet.address
    );

    const balanceNum = parseFloat(balance);
    
    if (balanceNum <= 0) {
      await interaction.editReply({
        content: `❌ No hay fondos en el wallet del deal #${dealNumber}`,
      });
      return;
    }

    // Update deal status
    await prisma.deal.update({
      where: { id: deal.id },
      data: { status: 'COMPLETED' },
    });

    // Send completion embed to the logs channel
    const lang = (deal.creatorLanguage as Language) || 'es';
    
    const completeEmbed = new EmbedBuilder()
      .setColor(0x26AD10)
      .setTitle(':right:1469544658525753365 Deal Completed')
      .setDescription(
        `*Details of adress and amount are hidden for privacy.* \n` +
        `**Sender:** <@${deal.buyer.discordId}>\n` +
        `**Receiver:** <@${deal.seller.discordId}>`
      )
      .setTimestamp();

    // Send to the specified logs channel
    const logsChannel = interaction.guild?.channels.cache.get('1470144219673788538');
    if (logsChannel && logsChannel.isTextBased()) {
      await logsChannel.send({ embeds: [completeEmbed] });
    }

    await interaction.editReply({
      content: `✅ Deal #${dealNumber} Completed. Balance: ${balance} ${deal.cryptocurrency}`,
    });

  } catch (error) {
    console.error('[COMPLETE_DEAL] Error:', error);
    await interaction.editReply({
      content: `❌ Error completing deal: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  } finally {
    await prisma.$disconnect();
  }
}
