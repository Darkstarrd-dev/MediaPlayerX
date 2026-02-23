import { z } from "zod";

const nonNegativeIntSchema = z.number().int().nonnegative();

export const batchRenameSidebarModeSchema = z.enum([
  "replace",
  "numbering",
  "remove-range",
  "metadata",
]);

export const renameSidebarNodesRequestSchema = z
  .object({
    node_ids: z.array(z.string().min(1)).min(1),
    mode: batchRenameSidebarModeSchema,
    preview_only: z.boolean().optional(),
    fail_fast: z.boolean().optional(),
    replace_from: z.string().optional(),
    replace_to: z.string().optional(),
    numbering_base_name: z.string().optional(),
    numbering_start: z.number().int().optional(),
    numbering_step: z.number().int().optional(),
    numbering_pad_width: z.number().int().min(1).max(12).optional(),
    remove_start: z.number().int().min(0).optional(),
    remove_end: z.number().int().min(0).optional(),
    remove_head: z.number().int().min(0).optional(),
    remove_tail: z.number().int().min(0).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.mode === "replace") {
      if (typeof value.replace_from !== "string") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "replace_from is required for replace mode",
          path: ["replace_from"],
        });
      }
      if (typeof value.replace_to !== "string") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "replace_to is required for replace mode",
          path: ["replace_to"],
        });
      }
      return;
    }

    if (value.mode === "numbering") {
      if (typeof value.numbering_base_name !== "string") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "numbering_base_name must be a string for numbering mode",
          path: ["numbering_base_name"],
        });
      }
      return;
    }

    if (value.mode === "remove-range") {
      const start = value.remove_start;
      const end = value.remove_end;
      if (
        typeof start === "number" &&
        typeof end === "number" &&
        start > 0 &&
        end > 0 &&
        end < start
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "remove_end must be >= remove_start",
          path: ["remove_end"],
        });
      }
    }
  });

export const renameSidebarNodesResponseSchema = z.object({
  renamed_count: nonNegativeIntSchema,
  failed: z.array(
    z.object({
      node_id: z.string().min(1),
      reason: z.string().min(1),
    }),
  ),
  preview_only: z.boolean(),
  results: z.array(
    z.object({
      node_id: z.string().min(1),
      source_name: z.string().min(1),
      target_name: z.string().min(1),
      source_path: z.string().min(1),
      target_path: z.string().min(1),
      applied: z.boolean(),
      reason: z.string().min(1).nullable(),
    }),
  ),
  updated_at_ms: z.number().int().positive(),
});

export const renameItemTargetSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("sidebar-node"),
    node_id: z.string().min(1),
  }),
  z.object({
    kind: z.literal("image-item"),
    image_id: z.string().min(1),
  }),
  z.object({
    kind: z.literal("archive-entry"),
    archive_path: z.string().min(1),
    entry_name: z.string().min(1),
  }),
]);

export const renameItemsModeSchema = z.enum([
  "single",
  "replace",
  "numbering",
  "remove-range",
  "metadata",
]);

export const renameItemsRequestSchema = z
  .object({
    targets: z.array(renameItemTargetSchema).min(1),
    mode: renameItemsModeSchema,
    preview_only: z.boolean().optional(),
    fail_fast: z.boolean().optional(),
    single_new_name: z.string().optional(),
    replace_from: z.string().optional(),
    replace_to: z.string().optional(),
    numbering_base_name: z.string().optional(),
    numbering_start: z.number().int().optional(),
    numbering_step: z.number().int().optional(),
    numbering_pad_width: z.number().int().min(1).max(12).optional(),
    remove_start: z.number().int().min(0).optional(),
    remove_end: z.number().int().min(0).optional(),
    remove_head: z.number().int().min(0).optional(),
    remove_tail: z.number().int().min(0).optional(),
    metadata_template: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.mode === "single") {
      if (!value.single_new_name || value.single_new_name.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "single_new_name is required for single mode",
          path: ["single_new_name"],
        });
      }
      return;
    }
    if (value.mode === "replace") {
      if (typeof value.replace_from !== "string") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "replace_from is required for replace mode",
          path: ["replace_from"],
        });
      }
      if (typeof value.replace_to !== "string") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "replace_to is required for replace mode",
          path: ["replace_to"],
        });
      }
      return;
    }
    if (value.mode === "numbering") {
      if (typeof value.numbering_base_name !== "string") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "numbering_base_name must be a string for numbering mode",
          path: ["numbering_base_name"],
        });
      }
      return;
    }
    if (value.mode === "remove-range") {
      if (
        typeof value.remove_start === "number" &&
        typeof value.remove_end === "number" &&
        value.remove_start > 0 &&
        value.remove_end > 0 &&
        value.remove_end < value.remove_start
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "remove_end must be >= remove_start",
          path: ["remove_end"],
        });
      }
      return;
    }
    if (value.mode === "metadata") {
      if (
        !value.metadata_template ||
        value.metadata_template.trim().length === 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "metadata_template is required for metadata mode",
          path: ["metadata_template"],
        });
      }
    }
  });

export const renameItemsResponseSchema = z.object({
  renamed_count: nonNegativeIntSchema,
  failed: z.array(
    z.object({
      target: renameItemTargetSchema,
      reason: z.string().min(1),
    }),
  ),
  preview_only: z.boolean(),
  results: z.array(
    z.object({
      target: renameItemTargetSchema,
      source_name: z.string().min(1),
      target_name: z.string().min(1),
      source_path: z.string().min(1),
      target_path: z.string().min(1),
      applied: z.boolean(),
      reason: z.string().min(1).nullable(),
    }),
  ),
  updated_at_ms: z.number().int().positive(),
});
