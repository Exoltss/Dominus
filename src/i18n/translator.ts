import { EmbedBuilder } from 'discord.js';
import esTranslations from './locales/es.json';
import enTranslations from './locales/en.json';

export type Language = 'es' | 'en';

const translations: Record<Language, any> = {
  es: esTranslations,
  en: enTranslations,
};

/**
 * Get translated text for a given key
 * @param key - Dot-notation key (e.g., 'commands.help.title')
 * @param lang - Language code ('es' or 'en')
 * @param vars - Optional variables for interpolation (e.g., {buyer: '@user'})
 * @returns Translated string
 */
export function t(key: string, lang: Language = 'es', vars?: Record<string, any>): string {
  const keys = key.split('.');
  let value: any = translations[lang];

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Fallback to Spanish if key not found
      value = translations.es;
      for (const fallbackKey of keys) {
        if (value && typeof value === 'object' && fallbackKey in value) {
          value = value[fallbackKey];
        } else {
          return key; // Return key if not found in any language
        }
      }
      break;
    }
  }

  if (typeof value !== 'string') {
    return key;
  }

  // Variable interpolation
  if (vars) {
    return value.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return vars[varName]?.toString() || match;
    });
  }

  return value;
}

/**
 * Create an embed with translated fields
 * @param config - Embed configuration with translation keys
 * @param lang - Language code
 * @returns EmbedBuilder instance
 */
export function createTranslatedEmbed(
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
  lang: Language = 'es'
): EmbedBuilder {
  const embed = new EmbedBuilder();

  if (config.color !== undefined) {
    embed.setColor(config.color);
  }

  if (config.titleKey) {
    embed.setTitle(t(config.titleKey, lang, config.vars));
  } else if (config.title) {
    embed.setTitle(config.title);
  }

  if (config.descriptionKey) {
    embed.setDescription(t(config.descriptionKey, lang, config.vars));
  } else if (config.description) {
    embed.setDescription(config.description);
  }

  if (config.fields) {
    const translatedFields = config.fields.map((field) => ({
      name: field.nameKey ? t(field.nameKey, lang, { ...config.vars, ...field.vars }) : field.name || '',
      value: field.valueKey ? t(field.valueKey, lang, { ...config.vars, ...field.vars }) : field.value || '',
      inline: field.inline ?? false,
    }));
    embed.addFields(translatedFields);
  }

  if (config.footerKey) {
    embed.setFooter({ text: t(config.footerKey, lang, config.vars) });
  } else if (config.footer) {
    embed.setFooter({ text: config.footer });
  }

  if (config.thumbnail) {
    embed.setThumbnail(config.thumbnail);
  }

  if (config.timestamp) {
    embed.setTimestamp();
  }

  return embed;
}

/**
 * Get language name for display
 */
export function getLanguageName(lang: Language): string {
  return lang === 'es' ? 'Español 🇪🇸' : 'English 🇺🇸';
}

/**
 * Validate language code
 */
export function isValidLanguage(lang: string): lang is Language {
  return lang === 'es' || lang === 'en';
}
