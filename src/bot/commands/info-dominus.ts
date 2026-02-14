import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  Interaction,
} from 'discord.js';
import { logger } from '../../utils/logger';
import { createTranslatedEmbed } from '../../i18n/translator';

export const data = new SlashCommandBuilder()
  .setName('info-dominus')
  .setDescription('Información sobre Dominus y cómo usar el servicio de escrow');

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    // Defer reply ephemeral
    await interaction.deferReply({ ephemeral: true });

    // First step: Language selection
    const languageEmbed = createTranslatedEmbed(
      {
        color: 0x26AD10,
        title: 'Select Language / Seleccionar Idioma',
        description: '**<:home:1469545532706918617>    Please select your preferred language:**\n<:home:1469545532706918617>    **Por favor selecciona tu idioma preferido:**',
        thumbnail: interaction.guild?.iconURL() || '',
      },
      'es'
    );

    const languageRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('info_dominus_en')
        .setLabel('English')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🇺🇸'),
      new ButtonBuilder()
        .setCustomId('info_dominus_es')
        .setLabel('Español')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🇪🇸'),
    );

    // Send to channel
    if (interaction.channel && 'send' in interaction.channel) {
      await interaction.channel.send({
        embeds: [languageEmbed],
        components: [languageRow],
      });
      
      // Confirm to user silently
      await interaction.editReply({
        content: '✅ Panel de información enviado!',
      });
    }

    logger.info(`Info panel sent by ${interaction.user.tag}`);
  } catch (error) {
    logger.error('Error showing Dominus info:', error);
    await interaction.editReply({
      content: '❌ Error al mostrar la información. Intenta de nuevo.',
    });
  }
}

// Register handler for language selection buttons
export function registerInfoDominusHandlers(client: Client) {
  client.on('interactionCreate', async (interaction: Interaction) => {
    if (!interaction.isButton()) return;
    
    if (interaction.customId === 'info_dominus_es' || interaction.customId === 'info_dominus_en') {
      const lang = interaction.customId === 'info_dominus_es' ? 'es' : 'en';
      
      try {
        const infoEmbed = new EmbedBuilder()
          .setColor(0x26AD10)
          .setTitle(lang === 'es' ? '🛡️ ¿Qué es Dominus?' : '🛡️ What is Dominus?')
          .setDescription(
            lang === 'es'
              ? '**Dominus** es un servicio automatizado de **Middle-Man (Intermediario)** que protege tus transacciones de criptomonedas.\n\n' +
                '### ¿Cómo Funciona?\n\n' +
                '**1️⃣ Crear Deal**\n' +
                'El comprador crea una transacción seleccionando la criptomoneda y el monto.\n\n' +
                '**2️⃣ Depósito Seguro**\n' +
                'El comprador envía los fondos a una wallet de escrow generada automáticamente.\n\n' +
                '**3️⃣ Entrega del Producto**\n' +
                'El vendedor entrega el producto/servicio al comprador.\n\n' +
                '**4️⃣ Liberación de Fondos**\n' +
                'Una vez confirmado, el comprador libera los fondos al vendedor de forma segura.'
              : '**Dominus** is an automated **Middle-Man** service that protects your cryptocurrency transactions.\n\n' +
                '### How Does It Work?\n\n' +
                '**1️⃣ Create Deal**\n' +
                'The buyer creates a transaction by selecting the cryptocurrency and amount.\n\n' +
                '**2️⃣ Safe Deposit**\n' +
                'The buyer sends funds to an automatically generated escrow wallet.\n\n' +
                '**3️⃣ Product Delivery**\n' +
                'The seller delivers the product/service to the buyer.\n\n' +
                '**4️⃣ Fund Release**\n' +
                'Once confirmed, the buyer releases the funds to the seller safely.'
          )
          .addFields(
            {
              name: lang === 'es' ? '💎 Criptomonedas Soportadas' : '💎 Supported Cryptocurrencies',
              value: 
                '₿ **Bitcoin (BTC)**\n' +
                '⟠ **Ethereum (ETH)**\n' +
                '◎ **Solana (SOL)**\n' +
                'Ł **Litecoin (LTC)**\n' +
                '₮ **Tether (USDT)**\n' +
                '$ **USD Coin (USDC)**',
              inline: true,
            },
            {
              name: lang === 'es' ? '💰 Tarifas Competitivas' : '💰 Competitive Fees',
              value:
                '• **-$10 USD:** ' + (lang === 'es' ? 'Gratis' : 'Free') + '\n' +
                '• **-$100 USD:** $1.00\n' +
                '• **-$200 USD:** $2.00\n' +
                '• **+$200 USD:** 2%',
              inline: true,
            },
            {
              name: lang === 'es' ? '✅ Ventajas de Usar Dominus' : '✅ Advantages of Using Dominus',
              value:
                lang === 'es'
                  ? '🔒 **Seguridad Total** - Tus fondos están protegidos\n' +
                    '⚡ **Automatizado** - Sin intervención manual\n' +
                    '🌍 **24/7 Disponible** - Servicio siempre activo\n' +
                    '💵 **Multi-Crypto** - 6 criptomonedas soportadas\n' +
                    '📊 **Transparente** - Tracking completo de transacciones'
                  : '🔒 **Total Security** - Your funds are protected\n' +
                    '⚡ **Automated** - No manual intervention\n' +
                    '🌍 **24/7 Available** - Always active service\n' +
                    '💵 **Multi-Crypto** - 6 cryptocurrencies supported\n' +
                    '📊 **Transparent** - Complete transaction tracking',
              inline: false,
            },
            {
              name: lang === 'es' ? '🚀 ¿CÓMO EMPEZAR?' : '🚀 HOW TO START?',
              value:
                lang === 'es'
                  ? '**1. Ve al canal** <#1468371643159019615> **y selecciona tu idioma**\n' +
                    '**2. Elige la criptomoneda que usarás**\n' +
                    '**3. Añade al otro usuario con quien harás la transacción**\n' +
                    '**4. ¡Sigue las instrucciones del bot!**'
                  : '**1. Go to** <#1468371643159019615> **and select your language**\n' +
                    '**2. Choose the cryptocurrency you will use**\n' +
                    '**3. Add the other user you will transact with**\n' +
                    '**4. Follow the bot instructions!**',
              inline: false,
            }
          )
          .setImage('https://media.discordapp.net/attachments/1470047221364949163/1470140115270504661/standard_2.gif')
          .setFooter({ 
            text: lang === 'es' 
              ? '✨ Dominus - Tu Seguridad es Nuestra Prioridad'
              : '✨ Dominus - Your Security is Our Priority'
          })

        await interaction.reply({
          embeds: [infoEmbed],
          ephemeral: true,
        });

        logger.info(`${interaction.user.tag} viewed Dominus info in ${lang}`);
      } catch (error: any) {
        logger.error('Error showing info panel:', error);
        
        // Don't try to respond if interaction expired
        if (error.code === 10062 || error.code === 40060) {
          logger.warn('[INFO-DOMINUS] Interaction expired');
          return;
        }
        
        try {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content: '❌ Error al mostrar la información / Error showing information',
              ephemeral: true,
            });
          }
        } catch (replyError) {
          logger.error('[INFO-DOMINUS] Failed to send error message:', replyError);
        }
      }
    }
  });
}
