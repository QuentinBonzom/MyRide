import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { db, storage, auth } from "../lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { ref, listAll, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/router";

export default function MarketplacePage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState([]);
  const [showAuthPopup, setShowAuthPopup] = useState(false);

  const fetchVehicleImages = useCallback(async (vehicleId) => {
    const imagesRef = ref(storage, `listing/${vehicleId}/photos`);
    const imageList = await listAll(imagesRef).catch(() => ({ items: [] }));
    const imageUrls = await Promise.all(
      imageList.items.map((ref) => getDownloadURL(ref))
    );
    const idx = imageUrls.findIndex((url) => url.includes("front"));
    if (idx > -1) imageUrls.unshift(...imageUrls.splice(idx, 1));
    return imageUrls;
  }, []);

  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "on_marketplace"));
      const list = [];
      for (const docSnap of snap.docs) {
        const vId = docSnap.id;
        const listing = (await getDoc(doc(db, "listing", vId))).data() || {};
        const images = await fetchVehicleImages(vId);
        list.push({
          id: vId,
          make: listing.make || "Unknown Make",
          model: listing.model || "Unknown Model",
          year: listing.year || "Unknown Year",
          images,
          price: docSnap.data().price || "N/A",
          mileage: listing.mileage || "N/A",
          city: listing.city || "Unknown",
          engine: listing.engine || "Unknown Engine",
        });
      }
      setVehicles(list);
    })();
  }, [fetchVehicleImages]);

  const handleVehicleClick = (vehicleId) => {
    const user = auth.currentUser;
    if (!user) setShowAuthPopup(true);
    else router.push(`/vehicleCard_page/${vehicleId}`);
  };

  return (
    <section className="min-h-screen pb-12 bg-gray-900">
      {/* Header repensé en thème sombre */}
      <header className="py-8 text-center bg-gradient-to-r from-gray-800 to-gray-600">
        <h1 className="text-4xl font-extrabold text-white">Marketplace</h1>
        <p className="mt-2 text-lg text-gray-200">Discover your next ride</p>
      </header>

      {/* Main container avec grille aérée en thème sombre */}
      <main className="grid gap-8 px-6 py-8 md:grid-cols-2">
        {vehicles.map((v) => (
          <article
            key={v.id}
            onClick={() => handleVehicleClick(v.id)}
            className="overflow-hidden transition transform shadow-xl cursor-pointer bg-neutral-800 rounded-2xl hover:scale-105"
          >
            <div className="relative w-full h-64">
              <Image
                src={v.images[0] || "/default-vehicle.png"}
                alt={`${v.make} ${v.model}`}
                fill
                className="object-cover"
              />
              <span className="absolute px-3 py-1 text-sm text-white bg-purple-700 rounded-xl top-4 right-4">
                {v.engine}
              </span>
            </div>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-100">
                {v.year} {v.make} {v.model}
              </h2>
              <p className="mt-2 text-xl font-semibold text-purple-400">
                €{v.price}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  alert("Contact Seller for " + v.model);
                }}
                className="w-full py-2 mt-4 font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                Contact Seller
              </button>
            </div>
          </article>
        ))}

        {/* Loader aéré en thème sombre */}
        {!vehicles.length && (
          <div className="flex items-center justify-center h-64">
            <div className="flex space-x-3">
              <div
                className="w-4 h-4 bg-purple-500 rounded-full animate-bounce"
                style={{ animationDelay: "0s" }}
              />
              <div
                className="w-4 h-4 bg-purple-500 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              />
              <div
                className="w-4 h-4 bg-purple-500 rounded-full animate-bounce"
                style={{ animationDelay: "0.4s" }}
              />
            </div>
          </div>
        )}
      </main>

      {/* Auth Popup en thème sombre */}
      {showAuthPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
          <div className="w-full max-w-sm p-8 rounded-lg shadow-xl bg-neutral-800">
            <h2 className="mb-4 text-2xl font-bold text-center text-white">
              Sign In or Sign Up
            </h2>
            <p className="mb-6 text-center text-gray-300">
              You need to be logged in to view the details of this listing.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => router.push("/login_page")}
                className="px-6 py-2 text-white transition bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Sign In
              </button>
              <button
                onClick={() => router.push("/signup_page")}
                className="px-6 py-2 text-white transition bg-green-600 rounded-lg hover:bg-green-700"
              >
                Sign Up
              </button>
            </div>
            <button
              onClick={() => setShowAuthPopup(false)}
              className="w-full mt-6 text-sm text-center text-gray-400 hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
