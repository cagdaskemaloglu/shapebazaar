"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  CheckCircle, Clock, Printer, Truck, Package,
  Copy, Check, MapPin, ArrowLeft
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

const STATUS_STEPS = ["pending", "paid", "in_print", "shipped", "delivered"] as const;

interface Order {
  id: string;
  status: string;
  total_amount: number;
  shipping_cost: number;
  recipient_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  district: string | null;
  phone: string | null;
  created_at: string;
  paid_at: string | null;
  tracking_number: string | null;
  cargo_company: string | null;
}

interface OrderItem {
  model_id: string;
  model_title: string;
  material: string;
  color_name: string | null;
  scale_percent: number | null;
  item_total: number;
  print_cost: number;
}

interface Props {
  order: Order;
  items: OrderItem[];
  locale: string;
}

const STEP_ICONS = {
  pending:   Clock,
  paid:      CheckCircle,
  in_print:  Printer,
  shipped:   Truck,
  delivered: Package,
};

export function OrderTrackingClient({ order, items, locale }: Props) {
  const t = useTranslations("orderTracking");
  const tStatus = useTranslations("status");
  const [copied, setCopied] = useState(false);

  const currentStepIndex = STATUS_STEPS.indexOf(order.status as any);

  function copyTracking() {
    if (!order.tracking_number) return;
    navigator.clipboard.writeText(order.tracking_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(
      locale === "tr" ? "tr-TR" : "en-US",
      { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href={`/${locale}/dashboard?tab=orders`}
          className="flex items-center gap-1.5 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft size={14} /> {t("backToDashboard")}
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">{t("title")}</h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
          {t("orderNo")}: <span className="font-mono font-medium text-[var(--text-primary)]">#{order.id.slice(0, 8).toUpperCase()}</span>
          <span className="mx-2">·</span>
          {formatDate(order.created_at)}
        </p>
      </div>

      {/* Status Timeline */}
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-6 mb-4">
        <h2 className="text-sm font-medium text-[var(--text-primary)] mb-6">{t("timeline")}</h2>
        <div className="relative">
          {/* Progress line */}
          <div className="absolute top-5 left-5 right-5 h-0.5 bg-[var(--border)]" />
          <div
            className="absolute top-5 left-5 h-0.5 bg-[#FF6B35] transition-all duration-500"
            style={{ width: `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
          />

          <div className="relative flex justify-between">
            {STATUS_STEPS.map((step, i) => {
              const Icon = STEP_ICONS[step];
              const isCompleted = i <= currentStepIndex;
              const isCurrent   = i === currentStepIndex;
              return (
                <div key={step} className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all z-10 ${
                    isCompleted
                      ? "bg-[#FF6B35] border-[#FF6B35] text-white"
                      : "bg-[var(--bg-primary)] border-[var(--border)] text-[var(--text-tertiary)]"
                  } ${isCurrent ? "ring-4 ring-[rgba(255,107,53,0.2)]" : ""}`}>
                    <Icon size={16} />
                  </div>
                  <span className={`text-[10px] text-center max-w-[60px] leading-tight ${
                    isCompleted ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-tertiary)]"
                  }`}>
                    {t(`steps.${step}`)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Kargo Bilgisi */}
      {order.tracking_number && (
        <div className="bg-[rgba(255,107,53,0.05)] border border-[rgba(255,107,53,0.2)] rounded-2xl p-4 mb-4">
          <h2 className="text-sm font-medium text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Truck size={14} className="text-[#FF6B35]" /> {t("cargo")}
          </h2>
          <div className="flex flex-col gap-2">
            {order.cargo_company && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-tertiary)]">{t("cargoCompany")}</span>
                <span className="text-[var(--text-primary)] font-medium">{order.cargo_company}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm">
              <span className="text-[var(--text-tertiary)]">{t("trackingNo")}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[var(--text-primary)] font-medium">{order.tracking_number}</span>
                <button
                  onClick={copyTracking}
                  className="flex items-center gap-1 text-xs text-[#FF6B35] hover:underline"
                >
                  {copied ? <><Check size={11} /> {t("copied")}</> : <><Copy size={11} /> {t("copyTracking")}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ürünler */}
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-4 mb-4">
        <h2 className="text-sm font-medium text-[var(--text-primary)] mb-3">{t("items")}</h2>
        <div className="flex flex-col gap-3">
          {items.map((item, i) => (
            <div key={i} className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--text-primary)] truncate">{item.model_title}</div>
                <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                  {item.material}
                  {item.color_name && ` · ${item.color_name}`}
                  {item.scale_percent && ` · %${item.scale_percent}`}
                </div>
              </div>
              <span className="text-sm font-medium text-[#FF6B35] shrink-0">
                {formatPrice(item.item_total, locale)}
              </span>
            </div>
          ))}
        </div>
        <div className="border-t border-[var(--border)] mt-3 pt-3 flex flex-col gap-1.5">
          <div className="flex justify-between text-xs text-[var(--text-tertiary)]">
            <span>{t("shipping")}</span>
            <span>{formatPrice(order.shipping_cost, locale)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold text-[var(--text-primary)]">
            <span>{t("total")}</span>
            <span className="text-[#FF6B35]">{formatPrice(order.total_amount, locale)}</span>
          </div>
        </div>
      </div>

      {/* Teslimat Adresi */}
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-4">
        <h2 className="text-sm font-medium text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <MapPin size={14} /> {t("delivery")}
        </h2>
        <div className="text-sm text-[var(--text-secondary)] space-y-0.5">
          {order.recipient_name && <div className="font-medium text-[var(--text-primary)]">{order.recipient_name}</div>}
          {order.address_line1  && <div>{order.address_line1}</div>}
          {order.address_line2  && <div>{order.address_line2}</div>}
          {(order.district || order.city) && (
            <div>{[order.district, order.city].filter(Boolean).join(", ")}</div>
          )}
          {order.phone && <div className="text-[var(--text-tertiary)] text-xs mt-1">{order.phone}</div>}
        </div>
      </div>
    </div>
  );
}