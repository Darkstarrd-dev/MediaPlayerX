import type { ZhCnCatalog } from "./zh-CN";
import { enUsCatalogPart1 } from "./en-US.part1";
import { enUsCatalogPart2 } from "./en-US.part2";

export const enUsCatalog: { [K in keyof ZhCnCatalog]: string } = {
  ...enUsCatalogPart1,
  ...enUsCatalogPart2,
} as { [K in keyof ZhCnCatalog]: string };
