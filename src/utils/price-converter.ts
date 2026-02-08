import { logger } from './logger';

// Approximate prices - in production use a real API like CoinGecko
const FALLBACK_PRICES: { [key: string]: number } = {
  BTC: 50000,
  ETH: 3000,
  SOL: 100,
  LTC: 80,
  USDT: 1,
  USDC: 1,
};

export async function convertUsdToCrypto(usdAmount: number, crypto: string): Promise<number> {
  try {
    // For testnet, we'll use fallback prices
    // In production, fetch from: https://api.coingecko.com/api/v3/simple/price
    const price = FALLBACK_PRICES[crypto.toUpperCase()] || 1;
    const cryptoAmount = usdAmount / price;
    
    // Format based on crypto type
    if (crypto === 'BTC' || crypto === 'LTC') {
      return parseFloat(cryptoAmount.toFixed(8));
    } else if (crypto === 'ETH') {
      return parseFloat(cryptoAmount.toFixed(6));
    } else if (crypto === 'SOL') {
      return parseFloat(cryptoAmount.toFixed(4));
    } else {
      // USDT/USDC
      return parseFloat(cryptoAmount.toFixed(2));
    }
  } catch (error) {
    logger.error('Error converting USD to crypto:', error);
    return usdAmount; // Fallback to 1:1
  }
}

export function getCryptoSymbol(crypto: string): string {
  const symbols: { [key: string]: string } = {
    BTC: '₿',
    ETH: 'Ξ',
    SOL: '◎',
    LTC: 'Ł',
    USDT: '₮',
    USDC: '$',
  };
  return symbols[crypto.toUpperCase()] || crypto;
}
