import { Client, Collection, REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import { logger } from '../../utils/logger';
import { config } from '../../config';

export interface Command {
  data: any;
  execute: (interaction: any) => Promise<void>;
}

export async function loadCommands(client: Client) {
  const commands: any[] = [];
  const commandsPath = join(__dirname);
  
  try {
    const commandFiles = readdirSync(commandsPath).filter(
      file => (file.endsWith('.ts') || file.endsWith('.js')) && file !== 'loader.ts' && file !== 'loader.js'
    );

    for (const file of commandFiles) {
      const filePath = join(commandsPath, file);
      const command = await import(filePath);
      
      if ('data' in command && 'execute' in command) {
        (client as any).commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
        logger.debug(`Comando cargado: ${command.data.name}`);
      }
    }

    const rest = new REST({ version: '10' }).setToken(config.discord.token);

    logger.info('Registrando comandos slash en Discord...');

    if (config.discord.guildId) {
      await rest.put(
        Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
        { body: commands }
      );
      logger.info(`${commands.length} comandos registrados en el servidor`);
    } else {
      await rest.put(
        Routes.applicationCommands(config.discord.clientId),
        { body: commands }
      );
      logger.info(`${commands.length} comandos registrados globalmente`);
    }
  } catch (error) {
    logger.error('Error cargando comandos:', error);
    throw error;
  }
}
