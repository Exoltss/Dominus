import { BitcoinService } from './bitcoin.service';
import { EthereumService } from './ethereum.service';
import { SolanaService } from './solana.service';
import { LitecoinService } from './litecoin.service';
import { logger } from '../utils/logger';

export type CryptoType = 'BTC' | 'ETH' | 'SOL' | 'LTC' | 'USDT' | 'USDC';

export class BlockchainFactory {
  private static bitcoinService: BitcoinService;
  private static litecoinService: LitecoinService;
  private static ethereumService: EthereumService;
  private static solanaService: SolanaService;

  static getService(crypto: CryptoType) {
    switch (crypto) {
      case 'BTC':
        if (!this.bitcoinService) {
          this.bitcoinService = new BitcoinService();
        }
        return this.bitcoinService;

      case 'LTC':
        if (!this.litecoinService) {
          this.litecoinService = new LitecoinService();
        }
        return this.litecoinService;

      case 'ETH':
      case 'USDT':
      case 'USDC':
        if (!this.ethereumService) {
          this.ethereumService = new EthereumService();
        }
        return this.ethereumService;

      case 'SOL':
        if (!this.solanaService) {
          this.solanaService = new SolanaService();
        }
        return this.solanaService;

      default:
        throw new Error(`Unsupported cryptocurrency: ${crypto}`);
    }
  }

  static async generateWallet(crypto: CryptoType, accountIndex: number) {
    const service = this.getService(crypto);
    return await service.generateWallet(accountIndex);
  }

  static async getBalance(crypto: CryptoType, address: string) {
    const service = this.getService(crypto);
    
    if (crypto === 'USDT' || crypto === 'USDC') {
      return await (service as EthereumService).getBalance(address, crypto);
    }
    
    return await service.getBalance(address);
  }

  static async sendTransaction(
    crypto: CryptoType,
    encryptedPrivateKey: string,
    toAddress: string,
    amount: string
  ) {
    const service = this.getService(crypto);
    
    if (crypto === 'USDT' || crypto === 'USDC') {
      return await (service as EthereumService).sendTransaction(
        encryptedPrivateKey,
        toAddress,
        amount,
        crypto
      );
    }
    
    return await service.sendTransaction(encryptedPrivateKey, toAddress, amount);
  }
}
