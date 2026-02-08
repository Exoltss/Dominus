import { Client, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, GuildMember } from 'discord.js';
import { logger } from '../../utils/logger';
import { registerButtonHandlers } from '../interactions/buttons';
import { registerTicketHandler, registerCloseTicketHandler } from '../interactions/tickets';
import { registerXToolsHandlers } from '../interactions/xtools';
import { registerInfoDominusHandlers } from '../commands/info-dominus';
import { t, createTranslatedEmbed } from '../../i18n/translator';

export function registerEvents(client: Client) {
  client.once('ready', () => {
    logger.info(`✅ Bot conectado como ${client.user?.tag}`);
    logger.info(`🔗 Conectado a ${client.guilds.cache.size} servidor(es)`);
    
    // Set bot status
    client.user?.setPresence({
      activities: [{ name: '🔒 Protecting your deals', type: 3 }],
      status: 'online',
    });
  });

  // Panel message listener
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    const content = message.content.toLowerCase();
    const member = message.member;

    // Panel command
    if (content === 'panel') {
      // Check if user has admin permissions
      if (!member?.permissions.has(PermissionFlagsBits.Administrator)) {
        return; // Silently ignore non-admins
      }

      try {
        const lang = 'en'; // Default language - can be changed to 'en'
        
        const panelEmbed = new EmbedBuilder()
          .setColor(0x26AD10)
          .setTitle(t('commands.panel.title', lang))
          .setDescription(t('commands.panel.description_text', lang))
          .setThumbnail(message.guild?.iconURL() || '')
          .setFooter({ text: t('commands.panel.footer_text', lang) })
          .setImage('https://media.discordapp.net/attachments/1470047221364949163/1470140115270504661/standard_2.gif');

        const cryptoSelect = new StringSelectMenuBuilder()
          .setCustomId('create_ticket')
          .setPlaceholder(t('commands.panel.select_placeholder', lang))
          .addOptions([
            {
              label: '<:sec:1469544385057128640> Select Currency',
              description: 'Choose a cryptocurrency to start',
              value: 'SELECT',
              default: true,
            },
            {
              label: '<:bitcoin:1470055178337128582> Bitcoin (BTC)',
              description: 'Create Bitcoin escrow deal',
              value: 'BTC',
            },
            {
              label: '<:eth:1469542703091155189> Ethereum (ETH)',
              description: 'Create Ethereum escrow deal',
              value: 'ETH',
            },
            {
              label: '<:solana:1469543005038968965> Solana (SOL)',
              description: 'Create Solana escrow deal',
              value: 'SOL',
            },
            {
              label: '<:litecoin:1469543266608480400> Litecoin (LTC)',
              description: 'Create Litecoin escrow deal',
              value: 'LTC',
            },
            {
              label: '<:tether:1469543477309345852> Tether (USDT)',
              description: 'Create USDT escrow deal',
              value: 'USDT',
            },
            {
              label: '<:usd:1469543935297716415> USD Coin (USDC)',
              description: 'Create USDC escrow deal',
              value: 'USDC',
            },
          ]);

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(cryptoSelect);

        await message.channel.send({
          embeds: [panelEmbed],
          components: [row],
        });

        // Delete the "panel" message
        await message.delete().catch(() => {});

        logger.info(`Panel created by ${message.author.tag}`);
      } catch (error) {
        logger.error('Error creating panel:', error);
      }
    }

    // Verify command
    if (content === 'verify') {
      // Check if user has admin permissions
      if (!member?.permissions.has(PermissionFlagsBits.Administrator)) {
        return; // Silently ignore non-admins
      }

      try {
        const verifyEmbed = new EmbedBuilder()
          .setColor(0x26AD10)
          .setTitle('🌐 Welcome to Dominus | Bienvenido a Dominus')
          .setDescription(
            '**Select your preferred default language / Selecciona tu idioma preferido por default **\n\n' +
            '🇺🇸 Click "English" to verify and set the default language to English.\n\n' +
            '🇪🇸 Haz click en "Español" para verificarte y poner el idioma por defecto en Español.'
          )
          .setThumbnail(message.guild?.iconURL() || '')
          .setFooter({ text: 'Dominus Bot | Automatic MM | Deals under $10 are free! | Cheap fees | Fast & Secured transactions' });

        const verifyButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId('verify_user_en')
            .setLabel('English | Verification')
            .setStyle(ButtonStyle.Success)
            .setEmoji('<:right:1469544658525753365>'),
          new ButtonBuilder()
            .setCustomId('verify_user_es')
            .setLabel('Español | Verificación')
            .setStyle(ButtonStyle.Success)
            .setEmoji('<:right:1469544658525753365>')
        );

        await message.channel.send({
          embeds: [verifyEmbed],
          components: [verifyButtons],
        });

        // Delete the "verify" message
        await message.delete().catch(() => {});

        logger.info(`Verify panel created by ${message.author.tag}`);
      } catch (error) {
        logger.error('Error creating verify panel:', error);
      }
    }

    // Support Panel command (admin only)
    if (content === 'supportpanel' || content === 'supportpannel') {
      // Check if user has admin role
      const adminRoleId = '1468654239550144542';
      if (!member?.roles.cache.has(adminRoleId)) {
        return; // Silently ignore
      }

      try {
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();

        // Get all deals with funds
        const dealsWithFunds = await prisma.deal.findMany({
          where: {
            status: {
              in: ['DEPOSITED', 'CREATED'],
            },
          },
          include: {
            wallet: true,
            buyer: true,
            seller: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 25,
        });

        if (dealsWithFunds.length === 0) {
          await message.reply('✅ No active deals with funds in escrow.');
          await message.delete().catch(() => {});
          return;
        }

        const adminEmbed = new EmbedBuilder()
          .setColor(0x26AD10)
          .setTitle('🔧 Support Panel - Active Escrow Deals')
          .setDescription(
            `Found **${dealsWithFunds.length}** deal(s) with funds.\n\n` +
            `Select a deal below to manage it.`
          )
          .setTimestamp();

        // Add fields for each deal
        dealsWithFunds.slice(0, 10).forEach(deal => {
          adminEmbed.addFields({
            name: `Deal #${deal.dealNumber} - ${deal.cryptocurrency}`,
            value: 
              `Status: \`${deal.status}\`\n` +
              `Amount: $${deal.amount}\n` +
              `Wallet: \`${deal.wallet?.address.substring(0, 20)}...\`\n` +
              `Buyer: ${deal.buyer.discordTag}\n` +
              `Seller: ${deal.seller.discordTag}`,
            inline: false,
          });
        });

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('admin_select_deal')
          .setPlaceholder('Select a deal to manage')
          .addOptions(
            dealsWithFunds.slice(0, 25).map(deal => ({
              label: `Deal #${deal.dealNumber} - ${deal.cryptocurrency}`,
              description: `$${deal.amount} - Status: ${deal.status}`,
              value: deal.dealNumber.toString(),
            }))
          );

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

        await message.channel.send({
          embeds: [adminEmbed],
          components: [row],
        });

        // Delete the command message
        await message.delete().catch(() => {});

        logger.info(`Support panel created by ${message.author.tag}`);

      } catch (error) {
        logger.error('Error creating support panel:', error);
      }
    }
  });

  // Register handlers
  registerButtonHandlers(client);
  registerTicketHandler(client);
  registerCloseTicketHandler(client);
  registerXToolsHandlers(client);

  // Auto-role for new members
  client.on('guildMemberAdd', async (member) => {
    try {
      const unverifiedRoleId = '1468371674775687381';
      const role = member.guild.roles.cache.get(unverifiedRoleId);
      
      if (role) {
        await member.roles.add(role);
        logger.info(`Added unverified role to ${member.user.tag}`);
      } else {
        logger.warn(`Unverified role ${unverifiedRoleId} not found`);
      }
    } catch (error) {
      logger.error('Error adding auto-role to new member:', error);
    }
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = (client as any).commands.get(interaction.commandName);

    if (!command) {
      logger.warn(`Comando no encontrado: ${interaction.commandName}`);
      return;
    }

    try {
      await command.execute(interaction);
      logger.info(
        `Comando ejecutado: ${interaction.commandName} por ${interaction.user.tag}`
      );
    } catch (error) {
      logger.error(`Error ejecutando ${interaction.commandName}:`, error);
      
      const errorMessage = {
        content: '❌ | Command execution failed..',
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  });

  client.on('error', (error) => {
    logger.error('Error del cliente de Discord:', error);
  });

  client.on('warn', (warning) => {
    logger.warn('Advertencia del cliente de Discord:', warning);
  });
  
  // Register info-dominus handlers
  registerInfoDominusHandlers(client);
}
