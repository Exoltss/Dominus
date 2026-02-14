import { Client, TextChannel, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { config } from '../config';

const VOUCH_CHANNEL_ID = '1470144219673788538';

// Crypto prices (for realistic fake data)
const cryptoPrices = {
  LTC: { min: 85, max: 100 },
  ETH: { min: 2100, max: 2500 },
  SOL: { min: 150, max: 200 },
  BTC: { min: 80000, max: 85000 },
};

// Crypto thumbnails
const cryptoThumbnails: Record<string, string> = {
  LTC: 'https://media.discordapp.net/attachments/1472149417925545994/1472149438729551908/LTC-400.png',
  ETH: 'https://media.discordapp.net/attachments/1472149417925545994/1472149527325577236/Ethereum_logo_translucent.png',
  SOL: 'https://media.discordapp.net/attachments/1472149417925545994/1472149611144548403/Logo-Solana.png',
  BTC: 'https://media.discordapp.net/attachments/1472149417925545994/1472149670884020411/1280px-Bitcoin.svg.png',
};

// Block explorer URLs
const explorerUrls: Record<string, { name: string; url: string }> = {
  LTC: { name: 'View on BlockCypher', url: 'https://blockcypher.com/' },
  BTC: { name: 'View on BlockCypher', url: 'https://blockcypher.com/' },
  ETH: { name: 'View on Etherscan', url: 'https://etherscan.io/' },
  SOL: { name: 'View on Solscan', url: 'https://solscan.io/' },
};

// Weighted crypto selection (more LTC, less BTC)
const cryptoWeights = ['LTC', 'LTC', 'LTC', 'LTC', 'ETH', 'ETH', 'SOL', 'SOL', 'BTC'];

let vouchInterval: NodeJS.Timeout | null = null;
let isVouchingEnabled = false;

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomTxId(): string {
  const prefix = Math.floor(Math.random() * 900000) + 100000;
  const suffix = Math.floor(Math.random() * 900000) + 100000;
  return `${prefix}e0...${suffix}d2`;
}

export function startVouchSystem(client: Client) {
  if (vouchInterval) {
    console.log('[VOUCH] Already running');
    return;
  }

  console.log('[VOUCH] Starting vouch system...');
  
  // Wait for client to be ready before sending first vouch
  if (!client.isReady()) {
    client.once('ready', () => {
      console.log('[VOUCH] Client ready, scheduling first vouch...');
      setTimeout(() => sendVouch(client), 60000);
    });
  } else {
    setTimeout(() => sendVouch(client), 60000);
  }
  
  // Then send vouches every 4-10 minutes
  const scheduleNextVouch = () => {
    const delay = Math.floor(randomInRange(240, 600)) * 1000; // 4-10 minutes
    
    vouchInterval = setTimeout(async () => {
      if (isVouchingEnabled) {
        await sendVouch(client);
      }
      scheduleNextVouch();
    }, delay);
  };
  
  scheduleNextVouch();
  isVouchingEnabled = true;
  console.log('[VOUCH] Vouch system started');
}

export function stopVouchSystem() {
  if (vouchInterval) {
    clearTimeout(vouchInterval);
    vouchInterval = null;
    isVouchingEnabled = false;
    console.log('[VOUCH] Vouch system stopped');
  }
}

export async function sendVouch(client: Client) {
  try {
    const channel = client.channels.cache.get(VOUCH_CHANNEL_ID);
    
    if (!channel || !('send' in channel)) {
      console.log('[VOUCH] Channel not found or cannot send messages');
      return;
    }

    const textChannel = channel as TextChannel;

    // Select random crypto
    const crypto = cryptoWeights[Math.floor(Math.random() * cryptoWeights.length)];
    const prices = cryptoPrices[crypto as keyof typeof cryptoPrices];
    
    // Generate random values
    const amount = randomInRange(0.1, 2).toFixed(4);
    const price = randomInRange(prices.min, prices.max);
    const usdValue = (parseFloat(amount) * price).toFixed(2);
    const txId = randomTxId();
    
    // Create embed
    const embed = new EmbedBuilder()
      .setTitle(`${crypto} Deal Complete`)
      .setColor(0x26AD10)
      .addFields(
        { name: 'Amount', value: `\`${amount}\` ($${usdValue} USD)`, inline: false },
        { name: 'Seller', value: '``Private``', inline: true },
        { name: 'Buyer', value: '``Private``', inline: true },
        { 
          name: 'Transaction', 
          value: `${txId} [(View Transaction)](${explorerUrls[crypto].url})`, 
          inline: false 
        }
      )
      .setThumbnail(cryptoThumbnails[crypto])
      .setTimestamp();

    // Create view with button
    const view = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel(explorerUrls[crypto].name)
        .setStyle(ButtonStyle.Link)
        .setURL(explorerUrls[crypto].url)
    );

    await textChannel.send({ embeds: [embed], components: [view] });
    console.log(`[VOUCH] Sent ${crypto} vouch: ${amount} ($${usdValue} USD)`);
    
  } catch (error) {
    console.error('[VOUCH] Error sending vouch:', error);
  }
}
