import { ScanSearch } from "lucide-react";
import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-2">
      <span aria-hidden className="grid size-8 place-items-center rounded-[9px] bg-[#c8f542] text-[#101828]">
        <ScanSearch className="size-[18px]" strokeWidth={2.2} />
      </span>
      <span className="text-base font-bold tracking-tight">LotScope</span>
    </Link>
  );
}
