import { TextChannel, EmbedBuilder, ActionRowBuilder, ButtonBuilder } from 'discord.js';
import { createTranslatedEmbed, Language } from '../i18n/translator';

/**
 * Send a message in dual language mode
 * - Public message in creator's language
 * - If buyer has different language and buyerInteraction exists, send ephemeral translation
 */
export async function sendDualLanguageMessage(
  channel: TextChannel,
  config: {
    color?: number;
    title?: string;
    titleKey?: string;
    description?: string;
    descriptionKey?: string;
    fields?: Array<{
      name?: string;
      nameKey?: string;
      value?: string;
      valueKey?: string;
      inline?: boolean;
      vars?: Record<string, any>;
    }>;
    footer?: string;
    footerKey?: string;
    thumbnail?: string;
    timestamp?: boolean;
    vars?: Record<string, any>;
  },
  creatorLang: Language,
  buyerLang?: Language | null,
  buyerUserId?: string,
  components?: ActionRowBuilder<any>[]
) {
  // Send public message in creator's language
  const publicEmbed = createTranslatedEmbed(config, creatorLang);
  
  const publicMessage = await channel.send({
    embeds: [publicEmbed],
    components: components || [],
  });

  // If buyer has different language, we can't send ephemeral here
  // Ephemeral only works in interaction responses
  // This function just sends the public message
  // For buyer-specific messages, use interaction.followUp({ ephemeral: true })
  
  return publicMessage;
}

/**
 * Create an embed translated for a specific user
 * Helper to generate embeds for ephemeral follow-ups
 */
export function createUserSpecificEmbed(
  config: Parameters<typeof createTranslatedEmbed>[0],
  userLang: Language,
  note?: string
): EmbedBuilder {
  const embed = createTranslatedEmbed(config, userLang);
  
  if (note) {
    const currentDesc = embed.data.description || '';
    embed.setDescription(`${currentDesc}\n\n*${note}*`);
  }
  
  return embed;
}
