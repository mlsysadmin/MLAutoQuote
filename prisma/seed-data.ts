/**
 * Demo customers and the vehicles they brought in.
 *
 * Every person here is invented — the mobile numbers all sit in the fictional
 * 0917-555 block and the ID numbers are made up. The *vehicles* are real
 * nameplates from the catalogue, and their photos are fetched from Wikimedia
 * Commons at seed time, so the queue looks like real work.
 */

export type DemoVehicle = {
  make: string;
  model: string;
  variant?: string;
  year: number;
  transmission: "AUTOMATIC" | "MANUAL" | "CVT" | "DCT";
  fuelType: "GASOLINE" | "DIESEL" | "HYBRID" | "ELECTRIC" | "LPG";
  bodyType: string;
  colour: string;
  mileageKm: number;
  plate: string;
  condition: "EXCELLENT" | "GOOD" | "FAIR" | "POOR";
  accident?: boolean;
  flood?: boolean;
  warningLights?: boolean;
  airconWorking?: boolean;
  tirePct?: number;
  notes?: string;
  hasCR?: boolean;
  hasOR?: boolean;
  encumbered?: boolean;
  financing?: number;
  /** Where this submission currently sits in the queue. */
  status: "IN_REVIEW" | "OFFER_SENT" | "ACCEPTED" | "DECLINED";
  /** Days ago it was submitted. */
  daysAgo: number;
};

export type DemoCustomer = {
  name: string;
  mobile: string;
  email?: string;
  birthDate: string;
  idType:
    | "PHILSYS"
    | "DRIVERS_LICENSE"
    | "PASSPORT"
    | "UMID"
    | "SSS"
    | "POSTAL"
    | "VOTERS"
    | "PRC";
  idNumber: string;
  addressLine: string;
  barangay: string;
  city: string;
  province: string;
  branch?: string;
  vehicles: DemoVehicle[];
};

export const DEMO_CUSTOMERS: DemoCustomer[] = [
  {
    name: "Ramon Villanueva",
    mobile: "09175550101",
    email: "ramon.villanueva@example.com",
    birthDate: "1979-04-12",
    idType: "DRIVERS_LICENSE",
    idNumber: "N01-79-004512",
    addressLine: "18 Mabini Street",
    barangay: "Barangay Luz",
    city: "Cebu City",
    province: "Cebu",
    branch: "ML Colon, Cebu City",
    vehicles: [
      {
        make: "Toyota", model: "Fortuner", variant: "2.4 G 4x2 AT", year: 2018,
        transmission: "AUTOMATIC", fuelType: "DIESEL", bodyType: "SUV",
        colour: "Attitude Black", mileageKm: 112_000, plate: "NCB 2841",
        condition: "GOOD", tirePct: 55, hasCR: true, hasOR: true,
        notes: "Casa maintained with complete records. Original paint throughout.",
        status: "ACCEPTED", daysAgo: 22,
      },
      {
        make: "Toyota", model: "Vios", variant: "1.3 E CVT", year: 2021,
        transmission: "CVT", fuelType: "GASOLINE", bodyType: "SEDAN",
        colour: "Super White", mileageKm: 38_000, plate: "CAB 7719",
        condition: "EXCELLENT", tirePct: 85, hasCR: true, hasOR: true,
        notes: "Second unit — wife's car, garage kept.",
        status: "IN_REVIEW", daysAgo: 1,
      },
    ],
  },
  {
    name: "Luisa Mercado",
    mobile: "09175550102",
    email: "luisa.mercado@example.com",
    birthDate: "1988-11-03",
    idType: "PHILSYS",
    idNumber: "1234-5678-9012-3456",
    addressLine: "7 Katipunan Avenue",
    barangay: "Barangay Loyola Heights",
    city: "Quezon City",
    province: "Metro Manila",
    branch: "ML Cubao",
    vehicles: [
      {
        make: "Honda", model: "City", variant: "1.5 VX Navi CVT", year: 2020,
        transmission: "CVT", fuelType: "GASOLINE", bodyType: "SEDAN",
        colour: "Lunar Silver", mileageKm: 46_500, plate: "NDA 4417",
        condition: "EXCELLENT", tirePct: 75, hasCR: true, hasOR: true,
        notes: "Single owner, all service done at Honda Cars QC.",
        status: "OFFER_SENT", daysAgo: 3,
      },
    ],
  },
  {
    name: "Arnel Bautista",
    mobile: "09175550103",
    birthDate: "1972-06-28",
    idType: "UMID",
    idNumber: "0012-3456789-0",
    addressLine: "245 Rizal Extension",
    barangay: "Barangay Pulung Maragul",
    city: "Angeles City",
    province: "Pampanga",
    vehicles: [
      {
        make: "Mitsubishi", model: "Montero Sport", variant: "GLS 2WD AT", year: 2016,
        transmission: "AUTOMATIC", fuelType: "DIESEL", bodyType: "SUV",
        colour: "Quartz Brown", mileageKm: 148_000, plate: "ZAB 1192",
        condition: "FAIR", accident: true, warningLights: true, tirePct: 30,
        hasCR: true, hasOR: true, encumbered: true, financing: 145_000,
        notes: "Rear-ended in 2021, repaired at casa. Check engine light intermittent.",
        status: "IN_REVIEW", daysAgo: 2,
      },
    ],
  },
  {
    name: "Grace Olivares",
    mobile: "09175550104",
    email: "grace.olivares@example.com",
    birthDate: "1994-02-17",
    idType: "PASSPORT",
    idNumber: "P1234567B",
    addressLine: "Unit 12B, Avida Towers",
    barangay: "Barangay San Antonio",
    city: "Makati City",
    province: "Metro Manila",
    branch: "ML Makati Poblacion",
    vehicles: [
      {
        make: "Suzuki", model: "Jimny", variant: "GLX 4AT", year: 2021,
        transmission: "AUTOMATIC", fuelType: "GASOLINE", bodyType: "SUV",
        colour: "Kinetic Yellow", mileageKm: 24_000, plate: "CAA 9087",
        condition: "EXCELLENT", tirePct: 90, hasCR: true, hasOR: true,
        notes: "Weekend car only. Never off-roaded.",
        status: "ACCEPTED", daysAgo: 14,
      },
    ],
  },
  {
    name: "Teodoro Lim",
    mobile: "09175550105",
    birthDate: "1965-09-05",
    idType: "SSS",
    idNumber: "03-1234567-8",
    addressLine: "88 Osmeña Boulevard",
    barangay: "Barangay Sambag II",
    city: "Cebu City",
    province: "Cebu",
    vehicles: [
      {
        make: "Isuzu", model: "Crosswind", variant: "XUV MT", year: 2015,
        transmission: "MANUAL", fuelType: "DIESEL", bodyType: "MPV",
        colour: "Silver Metallic", mileageKm: 192_000, plate: "GAB 4410",
        condition: "FAIR", tirePct: 40, hasCR: true, hasOR: false,
        notes: "Used as a family service vehicle. Engine recently overhauled.",
        status: "DECLINED", daysAgo: 30,
      },
    ],
  },
  {
    name: "Beatriz Fernandez",
    mobile: "09175550106",
    email: "bea.fernandez@example.com",
    birthDate: "1991-07-22",
    idType: "DRIVERS_LICENSE",
    idNumber: "D12-91-887654",
    addressLine: "33 Lacson Street",
    barangay: "Barangay Villamonte",
    city: "Bacolod City",
    province: "Negros Occidental",
    vehicles: [
      {
        make: "Mitsubishi", model: "Xpander", variant: "GLS AT", year: 2019,
        transmission: "AUTOMATIC", fuelType: "GASOLINE", bodyType: "MPV",
        colour: "Sterling Silver", mileageKm: 71_000, plate: "NEA 3362",
        condition: "GOOD", tirePct: 60, hasCR: true, hasOR: true,
        status: "OFFER_SENT", daysAgo: 4,
      },
    ],
  },
  {
    name: "Noel Dizon",
    mobile: "09175550107",
    birthDate: "1983-12-09",
    idType: "VOTERS",
    idNumber: "4521-0083A-D1234",
    addressLine: "501 Quirino Highway",
    barangay: "Barangay Novaliches",
    city: "Quezon City",
    province: "Metro Manila",
    vehicles: [
      {
        make: "Ford", model: "Ranger", variant: "XLT 4x2 AT", year: 2019,
        transmission: "AUTOMATIC", fuelType: "DIESEL", bodyType: "PICKUP",
        colour: "Lightning Blue", mileageKm: 98_000, plate: "NCJ 8830",
        condition: "GOOD", tirePct: 50, hasCR: true, hasOR: true,
        notes: "Used for a small hauling business. Bed liner installed.",
        status: "IN_REVIEW", daysAgo: 1,
      },
    ],
  },
  {
    name: "Cristina Aquino",
    mobile: "09175550108",
    email: "cristina.aquino@example.com",
    birthDate: "1996-05-30",
    idType: "PRC",
    idNumber: "0123456",
    addressLine: "14 Session Road",
    barangay: "Barangay Kayang",
    city: "Baguio City",
    province: "Benguet",
    vehicles: [
      {
        make: "Toyota", model: "Wigo", variant: "1.0 G AT", year: 2022,
        transmission: "AUTOMATIC", fuelType: "GASOLINE", bodyType: "HATCHBACK",
        colour: "Orange Metallic", mileageKm: 19_500, plate: "CAD 1155",
        condition: "EXCELLENT", tirePct: 88, hasCR: true, hasOR: true,
        status: "OFFER_SENT", daysAgo: 2,
      },
    ],
  },
  {
    name: "Eduardo Panganiban",
    mobile: "09175550109",
    birthDate: "1977-03-14",
    idType: "DRIVERS_LICENSE",
    idNumber: "N02-77-331245",
    addressLine: "9 Diversion Road",
    barangay: "Barangay Alangilan",
    city: "Batangas City",
    province: "Batangas",
    vehicles: [
      {
        make: "Toyota", model: "Hilux", variant: "2.4 G 4x2 AT", year: 2017,
        transmission: "AUTOMATIC", fuelType: "DIESEL", bodyType: "PICKUP",
        colour: "White Pearl", mileageKm: 165_000, plate: "ABC 7742",
        condition: "FAIR", tirePct: 35, hasCR: true, hasOR: true,
        notes: "Farm use. Body has minor dents on the bed.",
        status: "IN_REVIEW", daysAgo: 5,
      },
      {
        make: "Mitsubishi", model: "L300", variant: "FB Exceed", year: 2020,
        transmission: "MANUAL", fuelType: "DIESEL", bodyType: "VAN",
        colour: "White", mileageKm: 88_000, plate: "CAB 2201",
        condition: "GOOD", tirePct: 65, hasCR: true, hasOR: true,
        notes: "Delivery van for the same business.",
        status: "ACCEPTED", daysAgo: 40,
      },
    ],
  },
  {
    name: "Marissa Santos",
    mobile: "09175550110",
    email: "marissa.santos@example.com",
    birthDate: "1986-08-19",
    idType: "PHILSYS",
    idNumber: "9876-5432-1098-7654",
    addressLine: "22 Maginhawa Street",
    barangay: "Barangay Teachers Village",
    city: "Quezon City",
    province: "Metro Manila",
    vehicles: [
      {
        make: "Honda", model: "CR-V", variant: "2.0 S CVT", year: 2018,
        transmission: "CVT", fuelType: "GASOLINE", bodyType: "SUV",
        colour: "Modern Steel", mileageKm: 84_000, plate: "NBD 5519",
        condition: "GOOD", tirePct: 55, hasCR: true, hasOR: true,
        status: "IN_REVIEW", daysAgo: 3,
      },
    ],
  },
  {
    name: "Joselito Ramos",
    mobile: "09175550111",
    birthDate: "1970-01-26",
    idType: "POSTAL",
    idNumber: "PID-2019-554210",
    addressLine: "77 Magsaysay Avenue",
    barangay: "Barangay Carmen",
    city: "Cagayan de Oro",
    province: "Misamis Oriental",
    vehicles: [
      {
        make: "Nissan", model: "Navara", variant: "EL Calibre 4x2 AT", year: 2019,
        transmission: "AUTOMATIC", fuelType: "DIESEL", bodyType: "PICKUP",
        colour: "Twilight Grey", mileageKm: 102_000, plate: "NDB 9921",
        condition: "GOOD", tirePct: 45, hasCR: true, hasOR: true,
        status: "OFFER_SENT", daysAgo: 6,
      },
    ],
  },
  {
    name: "Angelica Torres",
    mobile: "09175550112",
    email: "angelica.torres@example.com",
    birthDate: "1998-10-11",
    idType: "DRIVERS_LICENSE",
    idNumber: "C03-98-110293",
    addressLine: "5 Real Street",
    barangay: "Barangay Poblacion",
    city: "Tagbilaran City",
    province: "Bohol",
    vehicles: [
      {
        make: "Suzuki", model: "Ertiga", variant: "GL AT", year: 2020,
        transmission: "AUTOMATIC", fuelType: "GASOLINE", bodyType: "MPV",
        colour: "Pearl Red", mileageKm: 52_000, plate: "CAA 4478",
        condition: "GOOD", tirePct: 70, hasCR: true, hasOR: true,
        status: "IN_REVIEW", daysAgo: 2,
      },
    ],
  },
  {
    name: "Rodrigo Castillo",
    mobile: "09175550113",
    birthDate: "1968-04-02",
    idType: "SSS",
    idNumber: "07-9876543-2",
    addressLine: "140 Burgos Street",
    barangay: "Barangay Zone IV",
    city: "Dagupan City",
    province: "Pangasinan",
    vehicles: [
      {
        make: "Toyota", model: "Innova", variant: "2.8 E AT", year: 2016,
        transmission: "AUTOMATIC", fuelType: "DIESEL", bodyType: "MPV",
        colour: "Silver Metallic", mileageKm: 178_000, plate: "AAB 3390",
        condition: "FAIR", tirePct: 35, airconWorking: false, hasCR: true, hasOR: true,
        notes: "Aircon compressor needs replacing. Otherwise runs well.",
        status: "DECLINED", daysAgo: 18,
      },
    ],
  },
  {
    name: "Imelda Navarro",
    mobile: "09175550114",
    email: "imelda.navarro@example.com",
    birthDate: "1981-09-23",
    idType: "UMID",
    idNumber: "0098-7654321-1",
    addressLine: "63 Jaro Plaza",
    barangay: "Barangay Jaro",
    city: "Iloilo City",
    province: "Iloilo",
    vehicles: [
      {
        make: "Hyundai", model: "Accent", variant: "1.4 GL AT", year: 2019,
        transmission: "AUTOMATIC", fuelType: "GASOLINE", bodyType: "SEDAN",
        colour: "Polar White", mileageKm: 64_000, plate: "GAC 1177",
        condition: "GOOD", tirePct: 60, hasCR: true, hasOR: true,
        status: "ACCEPTED", daysAgo: 9,
      },
    ],
  },
  {
    name: "Benjamin Yu",
    mobile: "09175550115",
    birthDate: "1975-11-30",
    idType: "PASSPORT",
    idNumber: "P7654321A",
    addressLine: "301 Banilad Road",
    barangay: "Barangay Banilad",
    city: "Mandaue City",
    province: "Cebu",
    branch: "ML Mandaue",
    vehicles: [
      {
        make: "BMW", model: "3 Series", variant: "320d Sport Line", year: 2017,
        transmission: "AUTOMATIC", fuelType: "DIESEL", bodyType: "SEDAN",
        colour: "Mineral Grey", mileageKm: 96_000, plate: "NBB 1010",
        condition: "GOOD", tirePct: 55, hasCR: true, hasOR: true,
        notes: "Serviced at the dealer. Run-flat tyres replaced last year.",
        status: "IN_REVIEW", daysAgo: 4,
      },
    ],
  },
  {
    name: "Perla Gonzales",
    mobile: "09175550116",
    email: "perla.gonzales@example.com",
    birthDate: "1990-06-08",
    idType: "PHILSYS",
    idNumber: "5555-4444-3333-2222",
    addressLine: "12 Alabang-Zapote Road",
    barangay: "Barangay Talon Dos",
    city: "Las Piñas",
    province: "Metro Manila",
    vehicles: [
      {
        make: "Mazda", model: "Mazda3", variant: "2.0 SkyActiv Speed", year: 2018,
        transmission: "AUTOMATIC", fuelType: "GASOLINE", bodyType: "SEDAN",
        colour: "Soul Red", mileageKm: 77_000, plate: "NBC 4422",
        condition: "GOOD", tirePct: 50, hasCR: true, hasOR: true,
        status: "OFFER_SENT", daysAgo: 5,
      },
    ],
  },
  {
    name: "Fernando Agustin",
    mobile: "09175550117",
    birthDate: "1962-02-05",
    idType: "DRIVERS_LICENSE",
    idNumber: "A01-62-554433",
    addressLine: "88 National Highway",
    barangay: "Barangay San Jose",
    city: "General Santos",
    province: "South Cotabato",
    vehicles: [
      {
        make: "Isuzu", model: "D-Max", variant: "LS 4x2 AT", year: 2020,
        transmission: "AUTOMATIC", fuelType: "DIESEL", bodyType: "PICKUP",
        colour: "Obsidian Grey", mileageKm: 81_000, plate: "ZAC 7781",
        condition: "GOOD", tirePct: 65, hasCR: true, hasOR: true,
        status: "IN_REVIEW", daysAgo: 7,
      },
    ],
  },
  {
    name: "Sheila Rivera",
    mobile: "09175550118",
    email: "sheila.rivera@example.com",
    birthDate: "1993-03-27",
    idType: "VOTERS",
    idNumber: "1122-0093B-R5566",
    addressLine: "4 Gov. Pack Road",
    barangay: "Barangay Lourdes",
    city: "Baguio City",
    province: "Benguet",
    vehicles: [
      {
        make: "Kia", model: "Picanto", variant: "1.2 EX AT", year: 2019,
        transmission: "AUTOMATIC", fuelType: "GASOLINE", bodyType: "HATCHBACK",
        colour: "Titanium Silver", mileageKm: 58_000, plate: "CAB 3344",
        condition: "GOOD", tirePct: 60, hasCR: true, hasOR: true,
        status: "IN_REVIEW", daysAgo: 1,
      },
    ],
  },
  {
    name: "Alfredo Macapagal",
    mobile: "09175550119",
    birthDate: "1974-07-16",
    idType: "SSS",
    idNumber: "02-4455667-8",
    addressLine: "55 MacArthur Highway",
    barangay: "Barangay Dolores",
    city: "San Fernando",
    province: "Pampanga",
    vehicles: [
      {
        make: "Ford", model: "Everest", variant: "Titanium 4x2 AT", year: 2018,
        transmission: "AUTOMATIC", fuelType: "DIESEL", bodyType: "SUV",
        colour: "Diffused Silver", mileageKm: 121_000, plate: "NBD 6622",
        condition: "GOOD", tirePct: 45, hasCR: true, hasOR: true,
        status: "ACCEPTED", daysAgo: 26,
      },
    ],
  },
  {
    name: "Carmela Duterte",
    mobile: "09175550120",
    email: "carmela.duterte@example.com",
    birthDate: "1987-12-01",
    idType: "DRIVERS_LICENSE",
    idNumber: "D11-87-776655",
    addressLine: "19 Quimpo Boulevard",
    barangay: "Barangay Matina",
    city: "Davao City",
    province: "Davao del Sur",
    branch: "ML Davao Downtown",
    vehicles: [
      {
        make: "Toyota", model: "Avanza", variant: "1.5 G AT", year: 2017,
        transmission: "AUTOMATIC", fuelType: "GASOLINE", bodyType: "MPV",
        colour: "Grey Metallic", mileageKm: 134_000, plate: "LAB 9933",
        condition: "FAIR", tirePct: 40, hasCR: true, hasOR: true,
        notes: "Family car, used daily for school runs.",
        status: "OFFER_SENT", daysAgo: 8,
      },
    ],
  },
];
