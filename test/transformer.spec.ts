import util from 'node:util';
import { exec } from 'node:child_process';
import pathUtils from 'node:path';
import { readFile, rm } from 'node:fs/promises';
import { expect } from 'chai';

const execPromise = util.promisify(exec);
const currentDir = process.cwd();
const testProjectsDir = pathUtils.resolve(currentDir, 'test-projects');
const testCommonJsDir = pathUtils.resolve(testProjectsDir, 'commonjs');
const testCommonJsTmpDir = [pathUtils.resolve(testCommonJsDir, 'node_modules'), pathUtils.resolve(testCommonJsDir, 'dist')];
const testESMDir = pathUtils.resolve(testProjectsDir, 'esm');
const testESMTmpDir = [pathUtils.resolve(testESMDir, 'node_modules'), pathUtils.resolve(testESMDir, 'dist')];

describe('Transformer', function () {
    before(async function () {
        const chai = await import('chai');
        chai.should();
    });

    describe('CommonJS module', function () {
        beforeEach(async function () {
            await Promise.all(testCommonJsTmpDir.map((dir) => rm(dir, { recursive: true, force: true })));
        });

        it('should rewrite import', async function () {
            await execPromise('npm run build', {
                cwd: testCommonJsDir,
            });
            const testFile = await readFile(pathUtils.resolve(testCommonJsDir, 'dist/src/index.js'), 'utf-8');
            expect(testFile).to.match(/require\("\.\/lib1\/index"\)/);
            expect(testFile).to.match(/import\("url-template"\)/);
            expect(testFile).to.match(/require\("\.\/lib2\/func1"\)/);
            expect(testFile).to.match(/require\("\.\/lib2\/func2"\)/);
            // Should not emmit import type
            expect(testFile).to.not.match(/type /);
            const dtsFile = await readFile(pathUtils.resolve(testCommonJsDir, 'dist/src/index.d.ts'), 'utf-8');
            expect(dtsFile).to.match(/import { type MyInterface2 } from "\.\/lib1\/index"/);
            expect(dtsFile).to.match(/import type { MyInterface } from "\.\/lib1\/types"/);
        });

        it('should resolve module in ts-node', async function () {
            const { stdout: output } = await execPromise('npm run exec', {
                cwd: testCommonJsDir,
            });
            expect(<object>JSON.parse((<string[]>output.match(/(\{.+\})\s*$/m))[1])).to.eql({
                parseTemplate: 'function',
                value1: 'VALUE1',
                value2: 'MY_CLASS',
            });
        });
    });

    describe('ESM module', function () {
        beforeEach(async function () {
            await Promise.all(testESMTmpDir.map((dir) => rm(dir, { recursive: true, force: true })));
        });

        it('should rewrite import', async function () {
            await execPromise('npm run build', {
                cwd: testESMDir,
            });
            const testFile = await readFile(pathUtils.resolve(testESMDir, 'dist/index.js'), 'utf-8');
            expect(testFile).to.match(/from "\.\/lib1\/index\.js"/);
            expect(testFile).to.match(/from "\.\/lib2\/func1\.mjs"/);
            // Should not emmit import type
            expect(testFile).to.not.match(/type/);
            expect(testFile).to.match(/import {} from "\.\/lib1\/t-only\.js"/);
            const dtsFile = await readFile(pathUtils.resolve(testESMDir, 'dist/index.d.ts'), 'utf-8');
            expect(dtsFile).to.match(/import { type MyInterface2 } from "\.\/lib1\/index\.js"/);
            expect(dtsFile).to.match(/import type { MyInterface } from "\.\/lib1\/types\.js"/);
        });

        it('should resolve module in ts-node', async function () {
            const { stdout: output } = await execPromise('npm run exec', {
                cwd: testESMDir,
            });
            expect(<object>JSON.parse((<string[]>output.match(/(\{.+\})\s*$/m))[1])).to.eql({
                value1: 'VALUE1',
                value2: 'MY_CLASS',
            });
        });
    });
});
