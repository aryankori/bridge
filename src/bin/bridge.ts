#!/usr/bin/env node
/**
 * Executable entrypoint for the `bridge` command.
 */
import { runCli } from '../effective-directive/cli.js';

process.exitCode = await runCli(process.argv.slice(2), {
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
  cwd: process.cwd(),
});
