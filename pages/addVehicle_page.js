// pages/addVehicle_page.jsx
import { useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";

import { auth, db, storage } from "../lib/firebase";
import { doc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

// 2. STRUCTURED DATA FOR MAKE / MODEL
// Déplace la déclaration de makesByType et modelsByMake AVANT toute utilisation dans le composant
const makesByType = {
  car: [
    "Toyota",
    "Honda",
    "Ford",
    "Chevrolet",
    "Nissan",
    "Volkswagen",
    "Hyundai",
    "Kia",
    "Subaru",
    "Mazda",
    "Dodge",
    "Chrysler",
    "Buick",
    "GMC",
    "Jeep",
    "Land Rover",
    "Lexus",
    "Mercedes-Benz",
    "BMW",
    "Audi",
    "Porsche",
    "Volkswagen",
    "Volvo",
  ],
  motorcycle: [
    "Harley-Davidson",
    "Yamaha",
    "Honda",
    "Kawasaki",
    "Suzuki",
    "Ducati",
    "BMW",
    "Triumph",
    "MV Agusta",
    "KTM",
    "Husqvarna",
    "Indian",
    "Royal Enfield",
    "Buell",
    "Moto Guzzi",
    "Aprilia",
    "Norton",
    "Cagiva",
    "Benelli",
    "Dnepr",
  ],
};

const modelsByMake = {
  Toyota: [
    "Camry",
    "Corolla",
    "Prius",
    "RAV4",
    "Highlander",
    "Tacoma",
    "Tundra",
    "Sienna",
    "Avalon",
    "Land Cruiser",
    "4Runner",
    "Sequoia",
    "Venza",
    "Supra",
    "Mirai",
    "Yaris",
    "Corolla Hatchback",
    "Camry Hybrid",
    "RAV4 Hybrid",
    "Highlander Hybrid",
  ],
  Honda: [
    "Civic",
    "Accord",
    "CR-V",
    "Pilot",
    "Fit",
    "HR-V",
    "Ridgeline",
    "Insight",
    "Civic Type R",
    "Accord Hybrid",
    "CR-V Hybrid",
    "Pilot Elite",
    "Passport",
    "S2000",
    "NSX",
    "Element",
    "Prelude",
    "CR-Z",
    "Insight Plug-In",
    "Civic Si",
  ],
  Ford: [
    "F-150",
    "Mustang",
    "Explorer",
    "Escape",
    "Fusion",
    "Edge",
    "Expedition",
    "Bronco",
    "Ranger",
    "Taurus",
    "Focus",
    "Fiesta",
    "Lincoln Navigator",
    "MKT",
    "MKZ",
    "Continental",
    "EcoSport",
    "Flex",
    "Fusion Hybrid",
    "Mustang Mach-E",
  ],
  Chevrolet: [
    "Silverado",
    "Malibu",
    "Equinox",
    "Impala",
    "Camaro",
    "Traverse",
    "Tahoe",
    "Suburban",
    "Colorado",
    "Sonic",
    "Cruze",
    "Volt",
    "Bolt EV",
    "Corvette",
    "Blazer",
    "Trailblazer",
    "Express",
    "City Express",
    "Astro",
    "HHR",
  ],
  Nissan: [
    "Altima",
    "Maxima",
    "Sentra",
    "370Z",
    "GT-R",
    "Rogue",
    "Murano",
    "Pathfinder",
    "Armada",
    "Titan",
    "Frontier",
    "Juke",
    "Rogue Sport",
    "NV200",
    "Leaf",
    "Kicks",
    "Murano CrossCabriolet",
    "Xterra",
    "Datsun",
    "Skyline",
  ],
  Volkswagen: [
    "Golf",
    "Jetta",
    "Passat",
    "Tiguan",
    "Atlas",
    "Beetle",
    "CC",
    "Eos",
    "GTI",
    "R32",
    "Touareg",
    "Phaeton",
    "Scirocco",
    "T-Roc",
    "ID.4",
    "Arteon",
    "Passat CC",
    "Golf R",
    "Jetta GLI",
    "Tiguan X",
  ],
  Hyundai: [
    "Elantra",
    "Sonata",
    "Tucson",
    "Santa Fe",
    "Kona",
    "Palisade",
    "Veloster",
    "Genesis",
    "Azera",
    "Equus",
    "Ioniq",
    "Tucson Fuel Cell",
    "Sonata Hybrid",
    "Elantra GT",
    "Santa Cruz",
    "Kona Electric",
    "Palisade Calligraphy",
    "Veloster N",
    "Genesis G70",
    "Ioniq 5",
  ],
  Kia: [
    "Forte",
    "Optima",
    "Sportage",
    "Sorento",
    "Telluride",
    "Stinger",
    "Seltos",
    "K900",
    "Cadenza",
    "Soul",
    "Niro",
    "Rio",
    "Sedona",
    "Carnival",
    "EV6",
    "Seltos X-Line",
    "Sportage Hybrid",
    "Sorento Hybrid",
    "Telluride X-Pro",
    "Stinger GT2",
  ],
  Subaru: [
    "Impreza",
    "Crosstrek",
    "Forester",
    "Outback",
    "Legacy",
    "WRX",
    "BRZ",
    "Ascent",
    "SVX",
    "Baja",
    "Tribeca",
    "Loyale",
    "Justy",
    "Alcyone",
    "Forester XT",
    "Impreza WRX STI",
    "Crosstrek Hybrid",
    "Outback Wilderness",
    "Legacy GT",
    "BRZ tS",
  ],
  Mazda: [
    "Mazda3",
    "Mazda6",
    "CX-3",
    "CX-30",
    "CX-5",
    "CX-9",
    "MX-5 Miata",
    "RX-8",
    "Tribute",
    "Millenia",
    "626",
    "929",
    "Cosmo",
    "Demio",
    "Axela",
    "Atenza",
    "Roadster",
    "BT-50",
    "Mazda2",
    "Mazda5",
  ],
  Dodge: [
    "Charger",
    "Challenger",
    "Durango",
    "Journey",
    "Grand Caravan",
    "Dakota",
    "Ram 1500",
    "Ram 2500",
    "Ram 3500",
    "Sprinter",
    "Viper",
    "Magnum",
    "Neon",
    "Intrepid",
    "Stratus",
    "Avenger",
    "Caliber",
    "Dart",
    "Journey Crossroad",
    "Challenger R/T",
  ],
  Chrysler: [
    "300",
    "Pacifica",
    "Voyager",
    "Aspen",
    "Saratoga",
    "New Yorker",
    "Imperial",
    "Cordoba",
    "Dodge Monaco",
    "Prowler",
    "Crossfire",
    "Sebring",
    "Stratus",
    "Chrysler 200",
    "Chrysler 300M",
    "Chrysler Aspen",
    "Chrysler Pacifica Hybrid",
    "Chrysler Voyager Hybrid",
    "Chrysler 300C",
    "Chrysler New Yorker",
  ],
  Buick: [
    "Enclave",
    "Encore",
    "Envision",
    "LaCrosse",
    "Regal",
    "Verano",
    "Lucerne",
    "Rainier",
    "Terraza",
    "Rendezvous",
    "Buick 100",
    "Buick Electra",
    "Buick LeSabre",
    "Buick Park Avenue",
    "Buick Skylark",
    "Buick Century",
    "Buick Regal GS",
    "Buick Envision Avenir",
    "Buick LaCrosse Hybrid",
    "Buick Encore GX",
  ],
  GMC: [
    "Sierra 1500",
    "Sierra 2500HD",
    "Sierra 3500HD",
    "Canyon",
    "Acadia",
    "Terrain",
    "Yukon",
    "Yukon XL",
    "Envoy",
    "Jimmy",
    "Syclone",
    "Typhoon",
    "GMC 1000",
    "GMC 1500",
    "GMC 2500",
    "GMC 3500",
    "GMC Canyon AT4",
    "GMC Sierra Denali",
    "GMC Terrain Denali",
    "GMC Acadia Denali",
  ],
  Jeep: [
    "Wrangler",
    "Cherokee",
    "Grand Cherokee",
    "Compass",
    "Renegade",
    "Gladiator",
    "Liberty",
    "Patriot",
    "Commander",
    "Wagoneer",
    "Grand Wagoneer",
    "Jeepster",
    "CJ",
    "YJ",
    "TJ",
    "JK",
    "JL",
    "XJ",
    "ZJ",
    "WJ",
    "WK",
  ],
  "Land Rover": [
    "Range Rover",
    "Range Rover Sport",
    "Range Rover Evoque",
    "Range Rover Velar",
    "Discovery",
    "Discovery Sport",
    "Defender",
    "Freelander",
    "LR2",
    "LR3",
    "LR4",
  ],
  "Mercedes-Benz": [
    "A-Class",
    "B-Class",
    "C-Class",
    "E-Class",
    "S-Class",
    "CLA",
    "CLS",
    "GLA",
    "GLB",
    "GLC",
    "GLE",
    "GLS",
    "G-Class",
    "SL",
    "SLC",
    "AMG A 35",
    "AMG C 43",
    "AMG E 63",
    "AMG GT",
    "AMG G 63",
    "AMG GLE 63",
    "EQC",
    "EQE",
    "EQS",
    "GLE Coupe",
    "CLS Shooting Brake",
  ],
  BMW: [
    "3 Series",
    "5 Series",
    "7 Series",
    "X1",
    "X3",
    "X5",
    "X7",
    "M3",
    "M5",
    "M8",
    "Z3",
    "Z4",
    "Z8",
    "i3",
    "i4",
    "i8",
    "X4",
    "X6",
    "X2",
    "M2",
    "M6",
  ],
  Audi: [
    "A3",
    "A4",
    "A6",
    "A8",
    "Q3",
    "Q5",
    "Q7",
    "Q8",
    "TT",
    "R8",
    "S3",
    "S4",
    "S6",
    "S8",
    "SQ5",
    "SQ7",
    "RS3",
    "RS4",
    "RS5",
    "RS7",
  ],
  Porsche: [
    "911",
    "Cayenne",
    "Macan",
    "Panamera",
    "Taycan",
    "Boxster",
    "Cayman",
    "918 Spyder",
    "Carrera GT",
    "Porsche 356",
    "Porsche 914",
    "Porsche 924",
    "Porsche 928",
    "Porsche 944",
    "Porsche 968",
    "Porsche 991",
    "Porsche 992",
    "Porsche 718",
    "Porsche Macan S",
    "Porsche Cayenne Turbo",
  ],
  Volvo: [
    "S60",
    "S90",
    "V60",
    "V90",
    "XC40",
    "XC60",
    "XC90",
    "C30",
    "C70",
    "V40",
    "V50",
    "S40",
    "S80",
    "S70",
    "V70",
    "XC70",
    "V90 Cross Country",
    "S60 Polestar",
    "XC60 Recharge",
    "S90 Ambience",
  ],
  // ====================
  //  Motos - Honda
  // ====================
  Honda: [
    // Roadsters et Neo Sports Café
    "CB125R",
    "CB300R",
    "CB500F",
    "CB650R",
    "CB750 Hornet",
    "CB1000R",
    "CB1100",
    "CB1300",
    // Sportives & supersport
    "CBR125R",
    "CBR150R",
    "CBR250R",
    "CBR300R",
    "CBR400R",
    "CBR500R",
    "CBR600F",
    "CBR600RR",
    "CBR650R",
    "CBR900RR Fireblade",
    "CBR929RR Fireblade",
    "CBR954RR Fireblade",
    "CBR1000RR Fireblade",
    "CBR1000RR-R Fireblade SP",
    // Trail/Adventure
    "CRF1100L Africa Twin",
    "CRF1000L Africa Twin",
    "Africa Twin",
    "Transalp 600V",
    "Transalp 700",
    "XL750 Transalp",
    "NX650 Dominator",
    "XR150L",
    "XR250",
    "XR400",
    "CRF250L",
    "CRF300L",
    "CRF450L",
    "CRF450R",
    // Touring
    "NC700X",
    "NC750X",
    "NT1100",
    "VFR800",
    "VFR1200F",
    "Deauville",
    "Gold Wing",
    // Custom/Cruiser
    "Rebel 300",
    "Rebel 500",
    "Rebel 1100",
    "Shadow 125",
    "Shadow 600",
    "Shadow 750",
    "Shadow 1100",
    "VT750S",
    // Utilitaires & classiques
    "Wave",
    "Dax 125",
    "Monkey 125",
    "Super Cub C125",
    "Forza 125",
    "Forza 350",
    "PCX 125",
    "SH125i",
    "SH150i",
    "Integra 750",
    // Légendes historiques
    "CB750 Four",
    "CB500 Four",
    "CBX1000",
    "VFR750",
    "VTR1000 SP1",
    "VTR1000 SP2",
    "NSR250R",
    "RC30",
    "RC45",
  ],
  // ====================
  //  Motos - Yamaha
  // ====================
  Yamaha: [
    // Supersport
    "YZF-R1",
    "YZF-R1M",
    "YZF-R3",
    "YZF-R6",
    "YZF-R7",
    "YZF-R9",
    // Naked/MT/FZ
    "MT-03",
    "MT-07",
    "MT-09",
    "MT-09 SP",
    "MT-10",
    "MT-10 SP",
    "FZ-07",
    "FZ-09",
    // Neo-Retro/Heritage
    "XSR700",
    "XSR900",
    "SR400",
    "Vmax",
    // Adventure/Trail
    "Tenere 700",
    "Super Ténéré ES",
    "WR250R",
    "WR250X",
    "XT250",
    "TW200",
    // Touring/Sport Touring
    "FJR1300",
    "FJR1300ES",
    "Tracer 700",
    "Tracer 900",
    "Tracer 9 GT",
    "Tracer 900 GT",
    "FJ-09",
    // Custom/Cruiser
    "Bolt",
    "Bolt R-Spec",
    "Star Venture",
    "Star Eluder",
    "V Star 250",
    "V Star 650",
    "V Star 950",
    "V Star 1300",
    "V Star 1300 Deluxe",
    "Stryker",
    "Raider",
    "Roadliner",
    "Stratoliner",
    "Road Star",
    // Dual-Sport/Enduro
    "WR450F",
    "WR250F",
    "YZ450F",
    "YZ250F",
    "YZ250X",
    "YZ125X",
    "YZ125",
    // Classic/Autres
    "XV250",
    "SRV250",
    "XJ6",
    "FZ6R",
    "FZ1",
    "FZ8",
    "FJR1300A",
  ],
  // ====================
  //  Motos - Suzuki
  // ====================
  Suzuki: [
    "GSX-R600",
    "GSX-R750",
    "GSX-R1000",
    "Hayabusa",
    "SV650",
    "GSX-S750",
    "GSX-S1000",
    "V-Strom 650",
    "V-Strom 1000",
    "DR-Z400",
    "DR650",
    "Boulevard M109R",
    "Boulevard C50",
    "Katana",
    // Ajouts :
    "GSX250R",
    "GSX-S125",
    "SV1000",
    "Bandit 600",
    "Bandit 1200",
    "GSX650F",
    "GS500",
    "GSR750",
    "GSR600",
    "GSX1400",
    "Inazuma 250",
    "Gladius 650",
    "Burgman 400",
    "Burgman 650",
    "RM-Z250",
    "RM-Z450",
    "Intruder M800",
    "Intruder C800",
    "Marauder 125",
    "Address 125",
    "GN125",
    "TL1000R",
    "TL1000S",
  ],
  // ====================
  //  Motos - Kawasaki
  // ====================
  Kawasaki: [
    // Supersport / Sport
    "Ninja 250",
    "Ninja 300",
    "Ninja 400",
    "Ninja 500",
    "Ninja 650",
    "Ninja 1000SX",
    "Ninja ZX-4RR",
    "Ninja ZX-6R",
    "Ninja ZX-10R",
    "Ninja ZX-14R",
    "Ninja H2",
    "Ninja H2 SX",
    "Ninja H2R",
    "Ninja ZX-10RR",
    // Roadster / Z
    "Z125 PRO",
    "Z400",
    "Z500",
    "Z650",
    "Z650RS",
    "Z900",
    "Z900RS",
    "Z900RS Cafe",
    "Z1000",
    "Z1000R",
    "Z H2",
    // Trail / Adventure / Touring
    "Versys-X 300",
    "Versys 300",
    "Versys 650",
    "Versys 1000",
    "Versys 1000 SE LT+",
    "KLR650",
    "KLR650 Adventure",
    // Custom / Cruiser
    "Vulcan S",
    "Vulcan 650",
    "Vulcan 900 Classic",
    "Vulcan 900 Custom",
    "Vulcan 1700 Vaquero",
    "Vulcan 1700 Voyager",
    "Vulcan 1700 Nomad",
    "Vulcan 1700 Classic",
    "Vulcan 1700 Mean Streak",
    "Vulcan 2000",
    // Dirt / Dual Sport / Enduro
    "KLR650 S",
    "KLX230",
    "KLX230SM",
    "KLX250",
    "KLX300",
    "KLX300SM",
    "KLX300R",
    "KLX140R",
    "KX250",
    "KX250X",
    "KX450",
    "KX450F",
    "KX450X",
    "KX112",
    // Classic/Retro
    "W800",
    "W800 Cafe",
    // Touring (Big)
    "Concours 14",
    "Concours 14 ABS",
  ],

  // ====================
  //  Motos - Ducati
  // ====================
  Ducati: [
    // Supersport / Sport
    "Panigale V2",
    "Panigale V4",
    "Panigale V4 S",
    "Panigale V4 SP2",
    "Panigale V4 R",
    "SuperSport 950",
    "SuperSport 950 S",
    // Streetfighter / Roadster
    "Streetfighter V2",
    "Streetfighter V4",
    "Streetfighter V4 S",
    "Streetfighter V4 SP",
    // Monster
    "Monster 797",
    "Monster 821",
    "Monster 937",
    "Monster Plus",
    "Monster 1200",
    "Monster 1200 S",
    "Monster 1200 R",
    // Hypermotard
    "Hypermotard 950",
    "Hypermotard 950 SP",
    "Hypermotard 950 RVE",
    // Diavel & XDiavel
    "Diavel",
    "Diavel 1260",
    "Diavel 1260 S",
    "Diavel V4",
    "XDiavel",
    "XDiavel S",
    "XDiavel Dark",
    // Multistrada (Adventure/Touring)
    "Multistrada 950",
    "Multistrada 950 S",
    "Multistrada 1260",
    "Multistrada 1260 S",
    "Multistrada 1260 Enduro",
    "Multistrada V2",
    "Multistrada V2 S",
    "Multistrada V4",
    "Multistrada V4 S",
    "Multistrada V4 Rally",
    "Multistrada V4 Pikes Peak",
    // Scrambler (classic & néo-rétro)
    "Scrambler Icon",
    "Scrambler Icon Dark",
    "Scrambler Full Throttle",
    "Scrambler Nightshift",
    "Scrambler Urban Motard",
    "Scrambler Desert Sled",
    "Scrambler Café Racer",
    "Scrambler Mach 2.0",
    "Scrambler 1100",
    "Scrambler 1100 Sport",
    "Scrambler 1100 Special",
    "Scrambler 1100 Sport PRO",
    "Scrambler 1100 Dark PRO",
    // Sport Classic / Collector (occasion/US)
    "Sport 1000",
    "Paul Smart 1000 LE",
    // Autres / historiques récents
    "Superleggera V4",
    "1199 Panigale",
    "1299 Panigale",
    "848 Evo",
    "1098",
    "1198",
  ],

  // ====================
  //  Motos - BMW Motorrad
  // ====================
  "BMW Motorrad": [
    // Sport
    "S1000RR",
    "M1000RR",
    "S1000R",
    "M1000R",
    "S1000XR",
    // Roadster / Heritage
    "R1250R",
    "R nineT",
    "R nineT Pure",
    "R nineT Scrambler",
    "R nineT Urban G/S",
    "R nineT Racer",
    "R18",
    "R18 Classic",
    "R18 B",
    "R18 Transcontinental",
    // Adventure / Trail
    "R1250GS",
    "R1250GS Adventure",
    "F850GS",
    "F850GS Adventure",
    "F750GS",
    "F900GS",
    "F900GS Adventure",
    "G310GS",
    // Touring / GT
    "R1250RT",
    "K1600GT",
    "K1600GTL",
    "K1600B",
    "K1600 Grand America",
    // Roadster mid-size
    "F900R",
    "F900XR",
    // Naked/Compact
    "G310R",
    // Anciens/collector récents (populaires US/EU)
    "F800GS",
    "F800GT",
    "F800R",
    "F700GS",
    "F650GS",
    "C400X",
    "C400GT",
    "C650GT",
    "C650 Sport",
    // Scooters
    "CE 04", // 100% électrique, tendance actuelle !
  ],
  // ====================
  //  Motos - Harley-Davidson
  // ====================
  "Harley-Davidson": [
    // Sportster
    "Sportster 883",
    "Sportster 1200",
    "Iron 883",
    "Iron 1200",
    "Forty-Eight",
    "Forty-Eight Special",
    "Roadster",
    "Seventy-Two",
    "SuperLow",
    // Street
    "Street 500",
    "Street 750",
    "Street Rod",
    // Softail
    "Street Bob",
    "Softail Standard",
    "Low Rider S",
    "Low Rider ST",
    "Breakout",
    "Fat Bob",
    "Fat Boy",
    "Deluxe",
    "Heritage Classic",
    "Slim",
    // Touring
    "Road King",
    "Road King Special",
    "Road Glide",
    "Road Glide Special",
    "Road Glide Limited",
    "Road Glide ST",
    "Electra Glide",
    "Electra Glide Standard",
    "Electra Glide Ultra Classic",
    "Ultra Limited",
    "Ultra Limited Low",
    "Street Glide",
    "Street Glide Special",
    "Street Glide ST",
    // Trike
    "Tri Glide Ultra",
    "Freewheeler",
    // Adventure
    "Pan America 1250",
    "Pan America 1250 Special",
    // CVO (Custom Vehicle Operations)
    "CVO Road Glide",
    "CVO Street Glide",
    "CVO Tri Glide",
    "CVO Limited",
    // Autres
    "Nightster",
    "Sportster S",
    "LiveWire", // Électrique !
  ],

  // ====================
  //  Motos - KTM
  // ====================
  KTM: [
    // Naked - DUKE
    "Duke 125",
    "Duke 200",
    "Duke 250",
    "Duke 390",
    "Duke 690",
    "Duke 790",
    "Duke 890",
    "Duke 990",
    "Duke 1090",
    "Duke 1290",
    // Super Duke
    "1290 Super Duke R",
    "1290 Super Duke GT",
    // RC - Supersport
    "RC 125",
    "RC 200",
    "RC 250",
    "RC 390",
    "RC 8C",
    // Adventure / Travel
    "Adventure 250",
    "Adventure 390",
    "Adventure 690",
    "Adventure 790",
    "Adventure 890",
    "Adventure 990",
    "Adventure 1050",
    "Adventure 1090",
    "Adventure 1190",
    "Adventure 1290",
    // Enduro / EXC
    "EXC 125",
    "EXC 250",
    "EXC 300",
    "EXC 350",
    "EXC 450",
    "EXC 500",
    // Freeride
    "Freeride 250",
    "Freeride E-XC",
    // Motocross SX/SXF
    "250 SX",
    "250 SX-F",
    "350 SX-F",
    "450 SX-F",
    // Supermoto
    "SMC 690",
    // SMR 450",
    // Autres
    "690 Enduro R",
    "690 SMC R",
  ],

  // ====================
  //  Motos - Triumph
  // ====================
  Triumph: [
    // Modern Classics
    "Bonneville T100",
    "Bonneville T120",
    "Bonneville T140",
    "Bonneville Bobber",
    "Bonneville Speedmaster",
    "Thruxton R",
    "Thruxton RS",
    "Street Twin",
    "Speed Twin",
    "Street Cup",
    "Street Scrambler",
    "Scrambler 900",
    "Scrambler 1200 XC",
    "Scrambler 1200 XE",

    // Roadsters
    "Trident 660",
    "Street Triple 765",
    "Street Triple RS",
    "Street Triple R",
    "Speed Triple 1050",
    "Speed Triple 1200 RS",
    "Speed Triple 1200 RR",

    // Adventure/Touring
    "Tiger 660 Sport",
    "Tiger 800",
    "Tiger 850 Sport",
    "Tiger 900",
    "Tiger 900 GT",
    "Tiger 900 Rally",
    "Tiger 1200",
    "Tiger 1200 GT",
    "Tiger 1200 Rally",

    // Sport/Supersport
    "Daytona 675",
    "Daytona Moto2 765",
    "Daytona 955i",
    "Daytona 1200",

    // Rocket
    "Rocket 3 R",
    "Rocket 3 GT",
  ],

  // ====================
  //  Motos - Aprilia
  // ====================
  Aprilia: [
    "RS 250",
    "AF1 125",
    "RS 125",
    "RS 50",
    "Pegaso 650",
    "Caponord 1000",
    "Scarabeo 50",
    "Scarabeo 125",
    "Scarabeo 500",
    "Tuono 1000R",
    "RSV Mille",
    "RSV1000R",
    "Mana 850",
    "Dorsoduro 750",
    "Dorsoduro 1200",
    "Shiver 750",
    "Shiver 900",
    "Caponord 1200",
    "RSV4",
    "RSV4 Factory",
    "Tuono V4",
    "Tuono 660",
    "RS 660",
    "Tuareg 660",
    "SR 50",
    "SR Motard",
  ],
  // ====================
  //  Motos - Moto Guzzi
  // ====================
  "Moto Guzzi": [
    "V7 Sport",
    "Le Mans",
    "California 1100",
    "California 1400",
    "T3",
    "T5",
    "850 T3",
    "V50",
    "V65",
    "V1000",
    "Griso 1100",
    "Griso 1200",
    "Breva 1100",
    "Norge 1200",
    "Stelvio 1200 NTX",
    "V7 Classic",
    "V7 Stone",
    "V7 Racer",
    "V7 III",
    "V9 Bobber",
    "V9 Roamer",
    "Audace",
    "Eldorado",
    "MGX-21",
    "V85 TT",
  ],
  // ====================
  //  Motos - Royal Enfield
  // ====================
  "Royal Enfield": [
    // Légendes historiques & classiques
    "Bullet 350",
    "Bullet 500",
    "Bullet Electra X",
    "Bullet Trials 350",
    "Bullet Trials 500",
    "Bullet 350 ES",
    "Classic 350",
    "Classic 500",
    "Classic Chrome",
    "Classic Battle Green",
    "Classic Desert Storm",
    "Classic Squadron Blue",
    "Classic Stealth Black",
    "Classic Redditch",
    "Classic Signals 350",
    "Classic 350 Reborn",
    "Classic 350 Halcyon",
    "Classic 350 Dark",
    // Thunderbird et variantes
    "Thunderbird 350",
    "Thunderbird 500",
    "Thunderbird X 350",
    "Thunderbird X 500",
    // Gamme Meteor / Hunter
    "Meteor 350",
    "Hunter 350",
    // Gamme Himalayan / Scram
    "Himalayan",
    "Scram 411",
    "Himalayan 450", // Nouveau 2024
    // Twins et sportives
    "Continental GT 535",
    "Continental GT 650",
    "Interceptor 650",
    // GT ancienne génération
    "GT 250",
    "GT 535",
    // Nouveautés 2023-2024
    "Super Meteor 650",
    "Shotgun 650",
    // Divers exotiques & marchés spécifiques
    "Machismo 350",
    "Machismo 500",
    "Lightning 535",
    "Electra",
    "Electra X",
    "Electra 5S",
    "Silver Plus",
    "Mini Bullet",
    "Diesel Taurus",
  ],

  // ====================
  //  Motos - MV Agusta
  // ====================
  "MV Agusta": [
    "750S",
    "F4 750",
    "F4 1000",
    "F4 RR",
    "Brutale 750",
    "Brutale 910",
    "Brutale 1078RR",
    "Brutale 800",
    "Brutale 800 RR",
    "Brutale 1090",
    "Dragster 800",
    "Dragster 800 RR",
    "F3 675",
    "F3 800",
    "Turismo Veloce 800",
    "Superveloce 800",
    "Rush 1000",
    "Rivale 800",
  ],
  // ====================
  //  Motos - Indian
  // ====================
  Indian: [
    // Modèles historiques modernes & revival (2011+)
    "Chief",
    "Chief Classic",
    "Chief Vintage",
    "Chief Dark Horse",
    "Chief Bobber",
    "Chief Bobber Dark Horse",
    "Super Chief",
    "Super Chief Limited",
    // Scout family
    "Scout",
    "Scout Sixty",
    "Scout Bobber",
    "Scout Bobber Twenty",
    "Scout Bobber Sixty",
    "Scout Rogue",
    // Touring
    "Springfield",
    "Springfield Dark Horse",
    "Chieftain",
    "Chieftain Dark Horse",
    "Chieftain Elite",
    "Chieftain Limited",
    "Roadmaster",
    "Roadmaster Classic",
    "Roadmaster Elite",
    "Roadmaster Limited",
    // Bagger & Power Cruiser
    "Indian Challenger",
    "Challenger Limited",
    "Challenger Dark Horse",
    "Challenger Elite",
    "Pursuit",
    "Pursuit Dark Horse",
    "Pursuit Limited",
    // FTR Series
    "FTR 1200",
    "FTR 1200 S",
    "FTR Rally",
    "FTR Carbon",
    "FTR R Carbon",
    // Specials et Custom US-only
    "Jack Daniels Limited Edition",
    // Modèles anciens, collectors (si tu veux aller plus loin)
    "Four",
    "Arrow",
    "Warrior",
    "Spirit",
    "Roadmaster (vintage)",
    "Powerplus",
  ],

  // ====================
  //  Motos - Benelli
  // ====================
  Benelli: [
    "Tornado 900 Tre",
    "TNT 899",
    "TNT 1130",
    "BN 125",
    "BN 302",
    "BN 600",
    "TNT 125",
    "TNT 300",
    "TNT 600",
    "TRK 502",
    "TRK 502X",
    "Leoncino 250",
    "Leoncino 500",
    "Leoncino 800",
    "Leoncino 800 Trail",
    "Imperiale 400",
  ],
  // ====================
  //  Motos - Husqvarna
  // ====================
  Husqvarna: [
    "TE 250",
    "TE 300",
    "SM 510R",
    "SM 610",
    "701 Enduro",
    "701 Supermoto",
    "701 Vitpilen",
    "701 Svartpilen",
    "Vitpilen 401",
    "Vitpilen 701",
    "Svartpilen 125",
    "Svartpilen 250",
    "Svartpilen 401",
    "Svartpilen 701",
    "FE 350",
    "FE 450",
  ],
  // ====================
  //  Motos - Bajaj
  // ====================
  Bajaj: [
    "Pulsar 150",
    "Pulsar 180",
    "Pulsar 220F",
    "Pulsar NS125",
    "Pulsar NS160",
    "Pulsar NS200",
    "Pulsar RS200",
    "Dominar 250",
    "Dominar 400",
    "Avenger Street 150",
    "Avenger Street 160",
    "Avenger Cruise 220",
  ],
  // ====================
  //  Motos - Hero
  // ====================
  Hero: [
    "Splendor Plus",
    "HF Deluxe",
    "Passion Pro",
    "Glamour",
    "Maestro Edge 110",
    "Maestro Edge 125",
    "Xpulse 200",
    "Xtreme 160R",
  ],
  // ====================
  //  Motos - CFMOTO
  // ====================
  CFMOTO: [
    "250NK",
    "300NK",
    "400NK",
    "650NK",
    "650GT",
    "650MT",
    "700CL-X",
    "800MT",
    "Papio 125",
  ],
  // ====================
  //  Motos - SYM
  // ====================
  SYM: [
    "Wolf 125",
    "Wolf T2 150",
    "NH T 200",
    "HD 200",
    "Joymax 300",
    "Cruisym 300",
    "Symphony ST 200",
    "Jet 14",
    "Fiddle III",
    "GTS 300i",
  ],
  // ====================
  //  Motos - Peugeot Moto
  // ====================
  "Peugeot Moto": [
    "Speedfight 2",
    "Speedfight 3",
    "Speedfight 4",
    "Vivacity 50",
    "Django 50",
    "Django 125",
    "Pulsion 125",
    "Metropolis 400",
    "Satelis 125",
    "PULSER 125",
    "PULSER 200",
    "Tweet 125",
  ],
  // ====================
  //  Motos - Victory
  // ====================
  Victory: [
    "V92C",
    "Kingpin",
    "Vegas",
    "Vegas 8-Ball",
    "High-Ball",
    "Hammer S",
    "Judge",
    "Gunner",
    "Boardwalk",
    "Cross Country",
    "Cross Roads",
    "Octane",
    "Vision",
    "Magnum",
  ],
};

// Helper to handle preview
function handlePreview(files, setPreview) {
  // Utiliser la méthode statique URL.createObjectURL correctement (sans new, sans appel direct à URL)
  if (files && files.length > 0) {
    const url = URL.createObjectURL(files[0]);
    setPreview(url);
  } else {
    setPreview(null);
  }
}

export default function AddVehiclePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // ÉTAT PRINCIPAL DU FORMULAIRE
  const [vehicleType, setVehicleType] = useState("");
  const [selectedMake, setSelectedMake] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [mileage, setMileage] = useState("");
  const [engine, setEngine] = useState("");
  const [color, setColor] = useState("");
  const [title, setTitle] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [transmission, setTransmission] = useState("");

  const [boughtAt, setBoughtAt] = useState("");
  const [zip, setZip] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");

  const [frontPreview, setFrontPreview] = useState(null);
  const [rearPreview, setRearPreview] = useState(null);
  const [sideLeftPreview, setSideLeftPreview] = useState(null);
  const [sideRightPreview, setSideRightPreview] = useState(null);
  const [interiorPreview, setInteriorPreview] = useState(null);
  const [engineBayPreview, setEngineBayPreview] = useState(null);

  const [frontPhotos, setFrontPhotos] = useState([]);
  const [rearPhotos, setRearPhotos] = useState([]);
  const [sideLeftPhotos, setSideLeftPhotos] = useState([]);
  const [sideRightPhotos, setSideRightPhotos] = useState([]);
  const [interiorPhotos, setInteriorPhotos] = useState([]);
  const [engineBayPhotos, setEngineBayPhotos] = useState([]);

  // Ajout des hooks d'état manquants
  const [vin, setVin] = useState("");
  const [description, setDescription] = useState("");

  // Ajout des champs techniques vides à la création Firestore
  const handleSubmit = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("Please log in first.");
      return;
    }
    setSaving(true);

    const vehicleData = {
      uid: user.uid,
      vehicleType,
      make: selectedMake,
      model: selectedModel,
      year: Number(selectedYear),
      boughtAt: Number(boughtAt),
      color,
      title,
      mileage: Number(mileage),
      zip,
      state,
      city,
      engine,
      transmission,
      fuelType,
      description,
      createdAt: new Date(),
      marketplace,
      ...(marketplace && { vin }),
      ai_estimated_value: "",
      horsepower: "",
    };

    const id = `${vehicleType}-${selectedMake}-${selectedModel}-${selectedYear}-${
      user.uid
    }-${Date.now()}`;

    try {
      // 1) Crée le document Firestore
      const listingRef = doc(db, "listing", id);
      await setDoc(listingRef, vehicleData);
      await updateDoc(doc(db, "members", user.uid), {
        vehicles: arrayUnion(id),
      });

      // 2) Upload des photos pour chaque catégorie
      // Correction : il faut utiliser FileList ou tableau de fichiers, pas d'objet vide
      const uploadCategory = async (files, category) => {
        if (!files || files.length === 0) return [];
        return await Promise.all(
          files.map(async (file) => {
            const photoName = `${id}-${Date.now()}-${category}-${file.name}`;
            const storageRef = ref(
              storage,
              `listing/${id}/photos/${photoName}`
            );
            // Correction : attendez la fin de l'upload avant de récupérer l'URL
            const snapshot = await uploadBytesResumable(storageRef, file);
            return await getDownloadURL(snapshot.ref);
          })
        );
      };

      // 3) Upload et concatène toutes les URLs dans un seul tableau
      const allPhotoURLs = [
        ...(frontPhotos && frontPhotos.length > 0
          ? await uploadCategory(frontPhotos, "front")
          : []),
        ...(rearPhotos && rearPhotos.length > 0
          ? await uploadCategory(rearPhotos, "rear")
          : []),
        ...(sideLeftPhotos && sideLeftPhotos.length > 0
          ? await uploadCategory(sideLeftPhotos, "sideLeft")
          : []),
        ...(sideRightPhotos && sideRightPhotos.length > 0
          ? await uploadCategory(sideRightPhotos, "sideRight")
          : []),
        ...(interiorPhotos && interiorPhotos.length > 0
          ? await uploadCategory(interiorPhotos, "interior")
          : []),
        ...(engineBayPhotos && engineBayPhotos.length > 0
          ? await uploadCategory(engineBayPhotos, "engineBay")
          : []),
      ];

      // 4) Met à jour le document avec les URLs des photos
      await updateDoc(listingRef, {
        photos: allPhotoURLs,
      });

      setSaving(false);
      router.push(`/vehicleCard_page/${id}`);
    } catch (err) {
      console.error("Submission error:", err);
      setSaving(false);
      alert("An error occurred. Please try again later.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white bg-gray-900">
      <div className="w-full max-w-2xl p-8 bg-gray-800 shadow-2xl rounded-2xl">
        <h1 className="mb-6 text-3xl font-bold text-center">Add a Vehicle</h1>
        {/* Progress bar */}
        <div className="w-full h-2 mb-8 bg-gray-700 rounded">
          <div
            className="h-2 transition-all duration-300 bg-blue-500 rounded"
            style={{
              width: step === 1 ? "33%" : step === 2 ? "66%" : "100%",
            }}
          />
        </div>

        {/* Step 1: Basic Details */}
        {step === 1 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (
                !vehicleType ||
                !selectedMake ||
                !selectedModel ||
                !selectedYear ||
                !boughtAt ||
                !title ||
                !mileage
              ) {
                alert("Merci de remplir tous les champs obligatoires.");
                return;
              }
              setStep(2);
            }}
          >
            <div className="p-6 mb-8 bg-gray-900 border border-gray-700 rounded-xl">
              <h2 className="mb-4 text-xl font-semibold">Basic Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-sm">Vehicle type*</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => {
                      setVehicleType(e.target.value);
                      setSelectedMake("");
                      setSelectedModel("");
                    }}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                    required
                  >
                    <option value="">Select</option>
                    <option value="car">Car</option>
                    <option value="motorcycle">Motorcycle</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-sm">Make*</label>
                  <select
                    value={selectedMake}
                    onChange={(e) => {
                      setSelectedMake(e.target.value);
                      setSelectedModel("");
                    }}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                    required
                    disabled={!vehicleType}
                  >
                    <option value="">Select ak</option>
                    {vehicleType &&
                      makesByType[vehicleType]?.map((make) => (
                        <option key={make} value={make}>
                          {make}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-sm">Model*</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                    required
                    disabled={!selectedMake}
                  >
                    <option value="">Select</option>
                    {selectedMake &&
                      modelsByMake[selectedMake]?.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-sm">Year*</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                    required
                  >
                    <option value="">Select year</option>
                    {Array.from({ length: 45 }, (_, i) => 1980 + i)
                      .reverse()
                      .map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-sm">Purchased for*</label>
                  <input
                    type="number"
                    value={boughtAt}
                    onChange={(e) => setBoughtAt(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                    required
                    placeholder="Price"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm">Title brand*</label>
                  <select
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                    required
                  >
                    <option value="">Title brand</option>
                    <option value="clean">Clean</option>
                    <option value="salvage">Salvage</option>
                    <option value="rebuilt">Rebuilt</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-sm">Mileage*</label>
                  <input
                    type="number"
                    value={mileage}
                    onChange={(e) => setMileage(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                    required
                    placeholder="Mileage"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-between">
              <button
                type="button"
                className="px-6 py-2 text-gray-300 bg-gray-700 rounded"
                disabled
              >
                Previous
              </button>
              <button
                type="submit"
                className="px-6 py-2 font-bold bg-blue-600 rounded hover:bg-blue-700"
              >
                Next
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Additional Details */}
        {step === 2 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setStep(3);
            }}
          >
            <div className="p-6 mb-8 bg-gray-900 border border-gray-700 rounded-xl">
              <h2 className="mb-4 text-xl font-semibold">Additional Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-sm">Color*</label>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                    placeholder="Color"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm">Engine*</label>
                  <input
                    type="text"
                    value={engine}
                    onChange={(e) => setEngine(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                    placeholder="Engine / CC"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm">Transmission*</label>
                  <select
                    value={transmission}
                    onChange={(e) => setTransmission(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                    required
                  >
                    <option value="">Transmission</option>
                    <option value="Automatic">Automatic</option>
                    <option value="Manual">Manual</option>
                    <option value="Semi-Automatic">Semi-Automatic</option>
                    <option value="CVT">CVT</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-sm">Fuel type*</label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                    required
                  >
                    <option value="">Fuel type</option>
                    <option value="Gasoline">Gasoline</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Electric">Electric</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-sm">Zip*</label>
                  <input
                    type="text"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                    placeholder="Zip"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm">State*</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                    placeholder="State"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm">City*</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                    placeholder="City"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block mb-1 text-sm">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                    rows={2}
                    placeholder="Description"
                    required
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-between mb-16">
              <button
                type="button"
                className="px-6 py-2 text-gray-300 bg-gray-700 rounded"
                onClick={() => setStep(1)}
              >
                Previous
              </button>
              <button
                type="submit"
                className="px-6 py-2 font-bold bg-blue-600 rounded hover:bg-blue-700"
              >
                Next
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <div className="p-6 mb-8 bg-gray-900 border border-gray-700 rounded-xl">
              <h2 className="mb-4 text-xl font-semibold"> Pictures</h2>

              {/* Disposition inspirée de la maquette */}

              {/* Photos */}
              <div className="mb-6">
                <label className="block mb-2 text-sm font-semibold">
                  Vehicle Photos
                </label>
                <div className="grid max-w-md grid-cols-2 gap-6 mx-auto sm:grid-cols-3">
                  {/* Front */}
                  <div className="flex flex-col items-center p-4 bg-gray-800 shadow-md rounded-xl aspect-square">
                    <label className="mb-2 text-sm font-semibold text-gray-200">
                      Front
                    </label>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      id="photo-front"
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files);
                        setFrontPhotos(files);
                        handlePreview(files, setFrontPreview);
                      }}
                    />
                    <label
                      htmlFor="photo-front"
                      className="flex flex-col items-center justify-center w-full h-24 overflow-hidden transition border-2 border-gray-500 border-dashed rounded-lg cursor-pointer hover:border-blue-400"
                    >
                      {frontPreview ? (
                        <Image
                          src={frontPreview}
                          alt="Front preview"
                          width={80}
                          height={80}
                          className="object-cover w-full h-full rounded"
                          style={{
                            objectFit: "cover",
                            width: "100%",
                            height: "100%",
                          }}
                        />
                      ) : (
                        <>
                          <span className="mb-1 text-3xl text-blue-400">+</span>
                          <span className="text-xs text-gray-400">Add</span>
                        </>
                      )}
                    </label>
                    <p className="mt-2 text-xs text-center text-gray-400">
                      Front view
                    </p>
                  </div>

                  {/* Rear */}
                  <div className="flex flex-col items-center p-4 bg-gray-800 shadow-md rounded-xl aspect-square">
                    <label className="mb-2 text-sm font-semibold text-gray-200">
                      Rear
                    </label>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      id="photo-rear"
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files);
                        setRearPhotos(files);
                        handlePreview(files, setRearPreview);
                      }}
                    />
                    <label
                      htmlFor="photo-rear"
                      className="flex flex-col items-center justify-center w-full h-24 overflow-hidden transition border-2 border-gray-500 border-dashed rounded-lg cursor-pointer hover:border-blue-400"
                    >
                      {rearPreview ? (
                        <Image
                          src={rearPreview}
                          alt="Rear preview"
                          width={80}
                          height={80}
                          className="object-cover w-full h-full rounded"
                          style={{
                            objectFit: "cover",
                            width: "100%",
                            height: "100%",
                          }}
                        />
                      ) : (
                        <>
                          <span className="mb-1 text-3xl text-blue-400">+</span>
                          <span className="text-xs text-gray-400">Add</span>
                        </>
                      )}
                    </label>
                    <p className="mt-2 text-xs text-center text-gray-400">
                      Rear view
                    </p>
                  </div>

                  {/* Side Left */}
                  <div className="flex flex-col items-center p-4 bg-gray-800 shadow-md rounded-xl aspect-square">
                    <label className="mb-2 text-sm font-semibold text-gray-200">
                      Side Left
                    </label>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      id="photo-sideleft"
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files);
                        setSideLeftPhotos(files);
                        handlePreview(files, setSideLeftPreview);
                      }}
                    />
                    <label
                      htmlFor="photo-sideleft"
                      className="flex flex-col items-center justify-center w-full h-24 overflow-hidden transition border-2 border-gray-500 border-dashed rounded-lg cursor-pointer hover:border-blue-400"
                    >
                      {sideLeftPreview ? (
                        <Image
                          src={sideLeftPreview}
                          alt="Side left preview"
                          width={80}
                          height={80}
                          className="object-cover w-full h-full rounded"
                          style={{
                            objectFit: "cover",
                            width: "100%",
                            height: "100%",
                          }}
                        />
                      ) : (
                        <>
                          <span className="mb-1 text-3xl text-blue-400">+</span>
                          <span className="text-xs text-gray-400">Add</span>
                        </>
                      )}
                    </label>
                    <p className="mt-2 text-xs text-center text-gray-400">
                      Left side
                    </p>
                  </div>

                  {/* Side Right */}
                  <div className="flex flex-col items-center p-4 bg-gray-800 shadow-md rounded-xl aspect-square">
                    <label className="mb-2 text-sm font-semibold text-gray-200">
                      Side Right
                    </label>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      id="photo-sideright"
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files);
                        setSideRightPhotos(files);
                        handlePreview(files, setSideRightPreview);
                      }}
                    />
                    <label
                      htmlFor="photo-sideright"
                      className="flex flex-col items-center justify-center w-full h-24 overflow-hidden transition border-2 border-gray-500 border-dashed rounded-lg cursor-pointer hover:border-blue-400"
                    >
                      {sideRightPreview ? (
                        <Image
                          src={sideRightPreview}
                          alt="Side right preview"
                          width={80}
                          height={80}
                          className="object-cover w-full h-full rounded"
                          style={{
                            objectFit: "cover",
                            width: "100%",
                            height: "100%",
                          }}
                        />
                      ) : (
                        <>
                          <span className="mb-1 text-3xl text-blue-400">+</span>
                          <span className="text-xs text-gray-400">Add</span>
                        </>
                      )}
                    </label>
                    <p className="mt-2 text-xs text-center text-gray-400">
                      Right side
                    </p>
                  </div>

                  {/* Interior */}
                  <div className="flex flex-col items-center p-4 bg-gray-800 shadow-md rounded-xl aspect-square">
                    <label className="mb-2 text-sm font-semibold text-gray-200">
                      Interior
                    </label>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      id="photo-interior"
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files);
                        setInteriorPhotos(files);
                        handlePreview(files, setInteriorPreview);
                      }}
                    />
                    <label
                      htmlFor="photo-interior"
                      className="flex flex-col items-center justify-center w-full h-24 overflow-hidden transition border-2 border-gray-500 border-dashed rounded-lg cursor-pointer hover:border-blue-400"
                    >
                      {interiorPreview ? (
                        <Image
                          src={interiorPreview}
                          alt="Interior preview"
                          width={80}
                          height={80}
                          className="object-cover w-full h-full rounded"
                          style={{
                            objectFit: "cover",
                            width: "100%",
                            height: "100%",
                          }}
                        />
                      ) : (
                        <>
                          <span className="mb-1 text-3xl text-blue-400">+</span>
                          <span className="text-xs text-gray-400">Add</span>
                        </>
                      )}
                    </label>
                    <p className="mt-2 text-xs text-center text-gray-400">
                      Interior
                    </p>
                  </div>

                  {/* Engine Bay */}
                  <div className="flex flex-col items-center p-4 bg-gray-800 shadow-md rounded-xl aspect-square">
                    <label className="mb-2 text-sm font-semibold text-gray-200">
                      Engine Bay
                    </label>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      id="photo-enginebay"
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files);
                        setEngineBayPhotos(files);
                        handlePreview(files, setEngineBayPreview);
                      }}
                    />
                    <label
                      htmlFor="photo-enginebay"
                      className="flex flex-col items-center justify-center w-full h-24 overflow-hidden transition border-2 border-gray-500 border-dashed rounded-lg cursor-pointer hover:border-blue-400"
                    >
                      {engineBayPreview ? (
                        <Image
                          src={engineBayPreview}
                          alt="Engine bay preview"
                          width={80}
                          height={80}
                          className="object-cover w-full h-full rounded"
                          style={{
                            objectFit: "cover",
                            width: "100%",
                            height: "100%",
                          }}
                        />
                      ) : (
                        <>
                          <span className="mb-1 text-3xl text-blue-400">+</span>
                          <span className="text-xs text-gray-400">Add</span>
                        </>
                      )}
                    </label>
                    <p className="mt-2 text-xs text-center text-gray-400">
                      Engine bay
                    </p>
                  </div>
                </div>
              </div>
              {/* VIN si marketplace */}
              {marketplace && (
                <div className="mb-4">
                  <label className="block mb-1 text-sm">VIN</label>
                  <input
                    type="text"
                    value={vin}
                    onChange={(e) => setVin(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                    required={marketplace}
                    placeholder="VIN"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-between mt-8 mb-16">
              <button
                type="button"
                className="px-6 py-2 text-gray-300 bg-gray-700 rounded"
                onClick={() => setStep(2)}
              >
                Previous
              </button>
              <button
                type="submit"
                className={`px-6 py-2 rounded font-bold ${
                  saving ? "bg-gray-500" : "bg-blue-600 hover:bg-blue-700"
                }`}
                disabled={saving}
              >
                {saving ? "Saving..." : "Submit Vehicle"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
