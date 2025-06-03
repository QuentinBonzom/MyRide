// pages/MyGarage.js
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { auth, db, storage } from "../lib/firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  updateDoc,
  arrayRemove,
} from "firebase/firestore";
import { ref, listAll, getDownloadURL, deleteObject } from "firebase/storage";
import Image from "next/image";
import { motion } from "framer-motion";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";

export default function MyGarage() {
  const router = useRouter();

  // États
  const [firstName, setFirstName] = useState("");
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [sumType, setSumType] = useState("Garage's Estimated Value"); // Default to "Garage's Estimated Value"
  const [dropdownOpen, setDropdownOpen] = useState(false); // Track dropdown visibility
  const sumOptions = [
    "Garage's Estimated Value",
    "Garage's total cost",
    "Garage's purchase cost",
    "Cost in Repair",
    "Cost in Scheduled Maintenance",
    "Cost in Cosmetic Mods",
    "Cost in Performance Mods",
  ];

  const calculateGarageSum = (type) => {
    switch (type) {
      case "Garage's Estimated Value":
        return vehicles.reduce((sum, veh) => {
          const priceHistory = veh.ai_estimated_value || [];
          if (priceHistory.length > 0) {
            const lastEntry = priceHistory[priceHistory.length - 1]; // Get the last string in the array
            const [value] = lastEntry.split("-"); // Extract the value before the first "-"
            return sum + (parseFloat(value) || 0); // Convert to number and sum
          }
          return sum;
        }, 0);
      case "Garage's total cost":
        // Ajoute tous les coûts renseignés lors de l'ajout du véhicule + reçus
        return vehicles.reduce(
          (sum, veh) =>
            sum +
            (Number(veh.boughtAt) || 0) +
            Number(veh.withoutPurchasePrice) +
            Number(veh.repairCost) +
            Number(veh.scheduledMaintenance) +
            Number(veh.cosmeticMods) +
            Number(veh.performanceMods) +
            veh.receipts.reduce((rSum, r) => rSum + (Number(r.price) || 0), 0),
          0
        );
      case "Garage's purchase cost":
        return vehicles.reduce(
          (sum, veh) => sum + (Number(veh.boughtAt) || 0),
          0
        );
      case "Cost in Repair":
        // Ajoute la valeur renseignée + reçus de type Repair
        return vehicles.reduce(
          (sum, veh) =>
            sum +
            Number(veh.repairCost) +
            veh.receipts
              .filter((r) => r.category === "Repair")
              .reduce((rSum, r) => rSum + (Number(r.price) || 0), 0),
          0
        );
      case "Cost in Scheduled Maintenance":
        return vehicles.reduce(
          (sum, veh) =>
            sum +
            Number(veh.scheduledMaintenance) +
            veh.receipts
              .filter((r) => r.category === "Scheduled Maintenance")
              .reduce((rSum, r) => rSum + (Number(r.price) || 0), 0),
          0
        );
      case "Cost in Cosmetic Mods":
        return vehicles.reduce(
          (sum, veh) =>
            sum +
            Number(veh.cosmeticMods) +
            veh.receipts
              .filter((r) => r.category === "Cosmetic Mods")
              .reduce((rSum, r) => rSum + (Number(r.price) || 0), 0),
          0
        );
      case "Cost in Performance Mods":
        return vehicles.reduce(
          (sum, veh) =>
            sum +
            Number(veh.performanceMods) +
            veh.receipts
              .filter((r) => r.category === "Performance Mods")
              .reduce((rSum, r) => rSum + (Number(r.price) || 0), 0),
          0
        );
      default:
        return 0;
    }
  };

  const handleSumTypeSelect = (type) => {
    setSumType(type);
    setDropdownOpen(false); // Close the dropdown after selection
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (!currentUser) {
        router.push("/login_page");
        setLoading(false);
      } else {
        setIsAuthenticated(true);
        setFirstName(currentUser.displayName || "");

        async function load() {
          const userRef = doc(db, "members", currentUser.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            const data = snap.data();
            setFirstName(data.firstName || "");

            if (data.vehicles?.length) {
              const list = await Promise.all(
                data.vehicles.map(async (id) => {
                  const vSnap = await getDoc(doc(db, "listing", id));
                  if (!vSnap.exists()) return null;
                  const vData = vSnap.data();

                  // Call the aiEstimator API
                  const response = await fetch("/api/aiEstimator", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      make: vData.make,
                      model: vData.model,
                      year: vData.year,
                      mileage: vData.mileage,
                      city: vData.city, // Add city
                      state: vData.state, // Add state
                      zip: vData.zip, // Add zip
                      color: vData.color, // Add color
                      title: vData.title, // Add title
                      vehicleId: id, // Add vehicleId
                    }),
                  });

                  if (!response.ok) {
                    console.error("Failed to fetch AI estimation");
                    return null;
                  }

                  // Fetch images
                  const imgsRef = ref(storage, `listing/${id}/photos`);
                  const files = await listAll(imgsRef);
                  const urls = await Promise.all(
                    files.items.map((f) => getDownloadURL(f))
                  );
                  const images = urls.filter(
                    (u) => !u.includes("vehicleVideo")
                  );

                  // Fetch receipts
                  const rSnap = await getDocs(
                    collection(db, `listing/${id}/receipts`)
                  );
                  const receipts = rSnap.docs.map((d) => d.data());

                  // Correction: Ajoute les champs de coût renseignés lors de l'ajout du véhicule
                  // (repairCost, scheduledMaintenance, cosmeticMods, performanceMods, withoutPurchasePrice)
                  // et les injecte dans le calcul d'affichage
                  const repairCost = Number(vData.repairCost) || 0;
                  const scheduledMaintenance =
                    Number(vData.scheduledMaintenance) || 0;
                  const cosmeticMods = Number(vData.cosmeticMods) || 0;
                  const performanceMods = Number(vData.performanceMods) || 0;
                  const withoutPurchasePrice =
                    Number(vData.withoutPurchasePrice) || 0;

                  return {
                    id,
                    ...vData,
                    images,
                    receipts,
                    // Ajout explicite pour usage plus simple dans l'affichage
                    repairCost,
                    scheduledMaintenance,
                    cosmeticMods,
                    performanceMods,
                    withoutPurchasePrice,
                  };
                })
              );
              setVehicles(list.filter(Boolean));
            }
          }
          setLoading(false);
        }
        load();
      }
    });
    return () => unsubscribe();
  }, [router]);

  const openVehicle = (id) => router.push(`/vehicleCard_page/${id}`);
  const addVehicle = () => router.push("/addVehicle_page");
  const goToLogin = () => router.push("/login_page");
  const goToSignUp = () => router.push("/signup_page");

  const deleteVehicle = async (id) => {
    if (!confirm("Remove this vehicle?")) return;
    const user = auth.currentUser;
    if (!user) return;

    const imgsRef = ref(storage, `listing/${id}/photos`);
    const fl = await listAll(imgsRef);
    await Promise.all(fl.items.map((f) => deleteObject(f)));

    await deleteDoc(doc(db, "listing", id));
    await updateDoc(doc(db, "members", user.uid), {
      vehicles: arrayRemove(id),
    });

    setVehicles((v) => v.filter((x) => x.id !== id));
  };

  // Net Value global (converti en nombre pour éviter les strings)

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 min-h-screen bg-zinc-900">
        <div className="flex space-x-4">
          <motion.span
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 0.6 }}
            className="block w-4 h-4 bg-purple-500 rounded-full"
          />
          <motion.span
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
            className="block w-4 h-4 bg-purple-500 rounded-full"
          />
          <motion.span
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
            className="block w-4 h-4 bg-purple-500 rounded-full"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen text-white bg-zinc-900 ">
      <main className="relative flex-1 p-6 ">
        {showModal && !isAuthenticated && (
          <div className="fixed inset-0 z-20 flex items-center justify-center bg-black bg-opacity-75">
            <motion.div
              className="relative max-w-sm p-8 text-center bg-gray-800 shadow-2xl rounded-2xl"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <button
                className="absolute top-4 right-4"
                onClick={() => setShowModal(false)}
              >
                <XMarkIcon className="w-6 h-6 text-gray-400 hover:text-white" />
              </button>
              <h2 className="mb-4 text-2xl font-bold">Welcome!</h2>
              <p className="mb-6 text-gray-300">
                To unlock all features of your garage, please log in or create
                an account.
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={goToLogin}
                  className="px-4 py-2 font-medium bg-purple-600 rounded-lg hover:bg-purple-700"
                >
                  Log In
                </button>
                <button
                  onClick={goToSignUp}
                  className="px-4 py-2 font-medium bg-green-600 rounded-lg hover:bg-green-700"
                >
                  Sign Up
                </button>
              </div>
            </motion.div>
          </div>
        )}
        <motion.h1
          className="pb-4 mb-2 text-5xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {isAuthenticated ? `${firstName}'s Garage` : "My Garage"}
        </motion.h1>
        <div className="relative w-full max-w-md mx-auto mb-8 text-center">
          <div className="flex items-center justify-center space-x-2">
            <p className="text-sm text-gray-500">{sumType}</p>
            <div className="relative inline-block">
              <button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="p-1 transition rounded-full hover:bg-gray-100"
                title="Select Sum Type"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m19.5 8.25-7.5 7.5-7.5-7.5"
                  />
                </svg>
              </button>
              {dropdownOpen && (
                <div className="absolute z-20 w-56 mt-2 text-sm bg-white border border-gray-200 rounded-md shadow-lg -right-4 md:left-0">
                  {sumOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => handleSumTypeSelect(option)}
                      className={`block w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-100 ${
                        sumType === option
                          ? "font-bold text-purple-700 bg-purple-50"
                          : ""
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-center mt-2">
            <p className="text-5xl font-extrabold">
              ${Number(calculateGarageSum(sumType)).toFixed(2)}
            </p>
          </div>
        </div>
        <motion.div
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          animate="show"
        >
          {isAuthenticated ? (
            <>
              {vehicles.map((veh) => {
                // Correction: Utilise les champs renseignés lors de l'ajout du véhicule
                const maintenanceItems = [
                  {
                    label: "Without Purchase Price",
                    value:
                      Number(veh.withoutPurchasePrice) +
                      veh.receipts.reduce(
                        (sum, r) => sum + (Number(r.price) || 0),
                        0
                      ),
                  },
                  {
                    label: "Repair",
                    value:
                      Number(veh.repairCost) +
                      veh.receipts
                        .filter((r) => r.category === "Repair")
                        .reduce((sum, r) => sum + (Number(r.price) || 0), 0),
                  },
                  {
                    label: "Scheduled Maintenance",
                    value:
                      Number(veh.scheduledMaintenance) +
                      veh.receipts
                        .filter((r) => r.category === "Scheduled Maintenance")
                        .reduce((sum, r) => sum + (Number(r.price) || 0), 0),
                  },
                  {
                    label: "Cosmetic Mods",
                    value:
                      Number(veh.cosmeticMods) +
                      veh.receipts
                        .filter((r) => r.category === "Cosmetic Mods")
                        .reduce((sum, r) => sum + (Number(r.price) || 0), 0),
                  },
                  {
                    label: "Performance Mods",
                    value:
                      Number(veh.performanceMods) +
                      veh.receipts
                        .filter((r) => r.category === "Performance Mods")
                        .reduce((sum, r) => sum + (Number(r.price) || 0), 0),
                  },
                ];

                // Correction: Total Spent = purchase price + tous les coûts maintenance + tous les reçus
                const totalCost =
                  (Number(veh.boughtAt) || 0) +
                  Number(veh.withoutPurchasePrice) +
                  Number(veh.repairCost) +
                  Number(veh.scheduledMaintenance) +
                  Number(veh.cosmeticMods) +
                  Number(veh.performanceMods) +
                  veh.receipts.reduce((s, r) => s + (Number(r.price) || 0), 0);

                return (
                  <motion.div
                    key={veh.id}
                    className="overflow-hidden bg-gray-800 shadow-lg cursor-pointer rounded-xl hover:shadow-2xl"
                    onClick={() => openVehicle(veh.id)}
                  >
                    <div className="grid h-48 grid-cols-2 gap-1">
                      {veh.images.slice(0, 4).map((img, idx) => (
                        <div key={idx} className="relative w-full h-24">
                          <Image
                            src={img}
                            alt={veh.make}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="p-4">
                      <h3 className="mb-2 text-xl font-bold">
                        {veh.year} {veh.make} {veh.model}
                      </h3>
                      <div className="grid grid-cols-2 text-sm text-gray-300 gap-x-4">
                        <p>
                          <strong>Color:</strong> {veh.color}
                        </p>
                        <p>
                          <strong>Mileage:</strong> {veh.mileage} miles
                        </p>
                        <p>
                          <strong>Power:</strong> {veh.horsepower} HP
                        </p>
                        <p>
                          <strong>Fuel:</strong> {veh.fuelType}
                        </p>
                        <p>
                          <strong>Transmission:</strong> {veh.transmission}
                        </p>
                      </div>
                      <div className="pt-2 mt-4 text-sm text-gray-300 border-t border-gray-700">
                        <h4 className="mb-1 font-semibold">Maintenance</h4>
                        {maintenanceItems.map((it) => {
                          const val = Number(it.value) || 0;
                          return (
                            <div
                              key={it.label}
                              className="flex justify-between"
                            >
                              <span>{it.label}:</span>
                              <span>${val.toFixed(2)}</span>
                            </div>
                          );
                        })}
                        <div className="flex justify-between mt-2 font-semibold text-purple-400">
                          <span>Total Spent:</span>
                          <span>${Number(totalCost).toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 mt-4 md:flex-row md:justify-between">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openVehicle(veh.id);
                          }}
                          className="px-10 py-2 button-main"
                        >
                          View more
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteVehicle(veh.id);
                          }}
                          className="px-10 py-2 font-medium text-gray-400 transition bg-transparent border border-gray-300 rounded-lg hover:border-red-400 hover:text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Empty Add Vehicle Cards */}
              {[...Array(1)].map((_, i) => (
                <div
                  key={`add-${i}`}
                  className="flex flex-col items-center justify-center h-64 bg-gray-800 cursor-pointer rounded-xl hover:shadow-xl"
                  onClick={addVehicle}
                >
                  <PlusIcon className="w-12 h-12 text-purple-400" />
                  <span className="mt-2 font-medium text-gray-300">
                    Add Vehicle
                  </span>
                </div>
              ))}
            </>
          ) : (
            [...Array(1)].map((_, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center h-64 bg-gray-800 cursor-pointer rounded-xl hover:shadow-xl"
                onClick={() => setShowModal(true)}
              >
                <PlusIcon className="w-12 h-12 text-purple-400" />
                <span className="mt-2 font-medium text-gray-300">
                  Add Vehicle
                </span>
              </div>
            ))
          )}
        </motion.div>
        <div className="pb-16" /> {/* Ajoute un padding en bas de page */}
      </main>
    </div>
  );
}
