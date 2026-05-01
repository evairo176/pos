import { Request, Response } from "express";
import * as productService from "../services/product.service";
import { ok, created } from "@pos/shared";

export async function getProducts(req: Request, res: Response) {
  const schema = req.tenant?.schema;
  if (!schema) throw new Error("Tenant schema not found");

  const result = await productService.getProducts(schema, req.query as any);
  ok(res, result.data, undefined).json({ meta: result.meta });
}

export async function getProductById(req: Request, res: Response) {
  const schema = req.tenant?.schema;
  if (!schema) throw new Error("Tenant schema not found");

  const product = await productService.getProductById(schema, req.params.id);
  ok(res, product);
}

export async function createProduct(req: Request, res: Response) {
  const schema = req.tenant?.schema;
  if (!schema) throw new Error("Tenant schema not found");

  const product = await productService.createProduct(schema, req.body);
  created(res, product, "Product created");
}

export async function updateProduct(req: Request, res: Response) {
  const schema = req.tenant?.schema;
  if (!schema) throw new Error("Tenant schema not found");

  const product = await productService.updateProduct(
    schema,
    req.params.id,
    req.body,
  );
  ok(res, product, "Product updated");
}

export async function deleteProduct(req: Request, res: Response) {
  const schema = req.tenant?.schema;
  if (!schema) throw new Error("Tenant schema not found");

  await productService.deleteProduct(schema, req.params.id);
  ok(res, null, "Product deleted");
}
