import { Client, CommandInteraction, EmbedBuilder, SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { config } from '../../config';
import { t, Language } from '../../i18n/translator';

export const data = new SlashCommandBuilder()
  .setName('list-deals')
  .setDescription('Lista todos los deals (solo admin)')
  .addBooleanOption(option =>
    option.setName('active')
      .setDescription('Solo mostrar deals activos')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction, client: Client) {
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

    const onlyActive = interaction.options.getBoolean('active') || false;
    
    const where = onlyActive 
      ? { status: { in: ['AWAITING_DEPOSIT', 'DEPOSITED'] } }
      : {};

    const deals = await prisma.deal.findMany({
      where,
      include: {
        buyer: true,
        seller: true,
      },
      orderBy: { dealNumber: 'desc' },
      take: 20,
    });

    if (deals.length === 0) {
      await interaction.editReply({
        content: '❌ No se encontraron deals',
      });
      return;
    }

    const lang = 'es';
    
    const embed = new EmbedBuilder()
      .setColor(0x26AD10)
      .setTitle('📋 Lista de Deals')
      .setDescription(`Total: ${deals.length} deals`)
      .setTimestamp();

    for (const deal of deals) {
      const statusEmoji = deal.status === 'COMPLETED' ? '✅' 
        : deal.status === 'DEPOSITED' ? '💰' 
        : '⏳';
      
      embed.addFields({
        name: `${statusEmoji} Deal #${deal.dealNumber}`,
        value: `**Crypto:** ${deal.cryptocurrency} $${deal.amount}\n**Comprador:** <@${deal.buyer.discordId}>\n**Vendedor:** <@${deal.seller.discordId}>\n**Status:** ${deal.status}`,
        inline: false,
      });
    }

    await interaction.editReply({
      embeds: [embed],
    });

  } catch (error) {
    console.error('[LIST_DEALS] Error:', error);
    await interaction.editReply({
      content: `❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
    });
  } finally {
    await prisma.$disconnect();
  }
}
