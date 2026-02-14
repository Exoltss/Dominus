import dotenv from 'dotenv';

dotenv.config();

export const config = {
  discord: {
    token: process.env.DISCORD_TOKEN!,
    clientId: process.env.DISCORD_CLIENT_ID!,
    guildId: process.env.DISCORD_GUILD_ID,
  },
  
  database: {
    url: process.env.DATABASE_URL!,
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  
  blockchain: {
    bitcoin: {
      network: process.env.BITCOIN_NETWORK || 'testnet',
      apiUrl: process.env.BLOCKSTREAM_API_URL || 'https://blockstream.info/testnet/api',
      minConfirmations: parseInt(process.env.MIN_CONFIRMATIONS_BTC || '3'),
    },
    ethereum: {
      network: process.env.ETHEREUM_NETWORK || 'goerli',
      alchemyKey: process.env.ALCHEMY_API_KEY,
      infuraKey: process.env.INFURA_API_KEY,
      minConfirmations: parseInt(process.env.MIN_CONFIRMATIONS_ETH || '12'),
    },
    solana: {
      network: process.env.SOLANA_NETWORK || 'devnet',
      rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      minConfirmations: parseInt(process.env.MIN_CONFIRMATIONS_SOL || '32'),
    },
    litecoin: {
      network: process.env.LITECOIN_NETWORK || 'testnet',
      blockcypherKey: process.env.BLOCKCYPHER_API_KEY,
      minConfirmations: parseInt(process.env.MIN_CONFIRMATIONS_LTC || '6'),
    },
  },
  
  security: {
    encryptionKey: process.env.ENCRYPTION_KEY!,
    masterSeedEncrypted: process.env.MASTER_SEED_ENCRYPTED,
  },
  
  bot: {
    feePercentage: parseFloat(process.env.BOT_FEE_PERCENTAGE || '2.0'),
    hotWalletMaxBalance: parseFloat(process.env.HOT_WALLET_MAX_BALANCE || '10000'),
    autoTransferThreshold: parseFloat(process.env.AUTO_TRANSFER_THRESHOLD || '5000'),
  },
  
  admin: {
    userIds: (process.env.ADMIN_USER_IDS || '').split(',').filter(Boolean),
  },
  
  coldWallets: {
    btc: process.env.COLD_WALLET_BTC,
    eth: process.env.COLD_WALLET_ETH,
    sol: process.env.COLD_WALLET_SOL,
    ltc: process.env.COLD_WALLET_LTC,
  },
  
  env: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
};

function validateConfig() {
  const required = [
    'DISCORD_TOKEN',
    'DISCORD_CLIENT_ID',
    'DATABASE_URL',
    'ENCRYPTION_KEY',
    'MASTER_SEED_PHRASE',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Faltan las siguientes variables de entorno requeridas: ${missing.join(', ')}`
    );
  }
  
  if (config.env === 'production' && config.blockchain.bitcoin.network === 'testnet') {
    console.warn('⚠️  ADVERTENCIA: Bot en producción pero usando testnet para Bitcoin');
  }
}

validateConfig();
