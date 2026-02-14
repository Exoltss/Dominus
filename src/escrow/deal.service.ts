import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { BlockchainFactory, CryptoType } from '../blockchain/factory';
import { config } from '../config';

const prisma = new PrismaClient();

export interface CreateDealParams {
  buyerDiscordId: string;
  buyerDiscordTag: string;
  sellerDiscordId: string;
  sellerDiscordTag: string;
  cryptocurrency: CryptoType;
  amount: string;
  description: string;
  creatorLanguage?: string;
}

export class DealService {
  static async getOrCreateUser(discordId: string, discordTag: string) {
    let user = await prisma.user.findUnique({
      where: { discordId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          discordId,
          discordTag,
        },
      });
      logger.info(`Created new user: ${discordTag} (${discordId})`);
    }

    return user;
  }

  static async createDeal(params: CreateDealParams) {
    try {
      logger.info(`[DEAL] Starting deal creation for ${params.cryptocurrency} ${params.amount}`);
      
      // Check if MASTER_SEED_PHRASE is configured
      const seedPhrase = process.env.MASTER_SEED_PHRASE;
      if (!seedPhrase) {
        logger.error('[DEAL] MASTER_SEED_PHRASE environment variable is not set!');
        throw new Error('MASTER_SEED_PHRASE not configured. Please set the MASTER_SEED_PHRASE environment variable.');
      }
      
      const buyer = await this.getOrCreateUser(params.buyerDiscordId, params.buyerDiscordTag);
      const seller = await this.getOrCreateUser(params.sellerDiscordId, params.sellerDiscordTag);

      logger.info(`[DEAL] Buyer: ${buyer.discordTag}, Seller: ${seller.discordTag}`);

      if (buyer.isBlacklisted || seller.isBlacklisted) {
        throw new Error('One of the users is blacklisted');
      }

      const dealCount = await prisma.deal.count();
      const dealNumber = dealCount + 1;

      const feePercentage = config.bot.feePercentage.toString();
      const amountNumber = parseFloat(params.amount);
      const feeAmount = (amountNumber * config.bot.feePercentage / 100).toString();

      const deal = await prisma.deal.create({
        data: {
          dealNumber,
          buyerId: buyer.id,
          sellerId: seller.id,
          cryptocurrency: params.cryptocurrency,
          amount: params.amount,
          feePercentage,
          feeAmount,
          description: params.description,
          status: 'AWAITING_DEPOSIT',
          creatorLanguage: params.creatorLanguage || 'es',
        },
      });

      logger.info(`Deal #${dealNumber} created in database, now generating ${params.cryptocurrency} wallet...`);
      
      const wallet = await BlockchainFactory.generateWallet(params.cryptocurrency, dealNumber);

      await prisma.wallet.create({
        data: {
          dealId: deal.id,
          cryptocurrency: params.cryptocurrency,
          address: wallet.address,
          privateKey: wallet.privateKey,
          publicKey: wallet.publicKey || '',
          derivationPath: wallet.derivationPath,
        },
      });

      await prisma.auditLog.create({
        data: {
          action: 'DEAL_CREATED',
          userId: seller.id,
          dealId: deal.id,
          details: JSON.stringify({
            cryptocurrency: params.cryptocurrency,
            amount: params.amount,
            buyer: buyer.discordTag,
            seller: seller.discordTag,
          }),
        },
      });

      logger.info(`Deal #${dealNumber} created: ${params.cryptocurrency} ${params.amount}`);

      return {
        deal,
        wallet,
      };
    } catch (error) {
      logger.error('Error creating deal:', error);
      throw error;
    }
  }

  static async getDealByNumber(dealNumber: number) {
    return await prisma.deal.findUnique({
      where: { dealNumber },
      include: {
        buyer: true,
        seller: true,
        wallet: true,
      },
    });
  }

  static async updateDealStatus(dealId: string, status: string) {
    return await prisma.deal.update({
      where: { id: dealId },
      data: { status },
    });
  }

  static async confirmDeposit(dealId: string, txHash: string, confirmations: number) {
    return await prisma.deal.update({
      where: { id: dealId },
      data: {
        depositTxHash: txHash,
        depositConfirmed: true,
        confirmations,
        status: 'DEPOSIT_CONFIRMED',
      },
    });
  }

  static async releaseFunds(dealId: string, txHash: string) {
    return await prisma.deal.update({
      where: { id: dealId },
      data: {
        releaseTxHash: txHash,
        releasedAt: new Date(),
        status: 'COMPLETED',
      },
    });
  }

  static async cancelDeal(dealId: string, cancelledBy: string, reason: string) {
    return await prisma.deal.update({
      where: { id: dealId },
      data: {
        cancelledBy,
        cancelReason: reason,
        cancelledAt: new Date(),
        status: 'CANCELLED',
      },
    });
  }

  static async updateBuyerLanguage(dealId: string, language: string) {
    return await prisma.deal.update({
      where: { id: dealId },
      data: {
        buyerLanguage: language,
      },
    });
  }
}
