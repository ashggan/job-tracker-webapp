"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STAGE_LABELS, STAGE_ORDER, FIT_LABEL_ORDER, FIT_META } from "@/lib/stages";

const DAY_OPTIONS = [
  { value: "all", label: "Date: All time" },
  { value: "30", label: "Date: Last 30 days" },
  { value: "90", label: "Date: Last 90 days" },
  { value: "365", label: "Date: Last year" },
];

export function TableFilters({ sources }: { sources: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Select.Value only shows the resolved label (instead of the raw value) once
  // it knows the value->label mapping up front — passing `items` covers the
  // closed/unopened state, before any <Select.Item> has ever mounted.
  const stageItems: Record<string, React.ReactNode> = {
    all: "Stage: All",
    ...Object.fromEntries(STAGE_ORDER.map((s) => [s, STAGE_LABELS[s]])),
  };
  const fitItems: Record<string, React.ReactNode> = {
    all: "Fit: All",
    ...Object.fromEntries(FIT_LABEL_ORDER.map((f) => [f, FIT_META[f].label])),
  };
  const sourceItems: Record<string, React.ReactNode> = {
    all: "Source: All",
    ...Object.fromEntries(sources.map((s) => [s, s === "manual" ? "Manual" : s])),
  };
  const dayItems: Record<string, React.ReactNode> = Object.fromEntries(
    DAY_OPTIONS.map((o) => [o.value, o.label])
  );

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-border px-7 py-4">
      <Input
        placeholder="Search jobs, companies..."
        className="max-w-58"
        value={q}
        onChange={(e) => {
          const value = e.target.value;
          setQ(value);
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => updateParam("q", value), 350);
        }}
      />

      <Select items={stageItems} value={searchParams.get("stage") ?? "all"} onValueChange={(v) => updateParam("stage", v ?? "all")}>
        <SelectTrigger className="w-40 rounded-sm">
          <SelectValue placeholder="Stage: All" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Stage: All</SelectItem>
          {STAGE_ORDER.map((s) => (
            <SelectItem key={s} value={s}>
              {STAGE_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select items={fitItems} value={searchParams.get("fit") ?? "all"} onValueChange={(v) => updateParam("fit", v ?? "all")}>
        <SelectTrigger className="w-40 rounded-sm">
          <SelectValue placeholder="Fit: All" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Fit: All</SelectItem>
          {FIT_LABEL_ORDER.map((f) => (
            <SelectItem key={f} value={f}>
              {FIT_META[f].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select items={sourceItems} value={searchParams.get("source") ?? "all"} onValueChange={(v) => updateParam("source", v ?? "all")}>
        <SelectTrigger className="w-40 rounded-sm">
          <SelectValue placeholder="Source: All" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Source: All</SelectItem>
          {sources.map((s) => (
            <SelectItem key={s} value={s}>
              {s === "manual" ? "Manual" : s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select items={dayItems} value={searchParams.get("days") ?? "all"} onValueChange={(v) => updateParam("days", v ?? "all")}>
        <SelectTrigger className="w-44 rounded-sm">
          <SelectValue placeholder="Date: Last 90 days" />
        </SelectTrigger>
        <SelectContent>
          {DAY_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
