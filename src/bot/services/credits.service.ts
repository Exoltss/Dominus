import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();

export class CreditsService {
  /**
   * Get user's credit balance
   */
  static async getCredits(discordId: string): Promise<number> {
    try {
      const user = await prisma.user.findUnique({
        where: { discordId },
        include: { credits: true },
      });

      if (!user) {
        // Create user if doesn't exist
        await prisma.user.create({
          data: {
            discordId,
            discordTag: 'Unknown',
            credits: {
              create: {
                credits: 0,
              },
            },
          },
        });
        return 0;
      }

      return user.credits?.credits || 0;
    } catch (error) {
      logger.error('Error getting credits:', error);
      throw error;
    }
  }

  /**
   * Add credits to user (admin function)
   */
  static async addCredits(
    discordId: string,
    amount: number,
    adminId: string,
    reason?: string
  ): Promise<{ success: boolean; newBalance: number }> {
    try {
      // Ensure user exists
      let user = await prisma.user.findUnique({
        where: { discordId },
        include: { credits: true },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            discordId,
            discordTag: 'Unknown',
          },
          include: { credits: true },
        });
      }

      // Get current balance
      const currentBalance = user.credits?.credits || 0;
      const newBalance = currentBalance + amount;

      // Update or create credits
      if (user.credits) {
        await prisma.userCredits.update({
          where: { userId: user.id },
          data: { credits: newBalance },
        });
      } else {
        await prisma.userCredits.create({
          data: {
            userId: user.id,
            credits: newBalance,
          },
        });
      }

      // Log transaction
      await prisma.creditTransaction.create({
        data: {
          userId: user.id,
          amount,
          type: 'ADD',
          reason: reason || 'Admin added credits',
          adminId,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
        },
      });

      logger.info(`Added ${amount} credits to ${discordId}. New balance: ${newBalance}`);
      return { success: true, newBalance };
    } catch (error) {
      logger.error('Error adding credits:', error);
      throw error;
    }
  }

  /**
   * Remove credits from user (admin function)
   */
  static async removeCredits(
    discordId: string,
    amount: number,
    adminId: string,
    reason?: string
  ): Promise<{ success: boolean; newBalance: number }> {
    try {
      const user = await prisma.user.findUnique({
        where: { discordId },
        include: { credits: true },
      });

      if (!user || !user.credits) {
        throw new Error('User not found or has no credits');
      }

      const currentBalance = user.credits.credits;
      const newBalance = Math.max(0, currentBalance - amount);

      await prisma.userCredits.update({
        where: { userId: user.id },
        data: { credits: newBalance },
      });

      // Log transaction
      await prisma.creditTransaction.create({
        data: {
          userId: user.id,
          amount: -amount,
          type: 'REMOVE',
          reason: reason || 'Admin removed credits',
          adminId,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
        },
      });

      logger.info(`Removed ${amount} credits from ${discordId}. New balance: ${newBalance}`);
      return { success: true, newBalance };
    } catch (error) {
      logger.error('Error removing credits:', error);
      throw error;
    }
  }

  /**
   * Set user's credits to specific amount (admin function)
   */
  static async setCredits(
    discordId: string,
    amount: number,
    adminId: string,
    reason?: string
  ): Promise<{ success: boolean; newBalance: number }> {
    try {
      let user = await prisma.user.findUnique({
        where: { discordId },
        include: { credits: true },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            discordId,
            discordTag: 'Unknown',
          },
          include: { credits: true },
        });
      }

      const currentBalance = user.credits?.credits || 0;

      if (user.credits) {
        await prisma.userCredits.update({
          where: { userId: user.id },
          data: { credits: amount },
        });
      } else {
        await prisma.userCredits.create({
          data: {
            userId: user.id,
            credits: amount,
          },
        });
      }

      // Log transaction
      await prisma.creditTransaction.create({
        data: {
          userId: user.id,
          amount: amount - currentBalance,
          type: 'SET',
          reason: reason || 'Admin set credits',
          adminId,
          balanceBefore: currentBalance,
          balanceAfter: amount,
        },
      });

      logger.info(`Set credits for ${discordId} to ${amount}. Previous: ${currentBalance}`);
      return { success: true, newBalance: amount };
    } catch (error) {
      logger.error('Error setting credits:', error);
      throw error;
    }
  }

  /**
   * Deduct credits from user (for XTools operations)
   */
  static async deductCredits(
    discordId: string,
    amount: number,
    reason: string
  ): Promise<{ success: boolean; newBalance: number }> {
    try {
      const user = await prisma.user.findUnique({
        where: { discordId },
        include: { credits: true },
      });

      if (!user || !user.credits) {
        throw new Error('User not found or has no credits');
      }

      const currentBalance = user.credits.credits;

      if (currentBalance < amount) {
        throw new Error('Insufficient credits');
      }

      const newBalance = currentBalance - amount;

      await prisma.userCredits.update({
        where: { userId: user.id },
        data: { credits: newBalance },
      });

      // Log transaction
      await prisma.creditTransaction.create({
        data: {
          userId: user.id,
          amount: -amount,
          type: 'DEDUCT',
          reason,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
        },
      });

      logger.info(`Deducted ${amount} credits from ${discordId}. New balance: ${newBalance}`);
      return { success: true, newBalance };
    } catch (error) {
      logger.error('Error deducting credits:', error);
      throw error;
    }
  }

  /**
   * Refund credits to user (for failed operations)
   */
  static async refundCredits(
    discordId: string,
    amount: number,
    reason: string
  ): Promise<{ success: boolean; newBalance: number }> {
    try {
      let user = await prisma.user.findUnique({
        where: { discordId },
        include: { credits: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const currentBalance = user.credits?.credits || 0;
      const newBalance = currentBalance + amount;

      if (user.credits) {
        await prisma.userCredits.update({
          where: { userId: user.id },
          data: { credits: newBalance },
        });
      } else {
        await prisma.userCredits.create({
          data: {
            userId: user.id,
            credits: newBalance,
          },
        });
      }

      // Log transaction
      await prisma.creditTransaction.create({
        data: {
          userId: user.id,
          amount,
          type: 'REFUND',
          reason,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
        },
      });

      logger.info(`Refunded ${amount} credits to ${discordId}. New balance: ${newBalance}`);
      return { success: true, newBalance };
    } catch (error) {
      logger.error('Error refunding credits:', error);
      throw error;
    }
  }

  /**
   * Get top users by credits
   */
  static async getLeaderboard(limit: number = 10) {
    try {
      const topUsers = await prisma.userCredits.findMany({
        take: limit,
        orderBy: { credits: 'desc' },
        include: {
          user: true,
        },
      });

      return topUsers;
    } catch (error) {
      logger.error('Error getting leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get credit transaction history
   */
  static async getTransactionHistory(discordId: string, limit: number = 20) {
    try {
      const user = await prisma.user.findUnique({
        where: { discordId },
      });

      if (!user) {
        return [];
      }

      const transactions = await prisma.creditTransaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return transactions;
    } catch (error) {
      logger.error('Error getting transaction history:', error);
      throw error;
    }
  }
}
