import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSemester(semester: 1 | 2) {
  return semester === 1 ? "First Semester" : "Second Semester";
}

export function formatLevel(level: number) {
  return `${level} Level`;
}
