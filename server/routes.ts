import { type UninstallRequest, type Boss, type Player } from "@shared/schema";
import * as fs from "fs/promises";
import * as path from "path";
import type { Express } from "express";
import { createServer, type Server } from "http";

// --- Storage Logic ---
export interface IStorage {
  // Uninstall Requests (Isolated by Channel)
  incrementUninstallCount(channelId: string, programName: string): Promise<UninstallRequest>;
  getAllUninstallRequests(channelId: string): Promise<UninstallRequest[]>;
  resetAllRequests(channelId: string): Promise<void>;
  deleteRequest(channelId: string, programName: string): Promise<boolean>;

  // Channels/Players
  getChannels(): Promise<Player[]>;
  getChannel(id: string): Promise<Player | undefined>;
  updateChannelName(id: string, name: string): Promise<Player>;
  resetChannelDeaths(id: string): Promise<void>;

  // Death Counter (Isolated by Channel)
  getBoss(channelId: string, name: string): Promise<Boss | undefined>;
  getActiveBoss(channelId: string): Promise<Boss | undefined>;
  upsertBoss(channelId: string, name: string): Promise<Boss>;
  incrementDeaths(channelId: string, bossName?: string): Promise<Boss>;
  setDeaths(channelId: string, bossName: string, count: number): Promise<Boss>;
  markBeaten(channelId: string, bossName?: string): Promise<Boss>;
  getAllBosses(channelId: string): Promise<Boss[]>;
}

const DATA_FILE = path.join(process.cwd(), "data.json");

interface DataStructure {
  // Maps channelId -> Data
  channels: Record<string, Player>;
  uninstallRequests: Record<string, Record<string, UninstallRequest>>;
  bosses: Record<string, Record<string, Boss>>;
}

async function readData(): Promise<DataStructure> {
  try {
    const content = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(content) as DataStructure;
    if (!parsed.channels) parsed.channels = {};
    if (!parsed.uninstallRequests) parsed.uninstallRequests = {};
    if (!parsed.bosses) parsed.bosses = {};
    return parsed;
  } catch {
    return { 
      channels: {}, 
      uninstallRequests: {}, 
      bosses: {} 
    };
  }
}

async function writeData(data: DataStructure): Promise<void> {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

export class FileStorage implements IStorage {
  private data: DataStructure | null = null;

  private async ensureLoaded(): Promise<void> {
    if (this.data === null) {
      this.data = await readData();
    }
  }

  private async ensureChannel(channelId: string): Promise<void> {
    await this.ensureLoaded();
    if (!this.data!.channels[channelId]) {
      this.data!.channels[channelId] = { id: channelId, name: channelId, isDefault: Object.keys(this.data!.channels).length === 0 };
    }
    if (!this.data!.uninstallRequests[channelId]) this.data!.uninstallRequests[channelId] = {};
    if (!this.data!.bosses[channelId]) this.data!.bosses[channelId] = {};
  }

  // Uninstall Requests
  async incrementUninstallCount(channelId: string, programName: string): Promise<UninstallRequest> {
    await this.ensureChannel(channelId);
    const normalizedName = programName.toLowerCase().trim();
    const existing = this.data!.uninstallRequests[channelId][normalizedName];

    if (existing) {
      existing.count++;
      this.data!.uninstallRequests[channelId][normalizedName] = existing;
    } else {
      const newRequest: UninstallRequest = {
        id: crypto.randomUUID(),
        programName: programName.trim(),
        count: 1,
      };
      this.data!.uninstallRequests[channelId][normalizedName] = newRequest;
    }

    await writeData(this.data!);
    return this.data!.uninstallRequests[channelId][normalizedName];
  }

  async getAllUninstallRequests(channelId: string): Promise<UninstallRequest[]> {
    await this.ensureChannel(channelId);
    return Object.values(this.data!.uninstallRequests[channelId]).sort((a, b) => b.count - a.count);
  }

  async resetAllRequests(channelId: string): Promise<void> {
    await this.ensureChannel(channelId);
    this.data!.uninstallRequests[channelId] = {};
    await writeData(this.data!);
  }

  async deleteRequest(channelId: string, programName: string): Promise<boolean> {
    await this.ensureChannel(channelId);
    const normalizedName = programName.toLowerCase().trim();
    if (this.data!.uninstallRequests[channelId][normalizedName]) {
      delete this.data!.uninstallRequests[channelId][normalizedName];
      await writeData(this.data!);
      return true;
    }
    return false;
  }

  // Channels
  async getChannels(): Promise<Player[]> {
    await this.ensureLoaded();
    return Object.values(this.data!.channels);
  }

  async getChannel(id: string): Promise<Player | undefined> {
    await this.ensureLoaded();
    return this.data!.channels[id];
  }

  async updateChannelName(id: string, name: string): Promise<Player> {
    await this.ensureChannel(id);
    this.data!.channels[id].name = name;
    await writeData(this.data!);
    return this.data!.channels[id];
  }

  async resetChannelDeaths(id: string): Promise<void> {
    await this.ensureChannel(id);
    this.data!.bosses[id] = {};
    await writeData(this.data!);
  }

  // Death Counter
  async getBoss(channelId: string, name: string): Promise<Boss | undefined> {
    await this.ensureChannel(channelId);
    return Object.values(this.data!.bosses[channelId]).find(b => b.name.toLowerCase().trim() === name.toLowerCase().trim());
  }

  async getActiveBoss(channelId: string): Promise<Boss | undefined> {
    await this.ensureChannel(channelId);
    return Object.values(this.data!.bosses[channelId]).find(b => !b.isBeaten);
  }

  async upsertBoss(channelId: string, name: string): Promise<Boss> {
    await this.ensureChannel(channelId);
    const normalizedName = name.toLowerCase().trim();
    if (!this.data!.bosses[channelId][normalizedName]) {
      this.data!.bosses[channelId][normalizedName] = {
        id: crypto.randomUUID(),
        name: name.trim(),
        isBeaten: false,
        deathCount: 0,
        finalDeathCount: null,
        playerId: channelId
      };
      await writeData(this.data!);
    }
    return this.data!.bosses[channelId][normalizedName];
  }

  async incrementDeaths(channelId: string, bossName?: string): Promise<Boss> {
    await this.ensureChannel(channelId);
    let boss: Boss | undefined;
    if (bossName) {
      boss = await this.upsertBoss(channelId, bossName);
    } else {
      boss = await this.getActiveBoss(channelId);
    }

    if (!boss) throw new Error("No active boss");

    boss.deathCount++;
    this.data!.bosses[channelId][boss.name.toLowerCase().trim()] = boss;
    await writeData(this.data!);
    return boss;
  }

  async setDeaths(channelId: string, bossName: string, count: number): Promise<Boss> {
    await this.ensureChannel(channelId);
    const boss = await this.upsertBoss(channelId, bossName);
    boss.deathCount = count;
    this.data!.bosses[channelId][boss.name.toLowerCase().trim()] = boss;
    await writeData(this.data!);
    return boss;
  }

  async markBeaten(channelId: string, bossName?: string): Promise<Boss> {
    await this.ensureChannel(channelId);
    let boss: Boss | undefined;
    if (bossName) {
      boss = this.data!.bosses[channelId][bossName.toLowerCase().trim()];
    } else {
      boss = await this.getActiveBoss(channelId);
    }

    if (!boss) throw new Error("Boss not found");

    boss.isBeaten = true;
    boss.finalDeathCount = boss.deathCount;
    this.data!.bosses[channelId][boss.name.toLowerCase().trim()] = boss;
    await writeData(this.data!);
    return boss;
  }

  async getAllBosses(channelId: string): Promise<Boss[]> {
    await this.ensureChannel(channelId);
    return Object.values(this.data!.bosses[channelId]);
  }
}

export const storage = new FileStorage();

// --- Routes Logic ---
export async function registerRoutes(app: Express): Promise<Server> {
  // Channel Endpoints
  app.get("/api/channels", async (req, res) => {
    try {
      const channels = await storage.getChannels();
      res.json(channels);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch channels" });
    }
  });

  app.post("/api/channels/:id", async (req, res) => {
    try {
      const channel = await storage.updateChannelName(req.params.id, req.body.name);
      res.json(channel);
    } catch (error) {
      res.status(500).json({ error: "Failed to update channel" });
    }
  });

  app.delete("/api/channels/:id/reset", async (req, res) => {
    try {
      await storage.resetChannelDeaths(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to reset channel deaths" });
    }
  });

  // Uninstall Endpoints
  app.get("/api/uninstall", async (req, res) => {
    const program = req.query.program as string;
    const channelId = (req.query.channel as string) || "default";
    if (!program || typeof program !== 'string' || program.trim() === '') {
      return res.status(400).json({ error: "Program name is required" });
    }
    try {
      const result = await storage.incrementUninstallCount(channelId, program);
      const message = `Chat has requested to uninstall ${result.programName} ${result.count} ${result.count === 1 ? 'time' : 'times'}. Go ahead and do it already!`;
      res.type('text/plain').send(message);
    } catch (error) {
      res.status(500).type('text/plain').send("Failed to process request");
    }
  });

  app.get("/api/uninstall/all", async (req, res) => {
    const channelId = (req.query.channel as string) || "default";
    try {
      const requests = await storage.getAllUninstallRequests(channelId);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch requests" });
    }
  });

  // Death Counter Endpoints
  app.get("/api/death", async (req, res) => {
    const bossName = req.query.boss as string;
    const channelId = (req.query.channel as string) || "default";
    try {
      const channel = await storage.getChannel(channelId);
      const boss = await storage.incrementDeaths(channelId, bossName);
      res.type('text/plain').send(`${channel?.name || channelId} has died to ${boss.name} ${boss.deathCount} ${boss.deathCount === 1 ? 'time' : 'times'}`);
    } catch (error) {
      res.status(400).type('text/plain').send("No active boss found. Use !death <boss name> to start tracking.");
    }
  });

  app.get("/api/deaths", async (req, res) => {
    const bossName = req.query.boss as string;
    const channelId = (req.query.channel as string) || "default";
    try {
      const channel = await storage.getChannel(channelId);
      if (bossName) {
        const boss = await storage.getBoss(channelId, bossName);
        if (!boss) return res.type('text/plain').send(`No death records found for ${bossName}`);
        
        if (boss.isBeaten) {
          return res.type('text/plain').send(`It took ${boss.finalDeathCount} attempts for ${channel?.name || channelId} to beat ${boss.name}`);
        } else {
          return res.type('text/plain').send(`${channel?.name || channelId} has died to ${boss.name} ${boss.deathCount} times`);
        }
      } else {
        const boss = await storage.getActiveBoss(channelId);
        if (!boss) return res.type('text/plain').send("No active boss is currently being tracked.");
        res.type('text/plain').send(`${channel?.name || channelId} has died to ${boss.name} ${boss.deathCount} times`);
      }
    } catch (error) {
      res.status(500).type('text/plain').send("Failed to fetch death records");
    }
  });

  app.get("/api/beaten", async (req, res) => {
    const bossName = req.query.boss as string;
    const channelId = (req.query.channel as string) || "default";
    try {
      const channel = await storage.getChannel(channelId);
      const boss = await storage.markBeaten(channelId, bossName);
      res.type('text/plain').send(`It took ${boss.finalDeathCount} attempts for ${channel?.name || channelId} to beat ${boss.name}`);
    } catch (error) {
      res.status(400).type('text/plain').send("No active boss found to mark as beaten.");
    }
  });

  app.get("/api/total-deaths", async (req, res) => {
    const channelId = (req.query.channel as string) || "default";
    try {
      const channel = await storage.getChannel(channelId);
      const bosses = await storage.getAllBosses(channelId);
      const total = bosses.reduce((acc, b) => acc + b.deathCount, 0);
      res.type('text/plain').send(`${channel?.name || channelId} has died a total of ${total} times across all bosses`);
    } catch (error) {
      res.status(500).type('text/plain').send("Failed to calculate total deaths");
    }
  });

  app.get("/api/setdeaths", async (req, res) => {
    const bossName = req.query.boss as string;
    const channelId = (req.query.channel as string) || "default";
    const count = parseInt(req.query.count as string);
    if (!bossName || isNaN(count)) {
      return res.status(400).type('text/plain').send("Usage: !setdeaths <boss name> <count>");
    }
    try {
      const boss = await storage.setDeaths(channelId, bossName, count);
      res.type('text/plain').send(`Death counter for ${boss.name} set to ${boss.deathCount}`);
    } catch (error) {
      res.status(500).type('text/plain').send("Failed to update death counter");
    }
  });

  app.get("/api/bosses", async (req, res) => {
    const channelId = (req.query.channel as string) || "default";
    try {
      const bosses = await storage.getAllBosses(channelId);
      res.json(bosses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bosses" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
