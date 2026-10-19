export const CARS: Record<string, string[]> = {
  Acura: ["ILX", "MDX", "RDX", "TLX", "TSX", "RLX", "ZDX", "Integra"],
  "Alfa Romeo": ["Giulia", "Stelvio", "4C"],
  "Aston Martin": ["DB11", "Vantage", "DBX"],
  Audi: ["A3", "A4", "A5", "A6", "A7", "A8", "Q3", "Q5", "Q7", "Q8", "e-tron", "S4", "S5", "SQ5", "RS5", "TT"],
  Bentley: ["Continental GT", "Bentayga", "Flying Spur"],
  BMW: ["1 Series", "2 Series", "3 Series", "4 Series", "5 Series", "6 Series", "7 Series", "8 Series", "X1", "X2", "X3", "X4", "X5", "X6", "X7", "Z4", "i3", "i4", "iX", "M3", "M4", "M5"],
  Buick: ["Encore", "Enclave", "Envision", "Regal", "LaCrosse", "Verano"],
  Cadillac: ["ATS", "CT4", "CT5", "CT6", "CTS", "Escalade", "SRX", "XT4", "XT5", "XT6", "XTS", "Lyriq"],
  Chevrolet: ["Blazer", "Bolt EV", "Camaro", "Colorado", "Corvette", "Cruze", "Equinox", "Impala", "Malibu", "Silverado", "Sonic", "Spark", "Suburban", "Tahoe", "Traverse", "Trax", "Volt"],
  Chrysler: ["200", "300", "Pacifica", "Voyager"],
  Dodge: ["Challenger", "Charger", "Durango", "Grand Caravan", "Journey", "Dart", "Ram 1500"],
  Fiat: ["500", "500X", "500L"],
  Ford: ["Bronco", "Bronco Sport", "EcoSport", "Edge", "Escape", "Expedition", "Explorer", "F-150", "F-250", "Fiesta", "Focus", "Fusion", "Maverick", "Mustang", "Mustang Mach-E", "Ranger", "Transit"],
  Genesis: ["G70", "G80", "G90", "GV70", "GV80"],
  GMC: ["Acadia", "Canyon", "Sierra", "Terrain", "Yukon"],
  Honda: ["Accord", "Civic", "CR-V", "Fit", "HR-V", "Insight", "Odyssey", "Passport", "Pilot", "Ridgeline"],
  Hyundai: ["Accent", "Elantra", "Ioniq", "Kona", "Palisade", "Santa Fe", "Sonata", "Tucson", "Veloster", "Venue"],
  Infiniti: ["Q50", "Q60", "Q70", "QX50", "QX55", "QX60", "QX80"],
  Jaguar: ["E-Pace", "F-Pace", "F-Type", "I-Pace", "XE", "XF", "XJ"],
  Jeep: ["Cherokee", "Compass", "Gladiator", "Grand Cherokee", "Grand Cherokee L", "Patriot", "Renegade", "Wrangler"],
  Kia: ["Forte", "K5", "Niro", "Optima", "Rio", "Seltos", "Sorento", "Soul", "Sportage", "Stinger", "Telluride", "EV6"],
  "Land Rover": ["Defender", "Discovery", "Discovery Sport", "Range Rover", "Range Rover Evoque", "Range Rover Sport", "Range Rover Velar"],
  Lexus: ["ES", "GS", "GX", "IS", "LS", "LX", "NX", "RC", "RX", "UX"],
  Lincoln: ["Aviator", "Corsair", "MKC", "MKX", "MKZ", "Navigator", "Nautilus"],
  Maserati: ["Ghibli", "Levante", "Quattroporte"],
  Mazda: ["CX-3", "CX-30", "CX-5", "CX-9", "CX-50", "Mazda3", "Mazda6", "MX-5 Miata"],
  "Mercedes-Benz": ["A-Class", "C-Class", "CLA", "CLS", "E-Class", "G-Class", "GLA", "GLB", "GLC", "GLE", "GLS", "S-Class", "EQS", "AMG GT"],
  Mini: ["Cooper", "Countryman", "Clubman"],
  Mitsubishi: ["Eclipse Cross", "Lancer", "Mirage", "Outlander", "Outlander Sport"],
  Nissan: ["Altima", "Armada", "Frontier", "Juke", "Kicks", "Leaf", "Maxima", "Murano", "Pathfinder", "Rogue", "Rogue Sport", "Sentra", "Titan", "Versa"],
  Polestar: ["1", "2"],
  Porsche: ["911", "718 Cayman", "718 Boxster", "Cayenne", "Macan", "Panamera", "Taycan"],
  Ram: ["1500", "2500", "3500", "ProMaster"],
  Rivian: ["R1S", "R1T"],
  Subaru: ["Ascent", "BRZ", "Crosstrek", "Forester", "Impreza", "Legacy", "Outback", "WRX"],
  Tesla: ["Model 3", "Model S", "Model X", "Model Y", "Cybertruck"],
  Toyota: ["4Runner", "Avalon", "C-HR", "Camry", "Corolla", "Highlander", "Land Cruiser", "Prius", "RAV4", "Sequoia", "Sienna", "Tacoma", "Tundra", "Venza", "Yaris"],
  Volkswagen: ["Arteon", "Atlas", "Golf", "GTI", "ID.4", "Jetta", "Passat", "Taos", "Tiguan"],
  Volvo: ["S60", "S90", "V60", "XC40", "XC60", "XC90"],
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9а-яіїє]/g, "");

export function suggest(list: string[], query: string, limit = 8): string[] {
  const q = norm(query);
  if (q.length < 2) return [];
  const starts: string[] = [];
  const contains: string[] = [];
  for (const item of list) {
    const n = norm(item);
    if (n === q) continue;
    if (n.startsWith(q)) starts.push(item);
    else if (n.includes(q)) contains.push(item);
  }
  return [...starts, ...contains].slice(0, limit);
}

export const MAKES = Object.keys(CARS);

export function modelsFor(make: string): string[] {
  const q = norm(make);
  const key = MAKES.find((m) => norm(m) === q);
  return key ? CARS[key] : [...new Set(Object.values(CARS).flat())];
}
