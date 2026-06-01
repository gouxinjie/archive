#!/usr/bin/env node

/**
 * 读取指定 env 文件后执行命令
 */

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * 解析单行环境变量
 * @param line - env 文件单行内容
 * @returns 键值对或 null
 * @throws 不主动抛出异常
 */
const parseEnvLine = (line) => {
  const trimmedLine = line.trim();

  if (!trimmedLine || trimmedLine.startsWith('#')) {
    return null;
  }

  const normalizedLine = trimmedLine.startsWith('export ')
    ? trimmedLine.slice('export '.length).trim()
    : trimmedLine;
  const separatorIndex = normalizedLine.indexOf('=');

  if (separatorIndex <= 0) {
    return null;
  }

  const key = normalizedLine.slice(0, separatorIndex).trim();
  let value = normalizedLine.slice(separatorIndex + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
};

/**
 * 从 env 文件读取环境变量
 * @param envFilePath - env 文件路径
 * @returns 环境变量对象
 * @throws 当 env 文件不存在时抛出错误
 */
const loadEnvFile = (envFilePath) => {
  const absolutePath = resolve(envFilePath);

  if (!existsSync(absolutePath)) {
    throw new Error(`环境变量文件不存在：${absolutePath}`);
  }

  const envEntries = {};
  const lines = readFileSync(absolutePath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const parsedLine = parseEnvLine(line);

    if (parsedLine) {
      envEntries[parsedLine.key] = parsedLine.value;
    }
  }

  return envEntries;
};

const [, , envFilePath, command, ...commandArgs] = process.argv;

if (!envFilePath || !command) {
  console.error('用法：node scripts/with-env.mjs <env-file> <command> [...args]');
  process.exit(1);
}

try {
  const envEntries = loadEnvFile(envFilePath);
  const childProcess = spawn(command, commandArgs, {
    env: {
      ...process.env,
      ...envEntries
    },
    shell: process.platform === 'win32',
    stdio: 'inherit'
  });

  childProcess.on('exit', (code, signal) => {
    if (signal) {
      console.error(`命令被信号中断：${signal}`);
      process.exit(1);
    }

    process.exit(code ?? 0);
  });

  childProcess.on('error', (error) => {
    console.error(error.message);
    process.exit(1);
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : '加载环境变量失败');
  process.exit(1);
}
