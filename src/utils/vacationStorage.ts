/**
 * LocalStorage utilities for Vacation Requests
 */

import { VacationRequest } from '../types/vacation';

const STORAGE_KEY_PREFIX = 'wpdl_vacation_';
const STORAGE_KEY_LIST = 'wpdl_vacation_list';

export class VacationStorage {
  /**
   * Save a vacation request
   */
  static saveRequest(request: VacationRequest): void {
    try {
      const key = `${STORAGE_KEY_PREFIX}${request.id}`;
      localStorage.setItem(key, JSON.stringify(request));

      // Update list of request IDs
      const list = this.getRequestList();
      if (!list.includes(request.id)) {
        list.push(request.id);
        localStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(list));
      }
    } catch (error) {
      console.error('Failed to save vacation request:', error);
      throw new Error('Speichern fehlgeschlagen');
    }
  }

  /**
   * Get a vacation request by ID
   */
  static getRequest(id: string): VacationRequest | null {
    try {
      const key = `${STORAGE_KEY_PREFIX}${id}`;
      const data = localStorage.getItem(key);
      if (!data) return null;
      return JSON.parse(data) as VacationRequest;
    } catch (error) {
      console.error('Failed to load vacation request:', error);
      return null;
    }
  }

  /**
   * Get all vacation requests
   */
  static getAllRequests(): VacationRequest[] {
    const list = this.getRequestList();
    const requests: VacationRequest[] = [];

    list.forEach((id) => {
      const request = this.getRequest(id);
      if (request) {
        requests.push(request);
      }
    });

    // Sort by creation date (newest first)
    return requests.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Delete a vacation request
   */
  static deleteRequest(id: string): void {
    try {
      const key = `${STORAGE_KEY_PREFIX}${id}`;
      localStorage.removeItem(key);

      // Update list
      const list = this.getRequestList();
      const newList = list.filter((reqId) => reqId !== id);
      localStorage.setItem(STORAGE_KEY_LIST, JSON.stringify(newList));
    } catch (error) {
      console.error('Failed to delete vacation request:', error);
    }
  }

  /**
   * Get list of all request IDs
   */
  private static getRequestList(): string[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_LIST);
      if (!data) return [];
      return JSON.parse(data) as string[];
    } catch (error) {
      console.error('Failed to load vacation request list:', error);
      return [];
    }
  }

  /**
   * Generate a unique ID for a new request
   */
  static generateId(): string {
    return `vacation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
