import * as bitcoin from 'bitcoinjs-lib';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import axios from 'axios';
import { BaseWalletService, WalletData } from './base.service';
import { config } from '../config';
import { logger } from '../utils/logger';

const bip32 = BIP32Factory(ecc);

export class BitcoinService extends BaseWalletService {
  protected coinType = 0; // BTC coin type
  protected networkType: 'mainnet' | 'testnet';
  private network: bitcoin.Network;
  private apiUrl: string;

  constructor() {
    super();
    this.networkType = config.blockchain.bitcoin.network as 'mainnet' | 'testnet';
    this.network = this.networkType === 'mainnet' 
      ? bitcoin.networks.bitcoin 
      : bitcoin.networks.testnet;
    this.apiUrl = config.blockchain.bitcoin.apiUrl;
  }

  async generateWallet(accountIndex: number): Promise<WalletData> {
    try {
      const mnemonic = this.getMasterSeed();
      const seed = this.mnemonicToSeed(mnemonic);
      const root = bip32.fromSeed(seed, this.network);
      
      const derivationPath = this.getDerivationPath(accountIndex);
      const child = root.derivePath(derivationPath);
      
      if (!child.privateKey) {
        throw new Error('Failed to derive private key');
      }

      const { address } = bitcoin.payments.p2wpkh({
        pubkey: child.publicKey,
        network: this.network,
      });

      if (!address) {
        throw new Error('Failed to generate address');
      }

      const privateKeyWIF = child.toWIF();
      const encryptedPrivateKey = this.encryptPrivateKey(privateKeyWIF);

      logger.info(`Generated BTC wallet: ${address}`);

      return {
        address,
        privateKey: encryptedPrivateKey,
        publicKey: child.publicKey.toString(),
        derivationPath,
      };
    } catch (error) {
      logger.error('Error generating Bitcoin wallet:', error);
      throw error;
    }
  }

  async getBalance(address: string): Promise<string> {
    try {
      const response = await axios.get(`${this.apiUrl}/address/${address}`);
      const satoshis = response.data.chain_stats.funded_txo_sum - 
                       response.data.chain_stats.spent_txo_sum;
      const btc = satoshis / 100000000;
      return btc.toString();
    } catch (error) {
      logger.error(`Error getting BTC balance for ${address}:`, error);
      throw error;
    }
  }

  async getTransactions(address: string): Promise<any[]> {
    try {
      const response = await axios.get(`${this.apiUrl}/address/${address}/txs`);
      return response.data;
    } catch (error) {
      logger.error(`Error getting BTC transactions for ${address}:`, error);
      return [];
    }
  }

  async getTransaction(txHash: string): Promise<any> {
    try {
      const response = await axios.get(`${this.apiUrl}/tx/${txHash}`);
      return response.data;
    } catch (error) {
      logger.error(`Error getting BTC transaction ${txHash}:`, error);
      throw error;
    }
  }

  async sendTransaction(
    encryptedPrivateKey: string,
    toAddress: string,
    amount: string
  ): Promise<string> {
    try {
      const privateKeyWIF = this.decryptPrivateKey(encryptedPrivateKey);
      const ECPairFactory = require('ecpair').default;
      const keyPair = ECPairFactory(ecc).fromWIF(privateKeyWIF, this.network);
      
      // Get payment object to derive from address
      const { address: fromAddress } = bitcoin.payments.p2wpkh({
        pubkey: keyPair.publicKey,
        network: this.network,
      });

      if (!fromAddress) {
        throw new Error('Could not derive from address');
      }

      // Get UTXOs
      const utxosResponse = await axios.get(`${this.apiUrl}/address/${fromAddress}/utxo`);
      const utxos = utxosResponse.data;

      if (!utxos || utxos.length === 0) {
        throw new Error('No UTXOs available');
      }

      // Create transaction
      const psbt = new bitcoin.Psbt({ network: this.network });
      
      let totalInput = 0;
      const amountSatoshis = Math.floor(parseFloat(amount) * 100000000);
      const feeRate = 10; // satoshis per byte
      
      // Add inputs
      for (const utxo of utxos) {
        const txHex = await this.getRawTransaction(utxo.txid);
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          witnessUtxo: {
            script: Buffer.from(
              bitcoin.payments.p2wpkh({
                pubkey: keyPair.publicKey,
                network: this.network,
              }).output!
            ),
            value: BigInt(utxo.value),
          },
        });
        
        totalInput += utxo.value;
        
        // Break if we have enough
        if (totalInput >= amountSatoshis + 1000) break;
      }

      // Estimate fee (rough estimate)
      const estimatedSize = psbt.txInputs.length * 148 + 2 * 34 + 10;
      const fee = estimatedSize * feeRate;

      if (totalInput < amountSatoshis + fee) {
        throw new Error(`Insufficient funds. Have: ${totalInput}, Need: ${amountSatoshis + fee}`);
      }

      // Add output to recipient
      psbt.addOutput({
        address: toAddress,
        value: BigInt(amountSatoshis),
      });

      // Add change output if needed
      const change = totalInput - amountSatoshis - fee;
      if (change > 546) { // Dust limit
        psbt.addOutput({
          address: fromAddress,
          value: BigInt(change),
        });
      }

      // Sign all inputs
      psbt.signAllInputs(keyPair);
      psbt.finalizeAllInputs();

      // Get transaction hex
      const tx = psbt.extractTransaction();
      const txHex = tx.toHex();

      // Broadcast transaction
      const broadcastResponse = await axios.post(`${this.apiUrl}/tx`, txHex);
      const txHash = tx.getId();

      logger.info(`Bitcoin transaction broadcast: ${txHash}`);
      return txHash;

    } catch (error) {
      logger.error('Error sending Bitcoin transaction:', error);
      throw error;
    }
  }

  private async getRawTransaction(txid: string): Promise<string> {
    const response = await axios.get(`${this.apiUrl}/tx/${txid}/hex`);
    return response.data;
  }
}
