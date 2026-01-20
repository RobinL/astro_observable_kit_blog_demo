#!/usr/bin/env node

import { Command } from "commander";
import chokidar from "chokidar";
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

function findWorkspaceRoot(startDir: string): string | null {
    let current = path.resolve(startDir);
    for (; ;) {
        const candidate = path.join(current, "pnpm-workspace.yaml");
        if (fs.existsSync(candidate)) return current;
        const parent = path.dirname(current);
        if (parent === current) return null;
        current = parent;
    }
}

function readPackageName(pkgJsonPath: string): string | null {
    try {
        const raw = fs.readFileSync(pkgJsonPath, "utf-8");
        const pkg = JSON.parse(raw);
        return typeof pkg?.name === "string" ? pkg.name : null;
    } catch {
        return null;
    }
}

function collectWorkspacePackageNames(workspaceRoot: string): Set<string> {
    const out = new Set<string>();

    const packagesDir = path.join(workspaceRoot, "packages");
    if (!fs.existsSync(packagesDir)) return out;

    const skipDirs = new Set(["node_modules", "dist", "build", ".git"]);

    const walk = (dir: string, depth: number) => {
        if (depth < 0) return;
        let entries: fs.Dirent[];
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }

        // If this folder is a package, record it.
        const pkgJsonPath = path.join(dir, "package.json");
        if (fs.existsSync(pkgJsonPath)) {
            const name = readPackageName(pkgJsonPath);
            if (name) out.add(name);
        }

        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            if (skipDirs.has(entry.name)) continue;
            if (entry.name.startsWith(".")) continue;
            walk(path.join(dir, entry.name), depth - 1);
        }
    };

    // Depth 3 covers common layouts like:
    // - packages/my-lib
    // - packages/notebooks/diff-demo
    // - packages/scope/my-lib (if used)
    walk(packagesDir, 3);
    return out;
}

const program = new Command();

type Options = {
    out?: string;
    watch?: boolean;
};

function buildOnce(inputFile: string, options: Options) {
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

    // Prefer linking to local workspace packages when a bare import matches a workspace package name.
    // This enables notebooks to import from user-defined packages under ./packages/*.
    const workspaceRoot = findWorkspaceRoot(process.cwd());
    if (workspaceRoot) {
        const workspacePackages = collectWorkspacePackageNames(workspaceRoot);
        for (const dep of allDependencies) {
            if (workspacePackages.has(dep) && !(dep in allDependencySpecs)) {
                allDependencySpecs[dep] = "workspace:*";
            }
        }
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

        // Merge dependencies:
        // - Preserve user-specified versions by default
        // - But if we detect a local workspace package (workspace:*), prefer it so
        //   bare imports like "my-custom-lib" work without publishing to npm.
        const existingDeps = isObject(existingPkg.dependencies) ? existingPkg.dependencies : {};
        const generatedDeps = isObject(generatedPkg.dependencies) ? generatedPkg.dependencies : {};

        const merged: Record<string, unknown> = { ...existingDeps };
        for (const [dep, spec] of Object.entries(generatedDeps)) {
            if (typeof spec === "string" && spec.startsWith("workspace:")) {
                merged[dep] = spec;
                continue;
            }
            if (!(dep in merged)) {
                merged[dep] = spec;
            }
        }
        nextPkg.dependencies = merged;

        writeJson(packageJsonPath, nextPkg);
    }

    // README.md is helpful but should not clobber customized docs.
    const readmePath = path.join(outDir, "README.md");
    if (!fs.existsSync(readmePath)) {
        fs.writeFileSync(readmePath, generateReadme(existingPkg?.name ?? inferredName) + "\n");
    }

    console.log(`Generated notebook library in ${outDir}`);
}

program
    .name("notebook-to-lib")
    .description("Convert Observable notebook-kit HTML files into reusable JavaScript libraries")
    .argument("<input-notebook.html>")
    .option("--out <dir>", "Output directory (default: derived from <title>)")
    .option("--watch", "Watch input file and regenerate on change")
    .action((inputFile: string, options: Options) => {
        const inputPath = path.resolve(process.cwd(), inputFile);

        const run = () => {
            try {
                buildOnce(inputFile, options);
            } catch (err) {
                console.error("Failed to generate notebook library:", err);
            }
        };

        run();

        if (!options.watch) return;

        console.log(`Watching ${inputPath} for changes...`);

        const watcher = chokidar.watch(inputPath, {
            ignoreInitial: true
        });

        const rebuild = () => run();
        watcher.on("add", rebuild);
        watcher.on("change", rebuild);

        const shutdown = async () => {
            await watcher.close();
            process.exit(0);
        };

        process.on("SIGINT", shutdown);
        process.on("SIGTERM", shutdown);
    });

program.parse();
