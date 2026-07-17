import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { parseHandbookFile } from "@/lib/handbook/parser";

const sourcePath = resolve(process.cwd(), "oduduwa_university_handbook_cleaned.md");
const outputPath = resolve(process.cwd(), "drizzle", "seed-data", "handbook-seed.json");
const reviewPath = resolve(process.cwd(), "drizzle", "seed-data", "handbook-review-log.json");

const parsed = parseHandbookFile(sourcePath);

mkdirSync(dirname(outputPath), { recursive: true });

writeFileSync(outputPath, JSON.stringify(parsed, null, 2));
writeFileSync(reviewPath, JSON.stringify(parsed.issues, null, 2));

console.log(`Wrote handbook seed data to ${outputPath}`);
console.log(`Wrote handbook review log to ${reviewPath}`);
