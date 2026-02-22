import { zhCnCatalogPart1 } from "./zh-CN.part1";
import { zhCnCatalogPart2 } from "./zh-CN.part2";

export const zhCnCatalog = {
  ...zhCnCatalogPart1,
  ...zhCnCatalogPart2,
} as const;

export type ZhCnCatalog = typeof zhCnCatalog;
