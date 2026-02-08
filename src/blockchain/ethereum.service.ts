import { ethers } from 'ethers';
import { BaseWalletService, WalletData } from './base.service';
import { config } from '../config';
import { logger } from '../utils/logger';

export class EthereumService extends BaseWalletService {
  protected coinType = 60; // ETH coin type
  protected networkType: 'mainnet' | 'testnet';
  private provider: ethers.JsonRpcProvider;

  // ERC-20 Token contracts
  private readonly USDT_CONTRACT = '0xdAC17F958D2ee523a2206206994597C13D831ec7'; // Mainnet
  private readonly USDC_CONTRACT = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // Mainnet

  private readonly ERC20_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function decimals() view returns (uint8)',
  ];

  constructor() {
    super();
    this.networkType = config.blockchain.ethereum.network as 'mainnet' | 'testnet';
    
    let rpcUrl: string;
    if (config.blockchain.ethereum.alchemyKey) {
      const network = this.networkType === 'mainnet' ? 'mainnet' : 'goerli';
      rpcUrl = `https://eth-${network}.g.alchemy.com/v2/${config.blockchain.ethereum.alchemyKey}`;
    } else if (config.blockchain.ethereum.infuraKey) {
      const network = this.networkType === 'mainnet' ? 'mainnet' : 'goerli';
      rpcUrl = `https://${network}.infura.io/v3/${config.blockchain.ethereum.infuraKey}`;
    } else {
      rpcUrl = 'https://cloudflare-eth.com'; // Public fallback
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  async generateWallet(accountIndex: number): Promise<WalletData> {
    try {
      const mnemonic = this.getMasterSeed();
      const derivationPath = this.getDerivationPath(accountIndex);
      
      const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, derivationPath);
      const wallet = new ethers.Wallet(hdNode.privateKey, this.provider);

      const encryptedPrivateKey = this.encryptPrivateKey(wallet.privateKey);

      logger.info(`Generated ETH wallet: ${wallet.address}`);

      return {
        address: wallet.address,
        privateKey: encryptedPrivateKey,
        publicKey: wallet.signingKey.publicKey,
        derivationPath,
      };
    } catch (error) {
      logger.error('Error generating Ethereum wallet:', error);
      throw error;
    }
  }

  async getBalance(address: string, token?: 'ETH' | 'USDT' | 'USDC'): Promise<string> {
    try {
      if (!token || token === 'ETH') {
        const balance = await this.provider.getBalance(address);
        return ethers.formatEther(balance);
      }

      const contractAddress = token === 'USDT' ? this.USDT_CONTRACT : this.USDC_CONTRACT;
      const contract = new ethers.Contract(contractAddress, this.ERC20_ABI, this.provider);
      
      const balance = await contract.balanceOf(address);
      const decimals = await contract.decimals();
      
      return ethers.formatUnits(balance, decimals);
    } catch (error) {
      logger.error(`Error getting ETH balance for ${address}:`, error);
      throw error;
    }
  }

  async sendTransaction(
    encryptedPrivateKey: string,
    toAddress: string,
    amount: string,
    token?: 'ETH' | 'USDT' | 'USDC'
  ): Promise<string> {
    try {
      const privateKey = this.decryptPrivateKey(encryptedPrivateKey);
      const wallet = new ethers.Wallet(privateKey, this.provider);

      if (!token || token === 'ETH') {
        const tx = await wallet.sendTransaction({
          to: toAddress,
          value: ethers.parseEther(amount),
        });

        logger.info(`ETH transaction sent: ${tx.hash}`);
        await tx.wait();
        return tx.hash;
      }

      // ERC-20 Token transfer
      const contractAddress = token === 'USDT' ? this.USDT_CONTRACT : this.USDC_CONTRACT;
      const contract = new ethers.Contract(contractAddress, this.ERC20_ABI, wallet);
      
      const decimals = await contract.decimals();
      const amountInUnits = ethers.parseUnits(amount, decimals);

      const tx = await contract.transfer(toAddress, amountInUnits);
      logger.info(`${token} transaction sent: ${tx.hash}`);
      
      await tx.wait();
      return tx.hash;
    } catch (error) {
      logger.error('Error sending ETH/ERC-20 transaction:', error);
      throw error;
    }
  }

  async getTransactionReceipt(txHash: string): Promise<any> {
    try {
      return await this.provider.getTransactionReceipt(txHash);
    } catch (error) {
      logger.error(`Error getting transaction receipt ${txHash}:`, error);
      throw error;
    }
  }

  async estimateGas(to: string, value: string): Promise<bigint> {
    try {
      return await this.provider.estimateGas({
        to,
        value: ethers.parseEther(value),
      });
    } catch (error) {
      logger.error('Error estimating gas:', error);
      throw error;
    }
  }
}
