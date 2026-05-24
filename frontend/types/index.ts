export interface User {
  uid: string;
  email: string;
  name: string;
  role: "business_owner" | "delivery_agent" | "customer" | "saas_admin";
  phone?: string;
  location?: { lat: number; lng: number };
  is_available?: boolean;
  current_workload?: number;
  created_at?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  sku: string;
  category: string;
  image_url: string;
  business_id: string;
  created_at: string;
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customer_id: string;
  items: OrderItem[];
  total_amount: number;
  status: string;
  payment_status: string;
  payment_id: string;
  delivery_agent_id: string | null;
  delivery_address: { address: string; lat: number; lng: number };
  created_at: string;
  updated_at: string;
  customer_name?: string;
  customer_phone?: string;
  return_reason?: string;
  refund_id?: string;
}

export interface Delivery {
  id: string;
  order_id: string;
  agent_id: string;
  status: string;
  current_location: { lat: number; lng: number };
  route: { lat: number; lng: number }[];
  estimated_time: string;
  delivered_at: string | null;
  rating: number | null;
  created_at: string;
}

export interface DemandForecast {
  product_id: string;
  product_name: string;
  current_stock: number;
  daily_average: number;
  predicted_7day_demand: number;
  trend: string;
  restock_recommended: boolean;
  urgency: string;
  suggested_restock_qty: number;
}

export interface ChurnResult {
  customer_id: string;
  name: string;
  email: string;
  days_since_last_order: number;
  total_orders: number;
  risk_level: string;
  suggestion: string;
  re_engagement_suggested: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Notification {
  user_id: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export interface Payout {
  id: string;
  agent_id: string;
  amount: number;
  status: string;
  stripe_transaction_id: string;
  created_at: string;
}

