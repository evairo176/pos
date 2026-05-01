import { getRedis } from '@pos/shared';
import { v4 as uuidv4 } from 'uuid';

const redis = getRedis();
const CART_PREFIX = 'cart:';
const CART_TTL = 86400; // 24 hours

function getCartKey(outletId: string, cashierId: string): string {
  return `${CART_PREFIX}${outletId}:${cashierId}`;
}

export interface CartItem {
  id: string;
  product_id: string;
  variant_id?: string;
  name: string;
  quantity: number;
  price: number;
  discount_amount: number;
  notes?: string;
  subtotal: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  item_count: number;
}

export async function getCart(outletId: string, cashierId: string): Promise<Cart> {
  const key = getCartKey(outletId, cashierId);
  const data = await redis.get(key);
  
  if (!data) {
    return {
      items: [],
      subtotal: 0,
      discount_total: 0,
      tax_total: 0,
      grand_total: 0,
      item_count: 0,
    };
  }
  
  const items: CartItem[] = JSON.parse(data);
  return calculateCart(items);
}

export async function addToCart(
  outletId: string,
  cashierId: string,
  item: Omit<CartItem, 'id' | 'subtotal'>
): Promise<Cart> {
  const key = getCartKey(outletId, cashierId);
  const cart = await getCart(outletId, cashierId);
  
  // Check if item already exists
  const existingIndex = cart.items.findIndex(
    i => i.product_id === item.product_id && i.variant_id === item.variant_id
  );
  
  const newItem: CartItem = {
    ...item,
    id: uuidv4(),
    subtotal: (item.price * item.quantity) - item.discount_amount,
  };
  
  if (existingIndex >= 0) {
    // Update existing item
    cart.items[existingIndex].quantity += item.quantity;
    cart.items[existingIndex].subtotal = 
      (cart.items[existingIndex].price * cart.items[existingIndex].quantity) - 
      cart.items[existingIndex].discount_amount;
  } else {
    // Add new item
    cart.items.push(newItem);
  }
  
  await redis.setex(key, CART_TTL, JSON.stringify(cart.items));
  return calculateCart(cart.items);
}

export async function updateCartItem(
  outletId: string,
  cashierId: string,
  itemId: string,
  updates: Partial<Pick<CartItem, 'quantity' | 'price' | 'discount_amount' | 'notes'>>
): Promise<Cart> {
  const key = getCartKey(outletId, cashierId);
  const cart = await getCart(outletId, cashierId);
  
  const itemIndex = cart.items.findIndex(i => i.id === itemId);
  if (itemIndex < 0) {
    throw new Error('Cart item not found');
  }
  
  const item = cart.items[itemIndex];
  
  if (updates.quantity !== undefined) item.quantity = updates.quantity;
  if (updates.price !== undefined) item.price = updates.price;
  if (updates.discount_amount !== undefined) item.discount_amount = updates.discount_amount;
  if (updates.notes !== undefined) item.notes = updates.notes;
  
  item.subtotal = (item.price * item.quantity) - item.discount_amount;
  
  await redis.setex(key, CART_TTL, JSON.stringify(cart.items));
  return calculateCart(cart.items);
}

export async function removeCartItem(
  outletId: string,
  cashierId: string,
  itemId: string
): Promise<Cart> {
  const key = getCartKey(outletId, cashierId);
  const cart = await getCart(outletId, cashierId);
  
  cart.items = cart.items.filter(i => i.id !== itemId);
  
  if (cart.items.length === 0) {
    await redis.del(key);
    return calculateCart([]);
  }
  
  await redis.setex(key, CART_TTL, JSON.stringify(cart.items));
  return calculateCart(cart.items);
}

export async function clearCart(outletId: string, cashierId: string): Promise<void> {
  const key = getCartKey(outletId, cashierId);
  await redis.del(key);
}

function calculateCart(items: CartItem[]): Cart {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const discount_total = items.reduce((sum, item) => sum + item.discount_amount, 0);
  const item_count = items.reduce((sum, item) => sum + item.quantity, 0);
  
  // Tax calculation can be configured per outlet
  const tax_total = 0;
  const grand_total = subtotal + tax_total;
  
  return {
    items,
    subtotal,
    discount_total,
    tax_total,
    grand_total,
    item_count,
  };
}
