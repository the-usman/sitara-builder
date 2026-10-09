import { beforeEach, describe, expect, it } from 'vitest';
import { projectFiles, webcontainer } from './index';

describe('virtual project file system', () => {
  beforeEach(async () => {
    const { fs } = await webcontainer;
    await fs.rm('/', { recursive: true, force: true });
    projectFiles.set({});
  });

  it('treats full, workdir-relative and root-relative paths as the same file', async () => {
    const { fs } = await webcontainer;

    await fs.writeFile('/home/project/src/a.ts', 'one');
    expect(await fs.readFile('src/a.ts', 'utf-8')).toBe('one');
    expect(await fs.readFile('/src/a.ts', 'utf-8')).toBe('one');
  });

  it('creates parent folders in the file tree', async () => {
    const { fs } = await webcontainer;

    await fs.writeFile('src/components/ui/button.tsx', 'x');

    expect(projectFiles.get()['/home/project/src']).toEqual({ type: 'folder' });
    expect(projectFiles.get()['/home/project/src/components/ui']).toEqual({ type: 'folder' });
    expect(await fs.readdir('src')).toEqual(['components']);

    const [entry] = await fs.readdir('src/components', { withFileTypes: true });
    expect(entry.name).toBe('ui');
    expect(entry.isDirectory()).toBe(true);
  });

  it('stores binary data as base64 and returns the original bytes', async () => {
    const { fs } = await webcontainer;
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0xff, 0x00]);

    await fs.writeFile('public/logo.png', png);

    const stored = projectFiles.get()['/home/project/public/logo.png'];
    expect(stored).toMatchObject({ type: 'file', isBinary: true });
    expect(Array.from(await fs.readFile('public/logo.png'))).toEqual(Array.from(png));
  });

  it('keeps tooling folders out of the file tree but readable', async () => {
    const { fs } = await webcontainer;

    await fs.writeFile('.git/HEAD', 'ref: refs/heads/main');

    expect(Object.keys(projectFiles.get()).some((p) => p.includes('.git'))).toBe(false);
    expect(await fs.readFile('.git/HEAD', 'utf-8')).toBe('ref: refs/heads/main');
    expect(await fs.readdir('/')).toContain('.git');
  });

  it('removes folders recursively and reports missing files with ENOENT', async () => {
    const { fs } = await webcontainer;

    await fs.writeFile('src/a.ts', 'a');
    await fs.writeFile('src/b/c.ts', 'c');
    await fs.rm('src', { recursive: true });

    expect(Object.keys(projectFiles.get())).toEqual([]);
    await expect(fs.readFile('src/a.ts', 'utf-8')).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(fs.rm('src/a.ts')).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
