import {
  Client,
  Interaction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { logger } from '../../utils/logger';
import { CreditsService } from '../services/credits.service';
import { XToolsService } from '../services/xtools.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Credit costs for each operation
const CREDIT_COSTS = {
  generate: 5,
  follow: 2,
  join_group: 3,
  change_display_name: 2,
  humanize: 5,
  bruter: 10,
  change_password: 3,
  account_info: 1,
};

export function registerXToolsHandlers(client: Client) {
  client.on('interactionCreate', async (interaction: Interaction) => {
    // Handle category selection
    if (interaction.isStringSelectMenu() && interaction.customId === 'xtools_category') {
      const category = interaction.values[0];
      
      try {
        const credits = await CreditsService.getCredits(interaction.user.id);
        
        let embed: EmbedBuilder;
        let actionSelect: StringSelectMenuBuilder;
        
        switch (category) {
          case 'account_management':
            embed = new EmbedBuilder()
              .setColor(0x26AD10)
              .setTitle('🏭 Gestión de Cuentas')
              .setDescription(
                `💳 **Balance:** ${credits} créditos\n\n` +
                '**Acciones disponibles:**\n' +
                `• **Generar Cuenta** - ${CREDIT_COSTS.generate} créditos\n` +
                `• **Bruter (Verificar)** - ${CREDIT_COSTS.bruter} créditos\n` +
                `• **Humanizar Cuenta** - ${CREDIT_COSTS.humanize} créditos`
              );
            
            actionSelect = new StringSelectMenuBuilder()
              .setCustomId('xtools_action')
              .setPlaceholder('Selecciona una acción...')
              .addOptions([
                {
                  label: `🆕 Generar Cuenta (${CREDIT_COSTS.generate} créditos)`,
                  description: 'Crear una nueva cuenta de Roblox',
                  value: 'generate',
                },
                {
                  label: `🔍 Bruter Cuenta (${CREDIT_COSTS.bruter} créditos)`,
                  description: 'Verificar credenciales de cuenta',
                  value: 'bruter',
                },
                {
                  label: `🤖 Humanizar (${CREDIT_COSTS.humanize} créditos)`,
                  description: 'Añadir traits realistas a la cuenta',
                  value: 'humanize',
                },
              ]);
            break;
          
          case 'profile_actions':
            embed = new EmbedBuilder()
              .setColor(0x26AD10)
              .setTitle('👤 Acciones de Perfil')
              .setDescription(
                `💳 **Balance:** ${credits} créditos\n\n` +
                '**Acciones disponibles:**\n' +
                `• **Cambiar Display Name** - ${CREDIT_COSTS.change_display_name} créditos\n` +
                `• **Cambiar Contraseña** - ${CREDIT_COSTS.change_password} créditos`
              );
            
            actionSelect = new StringSelectMenuBuilder()
              .setCustomId('xtools_action')
              .setPlaceholder('Selecciona una acción...')
              .addOptions([
                {
                  label: `✏️ Cambiar Display Name (${CREDIT_COSTS.change_display_name} créditos)`,
                  description: 'Cambiar el nombre mostrado',
                  value: 'change_display_name',
                },
                {
                  label: `🔐 Cambiar Contraseña (${CREDIT_COSTS.change_password} créditos)`,
                  description: 'Actualizar contraseña de cuenta',
                  value: 'change_password',
                },
              ]);
            break;
          
          case 'social_actions':
            embed = new EmbedBuilder()
              .setColor(0x26AD10)
              .setTitle('👥 Acciones Sociales')
              .setDescription(
                `💳 **Balance:** ${credits} créditos\n\n` +
                '**Acciones disponibles:**\n' +
                `• **Seguir Usuario** - ${CREDIT_COSTS.follow} créditos (o por cantidad)\n` +
                `• **Unirse a Grupo** - ${CREDIT_COSTS.join_group} créditos (o por cantidad)`
              );
            
            actionSelect = new StringSelectMenuBuilder()
              .setCustomId('xtools_action')
              .setPlaceholder('Selecciona una acción...')
              .addOptions([
                {
                  label: `👤 Seguir Usuario (${CREDIT_COSTS.follow}+ créditos)`,
                  description: 'Seguir a un usuario de Roblox',
                  value: 'follow',
                },
                {
                  label: `👥 Unirse a Grupo (${CREDIT_COSTS.join_group}+ créditos)`,
                  description: 'Unirse a un grupo de Roblox',
                  value: 'join_group',
                },
              ]);
            break;
          
          case 'info_status':
            embed = new EmbedBuilder()
              .setColor(0x26AD10)
              .setTitle('ℹ️ Información y Estado')
              .setDescription(
                `💳 **Balance:** ${credits} créditos\n\n` +
                '**Acciones disponibles:**\n' +
                `• **Info de Cuenta** - ${CREDIT_COSTS.account_info} crédito\n` +
                `• **Estado de Tarea** - Gratis`
              );
            
            actionSelect = new StringSelectMenuBuilder()
              .setCustomId('xtools_action')
              .setPlaceholder('Selecciona una acción...')
              .addOptions([
                {
                  label: `ℹ️ Info de Cuenta (${CREDIT_COSTS.account_info} crédito)`,
                  description: 'Ver información de una cuenta',
                  value: 'account_info',
                },
                {
                  label: '📊 Estado de Tarea (Gratis)',
                  description: 'Verificar estado de una tarea',
                  value: 'task_status',
                },
              ]);
            break;
          
          default:
            return;
        }
        
        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(actionSelect);
        
        await interaction.update({
          embeds: [embed],
          components: [row],
        });
        
      } catch (error) {
        logger.error('Error handling category selection:', error);
        await interaction.reply({
          content: '❌ Error al cargar la categoría.',
          ephemeral: true,
        });
      }
    }
    
    // Handle action selection - show modal for input
    if (interaction.isStringSelectMenu() && interaction.customId === 'xtools_action') {
      const action = interaction.values[0];
      
      try {
        let modal: ModalBuilder;
        
        switch (action) {
          case 'generate':
            modal = new ModalBuilder()
              .setCustomId('xtools_modal_generate')
              .setTitle('Generar Cuenta de Roblox')
              .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder()
                    .setCustomId('username')
                    .setLabel('Username (opcional - dejar vacío = random)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                ),
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder()
                    .setCustomId('password')
                    .setLabel('Password (opcional - dejar vacío = random)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                )
              );
            break;
          
          case 'bruter':
            modal = new ModalBuilder()
              .setCustomId('xtools_modal_bruter')
              .setTitle('Bruter - Verificar Cuenta')
              .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder()
                    .setCustomId('username')
                    .setLabel('Username')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                ),
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder()
                    .setCustomId('password')
                    .setLabel('Password')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                )
              );
            break;
          
          case 'humanize':
            modal = new ModalBuilder()
              .setCustomId('xtools_modal_humanize')
              .setTitle('Humanizar Cuenta')
              .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder()
                    .setCustomId('cookie')
                    .setLabel('Cookie de Roblox')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                )
              );
            break;
          
          case 'follow':
            modal = new ModalBuilder()
              .setCustomId('xtools_modal_follow')
              .setTitle('Seguir Usuario')
              .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder()
                    .setCustomId('user_id')
                    .setLabel('User ID de Roblox')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                ),
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder()
                    .setCustomId('amount')
                    .setLabel('Cantidad (1 para uno solo)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setValue('1')
                )
              );
            break;
          
          case 'join_group':
            modal = new ModalBuilder()
              .setCustomId('xtools_modal_join_group')
              .setTitle('Unirse a Grupo')
              .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder()
                    .setCustomId('group_id')
                    .setLabel('Group ID de Roblox')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                ),
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder()
                    .setCustomId('amount')
                    .setLabel('Cantidad (1 para uno solo)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setValue('1')
                )
              );
            break;
          
          case 'change_display_name':
            modal = new ModalBuilder()
              .setCustomId('xtools_modal_change_display_name')
              .setTitle('Cambiar Display Name')
              .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder()
                    .setCustomId('cookie')
                    .setLabel('Cookie de Roblox')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                ),
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder()
                    .setCustomId('display_name')
                    .setLabel('Nuevo Display Name')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                )
              );
            break;
          
          case 'change_password':
            modal = new ModalBuilder()
              .setCustomId('xtools_modal_change_password')
              .setTitle('Cambiar Contraseña')
              .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder()
                    .setCustomId('cookie')
                    .setLabel('Cookie de Roblox')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                ),
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder()
                    .setCustomId('old_password')
                    .setLabel('Contraseña Actual')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                )
              );
            break;
          
          case 'account_info':
            modal = new ModalBuilder()
              .setCustomId('xtools_modal_account_info')
              .setTitle('Información de Cuenta')
              .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder()
                    .setCustomId('cookie')
                    .setLabel('Cookie de Roblox')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                )
              );
            break;
          
          case 'task_status':
            modal = new ModalBuilder()
              .setCustomId('xtools_modal_task_status')
              .setTitle('Estado de Tarea')
              .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder()
                    .setCustomId('task_id')
                    .setLabel('Task ID')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setPlaceholder('Ej: TASK123')
                )
              );
            break;
          
          default:
            return;
        }
        
        await interaction.showModal(modal);
        
      } catch (error) {
        logger.error('Error showing modal:', error);
        await interaction.reply({
          content: '❌ Error al abrir el formulario.',
          ephemeral: true,
        });
      }
    }
    
    // Handle modal submissions (continued in next part due to size)
  });
  
  // Handle modal submissions
  client.on('interactionCreate', async (interaction: Interaction) => {
    if (!interaction.isModalSubmit()) return;
    if (!interaction.customId.startsWith('xtools_modal_')) return;
    
    const modalType = interaction.customId.replace('xtools_modal_', '');
    
    try {
      await interaction.deferReply({ ephemeral: true });
      
      // Check credits before processing
      const credits = await CreditsService.getCredits(interaction.user.id);
      let requiredCredits = 0;
      
      // Determine required credits
      switch (modalType) {
        case 'generate':
          requiredCredits = CREDIT_COSTS.generate;
          break;
        case 'bruter':
          requiredCredits = CREDIT_COSTS.bruter;
          break;
        case 'humanize':
          requiredCredits = CREDIT_COSTS.humanize;
          break;
        case 'follow':
          const followAmount = parseInt(interaction.fields.getTextInputValue('amount')) || 1;
          requiredCredits = CREDIT_COSTS.follow * followAmount;
          break;
        case 'join_group':
          const joinAmount = parseInt(interaction.fields.getTextInputValue('amount')) || 1;
          requiredCredits = CREDIT_COSTS.join_group * joinAmount;
          break;
        case 'change_display_name':
          requiredCredits = CREDIT_COSTS.change_display_name;
          break;
        case 'change_password':
          requiredCredits = CREDIT_COSTS.change_password;
          break;
        case 'account_info':
          requiredCredits = CREDIT_COSTS.account_info;
          break;
        case 'task_status':
          requiredCredits = 0; // Free
          break;
      }
      
      // Check if user has enough credits
      if (modalType !== 'task_status' && credits < requiredCredits) {
        await interaction.editReply({
          content: `❌ **Créditos insuficientes**\n\nNecesitas ${requiredCredits} créditos pero solo tienes ${credits}.\nContacta un administrador para obtener más créditos.`,
        });
        return;
      }
      
      // Process each modal type
      let result: any;
      let taskId: string | null = null;
      
      switch (modalType) {
        case 'generate': {
          const username = interaction.fields.getTextInputValue('username') || undefined;
          const password = interaction.fields.getTextInputValue('password') || undefined;
          
          result = await XToolsService.generateAccount(username, password);
          
          await CreditsService.deductCredits(
            interaction.user.id,
            requiredCredits,
            'Generated Roblox account'
          );
          
          const genEmbed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('✅ Cuenta Generada')
            .setDescription(
              `**Username:** ${result.username}\n` +
              `**Password:** ${result.password}\n` +
              `**Cookie:** ||${result.cookie}||\n\n` +
              `💳 **Créditos gastados:** ${requiredCredits}\n` +
              `💰 **Balance restante:** ${credits - requiredCredits}`
            )
            .setTimestamp();
          
          await interaction.editReply({ embeds: [genEmbed] });
          
          logger.info(`${interaction.user.tag} generated account: ${result.username}`);
          break;
        }
        
        case 'bruter': {
          const username = interaction.fields.getTextInputValue('username');
          const password = interaction.fields.getTextInputValue('password');
          
          result = await XToolsService.bruterAccount(username, password);
          
          await CreditsService.deductCredits(
            interaction.user.id,
            requiredCredits,
            'Bruter check on ' + username
          );
          
          const bruterEmbed = new EmbedBuilder()
            .setColor(result.cookie ? 0x00ff00 : 0xff0000)
            .setTitle(result.cookie ? '✅ Cuenta Válida' : '❌ Cuenta Inválida')
            .setDescription(
              result.cookie 
                ? `**Username:** ${result.username}\n` +
                  `**Password:** ${result.password}\n` +
                  `**Cookie:** ||${result.cookie}||\n\n` +
                  `💳 **Créditos gastados:** ${requiredCredits}\n` +
                  `💰 **Balance restante:** ${credits - requiredCredits}`
                : `Las credenciales para **${username}** son inválidas.\n\n` +
                  `💳 **Créditos gastados:** ${requiredCredits}\n` +
                  `💰 **Balance restante:** ${credits - requiredCredits}`
            )
            .setTimestamp();
          
          await interaction.editReply({ embeds: [bruterEmbed] });
          break;
        }
        
        case 'humanize': {
          const cookie = interaction.fields.getTextInputValue('cookie');
          
          result = await XToolsService.humanizeAccount(cookie);
          taskId = result.message?.task_id;
          
          await CreditsService.deductCredits(
            interaction.user.id,
            requiredCredits,
            'Humanized Roblox account'
          );
          
          if (taskId) {
            // Store task in database
            await prisma.xToolsTask.create({
              data: {
                taskId,
                userId: (await prisma.user.findUnique({ where: { discordId: interaction.user.id } }))!.id,
                endpoint: '/api/humamize',
                status: 'PENDING',
                creditCost: requiredCredits,
              },
            });
            
            await interaction.editReply({
              content: `⏳ **Tarea Iniciada**\n\nTask ID: \`${taskId}\`\n\nLa cuenta está siendo humanizada. Usa el comando de "Estado de Tarea" para verificar el progreso.\n\n💳 **Créditos gastados:** ${requiredCredits}\n💰 **Balance restante:** ${credits - requiredCredits}`,
            });
          } else {
            await interaction.editReply({
              content: `✅ **Cuenta Humanizada**\n\n💳 **Créditos gastados:** ${requiredCredits}\n💰 **Balance restante:** ${credits - requiredCredits}`,
            });
          }
          break;
        }
        
        case 'follow': {
          const userId = interaction.fields.getTextInputValue('user_id');
          const amount = parseInt(interaction.fields.getTextInputValue('amount')) || 1;
          
          result = await XToolsService.followUser(userId, amount);
          taskId = result.message?.task_id;
          
          await CreditsService.deductCredits(
            interaction.user.id,
            requiredCredits,
            `Follow user ${userId} x${amount}`
          );
          
          if (taskId) {
            await prisma.xToolsTask.create({
              data: {
                taskId,
                userId: (await prisma.user.findUnique({ where: { discordId: interaction.user.id } }))!.id,
                endpoint: '/api/follow',
                status: 'PENDING',
                creditCost: requiredCredits,
                requestData: JSON.stringify({ user_id: userId, amount }),
              },
            });
            
            await interaction.editReply({
              content: `⏳ **Tarea Iniciada**\n\nTask ID: \`${taskId}\`\n\nSiguiendo al usuario ${userId} con ${amount} cuenta(s).\n\n💳 **Créditos gastados:** ${requiredCredits}\n💰 **Balance restante:** ${credits - requiredCredits}`,
            });
          }
          break;
        }
        
        case 'join_group': {
          const groupId = interaction.fields.getTextInputValue('group_id');
          const amount = parseInt(interaction.fields.getTextInputValue('amount')) || 1;
          
          result = await XToolsService.joinGroup(groupId, amount);
          taskId = result.message?.task_id;
          
          await CreditsService.deductCredits(
            interaction.user.id,
            requiredCredits,
            `Join group ${groupId} x${amount}`
          );
          
          if (taskId) {
            await prisma.xToolsTask.create({
              data: {
                taskId,
                userId: (await prisma.user.findUnique({ where: { discordId: interaction.user.id } }))!.id,
                endpoint: '/api/join_group',
                status: 'PENDING',
                creditCost: requiredCredits,
                requestData: JSON.stringify({ group_id: groupId, amount }),
              },
            });
            
            await interaction.editReply({
              content: `⏳ **Tarea Iniciada**\n\nTask ID: \`${taskId}\`\n\nUniendo al grupo ${groupId} con ${amount} cuenta(s).\n\n💳 **Créditos gastados:** ${requiredCredits}\n💰 **Balance restante:** ${credits - requiredCredits}`,
            });
          }
          break;
        }
        
        case 'change_display_name': {
          const cookie = interaction.fields.getTextInputValue('cookie');
          const displayName = interaction.fields.getTextInputValue('display_name');
          
          result = await XToolsService.changeDisplayName(cookie, displayName);
          taskId = result.message?.task_id;
          
          await CreditsService.deductCredits(
            interaction.user.id,
            requiredCredits,
            'Changed display name to ' + displayName
          );
          
          if (taskId) {
            await prisma.xToolsTask.create({
              data: {
                taskId,
                userId: (await prisma.user.findUnique({ where: { discordId: interaction.user.id } }))!.id,
                endpoint: '/api/change_display_name',
                status: 'PENDING',
                creditCost: requiredCredits,
              },
            });
            
            await interaction.editReply({
              content: `⏳ **Tarea Iniciada**\n\nTask ID: \`${taskId}\`\n\nCambiando display name a: **${displayName}**\n\n💳 **Créditos gastados:** ${requiredCredits}\n💰 **Balance restante:** ${credits - requiredCredits}`,
            });
          } else {
            await interaction.editReply({
              content: `✅ **Display Name Cambiado**\n\nNuevo nombre: **${displayName}**\n\n💳 **Créditos gastados:** ${requiredCredits}\n💰 **Balance restante:** ${credits - requiredCredits}`,
            });
          }
          break;
        }
        
        case 'change_password': {
          const cookie = interaction.fields.getTextInputValue('cookie');
          const oldPassword = interaction.fields.getTextInputValue('old_password');
          
          result = await XToolsService.changePassword(cookie, oldPassword);
          
          await CreditsService.deductCredits(
            interaction.user.id,
            requiredCredits,
            'Changed account password'
          );
          
          const passEmbed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('✅ Contraseña Cambiada')
            .setDescription(
              `**Nueva Contraseña:** ||${result.NewPassword}||\n` +
              `**Nueva Cookie:** ||${result.NewCookie}||\n\n` +
              `💳 **Créditos gastados:** ${requiredCredits}\n` +
              `💰 **Balance restante:** ${credits - requiredCredits}`
            )
            .setTimestamp();
          
          await interaction.editReply({ embeds: [passEmbed] });
          break;
        }
        
        case 'account_info': {
          const cookie = interaction.fields.getTextInputValue('cookie');
          
          result = await XToolsService.getAccountInfo(cookie);
          
          await CreditsService.deductCredits(
            interaction.user.id,
            requiredCredits,
            'Checked account info'
          );
          
          const infoEmbed = new EmbedBuilder()
            .setColor(0x26AD10)
            .setTitle('ℹ️ Información de Cuenta')
            .addFields(
              { name: 'RAP Total', value: result.RapTotal?.toString() || 'N/A', inline: true },
              { name: 'Total Robux', value: result.TotalRobux?.toString() || 'N/A', inline: true },
              { name: 'Premium', value: result.Premium ? 'Sí' : 'No', inline: true },
              { name: 'Verified', value: result.IsVerified || 'No', inline: true },
              { name: 'Creation Date', value: result.CreationDate || 'N/A', inline: true },
              { name: 'Total Groups', value: result.TotalGroups?.toString() || 'N/A', inline: true },
              { name: 'Total Visits', value: result.TotalVisits?.toString() || 'N/A', inline: true },
              { name: 'Has Payment', value: result.HasPayment ? 'Sí' : 'No', inline: true }
            )
            .setFooter({ text: `💳 Créditos gastados: ${requiredCredits} | Balance: ${credits - requiredCredits}` })
            .setTimestamp();
          
          await interaction.editReply({ embeds: [infoEmbed] });
          break;
        }
        
        case 'task_status': {
          const taskIdInput = interaction.fields.getTextInputValue('task_id');
          
          result = await XToolsService.getTaskStatus(taskIdInput);
          
          const statusEmbed = new EmbedBuilder()
            .setColor(
              result.State === 'Success' ? 0x00ff00 :
              result.State === 'Failed' ? 0xff0000 :
              0xffa500
            )
            .setTitle('📊 Estado de Tarea')
            .setDescription(
              `**Task ID:** \`${taskIdInput}\`\n` +
              `**Estado:** ${result.State}\n` +
              `**Creado:** ${result.CreatedAt}\n\n` +
              (result.Result ? `**Resultado:**\n\`\`\`json\n${JSON.stringify(result.Result, null, 2)}\n\`\`\`` : '')
            )
            .setTimestamp();
          
          await interaction.editReply({ embeds: [statusEmbed] });
          break;
        }
      }
      
    } catch (error: any) {
      logger.error('Error processing XTools modal:', error);
      
      const errorMessage = error.message || 'Unknown error';
      
      await interaction.editReply({
        content: `❌ **Error**\n\n${errorMessage}\n\nSi se descontaron créditos, contacta un admin para reembolso.`,
      });
    }
  });
}

