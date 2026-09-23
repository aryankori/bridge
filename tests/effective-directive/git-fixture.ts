import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Temporary Git repository for integration tests. The helper isolates Git from
 * the user and system configuration, so settings such as commit.gpgsign or a
 * global hooks path do not change the result.
 */

export interface Author {
  name: string;
  email: string;
}

export interface TempRepo {
  root: string;
  dir: string;
  git: (args: string[], cwd?: string, input?: string) => string;
  write: (relativePath: string, content: string, cwd?: string) => void;
  commit: (message: string, author: Author, cwd?: string) => string;
  cleanup: () => void;
}

export const FIXTURE_AUTHOR: Author = { name: 'Fixture', email: 'fixture@example.com' };

export function createTempRepo(prefix = 'bridge-resolve-'): TempRepo {
  const root = mkdtempSync(path.join(os.tmpdir(), prefix));
  const dir = path.join(root, 'repo');
  mkdirSync(dir);

  const emptyConfig = path.join(root, 'empty.gitconfig');
  writeFileSync(emptyConfig, '');
  const env = { ...process.env, GIT_CONFIG_GLOBAL: emptyConfig, GIT_CONFIG_NOSYSTEM: '1' };

  const git = (args: string[], cwd: string = dir, input?: string) =>
    execFileSync('git', args, {
      cwd,
      env,
      encoding: 'utf-8',
      input,
      stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
    });

  git(['init', '-q', '-b', 'main']);
  git(['config', 'user.name', FIXTURE_AUTHOR.name]);
  git(['config', 'user.email', FIXTURE_AUTHOR.email]);
  git(['config', 'commit.gpgsign', 'false']);
  git(['config', 'core.autocrlf', 'false']);

  const write = (relativePath: string, content: string, cwd: string = dir) => {
    const target = path.join(cwd, relativePath);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, content);
  };

  const commit = (message: string, author: Author, cwd: string = dir) => {
    git(['add', '-A'], cwd);
    git(
      [
        '-c',
        `user.name=${author.name}`,
        '-c',
        `user.email=${author.email}`,
        'commit',
        '-q',
        '-m',
        message,
      ],
      cwd,
    );
    return git(['rev-parse', 'HEAD'], cwd).trim();
  };

  const cleanup = () =>
    rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });

  return { root, dir, git, write, commit, cleanup };
}
