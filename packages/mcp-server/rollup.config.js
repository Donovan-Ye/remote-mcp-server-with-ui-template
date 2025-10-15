import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { glob } from 'glob';
import path from 'path';

// 获取所有入口文件
const entryFiles = glob.sync('src/**/*.ts', {
  ignore: ['src/**/*.d.ts', 'src/**/*.test.ts', 'src/**/*.spec.ts']
});

// 创建入口点对象
const input = {};
entryFiles.forEach(file => {
  const name = path.relative('src', file).replace(/\.ts$/, '');
  input[name] = file;
});

// 外部依赖 - 这些不会被打包进最终文件
const external = [
  // Node.js 内置模块
  'fs', 'path', 'url', 'crypto', 'http', 'https', 'stream', 'events', 'util', 'os', 'child_process', 'module',
  // 项目依赖
  /@alicloud\/.*/,
  /@clickhouse\/.*/,
  /@modelcontextprotocol\/.*/,
  /@mcp-ui\/.*/,
  /@prisma\/.*/,
  'axios',
  'cors',
  /^dotenv.*/,
  'express',
  'winston',
  'zod',
  'node:crypto',
  'node:console',
  'node:fs',
  'node:path',
  'node:url'
];

// 基础配置
const baseConfig = {
  input,
  external,
  plugins: [
    resolve({
      preferBuiltins: true,
      exportConditions: ['node']
    }),
    commonjs(),
    json(),
  ],
  onwarn: (warning, warn) => {
    // 忽略一些常见的警告
    if (warning.code === 'CIRCULAR_DEPENDENCY') return;
    if (warning.code === 'UNRESOLVED_IMPORT') return;
    warn(warning);
  }
};

export default [
  // ESM 构建
  {
    ...baseConfig,
    plugins: [
      ...baseConfig.plugins,
      typescript({
        tsconfig: './tsconfig.esm.json',
        declaration: true,
        declarationDir: './dist/esm',
        rootDir: './src'
      })
    ],
    output: {
      dir: 'dist/esm',
      format: 'es',
      entryFileNames: '[name].js',
      chunkFileNames: '[name]-[hash].js',
      preserveModules: true,
      preserveModulesRoot: 'src',
      sourcemap: true
    }
  },

  // CommonJS 构建
  {
    ...baseConfig,
    plugins: [
      ...baseConfig.plugins,
      typescript({
        tsconfig: './tsconfig.cjs.json',
        declaration: true,
        declarationDir: './dist/cjs',
        rootDir: './src'
      })
    ],
    output: {
      dir: 'dist/cjs',
      format: 'cjs',
      entryFileNames: '[name].cjs',
      chunkFileNames: '[name]-[hash].cjs',
      preserveModules: true,
      preserveModulesRoot: 'src',
      sourcemap: true,
      exports: 'auto'
    }
  }
];
