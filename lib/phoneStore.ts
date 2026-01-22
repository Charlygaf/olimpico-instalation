/**
 * Simple phone data store
 * Stores connected phone data in memory
 */

export interface PhoneData {
  id: string
  name?: string
  image?: string // Base64 encoded image
  userAgent: string
  platform: string
  language: string
  screenWidth: number
  screenHeight: number
  location?: {
    latitude: number
    longitude: number
    accuracy: number
  }
  gyroscope?: {
    alpha: number
    beta: number
    gamma: number
  }
  timestamp: number // Last update time
  firstSeen: number // First connection time (never changes)
}

class PhoneStore {
  private phones: Map<string, PhoneData> = new Map()

  addPhone(id: string, data: Omit<PhoneData, 'id' | 'timestamp' | 'firstSeen'>): void {
    const existing = this.phones.get(id)
    if (existing) {
      // Update existing phone - preserve firstSeen timestamp
      this.phones.set(id, {
        ...existing,
        ...data,
        id,
        timestamp: Date.now(),
        // Keep original firstSeen
      })
    } else {
      // Add new phone - set firstSeen to now
      const now = Date.now()
      this.phones.set(id, {
        ...data,
        id,
        timestamp: now,
        firstSeen: now,
      })
    }
  }

  updatePhone(id: string, updates: Partial<PhoneData>): void {
    const existing = this.phones.get(id)
    if (existing) {
      this.phones.set(id, { ...existing, ...updates, timestamp: Date.now() })
    }
  }

  getPhone(id: string): PhoneData | undefined {
    return this.phones.get(id)
  }

  getAllPhones(): PhoneData[] {
    return Array.from(this.phones.values())
  }

  removePhone(id: string): void {
    this.phones.delete(id)
  }

  clear(): void {
    this.phones.clear()
  }
}

export const phoneStore = new PhoneStore()
