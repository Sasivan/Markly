/**
 * Markly Unified Preset System — Core Preset Service
 * Coordinates snapshot validation, application to target surfaces,
 * lifecycle management, and UI state synchronization.
 */

import { PresetRepository } from "./repository";
import { HomePresetAdapter } from "./adapters/home-adapter";
import { FolderTabsPresetAdapter } from "./adapters/folder-tabs-adapter";
import { VisualBoxPresetAdapter } from "./adapters/visual-box-adapter";
import { VisualsPagePresetAdapter } from "./adapters/visuals-page-adapter";
import { SearchPresetAdapter } from "./adapters/search-adapter";
import type {
  PresetRecord,
  PresetKind,
  PresetDestination,
  ApplyResult,
  FolderApplyMode,
  TabDestinationTarget,
} from "./types";

export class PresetService {
  private static repository = PresetRepository.getInstance();

  /**
   * Applies any preset record to an explicit destination.
   */
  public static async applyPreset(
    preset: PresetRecord,
    destination: PresetDestination
  ): Promise<ApplyResult> {
    if (!preset || !preset.snapshot) {
      return { success: false, error: "Cannot apply preset: snapshot is missing or invalid." };
    }

    if (preset.kind === "search-query") {
      return SearchPresetAdapter.apply(preset.snapshot as any);
    }

    if (destination.kind === "home") {
      if (preset.kind === "home-layout") {
        return HomePresetAdapter.apply(preset.snapshot as any);
      } else if (preset.kind === "visual-box") {
        return VisualBoxPresetAdapter.insertIntoHome(preset.snapshot as any);
      }
      return { success: false, error: `Preset kind '${preset.kind}' cannot be applied to Dashboard Home.` };
    }

    if (destination.kind === "visuals-page") {
      if (preset.kind === "visuals-page-layout") {
        return VisualsPagePresetAdapter.apply(preset.snapshot as any);
      }
      return { success: false, error: `Preset kind '${preset.kind}' cannot be applied to Visuals Page.` };
    }

    if (destination.kind === "folder-universal") {
      if (preset.kind === "folder-tabs-layout" || preset.kind === "folder-tab-layout") {
        return FolderTabsPresetAdapter.apply(
          preset.snapshot as any,
          "universal",
          null,
          destination.applyMode,
          destination.tabTarget
        );
      } else if (preset.kind === "visual-box") {
        return VisualBoxPresetAdapter.insertIntoFolder(
          preset.snapshot as any,
          "universal",
          null,
          destination.tabTarget
        );
      }
      return { success: false, error: `Preset kind '${preset.kind}' cannot be applied to Universal Folder tabs.` };
    }

    if (destination.kind === "folder-custom") {
      if (!destination.folderId) {
        return { success: false, error: "Custom folder destination requires a target folder ID." };
      }
      if (preset.kind === "folder-tabs-layout" || preset.kind === "folder-tab-layout") {
        return FolderTabsPresetAdapter.apply(
          preset.snapshot as any,
          "custom",
          destination.folderId,
          destination.applyMode,
          destination.tabTarget
        );
      } else if (preset.kind === "visual-box") {
        return VisualBoxPresetAdapter.insertIntoFolder(
          preset.snapshot as any,
          "custom",
          destination.folderId,
          destination.tabTarget
        );
      }
      return { success: false, error: `Preset kind '${preset.kind}' cannot be applied to Custom Folder.` };
    }

    return { success: false, error: "Unsupported destination kind." };
  }

  /**
   * Repositories Pass-Through
   */
  public static async getAllPresets(): Promise<PresetRecord[]> {
    return this.repository.getAll();
  }

  public static async getPresetsByKind(kind: PresetKind): Promise<PresetRecord[]> {
    return this.repository.getByKind(kind);
  }

  public static async savePreset(record: PresetRecord): Promise<void> {
    return this.repository.save(record);
  }

  public static async deletePreset(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }

  public static async duplicatePreset(id: string, newName?: string): Promise<PresetRecord> {
    return this.repository.duplicate(id, newName);
  }

  public static async renamePreset(id: string, newName: string, newDescription?: string): Promise<PresetRecord> {
    return this.repository.rename(id, newName, newDescription);
  }

  public static async setScopedDefault(id: string, scopeTarget: string): Promise<void> {
    return this.repository.setDefault(id, scopeTarget);
  }

  public static async getScopedDefault(scopeTarget: string): Promise<string | null> {
    return this.repository.getDefault(scopeTarget);
  }

  public static async restoreBuiltIns(): Promise<void> {
    return this.repository.restoreBuiltIns();
  }
}
