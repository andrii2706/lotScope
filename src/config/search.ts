import type { SearchFilters } from "@/types/auction";

export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  make: "",
  model: "",
  yearFrom: 0,
  yearTo: 0,
  maxMiles: 0,
  maxBidUsd: 0,
  auction: "all",
  damages: [],
  excludeFlood: true,
  excludeDeployed: false,
  runDriveOnly: false,
};
