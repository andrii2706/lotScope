import { CircleDollarSign, FileText, Gavel, ScanSearch, Wrench } from "lucide-react";

export const STORED_PHOTOS = 8;

export const DAMAGE_OPTIONS = [
  "Front End",
  "Rear End",
  "Left Side",
  "Right Side",
  "Left Front",
  "Right Front",
  "Left Rear",
  "Right Rear",
  "All Over",
  "Rollover",
  "Undercarriage",
  "Mechanical",
  "Water/Flood",
  "Hail",
  "Vandalism",
  "Minor Dent/Scratches",
];

export const TITLE_OPTIONS = ["Salvage", "Clean", "Rebuilt", "Certificate of Destruction", "Parts Only"];

export const LOADING_STAGES = [
  "Розглядаю фото лота…",
  "Шукаю пошкодження та ризики…",
  "Оцінюю вартість ремонту…",
  "Рахую розмитнення та ціну під ключ…",
];

export const OUTCOMES = [
  { icon: ScanSearch, text: "Пошкодження та ризики за фото" },
  { icon: Wrench, text: "Вилка вартості ремонту" },
  { icon: CircleDollarSign, text: "Ціна під ключ з розмитненням" },
  { icon: Gavel, text: "Максимальна ставка" },
  { icon: FileText, text: "PDF-звіт з вашим логотипом" },
];

export const MAX_REQUEST_CHARS = 4_300_000;
