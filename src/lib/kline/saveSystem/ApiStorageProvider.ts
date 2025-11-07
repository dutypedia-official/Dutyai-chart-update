/**
 * API Storage Provider
 *
 * Provides hybrid persistence for chart save system:
 * - Uses API when userId exists in localStorage
 * - Falls back to localStorage when userId doesn't exist
 */

import type { StorageProvider, SavedLayout, SavedLayoutMeta } from "./types";
import { LocalStorageProvider } from "./storage";

// API endpoint
const API_ENDPOINT = "https://noti.dutyai.app/auth/chart/settings";

/**
 * Hybrid storage provider that uses API when userId is available,
 * otherwise falls back to localStorage
 */
export class ApiStorageProvider implements StorageProvider {
  private localStorageProvider: LocalStorageProvider;
  private initialized = false;

  constructor() {
    this.localStorageProvider = new LocalStorageProvider();
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.localStorageProvider["initialize"]();
    this.initialized = true;
  }

  /**
   * Check if userId exists in localStorage
   */
  private hasUserId(): boolean {
    return typeof window !== "undefined" && !!localStorage.getItem("userId");
  }

  /**
   * Get userId from localStorage
   */
  private getUserId(): string | null {
    return typeof window !== "undefined"
      ? localStorage.getItem("userId")
      : null;
  }

  /**
   * Save to API endpoint
   */
  private async saveToApi(layoutData: any): Promise<SavedLayout> {
    const userId = this.getUserId();
    if (!userId) {
      throw new Error("User ID not found in localStorage");
    }

    // Don't save data that was just loaded from API (prevents infinite loops)
    if (layoutData._source === "api") {
      console.log("🔄 Skipping API save for API-loaded data");
      return {
        ...layoutData,
        _source: "api", // Preserve the source flag
      };
    }

    try {
      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clerkId: userId,
          settings: layoutData,
          id: layoutData.id || this.generateApiId(),
        }),
      });

      if (!response.ok) {
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();

      // Return the saved layout data
      return {
        ...layoutData,
        id: result.id || layoutData.id || this.generateApiId(),
        createdAt: result.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("API save failed:", error);
      throw new Error("Failed to save to API");
    }
  }

  /**
   * Generate a unique ID for API saves
   */
  private generateApiId(): string {
    return `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load from API endpoint (GET request with userId in URL)
   */
  private async loadFromApi(): Promise<SavedLayout[]> {
    const userId = this.getUserId();
    if (!userId) {
      throw new Error("User ID not found in localStorage");
    }

    try {
      const apiUrl = `${API_ENDPOINT}/${userId}`;
      console.log("🌐 API Request:", apiUrl);

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log(
        "🌐 API Response Status:",
        response.status,
        response.statusText
      );

      if (!response.ok) {
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();
      console.log("🌐 API Response Data:", result);

      // Convert API response to SavedLayout format
      // The API returns array of objects with id, clerkId, and settings
      if (Array.isArray(result)) {
        return result.map((item) => ({
          id: item.id,
          name: item.settings?.name || "Untitled Layout",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...item.settings, // Spread the actual settings data
          _source: "api", // Mark as from API to prevent infinite loops
        }));
      }

      // Handle single object response
      return [
        {
          id: result.id,
          name: result.settings?.name || "Untitled Layout",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...result.settings,
          _source: "api", // Mark as from API to prevent infinite loops
        },
      ];
    } catch (error) {
      console.error("API load failed:", error);
      throw new Error("Failed to load from API");
    }
  }

  /**
   * Delete from API endpoint (DELETE request with layout ID)
   */
  private async deleteFromApi(id: string): Promise<void> {
    const userId = this.getUserId();
    if (!userId) {
      throw new Error("User ID not found in localStorage");
    }

    try {
      const apiUrl = `${API_ENDPOINT}/${id}`;
      console.log("🌐 API Delete Request:", apiUrl);

      const response = await fetch(apiUrl, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log(
        "🌐 API Delete Response Status:",
        response.status,
        response.statusText
      );

      if (!response.ok) {
        throw new Error(
          `API delete request failed: ${response.status} ${response.statusText}`
        );
      }

      console.log("✅ Layout deleted successfully from API");
    } catch (error) {
      console.error("API delete failed:", error);
      throw new Error("Failed to delete from API");
    }
  }

  /**
   * Get all saved layout metadata
   */
  async listSavedLayouts(): Promise<SavedLayoutMeta[]> {
    await this.initialize();

    if (this.hasUserId()) {
      try {
        console.log("🌐 Loading layouts from API (userId found)");
        const apiLayouts = await this.loadFromApi();

        // Convert to SavedLayoutMeta format
        return apiLayouts.map((layout) => ({
          id: layout.id,
          name: layout.name || "Untitled Layout",
          createdAt: layout.createdAt || new Date().toISOString(),
          updatedAt: layout.updatedAt || new Date().toISOString(),
        }));
      } catch (error) {
        console.error("API load failed, falling back to localStorage:", error);
        // Fall back to localStorage if API fails
      }
    }

    console.log(
      "💾 Loading layouts from localStorage (no userId or API failed)"
    );
    return this.localStorageProvider.listSavedLayouts();
  }

  /**
   * Get a specific saved layout
   */
  async getSavedLayout(id: string): Promise<SavedLayout | null> {
    await this.initialize();

    if (this.hasUserId()) {
      try {
        console.log("🌐 Loading specific layout from API");
        const apiLayouts = await this.loadFromApi();

        // Find the specific layout by ID
        const foundLayout = apiLayouts.find((layout) => layout.id === id);
        if (foundLayout) {
          return foundLayout;
        }

        console.log(
          "📖 Layout not found in API response, falling back to localStorage"
        );
      } catch (error) {
        console.error("API load failed, falling back to localStorage:", error);
        // Fall back to localStorage if API fails
      }
    }

    return this.localStorageProvider.getSavedLayout(id);
  }

  /**
   * Create a new saved layout
   */
  async createSavedLayout(
    layoutData: Omit<SavedLayout, "id" | "createdAt" | "updatedAt">
  ): Promise<SavedLayout> {
    await this.initialize();

    if (this.hasUserId()) {
      try {
        console.log("🌐 Saving to API (userId found)");
        return await this.saveToApi(layoutData);
      } catch (error) {
        console.error("API save failed, falling back to localStorage:", error);
        // Fall back to localStorage if API fails
      }
    }

    console.log("💾 Saving to localStorage (no userId or API failed)");
    return this.localStorageProvider.createSavedLayout(layoutData);
  }

  /**
   * Update an existing saved layout
   */
  async updateSavedLayout(
    id: string,
    updates: Partial<SavedLayout>
  ): Promise<SavedLayout> {
    await this.initialize();

    if (this.hasUserId() && id.startsWith("api_")) {
      try {
        console.log("🌐 Updating via API (userId found)");
        // For API updates, we need to get the existing layout first
        const existingLayout =
          await this.localStorageProvider.getSavedLayout(id);
        if (existingLayout) {
          const updatedLayout = { ...existingLayout, ...updates };
          return await this.saveToApi(updatedLayout);
        }
      } catch (error) {
        console.error(
          "API update failed, falling back to localStorage:",
          error
        );
      }
    }

    console.log("💾 Updating in localStorage");
    return this.localStorageProvider.updateSavedLayout(id, updates);
  }

  /**
   * Delete a saved layout
   */
  async deleteSavedLayout(id: string): Promise<void> {
    await this.initialize();

    if (this.hasUserId()) {
      try {
        console.log("🌐 Deleting layout from API");
        await this.deleteFromApi(id);
        console.log("✅ Layout deleted from API successfully");
        return;
      } catch (error) {
        console.error(
          "API delete failed, falling back to localStorage:",
          error
        );
        // Fall back to localStorage if API fails
      }
    }

    console.log("💾 Deleting from localStorage");
    return this.localStorageProvider.deleteSavedLayout(id);
  }

  /**
   * Get the currently active save ID
   */
  async getActiveSaveId(): Promise<string | null> {
    await this.initialize();
    return this.localStorageProvider.getActiveSaveId();
  }

  /**
   * Set the currently active save ID
   */
  async setActiveSaveId(id: string | null): Promise<void> {
    await this.initialize();
    return this.localStorageProvider.setActiveSaveId(id);
  }

  /**
   * Cleanup storage
   */
  async cleanup(): Promise<void> {
    await this.initialize();
    return this.localStorageProvider.cleanup();
  }
}
