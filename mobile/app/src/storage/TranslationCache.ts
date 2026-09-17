import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Interface for cached translation entries
 */
export interface CachedTranslation {
  id: string;
  sourceText: string;
  sourceLanguage: string;
  targetLanguage: string;
  translatedText: string;
  timestamp: number;
  expiresAt: number;
}

/**
 * Configuration for translation cache
 */
export interface CacheConfig {
  maxEntries?: number;
  ttlMinutes?: number; // Time to live in minutes
}

const CACHE_KEY = 'translation_cache';
const DEFAULT_MAX_ENTRIES = 100;
const DEFAULT_TTL_MINUTES = 7 * 24 * 60; // 7 days in minutes

/**
 * TranslationCache - Manages offline caching of recent translations
 * with support for expiration policies and duplicate prevention
 */
class TranslationCacheImpl {
  private maxEntries: number;
  private ttlMinutes: number;

  constructor(config: CacheConfig = {}) {
    this.maxEntries = config.maxEntries || DEFAULT_MAX_ENTRIES;
    this.ttlMinutes = config.ttlMinutes || DEFAULT_TTL_MINUTES;
  }

  /**
   * Generate a unique ID for a translation entry
   */
  private generateId(sourceText: string, sourceLanguage: string, targetLanguage: string): string {
    return `${sourceLanguage}_${targetLanguage}_${sourceText.substring(0, 50)}`.toLowerCase();
  }

  /**
   * Add a translation to the cache
   * Prevents duplicate entries and manages cache size
   */
  async addTranslation(
    sourceText: string,
    sourceLanguage: string,
    targetLanguage: string,
    translatedText: string
  ): Promise<void> {
    try {
      const cache = await this.getAllTranslations();
      const id = this.generateId(sourceText, sourceLanguage, targetLanguage);
      
      // Remove existing entry if it exists (to update it)
      const filteredCache = cache.filter((entry) => entry.id !== id);
      
      // Create new entry
      const newEntry: CachedTranslation = {
        id,
        sourceText,
        sourceLanguage,
        targetLanguage,
        translatedText,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.ttlMinutes * 60 * 1000,
      };

      // Add new entry at the beginning
      const updatedCache = [newEntry, ...filteredCache];

      // Trim to max entries if necessary
      if (updatedCache.length > this.maxEntries) {
        updatedCache.splice(this.maxEntries);
      }

      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(updatedCache));
    } catch (error) {
      console.error('[TranslationCache] Error adding translation:', error);
      throw error;
    }
  }

  /**
   * Get a translation from the cache
   * Returns null if not found or expired
   */
  async getTranslation(
    sourceText: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<CachedTranslation | null> {
    try {
      const cache = await this.getAllTranslations();
      const id = this.generateId(sourceText, sourceLanguage, targetLanguage);
      
      const entry = cache.find((e) => e.id === id);
      
      if (!entry) {
        return null;
      }

      // Check if entry is expired
      if (Date.now() > entry.expiresAt) {
        // Remove expired entry
        await this.removeTranslation(sourceText, sourceLanguage, targetLanguage);
        return null;
      }

      return entry;
    } catch (error) {
      console.error('[TranslationCache] Error retrieving translation:', error);
      return null;
    }
  }

  /**
   * Get all cached translations, removing expired ones
   */
  async getAllTranslations(): Promise<CachedTranslation[]> {
    try {
      const data = await AsyncStorage.getItem(CACHE_KEY);
      if (!data) {
        return [];
      }

      const cache: CachedTranslation[] = JSON.parse(data);
      const now = Date.now();

      // Filter out expired entries
      const validCache = cache.filter((entry) => now <= entry.expiresAt);

      // If we removed expired entries, update storage
      if (validCache.length < cache.length) {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(validCache));
      }

      return validCache;
    } catch (error) {
      console.error('[TranslationCache] Error reading cache:', error);
      return [];
    }
  }

  /**
   * Remove a specific translation from the cache
   */
  async removeTranslation(
    sourceText: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<void> {
    try {
      const cache = await this.getAllTranslations();
      const id = this.generateId(sourceText, sourceLanguage, targetLanguage);
      
      const filteredCache = cache.filter((entry) => entry.id !== id);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(filteredCache));
    } catch (error) {
      console.error('[TranslationCache] Error removing translation:', error);
      throw error;
    }
  }

  /**
   * Get recent translations for a specific language pair
   */
  async getRecentTranslations(
    sourceLanguage: string,
    targetLanguage: string,
    limit: number = 10
  ): Promise<CachedTranslation[]> {
    try {
      const cache = await this.getAllTranslations();
      
      return cache
        .filter(
          (entry) =>
            entry.sourceLanguage === sourceLanguage &&
            entry.targetLanguage === targetLanguage
        )
        .slice(0, limit);
    } catch (error) {
      console.error('[TranslationCache] Error retrieving recent translations:', error);
      return [];
    }
  }

  /**
   * Clear all translations from the cache
   */
  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.error('[TranslationCache] Error clearing cache:', error);
      throw error;
    }
  }

  /**
   * Clean up expired entries
   */
  async cleanupExpired(): Promise<number> {
    try {
      const cache = await this.getAllTranslations();
      const now = Date.now();
      
      const validCache = cache.filter((entry) => now <= entry.expiresAt);
      const removedCount = cache.length - validCache.length;

      if (removedCount > 0) {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(validCache));
      }

      return removedCount;
    } catch (error) {
      console.error('[TranslationCache] Error during cleanup:', error);
      return 0;
    }
  }
}

export const translationCache = new TranslationCacheImpl();
