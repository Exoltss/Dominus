import * as bip39 from 'bip39';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import { CryptoService } from '../utils/crypto';
import { logger } from '../utils/logger';

const bip32 = BIP32Factory(ecc);

export interface WalletData {
  address: string;
  privateKey: string; // Encrypted
  publicKey?: string;
  derivationPath: string;
}

export abstract class BaseWalletService {
  protected abstract coinType: number;
  protected abstract networkType: 'mainnet' | 'testnet';

  protected getMasterSeed(): string {
    // In production, this should be stored VERY securely
    // For now, generate or use from env
    const seedPhrase = process.env.MASTER_SEED_PHRASE;
    
    console.log('[WALLET] MASTER_SEED_PHRASE exists:', !!seedPhrase);
    console.log('[WALLET] MASTER_SEED_PHRASE length:', seedPhrase ? seedPhrase.length : 0);
    
    if (!seedPhrase) {
      throw new Error('MASTER_SEED_PHRASE not configured');
    }
    
    if (!bip39.validateMnemonic(seedPhrase)) {
      console.log('[WALLET] Invalid mnemonic, checking if quoted...');
      // Maybe it's wrapped in quotes - try removing them
      const cleaned = seedPhrase.replace(/^["']|["']$/g, '');
      if (bip39.validateMnemonic(cleaned)) {
        console.log('[WALLET] Using cleaned mnemonic (quotes removed)');
        return cleaned;
      }
      throw new Error('Invalid master seed phrase');
    }
    
    return seedPhrase;
  }

  protected generateMnemonic(): string {
    return bip39.generateMnemonic(256); // 24 words
  }

  protected mnemonicToSeed(mnemonic: string): Buffer {
    return bip39.mnemonicToSeedSync(mnemonic);
  }

  protected getDerivationPath(accountIndex: number = 0): string {
    // BIP44: m / purpose' / coin_type' / account' / change / address_index
    return `m/44'/${this.coinType}'/${accountIndex}'/0/0`;
  }

  protected encryptPrivateKey(privateKey: string): string {
    return CryptoService.encrypt(privateKey);
  }

  protected decryptPrivateKey(encryptedKey: string): string {
    return CryptoService.decrypt(encryptedKey);
  }

  abstract generateWallet(accountIndex: number): Promise<WalletData>;
  abstract getBalance(address: string): Promise<string>;
  abstract sendTransaction(
    fromPrivateKey: string,
    toAddress: string,
    amount: string
  ): Promise<string>;
}
