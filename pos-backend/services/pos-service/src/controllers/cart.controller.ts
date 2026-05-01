import { Request, Response } from 'express';
import { ok, created } from '@pos/shared';
import * as cartService from '../services/cart.service';

export async function getCart(req: Request, res: Response) {
  const outletId = req.query.outlet_id as string || (req as any).user?.outletId;
  const cashierId = (req as any).user?.id;
  
  if (!outletId) {
    throw new Error('Outlet ID required');
  }
  if (!cashierId) {
    throw new Error('Cashier ID required');
  }
  
  const cart = await cartService.getCart(outletId, cashierId);
  ok(res, cart);
}

export async function addToCart(req: Request, res: Response) {
  const outletId = req.query.outlet_id as string || (req as any).user?.outletId;
  const cashierId = (req as any).user?.id;
  
  if (!outletId) {
    throw new Error('Outlet ID required');
  }
  if (!cashierId) {
    throw new Error('Cashier ID required');
  }
  
  const cart = await cartService.addToCart(outletId, cashierId, req.body);
  created(res, cart, 'Item added to cart');
}

export async function updateCartItem(req: Request, res: Response) {
  const outletId = req.query.outlet_id as string || (req as any).user?.outletId;
  const cashierId = (req as any).user?.id;
  
  if (!outletId) {
    throw new Error('Outlet ID required');
  }
  if (!cashierId) {
    throw new Error('Cashier ID required');
  }
  
  const cart = await cartService.updateCartItem(outletId, cashierId, req.params.id, req.body);
  ok(res, cart, 'Cart item updated');
}

export async function removeCartItem(req: Request, res: Response) {
  const outletId = req.query.outlet_id as string || (req as any).user?.outletId;
  const cashierId = (req as any).user?.id;
  
  if (!outletId) {
    throw new Error('Outlet ID required');
  }
  if (!cashierId) {
    throw new Error('Cashier ID required');
  }
  
  const cart = await cartService.removeCartItem(outletId, cashierId, req.params.id);
  ok(res, cart, 'Item removed from cart');
}

export async function clearCart(req: Request, res: Response) {
  const outletId = req.query.outlet_id as string || (req as any).user?.outletId;
  const cashierId = (req as any).user?.id;
  
  if (!outletId) {
    throw new Error('Outlet ID required');
  }
  if (!cashierId) {
    throw new Error('Cashier ID required');
  }
  
  await cartService.clearCart(outletId, cashierId);
  ok(res, null, 'Cart cleared');
}
