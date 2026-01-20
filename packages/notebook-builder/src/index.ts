import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import { parseNotebookHtml, parseLibraryName } from "./parse.js";
import { processCell, type TranspiledCell } from "./transpile.js";
import { generateDefineJs, generateIndexJs, generatePackageJson, generateRuntimeHelper } from "./generate.js";

const program = new Command();
program.argument("<input-file>").option("-o, --out <dir>").action((inputFile, options) => {
    const inputPath = path.resolve(inputFile);
    const html = fs.readFileSync(inputPath, "utf-8");
    const rawCells = parseNotebookHtml(html);
    const libName = parseLibraryName(html);
    const processedCells: TranspiledCell[] = [];
    const allDependencies = new Set<string>();

    rawCells.forEach(cell => {
        try {
            const processed = processCell(cell.id, cell.source, cell.language, cell.name);
            processedCells.push(processed);
            processed.dependencies.forEach(d => allDependencies.add(d));
        } catch (err) { console.error(err); }
    });

    const outDir = options.out || path.join(process.cwd(), libName);
    const srcDir = path.join(outDir, "src");
    if (!fs.existsSync(srcDir)) fs.mkdirSync(srcDir, { recursive: true });

    fs.writeFileSync(path.join(srcDir, "define.js"), generateDefineJs(processedCells));
    fs.writeFileSync(path.join(srcDir, "runtime.js"), generateRuntimeHelper());
    fs.writeFileSync(path.join(srcDir, "index.js"), generateIndexJs());
    fs.writeFileSync(path.join(outDir, "package.json"), generatePackageJson(libName, allDependencies));
    console.log(`Generated ${libName} in ${outDir}`);
});
program.parse();
