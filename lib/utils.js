import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Joins class names, skipping falsy ones, and lets a later Tailwind class win
 * over an earlier one: cn("px-2", wide && "px-6") gives "px-6".
 */
export const cn = (...classes) => twMerge(clsx(classes));
