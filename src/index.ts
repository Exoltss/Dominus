import { Client, GatewayIntentBits, Collection } from 'discord.js';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { loadCommands } from './bot/commands/loader';
import { registerEvents } from './bot/events/register';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers, // Required for guildMemberAdd event
  ],
}) as any;

client.commands = new Collection();

async function startBot() {
  try {
    logger.info('Iniciando Crypto Escrow Bot...');

    await loadCommands(client);
    logger.info('Comandos cargados exitosamente');

    registerEvents(client);
    logger.info('Eventos registrados exitosamente');

    await client.login(process.env.DISCORD_TOKEN);
    logger.info('Bot conectado a Discord');
  } catch (error) {
    logger.error('Error al iniciar el bot:', error);
    process.exit(1);
  }
}

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

startBot();
