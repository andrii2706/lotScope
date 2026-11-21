"use client";

import { Gauge, ScanSearch } from "lucide-react";
import Link from "next/link";
import { useLang } from "@/lib/client/lang";

export function Logo() {
  const pl = useLang() === "pl";
  return (
    <Link href="/" className="flex items-center gap-2.5 px-2">
      <span aria-hidden className={`grid size-8 place-items-center rounded-[9px] ${pl ? "bg-[#ff7a1a] text-[#0b0d10]" : "bg-[#c8f542] text-[#101828]"}`}>
        {pl ? <Gauge className="size-[18px]" strokeWidth={2.4} /> : <ScanSearch className="size-[18px]" strokeWidth={2.2} />}
      </span>
      {pl ? (
        <span className="flex items-center gap-2">
          <span className="font-['Barlow_Condensed'] text-[19px] font-bold uppercase tracking-[0.08em]">LotScope</span>
          <span className="rounded-[3px] border border-accent px-1.5 py-px font-mono text-[10px] font-semibold text-accent-text">PL</span>
        </span>
      ) : (
        <span className="text-base font-bold tracking-tight">LotScope</span>
      )}
    </Link>
  );
}
