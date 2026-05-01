import { Request, Response } from "express";
import * as categoryService from "../services/category.service";
import { ok, created } from "@pos/shared";

export async function getCategories(req: Request, res: Response) {
  const schema = req.tenant?.schema;
  if (!schema) throw new Error("Tenant schema not found");

  const result = await categoryService.getCategories(schema, req.query as any);
  ok(res, result.data, undefined).json({ meta: result.meta });
}

export async function getCategoryById(req: Request, res: Response) {
  const schema = req.tenant?.schema;
  if (!schema) throw new Error("Tenant schema not found");

  const category = await categoryService.getCategoryById(schema, req.params.id);
  ok(res, category);
}

export async function createCategory(req: Request, res: Response) {
  const schema = req.tenant?.schema;
  if (!schema) throw new Error("Tenant schema not found");

  const category = await categoryService.createCategory(schema, req.body);
  created(res, category, "Category created");
}

export async function updateCategory(req: Request, res: Response) {
  const schema = req.tenant?.schema;
  if (!schema) throw new Error("Tenant schema not found");

  const category = await categoryService.updateCategory(
    schema,
    req.params.id,
    req.body,
  );
  ok(res, category, "Category updated");
}

export async function deleteCategory(req: Request, res: Response) {
  const schema = req.tenant?.schema;
  if (!schema) throw new Error("Tenant schema not found");

  await categoryService.deleteCategory(schema, req.params.id);
  ok(res, null, "Category deleted");
}
