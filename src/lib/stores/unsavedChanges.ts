import { writable, get } from 'svelte/store';

// Tracks whether there are unsaved changes since the last save/load
export const unsavedChanges = writable(false);

export function markDirty(): void {
  unsavedChanges.set(true);
}

export function markClean(): void {
  unsavedChanges.set(false);
}

export function hasUnsavedChanges(): boolean {
  return get(unsavedChanges) === true;
}


