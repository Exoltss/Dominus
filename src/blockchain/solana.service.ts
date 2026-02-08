import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import { BaseWalletService, WalletData } from './base.service';
import { config } from '../config';
import { logger } from '../utils/logger';

export class SolanaService extends BaseWalletService {
  protected coinType = 501; // SOL coin type
  protected networkType: 'mainnet' | 'testnet';
  private connection: Connection;

  constructor() {
    super();
    this.networkType = config.blockchain.solana.network as 'mainnet' | 'testnet';
    this.connection = new Connection(config.blockchain.solana.rpcUrl, 'confirmed');
  }

  async generateWallet(accountIndex: number): Promise<WalletData> {
    try {
      const mnemonic = this.getMasterSeed();
      const seed = this.mnemonicToSeed(mnemonic);
      
      const derivationPath = this.getDerivationPath(accountIndex);
      const derivedSeed = derivePath(derivationPath, seed.toString('hex')).key;
      
      const keypair = Keypair.fromSeed(derivedSeed);
      const address = keypair.publicKey.toString();

      const privateKeyArray = Array.from(keypair.secretKey);
      const encryptedPrivateKey = this.encryptPrivateKey(JSON.stringify(privateKeyArray));

      logger.info(`Generated SOL wallet: ${address}`);

      return {
        address,
        privateKey: encryptedPrivateKey,
        publicKey: keypair.publicKey.toString(),
        derivationPath,
      };
    } catch (error) {
      logger.error('Error generating Solana wallet:', error);
      throw error;
    }
  }

  async getBalance(address: string): Promise<string> {
    try {
      const publicKey = new PublicKey(address);
      const balance = await this.connection.getBalance(publicKey);
      return (balance / LAMPORTS_PER_SOL).toString();
    } catch (error) {
      logger.error(`Error getting SOL balance for ${address}:`, error);
      throw error;
    }
  }

  async sendTransaction(
    encryptedPrivateKey: string,
    toAddress: string,
    amount: string
  ): Promise<string> {
    try {
      const privateKeyJson = this.decryptPrivateKey(encryptedPrivateKey);
      const privateKeyArray = JSON.parse(privateKeyJson);
      const keypair = Keypair.fromSecretKey(Uint8Array.from(privateKeyArray));

      const toPublicKey = new PublicKey(toAddress);
      const lamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: toPublicKey,
          lamports,
        })
      );

      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [keypair]
      );

      logger.info(`SOL transaction sent: ${signature}`);
      return signature;
    } catch (error) {
      logger.error('Error sending SOL transaction:', error);
      throw error;
    }
  }

  async getTransaction(signature: string): Promise<any> {
    try {
      return await this.connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });
    } catch (error) {
      logger.error(`Error getting SOL transaction ${signature}:`, error);
      throw error;
    }
  }

  async getRecentTransactions(address: string, limit: number = 10): Promise<any[]> {
    try {
      const publicKey = new PublicKey(address);
      const signatures = await this.connection.getSignaturesForAddress(publicKey, { limit });
      return signatures;
    } catch (error) {
      logger.error(`Error getting SOL transactions for ${address}:`, error);
      return [];
    }
  }
}
