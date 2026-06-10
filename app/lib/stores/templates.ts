import { atom } from 'nanostores';
import { getLocalStorage, setLocalStorage } from '~/lib/persistence/localStorage';

export interface UserTemplate {
  id: string;
  name: string;
  description: string;
  basePrompt: string; // contains {THEME} {INDUSTRY} {BRAND_NAME} {PRIMARY_COLOR}
  createdAt: number;
}

const STORAGE_KEY = 'bolt-user-templates';

function load(): UserTemplate[] {
  return getLocalStorage(STORAGE_KEY) ?? [];
}

export const userTemplatesStore = atom<UserTemplate[]>(load());

export function saveUserTemplate(data: Pick<UserTemplate, 'name' | 'description' | 'basePrompt'>): UserTemplate {
  const template: UserTemplate = { ...data, id: `tpl-${Date.now()}`, createdAt: Date.now() };
  const next = [...userTemplatesStore.get(), template];
  setLocalStorage(STORAGE_KEY, next);
  userTemplatesStore.set(next);
  return template;
}

export function deleteUserTemplate(id: string) {
  const next = userTemplatesStore.get().filter((t) => t.id !== id);
  setLocalStorage(STORAGE_KEY, next);
  userTemplatesStore.set(next);
}
