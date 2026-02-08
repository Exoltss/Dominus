import * as bitcoin from 'bitcoinjs-lib';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import axios from 'axios';
import { BaseWalletService, WalletData } from './base.service';
import { config } from '../config';
import { logger } from '../utils/logger';

const bip32 = BIP32Factory(ecc);

// Litecoin network parameters
const litecoinTestnet: bitcoin.Network = {
  messagePrefix: '\x19Litecoin Signed Message:\n',
  bech32: 'tltc',
  bip32: {
    public: 0x043587cf,
    private: 0x04358394,
  },
  pubKeyHash: 0x6f,
  scriptHash: 0x3a,
  wif: 0xef,
};

const litecoinMainnet: bitcoin.Network = {
  messagePrefix: '\x19Litecoin Signed Message:\n',
  bech32: 'ltc',
  bip32: {
    public: 0x019da462,
    private: 0x019d9cfe,
  },
  pubKeyHash: 0x30,
  scriptHash: 0x32,
  wif: 0xb0,
};

export class LitecoinService extends BaseWalletService {
  protected coinType = 2; // LTC coin type
  protected networkType: 'mainnet' | 'testnet';
  private network: bitcoin.Network;
  private apiUrl: string;

  constructor() {
    super();
    this.networkType = config.blockchain.bitcoin.network as 'mainnet' | 'testnet';
    this.network = this.networkType === 'mainnet' 
      ? litecoinMainnet
      : litecoinTestnet;
    this.apiUrl = this.networkType === 'mainnet'
      ? 'https://api.blockcypher.com/v1/ltc/main'
      : 'https://testnet.litecore.io/api';
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
        throw new Error('Failed to generate Litecoin address');
      }

      const privateKeyWIF = child.toWIF();
      const encryptedPrivateKey = this.encryptPrivateKey(privateKeyWIF);

      return {
        address,
        privateKey: encryptedPrivateKey,
        publicKey: child.publicKey.toString(),
        derivationPath,
      };
    } catch (error) {
      logger.error('Error generating Litecoin wallet:', error);
      throw error;
    }
  }

  async getBalance(address: string): Promise<string> {
    try {
      const response = await axios.get(`${this.apiUrl}/addrs/${address}/balance`);
      const balanceSatoshis = response.data.balance || 0;
      const ltcBalance = balanceSatoshis / 100000000;
      return ltcBalance.toString();
    } catch (error) {
      logger.error('Error fetching Litecoin balance:', error);
      return '0';
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

      // Get UTXOs from API
      const utxosResponse = await axios.get(`${this.apiUrl}/addrs/${fromAddress}`);
      const utxos = utxosResponse.data.txrefs || [];

      if (!utxos || utxos.length === 0) {
        throw new Error('No UTXOs available');
      }

      // Create transaction
      const psbt = new bitcoin.Psbt({ network: this.network });
      
      let totalInput = 0;
      const amountLitoshis = Math.floor(parseFloat(amount) * 100000000);
      const feeRate = 50; // litoshis per byte (Litecoin fees are cheaper)
      
      // Add inputs
      for (const utxo of utxos) {
        psbt.addInput({
          hash: utxo.tx_hash,
          index: utxo.tx_output_n,
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
        if (totalInput >= amountLitoshis + 10000) break;
      }

      // Estimate fee
      const estimatedSize = psbt.txInputs.length * 148 + 2 * 34 + 10;
      const fee = estimatedSize * feeRate;

      if (totalInput < amountLitoshis + fee) {
        throw new Error(`Insufficient funds. Have: ${totalInput}, Need: ${amountLitoshis + fee}`);
      }

      // Add output to recipient
      psbt.addOutput({
        address: toAddress,
        value: BigInt(amountLitoshis),
      });

      // Add change output if needed
      const change = totalInput - amountLitoshis - fee;
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

      // Broadcast transaction (Litecoin uses different API)
      const broadcastUrl = this.networkType === 'mainnet' 
        ? 'https://api.blockcypher.com/v1/ltc/main/txs/push'
        : 'https://testnet.litecore.io/api/tx/send';
      
      const broadcastResponse = await axios.post(broadcastUrl, { tx: txHex });
      const txHash = tx.getId();

      logger.info(`Litecoin transaction broadcast: ${txHash}`);
      return txHash;

    } catch (error) {
      logger.error('Error sending Litecoin transaction:', error);
      throw error;
    }
  }
}
