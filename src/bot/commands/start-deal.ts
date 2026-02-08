import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ComponentType,
} from 'discord.js';
import { DealService } from '../../escrow/deal.service';
import { logger } from '../../utils/logger';
import { t, createTranslatedEmbed, Language } from '../../i18n/translator';

export const data = new SlashCommandBuilder()
  .setName('start-deal')
  .setDescription('Iniciar una nueva transacción de escrow');

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    // Step 1: Select Language
    const languageEmbed = createTranslatedEmbed(
      {
        color: 0x5865f2,
        titleKey: 'commands.start_deal.select_language',
        descriptionKey: 'commands.start_deal.select_language_desc',
        footerKey: 'commands.start_deal.inactive_footer',
      },
      'es'
    );

    const languageRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('lang_en')
        .setLabel(t('commands.start_deal.language_english', 'en'))
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('lang_es')
        .setLabel(t('commands.start_deal.language_spanish', 'es'))
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      embeds: [languageEmbed],
      components: [languageRow],
    });

    // Wait for language selection
    const langFilter = (i: any) =>
      (i.customId === 'lang_en' || i.customId === 'lang_es') && i.user.id === interaction.user.id;

    const langCollector = interaction.channel?.createMessageComponentCollector({
      filter: langFilter,
      componentType: ComponentType.Button,
      time: 300000,
    });

    langCollector?.on('collect', async (langInteraction) => {
      const selectedLang: Language = langInteraction.customId === 'lang_en' ? 'en' : 'es';

      await langInteraction.update({
        embeds: [languageEmbed],
        components: [],
      });

      // Step 2: Select cryptocurrency
      await selectCryptocurrency(interaction, selectedLang);
    });

    langCollector?.on('end', (collected, reason) => {
      if (reason === 'time') {
        interaction.editReply({
          content: t('commands.start_deal.timeout_deal_cancelled', 'es'),
          embeds: [],
          components: [],
        });
      }
    });
  } catch (error) {
    logger.error('Error in start-deal command:', error);
    await interaction.reply({
      content: t('commands.start_deal.error_creating_deal', 'es'),
      ephemeral: true,
    });
  }
}

async function selectCryptocurrency(
  interaction: ChatInputCommandInteraction,
  lang: Language
) {
  const cryptoEmbed = createTranslatedEmbed(
    {
      color: 0x5865f2,
      titleKey: 'commands.start_deal.select_crypto',
      descriptionKey: 'commands.start_deal.select_crypto_desc',
      footerKey: 'commands.start_deal.inactive_footer',
    },
    lang
  );

  const cryptoSelect = new StringSelectMenuBuilder()
    .setCustomId('crypto_select')
    .setPlaceholder(t('commands.start_deal.select_placeholder', lang))
    .addOptions([
      {
        label: '₿ Bitcoin (BTC)',
        value: 'BTC',
      },
      {
        label: '⟠ Ethereum (ETH)',
        value: 'ETH',
      },
      {
        label: '◎ Solana (SOL)',
        value: 'SOL',
      },
      {
        label: 'Ł Litecoin (LTC)',
        value: 'LTC',
      },
      {
        label: '₮ Tether (USDT)',
        value: 'USDT',
      },
      {
        label: '$ USD Coin (USDC)',
        value: 'USDC',
      },
    ]);

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(cryptoSelect);

  await interaction.followUp({
    embeds: [cryptoEmbed],
    components: [row],
  });

  // Wait for crypto selection
  const filter = (i: any) => i.customId === 'crypto_select' && i.user.id === interaction.user.id;

  const collector = interaction.channel?.createMessageComponentCollector({
    filter,
    componentType: ComponentType.StringSelect,
    time: 300000, // 5 minutes
  });

  collector?.on('collect', async (selectInteraction) => {
    const selectedCrypto = selectInteraction.values[0];

    await selectInteraction.update({
      embeds: [cryptoEmbed],
      components: [],
    });

    // Step 3: Role assignment
    await startRoleAssignment(interaction, selectedCrypto, lang);
  });

  collector?.on('end', (collected, reason) => {
    if (reason === 'time') {
      interaction.editReply({
        content: t('commands.start_deal.timeout_deal_cancelled', lang),
        embeds: [],
        components: [],
      });
    }
  });
}

async function startRoleAssignment(interaction: ChatInputCommandInteraction, crypto: string, lang: Language) {
  const roleEmbed = createTranslatedEmbed(
    {
      color: 0x00ff00,
      titleKey: 'commands.start_deal.sending_or_receiving',
      descriptionKey: 'commands.start_deal.role_description',
      fields: [
        { nameKey: 'commands.start_deal.buyer', valueKey: 'commands.start_deal.none', inline: true },
        { nameKey: 'commands.start_deal.seller', valueKey: 'commands.start_deal.none', inline: true },
      ],
      footerKey: 'commands.start_deal.inactive_footer',
    },
    lang
  );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('buyer_btn')
      .setLabel(t('commands.start_deal.buyer', lang))
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('seller_btn')
      .setLabel(t('commands.start_deal.seller', lang))
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('cancel_btn')
      .setLabel(t('commands.start_deal.cancel', lang))
      .setStyle(ButtonStyle.Danger)
  );

  const roleMsg = await interaction.followUp({
    embeds: [roleEmbed],
    components: [row],
  });

  let buyer: any = null;
  let seller: any = null;

  const btnCollector = roleMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 300000,
  });

  btnCollector.on('collect', async (btnInteraction) => {
    if (btnInteraction.customId === 'buyer_btn') {
      if (btnInteraction.user.id === seller?.id) {
        await btnInteraction.reply({
          content: t('commands.start_deal.cannot_be_both', lang),
          ephemeral: true,
        });
        return;
      }
      buyer = btnInteraction.user;
      await btnInteraction.deferUpdate();
    } else if (btnInteraction.customId === 'seller_btn') {
      if (btnInteraction.user.id === buyer?.id) {
        await btnInteraction.reply({
          content: t('commands.start_deal.cannot_be_both', lang),
          ephemeral: true,
        });
        return;
      }

      const warningEmbed = createTranslatedEmbed(
        {
          color: 0xff0000,
          descriptionKey: 'commands.start_deal.receiver_warning',
        },
        lang
      );

      await btnInteraction.reply({
        embeds: [warningEmbed],
        ephemeral: true,
      });

      seller = btnInteraction.user;
    } else if (btnInteraction.customId === 'cancel_btn') {
      buyer = null;
      seller = null;
      await btnInteraction.deferUpdate();
    }

    // Update embed
    const updatedEmbed = createTranslatedEmbed(
      {
        color: 0x00ff00,
        titleKey: 'commands.start_deal.sending_or_receiving',
        descriptionKey: 'commands.start_deal.role_description',
        fields: [
          {
            nameKey: 'commands.start_deal.buyer',
            value: buyer ? buyer.toString() : t('commands.start_deal.none', lang),
            inline: true,
          },
          {
            nameKey: 'commands.start_deal.seller',
            value: seller ? seller.toString() : t('commands.start_deal.none', lang),
            inline: true,
          },
        ],
        footerKey: 'commands.start_deal.inactive_footer',
      },
      lang
    );

    await roleMsg.edit({ embeds: [updatedEmbed] });

    // If both roles assigned, move to confirmation
    if (buyer && seller) {
      btnCollector.stop('roles_assigned');
      await roleMsg.delete();
      await startRoleConfirmation(interaction, buyer, seller, crypto, lang);
    }
  });
}

async function startRoleConfirmation(
  interaction: ChatInputCommandInteraction,
  buyer: any,
  seller: any,
  crypto: string,
  lang: Language
) {
  const confirmEmbed = createTranslatedEmbed(
    {
      color: 0x00ff00,
      titleKey: 'commands.start_deal.role_confirmation',
      descriptionKey: 'commands.start_deal.roles_assigned',
      fields: [
        { nameKey: 'commands.start_deal.buyer', value: buyer.toString(), inline: true },
        { nameKey: 'commands.start_deal.seller', value: seller.toString(), inline: true },
      ],
    },
    lang
  );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('confirm_roles')
      .setLabel(t('commands.start_deal.confirm', lang))
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('incorrect_roles')
      .setLabel(t('commands.start_deal.incorrect', lang))
      .setStyle(ButtonStyle.Secondary)
  );

  const confirmMsg = await interaction.followUp({
    embeds: [confirmEmbed],
    components: [row],
  });

  const confirmed = new Set<string>();

  const collector = confirmMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 300000,
  });

  collector.on('collect', async (btnInteraction) => {
    if (btnInteraction.customId === 'confirm_roles') {
      if (btnInteraction.user.id !== buyer.id && btnInteraction.user.id !== seller.id) {
        await btnInteraction.reply({
          content: t('commands.start_deal.not_part_of_deal', lang),
          ephemeral: true,
        });
        return;
      }

      if (confirmed.has(btnInteraction.user.id)) {
        await btnInteraction.reply({
          content: t('commands.start_deal.role_already_confirmed', lang),
          ephemeral: true,
        });
        return;
      }

      confirmed.add(btnInteraction.user.id);
      await btnInteraction.reply({
        content: t('commands.start_deal.role_confirmed', lang),
        ephemeral: true,
      });

      if (confirmed.size === 2) {
        collector.stop('both_confirmed');
        await confirmMsg.delete();
        await requestAmount(interaction, buyer, seller, crypto, lang);
      }
    } else if (btnInteraction.customId === 'incorrect_roles') {
      await btnInteraction.update({
        content: t('commands.start_deal.role_cancelled', lang),
        embeds: [],
        components: [],
      });
      collector.stop();
    }
  });
}

async function requestAmount(
  interaction: ChatInputCommandInteraction,
  buyer: any,
  seller: any,
  crypto: string,
  lang: Language
) {
  const amountEmbed = createTranslatedEmbed(
    {
      color: 0xffd700,
      titleKey: 'commands.start_deal.total_amount',
      descriptionKey: 'commands.start_deal.enter_amount',
      vars: { buyer: buyer.toString() },
      footerKey: 'commands.start_deal.inactive_footer',
    },
    lang
  );

  await interaction.followUp({
    embeds: [amountEmbed],
  });

  const filter = (m: any) => {
    const content = m.content.replace('$', '').trim();
    return (
      m.author.id === buyer.id &&
      m.channel.id === interaction.channel?.id &&
      !isNaN(parseFloat(content))
    );
  };

  try {
    const channel = interaction.channel as any;
    const collected = await channel.awaitMessages({
      filter,
      max: 1,
      time: 120000,
      errors: ['time'],
    });

    const amountMsg = collected?.first();
    let amount = amountMsg?.content.replace('$', '').trim() || '0';
    amount = parseFloat(amount).toFixed(2);

    await amountMsg?.delete();

    await confirmAmount(interaction, buyer, seller, crypto, amount, lang);
  } catch (error) {
    await interaction.followUp({
      content: t('commands.start_deal.timeout_no_amount', lang),
    });
  }
}

async function confirmAmount(
  interaction: ChatInputCommandInteraction,
  buyer: any,
  seller: any,
  crypto: string,
  amount: string,
  lang: Language
) {
  const confirmEmbed = createTranslatedEmbed(
    {
      color: 0x00ff00,
      titleKey: 'commands.start_deal.confirm_amount',
      descriptionKey: 'commands.start_deal.confirm_trade_value',
      fields: [{ nameKey: 'commands.start_deal.amount', value: `$${amount}` }],
    },
    lang
  );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('confirm_amount')
      .setLabel(t('commands.start_deal.confirm', lang))
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('cancel_amount')
      .setLabel(t('commands.start_deal.cancel', lang))
      .setStyle(ButtonStyle.Danger)
  );

  const msg = await interaction.followUp({
    embeds: [confirmEmbed],
    components: [row],
  });

  const confirmed = new Set<string>();

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 120000,
  });

  collector.on('collect', async (btnInteraction) => {
    if (btnInteraction.customId === 'confirm_amount') {
      if (btnInteraction.user.id !== buyer.id && btnInteraction.user.id !== seller.id) {
        await btnInteraction.reply({
          content: t('commands.start_deal.not_part_of_deal', lang),
          ephemeral: true,
        });
        return;
      }

      if (confirmed.has(btnInteraction.user.id)) {
        await btnInteraction.reply({
          content: t('commands.start_deal.amount_already_confirmed', lang),
          ephemeral: true,
        });
        return;
      }

      confirmed.add(btnInteraction.user.id);
      await btnInteraction.reply({
        content: t('commands.start_deal.amount_confirmed', lang),
        ephemeral: true,
      });

      if (confirmed.size === 2) {
        collector.stop('both_confirmed');
        await msg.delete();
        await selectFeePayer(interaction, buyer, seller, crypto, amount, lang);
      }
    } else if (btnInteraction.customId === 'cancel_amount') {
      await btnInteraction.update({
        content: t('commands.start_deal.amount_cancelled', lang),
        embeds: [],
        components: [],
      });
      collector.stop();
    }
  });
}

async function selectFeePayer(
  interaction: ChatInputCommandInteraction,
  buyer: any,
  seller: any,
  crypto: string,
  amount: string,
  lang: Language
) {
  const amountNum = parseFloat(amount);
  let feeAmount = 0;

  if (amountNum < 10) {
    feeAmount = 0;
  } else if (amountNum < 100) {
    feeAmount = 1;
  } else if (amountNum < 500) {
    feeAmount = 2;
  } else {
    feeAmount = 5;
  }

  if (feeAmount === 0) {
    await createDealAndShowInvoice(interaction, buyer, seller, crypto, amount, 'none', 0, lang);
    return;
  }

  const feeEmbed = createTranslatedEmbed(
    {
      color: 0xd3d3d3,
      titleKey: 'commands.start_deal.fee_payment',
      descriptionKey: 'commands.start_deal.fee_select_desc',
      fields: [{ nameKey: 'commands.start_deal.fee', value: `$${feeAmount.toFixed(2)}` }],
      footer: t('commands.help.fee_info', lang),
    },
    lang
  );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('buyer_pays')
      .setLabel(t('commands.start_deal.buyer_pays', lang))
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('seller_pays')
      .setLabel(t('commands.start_deal.seller_pays', lang))
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('split_fee')
      .setLabel(t('commands.start_deal.split_fee', lang))
      .setStyle(ButtonStyle.Secondary)
  );

  const msg = await interaction.followUp({
    embeds: [feeEmbed],
    components: [row],
  });

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 120000,
  });

  collector.on('collect', async (btnInteraction) => {
    let feePayer = 'none';
    if (btnInteraction.customId === 'buyer_pays') feePayer = 'buyer';
    else if (btnInteraction.customId === 'seller_pays') feePayer = 'seller';
    else if (btnInteraction.customId === 'split_fee') feePayer = 'split';

    await btnInteraction.deferUpdate();
    collector.stop();
    await msg.delete();

    await createDealAndShowInvoice(interaction, buyer, seller, crypto, amount, feePayer, feeAmount, lang);
  });
}

async function createDealAndShowInvoice(
  interaction: ChatInputCommandInteraction,
  buyer: any,
  seller: any,
  crypto: string,
  amount: string,
  feePayer: string,
  feeAmount: number,
  lang: Language
) {
  try {
    // Create deal and generate wallet
    const { deal, wallet } = await DealService.createDeal({
      buyerDiscordId: buyer.id,
      buyerDiscordTag: buyer.tag,
      sellerDiscordId: seller.id,
      sellerDiscordTag: seller.tag,
      cryptocurrency: crypto as any,
      amount,
      description: `Deal #${Date.now()}`,
      creatorLanguage: lang,
    });

    // Deal Summary
    const feeDisplay =
      feeAmount === 0
        ? t('commands.start_deal.fee_info_field', lang)
        : t('commands.start_deal.fee_paid_by', lang, { fee: feeAmount.toFixed(2), payer: feePayer });

    const summaryEmbed = createTranslatedEmbed(
      {
        color: 0xd3d3d3,
        titleKey: 'commands.start_deal.deal_summary',
        descriptionKey: 'commands.start_deal.deal_summary_desc',
        fields: [
          { nameKey: 'commands.start_deal.buyer', value: buyer.toString(), inline: true },
          { nameKey: 'commands.start_deal.seller', value: seller.toString(), inline: true },
          { nameKey: 'commands.start_deal.deal_value', value: `$${amount}`, inline: true },
          { nameKey: 'commands.start_deal.coin', value: `${crypto}`, inline: true },
          { nameKey: 'commands.start_deal.fee', value: feeDisplay, inline: false },
          { nameKey: 'commands.start_deal.deal_id', value: `#${deal.dealNumber}`, inline: false },
        ],
        thumbnail: 'https://media.discordapp.net/attachments/1153826027714379866/1264288616801243156/Summary_Anim.gif',
      },
      lang
    );

    // Calculate final amount
    let finalAmount = parseFloat(amount);
    if (feePayer === 'buyer') {
      finalAmount += feeAmount;
    } else if (feePayer === 'split') {
      finalAmount += feeAmount / 2;
    }

    // Payment Invoice
    const invoiceEmbed = createTranslatedEmbed(
      {
        color: 0xd3d3d3,
        titleKey: 'commands.start_deal.review_payment',
        descriptionKey: 'commands.start_deal.review_payment_desc',
        fields: [
          { nameKey: 'commands.start_deal.address', value: `\`${wallet.address}\``, inline: false },
          { nameKey: 'commands.start_deal.amount', value: `$${finalAmount.toFixed(2)} USD`, inline: false },
        ],
        footer: `Deal #${deal.dealNumber} | ${crypto}`,
      },
      lang
    );

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${wallet.address}`;
    invoiceEmbed.setThumbnail(qrUrl);

    // Copy buttons
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel(t('commands.start_deal.copy_address', lang))
        .setStyle(ButtonStyle.Primary)
        .setCustomId(`copy_address_${deal.dealNumber}`),
      new ButtonBuilder()
        .setLabel(t('commands.start_deal.copy_amount', lang))
        .setStyle(ButtonStyle.Primary)
        .setCustomId(`copy_amount_${deal.dealNumber}`)
    );

    await interaction.followUp({
      embeds: [summaryEmbed, invoiceEmbed],
      components: [row],
    });

    // Awaiting transaction message
    const awaitEmbed = createTranslatedEmbed(
      {
        color: 0xff0000,
        descriptionKey: 'commands.start_deal.awaiting_transaction',
        footerKey: 'commands.start_deal.payment_status_footer',
      },
      lang
    );

    await interaction.followUp({ embeds: [awaitEmbed] });

    logger.info(`Deal #${deal.dealNumber} invoice sent`);
  } catch (error) {
    logger.error('Error creating deal:', error);
    await interaction.followUp({
      content: t('commands.start_deal.failed_create_deal', lang),
    });
  }
}
