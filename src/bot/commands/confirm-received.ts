import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  Message,
  TextChannel,
  Client,
  EmbedBuilder,
  GuildTextBasedChannel,
} from 'discord.js';
import { DealService } from '../../escrow/deal.service';
import { BlockchainFactory } from '../../blockchain/factory';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import { createTranslatedEmbed, t, Language } from '../../i18n/translator';

export const data = new SlashCommandBuilder()
  .setName('confirm-received')
  .setDescription('Confirmar que recibiste el producto/servicio')
  .addIntegerOption((option) =>
    option.setName('deal').setDescription('Número del deal').setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const dealNumber = interaction.options.getInteger('deal', true);

    // Get deal from database
    const deal = await DealService.getDealByNumber(dealNumber);

    if (!deal) {
      await interaction.reply({
        content: t('commands.confirm_received.deal_not_found', 'es', { dealNumber: dealNumber.toString() }),
        ephemeral: true,
      });
      return;
    }

    // Determine user's language from deal
    const lang: Language = deal.buyer.discordId === interaction.user.id 
      ? (deal.buyerLanguage as Language) || (deal.creatorLanguage as Language) || 'es'
      : (deal.creatorLanguage as Language) || 'es';

    // Check if user is the buyer
    if (deal.buyer.discordId !== interaction.user.id) {
      await interaction.reply({
        content: t('commands.confirm_received.not_buyer', lang),
        ephemeral: true,
      });
      return;
    }

    // Check deal status
    if (deal.status !== 'DEPOSIT_CONFIRMED' && deal.status !== 'AWAITING_CONFIRMATION') {
      await interaction.reply({
        content: t('commands.confirm_received.cannot_confirm', lang, { status: deal.status }),
        ephemeral: true,
      });
      return;
    }

    // Confirmation embed with warning
    const confirmEmbed = createTranslatedEmbed(
      {
        color: 0xff0000,
        titleKey: 'commands.confirm_received.confirm_title',
        descriptionKey: 'commands.confirm_received.confirm_description',
        vars: {
          seller: deal.seller.discordTag,
          dealNumber: deal.dealNumber.toString(),
          amount: deal.amount,
          crypto: deal.cryptocurrency,
          sellerId: deal.seller.discordId,
        },
        footerKey: 'commands.confirm_received.confirm_footer',
      },
      lang
    );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('confirm_release')
        .setLabel(t('commands.confirm_received.yes_release', lang))
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('cancel_release')
        .setLabel(t('commands.confirm_received.no_cancel', lang))
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
      embeds: [confirmEmbed],
      components: [row],
      ephemeral: true,
    });

    // Wait for confirmation
    const collector = interaction.channel?.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      componentType: ComponentType.Button,
      time: 60000,
    });

    collector?.on('collect', async (btnInteraction) => {
      if (btnInteraction.customId === 'confirm_release') {
        await btnInteraction.deferUpdate();
        await releaseFunds(interaction, deal, btnInteraction, lang);
        collector.stop();
      } else if (btnInteraction.customId === 'cancel_release') {
        await btnInteraction.update({
          content: t('commands.confirm_received.confirmation_cancelled', lang),
          embeds: [],
          components: [],
        });
        collector.stop();
      }
    });
  } catch (error) {
    logger.error('Error in confirm-received command:', error);
    await interaction.reply({
      content: t('commands.confirm_received.error_confirming', 'es'),
      ephemeral: true,
    });
  }
}

async function releaseFunds(
  interaction: ChatInputCommandInteraction,
  deal: any,
  btnInteraction: any,
  lang: Language
) {
  try {
    await interaction.editReply({
      content: t('commands.confirm_received.requesting_address', lang),
      embeds: [],
      components: [],
    });

    const channel = interaction.channel as TextChannel;
    if (!channel) {
      throw new Error('Channel not found');
    }

    const amountToReceive = (parseFloat(deal.amount) - parseFloat(deal.feeAmount || '0')).toFixed(2);

    // Notify seller to provide address
    const requestEmbed = createTranslatedEmbed(
      {
        color: 0xffd700,
        titleKey: 'commands.confirm_received.payment_ready_title',
        descriptionKey: 'commands.confirm_received.payment_ready_description',
        vars: {
          sellerId: deal.seller.discordId,
          crypto: deal.cryptocurrency,
          dealNumber: deal.dealNumber.toString(),
          amount: amountToReceive,
        },
        footerKey: 'commands.confirm_received.address_timeout_footer',
      },
      lang
    );

    await channel.send({
      content: `<@${deal.seller.discordId}>`,
      embeds: [requestEmbed],
    });

    // Wait for seller to provide address
    const filter = (m: Message) => {
      return m.author.id === deal.seller.discordId && m.channel.id === channel.id;
    };

    try {
      const collected = await channel.awaitMessages({
        filter,
        max: 1,
        time: 300000, // 5 minutes
        errors: ['time'],
      });

      const addressMsg = collected?.first();
      const receiverAddress = addressMsg?.content.trim();

      if (!receiverAddress) {
        throw new Error('No address provided');
      }

      await addressMsg?.delete();

      // Confirm address with seller
      const confirmAddressEmbed = createTranslatedEmbed(
        {
          color: 0xff9900,
          titleKey: 'commands.confirm_received.confirm_address_title',
          descriptionKey: 'commands.confirm_received.confirm_address_description',
          vars: {
            sellerId: deal.seller.discordId,
            address: receiverAddress,
          },
        },
        lang
      );

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_address')
          .setLabel(t('commands.confirm_received.confirm_address_btn', lang))
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('cancel_address')
          .setLabel(t('commands.confirm_received.cancel_address_btn', lang))
          .setStyle(ButtonStyle.Danger)
      );

      const confirmMsg = await channel.send({
        content: `<@${deal.seller.discordId}>`,
        embeds: [confirmAddressEmbed],
        components: [row],
      });

      const addressCollector = confirmMsg.createMessageComponentCollector({
        filter: (i: any) => i.user.id === deal.seller.discordId,
        componentType: ComponentType.Button,
        time: 120000,
      });

      addressCollector.on('collect', async (addrBtnInteraction: any) => {
        if (addrBtnInteraction.customId === 'confirm_address') {
          await addrBtnInteraction.deferUpdate();
          await confirmMsg?.delete();
          await processTransaction(interaction, deal, receiverAddress, lang);
          addressCollector.stop();
        } else if (addrBtnInteraction.customId === 'cancel_address') {
          await addrBtnInteraction.update({
            content: t('commands.confirm_received.address_cancelled', lang),
            embeds: [],
            components: [],
          });
          addressCollector.stop();
        }
      });
    } catch (error) {
      await channel.send({
        content: t('commands.confirm_received.no_address_timeout', lang, {
          sellerId: deal.seller.discordId,
          dealNumber: deal.dealNumber.toString(),
        }),
      });
    }
  } catch (error) {
    logger.error('Error releasing funds:', error);
    await interaction.editReply({
      content: t('commands.confirm_received.error_releasing', lang),
    });
  }
}

async function processTransaction(
  interaction: ChatInputCommandInteraction,
  deal: any,
  receiverAddress: string,
  lang: Language
) {
  try {
    const channel = interaction.channel as TextChannel;

    const totalAmount = parseFloat(deal.amount);
    const feeAmount = parseFloat(deal.feeAmount || '0');
    const amountToSeller = totalAmount - feeAmount;

    const processingEmbed = createTranslatedEmbed(
      {
        color: 0xffd700,
        titleKey: 'commands.confirm_received.processing_title',
        descriptionKey: 'commands.confirm_received.processing_description',
        vars: {
          sellerId: deal.seller.discordId,
          address: receiverAddress,
          amount: amountToSeller.toFixed(2),
          fee: feeAmount.toFixed(2),
          crypto: deal.cryptocurrency,
        },
      },
      lang
    );

    await channel.send({ embeds: [processingEmbed] });

    const wallet = deal.wallet;

    // TODO: Implement actual blockchain transaction
    // For now, simulate:
    // const txHash = await BlockchainFactory.sendTransaction(
    //   deal.cryptocurrency,
    //   wallet.privateKey,
    //   receiverAddress,
    //   amountToSeller.toString()
    // );

    const txHash = `0x${Date.now().toString(16)}${Math.random().toString(16).substr(2, 8)}`;

    await DealService.releaseFunds(deal.id, txHash);
    await DealService.updateDealStatus(deal.id, 'COMPLETED');

    // Send deal completion embed to log channel
    await sendDealCompletionEmbed(interaction.client, deal, txHash);

    // Success message
    const successEmbed = createTranslatedEmbed(
      {
        color: 0x00ff00,
        titleKey: 'commands.confirm_received.success_title',
        descriptionKey: 'commands.confirm_received.success_description',
        vars: {
          dealNumber: deal.dealNumber.toString(),
          amount: amountToSeller.toFixed(2),
          fee: feeAmount.toFixed(2),
          address: receiverAddress,
          txHash,
          sellerId: deal.seller.discordId,
          buyerId: deal.buyer.discordId,
        },
        timestamp: true,
      },
      lang
    );

    await channel.send({
      content: `<@${deal.seller.discordId}> <@${deal.buyer.discordId}>`,
      embeds: [successEmbed],
    });

    await interaction.editReply({
      content: t('commands.confirm_received.funds_released', lang),
    });

    logger.info(`Deal #${deal.dealNumber} completed - Funds sent to ${receiverAddress}`);
  } catch (error) {
    logger.error('Error processing transaction:', error);
    const channel = interaction.channel as TextChannel;
    await channel.send({
      content: t('commands.confirm_received.error_processing', lang),
    });
  }
}

async function sendDealCompletionEmbed(client: Client, deal: any, txHash: string) {
  try {
    const completionChannelId = '1470144219673788538';
    const channel = await client.channels.fetch(completionChannelId) as GuildTextBasedChannel;
    
    if (!channel) {
      logger.error(`Completion channel ${completionChannelId} not found`);
      return;
    }

    // Get blockchain explorer URL based on cryptocurrency
    const explorerUrl = getExplorerUrl(deal.cryptocurrency, txHash);

    const completionEmbed = new EmbedBuilder()
      .setColor(0x26AD10) // Green
      .setTitle(`Deal Completed - ${deal.cryptocurrency}`)
      .addFields(
        { name: 'Amount', value: `${deal.amount}`, inline: true },
        { name: 'Sender', value: deal.seller ? `<@${deal.seller.discordId}>` : 'N/A', inline: true },
        { name: 'Receiver', value: deal.buyer ? `<@${deal.buyer.discordId}>` : 'N/A', inline: true },
        { 
          name: 'Transaction', 
          value: `[${txHash.substring(0, 12)}...${txHash.substring(txHash.length - 6)}](${explorerUrl})`, 
          inline: false 
        }
      )
      .setTimestamp();

    await channel.send({ embeds: [completionEmbed] });
    logger.info(`Deal completion embed sent to channel ${completionChannelId}`);
  } catch (error) {
    logger.error('Error sending deal completion embed:', error);
  }
}

function getExplorerUrl(crypto: string, txHash: string): string {
  const cryptoUpper = crypto.toUpperCase();
  
  switch (cryptoUpper) {
    case 'BTC':
      return `https://www.blockchain.com/btc/tx/${txHash}`;
    case 'ETH':
    case 'USDT':
    case 'USDC':
      return `https://etherscan.io/tx/${txHash}`;
    case 'SOL':
      return `https://solscan.io/tx/${txHash}`;
    case 'LTC':
      return `https://litecoinblockchain.info/tx/${txHash}`;
    default:
      const cryptoLower = crypto.toLowerCase();
      return `https://explorer.${cryptoLower}.com/tx/${txHash}`;
  }
}
