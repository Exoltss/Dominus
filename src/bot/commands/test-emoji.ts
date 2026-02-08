import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('test-emoji')
  .setDescription('Test emoji display');

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const testEmbed = new EmbedBuilder()
      .setColor(0x26AD10)
      .setTitle('Prueba de Emojis')
      .setDescription(
        '**Emoji arrow:**\n' +
        '<:arrow:1470090766268498046> Arrow Test\n\n' +
        '**Crypto emojis:**\n' +
        '<:BTC:1469542447510978625> Bitcoin\n' +
        '<:ETHERUM:1469542703091155189> Ethereum\n' +
        '<:SOLANA:1469543005038968965> Solana\n' +
        '<:LTC:1469543266608480400> Litecoin\n' +
        '<:TETHER:1469543477309345852> Tether\n' +
        '<:USD:1469543935297716415> USD Coin\n\n' +
        '**Unicode alternativos:**\n' +
        '₿ Bitcoin\n' +
        '⟠ Ethereum\n' +
        '◎ Solana\n' +
        'Ł Litecoin\n' +
        '₮ Tether\n' +
        '$ USD Coin'
      );

    // También verificar qué emojis tiene el bot disponible
    const guilds = interaction.client.guilds.cache;
    let emojiList = '**Emojis disponibles para el bot:**\n';
    
    guilds.forEach(guild => {
      const emojis = guild.emojis.cache;
      if (emojis.size > 0) {
        emojiList += `\nServidor: ${guild.name}\n`;
        emojis.forEach(emoji => {
          emojiList += `${emoji} - ${emoji.name} (${emoji.id})\n`;
        });
      }
    });

    await interaction.reply({
      embeds: [testEmbed],
      ephemeral: true,
    });

    // Send emoji list as followup
    if (emojiList.length < 2000) {
      await interaction.followUp({
        content: emojiList,
        ephemeral: true,
      });
    }
  } catch (error) {
    await interaction.reply({
      content: '❌ Error en test de emoji: ' + error,
      ephemeral: true,
    });
  }
}
