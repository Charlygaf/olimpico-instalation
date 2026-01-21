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
  timestamp: number
}

class PhoneStore {
  private phones: Map<string, PhoneData> = new Map()

  addPhone(id: string, data: Omit<PhoneData, 'id' | 'timestamp'>): void {
    const existing = this.phones.get(id)
    if (existing) {
      // Update existing phone
      this.phones.set(id, {
        ...existing,
        ...data,
        id,
        timestamp: Date.now(),
      })
    } else {
      // Add new phone
      this.phones.set(id, {
        ...data,
        id,
        timestamp: Date.now(),
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
