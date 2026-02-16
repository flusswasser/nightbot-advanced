import { type UninstallRequest, type Boss } from "@shared/schema";
import * as fs from "fs/promises";
import * as path from "path";
import type { Express } from "express";
import { createServer, type Server } from "http";

// --- Storage Logic ---
export interface IStorage {
  // Uninstall Requests
  incrementUninstallCount(programName: string): Promise<UninstallRequest>;
  getAllUninstallRequests(): Promise<UninstallRequest[]>;
  getUninstallRequest(programName: string): Promise<UninstallRequest | undefined>;
  resetAllRequests(): Promise<void>;
  deleteRequest(programName: string): Promise<boolean>;

  // Death Counter
  getBoss(name: string): Promise<Boss | undefined>;
  getActiveBoss(): Promise<Boss | undefined>;
  upsertBoss(name: string): Promise<Boss>;
  incrementDeaths(bossName?: string): Promise<Boss>;
  setDeaths(bossName: string, count: number): Promise<Boss>;
  markBeaten(bossName?: string): Promise<Boss>;
  getAllBosses(): Promise<Boss[]>;
}

const DATA_FILE = path.join(process.cwd(), "data.json");

interface DataStructure {
  uninstallRequests: Record<string, UninstallRequest>;
  bosses: Record<string, Boss>;
}

async function readData(): Promise<DataStructure> {
  try {
    const content = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(content) as DataStructure;
  } catch {
    return { uninstallRequests: {}, bosses: {} };
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

  // Uninstall Requests
  async incrementUninstallCount(programName: string): Promise<UninstallRequest> {
    await this.ensureLoaded();
    const normalizedName = programName.toLowerCase().trim();
    const existing = this.data!.uninstallRequests[normalizedName];

    if (existing) {
      existing.count++;
      this.data!.uninstallRequests[normalizedName] = existing;
    } else {
      const newRequest: UninstallRequest = {
        id: crypto.randomUUID(),
        programName: programName.trim(),
        count: 1,
      };
      this.data!.uninstallRequests[normalizedName] = newRequest;
    }

    await writeData(this.data!);
    return this.data!.uninstallRequests[normalizedName];
  }

  async getAllUninstallRequests(): Promise<UninstallRequest[]> {
    await this.ensureLoaded();
    return Object.values(this.data!.uninstallRequests).sort((a, b) => b.count - a.count);
  }

  async getUninstallRequest(programName: string): Promise<UninstallRequest | undefined> {
    await this.ensureLoaded();
    return this.data!.uninstallRequests[programName.toLowerCase().trim()];
  }

  async resetAllRequests(): Promise<void> {
    await this.ensureLoaded();
    this.data!.uninstallRequests = {};
    await writeData(this.data!);
  }

  async deleteRequest(programName: string): Promise<boolean> {
    await this.ensureLoaded();
    const normalizedName = programName.toLowerCase().trim();
    if (this.data!.uninstallRequests[normalizedName]) {
      delete this.data!.uninstallRequests[normalizedName];
      await writeData(this.data!);
      return true;
    }
    return false;
  }

  // Death Counter
  async getBoss(name: string): Promise<Boss | undefined> {
    await this.ensureLoaded();
    return this.data!.bosses[name.toLowerCase().trim()];
  }

  async getActiveBoss(): Promise<Boss | undefined> {
    await this.ensureLoaded();
    return Object.values(this.data!.bosses).find(b => !b.isBeaten);
  }

  async upsertBoss(name: string): Promise<Boss> {
    await this.ensureLoaded();
    const normalizedName = name.toLowerCase().trim();
    if (!this.data!.bosses[normalizedName]) {
      this.data!.bosses[normalizedName] = {
        id: crypto.randomUUID(),
        name: name.trim(),
        isBeaten: false,
        deathCount: 0,
        finalDeathCount: null
      };
      await writeData(this.data!);
    }
    return this.data!.bosses[normalizedName];
  }

  async incrementDeaths(bossName?: string): Promise<Boss> {
    await this.ensureLoaded();
    let boss: Boss | undefined;
    if (bossName) {
      boss = await this.upsertBoss(bossName);
    } else {
      boss = await this.getActiveBoss();
    }

    if (!boss) throw new Error("No active boss and no boss name provided");

    boss.deathCount++;
    this.data!.bosses[boss.name.toLowerCase().trim()] = boss;
    await writeData(this.data!);
    return boss;
  }

  async setDeaths(bossName: string, count: number): Promise<Boss> {
    await this.ensureLoaded();
    const boss = await this.upsertBoss(bossName);
    boss.deathCount = count;
    this.data!.bosses[boss.name.toLowerCase().trim()] = boss;
    await writeData(this.data!);
    return boss;
  }

  async markBeaten(bossName?: string): Promise<Boss> {
    await this.ensureLoaded();
    let boss: Boss | undefined;
    if (bossName) {
      boss = this.data!.bosses[bossName.toLowerCase().trim()];
    } else {
      boss = await this.getActiveBoss();
    }

    if (!boss) throw new Error("Boss not found");

    boss.isBeaten = true;
    boss.finalDeathCount = boss.deathCount;
    this.data!.bosses[boss.name.toLowerCase().trim()] = boss;
    await writeData(this.data!);
    return boss;
  }

  async getAllBosses(): Promise<Boss[]> {
    await this.ensureLoaded();
    return Object.values(this.data!.bosses);
  }
}

export const storage = new FileStorage();

// --- Routes Logic ---
export async function registerRoutes(app: Express): Promise<Server> {
  // Uninstall Endpoints
  app.get("/api/uninstall", async (req, res) => {
    const program = req.query.program as string;
    if (!program || typeof program !== 'string' || program.trim() === '') {
      return res.status(400).json({ error: "Program name is required" });
    }
    try {
      const result = await storage.incrementUninstallCount(program);
      const message = `Chat has requested to uninstall ${result.programName} ${result.count} ${result.count === 1 ? 'time' : 'times'}. Go ahead and do it already!`;
      res.type('text/plain').send(message);
    } catch (error) {
      res.status(500).type('text/plain').send("Failed to process request");
    }
  });

  app.get("/api/uninstall/all", async (req, res) => {
    try {
      const requests = await storage.getAllUninstallRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch requests" });
    }
  });

  // Death Counter Endpoints
  app.get("/api/death", async (req, res) => {
    const bossName = req.query.boss as string;
    try {
      const boss = await storage.incrementDeaths(bossName);
      res.type('text/plain').send(`Mango has died to ${boss.name} ${boss.deathCount} ${boss.deathCount === 1 ? 'time' : 'times'}`);
    } catch (error) {
      res.status(400).type('text/plain').send("No active boss found. Use !death <boss name> to start tracking.");
    }
  });

  app.get("/api/deaths", async (req, res) => {
    const bossName = req.query.boss as string;
    try {
      if (bossName) {
        const boss = await storage.getBoss(bossName);
        if (!boss) return res.type('text/plain').send(`No death records found for ${bossName}`);
        
        if (boss.isBeaten) {
          return res.type('text/plain').send(`It took ${boss.finalDeathCount} attempts for Mango to beat ${boss.name}`);
        } else {
          return res.type('text/plain').send(`Mango has died to ${boss.name} ${boss.deathCount} times`);
        }
      } else {
        const boss = await storage.getActiveBoss();
        if (!boss) return res.type('text/plain').send("No active boss is currently being tracked.");
        res.type('text/plain').send(`Mango has died to ${boss.name} ${boss.deathCount} times`);
      }
    } catch (error) {
      res.status(500).type('text/plain').send("Failed to fetch death records");
    }
  });

  app.get("/api/beaten", async (req, res) => {
    const bossName = req.query.boss as string;
    try {
      const boss = await storage.markBeaten(bossName);
      res.type('text/plain').send(`It took ${boss.finalDeathCount} attempts for Mango to beat ${boss.name}`);
    } catch (error) {
      res.status(400).type('text/plain').send("No active boss found to mark as beaten.");
    }
  });

  app.get("/api/total-deaths", async (req, res) => {
    try {
      const bosses = await storage.getAllBosses();
      const total = bosses.reduce((acc, b) => acc + b.deathCount, 0);
      res.type('text/plain').send(`Mango has died a total of ${total} times across all bosses`);
    } catch (error) {
      res.status(500).type('text/plain').send("Failed to calculate total deaths");
    }
  });

  app.get("/api/setdeaths", async (req, res) => {
    const bossName = req.query.boss as string;
    const count = parseInt(req.query.count as string);
    if (!bossName || isNaN(count)) {
      return res.status(400).type('text/plain').send("Usage: !setdeaths <boss name> <count>");
    }
    try {
      const boss = await storage.setDeaths(bossName, count);
      res.type('text/plain').send(`Death counter for ${boss.name} set to ${boss.deathCount}`);
    } catch (error) {
      res.status(500).type('text/plain').send("Failed to update death counter");
    }
  });

  app.get("/api/bosses", async (req, res) => {
    try {
      const bosses = await storage.getAllBosses();
      res.json(bosses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bosses" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
