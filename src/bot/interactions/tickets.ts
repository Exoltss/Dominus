import {
  Client,
  Interaction,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
  OverwriteResolvable,
} from 'discord.js';
import { logger } from '../../utils/logger';
import { startDealFlow } from './deal-flow';
import { PrismaClient } from '@prisma/client';
import { BlockchainFactory } from '../../blockchain/factory';
import { t } from '../../i18n/translator';

const prisma = new PrismaClient();

// Track active tickets per user
const activeTickets = new Map<string, string>(); // userId -> channelId

export function registerTicketHandler(client: Client) {
  // Admin select menu handler
  client.on('interactionCreate', async (interaction: Interaction) => {
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId !== 'admin_select_deal') return;

    try {
      const dealNumber = parseInt(interaction.values[0]);
      
      const deal = await prisma.deal.findFirst({
        where: { dealNumber },
        include: {
          wallet: true,
          buyer: true,
          seller: true,
        },
      });

      if (!deal || !deal.wallet) {
        await interaction.reply({
          content: '❌ Deal not found.',
          ephemeral: true,
        });
        return;
      }

      // Get balance
      const balance = await BlockchainFactory.getBalance(
        deal.cryptocurrency as any,
        deal.wallet.address
      );

      const detailEmbed = new EmbedBuilder()
        .setColor(0x26AD10)
        .setTitle(`🔧 Deal #${deal.dealNumber} Details`)
        .setDescription(
          `**Status:** ${deal.status}\n` +
          `**Cryptocurrency:** ${deal.cryptocurrency}\n` +
          `**Amount:** $${deal.amount}\n` +
          `**Balance:** ${balance} ${deal.cryptocurrency}\n\n` +
          `**Buyer:** ${deal.buyer.discordTag} (${deal.buyer.discordId})\n` +
          `**Seller:** ${deal.seller.discordTag} (${deal.seller.discordId})\n\n` +
          `**Escrow Address:**\n\`${deal.wallet.address}\``
        )
        .setTimestamp();

      const sendButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`admin_send_${deal.dealNumber}`)
          .setLabel('Send Funds Manually')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('💸')
      );

      await interaction.reply({
        embeds: [detailEmbed],
        components: [sendButton],
        ephemeral: true,
      });

    } catch (error) {
      logger.error('Error in admin select:', error);
      await interaction.reply({
        content: '<:wrong:1469544804206776412> Error loading deal details.',
        ephemeral: true,
      });
    }
  });

  client.on('interactionCreate', async (interaction: Interaction) => {
    if (!interaction.isStringSelectMenu()) return;
    if (!interaction.customId.startsWith('create_ticket')) return;

    // Extract language from customId (create_ticket_es or create_ticket_en)
    const lang = interaction.customId.includes('_es') ? 'es' : 'en';

    try {
      const crypto = interaction.values[0];
      
      // Ignore "SELECT" option
      if (crypto === 'SELECT') {
        await interaction.deferUpdate();
        return;
      }
      
      const guild = interaction.guild;
      const member = interaction.member;

      if (!guild || !member) return;

      // Check if user already has an active ticket
      const existingTicketId = activeTickets.get(interaction.user.id);
      if (existingTicketId) {
        const existingChannel = guild.channels.cache.get(existingTicketId);
        if (existingChannel) {
          await interaction.reply({
            content: lang === 'es' 
              ? `<:wrong:1469544804206776412> Ya tienes una transacción activa: ${existingChannel.toString()}\nPor favor complétala o ciérrala antes de crear una nueva.`
              : `<:wrong:1469544804206776412> You already have an active transaction: ${existingChannel.toString()}\nPlease complete or close it before creating a new one.`,
            ephemeral: true,
          });
          return;
        } else {
          // Channel doesn't exist anymore, clean up
          activeTickets.delete(interaction.user.id);
        }
      }

      if (!guild || !member) return;

      // Try to defer the interaction, but handle if it expires
      try {
        await interaction.deferReply({ ephemeral: true });
      } catch (deferError: any) {
        logger.warn('Interaction defer failed (likely expired):', deferError?.message);
        // If defer fails, we can't continue with this interaction
        return;
      }

      // Create ticket channel
      const ticketNumber = Date.now().toString().slice(-6);
      const channelName = `transaction-${ticketNumber}`;

      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: '1468377343646236927',
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
          {
            id: client.user!.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.ManageChannels,
            ],
          },
        ] as OverwriteResolvable[],
      });

      // Track active ticket
      activeTickets.set(interaction.user.id, ticketChannel.id);

      // Ask for other user with proper language
      const promptEmbed = new EmbedBuilder()
        .setColor(0x26AD10)
        .setTitle(t('tickets.transaction_created_title', lang))
        .setDescription(t('tickets.transaction_created_desc', lang, { user: interaction.user.toString() }))
        .setFooter({ text: `Transaction ID: ${ticketNumber}` });

      const actionButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('support_ticket')
          .setLabel(lang === 'es' ? 'Soporte' : 'Support')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('<:shield3:1469545491761987891>'),
        new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel(lang === 'es' ? 'Cancelar Transacción' : 'Cancel Transaction')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('<:cut:1469545580031115468>')
      );

      await ticketChannel.send({
        embeds: [promptEmbed],
        components: [actionButtons],
      });

      await interaction.editReply({
        content: lang === 'es' 
          ? `<:check:1469545502184968282> Ticket creado: ${ticketChannel.toString()}`
          : `<:check:1469545630957854731> Ticket created: ${ticketChannel.toString()}`,
      });

      // Wait for user response with retry logic
      const filter = (m: any) => m.author.id === interaction.user.id;
      let otherUser = null;
      let attempts = 0;
      const maxAttempts = 5;
      
      while (!otherUser && attempts < maxAttempts) {
        attempts++;
        
        try {
          const collected = await ticketChannel.awaitMessages({
            filter,
            max: 1,
            time: 120000,
            errors: ['time'],
          });

          const response = collected.first();

          if (!response) {
            await ticketChannel.send('<:minus:1470128722676814107> | No response received.');
            continue;
          }

          logger.info(`[Attempt ${attempts}] Received message: "${response.content}" | Mentions: ${response.mentions.users.size}`);

          // Try to get mentioned user
          if (response.mentions.users.size > 0) {
            otherUser = response.mentions.users.first();
            logger.info(`User mentioned: ${otherUser?.tag}`);
          } else if (response.content) {
            // Try to get by ID or mention, cleaning input
            let userId = response.content.trim();
            // Remove mention formatting: <@!1234567890>, <@1234567890>, @1234567890
            userId = userId.replace(/<@!?|@|>| /g, '');
            logger.info(`Trying to fetch user by ID: ${userId}`);
            if (!/^[0-9]{17,20}$/.test(userId)) {
              await ticketChannel.send(lang === 'es'
                ? '<:wrong:1469544804206776412> | El ID proporcionado no es válido. Debe ser solo números.'
                : '<:wrong:1469544804206776412> | The provided ID is not valid. It must be only numbers.');
              continue;
            }
            try {
              otherUser = await client.users.fetch(userId);
              logger.info(`User fetched by ID: ${otherUser.tag}`);
            } catch (err) {
              logger.warn(`Failed to fetch user globally, trying guild members: ${err}`);
              // Try to fetch from guild members if fetch fails
              const guild = ticketChannel.guild;
              if (guild) {
                try {
                  const member = await guild.members.fetch(userId);
                  if (member && member.user) {
                    otherUser = member.user;
                    logger.info(`User found in guild members: ${otherUser.tag}`);
                  }
                } catch (guildErr) {
                  logger.error(`Failed to fetch user from guild members: ${guildErr}`);
                }
              }
              if (!otherUser) {
                await ticketChannel.send(lang === 'es' 
                  ? '<:wrong:1469544804206776412> | Usuario/ID inválido. Por favor intenta de nuevo mencionando al usuario (@username) o proporcionando su ID.'
                  : '<:wrong:1469544804206776412> | Invalid User/ID. Please try again by mentioning the user (@username) or providing their ID.');
                continue;
              }
            }
          }

          if (!otherUser) {
            await ticketChannel.send(lang === 'es'
              ? '<:wrong:1469544804206776412> | Usuario no encontrado. Asegúrate de mencionar al usuario (@username) o proporcionar su ID de Discord. Intenta de nuevo:'
              : '<:wrong:1469544804206776412> | User not found. Make sure to mention the user (@username) or provide their Discord ID. Try again:');
            continue;
          }

          // User found, break the loop
          break;

        } catch (error) {
          if (error instanceof Error && error.message === 'time') {
            await ticketChannel.send(lang === 'es'
              ? '<:wrong:1469544804206776412> | Ticket inactivo. Para iniciar una nueva transacción, por favor cierra este ticket manualmente antes de intentar de nuevo.'
              : '<:wrong:1469544804206776412> | Unactive ticket. To start a new transaction, please close this ticket manually before trying again.');
            logger.error('Timeout waiting for user response');
            return;
          }
          logger.error('Error in user mention loop:', error);
        }
      }

      // Check if we got a valid user after all attempts
      if (!otherUser) {
        await ticketChannel.send(lang === 'es'
          ? '<:wrong:1469544804206776412> | Demasiados intentos fallidos. Por favor cierra este ticket e intenta de nuevo.'
          : '<:wrong:1469544804206776412> | Too many failed attempts. Please close this ticket and try again.');
        return;
      }

      logger.info(`Adding user ${otherUser.tag} to ticket...`);

      // Add other user to ticket
      await ticketChannel.permissionOverwrites.create(otherUser.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });

      await ticketChannel.send(lang === 'es'
        ? `${otherUser.toString()} | Usuario añadido a la transacción actual <:check:1469545502184968282>`
        : `${otherUser.toString()} | User added to current transaction <:check:1469545630957854731>`);

      // Start the deal flow in the ticket with language
      setTimeout(() => {
        startDealFlow(ticketChannel as TextChannel, crypto, ticketNumber, lang);
      }, 2000);

      logger.info(`Transaction created: ${channelName} for ${interaction.user.tag} - ${crypto}`);

    } catch (error) {
      logger.error('Error creating ticket:', error);
      
      // Check if we can edit the reply or need to send a new message
      try {
        if (interaction.deferred) {
          await interaction.editReply({
            content: lang === 'es'
              ? '<:wrong:1469544804206776412> | Error creando el ticket. Por favor intenta de nuevo.'
              : '<:wrong:1469544804206776412> | Error creating ticket. Please try again.',
          });
        } else if (!interaction.replied) {
          await interaction.reply({
            content: lang === 'es'
              ? '<:wrong:1469544804206776412> | Error creando el ticket. Por favor intenta de nuevo.'
              : '<:wrong:1469544804206776412> | Error creating ticket. Please try again.',
            ephemeral: true,
          });
        }
      } catch (replyError) {
        logger.error('Error sending error response to interaction:', replyError);
      }
    }
  });
}

export function registerCloseTicketHandler(client: Client) {
  client.on('interactionCreate', async (interaction: Interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId !== 'close_ticket') return;

    try {
      const closeEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setDescription('<:wrong:1469544804206776412> | Transaction cancelling in 10 seconds.');

      await interaction.reply({ embeds: [closeEmbed] });

      // Remove from active tickets tracking
      const channelId = interaction.channelId;
      for (const [userId, ticketId] of activeTickets.entries()) {
        if (ticketId === channelId) {
          activeTickets.delete(userId);
          logger.info(`Removed active ticket tracking for user ${userId}`);
          break;
        }
      }

      setTimeout(async () => {
        await interaction.channel?.delete();
      }, 10000);

    } catch (error: any) {
      logger.error('Error closing ticket:', error);
      
      // Don't try to respond if interaction expired
      if (error.code === 10062 || error.code === 40060) {
        logger.warn('[TICKETS] Interaction expired while closing ticket');
        return;
      }
      
      // Try to send error message
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: '❌ Error closing ticket | Error cerrando ticket',
            ephemeral: true,
          });
        }
      } catch (replyError) {
        logger.error('[TICKETS] Failed to send error message:', replyError);
      }
    }
  });

  // Support button handler
  client.on('interactionCreate', async (interaction: Interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId !== 'support_ticket') return;

    try {
      const channel = interaction.channel as TextChannel;
      
      if (!channel || channel.type !== ChannelType.GuildText) {
        return;
      }

      // Change channel name to support-
      const currentName = channel.name;
      if (!currentName.startsWith('support-')) {
        const newName = currentName.replace('transaction-', 'support-');
        await channel.setName(newName);
      }

      // Mention support role
      const supportRoleId = '1468371826248908844';
      
      const supportEmbed = new EmbedBuilder()
        .setColor(0x26AD10)
        .setTitle('<:shield3:1469545630957854731> Support Requested')
        .setDescription(
          `<@&${supportRoleId}> A support request has been made.\n\n` +
          `User: ${interaction.user.toString()}\n` +
          `Please assist with this transaction.`
        )
        .setTimestamp();

      await channel.send({
        content: `<@&${supportRoleId}>`,
        embeds: [supportEmbed],
      });

      await interaction.reply({
        content: '<:check:1469545630957854731> Support has been notified!',
        ephemeral: true,
      });

      logger.info(`Support requested in ${channel.name} by ${interaction.user.tag}`);

    } catch (error) {
      logger.error('Error requesting support:', error);
      await interaction.reply({
        content: '<:wrong:1469544804206776412> Error requesting support.',
        ephemeral: true,
      });
    }
  });
}
