// pages/vehicleCard/[id].jsx
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { auth, db, storage } from "../../lib/firebase";
import { ChevronDown, ChevronUp } from "lucide-react";
import { PieChart, Pie, ResponsiveContainer, Sankey,Cell, Tooltip, Legend } from "recharts";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  setLogLevel,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  ref,
  listAll,
  getDownloadURL,
  uploadBytesResumable,
  uploadString,
  deleteObject, // added for removing documents
} from "firebase/storage";
import Image from "next/image";
import "chart.js/auto";
import { onAuthStateChanged } from "firebase/auth";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Share2 } from "lucide-react";
import {
  Car,
  MapPin,
  Palette,
  Gauge,
  Key,
  Fuel,
  Users,
  AlignLeft,
  Info,
  Zap,
  Droplets,
  PlusCircle, // added for file upload icon
  Eye, // view icon (owner only)
  Edit,
  HelpCircle, // Added for tooltips
  Trash2, // ← nouveau: icône de suppression
} from "lucide-react";
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import { Loader2 } from "lucide-react";

// Helper: convert chartData to ApexCharts series,
// now handles both raw numeric arrays and {x,y} objets
function buildSeries(chartData) {
  return chartData.datasets.map((ds) => ({
    name: ds.label,
    data: ds.data.map((pt, i) =>
      pt && pt.x !== undefined && pt.y !== undefined
        ? pt
        : { x: chartData.labels[i], y: pt }
    ),
  }));
}

// ApexCharts default options, design revu
const defaultOptions = {
  chart: {
    id: "vehicle-value-chart",
    toolbar: { show: false },
    background: "#1f2937",
  },
  colors: ["#34d399", "#60a5fa", "#a78bfa", "#f87171"],
  dataLabels: {
    enabled: true,
    offsetY: -6,
    style: { fontSize: "10px", colors: ["#1f2937"] },
  },
  stroke: { curve: "smooth", width: 2 },
  markers: { size: 4, hover: { size: 6 } },
  grid: {
    show: true,
    borderColor: "#374151",
    strokeDashArray: 6,
    yaxis: { lines: { show: true } },
  },
  xaxis: {
    type: "datetime",
    tickAmount: 6,
    labels: {
      datetimeUTC: false,
      format: "dd MMM",
      style: { colors: "#9ca3af", fontSize: "11px" },
    },
  },
  yaxis: {
    title: { text: "Value ($)", style: { color: "#9ca3af" } },
    labels: {
      style: { colors: "#fff" },
      formatter: (val) => `$${val.toLocaleString()}`,
    },
  },
  tooltip: {
    theme: "dark",
    x: { format: "dd MMM yy" },
    y: { formatter: (val) => `$${val.toFixed(2)}` },
  },
  legend: {
    position: "top",
    labels: { colors: "#f3f4f8" },
  },
};

// pour amazon
// Move this state inside a React function component or custom hook

// Icônes et catégories

const icons = {
  Year: <Key className="mr-2 w-4 h-4" />,
  Make: <Car className="mr-2 w-4 h-4" />,
  Model: <Car className="mr-2 w-4 h-4" />,
  City: <MapPin className="mr-2 w-4 h-4" />,
  State: <MapPin className="mr-2 w-4 h-4" />,
  VIN: <Key className="mr-2 w-4 h-4" />,
  Mileage: <Gauge className="mr-2 w-4 h-4" />,
  Color: <Palette className="mr-2 w-4 h-4" />,
  Engine: <Fuel className="mr-2 w-4 h-4" />,
  Transmission: <Fuel className="mr-2 w-4 h-4" />,
  Description: <AlignLeft className="mr-2 w-4 h-4" />,
  Owner: <Users className="mr-2 w-4 h-4" />,
  Horsepower: <Zap className="mr-2 w-4 h-4" />,
  "Fuel Type": <Droplets className="mr-2 w-4 h-4" />,
};

// Modal de synchronisation du manuel
function OwnerManualModal({ vehicleId, onClose, onSync }) {
  const [manualUrl, setManualUrl] = useState("");
  const [loading, setLoading] = useState(false); // Added loading state

  const handleSync = async () => {
    if (!manualUrl.trim()) return toast.error("URL required");
    setLoading(true); // Show loading message
    try {
      await setDoc(
        doc(db, "listing", vehicleId),
        { ownerManual: manualUrl },
        { merge: true }
      );
      const snap = await getDoc(doc(db, "listing", vehicleId));
      const v = snap.data();
      const res = await fetch("/api/getMaintenanceFrequency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: v.year,
          make: v.make,
          model: v.model,
          type: v.vehicleType,
          url: manualUrl,
        }),
      });
      const json = await res.json();
      const path = `listing/${vehicleId}/docs/maintenanceTable.json`;
      const storageRef = ref(storage, path);
      await uploadString(storageRef, JSON.stringify(json.response), "raw");
      toast.success("Manual synced and AI data saved");
      onSync();
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Failed to sync manual");
    } finally {
      setLoading(false); // Hide loading message
    }
  };

  return (
    <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-70">
      <div className="p-6 w-80 rounded border shadow-lg bg-neutral-800 border-neutral-700">
        <h2 className="mb-4 text-xl text-white">Sync Owner Manual</h2>
        <input
          type="text"
          placeholder="Enter the URL of the PDF manual"
          className="p-2 mb-4 w-full text-white rounded border border-neutral-600 bg-neutral-700"
          value={manualUrl}
          onChange={(e) => setManualUrl(e.target.value)}
        />
        <p className="mb-4 text-sm text-neutral-400">
          Need help finding a manual? Visit{" "}
          <a
            href="https://www.carmanualsonline.info/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            Car Manuals Online
          </a>{" "}
          or check the{" "}
          <span className="text-blue-400">manufacturer&apos;s website</span>.
        </p>
        {loading ? (
          <p className="mb-4 text-sm text-neutral-400">
            Syncing manual, please wait...
          </p>
        ) : (
          <button
            type="button"
            className="py-2 mb-2 w-full text-white bg-purple-600 rounded hover:bg-purple-700"
            onClick={handleSync}
          >
            Save
          </button>
        )}
        <button
          type="button"
          className="py-2 w-full text-white rounded bg-neutral-600 hover:bg-neutral-500"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

const sankeyData = {
  nodes: [
    { name: "Total", color: "#7c3aed" },
    { name: "Mods", color: "#9333ea" },
    { name: "Charges", color: "#a78bfa" },
    { name: "Repair", color: "#c4b5fd" },
    { name: "Scheduled Maintenance", color: "#ede9fe" },
    { name: "Paperwork & Taxes", color: "#f5f3ff" },
    { name: "Cosmetic Mods", color: "#e9d5ff" },
    { name: "Performance Mods", color: "#d8b4fe" },
    { name: "Insurance", color: "#ddd6fe" },
    { name: "Loan Payment", color: "#c084fc" },
  ],
  links: [
    { source: 0, target: 1, value: 200, color: "#9333ea" },
    { source: 0, target: 2, value: 300, color: "#a78bfa" },
    { source: 0, target: 3, value: 100, color: "#c4b5fd" },
    { source: 0, target: 4, value: 150, color: "#ede9fe" },
    { source: 0, target: 5, value: 80, color: "#f5f3ff" },
    { source: 1, target: 6, value: 120, color: "#e9d5ff" },
    { source: 1, target: 7, value: 80, color: "#d8b4fe" },
    { source: 2, target: 8, value: 180, color: "#ddd6fe" },
    { source: 2, target: 9, value: 120, color: "#c084fc" },
  ],
};

const getNodeValue = (index) => {
  const out = sankeyData.links
    .filter((l) => l.source === index)
    .reduce((sum, l) => sum + l.value, 0);
  const inc = sankeyData.links
    .filter((l) => l.target === index)
    .reduce((sum, l) => sum + l.value, 0);
  return out > 0 ? out : inc;
};

const maxTargetValue = Math.max(
  ...sankeyData.links.map((l) =>
    sankeyData.links
      .filter((link) => link.target === l.target)
      .reduce((sum, link) => sum + link.value, 0)
  ),
  1
);

const renderCustomNode = ({ x, y, width, height, index }) => {
  const node = sankeyData.nodes[index];
  const value = getNodeValue(index);
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={node?.color || "#888"}
        stroke="#222"
        strokeWidth={1}
        rx={4}
      />
      <text
        x={x + width / 2}
        y={y + height / 2 - 6}
        textAnchor="middle"
        alignmentBaseline="middle"
        fill="#222"
        fontSize={8}
        fontWeight="bold"
      >
        {node?.name}
      </text>
      <text
        x={x + width / 2}
        y={y + height / 2 + 10}
        textAnchor="middle"
        alignmentBaseline="middle"
        fill="#444"
        fontSize={6}
      >
        ${value}
      </text>
    </g>
  );
};

const renderCustomLink = ({ sourceX, sourceY, targetX, targetY, index }) => {
  const target = sankeyData.links[index]?.target;
  const totalToTarget = sankeyData.links
    .filter((link) => link.target === target)
    .reduce((sum, link) => sum + link.value, 0);
  const minW = 4,
    maxW = 90;
  const width = minW + ((totalToTarget / maxTargetValue) * (maxW - minW));
  const path = `
    M${sourceX},${sourceY}
    C${(sourceX + targetX) / 2},${sourceY}
     ${(sourceX + targetX) / 2},${targetY}
     ${targetX},${targetY}
  `;
  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke={sankeyData.links[index]?.color || "#fff"}
        strokeWidth={width}
        opacity={0.7}
      />
    </g>
  );
};


// ReceiptForm: update labels, placeholders, buttons, errors
function ReceiptForm({ vehicleId, initialData, onClose, onSaved }) {
  const isEdit = Boolean(initialData);
  const [title, setTitle] = useState(initialData?.title || "");
  const [date, setDate] = useState(
    initialData?.date
      ? new Date(initialData.date.seconds * 1000).toISOString().split("T")[0]
      : ""
  );
  const [category, setCategory] = useState(initialData?.category || "");
  const [mileage, setMileage] = useState(initialData?.mileage || "");
  const [price, setPrice] = useState(initialData?.price || "");
  const [files, setFiles] = useState([]);
  const [existing] = useState(initialData?.urls || []);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null); // For full preview modal
  const [toDelete, setToDelete] = useState([]); // Track files marked for deletion

  // Mark a file for deletion (but don't delete from storage yet)
  const handleMarkDelete = (url) => {
    setToDelete((prev) => [...prev, url]);
  };

  // Unmark a file for deletion
  const handleUnmarkDelete = (url) => {
    setToDelete((prev) => prev.filter((u) => u !== url));
  };

  // Actually delete files from Firebase Storage after Save
  const deleteMarkedFiles = async () => {
    for (const url of toDelete) {
      try {
        // Correction: Remove any accidental path prefix from fileName
        let fileName = decodeURIComponent(url.split("/").pop().split("?")[0]);
        // If fileName contains "listing/", remove everything before the last "/"
        if (fileName.includes("listing/")) {
          fileName = fileName.split("listing/").pop();
          if (fileName.includes("/")) fileName = fileName.split("/").pop();
        }
        const filePath = `listing/${vehicleId}/docs/receipts/${fileName}`;
        await deleteObject(ref(storage, filePath));
      } catch (e) {
        console.error(e);
        toast.error("Error deleting file: " + url);
      }
    }
  };

  const handleSubmit = async () => {
    if (!title || !date || !category || !price) {
      return toast.error("All fields are required");
    }
    setUploading(true);
    try {
      // Ne garder que les URLs existantes non marquées pour suppression
      const keptExisting = existing.filter((url) => !toDelete.includes(url));

      // Upload des nouveaux fichiers en parallèle
      const receiptId =
        initialData?.id ||
        doc(collection(db, `listing/${vehicleId}/receipts`)).id;
      const uploadedUrls = await Promise.all(
        files.map(async (file) => {
          const ext = file.name.substring(file.name.lastIndexOf("."));
          const name = `${receiptId}-${Date.now()}${ext}`;
          const storageRef = ref(
            storage,
            `listing/${vehicleId}/docs/receipts/${name}`
          );
          const snap = await uploadBytesResumable(storageRef, file, {
            customMetadata: { ownerId: auth.currentUser.uid },
          });
          return getDownloadURL(snap.ref);
        })
      );

      // Construction du reçu
      const receipt = {
        title,
        date: new Date(date),
        category,
        mileage: isNaN(+mileage) ? null : +mileage,
        price: +price,
        urls: [...keptExisting, ...uploadedUrls],
        uid: auth.currentUser.uid,
        id: initialData?.id || receiptId, // Ajoute l'id pour l'état local
      };

      await setDoc(
        doc(db, `listing/${vehicleId}/receipts`, receiptId),
        receipt,
        { merge: true }
      );

      // Delete files from storage only after successful save
      await deleteMarkedFiles();

      // --- Update vehicle mileage if needed ---
      const mileageRef = doc(db, "listing", vehicleId);
      const mileageSnap = await getDoc(mileageRef);
      if (mileageSnap.exists()) {
        const vData = mileageSnap.data();
        const currentMileage = Number(vData.mileage) || 0;
        const newMileage = isNaN(+mileage) ? currentMileage : Number(mileage);
        if (newMileage > currentMileage) {
          await setDoc(mileageRef, { mileage: newMileage }, { merge: true });
        }
      }

      // Call the aiEstimator API
      const vehicleSnap2 = await getDoc(doc(db, "listing", vehicleId));
      if (vehicleSnap2.exists()) {
        const vehicleData = vehicleSnap2.data();
        const response = await fetch("/api/aiEstimator", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            make: vehicleData.make,
            model: vehicleData.model,
            year: vehicleData.year,
            mileage: vehicleData.mileage,
            city: vehicleData.city,
            state: vehicleData.state,
            zip: vehicleData.zip,
            color: vehicleData.color,
            title: vehicleData.title,
            vehicleId: vehicleId,
          }),
        });

        if (!response.ok) {
          console.error("Failed to fetch AI estimation");
          toast.error("Failed to fetch AI estimation");
        } else {
          toast.success("AI estimation updated successfully");
        }
      }

      toast.success(isEdit ? "Receipt updated" : "Receipt saved");
      onSaved(receipt); // onSaved va mettre à jour l'état local
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Error saving receipt");
    } finally {
      setUploading(false);
    }
  };

  // Reset all changes if cancel is clicked
  const handleCancel = () => {
    setToDelete([]);
    setFiles([]);
    onClose();
  };

  return (
    <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-70">
      <div className="p-8 w-full max-w-md rounded-lg border shadow-xl bg-neutral-800 border-neutral-700">
        <h2 className="mb-6 text-2xl font-semibold text-center text-white">
          {isEdit ? "Edit Receipt" : "Add Receipt"}
        </h2>
        <input
          placeholder="Title"
          className="p-3 mb-4 w-full text-white rounded border border-neutral-600 bg-neutral-700"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="date"
          className="p-3 mb-4 w-full text-white rounded border border-neutral-600 bg-neutral-700"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <select
          className="p-3 mb-4 w-full text-white rounded border border-neutral-600 bg-neutral-700"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Category</option>
          <option>Repair</option>
          <option>Scheduled Maintenance</option>
          <option>Cosmetic Mods</option>
          <option>Performance Mods</option>
          <option>Paperwork & Taxes</option>
        </select>
        <input
          placeholder="Mileage"
          className="p-3 mb-4 w-full text-white rounded border border-neutral-600 bg-neutral-700"
          value={mileage}
          onChange={(e) => setMileage(e.target.value)}
        />
        <input
          type="number"
          placeholder="Price"
          className="p-3 mb-4 w-full text-white rounded border border-neutral-600 bg-neutral-700"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />

        {/* Existing files preview and delete */}
        {existing.length > 0 && (
          <div className="mb-4">
            <div className="mb-2 font-semibold text-white">Existing Files:</div>
            <div className="flex flex-wrap gap-3">
              {existing.map((url, idx) => {
                const marked = toDelete.includes(url);
                return (
                  <div key={url} className="relative group">
                    <button
                      type="button"
                      onClick={() => setPreviewUrl(url)}
                      style={{
                        padding: 0,
                        border: "none",
                        background: "none",
                        cursor: marked ? "not-allowed" : "pointer",
                        opacity: marked ? 0.4 : 1,
                      }}
                      title={marked ? "Will be deleted" : "Click to enlarge"}
                      disabled={marked}
                    >
                      <Image
                        key={idx}
                        src={url}
                        alt={`Receipt ${idx}`}
                        width={80}
                        height={80}
                        className="object-contain bg-white rounded border"
                      />
                    </button>
                    {/* Delete/Undo button: simple cross, no background */}
                    {marked ? (
                      <button
                        type="button"
                        onClick={() => handleUnmarkDelete(url)}
                        className="absolute top-0 right-0 p-1 text-lg text-green-400 hover:text-green-600"
                        title="Undo delete"
                        style={{ background: "none", border: "none" }}
                      >
                        &#8634;
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleMarkDelete(url)}
                        className="absolute top-0 right-0 p-1 text-lg text-white hover:text-pink-400"
                        title="Mark for deletion"
                        style={{ background: "none", border: "none" }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {toDelete.length > 0 && (
              <div className="mt-2 text-xs text-pink-400">
                Files marked for deletion will be removed after saving.
              </div>
            )}
          </div>
        )}
        {previewUrl && (
          <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-80">
            <div className="flex relative flex-col items-center p-4 w-full max-w-2xl bg-white rounded-lg shadow-xl">
              <button
                className="absolute top-2 right-2 text-2xl text-gray-700 hover:text-pink-500"
                onClick={() => setPreviewUrl(null)}
                title="Close"
                style={{ background: "none", border: "none" }}
              >
                ×
              </button>
              {previewUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <div className="flex justify-center items-center w-full">
                  <Image
                    src={previewUrl}
                    alt="Full preview"
                    width={800}
                    height={600}
                    style={{
                      maxHeight: "75vh",
                      maxWidth: "100%",
                      objectFit: "contain",
                      background: "#fff"
                    }}
                  />
                </div>
              ) : (
                <iframe
                  src={previewUrl}
                  title="PDF Full Preview"
                  className="w-full"
                  style={{ minHeight: "70vh", background: "#fff" }}
                />
              )}
            </div>
          </div>
        )}

        <input
          type="file"
          multiple
          className="mb-4 w-full text-white"
          onChange={(e) => setFiles(Array.from(e.target.files))}
        />
        <div className="flex justify-between">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-white rounded bg-neutral-600 hover:bg-neutral-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={uploading}
            className="button-main"
          >
            {uploading ? "Uploading..." : "Save Receipt"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ReceiptDetailModal: new component for showing receipt details in a popup
function ReceiptDetailModal({ receipt, onClose, aiAnswer }) {
  if (!receipt) return null;
  // On ne gère plus les liens produits, juste la recommandation texte
  return (
    <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-80">
      <div className="relative p-6 w-full max-w-lg rounded-xl border shadow-2xl bg-neutral-900 border-neutral-700">
        <button
          className="absolute top-2 right-2 text-2xl text-white hover:text-pink-400"
          onClick={onClose}
          title="Close"
          style={{ background: "none", border: "none" }}
        >
          ×
        </button>
        <h2 className="mb-4 text-2xl font-bold text-white">Receipt Details</h2>
        <div className="mb-2">
          <span className="font-semibold text-neutral-400">Title: </span>
          <span className="text-white">{receipt.title}</span>
        </div>
        <div className="mb-2">
          <span className="font-semibold text-neutral-400">Date: </span>
          <span className="text-white">
            {receipt.date
              ? new Date(
                  receipt.date.seconds
                    ? receipt.date.seconds * 1000
                    : receipt.date
                )
                  .toISOString()
                  .split("T")[0]
              : ""}
          </span>
        </div>
        <div className="mb-2">
          <span className="font-semibold text-neutral-400">Category: </span>
          <span className="text-white">{receipt.category}</span>
        </div>
        <div className="mb-2">
          <span className="font-semibold text-neutral-400">Mileage: </span>
          <span className="text-white">
            {receipt.mileage !== undefined && receipt.mileage !== null
              ? receipt.mileage
              : "N/A"}
          </span>
        </div>
        <div className="mb-2">
          <span className="font-semibold text-neutral-400">Price: </span>
          <span className="font-bold text-green-400">
            ${Number(receipt.price).toFixed(2)}
          </span>
        </div>
        {/* AI summary + suggestion produit */}
        {aiAnswer && (
          <div className="overflow-y-auto p-3 mt-4 max-h-72 text-sm rounded border bg-neutral-800 border-neutral-700 text-neutral-200">
            <span className="block mb-1 font-semibold text-purple-400">
              AI Summary:
            </span>
            <span>{aiAnswer}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Tooltip component for HelpCircle
function InfoTooltip({ text, children }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="inline-block relative">
      <span
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        tabIndex={0}
        style={{ outline: "none", cursor: "pointer" }}
        className="align-middle"
      >
        {children}
      </span>
      {open && (
        <div
          className="absolute z-50 px-2 py-2 text-xs text-white rounded border shadow-lg bg-neutral-900 border-neutral-700"
          style={{
            minWidth: 180,
            maxWidth: 220,
            left: "50%",
            transform: "translateX(-70%)",
            top: "120%",
            whiteSpace: "pre-line",
            wordBreak: "break-word",
            pointerEvents: "auto",
          }}
        >
          {text}
        </div>
      )}
    </span>
  );
}

// Composant principal
export default function VehicleCardPage() {
  const [showAmazonModal, setShowAmazonModal] = useState(false); // Moved here
  const router = useRouter();
  const [showInfo, setShowInfo] = useState(false);
  const { id } = router.query;

  // Hooks dans un ordre fixe
  const [user, setUser] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [ownerName, setOwnerName] = useState("");
  const [receipts, setReceipts] = useState([]);
  const [images, setImages] = useState([]);
  const [aiRec, setAiRec] = useState("");
  const [timeWindow, setTimeWindow] = useState("Last Year");
  const [isListed, setIsListed] = useState(false);
  const [salePrice, setSalePrice] = useState(null);
  const [showManual, setShowManual] = useState(false);
  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState(null);
  const [allDocs, setAllDocs] = useState([]);
  const [selectedItem, setSelectedItem] = useState("Total Spent");
  // Added state for enlarged image index
  const [enlargedIdx, setEnlargedIdx] = useState(null);
  // for charges
    const [showInsurance, setShowInsurance] = useState(false);
  const [insuranceCost, setInsuranceCost] = useState(0);
  const [insuranceLength, setInsuranceLength] = useState(0);
  const [insuranceStart, setInsuranceStart] = useState("");
  const [manualInsuranceMonthly, setManualInsuranceMonthly] = useState("");



  const [showOwnership, setShowOwnership] = useState(false);
  const [ownershipType, setOwnershipType] = useState("");
  const [loanAmount, setLoanAmount] = useState(0);
  const [loanLength, setLoanLength] = useState(0);
  const [interestRate, setInterestRate] = useState(0);
  const [loanStart, setLoanStart] = useState("");
  const [manualMonthlyPayment, setManualMonthlyPayment] = useState("");
  // Add state definition for marketplace modal:
  const [showMarketplaceModal, setShowMarketplaceModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    year: "",
    make: "",
    model: "",
    city: "",
    state: "",
    vin: "",
    mileage: "",
    color: "",
    engine: "",
    transmission: "",
    horsepower: "",
    fuelType: "",
    vehicleType: "",
    boughtAt: "",
    purchaseYear: "",
    // Additional maintenance fields
    withoutPurchasePrice: "",
    repairCost: "",
    scheduledMaintenance: "",
    cosmeticMods: "",
    performanceMods: "",
  });
  const [aiQuestion, setAiQuestion] = useState(""); // State for the question
  const [aiAnswer, setAiAnswer] = useState(""); // State for the AI's answer
  const [loadingAiQuestion, setLoadingAiQuestion] = useState(false); // Renamed to avoid conflict
  // Ajout de l'état manquant pour les maintenance records
  const [, setLoadingMaintenanceRec] = useState(false);
  const [loading, setLoading] = useState(true);

  // Add state for receipt popup
  const [receiptPopup, setReceiptPopup] = useState(null);
  const [receiptAiAnswer, setReceiptAiAnswer] = useState(""); // Ajout pour l'IA

  // Supprime définitivement Storage + Firestore
  const handleFullDelete = async (receipt) => {
    try {
      await Promise.all(
        (receipt.urls || []).map(async (url) => {
          // Correction: Remove any accidental path prefix from fileName
          let fileName = decodeURIComponent(url.split("/").pop().split("?")[0]);
          if (fileName.includes("listing/")) {
            fileName = fileName.split("listing/").pop();
            if (fileName.includes("/")) fileName = fileName.split("/").pop();
          }
          const filePath = `listing/${id}/docs/receipts/${fileName}`;
          await deleteObject(ref(storage, filePath));
        })
      );
      await deleteDoc(doc(db, `listing/${id}/receipts`, receipt.id));
      setReceipts((prev) => prev.filter((r) => r.id !== receipt.id));
      toast.success("Receipt supprimé définitivement");
    } catch (e) {
      console.error("Error deleting receipt:", e);
      toast.error("Impossible de supprimer le receipt");
    }
  };

  // Partage de la page via Web Share API ou copie du lien
  const handleShare = async () => {
    try {
      const userRef = doc(db, "members", auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return console.error("User data not found.");
      const { firstName } = userSnap.data();
      const shareData = {
        title: `${firstName} invites you to check this ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        url: window.location.href,
      };
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast.success("Link copied to clipboard!");
      }
    } catch (e) {
      console.error("Error sharing:", e);
      toast.error("Unable to share");
    }
  };

  useEffect(() => setLogLevel("debug"), []);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) router.push("/Welcome_page");
      else setUser(u);
    });
    return unsub;
  }, [router]);

  // Fetch global data
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    (async () => {
      const snapV = await getDoc(doc(db, "listing", id));
      if (!snapV.exists()) return;
      const v = snapV.data();
      setVehicle(v);
      setAiRec(v.aiRecommendation || "No AI recommendation");

      const snapU = await getDoc(doc(db, "members", v.uid));
      setOwnerName(snapU.data()?.firstName || "");

      const snapR = await getDocs(collection(db, `listing/${id}/receipts`));
      setReceipts(
        snapR.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0))
      );

      // Correction: fetch all images in the photo folder, not just the first 4
      const listPhotos = await listAll(ref(storage, `listing/${id}/photos/`));
      const urls = await Promise.all(
        listPhotos.items.map((i) => getDownloadURL(i))
      );
      setImages(urls);

      const mpSnap = await getDoc(doc(db, "on_marketplace", id));
      if (mpSnap.exists()) {
        setIsListed(true);
        setSalePrice(mpSnap.data().price);
      }

      const docsList = await listAll(ref(storage, `listing/${id}/docs/`));
      const docs = await Promise.all(
        docsList.items.map(async (item) => ({
          name: item.name,
          url: await getDownloadURL(item),
        }))
      );
      setAllDocs(docs);
      setLoading(false);
    })();
  }, [id]);

  // Update AI value estimation
  useEffect(() => {
    if (!id) return;

    async function fetchVehicleData() {
      try {
        // Fetch vehicle data from Firestore
        const vehicleRef = doc(db, "listing", id);
        const vehicleSnap = await getDoc(vehicleRef);

        if (vehicleSnap.exists()) {
          const vehicleData = vehicleSnap.data();
          setVehicle(vehicleData);

          // Call the aiEstimator API for this vehicle
          const response = await fetch("/api/aiEstimator", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              make: vehicleData.make,
              model: vehicleData.model,
              year: vehicleData.year,
              mileage: vehicleData.mileage,
              city: vehicleData.city,
              state: vehicleData.state,
              zip: vehicleData.zip,
              color: vehicleData.color,
              title: vehicleData.title,
              vehicleId: id,
            }),
          });

          if (!response.ok) {
            console.error("Failed to fetch AI estimation");
            toast.error("Failed to fetch AI estimation");
          } else {
            // Refetch the vehicle data to get the updated `ai_estimated_value`
            const updatedVehicleSnap = await getDoc(vehicleRef);
            if (updatedVehicleSnap.exists()) {
              setVehicle(updatedVehicleSnap.data());
            }
          }
        } else {
          console.error("Vehicle not found in Firestore.");
          toast.error("Vehicle not found.");
        }
      } catch (error) {
        console.error("Error fetching vehicle data:", error);
        toast.error("Error fetching vehicle data.");
      }
    }

    fetchVehicleData();
  }, [id]);

  // Update formData when vehicle is loaded in edit mode
  useEffect(() => {
    if (vehicle && editMode) {
      setFormData({
        year: vehicle.year || "",
        make: vehicle.make || "",
        model: vehicle.model || "",
        city: vehicle.city || "",
        state: vehicle.state || "",
        vin: vehicle.vin || "",
        mileage: vehicle.mileage || "",
        color: vehicle.color || "",
        engine: vehicle.engine || "",
        transmission: vehicle.transmission || "",
        horsepower: vehicle.horsepower || "",
        fuelType: vehicle.fuelType || "",
        vehicleType: vehicle.vehicleType || "",
        boughtAt: vehicle.boughtAt || "",
        purchaseYear: vehicle.purchaseYear || "",
        withoutPurchasePrice: vehicle.withoutPurchasePrice || "",
        repairCost: vehicle.repairCost || "",
        scheduledMaintenance: vehicle.scheduledMaintenance || "",
        cosmeticMods: vehicle.cosmeticMods || "",
        performanceMods: vehicle.performanceMods || "",
        description: vehicle.description || "", // added to load existing description
      });
    }
  }, [vehicle, editMode]);

    const handleSaveInsurance = async () => {
  if (!id) {
    console.error("No vehicle ID");
    return;
  }
  const insuranceData = {
    insuranceCost,
    insuranceLength,
    insuranceStart,
    manualInsuranceMonthly,
  };

  const docRef = doc(db, "listing", id); // use id here!

  try {
    await updateDoc(docRef, {
      insuranceInfo: insuranceData,
    });
    setShowInsurance(false);
  } catch (err) {
    console.error("Failed to save insurance info:", err);
  }
};
const handleSaveOwnership = async () => {
  if (!id) {
    console.error("No vehicle ID");
    return;
  }
  const ownershipData = {
    ownershipType,
    loanAmount,
    loanLength,
    interestRate,
    loanStart,
    manualMonthlyPayment,
  };

  const docRef = doc(db, "listing", id); // use id here!

  try {
    await updateDoc(docRef, {
      ownershipInfo: ownershipData,
    });
    setShowOwnership(false);
  } catch (err) {
    console.error("Failed to save ownership info:", err);
  }
};

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  // Update the form submit handler in edit mode to use native alert like in remove from marketplace
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, "listing", id), formData, { merge: true });
      setVehicle({ ...vehicle, ...formData });
      toast.success("Vehicle updated successfully"); // Native alert on save
      setEditMode(false);
    } catch {
      toast.error("Error updating vehicle");
    }
  };

  const askAi = async () => {
    if (!aiQuestion.trim()) return toast.error("Veuillez entrer une question.");
    setLoadingAiQuestion(true);
    try {
      console.log("Données envoyées à l'API AI :", {
        prompt: aiQuestion,
        vehicleId: id,
        vehicleDetails: vehicle,
      });
      const res = await fetch("/api/aiMaintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiQuestion,
          vehicleId: id,
          vehicleDetails: vehicle,
        }),
      });
      const data = await res.json();
      console.log("Réponse de l'API AI :", data);
      if (!res.ok) throw new Error(data.error || "Erreur");
      setAiAnswer(data.answer || "Aucune réponse disponible.");
    } catch (e) {
      console.error("Erreur API AI :", e.message);
      setAiAnswer(`Erreur : ${e.message}`);
    } finally {
      setLoadingAiQuestion(false);
    }
  };

  // Fonction pour obtenir la recommandation de maintenance basée sur le mileage
  const fetchMaintenanceRec = async () => {
    setLoadingMaintenanceRec(true);

    try {
      // Fetch the vehicle document from Firestore
      const snap = await getDoc(doc(db, "listing", id));
      if (!snap.exists()) {
        throw new Error("Vehicle not found");
      }

      // Get the aiRecommendation field from the document
      const vehicleData = snap.data();
      setAiRec(
        vehicleData.aiRecommendation || "No AI recommendation available."
      );
    } catch (error) {
      console.error("Error fetching AI recommendation:", error.message);
      setAiRec("Error fetching AI recommendation.");
    } finally {
      setLoadingMaintenanceRec(false);
    }
  };

  // Rafraîchir la recommandation à l'affichage ou si le mileage change
  useEffect(() => {
    if (
      vehicle?.mileage &&
      vehicle?.engine &&
      vehicle?.model &&
      vehicle?.year
    ) {
      fetchMaintenanceRec();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle?.mileage, vehicle?.engine, vehicle?.model, vehicle?.year]);

  // Marketplace handlers
  const confirmAdd = async (priceInput) => {
    const price = parseFloat(priceInput);
    if (isNaN(price) || price <= 0) {
      toast.error("Please enter a valid price");
      return;
    }
    try {
      await setDoc(doc(db, "on_marketplace", id), { listingId: id, price });
      setIsListed(true);
      setSalePrice(price);
      toast.success("Vehicle listed!");
    } catch {
      toast.error("Unable to list vehicle");
    }
  };
  const removeFromMarketplace = async () => {
    try {
      await deleteDoc(doc(db, "on_marketplace", id));
      setIsListed(false);
      setSalePrice(null);
      toast.info("Vehicle removed from marketplace");
    } catch {
      toast.error("Unable to remove vehicle");
    }
  };

  // Chart base
  const baseChart = useMemo(() => {
    if (!vehicle?.boughtAt || !vehicle?.purchaseYear)
      // Correction : Utilisation de purchaseYear
      return { labels: [], datasets: [] };
    const purchasePrice = vehicle.boughtAt;
    const purchaseYear = Number(vehicle.purchaseYear); // Correction : Utilisation de purchaseYear
    const now = new Date();
    let start = new Date(now),
      countPoints = 0;
    if (timeWindow === "Last Week") {
      start.setDate(now.getDate() - 7);
      countPoints = 7;
    } else if (timeWindow === "Last Month") {
      start.setMonth(now.getMonth() - 1);
      countPoints = 8;
    } else {
      start.setFullYear(now.getFullYear() - 1);
      countPoints = 12;
    }
    const dates = Array.from(
      { length: countPoints },
      (_, i) =>
        new Date(
          start.getTime() +
            (now.getTime() - start.getTime()) * (i / (countPoints - 1))
        )
    );
    const rate = 0.15;
    const k = 0.18;
    const straight = dates.map(
      (d) =>
        purchasePrice *
        Math.pow(1 - rate, d.getFullYear() + d.getMonth() / 12 - purchaseYear)
    );
    const exponential = dates.map(
      (d) =>
        purchasePrice *
        Math.exp(-k * (d.getFullYear() + d.getMonth() / 12 - purchaseYear))
    );
    const straightSeries = dates.map((d, i) => ({
      x: d.getTime(),
      y: straight[i],
    }));
    const expSeries = dates.map((d, i) => ({
      x: d.getTime(),
      y: exponential[i],
    }));
    return {
      labels: [], // datetime axis ignore labels array
      datasets: [
        {
          label: "Straight",
          data: straightSeries,
          fill: false,
          borderWidth: 2,
        },
        { label: "Exponential", data: expSeries, fill: false, borderWidth: 2 },
      ],
    };
  }, [vehicle, timeWindow]);

  // Chart avec points AI
  const chartData = useMemo(() => {
    if (!vehicle || !Array.isArray(vehicle.ai_estimated_value)) {
      console.warn("Vehicle data or AI estimated values are missing.");
      return {
        ...baseChart,
        datasets: [...baseChart.datasets],
      };
    }

    const aiArray = vehicle.ai_estimated_value;
    const now = new Date();
    let startDate = new Date(now),
      countPoints = 0;
    if (timeWindow === "Last Week") {
      startDate.setDate(now.getDate() - 7);
      countPoints = 7;
    } else if (timeWindow === "Last Month") {
      startDate.setMonth(now.getMonth() - 1);
      countPoints = 8;
    } else {
      startDate.setFullYear(now.getFullYear() - 1);
      countPoints = 12;
    }

    // Parse and filter AI points based on the time window
    const aiRaw = aiArray
      .map((e) => {
        const [val, date] = e.split(/-(.+)/);
        const d = new Date(date);
        return isNaN(d) ? null : { x: d, y: +val };
      })
      .filter((p) => p && p.x >= startDate && p.x <= now);

    // Downsample to countPoints
    const sampledAi = [];
    if (aiRaw.length && countPoints > 1) {
      for (let i = 0; i < countPoints; i++) {
        const idx = Math.floor((i * (aiRaw.length - 1)) / (countPoints - 1));
        const pt = aiRaw[idx];
        sampledAi.push({ x: pt.x.getTime(), y: pt.y });
      }
    } else {
      sampledAi.push(...aiRaw.map((pt) => ({ x: pt.x.getTime(), y: pt.y })));
    }

    // Add a point for `boughtAt` using `createdAt` as the x-axis, and filter it
    const boughtAtPoint =
      vehicle?.boughtAt && vehicle?.createdAt
        ? { x: new Date(vehicle.createdAt.seconds * 1000), y: vehicle.boughtAt }
        : null;
    const filteredBoughtAtPoint =
      boughtAtPoint && boughtAtPoint.x >= startDate && boughtAtPoint.x <= now
        ? { x: boughtAtPoint.x.getTime(), y: boughtAtPoint.y }
        : null;

    return {
      ...baseChart,
      datasets: [
        ...baseChart.datasets,
        {
          label: "AI Estimated",
          data: sampledAi,
          parsing: false,
          pointRadius: 4,
          borderColor: "blue",
          backgroundColor: "blue",
        },
        {
          label: "Bought At",
          data: filteredBoughtAtPoint ? [filteredBoughtAtPoint] : [],
          borderColor: "red",
          backgroundColor: "red",
          pointRadius: 6,
          pointStyle: "circle",
        },
      ],
    };
  }, [baseChart, vehicle, timeWindow]);

  // Ajout : calcul des valeurs AI pour éviter ReferenceError
  const rawAiData =
    chartData.datasets.find((ds) => ds.label === "AI Estimated")?.data || [];
  const aiSeries =
    rawAiData.map((pt) => (pt && pt.y !== undefined ? pt.y : Number(pt))) || [];
  const aiCurrentValue =
    aiSeries.length > 0 ? aiSeries[aiSeries.length - 1] : 0;
  const aiVariationPct =
    aiSeries.length > 1
      ? ((aiCurrentValue / aiSeries[0] - 1) * 100).toFixed(2)
      : null;

  // Si l'utilisateur n'est pas connecté, rediriger vers la page de bienvenue
  if (!user) return null;
  if (loading || !vehicle) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-zinc-900">
        <Loader2 className="mb-4 w-12 h-12 text-purple-500 animate-spin" />
        <span className="text-lg text-white">Loading vehicle...</span>
      </div>
    );
  }

  // Si en mode édition, afficher le formulaire refait
  if (editMode) {
    return (
      <div className="flex justify-center items-center px-4 py-10 min-h-screen bg-gradient-to-b from-neutral-900 to-neutral-800">
        <div className="p-8 w-full max-w-6xl rounded-lg shadow-2xl bg-neutral-800">
          <h1 className="mb-8 text-4xl font-bold text-center md:mt-14">
            Edit Vehicle
          </h1>
          <form
            onSubmit={handleFormSubmit}
            className="grid grid-cols-1 gap-6 md:grid-cols-3"
          >
            {/* General Fields */}
            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-semibold">Year</label>
                <input
                  type="text"
                  name="year"
                  value={formData.year}
                  onChange={handleFormChange}
                  className="p-2 w-full rounded-md border border-neutral-600 bg-neutral-700"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">Make</label>
                <input
                  type="text"
                  name="make"
                  value={formData.make}
                  onChange={handleFormChange}
                  className="p-2 w-full rounded-md border border-neutral-600 bg-neutral-700"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Model
                  <input
                    type="text"
                    name="model"
                    value={formData.model}
                    onChange={handleFormChange}
                    className="p-2 w-full rounded-md border border-neutral-600 bg-neutral-700"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  City
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleFormChange}
                    className="p-2 w-full rounded-md border border-neutral-600 bg-neutral-700"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  State
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleFormChange}
                    className="p-2 w-full rounded-md border border-neutral-600 bg-neutral-700"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  VIN
                  <input
                    type="text"
                    name="vin"
                    value={formData.vin}
                    onChange={handleFormChange}
                    className="p-2 w-full rounded-md border border-neutral-600 bg-neutral-700"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Mileage
                  <input
                    type="number"
                    name="mileage"
                    value={formData.mileage}
                    onChange={handleFormChange}
                    className="p-2 w-full rounded-md border border-neutral-600 bg-neutral-700"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Color
                  <input
                    type="text"
                    name="color"
                    value={formData.color}
                    onChange={handleFormChange}
                    className="p-2 w-full rounded-md border border-neutral-600 bg-neutral-700"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Without Purchase Price
                  <input
                    type="number"
                    name="withoutPurchasePrice"
                    value={formData.withoutPurchasePrice}
                    onChange={handleFormChange}
                    className="p-2 w-full rounded-md border border-neutral-600 bg-neutral-700"
                    placeholder="Enter total without purchase price"
                  />
                </label>
              </div>
            </div>
            {/* Technical Fields */}
            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Engine
                  <input
                    type="text"
                    name="engine"
                    value={formData.engine}
                    onChange={handleFormChange}
                    className="p-2 w-full rounded-md border border-neutral-600 bg-neutral-700"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Transmission
                  <input
                    type="text"
                    name="transmission"
                    value={formData.transmission}
                    onChange={handleFormChange}
                    className="p-2 w-full rounded-md border border-neutral-600 bg-neutral-700"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Horsepower
                  <input
                    type="text"
                    name="horsepower"
                    value={formData.horsepower}
                    onChange={handleFormChange}
                    className="p-2 w-full rounded-md border border-neutral-600 bg-neutral-700"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Fuel Type
                  <input
                    type="text"
                    name="fuelType"
                    value={formData.fuelType}
                    onChange={handleFormChange}
                    className="p-2 w-full rounded-md border border-neutral-600 bg-neutral-700"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Vehicle Type
                  <input
                    type="text"
                    name="vehicleType"
                    value={formData.vehicleType}
                    onChange={handleFormChange}
                    className="p-2 w-full rounded-md border border-neutral-600 bg-neutral-700"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Purchase Price
                  <input
                    type="number"
                    name="boughtAt"
                    value={formData.boughtAt}
                    onChange={handleFormChange}
                    className="p-2 w-full rounded-md border border-neutral-600 bg-neutral-700"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Purchase Year
                  <input
                    type="number"
                    name="purchaseYear"
                    value={formData.purchaseYear}
                    onChange={handleFormChange}
                    className="p-2 w-full rounded-md border border-neutral-600 bg-neutral-700"
                  />
                </label>
              </div>
            </div>
            {/* Maintenance Fields */}
            <div className="space-y-4">
              <div>
                {/* Fixed the label syntax */}
                <label>
                  Repair Cost
                  <input
                    type="number"
                    name="repairCost"
                    value={formData.repairCost}
                    onChange={handleFormChange}
                    className="p-2 w-full rounded-md border border-neutral-600 bg-neutral-700"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Scheduled Maintenance
                  <input
                    type="number"
                    name="scheduledMaintenance"
                    value={formData.scheduledMaintenance}
                    onChange={handleFormChange}
                    className="p-2 w-full rounded-md border border-neutral-600 bg-neutral-700"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Cosmetic Mods
                  <input
                    type="number"
                    name="cosmeticMods"
                    value={formData.cosmeticMods}
                    onChange={handleFormChange}
                    className="p-2 w-full rounded-md border border-neutral-600 bg-neutral-700"
                  />
                </label>
              </div>
              <div>
                <label className="block mb-1 text-sm font-semibold">
                  Performance Mods
                  <input
                    type="number"
                    name="performanceMods"
                    value={formData.performanceMods}
                    onChange={handleFormChange}
                    className="p-2 w-full rounded-md border border-neutral-600 bg-neutral-700"
                  />
                </label>
              </div>
            </div>
            {/* Full-width Description Field */}
            <div className="md:col-span-3">
              <label className="block mb-1 text-sm font-semibold">
                Description
                <textarea
                  name="description"
                  value={formData.description || ""}
                  onChange={handleFormChange}
                  className="p-2 w-full rounded-md border resize-y border-neutral-600 bg-neutral-700"
                  rows="4"
                  placeholder="Edit vehicle description..."
                ></textarea>
              </label>
            </div>
            <div className="flex justify-center mt-6 space-x-6 md:col-span-3">
              <button
                type="submit"
                className="px-6 py-3 font-medium bg-green-600 rounded hover:bg-green-700"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="px-6 py-3 font-medium rounded bg-neutral-600 hover:bg-neutral-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // add helper to request fullscreen
  // function requestFullScreen(el) {
  //   if (el.requestFullscreen) el.requestFullscreen();
  // }

  const removeDocument = async (docType) => {
    const docObj = allDocs.find((d) => d.name.toLowerCase().includes(docType));
    if (!docObj) return toast.error("No document found");
    const path = `listing/${id}/docs/${docObj.name}`;
    try {
      await deleteObject(ref(storage, path)); // Assurez-vous que l'utilisateur a les permissions nécessaires
      toast.success("Document removed");
      setAllDocs((prev) => prev.filter((d) => d.name !== docObj.name));
    } catch (e) {
      console.error(e);
      toast.error("Error removing document");
    }
  };

  // Nouvelle fonction getMetricValue selon la consigne
  function getMetricValue(label) {
    const receiptsTotal = receipts.reduce(
      (sum, r) => sum + (Number(r.price) || 0),
      0
    );
    const purchase = Number(vehicle?.boughtAt) || 0;
    // initial input costs
    const initRepair = Number(vehicle?.repairCost) || 0;
    const initScheduled = Number(vehicle?.scheduledMaintenance) || 0;
    const initCosmetic = Number(vehicle?.cosmeticMods) || 0;
    const initPerformance = Number(vehicle?.performanceMods) || 0;
    const initCosts =
      initRepair + initScheduled + initCosmetic + initPerformance;

    switch (label) {
      case "Total Spent":
        return purchase + initCosts + receiptsTotal;
      case "Total Expenses":
        return initCosts + receiptsTotal;
      case "Repair":
        return (
          initRepair +
          receipts
            .filter((r) => r.category === "Repair")
            .reduce((sum, r) => sum + (Number(r.price) || 0), 0)
        );
      case "Scheduled Maintenance":
        return (
          initScheduled +
          receipts
            .filter((r) => r.category === "Scheduled Maintenance")
            .reduce((sum, r) => sum + (Number(r.price) || 0), 0)
        );
      case "Cosmetic Mods":
        return (
          initCosmetic +
          receipts
            .filter((r) => r.category === "Cosmetic Mods")
            .reduce((sum, r) => sum + (Number(r.price) || 0), 0)
        );
      case "Performance Mods":
        return (
          initPerformance +
          receipts
            .filter((r) => r.category === "Performance Mods")
            .reduce((sum, r) => sum + (Number(r.price) || 0), 0)
        );
      case "Paperwork & Taxes":
        return receipts
          .filter((r) => r.category === "Paperwork & Taxes")
          .reduce((sum, r) => sum + (Number(r.price) || 0), 0);
      default:
        return 0;
    }
  }

  // HorizontalCardsWithDots component
  function HorizontalCardsWithDots({ cards }) {
    const [current, setCurrent] = useState(0);
    const scrollRef = React.useRef(null);

    // Scroll to card when current changes
    useEffect(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          left: scrollRef.current.offsetWidth * current,
          behavior: "smooth",
        });
      }
    }, [current]);

    return (
      <div>
        {/* Dots tracker */}
        <div className="flex justify-center mb-2 space-x-2">
          {cards.map((_, idx) => (
            <button
              key={idx}
              className={`w-3 h-3 rounded-full border border-white transition-all ${
                current === idx ? "bg-white" : "bg-transparent"
              }`}
              style={{ outline: "none" }}
              onClick={() => setCurrent(idx)}
              aria-label={`Go to card ${idx + 1}`}
            />
          ))}
        </div>
        {/* Cards scrollable */}
        <div
          ref={scrollRef}
          className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
          style={{ scrollBehavior: "smooth" }}
          onScroll={(e) => {
            const idx = Math.round(e.target.scrollLeft / e.target.offsetWidth);
            if (idx !== current) setCurrent(idx);
          }}
        >
          {cards.map((card, idx) => (
            <div
              key={idx}
              className="px-1 min-w-full snap-center"
              style={{ flex: "0 0 100%" }}
            >
              {card}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Add this function inside VehicleCardPage (before return)
  async function handleOpenReceiptPopup(receipt) {
    setReceiptPopup(receipt);
    setReceiptAiAnswer(""); // reset
    try {
      const res = await fetch("/api/aiMaintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Give me insights about this receipt: ${receipt.title}, category: ${receipt.category}, price: ${receipt.price}, mileage: ${receipt.mileage}. Then, always search for and suggest a real, relevant product for this repair or maintenance, matching the vehicle (${vehicle?.year} ${vehicle?.make} ${vehicle?.model}), using Google or another search engine, and provide a direct purchase link (Amazon, eBay, or manufacturer). Format: [summary]\nProduct suggestion: [product name] [URL]`,
          vehicleId: id,
          vehicleDetails: vehicle,
        }),
      });
      const data = await res.json();
      if (res.ok && data.answer) setReceiptAiAnswer(data.answer);
    } catch {
      setReceiptAiAnswer("AI unavailable.");
    }
  }

  // Si l'utilisateur n'est pas connecté, rediriger vers la page de bienvenue
  if (!user) return null;
  if (loading || !vehicle) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-zinc-900">
        <Loader2 className="mb-4 w-12 h-12 text-purple-500 animate-spin" />
        <span className="text-lg text-white">Loading vehicle...</span>
      </div>
    );
  }

  return (
    <>
      <ToastContainer />
      <div className="container px-4 py-10 mx-auto text-white md:pt-3 bg-zinc-900">
        {/* Header */}
        <header className="flex gap-2 justify-center items-center pt-8 mb-8 text-center">
          <h1 className="text-4xl font-bold">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h1>
          <button
            onClick={handleShare}
            className="flex justify-center items-center ml-3 w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition hover:from-purple-600 hover:to-pink-600"
            title="Share this vehicle"
            type="button"
          >
            <Share2 className="w-6 h-6 text-white" />
          </button>
        </header>
        {/* Gallery + Vehicle Info Section */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* Photo gallery: display only 4 images */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-2">
            {images.slice(0, 4).map((url, i) => (
              <div
                key={i}
                className="relative pb-[100%] cursor-pointer rounded-lg shadow-lg transition transform hover:scale-105"
                onClick={() => setEnlargedIdx(i)}
              >
                <Image
                  src={url}
                  alt={`Vehicle ${i}`}
                  fill
                  className="object-cover rounded-lg"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center mb-2 md:hidden">
            <h2 className="text-2xl font-bold">Vehicle Info</h2>
            <button
              onClick={() => setShowInfo((v) => !v)}
              className="p-2 ml-3 transition group" // No rounded, no bg, just padding for click area
              title={showInfo ? "Hide Info" : "Show Info"}
              type="button"
            >
              {showInfo ? (
                <ChevronUp className="w-6 h-6 text-purple-400 transition-colors group-hover:text-pink-500" />
              ) : (
                <ChevronDown className="w-6 h-6 text-purple-400 transition-colors group-hover:text-pink-500" />
              )}
            </button>
          </div>

          {/* Vehicle Info & Actions Card */}
          <div
            className={`p-6 border rounded-lg shadow-lg bg-neutral-800 border-neutral-700 ${
              showInfo ? "":"hidden"} md:block`}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-3xl font-bold">Vehicle Info</h2>
              {user.uid === vehicle.uid && (
                <button
                  onClick={() => setEditMode(true)}
                  className="p-1 transition group"
                  title="Edit Vehicle"
                  type="button"
                >
                  <Edit className="w-6 h-6 text-purple-400 transition-colors group-hover:text-pink-500" />
                </button>
              )}
            </div>
            {/* Updated Vehicle Info container: force 2 columns on all screens */}
            <div className="grid grid-cols-2 gap-4 text-base">
              {[
                { label: "Year", value: vehicle.year },
                { label: "Make", value: vehicle.make },
                { label: "Model", value: vehicle.model },
                { label: "City", value: vehicle.city },
                { label: "State", value: vehicle.state },
                { label: "VIN", value: vehicle.vin },
                { label: "Mileage", value: vehicle.mileage },
                { label: "Color", value: vehicle.color },
                { label: "Engine", value: vehicle.engine },
                { label: "Transmission", value: vehicle.transmission },
                {
                  label: "Horsepower",
                  value: vehicle.horsepower
                    ? `${vehicle.horsepower} HP`
                    : "N/A",
                },
                { label: "Fuel Type", value: vehicle.fuelType },
                { label: "Vehicle Type", value: vehicle.vehicleType || "N/A" },
                {
                  label: "Purchase Price",
                  value: vehicle.boughtAt ? `$${vehicle.boughtAt}` : "N/A",
                },
                {
                  label: "Purchase Year",
                  value: vehicle.purchaseYear || "N/A",
                },
                { label: "Owner", value: ownerName },
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col text-left">
                  <div className="flex items-center">
                    {icons[item.label]}
                    <span className="mr-2 text-base text-neutral-400">
                      {item.label}:
                    </span>
                  </div>
                  <span className="text-lg font-medium">
                    {item.label === "Color" ? (
                      <>
                        <span
                          className="inline-block mr-1 w-3 h-3 rounded-full"
                          style={{
                            backgroundColor:
                              vehicle.color?.toLowerCase() || "#ccc",
                          }}
                        />
                        {item.value}
                      </>
                    ) : (
                      item.value || "N/A"
                    )}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <h3 className="flex items-center mb-1 text-xl font-medium">
                <Info className="mr-2 w-4 h-4" /> Vehicle Condition
              </h3>
              <span className="inline-block px-3 py-1 text-base font-semibold text-green-800 bg-green-200 rounded-xl">
                Excellent
              </span>
            </div>
          </div>
        </div>
        {/* Enlarged image modal showing full gallery */}
        {enlargedIdx !== null && (
          <div
            className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-75"
            onClick={() => setEnlargedIdx(null)}
          >
            {/* Left arrow */}
            {images.length > 1 && (
              <button
                className="absolute left-4 z-10 p-3 text-white bg-gray-800 rounded-xl shadow-lg hover:bg-gray-700"
                style={{ top: "50%", transform: "translateY(-50%)" }}
                onClick={(e) => {
                  e.stopPropagation();
                  setEnlargedIdx((prev) =>
                    prev > 0 ? prev - 1 : images.length - 1
                  );
                }}
                aria-label="Previous image"
              >
                &#8249;
              </button>
            )}
            {/* Close button */}
            <button
              className="absolute top-4 right-4 text-2xl text-white hover:text-gray-300"
              onClick={() => setEnlargedIdx(null)}
            >
              &times;
            </button>
            <div className="relative w-full max-w-2xl max-h-[80vh] flex items-center">
              <Image
                src={images[enlargedIdx]}
                alt={`Vehicle ${enlargedIdx}`}
                className="object-contain max-w-full max-h-full"
                width={1000}
                height={700}
                priority
              />
            </div>
            {/* Right arrow */}
            {images.length > 1 && (
              <button
                className="absolute right-4 z-10 p-3 text-white bg-gray-800 rounded-full shadow-lg hover:bg-gray-700"
                style={{ top: "50%", transform: "translateY(-50%)" }}
                onClick={(e) => {
                  e.stopPropagation();
                  setEnlargedIdx((prev) =>
                    prev < images.length - 1 ? prev + 1 : 0
                  );
                }}
                aria-label="Next image"
              >
                &#8250;
              </button>
            )}
          </div>
        )}
        {/* NEW: Description Card */}
        <div className="p-6 mx-auto mt-8 max-w-4xl rounded-lg border shadow-lg bg-neutral-800 border-neutral-700">
          <h2 className="mb-4 text-3xl font-bold">Description</h2>
          <p className="text-xl">
            {vehicle.description || "No description provided"}
          </p>
        </div>
        {/* Maintenance & Receipts Card */}
        <div className="p-6 mx-auto mt-8 max-w-4xl rounded-lg border shadow-lg bg-neutral-800 border-neutral-700">
          <div className="flex justify-between items-center pb-2 mb-4 border-b">
            <h2 className="text-3xl font-bold text-white">
              Maintenance & Receipts
            </h2>
            {!vehicle.ownerManual ? (
              <button
                onClick={() => setShowManual(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded hover:bg-purple-700"
              >
                Sync Owner Manual
              </button>
            ) : (
              <span className="text-xs italic text-neutral-600">
                Owner Manual Synced
              </span>
            )}
          </div>
          <div className="flex justify-items-center space-x-4">
            {/* Dropdown for selecting a value */}
            <div className="flex flex-col gap-4 justify-items-center mx-auto">
              <select
                className="p-2 text-lg text-white border rounded bg-neutral-700 border-neutral-600 min-w-[160px]"
                value={selectedItem || ""}
                onChange={(e) => setSelectedItem(e.target.value)}
              >
                <option value="" disabled>
                  Select a value
                </option>
                {[
                  "Total Spent",
                  "Total Expenses",
                  "Repair",
                  "Scheduled Maintenance",
                  "Cosmetic Mods",
                  "Performance Mods",
                  "Paperwork & Taxes",
                ].map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>

              {/* Value card */}
              <div className="flex flex-col justify-center items-start min-w-[160px] px-6 py-4 rounded-lg bg-neutral-900 border border-neutral-700 shadow-lg">
                {selectedItem ? (
                  <>
                    <span className="text-xl font-semibold text-white">
                      {selectedItem}
                    </span>
                    <span className="mt-1 text-3xl font-bold text-green-400">
                      ${getMetricValue(selectedItem).toFixed(2)}
                    </span>
                  </>
                ) : (
                  <span className="text-base text-neutral-400">
                    Select a value to see its amount
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 text-base font-semibold text-white">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-2xl font-semibold text-white">
                AI Recommendation
              </h3>
              <button
                onClick={async () => {
                  try {
                    // Call the analyzeManual API directly
                    const res = await fetch("/api/analyzeManual", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        vehicleId: id,
                        currentMileage: vehicle.mileage,
                      }),
                    });

                    if (!res.ok) {
                      throw new Error(
                        `API error: ${res.status} ${res.statusText}`
                      );
                    }

                    // Fetch the updated aiRecommendation field from Firestore
                    const snap = await getDoc(doc(db, "listing", id));
                    if (!snap.exists()) {
                      throw new Error("Vehicle not found");
                    }

                    const vehicleData = snap.data();
                    setAiRec(
                      vehicleData.aiRecommendation ||
                        "No AI recommendation available."
                    );
                    toast.success("AI Recommendation refreshed successfully!");
                  } catch (error) {
                    console.error(
                      "Error refreshing AI recommendation:",
                      error.message
                    );
                    toast.error("Failed to refresh AI recommendation.");
                  }
                }}
                className="p-2 text-purple-500 rounded-full transition hover:text-pink-500"
                title="Refresh AI Recommendation"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
              </button>
            </div>
<div className="flex flex-col gap-6 p-5 rounded-xl bg-neutral-900">
  {aiRec ? (() => {
    const lines = aiRec.split("\n").filter((l) => l.trim() !== "");

    const urgencyLine = lines.find((l) =>
      l.toLowerCase().includes("most urgent to come")
    );
    const noHistoryLine = lines.find((l) =>
      l.toLowerCase().includes("no history found")
    );
    const gradeLine = lines.find((l) =>
      l.toLowerCase().includes("maintenance grade")
    );

    // Find Amazon block start index
    const amazonIndex = lines.findIndex((l) =>
      l.toLowerCase().includes("best match on amazon")
    );

    // Default empty product info
    let amazonText = "";
    let amazonURL = "";
    let amazonPrice = "";
    let amazonImageUrl = "https://m.media-amazon.com/images/I/81J8tCL5efL._AC_SL1500_.jpg"; // fallback image

    // Parse Amazon info if available
    if (amazonIndex !== -1 && lines.length > amazonIndex + 1) {
      const amazonLine = lines[amazonIndex + 1];
      const urlMatch = amazonLine.match(/\((https?:\/\/[^\s)]+)\)/);
      amazonURL = urlMatch ? urlMatch[1] : "";

      const titleMatch = amazonLine.match(/\[(.+?)\]/);
      amazonText = titleMatch ? titleMatch[1] : "";

      const priceMatch = amazonLine.match(/- ([\d\.,]+\s*\$)/);
      amazonPrice = priceMatch ? priceMatch[1] : "";
    }

    return (
      <div className="flex flex-col gap-6 w-full lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col flex-1 gap-4">
          {urgencyLine && (
            <div>
              <h4 className="mb-1 text-sm font-semibold text-pink-400">
                🚨 Urgent Task
              </h4>
              <div className="flex gap-2 items-start p-3 rounded-lg bg-neutral-800">
                <span className="inline-block mt-1 w-2 h-2 bg-pink-500 rounded-full animate-pulse"></span>
                <span className="text-base text-white">{urgencyLine}</span>
              </div>

              {/* Show suggested products button always if urgencyLine exists */}
              <button
                onClick={() => setShowAmazonModal(true)}
                className="mt-3 text-sm text-purple-400 underline hover:text-pink-400"
                aria-label="Show suggested products on Amazon"
              >
                Show suggested products
              </button>

              {/* Amazon Popup Modal */}
              {showAmazonModal && (
                <div
                  className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-70"
                  onClick={() => setShowAmazonModal(false)}
                >
                  <div
                    className="relative p-6 w-full max-w-sm rounded-xl shadow-lg bg-neutral-900"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setShowAmazonModal(false)}
                      className="absolute top-3 right-3 text-xl font-bold text-neutral-400 hover:text-pink-400"
                      aria-label="Close modal"
                    >
                      ×
                    </button>

                    <h3 className="mb-3 text-lg font-semibold text-purple-300">
                      🎯 Best Match on Amazon
                    </h3>

                    {/* Show product info or fallback message */}
                    {amazonURL ? (
                      <>
                        <img
                          src={amazonImageUrl}
                          alt={amazonText || "Amazon product"}
                          className="object-contain mb-3 w-full h-48 rounded-md"
                          loading="lazy"
                        />
                        <p className="mb-3 font-mono text-sm text-green-400">
                          💰 {amazonPrice}
                        </p>
                        <a
                          href={amazonURL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block font-medium text-center text-purple-400 underline hover:text-pink-400"
                        >
                          View on Amazon →
                        </a>
                      </>
                    ) : (
                      <p className="italic text-center text-neutral-400">
                        No suggested products available yet.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {noHistoryLine && (
            <div>
              <h4 className="mb-1 text-sm font-semibold text-yellow-400">
                📂 History
              </h4>
              <div className="flex gap-2 items-start p-3 rounded-lg bg-neutral-800">
                <span className="inline-block mt-1 w-2 h-2 bg-yellow-400 rounded-full"></span>
                <span className="text-base text-neutral-300">{noHistoryLine}</span>
              </div>
            </div>
          )}

          {gradeLine && (
            <div>
              <h4 className="mb-1 text-sm font-semibold text-blue-400">
                🛠️ Maintenance Grade
              </h4>
              <div className="flex gap-2 items-start p-3 rounded-lg bg-neutral-800">
                <span className="inline-block mt-1 w-2 h-2 bg-blue-400 rounded-full"></span>
                <span className="text-base italic text-neutral-400">{gradeLine}</span>
              </div>
            </div>
          )}
        </div>

        <div className="w-full lg:w-[280px] shrink-0"></div>
      </div>
    );
  })() : (
    <span className="text-base text-neutral-400">No recommendation available.</span>
  )}
</div>






            <div className="mt-4">
              <h3 className="mb-2 text-2xl font-semibold text-white">Ask AI</h3>
              <input
                type="text"
                placeholder="Ask a question about your vehicle..."
                className="p-3 mb-4 w-full text-lg text-white rounded border border-neutral-600 bg-neutral-700"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
              />
              <button
                onClick={askAi}
                disabled={loadingAiQuestion}
                className="mb-4 w-full text-lg button-main"
              >
                {loadingAiQuestion ? "Loading..." : "Ask AI"}
              </button>
              {aiAnswer && (
                <div className="p-4 text-lg text-white rounded bg-neutral-700">
                  <h3 className="mb-2 text-xl font-semibold">AI Response:</h3>
                  <p>{aiAnswer}</p>
                </div>
              )}
            </div>
            {/* Receipts Section */}
            <div className="mt-4">
              <h3 className="mb-2 text-2xl font-semibold text-white">
                Receipts
              </h3>
              <div
                className={`relative ${
                  receipts.length > 3 ? "max-h-72 overflow-y-auto" : ""
                } space-y-3 pr-2`}
                style={{
                  background: "#18181b",
                  borderRadius: "1rem",
                  border: "1px solid #27272a",
                  padding: receipts.length ? "1.25rem 1rem" : "1.25rem 0.5rem",
                  minHeight: receipts.length ? "0" : "4rem",
                  boxShadow: receipts.length ? "0 2px 12px 0 #0002" : undefined,
                }}
              >
                {receipts.length ? (
                  receipts.map((r) => (
                    <div
                      key={r.id}
                      className="flex flex-col px-4 py-3 rounded-xl border shadow transition bg-neutral-900 border-neutral-700 hover:shadow-lg"
                    >
                      {/* Title on top */}
                      <div className="mb-1 w-full">
                        <span className="block text-base font-semibold text-white truncate">
                          {r.title}
                        </span>
                      </div>
                      {/* Bottom row: Date, Category, Price, Actions */}
                      <div className="flex justify-between items-center w-full">
                        <div className="flex flex-col gap-2 items-start min-w-0">
                          <span className="font-mono text-xs leading-tight text-neutral-400">
                            {r.date
                              ? new Date(
                                  r.date.seconds
                                    ? r.date.seconds * 1000
                                    : r.date
                                )
                                  .toISOString()
                                  .split("T")[0]
                              : ""}
                          </span>
                          {r.category && (
                            <span
                              className="mt-1 font-semibold text-white bg-purple-600 rounded w-fit"
                              style={{
                                fontSize: "0.62rem",
                                padding: "0.07rem 0.35rem",
                                lineHeight: "1.1",
                                letterSpacing: "0.01em",
                                maxWidth: "120px",
                                whiteSpace: "normal",
                                wordBreak: "break-word",
                              }}
                            >
                              {r.category}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-4 items-center">
                          <span className="text-base font-semibold tabular-nums text-green-400">
                            ${Number(r.price).toFixed(2)}
                          </span>
                          {vehicle.uid === user.uid ? (
                            <>
                              <button
                                onClick={() => {
                                  setEditingReceipt(r);
                                  setShowReceiptForm(true);
                                }}
                                className="p-1 text-purple-400 hover:text-pink-500"
                                title="Edit Receipt"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleFullDelete(r)}
                                className="p-1 text-red-500 hover:text-red-700"
                                title="Delete Receipt"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenReceiptPopup(r)}
                              className="p-1"
                              title="View Receipt"
                            >
                              <Eye className="w-6 h-6 text-blue-400 hover:text-blue-500" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-base text-neutral-400">No receipts</p>
                )}
              </div>
              {/* Move the Add Receipt button below the receipts list, with top margin */}
              {vehicle.uid === user.uid && (
                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => {
                      setEditingReceipt(null);
                      setShowReceiptForm(true);
                    }}
                    className="text-lg button-main"
                  >
                    + Add Receipt
                  </button>
                </div>
              )}
            </div>
          </div>
          {/* Paperwork Card */}

          <div className="p-6 mx-auto mt-8 max-w-4xl rounded-lg border shadow-lg bg-neutral-800 border-neutral-700">
            <h2 className="pb-2 mb-4 text-2xl font-bold text-white border-b">
              Paperwork
            </h2>
            {/* Grid for Title, Registration and Inspection */}
            <div className="flex overflow-x-auto gap-2 p-2 no-scrollbar md:justify-items-center">
              {["title", "registration", "inspection"].map((type) => {
                const docObj = allDocs.find((d) =>
                  d.name.toLowerCase().includes(type)
                );
                const labels = {
                  title: "Title",
                  registration: "Registration",
                  inspection: "Inspection",
                };
                const iconSrcs = {
                  title: "/title_icon.png",
                  registration: "/registration_icon.png",
                  inspection: "/inspection_icon.png",
                };
                const deadlineMatch = docObj?.name.match(/\d{2}-\d{2}-\d{4}/);
                const deadline = deadlineMatch
                  ? new Date(deadlineMatch[0])
                  : null;
                const isExpired = deadline && deadline < new Date();
                const bgColor = !docObj
                  ? "bg-gray-500"
                  : isExpired
                  ? "bg-pink-900"
                  : "bg-purple-900";

                // --- Ajouter ici ---
                let iconFilter = "";
                if (bgColor.includes("purple")) {
                  iconFilter = "invert(1) hue-rotate(270deg) brightness(1.2)";
                } else if (bgColor.includes("pink")) {
                  iconFilter =
                    "invert(1) sepia(1) hue-rotate(290deg) saturate(4) brightness(1.1)";
                } else {
                  iconFilter = "invert(0.7) brightness(1.2)";
                }

                return (
                  <div
                    key={type}
                    className={`flex flex-col flex-shrink-0 items-center p-4 rounded-lg ${bgColor}`}
                    style={{ minWidth: 140, maxWidth: 180 }}
                  >
                    {vehicle.uid === user.uid ? (
                      <>
                        <div className="flex justify-center items-center mb-2 w-10 h-16">
                          <Image
                            src={iconSrcs[type]}
                            alt={labels[type]}
                            width={32}
                            height={32}
                            className="object-contain"
                            style={{ filter: iconFilter }}
                          />
                        </div>
                        <span className="text-sm font-medium text-white">
                          {labels[type]}
                        </span>

                        {docObj ? (
                          <>
                            <div className="flex flex-col items-center mt-1 space-y-1">
                              <button
                                onClick={() =>
                                  setSelectedAdminDocUrl(docObj.url)
                                }
                                className="cursor-pointer"
                                title="View document"
                              >
                                <Eye className="w-8 h-8 text-purple-300 hover:text-purple-400" />
                              </button>
                              <div className="flex space-x-2">
                                {/* Edit button on the left */}
                                <button
                                  onClick={() =>
                                    document
                                      .getElementById(
                                        `modify-file-input-${type}`
                                      )
                                      .click()
                                  }
                                  className="text-purple-200 hover:text-pink-200"
                                  title="Modify document"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                {/* Cross (delete) button on the right */}
                                <button
                                  onClick={() => removeDocument(type)}
                                  className="text-purple-200 hover:text-pink-200"
                                  title="Delete document"
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
                                      d="M6 18 18 6M6  6l12 12"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            <input
                              id={`modify-file-input-${type}`}
                              type="file"
                              className="hidden"
                              onChange={(e) =>
                                e.target.files[0] &&
                                handleUploadAdminDocument(
                                  type,
                                  e.target.files[0]
                                )
                              }
                            />
                          </>
                        ) : (
                          <>
                            <label
                              htmlFor={`file-input-${type}`}
                              className="mt-1 cursor-pointer"
                              title="Add document"
                            >
                              <PlusCircle className="w-8 h-8 text-gray-200 hover:text-gray-100" />
                            </label>
                            <input
                              id={`file-input-${type}`}
                              type="file"
                              className="hidden"
                              onChange={(e) =>
                                e.target.files[0] &&
                                handleUploadAdminDocument(
                                  type,
                                  e.target.files[0]
                                )
                              }
                            />
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <div
                          className={`flex justify-center items-center mb-2 w-16 h-16`}
                        >
                          <Image
                            src={iconSrcs[type]}
                            alt={labels[type]}
                            width={32}
                            height={32}
                            className="object-contain"
                            style={{ filter: iconFilter }}
                          />
                        </div>
                        <h3 className="text-sm font-medium text-white">
                          {labels[type]}
                        </h3>
                        <span className="mt-1 text-xs text-gray-300">
                          {docObj
                            ? isExpired
                              ? "Expired"
                              : "Valid"
                            : "Not Added"}
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            {/* notice for non-owners */}
            {vehicle.uid !== user.uid && (
              <p className="mt-4 text-sm text-center text-gray-400">
                Only the vehicle owner can view and manage these documents.
              </p>
            )}
          </div>
        </div>

<section className="p-0 pt-4">
  <HorizontalCardsWithDots
    cards={[
              // Card 1: Finance/AI Value
              <div
                key="finance-1"
                className="p-6 rounded-lg shadow-lg bg-neutral-800"
              >
                {/* En-tête KPI */}
                <div className="flex flex-col justify-between items-start md:flex-row">
                  <div>
                    <h3 className="flex items-center text-xl font-semibold text-white">
                      ESTIMATED AI VALUE
                      <InfoTooltip text="This is the current value of your vehicle as estimated by our AI model, based on market data and your vehicle's details.">
                        <HelpCircle className="ml-2 w-4 h-4 text-neutral-400 hover:text-neutral-200" />
                      </InfoTooltip>
                    </h3>
                    <p className="text-3xl font-bold text-green-400">
                      ${aiCurrentValue.toLocaleString()}
                    </p>
                  </div>
                  <div className="mt-2 md:mt-0">
                    <h4 className="flex items-center text-sm text-neutral-400">
                      AI VARIATION
                      <InfoTooltip text="Shows the percentage change in AI value over the selected period.">
                        <HelpCircle className="ml-2 w-4 h-4 text-neutral-400 hover:text-neutral-200" />
                      </InfoTooltip>
                    </h4>
                    {aiVariationPct !== null && (
                      <p
                        className={`text-xl font-semibold ${
                          aiVariationPct >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {Math.abs(aiVariationPct)}%
                      </p>
                    )}
                  </div>
                </div>
                {/* Graphique + sélecteur */}
                <div className="mb-6">
                  <div className="flex justify-end items-center mb-2">
                    <select
                      className="p-2 text-white rounded bg-neutral-900"
                      value={timeWindow}
                      onChange={(e) => setTimeWindow(e.target.value)}
                    >
                      <option value="Last Week">1 week</option>
                      <option value="Last Month">1 month</option>
                      <option value="Last Year">1 year</option>
                    </select>
                  </div>
                  <div className="w-auto h-80 rounded-lg">
                    <Chart
                      options={defaultOptions}
                      series={buildSeries({
                        ...chartData,
                        datasets: chartData.datasets.filter(
                          (ds) =>
                            ds.label === "AI Estimated" ||
                            ds.label === "Bought At"
                        ),
                      })}
                      type="line"
                      height="100%"
                    />
                  </div>
                </div>
                {/* Actions */}
                <div className="flex flex-col justify-between items-center mb-24 space-y-3 md:flex-row md:space-y-0 md:space-x-4">
                  {user.uid === vehicle.uid &&
                    (isListed ? (
                      <button
                        onClick={removeFromMarketplace}
                        className="px-6 py-2 w-full text-red-400 bg-transparent rounded border border-red-400 md:w-auto hover:bg-red-500/10"
                      >
                        Remove from Marketplace
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowMarketplaceModal(true)}
                        className="px-6 py-2 w-full text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded md:w-auto hover:from-purple-600 hover:to-pink-600"
                      >
                        Add to Marketplace
                      </button>
                    ))}
                  <button
                    onClick={handleShare}
                    className="flex justify-center items-center px-6 py-2 w-full rounded md:w-auto bg-neutral-700 hover:bg-neutral-600"
                  >
                    <Share2 className="mr-2 w-5 h-5 text-white" /> Share
                  </button>
                </div>
              </div>,
              // Card 2 : Camembert chart
              <div 
              key = "camembert"
              className="pt-2 mt-4 text-sm text-gray-300 border-t border-gray-700">
                <h4 className="mb-2 font-semibold text-white">Expenses Overview</h4>

                <div className="flex gap-6 justify-center">
                  {(() => {
                    const expenseCategories = [
                      "Repair",
                      "Scheduled Maintenance",
                      "Cosmetic Mods",
                      "Performance Mods",
                      "Paperwork & Taxes",
                    ];
                    const data = expenseCategories.map((category) => ({
                      name: category,
                      value: receipts
                        .filter((r) => r.category === category)
                        .reduce((sum, r) => sum + (Number(r.price) || 0), 0),
                    }));
                    const COLORS = [
                      "#7c3aed", // violet-600
                      "#9333ea", // violet-700
                      "#a78bfa", // violet-300
                      "#c4b5fd", // violet-200
                      "#ede9fe", // violet-50
                    ];
                    return (
                      <PieChart width={400} height={220}>
                        <Pie
                          data={data}
                          cx={120}
                          cy={110}
                          outerRadius={80}
                          labelLine={false}
                          dataKey="value"
                          nameKey="name"
                        >
                          {data.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                        <Legend layout="vertical" align="right" verticalAlign="middle" />
                      </PieChart>
                    );
                  })()}
                </div>

                <div className="mt-4 text-sm text-center">
                  <p>
                    <span className="font-medium">Purchase Price:</span>{" "}
                    ${Number(vehicle.boughtAt || 0).toFixed(2)}
                  </p>
                  <p>
                    <span className="font-medium">Total Expenses:</span>{" "}
                    ${receipts.reduce((sum, r) => sum + (Number(r.price) || 0), 0).toFixed(2)}
                  </p>
                  <p className="mt-1 font-semibold text-purple-400">
                    Total Spent: $
                    {(
                      Number(vehicle.boughtAt || 0) +
                      receipts.reduce((sum, r) => sum + (Number(r.price) || 0), 0)
                    ).toFixed(2)}
                  </p>
                </div>


              </div>,

              // Card 3: Update Financial Details 
              <div key="charges_setup" className="mx-auto mt-10 space-y-6 w-full max-w-xl text-white">
                <h4 className="text-lg font-semibold text-center">Update Financial Details</h4>
                
                {/* Insurance Info */}
                <div className="p-4 rounded-lg border bg-neutral-900 border-neutral-700">
                  <h5 className="mb-2 font-semibold text-md">🛡️ Insurance Info</h5>
                  <button
                    onClick={() => setShowInsurance(true)}
                    className="px-4 py-2 bg-purple-600 rounded transition hover:bg-purple-700"
                  >
                    Update Insurance
                  </button>

                  {showInsurance && (
                    <div className="mt-4 space-y-2">
                      <label className="block text-sm font-medium text-gray-300">Total Insurance Cost ($)</label>
                      <input
                        type="number"
                        className="p-2 w-full text-white rounded border bg-neutral-800 border-neutral-600"
                        value={insuranceCost}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setInsuranceCost(val);
                          const est = insuranceLength > 0 ? (val / insuranceLength).toFixed(2) : "";
                          if (!manualInsuranceMonthly || manualInsuranceMonthly === estimatedInsuranceMonthly) {
                            setManualInsuranceMonthly(est);
                          }
                        }}
                      />

                      <label className="block text-sm font-medium text-gray-300">Length (months)</label>
                      <input
                        type="number"
                        className="p-2 w-full text-white rounded border bg-neutral-800 border-neutral-600"
                        value={insuranceLength}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setInsuranceLength(val);
                          const est = val > 0 ? (insuranceCost / val).toFixed(2) : "";
                          if (!manualInsuranceMonthly || manualInsuranceMonthly === estimatedInsuranceMonthly) {
                            setManualInsuranceMonthly(est);
                          }
                        }}
                      />

                      <label className="block text-sm font-medium text-gray-300">Start Date</label>
                      <input
                        type="date"
                        className="p-2 w-full text-white rounded border bg-neutral-800 border-neutral-600"
                        value={insuranceStart}
                        onChange={(e) => setInsuranceStart(e.target.value)}
                      />

                      <label className="block text-sm font-medium text-gray-300">Monthly Insurance Payment ($)</label>
                      <input
                        type="number"
                        className="p-2 w-full text-white rounded border border-purple-600 bg-neutral-800"
                        value={manualInsuranceMonthly}
                        onChange={(e) => setManualInsuranceMonthly(e.target.value)}
                      />

                      <p className="text-sm italic text-gray-400">
                        Monthly: {insuranceLength > 0 ? `$${(insuranceCost / insuranceLength).toFixed(2)}` : "—"}
                      </p>

                      <button
                        onClick={handleSaveInsurance}
                        className="px-4 py-2 mt-4 bg-green-600 rounded hover:bg-green-700"
                      >
                        Save Insurance Info
                      </button>
                    </div>
                  )}
                </div>

                {/* Ownership Info */}
                <div className="p-4 rounded-lg border bg-neutral-900 border-neutral-700">
                  <h5 className="mb-2 font-semibold text-md">💰 Ownership Info</h5>
                  <button
                    onClick={() => setShowOwnership(true)}
                    className="px-4 py-2 bg-purple-600 rounded transition hover:bg-purple-700"
                  >
                    Update Ownership
                  </button>

                  {showOwnership && (
                    <div className="mt-4 space-y-2">
                      <label className="block text-sm font-medium text-gray-300">Ownership Type</label>
                      <select
                        className="p-2 w-full text-white rounded border bg-neutral-800 border-neutral-600"
                        value={ownershipType}
                        onChange={(e) => setOwnershipType(e.target.value)}
                      >
                        <option value="">Select Type</option>
                        <option value="Owned">Owned</option>
                        <option value="Financed">Financed</option>
                      </select>

                      {ownershipType === "Financed" && (
                        <>
                          <label className="block text-sm font-medium text-gray-300">Loan Amount ($)</label>
                          <input
                            type="number"
                            className="p-2 w-full text-white rounded border bg-neutral-800 border-neutral-600"
                            value={loanAmount}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setLoanAmount(val);
                              const est =
                                val && loanLength
                                  ? ((val * (1 + (interestRate || 0) / 100)) / loanLength).toFixed(2)
                                  : "";
                              if (!manualMonthlyPayment || manualMonthlyPayment === estimatedLoanMonthly) {
                                setManualMonthlyPayment(est);
                              }
                            }}
                          />

                          <label className="block text-sm font-medium text-gray-300">Length (months)</label>
                          <input
                            type="number"
                            className="p-2 w-full text-white rounded border bg-neutral-800 border-neutral-600"
                            value={loanLength}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setLoanLength(val);
                              const est =
                                loanAmount && val
                                  ? ((loanAmount * (1 + (interestRate || 0) / 100)) / val).toFixed(2)
                                  : "";
                              if (!manualMonthlyPayment || manualMonthlyPayment === estimatedLoanMonthly) {
                                setManualMonthlyPayment(est);
                              }
                            }}
                          />

                          <label className="block text-sm font-medium text-gray-300">Interest Rate (%)</label>
                          <input
                            type="number"
                            className="p-2 w-full text-white rounded border bg-neutral-800 border-neutral-600"
                            value={interestRate}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setInterestRate(val);
                              const est =
                                loanAmount && loanLength
                                  ? ((loanAmount * (1 + (val || 0) / 100)) / loanLength).toFixed(2)
                                  : "";
                              if (!manualMonthlyPayment || manualMonthlyPayment === estimatedLoanMonthly) {
                                setManualMonthlyPayment(est);
                              }
                            }}
                          />

                          <label className="block text-sm font-medium text-gray-300">Start Date</label>
                          <input
                            type="date"
                            className="p-2 w-full text-white rounded border bg-neutral-800 border-neutral-600"
                            value={loanStart}
                            onChange={(e) => setLoanStart(e.target.value)}
                          />

                          <label className="block text-sm font-medium text-gray-300">Monthly Payment ($)</label>
                          <input
                            type="number"
                            className="p-2 w-full text-white rounded border border-purple-600 bg-neutral-800"
                            value={manualMonthlyPayment}
                            onChange={(e) => setManualMonthlyPayment(e.target.value)}
                          />

                          <p className="text-sm italic text-gray-400">
                            Est. Monthly: {loanAmount && loanLength ? `$${estimatedLoanMonthly}` : "—"}
                          </p>
                        </>
                      )}

                      <button
                        onClick={handleSaveOwnership}
                        className="px-4 py-2 mt-4 bg-green-600 rounded hover:bg-green-700"
                      >
                        Save Ownership Info
                      </button>
                    </div>
                  )}
                </div>
              </div>,

              // Card 4: Monthly Budget Overview
              <div key="monthly_box" className="flex flex-col justify-center items-center mt-8">
                <h4 className="mb-2 text-lg font-semibold text-white">Monthly Budget Overview</h4>
                {(() => {
                  let months = 1;
                  if (vehicle.createdAt) {
                    const created = vehicle.createdAt.seconds
                      ? new Date(vehicle.createdAt.seconds * 1000)
                      : new Date(vehicle.createdAt);
                    const now = new Date();
                    months =
                      (now.getFullYear() - created.getFullYear()) * 12 +
                      (now.getMonth() - created.getMonth()) +
                      1;
                    if (months < 1) months = 1;
                  }

                  const expenseCategories = [
                    "Repair",
                    "Scheduled Maintenance",
                    "Cosmetic Mods",
                    "Performance Mods",
                    "Paperwork & Taxes",
                  ];

                  const monthlyData = expenseCategories.map((category) => {
                    const total = receipts
                      .filter((r) => r.category === category)
                      .reduce((sum, r) => sum + (Number(r.price) || 0), 0);
                    return {
                      name: category,
                      value: total / months,
                    };
                  });

                  const ownershipInfo = vehicle.ownershipInfo || {};
                  const insuranceInfo = vehicle.insuranceInfo || {};

                  const credit = ownershipInfo.manualMonthlyPayment ?? null;
                  const insurance = insuranceInfo.manualInsuranceMonthly ?? null;
                  const gas = vehicle.gas ?? null;

                  const totalMonthly =
                    monthlyData.reduce((sum, item) => sum + item.value, 0) +
                    (typeof credit === "number" ? credit : 0) +
                    (typeof insurance === "number" ? insurance : 0) +
                    (typeof gas === "number" ? gas : 0);

                  return (
                    <>
                      <div className="flex flex-wrap gap-4 justify-center items-stretch w-full max-w-2xl">
                        {monthlyData.map((item) => (
                          <div
                            key={item.name}
                            className="flex flex-col items-center bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 min-w-[120px]"
                          >
                            <span className="text-sm text-gray-400">{item.name}</span>
                            <span className="text-xl font-bold text-green-400">
                              ${item.value.toFixed(2)}
                            </span>
                            <span className="text-xs text-gray-500">/month</span>
                          </div>
                        ))}

                        {/* Credit */}
                        <div className="flex flex-col items-center bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 min-w-[120px]">
                          <span className="text-sm text-gray-400">Credit</span>
                          <span className="text-xl font-bold text-blue-400">
                            {typeof credit === "number" ? `$${credit.toFixed(2)}` : "—"}
                          </span>
                          <span className="text-xs text-gray-500">/month</span>
                        </div>

                        {/* Insurance */}
                        <div className="flex flex-col items-center bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 min-w-[120px]">
                          <span className="text-sm text-gray-400">Insurance</span>
                          <span className="text-xl font-bold text-purple-400">
                            {typeof insurance === "number" ? `$${insurance.toFixed(2)}` : "—"}
                          </span>
                          <span className="text-xs text-gray-500">/month</span>
                        </div>

                        {/* Gas */}
                        <div className="flex flex-col items-center bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 min-w-[120px]">
                          <span className="text-sm text-gray-400">Gas</span>
                          <span className="text-xl font-bold text-yellow-400">
                            {typeof gas === "number" ? `$${gas.toFixed(2)}` : (
                              <span className="italic text-gray-500">(coming soon)</span>
                            )}
                          </span>
                          <span className="text-xs text-gray-500">/month</span>
                        </div>
                      </div>

                      {/* Total Monthly Budget */}
                      <div className="mt-4 text-lg font-semibold text-white">
                        In average, you spend{" "}
                        <span className="text-green-400">${totalMonthly.toFixed(2)} </span>
                        on this vehicle
                      </div>
                    </>
                  );
                })()}
              </div>,

              // Card 8 : Sankey for budget
              <div
                key="sankey-graph"
                className="rounded-xl bg-neutral-800 p-4 shadow-md border border-purple-500 w-full md:w-[400px]"
              >
                <h3 className="mb-3 text-lg font-semibold text-purple-300">Expense Breakdown</h3>
                <div className="mb-3">
                  <ul className="flex flex-wrap gap-2 text-sm">
                    {sankeyData.nodes.map((node, idx) => (
                      <li key={idx} className="flex items-center space-x-2">
                        <span
                          className="inline-block w-3 h-3 rounded-sm border border-neutral-700"
                          style={{ backgroundColor: node.color }}
                        />
                        <span className="text-white">
                          {node.name} (${getNodeValue(idx)})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <Sankey
                      data={sankeyData}
                      nodePadding={1}
                      nodeWidth={60}
                      node={renderCustomNode}
                      link={renderCustomLink}
                      linkCurvature={1}
                    >
                      <Tooltip />
                    </Sankey>
                  </ResponsiveContainer>
                </div>
              </div>,

              // Card 6: Vehicle Financial Breakdown & Depreciation
              <div
                key="finance-2"
                className="flex flex-col gap-4 p-6 rounded-lg shadow-lg bg-neutral-800"
              >
                <h3 className="flex gap-2 items-center mb-2 text-xl font-semibold text-white">
                  Financial Breakdown & Depreciation
                  <InfoTooltip text="See how much you've spent and how your vehicle's value has changed over time.">
                    <HelpCircle className="mr-16 mb-7 w-5 h-5 text-neutral-400 hover:text-neutral-200" />
                  </InfoTooltip>
                </h3>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-base text-neutral-400">
                      Purchase Price
                    </span>
                    <span className="text-lg font-bold text-pink-400">
                      {vehicle.boughtAt && !isNaN(vehicle.boughtAt) ? (
                        `$${Number(vehicle.boughtAt).toLocaleString()}`
                      ) : (
                        <span className="italic text-neutral-500">No data</span>
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-base text-neutral-400">
                      Total Invested
                    </span>
                    <span className="text-lg font-bold text-blue-400">
                      {getMetricValue("Total Spent") > 0 ? (
                        `$${getMetricValue("Total Spent").toLocaleString()}`
                      ) : (
                        <span className="italic text-neutral-500">No data</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-base text-neutral-400">
                      AI Variation (per month)
                    </span>
                    <span
                      className="text-lg font-bold"
                      style={{
                        color: (() => {
                          // Calculate color based on sign
                          // Use same logic as below for monthly variation
                          if (
                            !aiCurrentValue ||
                            aiCurrentValue <= 0 ||
                            aiSeries.length < 2
                          )
                            return "#737373";
                          let months = 1;
                          if (
                            vehicle.purchaseYear &&
                            vehicle.createdAt?.seconds
                          ) {
                            const purchaseDate = new Date(
                              vehicle.createdAt.seconds * 1000
                            );
                            const now = new Date();
                            months =
                              (now.getFullYear() - purchaseDate.getFullYear()) *
                                12 +
                              (now.getMonth() - purchaseDate.getMonth());
                            months = Math.max(1, months);
                          }
                          const first = aiSeries[0];
                          const last = aiCurrentValue;
                          if (!first || first <= 0) return "#737373";
                          const ratio = last / first;
                          const monthly = Math.pow(ratio, 1 / months) - 1;
                          return monthly >= 0 ? "#22d3ee" : "#f87171";
                        })(),
                      }}
                    >
                      {(() => {
                        // AI Variation per month (compound)
                        if (
                          !aiCurrentValue ||
                          aiCurrentValue <= 0 ||
                          aiSeries.length < 2
                        )
                          return (
                            <span className="italic text-neutral-500">
                              No data
                            </span>
                          );
                        let months = 1;
                        if (
                          vehicle.purchaseYear &&
                          vehicle.createdAt?.seconds
                        ) {
                          const purchaseDate = new Date(
                            vehicle.createdAt.seconds * 1000
                          );
                          const now = new Date();
                          months =
                            (now.getFullYear() - purchaseDate.getFullYear()) *
                              12 +
                            (now.getMonth() - purchaseDate.getMonth());
                          months = Math.max(1, months);
                        }
                        const first = aiSeries[0];
                        const last = aiCurrentValue;
                        if (!first || first <= 0)
                          return (
                            <span className="italic text-neutral-500">
                              No data
                            </span>
                          );
                        const ratio = last / first;
                        const monthly = Math.pow(ratio, 1 / months) - 1;
                        return `${(monthly * 100).toFixed(2)}%`;
                      })()}
                    </span>
                  </div>
                  {/* 5. Time Since Last Receipt */}
                  <div className="flex justify-between items-center">
                    <span className="text-base text-neutral-400">
                      Time Since Last Receipt
                    </span>
                    <span className="text-lg font-bold text-blue-300">
                      {(() => {
                        if (!receipts.length)
                          return (
                            <span className="italic text-neutral-500">
                              No data
                            </span>
                          );
                        const last = receipts[0];
                        if (!last.date)
                          return (
                            <span className="italic text-neutral-500">
                              No data
                            </span>
                          );
                        const lastDate = last.date.seconds
                          ? new Date(last.date.seconds * 1000)
                          : new Date(last.date);
                        const now = new Date();
                        const diffMs = now - lastDate;
                        const diffDays = Math.floor(
                          diffMs / (1000 * 60 * 60 * 24)
                        );
                        if (diffDays < 1) return "Today";
                        if (diffDays === 1) return "1 day";
                        if (diffDays < 31) return `${diffDays} days`;
                        const months = Math.floor(diffDays / 30.44);
                        if (months < 12)
                          return `${months} month${months > 1 ? "s" : ""}`;
                        const years = Math.floor(months / 12);
                        return `${years} year${years > 1 ? "s" : ""}`;
                      })()}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-neutral-300">
                    <b>What does this mean?</b>
                    <br />
                    <span className="font-semibold text-pink-400">
                      Purchase Price
                    </span>{" "}
                    is what you paid for the vehicle.
                    <br />
                    <span className="font-semibold text-blue-400">
                      Total Invested
                    </span>{" "}
                    is your total out-of-pocket.
                    <br />
                    <span className="font-semibold text-cyan-400">
                      AI Variation (per month)
                    </span>{" "}
                    is the average monthly change in AI value since purchase.
                    <br />
                    <span className="font-semibold text-purple-400">
                      Depreciation Rate
                    </span>{" "}
                    is the average monthly loss of value since purchase.
                  </p>
                </div>
              </div>,

              // Card 7: Advanced Ownership Analytics
              <div
                key="finance-3"
                className="flex flex-col gap-4 p-6 rounded-lg shadow-lg bg-neutral-800"
              >
                <h3 className="flex gap-2 items-center mb-2 text-xl font-semibold text-white">
                  Ownership KPIs
                  <InfoTooltip text="Deep insights into your vehicle's cost and value evolution">
                    <HelpCircle className="w-4 h-4 text-neutral-400 hover:text-neutral-200" />
                  </InfoTooltip>
                </h3>
                <div className="flex flex-col gap-2">
                  {/* 1. Cost per Month of Ownership */}
                  <div className="flex justify-between items-center">
                    <span className="text-base text-neutral-400">
                      Cost per Month of Ownership
                    </span>
                    <span className="font-bold text-orange-400 text-md">
                      {(() => {
                        // Calculate months of ownership
                        let months = 1;
                        let startDate = null;
                        if (vehicle.createdAt?.seconds) {
                          startDate = new Date(
                            vehicle.createdAt.seconds * 1000
                          );
                        }
                        const now = new Date();
                        if (startDate) {
                          months =
                            (now.getFullYear() - startDate.getFullYear()) * 12 +
                            (now.getMonth() - startDate.getMonth());
                          months = Math.max(1, months);
                        }
                        const totalSpent = getMetricValue("Total Spent");
                        if (!totalSpent || totalSpent <= 0)
                          return (
                            <span className="italic text-neutral-500">
                              No data
                            </span>
                          );
                        return `$${(totalSpent / months).toLocaleString(
                          undefined,
                          { maximumFractionDigits: 2 }
                        )}`;
                      })()}
                    </span>
                  </div>
                  {/* 2. Realized vs Unrealized Loss */}
                  <div className="flex justify-between items-center">
                    <span className="text-base text-neutral-400">
                      Realized Loss (Spent - AI Value)
                    </span>
                    <span
                      className="font-bold text-md"
                      style={{
                        color:
                          aiCurrentValue < getMetricValue("Total Spent")
                            ? "#f87171"
                            : "#22d3ee",
                      }}
                    >
                      {(() => {
                        const totalSpent = getMetricValue("Total Spent");
                        if (!totalSpent || !aiCurrentValue || totalSpent <= 0)
                          return (
                            <span className="italic text-neutral-500">
                              No data
                            </span>
                          );
                        const diff = totalSpent - aiCurrentValue;
                        return `${diff >= 0 ? "-" : "+"}$${Math.abs(
                          diff
                        ).toLocaleString()}`;
                      })()}
                    </span>
                  </div>
                  {/* 3. Average Receipt Value */}
                  <div className="flex justify-between items-center">
                    <span className="text-base text-neutral-400">
                      Average Receipt Value
                    </span>
                    <span className="font-bold text-emerald-400 text-md">
                      {receipts.length > 0 ? (
                        `$${(
                          getMetricValue("Total Spent") / receipts.length
                        ).toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}`
                      ) : (
                        <span className="italic text-neutral-500">No data</span>
                      )}
                    </span>
                  </div>
                  {/* 4. Most Expensive Category */}
                  <div className="flex justify-between items-center">
                    <span className="text-base text-neutral-400">
                      Most Expensive Category
                    </span>
                    <span className="font-bold text-right text-pink-300 text-md">
                      {(() => {
                        if (!receipts.length)
                          return (
                            <span className="italic text-neutral-500">
                              No data
                            </span>
                          );
                        const sums = {};
                        receipts.forEach((r) => {
                          const cat = r.category || "Other";
                          sums[cat] = (sums[cat] || 0) + (Number(r.price) || 0);
                        });
                        const sorted = Object.entries(sums).sort(
                          (a, b) => b[1] - a[1]
                        );
                        if (!sorted.length)
                          return (
                            <span className="italic text-neutral-500">
                              No data
                            </span>
                          );
                        return `${
                          sorted[0][0]
                        } ($${sorted[0][1].toLocaleString()})`;
                      })()}
                    </span>
                  </div>
                  {/* 5. Time Since Last Receipt */}
                  <div className="flex justify-between items-center">
                    <span className="text-base text-neutral-400">
                      Time Since Last Receipt
                    </span>
                    <span className="text-lg font-bold text-blue-300">
                      {(() => {
                        if (!receipts.length)
                          return (
                            <span className="italic text-neutral-500">
                              No data
                            </span>
                          );
                        const last = receipts[0];
                        if (!last.date)
                          return (
                            <span className="italic text-neutral-500">
                              No data
                            </span>
                          );
                        const lastDate = last.date.seconds
                          ? new Date(last.date.seconds * 1000)
                          : new Date(last.date);
                        const now = new Date();
                        const diffMs = now - lastDate;
                        const diffDays = Math.floor(
                          diffMs / (1000 * 60 * 60 * 24)
                        );
                        if (diffDays < 1) return "Today";
                        if (diffDays === 1) return "1 day";
                        if (diffDays < 31) return `${diffDays} days`;
                        const months = Math.floor(diffDays / 30.44);
                        if (months < 12)
                          return `${months} month${months > 1 ? "s" : ""}`;
                        const years = Math.floor(months / 12);
                        return `${years} year${years > 1 ? "s" : ""}`;
                      })()}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-neutral-300">
                    <b>What does this mean?</b>
                    <br />
                    <span className="font-semibold text-pink-400">
                      Purchase Price
                    </span>{" "}
                    is what you paid for the vehicle.
                    <br />
                    <span className="font-semibold text-blue-400">
                      Total Invested
                    </span>{" "}
                    is your total out-of-pocket.
                    <br />
                    <span className="font-semibold text-cyan-400">
                      AI Variation (per month)
                    </span>{" "}
                    is the average monthly change in AI value since purchase.
                    <br />
                    <span className="font-semibold text-purple-400">
                      Depreciation Rate
                    </span>{" "}
                    is the average monthly loss of value since purchase.
                  </p>
                </div>
              </div>,

              // Card 5: Advanced Ownership Analytics (Table Version)
              <div
                key="finance-4"
                className="flex flex-col gap-4 p-6 rounded-lg shadow-lg bg-neutral-800"
              >
                <h3 className="flex gap-2 items-center mb-4 text-xl font-semibold text-white">
                  Advanced Ownership Analytics
                  <InfoTooltip text="Track your AI value and total invested over time.">
                    <HelpCircle className="mr-16 mb-10 w-4 h-4 text-neutral-400 hover:text-neutral-200" />
                  </InfoTooltip>
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm text-white">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-2 text-left">Date</th>
                        <th className="px-4 py-2 text-left text-green-400">
                          AI Value
                        </th>
                        <th className="px-4 py-2 text-left text-blue-400">
                          Total Invested
                        </th>
                        {/* <th className="px-4 py-2 text-left text-purple-400">Bought At</th> */}
                      </tr>
                    </thead>
                    <tbody>
                      {rawAiData.map((pt, idx) => {
                        const dateStr = new Date(pt.x).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric", year: "2-digit" }
                        );
                        const receiptsUpTo = receipts.filter(
                          (r) =>
                            r.date &&
                            (r.date.seconds
                              ? r.date.seconds * 1000
                              : new Date(r.date).getTime()) <= pt.x
                        );
                        const receiptsTotal = receiptsUpTo.reduce(
                          (sum, r) => sum + (Number(r.price) || 0),
                          0
                        );
                        const invested =
                          (Number(vehicle?.boughtAt) || 0) + receiptsTotal;
                        // let boughtAt = "";
                        // if (vehicle?.boughtAt && vehicle?.createdAt?.seconds) {
                        //   const boughtAtTime = vehicle.createdAt.seconds * 1000;
                        //   if (Math.abs(pt.x - boughtAtTime) < 86400000) {
                        //     boughtAt = `$${Number(vehicle.boughtAt).toLocaleString()}`;
                        //   }
                        // }
                        return (
                          <tr key={idx} className="border-b border-neutral-800">
                            <td className="px-4 py-2">{dateStr}</td>
                            <td className="px-4 py-2 font-mono text-green-300">
                              ${pt.y.toLocaleString()}
                            </td>
                            <td className="px-4 py-2 font-mono text-blue-300">
                              ${invested.toLocaleString()}
                            </td>
                            {/* <td className="px-4 py-2 font-mono text-purple-300">{boughtAt}</td> */}
                          </tr>
                        );
                      })}
                      {/* If no row matched the purchase date, add a row for Bought At at the top */}
                      {/* 
                      {(() => {
                        if (
                          vehicle?.boughtAt &&
                          vehicle?.createdAt?.seconds &&
                          !rawAiData.some(
                            pt =>
                              Math.abs(pt.x - vehicle.createdAt.seconds * 1000) < 86400000
                          )
                        ) {
                          const dateStr = new Date(vehicle.createdAt.seconds * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" });
                          return (
                            <tr className="border-b border-neutral-800">
                              <td className="px-4 py-2">{dateStr}</td>
                              <td className="px-4 py-2 font-mono text-green-300"></td>
                              <td className="px-4 py-2 font-mono text-blue-300">${Number(vehicle.boughtAt).toLocaleString()}</td>
                              <td className="px-4 py-2 font-mono text-purple-300">${Number(vehicle.boughtAt).toLocaleString()}</td>
                            </tr>
                          );
                        }
                        return null;
                      })()}
                      */}
                    </tbody>
                  </table>
                </div>
              </div>,
    ]}
  />
</section>


        {/* Receipt Form Modal */}
        {showReceiptForm && (
          <ReceiptForm
            vehicleId={id}
            initialData={editingReceipt}
            onClose={() => setShowReceiptForm(false)}
            onSaved={(newReceipt) => {
              setReceipts((prev) => {
                // Si édition, remplace, sinon ajoute
                if (editingReceipt) {
                  return prev.map((r) =>
                    r.id === newReceipt.id ? { ...r, ...newReceipt } : r
                  );
                } else {
                  return [{ ...newReceipt }, ...prev];
                }
              });
            }}
          />
        )}
        {/* Marketplace Modal */}
        {showMarketplaceModal && (
          <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-70">
            <div className="p-6 w-full max-w-sm text-white rounded border shadow-xl bg-neutral-800 border-neutral-700">
              <h2 className="mb-4 text-xl font-bold text-center">
                Add to Marketplace
              </h2>
              <label className="block mb-2 text-white">
                Price ($):
                <input
                  type="number"
                  step="0.01"
                  value={salePrice || ""}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className="p-2 mb-4 w-full text-white rounded border border-neutral-600 bg-neutral-700"
                />
              </label>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowMarketplaceModal(false)}
                  className="px-4 py-2 rounded bg-neutral-600 hover:bg-neutral-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmAdd(salePrice);
                    setShowMarketplaceModal(false);
                  }}
                  className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Owner Manual Modal */}
        {showManual && (
          <OwnerManualModal
            vehicleId={id}
            onClose={() => setShowManual(false)}
            onSync={() => window.location.reload()}
          />
        )}
        {/* ReceiptDetailModal: show receipt details popup */}
        {receiptPopup && (
          <ReceiptDetailModal
            receipt={receiptPopup}
            onClose={() => setReceiptPopup(null)}
            aiAnswer={receiptAiAnswer}
          />
        )}
      </div>{" "}
    </>
  );
}
