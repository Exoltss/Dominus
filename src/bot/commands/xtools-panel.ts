import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
} from 'discord.js';
import { logger } from '../../utils/logger';
import { CreditsService } from '../services/credits.service';

export const data = new SlashCommandBuilder()
  .setName('xtools-panel')
  .setDescription('Open Dominus Roblox Automation Panel');

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    // Check user's credit balance
    const credits = await CreditsService.getCredits(interaction.user.id);

    const panelEmbed = new EmbedBuilder()
      .setColor(0x26AD10)
      .setTitle('🛠️ Dominus - Panel de Automatización Roblox')
      .setDescription(
        '**Panel de automatización para Roblox**\n\n' +
        `💳 **Tu Balance:** ${credits} créditos\n\n` +
        'Selecciona una categoría del menú para ver las acciones disponibles.\n\n' +
        '**Categorías:**\n' +
        '🏭 **Gestión de Cuentas** - Generar, verificar y humanizar cuentas\n' +
        '👤 **Acciones de Perfil** - Cambiar nombre, contraseña\n' +
        '👥 **Acciones Sociales** - Seguir usuarios, unirse a grupos\n' +
        'ℹ️ **Información** - Ver info de cuenta, estado de tareas'
      )
      .setThumbnail('https://i.imgur.com/Ty8kl8W.png')
      .setFooter({ 
        text: credits > 0 
          ? 'Usa /check-credits para ver tu balance' 
          : '⚠️ No tienes créditos. Contacta un admin.' 
      })
      .setTimestamp();

    const categorySelect = new StringSelectMenuBuilder()
      .setCustomId('xtools_category')
      .setPlaceholder('Selecciona una categoría...')
      .addOptions([
        {
          label: '🏭 Gestión de Cuentas',
          description: 'Generar, bruter, humanizar cuentas',
          value: 'account_management',
        },
        {
          label: '👤 Acciones de Perfil',
          description: 'Cambiar display name, contraseña',
          value: 'profile_actions',
        },
        {
          label: '👥 Acciones Sociales',
          description: 'Seguir usuarios, unirse a grupos',
          value: 'social_actions',
        },
        {
          label: 'ℹ️ Información y Estado',
          description: 'Ver info de cuenta, estado de tareas',
          value: 'info_status',
        },
      ]);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(categorySelect);

    await interaction.reply({
      embeds: [panelEmbed],
      components: [row],
      ephemeral: true,
    });

    logger.info(`${interaction.user.tag} opened Dominus panel (${credits} credits)`);
  } catch (error) {
    logger.error('Error opening Dominus panel:', error);
    
    await interaction.reply({
      content: '❌ Error al abrir el panel de Dominus. Intenta de nuevo.',
      ephemeral: true,
    });
  }
}
