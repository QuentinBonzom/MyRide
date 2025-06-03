// pages/addVehicle_page.jsx
import { useState } from "react";
import { useRouter } from "next/router";
import { auth, db, storage } from "../lib/firebase";
import { doc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import Image from "next/image";

export default function AddVehiclePage() {
  const router = useRouter();

  // 1. STATE DECLARATIONS
  // Form selections
  const [vehicleType, setVehicleType] = useState("");
  const [selectedMake, setSelectedMake] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [boughtAt, setBoughtAt] = useState("");
  const [color, setColor] = useState("");
  const [title, setTitle] = useState("");
  const [mileage, setMileage] = useState("");
  const [zip, setZip] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [engine, setEngine] = useState("");
  const [transmission, setTransmission] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [description, setDescription] = useState("");

  // Coûts
  const [withoutPurchasePrice, setWithoutPurchasePrice] = useState("");
  const [repairCost, setRepairCost] = useState("");
  const [scheduledMaintenance, setScheduledMaintenance] = useState("");
  const [cosmeticMods, setCosmeticMods] = useState("");
  const [performanceMods, setPerformanceMods] = useState("");

  // Photos (chaque catégorie)
  const [frontPhotos, setFrontPhotos] = useState([]);
  const [rearPhotos, setRearPhotos] = useState([]);
  const [sideLeftPhotos, setSideLeftPhotos] = useState([]);
  const [sideRightPhotos, setSideRightPhotos] = useState([]);
  const [interiorPhotos, setInteriorPhotos] = useState([]);
  const [dashboardPhotos, setDashboardPhotos] = useState([]);
  const [engineBayPhotos, setEngineBayPhotos] = useState([]);

  // Toggle Marketplace (enables additional required fields)
  const [marketplace, setMarketplace] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vin, setVin] = useState(""); // VIN input for marketplace

  // Preview states for each photo category
  const [frontPreview, setFrontPreview] = useState(null);
  const [rearPreview, setRearPreview] = useState(null);
  const [sideLeftPreview, setSideLeftPreview] = useState(null);
  const [sideRightPreview, setSideRightPreview] = useState(null);
  const [interiorPreview, setInteriorPreview] = useState(null);
  const [dashboardPreview, setDashboardPreview] = useState(null);
  const [engineBayPreview, setEngineBayPreview] = useState(null);

  // 2. STRUCTURED DATA FOR MAKE / MODEL
  // Extensive list of car and motorcycle brands and their representative models
  const makesByType = {
    car: [
      "Toyota",
      "Ford",
      "Chevrolet",
      "Honda",
      "Nissan",
      "BMW",
      "Mercedes-Benz",
      "Audi",
      "Volkswagen",
      "Hyundai",
      "Kia",
      "Subaru",
      "Mazda",
      "Volvo",
      "Lexus",
      "Jaguar",
      "Land Rover",
      "Porsche",
      "Tesla",
      "Ferrari",
      "Lamborghini",
      "Maserati",
      "Bentley",
      "Rolls-Royce",
      "Aston Martin",
      "Alfa Romeo",
      "Fiat",
      "Renault",
      "Peugeot",
      "Citroën",
      "Skoda",
      "Seat",
      "Opel",
      "Peugeot",
      "DS Automobiles",
      "Mini",
      "McLaren",
      "Infiniti",
      "Acura",
      "Cadillac",
      "Buick",
      "GMC",
      "Chrysler",
      "Dodge",
      "Jeep",
      "Ram",
      "Mitsubishi",
      "Suzuki",
      "Isuzu",
      "Chery",
      "Geely",
      "Saab",
    ],
    motorcycle: [
      "Honda",
      "Yamaha",
      "Suzuki",
      "Kawasaki",
      "Ducati",
      "BMW Motorrad",
      "Harley-Davidson",
      "KTM",
      "Triumph",
      "Aprilia",
      "Moto Guzzi",
      "Royal Enfield",
      "MV Agusta",
      "Indian",
      "Benelli",
      "Husqvarna",
      "Victory",
      "Bajaj",
      "Hero",
      "KTM",
      "CFMOTO",
      "SYM",
      "Peugeot Moto",
    ],
  };

  const modelsByMake = {
    // ====================
    //  Voitures - Toyota
    // ====================
    Toyota: [
      "Corolla",
      "Camry",
      "Prius",
      "RAV4",
      "Highlander",
      "Yaris",
      "C-HR",
      "4Runner",
      "Tacoma",
      "Tundra",
      "Sienna",
      "Avalon",
      "Supra",
      "Sequoia",
      "Land Cruiser",
      "Mirai",
      "86",
      "Venza",
    ],

    // ====================
    //  Voitures - Ford
    // ====================
    Ford: [
      "Fiesta",
      "Focus",
      "Fusion",
      "Taurus",
      "Mustang",
      "GT",
      "Explorer",
      "Edge",
      "Escape",
      "Bronco",
      "Expedition",
      "EcoSport",
      "Flex",
      "Ranger",
      "F-150",
      "F-250",
      "F-350",
      "Transit",
      "Taurus",
      "Expedition",
      "C-Max",
      "Probe",
    ],

    // ====================
    //  Voitures - Chevrolet
    // ====================
    Chevrolet: [
      "Spark",
      "Sonic",
      "Cruze",
      "Malibu",
      "Impala",
      "Volt",
      "Camaro",
      "Corvette",
      "Cruze",
      "Equinox",
      "Traverse",
      "Tahoe",
      "Suburban",
      "Trax",
      "Trailblazer",
      "Silverado 1500",
      "Silverado 2500HD",
      "Colorado",
      "Blazer",
      "Bolt EV",
      "SSR",
      "Avalanche",
      "Caprice",
    ],

    // ====================
    //  Voitures - Honda
    // ====================
    Honda: [
      "Fit",
      "Civic",
      "Accord",
      "Insight",
      "Clarity",
      "CR-V",
      "HR-V",
      "Pilot",
      "Passport",
      "Ridgeline",
      "Odyssey",
      "Element",
      "Prelude",
      "S2000",
      "NSX",
    ],

    // ====================
    //  Voitures - Nissan
    // ====================
    Nissan: [
      "Versa",
      "Sentra",
      "Altima",
      "Maxima",
      "Leaf",
      "370Z",
      "350Z",
      "Pathfinder",
      "Rogue",
      "Murano",
      "Xterra",
      "Armada",
      "Frontier",
      "Titan",
      "GT-R",
      "Cube",
    ],

    // ====================
    //  Voitures - BMW
    // ====================
    BMW: [
      "1 Series",
      "2 Series",
      "3 Series",
      "4 Series",
      "5 Series",
      "6 Series",
      "7 Series",
      "8 Series",
      "X1",
      "X2",
      "X3",
      "X4",
      "X5",
      "X6",
      "X7",
      "Z4",
      "M2",
      "M3",
      "M4",
      "M5",
      "M6",
      "i3",
      "i4",
      "i8",
      "iX",
      "iX3",
      "iX1",
      "Z3",
    ],

    // ====================
    //  Voitures - Mercedes-Benz
    // ====================
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

    // ====================
    //  Voitures - Audi
    // ====================
    Audi: [
      "A1",
      "A3",
      "A4",
      "A5",
      "A6",
      "A7",
      "A8",
      "Q2",
      "Q3",
      "Q5",
      "Q7",
      "Q8",
      "TT",
      "R8",
      "e-tron",
      "RS 3",
      "RS 4",
      "RS 5",
      "RS 6",
      "RS 7",
      "S3",
      "S4",
      "S5",
      "S6",
      "S7",
      "SQ5",
      "SQ7",
      "SQ8",
    ],

    // ====================
    //  Voitures - Volkswagen
    // ====================
    Volkswagen: [
      "Up!",
      "Polo",
      "Golf",
      "Golf GTI",
      "Golf R",
      "Jetta",
      "Passat",
      "Arteon",
      "Tiguan",
      "Touareg",
      "Atlas",
      "Beetle",
      "Scirocco",
      "Ameo",
      "Vento",
      "T-Roc",
      "T-Cross",
      "Touran",
      "Sharan",
    ],

    // ====================
    //  Voitures - Hyundai
    // ====================
    Hyundai: [
      "Accent",
      "Elantra",
      "Sonata",
      "Ioniq",
      "Veloster",
      "Azera",
      "Tucson",
      "Santa Fe",
      "Palisade",
      "Kona",
      "Venue",
      "Genesis G70",
      "Genesis G80",
      "Genesis G90",
      "Ioniq 5",
      "Ioniq 6",
      "Nexo",
      "Staria",
    ],

    // ====================
    //  Voitures - Kia
    // ====================
    Kia: [
      "Rio",
      "Forte",
      "Optima",
      "Stinger",
      "K3",
      "K5",
      "Cadenza",
      "Soul",
      "Seltos",
      "Sportage",
      "Sorento",
      "Telluride",
      "Niro",
      "EV6",
      "Carens",
    ],

    // ====================
    //  Voitures - Subaru
    // ====================
    Subaru: [
      "Impreza",
      "WRX",
      "WRX STI",
      "Legacy",
      "Outback",
      "Forester",
      "Crosstrek",
      "Ascent",
      "BRZ",
      "Tribeca",
      "Justy",
    ],

    // ====================
    //  Voitures - Mazda
    // ====================
    Mazda: [
      "Mazda2",
      "Mazda3",
      "Mazda6",
      "MX-5 Miata",
      "MX-5 RF",
      "CX-3",
      "CX-30",
      "CX-5",
      "CX-9",
      "CX-50",
      "CX-90",
      "RX-7",
      "RX-8",
      "Millenia",
    ],

    // ====================
    //  Voitures - Volvo
    // ====================
    Volvo: [
      "S40",
      "S60",
      "S90",
      "V40",
      "V60",
      "V90",
      "XC40",
      "XC60",
      "XC90",
      "XC100",
      "C30",
      "C70",
      "V50",
      "V70",
      "S80",
    ],

    // ====================
    //  Voitures - Lexus
    // ====================
    Lexus: [
      "IS",
      "ES",
      "GS",
      "LS",
      "RC",
      "UX",
      "NX",
      "RX",
      "GX",
      "LX",
      "LC",
      "CT",
      "HS",
      "ES Hybrid",
      "UX Hybrid",
      "NX Hybrid",
      "RX Hybrid",
      "LC Hybrid",
      "LS Hybrid",
      "GS Hybrid",
    ],

    // ====================
    //  Voitures - Jaguar
    // ====================
    Jaguar: [
      "XE",
      "XF",
      "XJ",
      "F-Pace",
      "E-Pace",
      "F-Type",
      "I-Pace",
      "XE SV",
      "XF SV",
      "XJR",
      "C-X75",
    ],

    // ====================
    //  Voitures - Land Rover
    // ====================
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

    // ====================
    //  Voitures - Porsche
    // ====================
    Porsche: [
      "911",
      "718 Cayman",
      "718 Boxster",
      "Panamera",
      "Cayenne",
      "Macan",
      "Taycan",
      "918 Spyder",
      "Boxster",
      "Cayman",
      "911 Turbo",
      "911 GT3",
    ],

    // ====================
    //  Voitures - Tesla
    // ====================
    Tesla: [
      "Model S",
      "Model 3",
      "Model X",
      "Model Y",
      "Roadster",
      "Cybertruck",
      "Semi",
      "Model 2 (à venir)",
    ],

    // ====================
    //  Voitures - Ferrari
    // ====================
    Ferrari: [
      "Portofino",
      "Roma",
      "F8 Tributo",
      "488 GTB",
      "488 Pista",
      "458 Italia",
      "458 Speciale",
      "812 Superfast",
      "SF90 Stradale",
      "LaFerrari",
      "GTC4Lusso",
      "F12 Berlinetta",
      "Monza SP1",
      "Monza SP2",
    ],

    // ====================
    //  Voitures - Lamborghini
    // ====================
    Lamborghini: [
      "Aventador",
      "Huracán",
      "Urus",
      "Gallardo",
      "Murciélago",
      "Gallardo LP 570",
      "Reventón",
      "Centenario",
      "Sián",
      "Countach LPI 800-4",
    ],

    // ====================
    //  Voitures - Maserati
    // ====================
    Maserati: [
      "Ghibli",
      "Quattroporte",
      "Levante",
      "Granturismo",
      "GranCabrio",
      "MC20",
      "GranTurismo Folgore",
    ],

    // ====================
    //  Voitures - Bentley
    // ====================
    Bentley: [
      "Continental GT",
      "Flying Spur",
      "Bentayga",
      "Mulsanne",
      "Azure",
      "Brooklands",
      "Arnage",
    ],

    // ====================
    //  Voitures - Rolls-Royce
    // ====================
    "Rolls-Royce": [
      "Phantom",
      "Ghost",
      "Wraith",
      "Dawn",
      "Cullinan",
      "Dawn Black Badge",
      "Wraith Black Badge",
      "Cullinan Black Badge",
    ],

    // ====================
    //  Voitures - Aston Martin
    // ====================
    "Aston Martin": [
      "Vantage",
      "DB11",
      "DBS Superleggera",
      "Rapide AMR",
      "DBX",
      "Valkyrie",
      "Valhalla",
    ],

    // ====================
    //  Voitures - Alfa Romeo
    // ====================
    "Alfa Romeo": [
      "Giulia",
      "Stelvio",
      "4C",
      "Giulietta",
      "MiTo",
      "159",
      "Brera",
      "Spider",
    ],

    // ====================
    //  Voitures - Fiat
    // ====================
    Fiat: [
      "500",
      "500X",
      "500L",
      "Panda",
      "Punto",
      "Tipo",
      "Panda",
      "Bravo",
      "124 Spider",
    ],

    // ====================
    //  Voitures - Renault
    // ====================
    Renault: [
      "Clio",
      "Megane",
      "Scenic",
      "Captur",
      "Kadjar",
      "Talisman",
      "Espace",
      "Kangoo",
      "Twizy",
    ],

    // ====================
    //  Voitures - Peugeot
    // ====================
    Peugeot: [
      "208",
      "308",
      "508",
      "2008",
      "3008",
      "5008",
      "508 SW",
      "308 SW",
      "308 GTi",
    ],

    // ====================
    //  Voitures - Citroën
    // ====================
    Citroën: [
      "C1",
      "C3",
      "C3 Aircross",
      "C4",
      "C4 Cactus",
      "C5 Aircross",
      "C5",
      "DS3",
      "DS4",
      "DS5",
    ],

    // ====================
    //  Voitures - Skoda
    // ====================
    Skoda: [
      "Fabia",
      "Octavia",
      "Rapid",
      "Superb",
      "Karoq",
      "Kodiaq",
      "Kamiq",
      "Scala",
    ],

    // ====================
    //  Voitures - Seat
    // ====================
    Seat: [
      "Ibiza",
      "Leon",
      "Ateca",
      "Arona",
      "Tarraco",
      "Cordoba",
      "Alhambra",
      "Mii",
    ],

    // ====================
    //  Voitures - Opel
    // ====================
    Opel: [
      "Corsa",
      "Astra",
      "Insignia",
      "Crossland X",
      "Grandland X",
      "Zafira",
      "Adam",
      "Mokka",
    ],

    // ====================
    //  Voitures - DS Automobiles
    // ====================
    "DS Automobiles": ["DS3", "DS4", "DS5", "DS7 Crossback", "DS9"],

    // ====================
    //  Voitures - Mini
    // ====================
    Mini: [
      "Cooper",
      "Cooper S",
      "John Cooper Works",
      "Clubman",
      "Countryman",
      "Paceman",
    ],

    // ====================
    //  Voitures - McLaren
    // ====================
    McLaren: ["570S", "600LT", "720S", "650S", "GT", "Senna", "P1", "Artura"],

    // ====================
    //  Voitures - Infiniti
    // ====================
    Infiniti: ["Q50", "Q60", "Q70", "QX30", "QX50", "QX60", "QX70", "QX80"],

    // ====================
    //  Voitures - Acura
    // ====================
    Acura: ["ILX", "TLX", "RLX", "NSX", "RDX", "MDX", "ZDX", "Integra"],

    // ====================
    //  Voitures - Cadillac
    // ====================
    Cadillac: [
      "ATS",
      "CTS",
      "XTS",
      "XT4",
      "XT5",
      "XT6",
      "Escalade",
      "CT4",
      "CT5",
      "CT6",
      "DeVille",
    ],

    // ====================
    //  Voitures - Buick
    // ====================
    Buick: [
      "Encore",
      "Enclave",
      "Regal",
      "LaCrosse",
      "Envision",
      "Riviera",
      "Encore GX",
    ],

    // ====================
    //  Voitures - GMC
    // ====================
    GMC: [
      "Terrain",
      "Acadia",
      "Yukon",
      "Yukon XL",
      "Canyon",
      "Sierra 1500",
      "Sierra 2500HD",
      "Savana",
    ],

    // ====================
    //  Voitures - Chrysler
    // ====================
    Chrysler: ["Pacifica", "300", "Voyager", "Town & Country"],

    // ====================
    //  Voitures - Dodge
    // ====================
    Dodge: [
      "Charger",
      "Challenger",
      "Durango",
      "Journey",
      "Dart",
      "Viper",
      "Neon",
      "Caliber",
      "Avenger",
      "Grand Caravan",
    ],

    // ====================
    //  Voitures - Jeep
    // ====================
    Jeep: [
      "Wrangler",
      "Cherokee",
      "Grand Cherokee",
      "Patriot",
      "Compass",
      "Renegade",
      "Gladiator",
      "Commander",
    ],

    // ====================
    //  Voitures - Ram
    // ====================
    Ram: ["1500", "2500", "3500", "ProMaster", "ProMaster City"],

    // ====================
    //  Voitures - Mitsubishi
    // ====================
    Mitsubishi: [
      "Mirage",
      "Lancer",
      "Outlander",
      "Outlander Sport",
      "Eclipse",
      "Galant",
      "Montero",
      "Pajero",
      "ASX",
      "RVR",
      "i-MiEV",
    ],

    // ====================
    //  Voitures - Suzuki
    // ====================
    Suzuki: [
      "Swift",
      "Baleno",
      "Celerio",
      "Vitara",
      "Ertiga",
      "Ciaz",
      "S-Cross",
    ],

    // ====================
    //  Voitures - Isuzu
    // ====================
    Isuzu: ["D-Max", "MU-X", "Trooper", "Amigo"],

    // ====================
    //  Voitures - Chery
    // ====================
    Chery: ["Tiggo 2", "Tiggo 3", "Tiggo 5", "Tiggo 7", "Arrizo 5"],

    // ====================
    //  Voitures - Geely
    // ====================
    Geely: ["Emgrand", "Atlas", "Panda", "LC", "Coolray"],

    // ====================
    //  Voitures - Saab
    // ====================
    Saab: ["9-3", "9-5", "9-2X", "9-7X"],

    // ====================
    //  Motos - Honda
    // ====================
    Honda: [
      "CBR500R",
      "CBR600RR",
      "CBR1000RR",
      "CBR650R",
      "CB650R",
      "CB500F",
      "CB300R",
      "CBR250R",
      "CRF250L",
      "CRF450R",
      "Africa Twin",
      "Gold Wing",
      "Rebel 500",
      "NC750X",
      "CB1100",
      "CB1300",
      "Shadow",
      "Transalp",
      "Wave",
      "XR150L",
    ],

    // ====================
    //  Motos - Yamaha
    // ====================
    Yamaha: [
      "YZF-R3",
      "YZF-R6",
      "YZF-R1",
      "MT-03",
      "MT-07",
      "MT-09",
      "MT-10",
      "XSR700",
      "XSR900",
      "Tenere 700",
      "Tracer 700",
      "Tracer 900",
      "FZ-07",
      "FZ-09",
      "FJR1300",
      "Bolt",
      "Star Venture",
      "V Star 650",
      "V Star 250",
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
    ],

    // ====================
    //  Motos - Kawasaki
    // ====================
    Kawasaki: [
      "Ninja 300",
      "Ninja 400",
      "Ninja ZX-6R",
      "Ninja ZX-10R",
      "Ninja ZX-14R",
      "Ninja H2",
      "Z400",
      "Z650",
      "Z900",
      "Z1000",
      "Versys 650",
      "Versys 1000",
      "Vulcan S",
      "Vulcan 900",
      "Vulcan 1700",
      "KX450F",
    ],

    // ====================
    //  Motos - Ducati
    // ====================
    Ducati: [
      "Panigale V2",
      "Panigale V4",
      "Monster 797",
      "Monster 821",
      "Monster 1200",
      "Scrambler Icon",
      "Scrambler Desert Sled",
      "Multistrada 950",
      "Multistrada 1260",
      "Diavel",
      "Streetfighter V4",
      "Hypermotard",
      "Hypermotard 950",
      "SuperSport",
    ],

    // ====================
    //  Motos - BMW Motorrad
    // ====================
    "BMW Motorrad": [
      "S1000RR",
      "S1000XR",
      "R1250GS",
      "R1250RT",
      "R nineT",
      "R18",
      "F900R",
      "F900XR",
      "F750GS",
      "F850GS",
      "G310R",
      "G310GS",
      "K1600GT",
      "K1600GTL",
    ],

    // ====================
    //  Motos - Harley-Davidson
    // ====================
    "Harley-Davidson": [
      "Sportster 883",
      "Sportster 1200",
      "Iron 883",
      "Forty-Eight",
      "Street 750",
      "Street Bob",
      "Breakout",
      "Fat Boy",
      "Road King",
      "Ultra Limited",
      "Electra Glide",
      "Road Glide",
      "Heritage Classic",
      "Softail Standard",
      "Fat Bob",
    ],

    // ====================
    //  Motos - KTM
    // ====================
    KTM: [
      "Duke 125",
      "Duke 390",
      "Duke 650",
      "Duke 790",
      "Duke 890",
      "Duke 1090",
      "Duke 1290",
      "RC 125",
      "RC 390",
      "RC 200",
      "RC 8C",
      "Adventure 390",
      "Adventure 790",
      "Adventure 1090",
      "Adventure 1290",
      "EXC 250",
      "EXC 300",
    ],

    // ====================
    //  Motos - Triumph
    // ====================
    Triumph: [
      "Bonneville T100",
      "Bonneville T120",
      "Street Twin",
      "Street Scrambler",
      "Street Triple 765",
      "Speed Triple 1050",
      "Tiger 800",
      "Tiger 900",
      "Tiger 1200",
      "Daytona 675",
      "Thruxton R",
      "Bonneville Bobber",
      "Bonneville Speedmaster",
    ],

    // ====================
    //  Motos - Aprilia
    // ====================
    Aprilia: [
      "RS 660",
      "RSV4",
      "Tuono V4",
      "Shiver 900",
      "Tuareg 660",
      "Dorsoduro 900",
      "SR 50",
      "SR Motard",
      "Caponord 1200",
    ],

    // ====================
    //  Motos - Moto Guzzi
    // ====================
    "Moto Guzzi": [
      "V7",
      "V9",
      "California 1400",
      "Griso 1200",
      "Stelvio NTX",
      "V85 TT",
      "MGX-21",
    ],

    // ====================
    //  Motos - Royal Enfield
    // ====================
    "Royal Enfield": [
      "Classic 350",
      "Classic 500",
      "Bullet 350",
      "Interceptor 650",
      "Continental GT 650",
      "Himalayan",
      "Meteor 350",
    ],

    // ====================
    //  Motos - MV Agusta
    // ====================
    "MV Agusta": [
      "F3 675",
      "F3 800",
      "Brutale 800",
      "Brutale 1000",
      "Dragster 800",
      "Turismo Veloce 800",
      "Rush 1000",
    ],

    // ====================
    //  Motos - Indian
    // ====================
    Indian: [
      "Scout",
      "Scout Bobber",
      "Chief",
      "Chieftain",
      "Roadmaster",
      "Springfield Dark Horse",
      "Indian FTR",
      "Indian Challenger",
    ],

    // ====================
    //  Motos - Benelli
    // ====================
    Benelli: [
      "TNT 300",
      "TNT 600",
      "BN 302",
      "BN 600",
      "TRK 502",
      "Leoncino 500",
      "TRK 251",
      "Leoncino 250",
    ],

    // ====================
    //  Motos - Husqvarna
    // ====================
    Husqvarna: [
      "SVARTPILEN 401",
      "VITPILEN 401",
      "701 Enduro",
      "701 Supermoto",
      "701 Vitpilen",
      "701 Svartpilen",
    ],

    // ====================
    //  Motos - Bajaj
    // ====================
    Bajaj: [
      "Pulsar 150",
      "Pulsar 180",
      "Dominar 400",
      "Pulsar NS200",
      "Pulsar RS200",
      "Pulsar NS160",
    ],

    // ====================
    //  Motos - Hero
    // ====================
    Hero: ["Splendor Plus", "Passion Pro", "HF Deluxe", "Xtreme 160R"],

    // ====================
    //  Motos - CFMOTO
    // ====================
    CFMOTO: ["300NK", "650NK", "650GT", "650MT", "700CL-X", "800MT"],

    // ====================
    //  Motos - SYM
    // ====================
    SYM: ["Wolf 125", "Wolf T2 150", "HD 200", "NH T 200"],

    // ====================
    //  Motos - Peugeot Moto
    // ====================
    "Peugeot Moto": ["DJANGO", "PULSER 125", "PULSER 200"],

    // ====================
    //  Motos - Victory
    // ====================
    Victory: ["Vegas", "High-Ball", "Octane", "Cross Country", "Cross Roads"],
  };

  // ---------------------------------------------------
  // 3. FORM HANDLER & SUBMISSION (handleSubmit)
  // ---------------------------------------------------
  const handleSubmit = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("Please log in first.");
      return;
    }

    // VIN mandatory if listing on marketplace
    if (marketplace && !vin.trim()) {
      alert("VIN is required to list on the marketplace.");
      return;
    }
    setSaving(true);

    // Prepare data payload for Firestore
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
      withoutPurchasePrice: Number(withoutPurchasePrice),
      repairCost: Number(repairCost),
      scheduledMaintenance: Number(scheduledMaintenance),
      cosmeticMods: Number(cosmeticMods),
      performanceMods: Number(performanceMods),
      description,
      createdAt: new Date(), // This is a JS Date, but Firestore expects a Timestamp for queries. Optionally use: Timestamp.now()
      marketplace,
      ...(marketplace && { vin }),
    };

    // Generate a unique ID for this vehicle
    const id = `${vehicleType}-${Date.now()}`;

    try {
      // 1) Create the document in Firestore
      const listingRef = doc(db, "listing", id);
      await setDoc(listingRef, vehicleData);
      await updateDoc(doc(db, "members", user.uid), {
        vehicles: arrayUnion(id),
      });

      // 2) Utility function to upload a photo category
      const uploadCategory = async (files, category) => {
        // Correction: flatten all images into /photos/ folder (not /photos/category/)
        return await Promise.all(
          files.map(async (file) => {
            const photoName = `${id}-${Date.now()}-${category}-${file.name}`;
            const storageRef = ref(
              storage,
              `listing/${id}/photos/${photoName}`
            );
            const snapshot = await uploadBytesResumable(storageRef, file);
            return await getDownloadURL(snapshot.ref);
          })
        );
      };

      // 3) Photo uploads in each category if present
      // Correction: flatten all images into a single array for /photos/
      const allPhotoURLs = [
        ...(frontPhotos.length > 0
          ? await uploadCategory(frontPhotos, "front")
          : []),
        ...(rearPhotos.length > 0
          ? await uploadCategory(rearPhotos, "rear")
          : []),
        ...(sideLeftPhotos.length > 0
          ? await uploadCategory(sideLeftPhotos, "sideLeft")
          : []),
        ...(sideRightPhotos.length > 0
          ? await uploadCategory(sideRightPhotos, "sideRight")
          : []),
        ...(interiorPhotos.length > 0
          ? await uploadCategory(interiorPhotos, "interior")
          : []),
        ...(dashboardPhotos.length > 0
          ? await uploadCategory(dashboardPhotos, "dashboard")
          : []),
        ...(engineBayPhotos.length > 0
          ? await uploadCategory(engineBayPhotos, "engineBay")
          : []),
      ];

      // 4) Update the document with photo URLs (flat array, not nested object)
      await updateDoc(listingRef, {
        photos: allPhotoURLs,
      });

      // 5) Call AI API to generate a maintenance recommendation (optional)
      const prompt = `
Provide a maintenance recommendation for this vehicle using all details below:
Year: ${vehicleData.year}
Mileage: ${vehicleData.mileage}
Purchase price: $${vehicleData.boughtAt}
Without purchase price: $${vehicleData.withoutPurchasePrice}
Repair cost: $${vehicleData.repairCost}
Scheduled maintenance cost: $${vehicleData.scheduledMaintenance}
Cosmetic mods cost: $${vehicleData.cosmeticMods}
Performance mods cost: $${vehicleData.performanceMods}
Engine: ${vehicleData.engine}
Transmission: ${vehicleData.transmission}
Fuel type: ${vehicleData.fuelType}
Description: ${vehicleData.description}
`;
      try {
        const aiRes = await fetch("/api/aiMaintenance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            vehicleId: id,
            vehicleDetails: vehicleData,
          }),
        });
        const aiJson = await aiRes.json();
        if (aiRes.ok && aiJson.answer) {
          await updateDoc(listingRef, { aiRecommendation: aiJson.answer });
        }
      } catch (err) {
        console.error("AI error:", err);
      }

      // 6) Reset saving state and redirect to vehicle details
      setSaving(false);
      router.push(`/vehicleCard_page/${id}`);
    } catch (err) {
      console.error("Submission error:", err);
      setSaving(false);
      alert("An error occurred. Please try again later.");
    }
  };

  // Helper to handle preview
  function handlePreview(files, setPreview) {
    if (files && files.length > 0) {
      const url = URL.createObjectURL(files[0]);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }

  // 4. STATIC FIELD DEFINITIONS FOR FORM RENDERING
  const basicFields = [
    {
      label: "Vehicle Type",
      name: "vehicleType",
      value: vehicleType,
      onChange: (val) => {
        setVehicleType(val);
        setSelectedMake("");
        setSelectedModel("");
      },
      type: "select",
      options: ["car", "motorcycle"],
    },
    {
      label: "Make",
      name: "selectedMake",
      value: selectedMake,
      onChange: (val) => {
        setSelectedMake(val);
        setSelectedModel("");
      },
      type: "select",
      options:
        vehicleType && makesByType[vehicleType] ? makesByType[vehicleType] : [],
    },
    {
      label: "Model",
      name: "selectedModel",
      value: selectedModel,
      onChange: setSelectedModel,
      type: "select",
      options:
        selectedMake && modelsByMake[selectedMake]
          ? modelsByMake[selectedMake]
          : [],
    },
    {
      label: "Year",
      name: "selectedYear",
      value: selectedYear,
      onChange: setSelectedYear,
      type: "select",
      options: Array.from({ length: 45 }, (_, i) => 1980 + i).reverse(),
    },
    {
      label: "Bought At ($)",
      name: "boughtAt",
      value: boughtAt,
      onChange: setBoughtAt,
      type: "number",
    },
    {
      label: "Color",
      name: "color",
      value: color,
      onChange: setColor,
    },
    {
      label: "Title",
      name: "title",
      value: title,
      onChange: setTitle,
      type: "select",
      options: ["clean", "salvage", "rebuilt"],
    },
    {
      label: "Mileage",
      name: "mileage",
      value: mileage,
      onChange: setMileage,
      type: "number",
    },
    {
      label: "ZIP",
      name: "zip",
      value: zip,
      onChange: setZip,
    },
    {
      label: "State",
      name: "state",
      value: state,
      onChange: setState,
    },
    {
      label: "City",
      name: "city",
      value: city,
      onChange: setCity,
    },
    {
      label: "Engine / CC (for motorcycle)",
      name: "engine",
      value: engine,
      onChange: setEngine,
    },
    {
      label: "Transmission",
      name: "transmission",
      value: transmission,
      onChange: setTransmission,
      type: "select",
      options: ["Automatic", "Manual", "Semi-Automatic", "CVT", "Other"],
    },
    {
      label: "Fuel Type",
      name: "fuelType",
      value: fuelType,
      onChange: setFuelType,
      type: "select",
      options: ["Gasoline", "Diesel", "Electric", "Hybrid", "Other"],
    },
  ];

  const costFields = [
    {
      label: "Without Purchase Price",
      name: "withoutPurchasePrice",
      state: withoutPurchasePrice,
      setter: setWithoutPurchasePrice,
    },
    {
      label: "Repair Cost",
      name: "repairCost",
      state: repairCost,
      setter: setRepairCost,
    },
    {
      label: "Scheduled Maintenance",
      name: "scheduledMaintenance",
      state: scheduledMaintenance,
      setter: setScheduledMaintenance,
    },
    {
      label: "Cosmetic Mods",
      name: "cosmeticMods",
      state: cosmeticMods,
      setter: setCosmeticMods,
    },
    {
      label: "Performance Mods",
      name: "performanceMods",
      state: performanceMods,
      setter: setPerformanceMods,
    },
  ];

  // ---------------------------
  // 5. RENDU DU FORMULAIRE (JSX)
  // ---------------------------
  return (
    <div className="min-h-screen pt-16 pb-16 text-white bg-gray-900">
      <div className="container max-w-6xl px-6 py-1 mx-auto">
        <h1 className="mb-8 text-4xl font-bold text-center">
          Add Your Vehicle
        </h1>

        {/* Toggle Marketplace */}
        <div className="flex items-center mb-6">
          <input
            type="checkbox"
            id="marketplace"
            checked={marketplace}
            onChange={(e) => setMarketplace(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded"
          />
          <label htmlFor="marketplace" className="ml-2 text-sm text-gray-300">
            Add to Marketplace (VIN required only when enabled)
          </label>
        </div>

        <div className="mb-4 text-xs text-yellow-300">
          All fields are required for AI recommendations.
        </div>

        <div className="grid grid-cols-1 gap-6 p-8 bg-gray-800 shadow-xl md:grid-cols-2 rounded-2xl">
          {/* Render basicFields */}
          {basicFields.map((f, i) => (
            <div key={i} className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-300">
                {f.label}
              </label>

              {f.type === "select" ? (
                <select
                  id={f.name}
                  name={f.name}
                  value={f.value}
                  onChange={(e) => f.onChange(e.target.value)}
                  className="px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-lg"
                  disabled={
                    (f.name === "selectedMake" && !vehicleType) ||
                    (f.name === "selectedModel" && !selectedMake)
                  }
                >
                  <option value="">Select {f.label.toLowerCase()}</option>
                  {f.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={f.name}
                  name={f.name}
                  type={f.type || "text"}
                  value={f.value}
                  onChange={(e) => f.onChange(e.target.value)}
                  className="px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-lg"
                />
              )}
            </div>
          ))}

          {/* Render costFields */}
          {costFields.map((c, i) => (
            <div key={i} className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-300">
                {c.label} ($)
              </label>
              <div className="relative">
                <span className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2">
                  $
                </span>
                <input
                  id={c.name}
                  name={c.name}
                  type="number"
                  step="0.01"
                  value={c.state || ""}
                  onChange={(e) => c.setter(e.target.value)}
                  className="w-full px-4 py-2 pl-8 text-white bg-gray-700 border border-gray-600 rounded-lg"
                />
              </div>
            </div>
          ))}

          {/* VIN input appears only when adding to marketplace */}
          {marketplace && (
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-medium text-gray-300">
                VIN
              </label>
              <input
                type="text"
                value={vin}
                required={marketplace}
                onChange={(e) => setVin(e.target.value)}
                className="px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-lg"
              />
            </div>
          )}

          {/* Description (textarea) */}
          <div className="flex flex-col md:col-span-2">
            <label className="mb-1 text-sm font-medium text-gray-300">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="px-4 py-2 text-white bg-gray-700 border border-gray-600 rounded-lg"
            />
          </div>

          {/* Section Photos */}
          <div className="md:col-span-2">
            <h2 className="mb-4 text-xl font-bold text-center text-gray-300">
              Vehicle Photos
            </h2>
            <div className="grid max-w-md grid-cols-2 gap-6 mx-auto sm:grid-cols-3">
              {/* 1 */}
              <div className="flex flex-col items-center p-4 bg-gray-800 shadow-md rounded-xl aspect-square">
                <label className="mb-2 text-sm font-semibold text-gray-200">
                  Front
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    setFrontPhotos(files);
                    handlePreview(files, setFrontPreview);
                  }}
                  className="hidden"
                  id="photo-front"
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
              {/* 2 */}
              <div className="flex flex-col items-center p-4 bg-gray-800 shadow-md rounded-xl aspect-square">
                <label className="mb-2 text-sm font-semibold text-gray-200">
                  Rear
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    setRearPhotos(files);
                    handlePreview(files, setRearPreview);
                  }}
                  className="hidden"
                  id="photo-rear"
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
              {/* 3 */}
              <div className="flex flex-col items-center p-4 bg-gray-800 shadow-md rounded-xl aspect-square">
                <label className="mb-2 text-sm font-semibold text-gray-200">
                  Side Left
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    setSideLeftPhotos(files);
                    handlePreview(files, setSideLeftPreview);
                  }}
                  className="hidden"
                  id="photo-sideleft"
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
              {/* 4 */}
              <div className="flex flex-col items-center p-4 bg-gray-800 shadow-md rounded-xl aspect-square">
                <label className="mb-2 text-sm font-semibold text-gray-200">
                  Side Right
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    setSideRightPhotos(files);
                    handlePreview(files, setSideRightPreview);
                  }}
                  className="hidden"
                  id="photo-sideright"
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
              {/* 5 */}
              <div className="flex flex-col items-center p-4 bg-gray-800 shadow-md rounded-xl aspect-square">
                <label className="mb-2 text-sm font-semibold text-gray-200">
                  Interior
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    setInteriorPhotos(files);
                    handlePreview(files, setInteriorPreview);
                  }}
                  className="hidden"
                  id="photo-interior"
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
              {/* 6 */}
              <div className="flex flex-col items-center p-4 bg-gray-800 shadow-md rounded-xl aspect-square">
                <label className="mb-2 text-sm font-semibold text-gray-200">
                  Dashboard
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    setDashboardPhotos(files);
                    handlePreview(files, setDashboardPreview);
                  }}
                  className="hidden"
                  id="photo-dashboard"
                />
                <label
                  htmlFor="photo-dashboard"
                  className="flex flex-col items-center justify-center w-full h-24 overflow-hidden transition border-2 border-gray-500 border-dashed rounded-lg cursor-pointer hover:border-blue-400"
                >
                  {dashboardPreview ? (
                    <Image
                      src={dashboardPreview}
                      alt="Dashboard preview"
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
                  Dashboard
                </p>
              </div>
              {/* 7 */}
              <div className="flex flex-col items-center col-span-2 p-4 bg-gray-800 shadow-md rounded-xl aspect-square sm:col-span-1">
                <label className="mb-2 text-sm font-semibold text-gray-200">
                  Engine Bay
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    setEngineBayPhotos(files);
                    handlePreview(files, setEngineBayPreview);
                  }}
                  className="hidden"
                  id="photo-enginebay"
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
            <p className="text-xs text-center text-gray-400 ">
              Please upload multiple photos in each category for a complete view
              of your vehicle&apos;s condition.
              <br className="hidden sm:block" />
              Especially important when listing on the marketplace.
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center md:col-span-2">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className={`px-8 py-3 text-white rounded ${
                saving ? "bg-gray-500" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {saving ? "Saving..." : "Submit Vehicle"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
