import {
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  Message,
} from 'discord.js';
import { DealService } from '../../escrow/deal.service';
import { logger } from '../../utils/logger';
import { convertUsdToCrypto, getCryptoSymbol } from '../../utils/price-converter';
import { t, createTranslatedEmbed, Language } from '../../i18n/translator';

export async function startDealFlow(channel: TextChannel, crypto: string, ticketNumber?: string, creatorLang: Language = 'es') {
  try {
    // Step 1: Role assignment
    const roleEmbed = createTranslatedEmbed(
      {
        color: 0x26AD10,
        titleKey: 'deal_flow.sending_or_receiving',
        descriptionKey: 'deal_flow.role_description',
        fields: [
          { nameKey: 'deal_flow.buyer', valueKey: 'deal_flow.none', inline: true },
          { nameKey: 'deal_flow.seller', valueKey: 'deal_flow.none', inline: true },
        ],
        footerKey: 'deal_flow.inactive_footer',
      },
      creatorLang
    );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('sender_btn')
        .setLabel(t('deal_flow.sender', creatorLang))
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('receiver_btn')
        .setLabel(t('deal_flow.receiver', creatorLang))
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('cancel_roles')
        .setLabel(t('deal_flow.cancel', creatorLang))
        .setStyle(ButtonStyle.Danger)
    );

    const roleMsg = await channel.send({
      embeds: [roleEmbed],
      components: [row],
    });

    let buyer: any = null;
    let seller: any = null;
    let buyerLang: Language | null = null;

    const collector = roleMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 1800000, // 30 minutes
    });

    collector.on('collect', async (btnInteraction) => {
      if (btnInteraction.customId === 'sender_btn') {
        if (btnInteraction.user.id === seller?.id) {
          await btnInteraction.reply({
            content: t('deal_flow.iq_issue', creatorLang),
            ephemeral: true,
          });
          return;
        }
        
        buyer = btnInteraction.user;
        
        // Ask buyer for language preference
        const langEmbed = createTranslatedEmbed(
          {
            color: 0x5865f2,
            titleKey: 'language.select_language',
            descriptionKey: 'language.select_language_desc',
          },
          'es' // Show in both languages initially
        );

        const langRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId('select_lang_en')
            .setLabel(t('language.english', 'en'))
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('select_lang_es')
            .setLabel(t('language.spanish', 'es'))
            .setStyle(ButtonStyle.Primary)
        );

        await btnInteraction.reply({
          embeds: [langEmbed],
          components: [langRow],
          ephemeral: true,
        });

        // Wait for language selection
        const langCollector = btnInteraction.channel?.createMessageComponentCollector({
          filter: (i) =>
            i.user.id === buyer.id &&
            (i.customId === 'select_lang_en' || i.customId === 'select_lang_es'),
          componentType: ComponentType.Button,
          time: 60000,
        });

        langCollector?.on('collect', async (langInteraction) => {
          buyerLang = langInteraction.customId === 'select_lang_en' ? 'en' : 'es';
          
          await langInteraction.update({
            content: t('language.language_set', buyerLang),
            embeds: [],
            components: [],
          });
          
          langCollector.stop();
        });
      } else if (btnInteraction.customId === 'receiver_btn') {
        const warningEmbed = createTranslatedEmbed(
          {
            color: 0xff0000,
            descriptionKey: 'deal_flow.receiver_warning',
          },
          creatorLang
        );

        await btnInteraction.reply({
          embeds: [warningEmbed],
          ephemeral: true,
        });

        if (btnInteraction.user.id === buyer?.id) {
          await btnInteraction.followUp({
            content: t('deal_flow.iq_issue', creatorLang),
            ephemeral: true,
          });
          return;
        }
        seller = btnInteraction.user;
      } else if (btnInteraction.customId === 'cancel_roles') {
        buyer = null;
        seller = null;
        buyerLang = null;
        await btnInteraction.deferUpdate();
      }

      // Update embed
      const updatedEmbed = createTranslatedEmbed(
        {
          color: 0x26AD10,
          titleKey: 'deal_flow.sending_or_receiving',
          descriptionKey: 'deal_flow.role_description',
          fields: [
            {
              nameKey: 'deal_flow.buyer',
              value: buyer ? buyer.toString() : t('deal_flow.none', creatorLang),
              inline: true,
            },
            {
              nameKey: 'deal_flow.seller',
              value: seller ? seller.toString() : t('deal_flow.none', creatorLang),
              inline: true,
            },
          ],
          footerKey: 'deal_flow.inactive_footer',
        },
        creatorLang
      );

      const updatedRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('sender_btn')
          .setLabel(t('deal_flow.sender', creatorLang))
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(buyer !== null),
        new ButtonBuilder()
          .setCustomId('receiver_btn')
          .setLabel(t('deal_flow.receiver', creatorLang))
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(seller !== null),
        new ButtonBuilder()
          .setCustomId('cancel_roles')
          .setLabel(t('deal_flow.cancel', creatorLang))
          .setStyle(ButtonStyle.Danger)
      );

      await roleMsg.edit({ embeds: [updatedEmbed], components: [updatedRow] });

      // If both assigned, move to confirmation
      if (buyer && seller) {
        collector.stop('roles_complete');
        await roleMsg.delete();
        await confirmRoles(channel, buyer, seller, crypto, ticketNumber, creatorLang, buyerLang);
      }
    });

  } catch (error) {
    logger.error('Error in deal flow:', error);
    await channel.send(t('errors.generic', creatorLang || 'es'));
  }
}

async function confirmRoles(
  channel: TextChannel,
  buyer: any,
  seller: any,
  crypto: string,
  ticketNumber?: string,
  creatorLang: Language = 'es',
  buyerLang?: Language | null
) {
  const effectiveBuyerLang = buyerLang || creatorLang;
  
  const confirmEmbed = createTranslatedEmbed(
    {
      color: 0x26AD10,
      titleKey: 'commands.start_deal.role_confirmation',
      descriptionKey: 'commands.start_deal.roles_assigned',
      fields: [
        { nameKey: 'deal_flow.buyer', value: buyer.toString(), inline: true },
        { nameKey: 'deal_flow.seller', value: seller.toString(), inline: true },
      ],
    },
    creatorLang
  );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('confirm_role')
      .setLabel(t('commands.start_deal.confirm', creatorLang))
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('incorrect_role')
      .setLabel(t('commands.start_deal.incorrect', creatorLang))
      .setStyle(ButtonStyle.Secondary)
  );

  const msg = await channel.send({
    embeds: [confirmEmbed],
    components: [row],
  });

  const confirmed = new Set<string>();

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 1800000,
  });

  collector.on('collect', async (btnInteraction) => {
    if (btnInteraction.customId === 'confirm_role') {
      if (btnInteraction.user.id !== buyer.id && btnInteraction.user.id !== seller.id) {
        await btnInteraction.reply({
          content: t('commands.start_deal.not_part_of_deal', creatorLang),
          ephemeral: true,
        });
        return;
      }

      if (confirmed.has(btnInteraction.user.id)) {
        const userLang = btnInteraction.user.id === buyer.id ? effectiveBuyerLang : creatorLang;
        await btnInteraction.reply({
          content: t('commands.start_deal.role_already_confirmed', userLang),
          ephemeral: true,
        });
        return;
      }

      confirmed.add(btnInteraction.user.id);
      
      const userLang = btnInteraction.user.id === buyer.id ? effectiveBuyerLang : creatorLang;
      
      const confirmMsg = createTranslatedEmbed(
        {
          color: 0x26AD10,
          description: `${btnInteraction.user.toString()} ${t('commands.start_deal.role_confirmed', userLang)}`,
        },
        userLang
      );
      
      await btnInteraction.reply({ embeds: [confirmMsg] });

      // Disable Confirm button after both confirmed
      if (confirmed.size === 2) {
        const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId('confirm_role')
            .setLabel(t('commands.start_deal.confirm', creatorLang))
            .setStyle(ButtonStyle.Success)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId('incorrect_role')
            .setLabel(t('commands.start_deal.incorrect', creatorLang))
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        );
        await msg.edit({ components: [disabledRow] });
        
        collector.stop('both_confirmed');
        setTimeout(async () => {
          try {
            await msg.delete();
          } catch (deleteError: any) {
            // Message may already be deleted or not exist
            if (deleteError.code !== 10008) {
              logger.warn('[DEAL_FLOW] Could not delete message:', deleteError?.message);
            }
          }
          await requestAmount(channel, buyer, seller, crypto, ticketNumber, creatorLang, buyerLang);
        }, 2000);
      }
    } else if (btnInteraction.customId === 'incorrect_role') {
      await btnInteraction.update({
        content: t('commands.start_deal.role_cancelled', creatorLang),
        embeds: [],
        components: [],
      });
      collector.stop();
      setTimeout(() => startDealFlow(channel, crypto, ticketNumber, creatorLang), 2000);
    }
  });
}

async function requestAmount(
  channel: TextChannel,
  buyer: any,
  seller: any,
  crypto: string,
  ticketNumber?: string,
  creatorLang: Language = 'es',
  buyerLang?: Language | null
) {
  // Use buyer's language if available, otherwise creator's
  const lang = buyerLang || creatorLang;
  
  const amountEmbed = new EmbedBuilder()
    .setColor(0x26AD10)
    .setTitle(t('language.request_amount_title', lang))
    .setDescription(t('language.request_amount_desc', lang, { buyer: buyer.toString() }))
    .setFooter({ text: t('language.inactive_footer', lang) });

  await channel.send({
    content: buyer.toString(),
    embeds: [amountEmbed],
  });

  const filter = (m: Message) => {
    const content = m.content.replace('$', '').replace(',', '').trim();
    return (
      m.author.id === buyer.id &&
      m.channel.id === channel.id &&
      !isNaN(parseFloat(content)) &&
      content.match(/^\d+(\.\d{1,2})?$/) !== null
    );
  };

  try {
    const collected = await channel.awaitMessages({
      filter,
      max: 1,
      time: 120000,
      errors: ['time'],
    });

    const amountMsg = collected.first();
    let amount = amountMsg?.content.replace('$', '').replace(',', '').trim() || '0';
    amount = parseFloat(amount).toFixed(2);

    await amountMsg?.delete();
    await confirmAmount(channel, buyer, seller, crypto, amount, ticketNumber, creatorLang, buyerLang);

  } catch (error) {
    await channel.send({
      content: t('language.timeout_amount', lang),
    });
  }
}

async function confirmAmount(
  channel: TextChannel,
  buyer: any,
  seller: any,
  crypto: string,
  amount: string,
  ticketNumber?: string,
  creatorLang: Language = 'es',
  buyerLang?: Language | null
) {
  const confirmEmbed = new EmbedBuilder()
    .setColor(0x26AD10)
    .setTitle(t('language.confirm_amount_title', creatorLang))
    .setDescription(t('language.confirm_amount_desc', creatorLang))
    .addFields({ name: t('language.amount_field', creatorLang), value: `$${amount}` });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('confirm_amount_btn')
      .setLabel(t('language.confirm_button', creatorLang))
      .setStyle(ButtonStyle.Success)
  );

  const msg = await channel.send({
    embeds: [confirmEmbed],
    components: [row],
  });

  const confirmed = new Set<string>();

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 120000,
  });

  collector.on('collect', async (btnInteraction) => {
    // Prevent double-clicks from causing errors
    if (btnInteraction.replied || btnInteraction.deferred) {
      logger.warn('[DEAL_FLOW] Confirm amount button already handled, ignoring duplicate click');
      return;
    }
    
    // Determine language for the user
    const userLang = btnInteraction.user.id === buyer.id && buyerLang ? buyerLang : creatorLang;
    
    if (btnInteraction.user.id !== buyer.id && btnInteraction.user.id !== seller.id) {
      await btnInteraction.reply({
        content: t('language.not_part_of_deal', userLang),
        ephemeral: true,
      });
      return;
    }

    if (confirmed.has(btnInteraction.user.id)) {
      await btnInteraction.reply({
        content: t('language.amount_already_confirmed', userLang),
        ephemeral: true,
      });
      return;
    }

    confirmed.add(btnInteraction.user.id);
    await btnInteraction.reply({
      content: t('language.amount_confirmed', userLang),
      ephemeral: true,
    });

    if (confirmed.size === 2) {
      collector.stop();
      await msg.delete();
      await selectFeePayer(channel, buyer, seller, crypto, amount, ticketNumber, creatorLang, buyerLang);
    }
  });
}

async function selectFeePayer(
  channel: TextChannel,
  buyer: any,
  seller: any,
  crypto: string,
  amount: string,
  ticketNumber?: string,
  creatorLang: Language = 'es',
  buyerLang?: Language | null
) {
  const amountNum = parseFloat(amount);
  let feeAmount = 0;

  if (amountNum < 10) {
    feeAmount = 0;
  } else if (amountNum < 100) {
    feeAmount = 1;
  } else {
    feeAmount = 2;
  }

  if (feeAmount === 0) {
    await createDealAndInvoice(channel, buyer, seller, crypto, amount, 'none', 0, ticketNumber, creatorLang, buyerLang);
    return;
  }

  const feeEmbed = new EmbedBuilder()
    .setColor(0x26AD10)
    .setTitle(t('language.fee_payment_title', creatorLang))
    .setDescription(t('language.fee_payment_desc', creatorLang))
    .addFields({ name: t('language.fee_field', creatorLang), value: `$${feeAmount.toFixed(2)}` })
    .setFooter({ text: t('language.fee_footer', creatorLang) });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('sender_pays_fee')
      .setLabel(t('language.sender_pays', creatorLang))
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('receiver_pays_fee')
      .setLabel(t('language.receiver_pays', creatorLang))
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('split_fee_btn')
      .setLabel(t('language.split_fee', creatorLang))
      .setStyle(ButtonStyle.Secondary)
  );

  const msg = await channel.send({
    embeds: [feeEmbed],
    components: [row],
  });

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 120000,
  });

  collector.on('collect', async (btnInteraction) => {
    // Prevent double-clicks from causing errors
    if (btnInteraction.replied || btnInteraction.deferred) {
      logger.warn('[DEAL_FLOW] Button already handled, ignoring duplicate click');
      return;
    }
    
    let feePayer = 'none';
    if (btnInteraction.customId === 'sender_pays_fee') feePayer = 'buyer';
    else if (btnInteraction.customId === 'receiver_pays_fee') feePayer = 'seller';
    else if (btnInteraction.customId === 'split_fee_btn') feePayer = 'split';

    // Disable all buttons after selection
    const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('sender_pays_fee')
        .setLabel(t('language.sender_pays', creatorLang))
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('receiver_pays_fee')
        .setLabel(t('language.receiver_pays', creatorLang))
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('split_fee_btn')
        .setLabel(t('language.split_fee', creatorLang))
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );
    
    await btnInteraction.update({ components: [disabledRow] });
    collector.stop();
    
    setTimeout(async () => {
      await msg.delete();
      await createDealAndInvoice(channel, buyer, seller, crypto, amount, feePayer, feeAmount, ticketNumber, creatorLang, buyerLang);
    }, 1000);
  });
}

async function createDealAndInvoice(
  channel: TextChannel,
  buyer: any,
  seller: any,
  crypto: string,
  amount: string,
  feePayer: string,
  feeAmount: number,
  ticketNumber?: string,
  creatorLang: Language = 'es',
  buyerLang?: Language | null
) {
  try {
    logger.info(`[DEAL_FLOW] Creating deal and invoice: ${crypto} ${amount} feePayer=${feePayer} feeAmount=${feeAmount}`);
    
    // Calculate service fee (profit for escrow service)
    const serviceFeePercentage = 2.0; // 2% service fee
    const serviceFeeUsd = parseFloat(amount) * (serviceFeePercentage / 100);
    
    // Create deal with creator language
    const { deal, wallet } = await DealService.createDeal({
      buyerDiscordId: buyer.id,
      buyerDiscordTag: buyer.tag,
      sellerDiscordId: seller.id,
      sellerDiscordTag: seller.tag,
      cryptocurrency: crypto as any,
      amount,
      description: `Deal via ticket`,
      creatorLanguage: creatorLang,
    });

    // Save buyer language if different from creator
    if (buyerLang && buyerLang !== creatorLang) {
      await DealService.updateBuyerLanguage(deal.id, buyerLang);
    }

    // Deal Summary - always in creator's language (public message)
    const summaryEmbed = new EmbedBuilder()
      .setColor(0x26AD10)
      .setTitle(t('language.summary_title', creatorLang))
      .setDescription(t('language.summary_desc', creatorLang))
      .addFields(
        { name: t('language.buyer_field', creatorLang), value: buyer.toString(), inline: true },
        { name: t('language.seller_field', creatorLang), value: seller.toString(), inline: true },
        { name: t('language.deal_value', creatorLang), value: `$${amount}`, inline: true },
        { name: t('language.coin_field', creatorLang), value: crypto, inline: false },
        {
          name: t('language.network_fee', creatorLang),
          value: feeAmount === 0 
            ? t('language.free', creatorLang)
            : `$${feeAmount.toFixed(2)} - ${t('language.paid_by', creatorLang, { payer: feePayer })}`,
          inline: false,
        },
        {
          name: t('language.service_fee', creatorLang),
          value: `$${serviceFeeUsd.toFixed(2)}`,
          inline: false,
        }
      )
      .setThumbnail(
        'https://images-ext-1.discordapp.net/external/_Cnl3cB-5Gj6hQ4AexLMA-gzXHyTtWeY1KOa-RqzNzc/https/i.ibb.co/8RHQ1BC/DOMINUS.gif?width=80&height=80'
      );

    // Calculate final amount in USD (includes service fee + network fee)
    let finalAmountUsd = parseFloat(amount) + serviceFeeUsd;
    if (feePayer === 'buyer') {
      finalAmountUsd += feeAmount;
    } else if (feePayer === 'split') {
      finalAmountUsd += feeAmount / 2;
    }

    // Convert to crypto with extra buffer for network fees (5% extra for safety)
    const cryptoAmountBase = await convertUsdToCrypto(finalAmountUsd, crypto);
    const cryptoAmountWithBuffer = (cryptoAmountBase * 1.05).toFixed(8);
    const cryptoSymbol = getCryptoSymbol(crypto);

    // Payment Invoice with proper QR - also in creator's language
    const qrData = `${crypto.toLowerCase()}:${wallet.address}?amount=${cryptoAmountWithBuffer}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

    const invoiceEmbed = new EmbedBuilder()
      .setColor(0x26AD10)
      .setTitle(t('language.review_payment_title', creatorLang))
      .setDescription(t('language.review_payment_desc', creatorLang))
      .addFields(
        { name: t('language.address_field', creatorLang), value: `\`${wallet.address}\``, inline: false },
        { name: t('language.deal_value', creatorLang), value: `\`$${amount} USD\``, inline: true },
        { name: t('language.service_fee', creatorLang), value: `\`$${serviceFeeUsd.toFixed(2)} USD\``, inline: true },
        { name: t('language.network_fee_buffer', creatorLang), value: `\`~$${(finalAmountUsd * 0.05).toFixed(2)} USD\``, inline: true },
        { name: '━━━━━━━━━━━━━━━━━━', value: `** **`, inline: false },
        { name: t('language.total_to_send', creatorLang, { crypto }), value: `\`${cryptoAmountWithBuffer} ${crypto}\``, inline: false }
      )
      .setImage(qrUrl)
      .setFooter({ text: `Deal #${ticketNumber || deal.dealNumber} | ${crypto} | ${t('language.includes_all_fees', creatorLang)}` });

    // Copy buttons - in creator's language
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel(t('language.copy_address', creatorLang))
        .setStyle(ButtonStyle.Primary)
        .setCustomId(`copy_addr_${deal.dealNumber}`),
      new ButtonBuilder()
        .setLabel(t('language.copy_amount', creatorLang))
        .setStyle(ButtonStyle.Primary)
        .setCustomId(`copy_amt_${deal.dealNumber}`)
    );

    await channel.send({
      embeds: [summaryEmbed, invoiceEmbed],
      components: [row],
    });

    // Awaiting transaction - in creator's language
    const awaitEmbed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setDescription(t('language.awaiting_tx', creatorLang))
      .setFooter({ text: t('language.payment_status_footer', creatorLang) });

    const rescanRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel(t('language.payment_sent_button', creatorLang))
        .setStyle(ButtonStyle.Success)
        .setCustomId(`rescan_${deal.dealNumber}`)
    );

    await channel.send({ 
      embeds: [awaitEmbed],
      components: [rescanRow],
    });

    logger.info(`Deal #${deal.dealNumber} created in ticket ${channel.name}`);

  } catch (error) {
    logger.error('[DEAL_FLOW] Error creating deal invoice:', error);
    try {
      await channel.send(t('language.failed_create_deal', creatorLang));
    } catch (sendError) {
      logger.error('[DEAL_FLOW] Failed to send error message to channel:', sendError);
    }
  }
}
