import axios, { AxiosInstance } from 'axios';
import { logger } from '../../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

interface XToolsConfig {
  ApiKey?: string;
  [key: string]: any;
}

interface XToolsResponse<T = any> {
  message?: T;
  code: number;
}

interface TaskStatusResponse {
  State: string;
  Result: any;
  CreatedAt: string;
}

export class XToolsService {
  private static apiClient: AxiosInstance;
  private static apiKey: string;
  private static baseURL: string = 'http://localhost:5000';

  /**
   * Initialize XTools service
   */
  static initialize() {
    try {
      // Try to read API key from XTools config
      const xtoolsConfigPath = path.join(
        'C:',
        'Users',
        'sauce',
        'OneDrive',
        'Escritorio',
        'XTools',
        'Config',
        'XtoolsConfig.json'
      );

      if (fs.existsSync(xtoolsConfigPath)) {
        const configData = fs.readFileSync(xtoolsConfigPath, 'utf-8');
        const config: XToolsConfig = JSON.parse(configData);
        
        this.apiKey = config.ApiKey || 'your-secret-key';
      } else {
        logger.warn('XTools config not found, using default API key');
        this.apiKey = 'Dominus-RbX-7K9mP4nQ8wZv2LxY6TaF3sJc';
      }

      this.apiClient = axios.create({
        baseURL: this.baseURL,
        headers: {
          'Api-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      logger.info('XTools service initialized');
    } catch (error) {
      logger.error('Error initializing XTools service:', error);
      throw error;
    }
  }

  /**
   * Follow a Roblox user
   */
  static async followUser(userId: string, amount: number = 1): Promise<XToolsResponse> {
    try {
      const response = await this.apiClient.post('/api/follow', {
        user_id: userId,
        amount: amount > 1 ? amount : undefined,
      });
      
      return response.data;
    } catch (error) {
      logger.error('Error following user:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Generate new Roblox account
   */
  static async generateAccount(
    username?: string,
    password?: string,
    birth?: string,
    gender?: number
  ): Promise<any> {
    try {
      const response = await this.apiClient.post('/api/generate', {
        username,
        password,
        birth,
        gender,
      });
      
      return response.data;
    } catch (error) {
      logger.error('Error generating account:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Brute force account checker
   */
  static async bruterAccount(username: string, password: string): Promise<any> {
    try {
      const response = await this.apiClient.post('/api/bruter', {
        username,
        password,
      });
      
      return response.data;
    } catch (error) {
      logger.error('Error bruter account:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Join Roblox group
   */
  static async joinGroup(groupId: string, amount: number = 1): Promise<XToolsResponse> {
    try {
      const response = await this.apiClient.post('/api/join_group', {
        group_id: groupId,
        amount: amount > 1 ? amount : undefined,
      });
      
      return response.data;
    } catch (error) {
      logger.error('Error joining group:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Change account display name
   */
  static async changeDisplayName(cookie: string, displayName: string): Promise<XToolsResponse> {
    try {
      const response = await this.apiClient.post('/api/change_display_name', {
        cookie,
        display_name: displayName,
      });
      
      return response.data;
    } catch (error) {
      logger.error('Error changing display name:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Humanize account (add realistic traits)
   */
  static async humanizeAccount(cookie: string): Promise<XToolsResponse> {
    try {
      const response = await this.apiClient.post('/api/humamize', {
        cookie,
      });
      
      return response.data;
    } catch (error) {
      logger.error('Error humanizing account:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Change account password
   */
  static async changePassword(cookie: string, oldPassword: string): Promise<any> {
    try {
      const response = await this.apiClient.post('/api/ChangePass', {
        cookie,
        old_password: oldPassword,
      });
      
      return response.data;
    } catch (error) {
      logger.error('Error changing password:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get account information
   */
  static async getAccountInfo(cookie: string): Promise<any> {
    try {
      const response = await this.apiClient.post('/api/AccountInfo', {
        cookie,
      });
      
      return response.data;
    } catch (error) {
      logger.error('Error getting account info:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Check task status
   */
  static async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    try {
      const response = await this.apiClient.get('/task/state', {
        params: { task_id: taskId },
      });
      
      return response.data;
    } catch (error) {
      logger.error('Error getting task status:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Poll task until completion
   */
  static async pollTaskUntilComplete(
    taskId: string,
    maxAttempts: number = 60,
    intervalMs: number = 3000
  ): Promise<TaskStatusResponse> {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.getTaskStatus(taskId);
      
      if (status.State !== 'Pending') {
        return status;
      }
      
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    
    throw new Error('Task timeout: took too long to complete');
  }

  /**
   * Handle API errors
   */
  private static handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const code = error.response?.data?.code;
      const message = error.response?.data?.message || error.message;
      
      switch (code) {
        case 1001:
          return new Error('Invalid API Key');
        case 1002:
          return new Error('Missing required field');
        case 1003:
          return new Error('Invalid Task ID');
        case 1004:
          return new Error('Invalid Cookie');
        case 5000:
          return new Error('Internal server error');
        default:
          return new Error(`XTools API Error: ${message}`);
      }
    }
    
    return error instanceof Error ? error : new Error('Unknown error');
  }

  /**
   * Test connection to XTools API
   */
  static async testConnection(): Promise<boolean> {
    try {
      // Try a simple request to see if API is reachable
      await this.apiClient.get('/task/state', {
        params: { task_id: 'test' },
        validateStatus: () => true, // Accept any status
      });
      return true;
    } catch (error) {
      logger.error('XTools connection test failed:', error);
      return false;
    }
  }
}

// Initialize on module load
XToolsService.initialize();
