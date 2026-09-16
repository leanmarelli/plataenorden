import {
  ArrowDownLeft,
  ArrowUpRight,
  PiggyBank,
  Home,
  Zap,
  Wifi,
  ShoppingCart,
  UtensilsCrossed,
  Wine,
  Car,
  Heart,
  Music,
  Film,
  Shirt,
  GraduationCap,
  FileText,
  CreditCard,
  Plane,
  Package,
  Wallet,
  Coins,
  ReceiptText,
  Gift,
  Users,
  HeartHandshake,
  Trophy,
  CircleDot,
  Tag,
  type LucideIcon,
} from "lucide-react";
import type { MovTipo } from "@/types/database";

/** Devuelve un ícono representativo según la categoría del movimiento. */
export function iconForCategory(cat: string, tipo: MovTipo): LucideIcon {
  const map: Record<string, LucideIcon> = {
    Alquiler: Home,
    Expensas: Home,
    "Servicios (luz/gas/agua)": Zap,
    "Internet / Teléfono": Wifi,
    Supermercado: ShoppingCart,
    "Comida / Delivery": UtensilsCrossed,
    "Salidas / Restaurantes": Wine,
    "Transporte / Nafta": Car,
    "Salud / Farmacia": Heart,
    Suscripciones: Music,
    Entretenimiento: Film,
    Ropa: Shirt,
    Educación: GraduationCap,
    Impuestos: FileText,
    "Tarjeta de crédito": CreditCard,
    Viaje: Plane,
    Regalos: Gift,
    Amigos: Users,
    Familia: HeartHandshake,
    Fútbol: Trophy,
    Pádel: CircleDot,
    "Otro gasto": Package,
    Sueldo: Wallet,
    "Freelance / Honorarios": Coins,
    "Adelanto / Cobro anticipado": Wallet,
    Reintegro: ReceiptText,
    "Otro ingreso": Wallet,
    "Ahorro / Inversión": PiggyBank,
  };
  if (map[cat]) return map[cat];
  // Categorías custom del usuario: ícono genérico de tag
  if (tipo === "Gasto") return Tag;
  if (tipo === "Ingreso") return ArrowDownLeft;
  if (tipo === "Ahorro") return PiggyBank;
  return ArrowUpRight;
}
