#!/usr/bin/env node

import { Command } from "commander";
import fs from "node:fs";
import path from "node:path";

import { parseLibraryName, parseNotebookHtml } from "../src/parse.js";
import { processCell, type TranspiledCell } from "../src/transpile.js";
import {
    generateDefineJs,
    generateIndexJs,
    generatePackageJson,
    generateReadme,
    generateRuntimeJs
} from "../src/generate.js";

function readJsonIfExists(filePath: string): any | null {
    try {
        if (!fs.existsSync(filePath)) return null;
        const raw = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function writeJson(filePath: string, value: any) {
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function isObject(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === "object" && !Array.isArray(value);
}

const program = new Command();

program
    .name("notebook-to-lib")
    .description("Convert Observable notebook-kit HTML files into reusable JavaScript libraries")
    .argument("<input-notebook.html>")
    .option("--out <dir>", "Output directory (default: derived from <title>)")
    .action((inputFile: string, options: { out?: string }) => {
        const inputPath = path.resolve(process.cwd(), inputFile);
        const html = fs.readFileSync(inputPath, "utf-8");

        const rawCells = parseNotebookHtml(html);
        const inferredName = parseLibraryName(html);

        const processedCells: TranspiledCell[] = [];
        const allDependencies = new Set<string>();
        const allDependencySpecs: Record<string, string> = {};

        for (const cell of rawCells) {
            const processed = processCell(cell.id, cell.index, cell.source, cell.language, cell.output);
            processedCells.push(processed);
            processed.dependencies.forEach((d) => allDependencies.add(d));
            Object.assign(allDependencySpecs, processed.dependencySpecs);
        }

        const outDir = path.resolve(process.cwd(), options.out ?? inferredName);
        const srcDir = path.join(outDir, "src");
        fs.mkdirSync(srcDir, { recursive: true });

        // Always (re)generate JS artifacts.
        fs.writeFileSync(path.join(srcDir, "define.js"), generateDefineJs(processedCells));
        fs.writeFileSync(path.join(srcDir, "runtime.js"), generateRuntimeJs());
        fs.writeFileSync(path.join(srcDir, "index.js"), generateIndexJs());

        // package.json handling:
        // - if none exists, create a minimal one
        // - if one exists, merge dependencies in-place and preserve scripts/exports/etc
        const packageJsonPath = path.join(outDir, "package.json");
        const existingPkg = readJsonIfExists(packageJsonPath);

        if (!existingPkg) {
            fs.writeFileSync(
                packageJsonPath,
                generatePackageJson(inferredName, allDependencies, allDependencySpecs) + "\n"
            );
        } else {
            const generatedPkg = JSON.parse(generatePackageJson(inferredName, allDependencies, allDependencySpecs));

            const nextPkg = { ...existingPkg };

            // Ensure module basics for Vite/Node.
            nextPkg.type = nextPkg.type ?? "module";
            nextPkg.main = nextPkg.main ?? "src/index.js";

            // Merge dependencies (generated deps win over missing keys, but don't delete anything).
            const existingDeps = isObject(existingPkg.dependencies) ? existingPkg.dependencies : {};
            nextPkg.dependencies = { ...existingDeps, ...generatedPkg.dependencies };

            writeJson(packageJsonPath, nextPkg);
        }

        // README.md is helpful but should not clobber customized docs.
        const readmePath = path.join(outDir, "README.md");
        if (!fs.existsSync(readmePath)) {
            fs.writeFileSync(readmePath, generateReadme(existingPkg?.name ?? inferredName) + "\n");
        }

        console.log(`Generated notebook library in ${outDir}`);
    });

program.parse();
