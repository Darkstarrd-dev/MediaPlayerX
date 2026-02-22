import { promises as fs } from "node:fs";
import path from "node:path";

import { writeStoredZipFromEntries } from "../../fileSystemZipStoreWriter";
import {
  isSafeArchiveEntryName,
  readZipEntryContent,
  scanZipCentralEntries,
} from "../../zipArchiveHelpers";
import { ZIP_IMAGE_ENTRY_EXTENSIONS } from "./managementMutationService.helpers";

interface ManagementArchiveOpsDependencies {
  withArchiveWriteLock: <T>(
    archivePath: string,
    task: () => Promise<T>,
  ) => Promise<T>;
}

export class ManagementArchiveOps {
  constructor(
    private readonly dependencies: ManagementArchiveOpsDependencies,
  ) {}

  async repackArchiveWithoutEntries(
    archivePath: string,
    deletedEntryNames: Iterable<string>,
  ): Promise<void> {
    const deletedSet = new Set(deletedEntryNames);
    await this.dependencies.withArchiveWriteLock(archivePath, async () => {
      const allEntries = await scanZipCentralEntries(archivePath);
      const keepEntries = allEntries.filter(
        (entry) => !deletedSet.has(entry.entryName),
      );

      const zipEntries: Array<{ entryName: string; content: Buffer }> = [];
      for (const entry of keepEntries) {
        const content = await readZipEntryContent(archivePath, entry);
        zipEntries.push({
          entryName: entry.entryName,
          content,
        });
      }

      const tempPath = `${archivePath}.${Date.now()}.${Math.round(Math.random() * 100_000)}.mpx-tmp.zip`;
      const backupPath = `${archivePath}.${Date.now()}.${Math.round(Math.random() * 100_000)}.mpx-bak`;

      await writeStoredZipFromEntries(tempPath, zipEntries);
      await scanZipCentralEntries(tempPath);

      await fs.rename(archivePath, backupPath);
      let replaced = false;
      try {
        await fs.rename(tempPath, archivePath);
        replaced = true;
        await fs.rm(backupPath, { force: true });
      } finally {
        if (!replaced) {
          await fs.rename(backupPath, archivePath).catch(() => undefined);
        }
        await fs.rm(tempPath, { force: true }).catch(() => undefined);
      }
    });
  }

  async repackArchiveWithRenamedEntries(
    archivePath: string,
    entryNameMappings: Array<{ fromEntryName: string; toEntryName: string }>,
  ): Promise<void> {
    await this.dependencies.withArchiveWriteLock(archivePath, async () => {
      const mappingByFromEntry = new Map<string, string>();
      for (const mapping of entryNameMappings) {
        const fromEntryName = mapping.fromEntryName.trim();
        const toEntryName = mapping.toEntryName.trim();
        if (!fromEntryName || !toEntryName || fromEntryName === toEntryName) {
          continue;
        }
        if (
          !isSafeArchiveEntryName(fromEntryName) ||
          !isSafeArchiveEntryName(toEntryName)
        ) {
          throw new Error("archive entry illegal");
        }
        const ext = path.extname(fromEntryName).toLowerCase();
        if (!ZIP_IMAGE_ENTRY_EXTENSIONS.has(ext)) {
          throw new Error("archive entry is not image");
        }
        mappingByFromEntry.set(fromEntryName, toEntryName);
      }

      if (mappingByFromEntry.size === 0) {
        return;
      }

      const allEntries = await scanZipCentralEntries(archivePath);
      const presentEntryNames = new Set(
        allEntries.map((entry) => entry.entryName),
      );
      for (const fromEntryName of mappingByFromEntry.keys()) {
        if (!presentEntryNames.has(fromEntryName)) {
          throw new Error(`archive entry not found: ${fromEntryName}`);
        }
      }

      const plannedEntryNameSet = new Set<string>();
      for (const entry of allEntries) {
        const nextEntryName =
          mappingByFromEntry.get(entry.entryName) ?? entry.entryName;
        if (plannedEntryNameSet.has(nextEntryName)) {
          throw new Error("archive entry destination already exists");
        }
        plannedEntryNameSet.add(nextEntryName);
      }

      const zipEntries: Array<{ entryName: string; content: Buffer }> = [];
      for (const entry of allEntries) {
        const content = await readZipEntryContent(archivePath, entry);
        zipEntries.push({
          entryName: mappingByFromEntry.get(entry.entryName) ?? entry.entryName,
          content,
        });
      }

      const tempPath = `${archivePath}.${Date.now()}.${Math.round(Math.random() * 100_000)}.mpx-tmp.zip`;
      const backupPath = `${archivePath}.${Date.now()}.${Math.round(Math.random() * 100_000)}.mpx-bak`;

      await writeStoredZipFromEntries(tempPath, zipEntries);
      await scanZipCentralEntries(tempPath);

      await fs.rename(archivePath, backupPath);
      let replaced = false;
      try {
        await fs.rename(tempPath, archivePath);
        replaced = true;
        await fs.rm(backupPath, { force: true });
      } finally {
        if (!replaced) {
          await fs.rename(backupPath, archivePath).catch(() => undefined);
        }
        await fs.rm(tempPath, { force: true }).catch(() => undefined);
      }
    });
  }
}
