import { Client, Interaction, EmbedBuilder, TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle, GuildMember, StringSelectMenuBuilder } from 'discord.js';
import { logger } from '../../utils/logger';
import { PrismaClient } from '@prisma/client';
import { BlockchainFactory } from '../../blockchain/factory';
import { t, createTranslatedEmbed } from '../../i18n/translator';
import type { Language } from '../../i18n/translator';

const prisma = new PrismaClient();

export function registerButtonHandlers(client: Client) {
  client.on('interactionCreate', async (interaction: Interaction) => {
    if (!interaction.isButton()) return;

    // Language selector for panel - NOW REPLACES with the crypto panel
    if (interaction.customId === 'panel_select_es' || interaction.customId === 'panel_select_en') {
      const lang = interaction.customId === 'panel_select_es' ? 'es' : 'en';
      
      try {
        const panelEmbed = createTranslatedEmbed(
          {
            color: 0x26AD10,
            titleKey: 'commands.panel.title',
            descriptionKey: 'commands.panel.description_text',
            thumbnail: interaction.guild?.iconURL() || '',
            footerKey: 'commands.panel.footer_text',
          },
          lang
        ).setImage('https://media.discordapp.net/attachments/1470047221364949163/1470140115270504661/standard_2.gif');

        const cryptoSelect = new StringSelectMenuBuilder()
          .setCustomId(`create_ticket_${lang}`)
          .setPlaceholder(t('commands.panel.select_placeholder', lang))
          .addOptions([
            {
              label: '<:bitcoin:1470055178337128582> Bitcoin (BTC)',
              description: lang === 'es' ? 'Crear deal de Bitcoin' : 'Create Bitcoin escrow deal',
              value: 'BTC',
            },
            {          
              label: '<:eth:1469542703091155189> Ethereum (ETH)',
              description: lang === 'es' ? 'Crear deal de Ethereum' : 'Create Ethereum escrow deal',
              value: 'ETH',
            },
            {
              label: '<:solana:1469543005038968965> Solana (SOL)',
              description: lang === 'es' ? 'Crear deal de Solana' : 'Create Solana escrow deal',
              value: 'SOL',
            },
            {
              label: '<:litecoin:1469543266608480400> Litecoin (LTC)',
              description: lang === 'es' ? 'Crear deal de Litecoin' : 'Create Litecoin escrow deal',
              value: 'LTC',
            },
            {
              label: '<:tether:1469543477309345852> Tether (USDT)',
              description: lang === 'es' ? 'Crear deal de USDT' : 'Create USDT escrow deal',
              value: 'USDT',
            },
            {
              label: '<:usd:1469543935297716415> USD Coin (USDC)',
              description: lang === 'es' ? 'Crear deal de USDC' : 'Create USDC escrow deal',
              value: 'USDC',
            },
          ]);

        const cryptoRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(cryptoSelect);

        await interaction.reply({
          embeds: [panelEmbed],
          components: [cryptoRow],
          ephemeral: true,
        });

        logger.info(`Panel shown in ${lang} for ${interaction.user.tag}`);
      } catch (error: any) {
        logger.error('Error showing panel:', error);
        
        // Try to respond with error message
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: '❌ Error al mostrar el panel | Error showing panel\n\nError: ' + error.message,
            ephemeral: true,
          });
        } else {
          await interaction.followUp({
            content: '❌ Error al mostrar el panel | Error showing panel\n\nError: ' + error.message,
            ephemeral: true,
          });
        }
      }
      return;
    }

    // Copy Address button
    if (interaction.customId.startsWith('copy_addr_')) {
      const dealNumber = interaction.customId.replace('copy_addr_', '');
      
      try {
        const deal = await prisma.deal.findFirst({
          where: { dealNumber: parseInt(dealNumber) },
          include: { wallet: true, buyer: true },
        });

        // Get user's language preference from deal
        const lang: Language = interaction.user.id === deal?.buyer.discordId && deal?.buyerLanguage
          ? (deal.buyerLanguage as Language)
          : (deal?.creatorLanguage as Language) || 'es';

        if (deal?.wallet) {
          await interaction.reply({
            content: t('language.address_copied', lang, { address: deal.wallet.address }),
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: t('language.address_not_found', lang),
            ephemeral: true,
          });
        }
      } catch (error) {
        logger.error('Error copying address:', error);
        await interaction.reply({
          content: t('language.error_retrieving_address', 'es'),
          ephemeral: true,
        });
      }
    }

    // Copy Amount button
    if (interaction.customId.startsWith('copy_amt_')) {
      const dealNumber = interaction.customId.replace('copy_amt_', '');
      
      try {
        const deal = await prisma.deal.findFirst({
          where: { dealNumber: parseInt(dealNumber) },
          include: { buyer: true },
        });

        // Get user's language preference from deal
        const lang: Language = interaction.user.id === deal?.buyer.discordId && deal?.buyerLanguage
          ? (deal.buyerLanguage as Language)
          : (deal?.creatorLanguage as Language) || 'es';

        if (deal) {
          await interaction.reply({
            content: t('language.amount_copied', lang, { amount: deal.amount }),
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: t('language.deal_not_found', lang),
            ephemeral: true,
          });
        }
      } catch (error) {
        logger.error('Error copying amount:', error);
        await interaction.reply({
          content: t('language.error_retrieving_amount', 'es'),
          ephemeral: true,
        });
      }
    }

    // Rescan Payment button
    if (interaction.customId.startsWith('rescan_')) {
      const dealNumber = interaction.customId.replace('rescan_', '');
      
      await interaction.deferReply({ ephemeral: true });

      try {
        const deal = await prisma.deal.findFirst({
          where: { dealNumber: parseInt(dealNumber) },
          include: { wallet: true, buyer: true },
        });

        // Get user's language preference
        const lang: Language = interaction.user.id === deal?.buyer.discordId && deal?.buyerLanguage
          ? (deal.buyerLanguage as Language)
          : (deal?.creatorLanguage as Language) || 'es';

        if (!deal || !deal.wallet) {
          await interaction.editReply({
            content: t('language.deal_wallet_not_found', lang),
          });
          return;
        }

        // Check balance on blockchain
        const balance = await BlockchainFactory.getBalance(
          deal.cryptocurrency as any,
          deal.wallet.address
        );

        const balanceNum = parseFloat(balance);
        
        // Convert expected USD amount to crypto for comparison
        const expectedUsd = parseFloat(deal.amount);
        const { convertUsdToCrypto } = await import('../../utils/price-converter');
        const expectedCrypto = await convertUsdToCrypto(expectedUsd, deal.cryptocurrency);
        
        // Allow 2% tolerance for price fluctuations
        const tolerance = expectedCrypto * 0.02;
        const minAcceptable = expectedCrypto - tolerance;
        
        if (balanceNum >= minAcceptable) {
          // Payment received!
          await prisma.deal.update({
            where: { id: deal.id },
            data: { status: 'DEPOSITED' },
          });

          const successEmbed = new EmbedBuilder()
            .setColor(0x26AD10)
            .setTitle(t('language.payment_confirmed_title', deal.creatorLanguage as Language || 'es'))
            .setDescription(
              t('language.payment_confirmed_desc', deal.creatorLanguage as Language || 'es', {
                balance,
                crypto: deal.cryptocurrency
              })
            )
            .setTimestamp();

          const releaseButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(`release_funds_${deal.dealNumber}`)
              .setLabel(t('language.release_button', deal.creatorLanguage as Language || 'es'))
              .setStyle(ButtonStyle.Success)
              .setEmoji('💰')
          );

          if (interaction.channel && 'send' in interaction.channel) {
            await interaction.channel.send({ 
              embeds: [successEmbed],
              components: [releaseButton],
            });
          }
          
          await interaction.editReply({
            content: t('language.payment_confirmed_check', lang),
          });
        } else {
          await interaction.editReply({
            content: t('language.no_payment_detected', lang, {
              expected: expectedCrypto.toFixed(8),
              crypto: deal.cryptocurrency,
              usd: expectedUsd.toString(),
              received: balance
            }),
          });
        }

        logger.info(`Rescan performed for deal #${dealNumber} - Balance: ${balance}`);

      } catch (error) {
        logger.error('Error rescanning payment:', error);
        await interaction.editReply({
          content: '❌ Error checking payment. The blockchain service may be unavailable.',
        });
      }
    }

    // Release Funds button
    if (interaction.customId.startsWith('release_funds_')) {
      const dealNumber = interaction.customId.replace('release_funds_', '');
      
      try {
        const deal = await prisma.deal.findFirst({
          where: { dealNumber: parseInt(dealNumber) },
          include: { 
            wallet: true,
            buyer: true,
            seller: true,
          },
        });

        // Get language preference
        const lang: Language = interaction.user.id === deal?.buyer.discordId && deal?.buyerLanguage
          ? (deal.buyerLanguage as Language)
          : (deal?.creatorLanguage as Language) || 'es';

        if (!deal) {
          await interaction.reply({
            content: t('language.deal_not_found', lang),
            ephemeral: true,
          });
          return;
        }

        // Verify user is the buyer
        if (interaction.user.id !== deal.buyer.discordId) {
          await interaction.reply({
            content: t('language.only_buyer_release', lang),
            ephemeral: true,
          });
          return;
        }

        // Check if already released
        if (deal.status === 'COMPLETED') {
          await interaction.reply({
            content: t('language.already_released', lang),
            ephemeral: true,
          });
          return;
        }

        // Ask seller for receiving address - use creator's language for public message
        const publicLang = deal.creatorLanguage as Language || 'es';
        const addressEmbed = new EmbedBuilder()
          .setColor(0x26AD10)
          .setTitle(t('language.seller_enter_address_title', publicLang))
          .setDescription(
            t('language.seller_enter_address_desc', publicLang, {
              seller: `<@${deal.seller.discordId}>`,
              crypto: deal.cryptocurrency
            })
          )
          .setFooter({ text: t('language.two_minutes_footer', publicLang) });

        await interaction.reply({ 
          content: `<@${deal.seller.discordId}>`,
          embeds: [addressEmbed] 
        });

        // Wait for address from seller
        const filter = (m: any) => m.author.id === deal.seller.discordId;
        const channel = interaction.channel as TextChannel;

        try {
          const collected = await channel.awaitMessages({
            filter,
            max: 1,
            time: 120000,
            errors: ['time'],
          });

          const addressMsg = collected.first();
          const receivingAddress = addressMsg?.content.trim();

          if (!receivingAddress) {
            await channel.send(t('language.no_address_provided', publicLang));
            return;
          }

          // TODO: Validate address format per crypto

          // Send processing message
          const processingEmbed = new EmbedBuilder()
            .setColor(0xffa500)
            .setDescription(t('language.processing_tx', publicLang));
          
          await channel.send({ embeds: [processingEmbed] });

          try {
            // Get balance from escrow wallet
            const balance = await BlockchainFactory.getBalance(
              deal.cryptocurrency as any,
              deal.wallet!.address
            );

            const balanceNum = parseFloat(balance);
            
            if (balanceNum <= 0) {
              await channel.send(t('language.no_funds_available', publicLang));
              return;
            }

            // Calculate service fee based on deal amount (USD)
            const dealAmountUsd = parseFloat(deal.amount);
            let serviceFeeUsd = 0;
            
            if (dealAmountUsd < 10) {
              serviceFeeUsd = 0; // Free
            } else if (dealAmountUsd < 100) {
              serviceFeeUsd = 1; // $1
            } else if (dealAmountUsd < 200) {
              serviceFeeUsd = 2; // $2
            } else {
              serviceFeeUsd = dealAmountUsd * 0.02; // 2%
            }

            // Convert deal amount (USD) to crypto - this is what seller should get
            const dealCryptoAmount = await import('../../utils/price-converter').then(m => 
              m.convertUsdToCrypto(dealAmountUsd, deal.cryptocurrency)
            );
            
            // Convert service fee (USD) to crypto - this stays in escrow wallet
            const serviceFeeInCrypto = await import('../../utils/price-converter').then(m => 
              m.convertUsdToCrypto(serviceFeeUsd, deal.cryptocurrency)
            );

            // Amount to send to seller = deal amount ONLY (not including service fee)
            const dealCryptoNum = dealCryptoAmount;
            let amountToSend: string = dealCryptoAmount.toString();
            
            logger.info(`Deal #${dealNumber} - Deal: $${dealAmountUsd} | Service Fee: $${serviceFeeUsd.toFixed(2)} (${serviceFeeInCrypto.toFixed(8)} ${deal.cryptocurrency}) | Seller gets: ${dealCryptoAmount} ${deal.cryptocurrency}`);
            
            // For ETH, reserve some for gas
            if (deal.cryptocurrency === 'ETH') {
              const gasReserve = 0.005; // Reserve 0.005 ETH for gas
              // Check if we have enough balance
              if (balanceNum < dealCryptoNum + gasReserve) {
                // Send what we have minus gas
                amountToSend = (balanceNum - gasReserve).toFixed(6);
              }
            } else if (deal.cryptocurrency === 'BTC') {
              // For BTC, use more conservative fee reserve
              const feeReserve = 0.0005; // 50,000 satoshis for fees
              if (balanceNum < dealCryptoNum + feeReserve) {
                amountToSend = (balanceNum - feeReserve).toFixed(8);
              }
            } else if (deal.cryptocurrency === 'LTC') {
              // For LTC, use more conservative fee reserve
              const feeReserve = 0.0005; // 50,000 litoshis for fees
              if (balanceNum < dealCryptoNum + feeReserve) {
                amountToSend = (balanceNum - feeReserve).toFixed(8);
              }
            } else if (deal.cryptocurrency === 'SOL') {
              const feeReserve = 0.001; // Reserve 0.001 SOL for fees
              if (balanceNum < dealCryptoNum + feeReserve) {
                amountToSend = (balanceNum - feeReserve).toFixed(6);
              }
            }

            if (parseFloat(amountToSend) <= 0) {
              await channel.send(t('language.insufficient_funds_fees', publicLang));
              return;
            }

            // Send actual blockchain transaction
            logger.info(`Sending ${amountToSend} ${deal.cryptocurrency} to ${receivingAddress}`);
            
            const txHash = await BlockchainFactory.sendTransaction(
              deal.cryptocurrency as any,
              deal.wallet!.privateKey, // Encrypted private key
              receivingAddress,
              amountToSend
            );

            // Update deal with real transaction hash
            await prisma.deal.update({
              where: { id: deal.id },
              data: { 
                status: 'COMPLETED',
                releaseTxHash: txHash,
                releasedAt: new Date(),
              },
            });

            // Get blockchain explorer link
            let explorerUrl = '';
            switch (deal.cryptocurrency) {
              case 'BTC':
                explorerUrl = `https://blockstream.info/tx/${txHash}`;
                break;
              case 'ETH':
              case 'USDT':
              case 'USDC':
                explorerUrl = `https://etherscan.io/tx/${txHash}`;
                break;
              case 'SOL':
                explorerUrl = `https://explorer.solana.com/tx/${txHash}`;
                break;
              case 'LTC':
                explorerUrl = `https://blockchair.com/litecoin/transaction/${txHash}`;
                break;
            }

            const explorerLink = explorerUrl ? t('language.view_explorer', publicLang, { url: explorerUrl }) : '';

            const completeEmbed = new EmbedBuilder()
              .setColor(0x26AD10)
              .setTitle(t('language.tx_complete_title', publicLang))
              .setDescription(
                t('language.tx_complete_desc', publicLang, {
                  address: receivingAddress,
                  amount: amountToSend,
                  crypto: deal.cryptocurrency,
                  txHash,
                  explorerLink
                })
              )
              .addFields(
                { name: t('language.deal_value', publicLang), value: `$${deal.amount} USD`, inline: true },
                { name: t('language.coin_field', publicLang), value: deal.cryptocurrency, inline: true }
              )
              .setTimestamp();

            await channel.send({ embeds: [completeEmbed] });

            logger.info(`Deal #${dealNumber} completed - Real TX: ${txHash} - Sent to ${receivingAddress}`);

            // Auto-delete channel after 10 minutes
            setTimeout(async () => {
              try {
                if (interaction.channel && 'delete' in interaction.channel) {
                  await interaction.channel.delete();
                  logger.info(`Channel for deal #${dealNumber} auto-deleted after completion`);
                }
              } catch (deleteError) {
                logger.error(`Error auto-deleting channel for deal #${dealNumber}:`, deleteError);
              }
            }, 10 * 60 * 1000); // 10 minutes


          } catch (txError: any) {
            logger.error('Blockchain transaction error:', txError);
            
            await channel.send({
              content: t('language.tx_failed', publicLang, {
                error: txError.message || 'Unknown blockchain error'
              })
            });
            
            return;
          }

        } catch (error) {
          await channel.send(t('language.timeout_no_address', publicLang));
          logger.error('Error waiting for address:', error);
        }

      } catch (error) {
        logger.error('Error releasing funds:', error);
        await interaction.reply({
          content: t('language.error_fund_release', 'es'),
          ephemeral: true,
        });
      }
    }

    // Verify button (English and Spanish)
    if (interaction.customId === 'verify_user_en' || interaction.customId === 'verify_user_es') {
      const lang = interaction.customId === 'verify_user_es' ? 'es' : 'en';
      
      try {
        const member = interaction.member;
        
        if (!member || !(member instanceof GuildMember)) {
          await interaction.reply({
            content: lang === 'es' 
              ? '❌ No se pudo verificar el miembro.'
              : '❌ Could not verify member.',
            ephemeral: true,
          });
          return;
        }

        const verifiedRoleId = '1468371761585459352';
        const unverifiedRoleId = '1468371674775687381';

        const guild = interaction.guild;
        if (!guild) return;

        const verifiedRole = guild.roles.cache.get(verifiedRoleId);
        const unverifiedRole = guild.roles.cache.get(unverifiedRoleId);

        if (!verifiedRole) {
          await interaction.reply({
            content: lang === 'es'
              ? '❌ Rol de verificado no encontrado.'
              : '❌ Verified role not found.',
            ephemeral: true,
          });
          return;
        }

        // Add verified role
        await member.roles.add(verifiedRole);

        // Remove unverified role if exists
        if (unverifiedRole && member.roles.cache.has(unverifiedRoleId)) {
          await member.roles.remove(unverifiedRole);
        }

        await interaction.reply({
          content: lang === 'es'
            ? '<:verified:1469546403205218346> ¡Has sido verificado! Bienvenido a Dominus.'
            : '<:verified:1469546403205218346> You have been verified! Welcome to Dominus.',
          ephemeral: true,
        });

        logger.info(`User ${interaction.user.tag} verified successfully in ${lang}`);

      } catch (error) {
        logger.error('Error verifying user:', error);
        const lang = interaction.customId === 'verify_user_es' ? 'es' : 'en';
        await interaction.reply({
          content: lang === 'es'
            ? '<:error:1469544804206776412> Error durante la verificación.'
            : '<:error:1469544804206776412> Error during verification.',
          ephemeral: true,
        });
      }
    }

    // Admin manual send button
    if (interaction.customId.startsWith('admin_send_')) {
      const dealNumber = interaction.customId.replace('admin_send_', '');
      
      try {
        const deal = await prisma.deal.findFirst({
          where: { dealNumber: parseInt(dealNumber) },
          include: { 
            wallet: true,
            buyer: true,
            seller: true,
          },
        });

        if (!deal || !deal.wallet) {
          await interaction.reply({
            content: '<:error:1469544804206776412> Deal or wallet not found.',
            ephemeral: true,
          });
          return;
        }

        // Ask for destination address in public channel so admin can type it
        const addressEmbed = new EmbedBuilder()
          .setColor(0x26AD10)
          .setTitle('🔧 Admin Manual Send')
          .setDescription(
            `**Deal #${deal.dealNumber}**\n` +
            `Crypto: ${deal.cryptocurrency}\n` +
            `Escrow Address: \`${deal.wallet.address}\`\n\n` +
            `<@${interaction.user.id}>, please provide the destination address where you want to send the funds.`
          )
          .setFooter({ text: '<:support:1469546403205218346> Dominus Bot holds funds securely, your funds are safe.' });

        await interaction.reply({ embeds: [addressEmbed] });

        // Wait for address
        const filter = (m: any) => m.author.id === interaction.user.id;
        const channel = interaction.channel;
        
        if (!channel || !('awaitMessages' in channel)) {
          await interaction.followUp({ content: '❌ Invalid channel.' });
          return;
        }

        try {
          const collected = await channel.awaitMessages({
            filter,
            max: 1,
            time: 120000,
            errors: ['time'],
          });

          const addressMsg = collected.first();
          const destinationAddress = addressMsg?.content.trim();

          if (!destinationAddress) {
            await interaction.followUp({ content: '❌ No address provided.' });
            return;
          }

          // Delete the message with the address for privacy
          await addressMsg?.delete().catch(() => {});

          // Get balance
          const balance = await BlockchainFactory.getBalance(
            deal.cryptocurrency as any,
            deal.wallet.address
          );

          const balanceNum = parseFloat(balance);
          
          if (balanceNum <= 0) {
            await interaction.followUp({ 
              content: '❌ No funds available in escrow wallet.',
            });
            return;
          }

          // Calculate service fee (same logic as automatic release)
          const dealAmountUsd = parseFloat(deal.amount);
          let serviceFeeUsd = 0;
          
          if (dealAmountUsd < 10) {
            serviceFeeUsd = 0; // Free
          } else if (dealAmountUsd < 100) {
            serviceFeeUsd = 1; // $1
          } else if (dealAmountUsd < 200) {
            serviceFeeUsd = 2; // $2
          } else {
            serviceFeeUsd = dealAmountUsd * 0.02; // 2%
          }

          // Convert deal amount to crypto - seller should get THIS amount
          const dealCryptoAmount = await import('../../utils/price-converter').then(m => 
            m.convertUsdToCrypto(dealAmountUsd, deal.cryptocurrency)
          );
          
          // Convert service fee to crypto - stays in wallet
          const serviceFeeInCrypto = await import('../../utils/price-converter').then(m => 
            m.convertUsdToCrypto(serviceFeeUsd, deal.cryptocurrency)
          );

          // Amount to send = deal amount ONLY (not service fee)
          let amountToSend = dealCryptoAmount.toString();
          
          logger.info(`[ADMIN SEND] Deal #${deal.dealNumber} - Seller gets: ${dealCryptoAmount} ${deal.cryptocurrency} | Service Fee retained: ${serviceFeeInCrypto.toFixed(8)} ${deal.cryptocurrency}`);
          
          if (deal.cryptocurrency === 'ETH') {
            const gasReserve = 0.005;
            amountToSend = (balanceNum - gasReserve).toFixed(6);
          } else if (deal.cryptocurrency === 'BTC') {
            const feeReserve = 0.0005; // 50,000 satoshis
            amountToSend = (balanceNum - feeReserve).toFixed(8);
          } else if (deal.cryptocurrency === 'LTC') {
            const feeReserve = 0.0005; // 50,000 litoshis
            amountToSend = (balanceNum - feeReserve).toFixed(8);
          } else if (deal.cryptocurrency === 'SOL') {
            const feeReserve = 0.001;
            amountToSend = (balanceNum - feeReserve).toFixed(6);
          }

          if (parseFloat(amountToSend) <= 0) {
            await interaction.followUp({ 
              content: '❌ Insufficient funds after fees.',
            });
            return;
          }

          await interaction.followUp({
            content: `⏳ Processing transaction...\nSending ${amountToSend} ${deal.cryptocurrency} to \`${destinationAddress}\``,
          });

          // Send transaction with separate error handling
          try {
            const txHash = await BlockchainFactory.sendTransaction(
              deal.cryptocurrency as any,
              deal.wallet.privateKey,
              destinationAddress,
              amountToSend
            );

            // Update deal
            await prisma.deal.update({
              where: { id: deal.id },
              data: { 
                status: 'COMPLETED',
                releaseTxHash: txHash,
                releasedAt: new Date(),
              },
            });

            // Get explorer link
            let explorerUrl = '';
            switch (deal.cryptocurrency) {
              case 'BTC':
                explorerUrl = `https://blockstream.info/tx/${txHash}`;
                break;
              case 'ETH':
              case 'USDT':
              case 'USDC':
                explorerUrl = `https://etherscan.io/tx/${txHash}`;
                break;
              case 'SOL':
                explorerUrl = `https://explorer.solana.com/tx/${txHash}`;
                break;
              case 'LTC':
                explorerUrl = `https://blockchair.com/litecoin/transaction/${txHash}`;
                break;
            }

            await interaction.followUp({
              content: 
                `✅ **Transaction Successful!**\n\n` +
                `**Amount:** ${amountToSend} ${deal.cryptocurrency}\n` +
                `**To:** \`${destinationAddress}\`\n` +
                `**TX Hash:** \`${txHash}\`\n\n` +
                (explorerUrl ? `[View on Explorer](${explorerUrl})` : ''),
            });

            logger.info(`Admin ${interaction.user.tag} manually sent ${amountToSend} ${deal.cryptocurrency} from deal #${dealNumber} to ${destinationAddress}`);

            // Auto-delete channel after 10 minutes
            setTimeout(async () => {
              try {
                if (interaction.channel && 'delete' in interaction.channel) {
                  await interaction.channel.delete();
                  logger.info(`Channel for deal #${dealNumber} auto-deleted after admin completion`);
                }
              } catch (deleteError) {
                logger.error(`Error auto-deleting channel for deal #${dealNumber}:`, deleteError);
              }
            }, 10 * 60 * 1000); // 10 minutes


          } catch (txError: any) {
            logger.error('Error sending transaction:', txError);
            await interaction.followUp({ 
              content: `❌ **Transaction Failed**\n\nError: ${txError.message}\n\nThe funds are still in the escrow wallet. Please contact support.`,
            });
          }

        } catch (msgError) {
          await interaction.followUp({ 
            content: '❌ Timeout or error waiting for address.',
          });
          logger.error('Error waiting for admin address:', msgError);
        }

      } catch (error: any) {
        logger.error('Error in admin manual send:', error);
        await interaction.followUp({
          content: `❌ Transaction failed: ${error.message || 'Unknown error'}`,
          ephemeral: true,
        });
      }
    }
  });
}