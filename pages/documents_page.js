import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { auth, storage } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { ref, getDownloadURL } from "firebase/storage";

const DocumentsPage = () => {
  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState({
    registration: null,
    insurance: null,
    maintenance: null,
  });
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login_page"); // Redirect to login page if not logged in
      } else {
        setUser(currentUser);
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchDocumentUrls = async () => {
      try {
        const motorcycleChecklistRef = ref(
          storage,
          "public/BUY_MOTORCYCLE_CHECKLIST.xlsx"
        );
        const billOfSaleRef = ref(storage, "public/BillOfSale_Template.pdf");
        const carChecklistRef = ref(storage, "public/BUY_CAR_CHECKLIST.xlsx");

        const registrationURL = await getDownloadURL(motorcycleChecklistRef);
        const insuranceURL = await getDownloadURL(billOfSaleRef);
        const maintenanceURL = await getDownloadURL(carChecklistRef);

        setDocuments({
          registration: registrationURL,
          insurance: insuranceURL,
          maintenance: maintenanceURL,
        });
      } catch (error) {
        console.error("Error fetching document URLs:", error);
      }
    };
    fetchDocumentUrls();
  }, []);

  if (!user) {
    return <p className="text-center text-white">Loading...</p>; // Show loading message
  }

  return (
    <section className="min-h-screen px-4 py-8 pb-12 mb-12 bg-gray-900">
      {/* Header */}
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold text-white">Documents</h1>
        <p className="mt-2 text-lg text-gray-300">
          Download your essential documents.
        </p>
      </header>

      {/* Cards Container */}
      <main className="grid gap-8 md:grid-cols-3">
        {["registration", "insurance", "maintenance"].map((type) => {
          const url = documents[type];
          const label =
            type === "registration"
              ? "Motorcycle Checklist"
              : type === "insurance"
              ? "Bill of Sale Template"
              : "Car Checklist";
          const desc =
            type === "registration"
              ? "Motorcycle Buying Guide (XLSX)"
              : type === "insurance"
              ? "Bill of Sale Template (PDF)"
              : "Car Buying Guide (XLSX)";
          return (
            <article
              key={type}
              className="flex flex-col justify-between p-6 bg-gray-800 shadow-lg rounded-xl"
            >
              <div>
                <h2 className="text-xl font-semibold text-gray-100">{label}</h2>
                <p className="mt-1 text-sm text-gray-400">{desc}</p>
              </div>
              <div className="flex items-center justify-between mt-4">
                {url ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-6 h-6 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-6 h-6 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
              </div>
              <a
                href={url || "#"}
                download={!!url}
                className={`mt-4 block w-full text-center py-2 rounded-lg font-medium ${
                  url
                    ? "bg-purple-700 text-white hover:bg-purple-800"
                    : "bg-gray-600 text-gray-400 cursor-not-allowed"
                }`}
              >
                {url ? "Download" : "Unavailable"}
              </a>
            </article>
          );
        })}
      </main>
    </section>
  );
};

export default DocumentsPage;