// pages/addVehicle_page.jsx
import { useState } from "react";
import { useRouter } from "next/router";
import AddVehicleStep1 from "../components/Add_Vehicle/AddVehicleStep1";
import AddVehicleStep2 from "../components/Add_Vehicle/AddVehicleStep2";
import AddVehicleStep3 from "../components/Add_Vehicle/AddVehicleStep3";
import { makesByType, modelsByMake } from "../components/Add_Vehicle/VehicleData";
import { auth, db, storage } from "../lib/firebase";
import { doc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

// Helper to handle preview
function handlePreview(files, setPreview) {
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

  // Form state
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
  const [vin, setVin] = useState("");
  const [description, setDescription] = useState("");
  const [marketplace] = useState(false);
  const [useCustomModel, setUseCustomModel] = useState(false);
  const [customModel, setCustomModel] = useState("");
  const [useCustomMake, setUseCustomMake] = useState(false);
  const [customMake, setCustomMake] = useState("");

  // Derived helpers
  const hasModelList = !!(
    selectedMake &&
    modelsByMake[selectedMake] &&
    modelsByMake[selectedMake].length > 0
  );
  const hasMakeList = !!(
    vehicleType &&
    makesByType[vehicleType] &&
    makesByType[vehicleType].length > 0
  );

  // Firestore submit
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
      make: hasMakeList && !useCustomMake ? selectedMake : customMake,
      model: hasModelList && !useCustomModel ? selectedModel : customModel,
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

    const id = `${vehicleType}-${selectedMake}-${selectedModel}-${selectedYear}-${user.uid}-${Date.now()}`;

    try {
      const listingRef = doc(db, "listing", id);
      await setDoc(listingRef, vehicleData);
      await updateDoc(doc(db, "members", user.uid), {
        vehicles: arrayUnion(id),
      });

      const uploadCategory = async (files, category) => {
        if (!files || files.length === 0) return [];
        return await Promise.all(
          files.map(async (file) => {
            const photoName = `${id}-${Date.now()}-${category}-${file.name}`;
            const storageRef = ref(storage, `listing/${id}/photos/${photoName}`);
            const snapshot = await uploadBytesResumable(storageRef, file);
            return await getDownloadURL(snapshot.ref);
          })
        );
      };

      const allPhotoURLs = [
        ...(frontPhotos.length ? await uploadCategory(frontPhotos, "front") : []),
        ...(rearPhotos.length ? await uploadCategory(rearPhotos, "rear") : []),
        ...(sideLeftPhotos.length ? await uploadCategory(sideLeftPhotos, "sideLeft") : []),
        ...(sideRightPhotos.length ? await uploadCategory(sideRightPhotos, "sideRight") : []),
        ...(interiorPhotos.length ? await uploadCategory(interiorPhotos, "interior") : []),
        ...(engineBayPhotos.length ? await uploadCategory(engineBayPhotos, "engineBay") : []),
      ];

      await updateDoc(listingRef, { photos: allPhotoURLs });

      setSaving(false);
      router.push(`/vehicleCard_page/${id}`);
    } catch (err) {
      console.error("Submission error:", err);
      setSaving(false);
      alert("An error occurred. Please try again later.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white bg-gradient-to-br from-gray-900 via-gray-950 to-gray-900">
      <div className="w-full max-w-2xl p-8 border border-gray-700 shadow-2xl bg-gray-800/90 rounded-3xl">
        <h1 className="mb-8 text-4xl font-extrabold tracking-tight text-center text-blue-300 drop-shadow-lg">
          Add a Vehicle
        </h1>
        {/* Progress bar */}
        <div className="w-full h-2 mb-10 overflow-hidden bg-gray-700 rounded-xl">
          <div
            className="h-2 transition-all duration-300 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600"
            style={{
              width: step === 1 ? "33%" : step === 2 ? "66%" : "100%",
            }}
          />
        </div>
        {step === 1 && (
          <AddVehicleStep1
            vehicleType={vehicleType}
            setVehicleType={setVehicleType}
            selectedMake={selectedMake}
            setSelectedMake={setSelectedMake}
            useCustomMake={useCustomMake}
            setUseCustomMake={setUseCustomMake}
            customMake={customMake}
            setCustomMake={setCustomMake}
            hasMakeList={hasMakeList}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            useCustomModel={useCustomModel}
            setUseCustomModel={setUseCustomModel}
            customModel={customModel}
            setCustomModel={setCustomModel}
            hasModelList={hasModelList}
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            boughtAt={boughtAt}
            setBoughtAt={setBoughtAt}
            title={title}
            setTitle={setTitle}
            mileage={mileage}
            setMileage={setMileage}
            onNext={(e) => {
              e.preventDefault();
              if (
                !vehicleType ||
                (!selectedMake && !customMake) ||
                (!selectedModel && !customModel) ||
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
          />
        )}
        {step === 2 && (
          <AddVehicleStep2
            color={color}
            setColor={setColor}
            engine={engine}
            setEngine={setEngine}
            transmission={transmission}
            setTransmission={setTransmission}
            fuelType={fuelType}
            setFuelType={setFuelType}
            zip={zip}
            setZip={setZip}
            state={state}
            setState={setState}
            city={city}
            setCity={setCity}
            description={description}
            setDescription={setDescription}
            onPrev={() => setStep(1)}
            onNext={(e) => {
              e.preventDefault();
              setStep(3);
            }}
          />
        )}
        {step === 3 && (
          <AddVehicleStep3
            frontPreview={frontPreview}
            setFrontPhotos={setFrontPhotos}
            setFrontPreview={setFrontPreview}
            rearPreview={rearPreview}
            setRearPhotos={setRearPhotos}
            setRearPreview={setRearPreview}
            sideLeftPreview={sideLeftPreview}
            setSideLeftPhotos={setSideLeftPhotos}
            setSideLeftPreview={setSideLeftPreview}
            sideRightPreview={sideRightPreview}
            setSideRightPhotos={setSideRightPhotos}
            setSideRightPreview={setSideRightPreview}
            interiorPreview={interiorPreview}
            setInteriorPhotos={setInteriorPhotos}
            setInteriorPreview={setInteriorPreview}
            engineBayPreview={engineBayPreview}
            setEngineBayPhotos={setEngineBayPhotos}
            setEngineBayPreview={setEngineBayPreview}
            marketplace={marketplace}
            vin={vin}
            setVin={setVin}
            saving={saving}
            onPrev={() => setStep(2)}
            onSubmit={e => {
              e.preventDefault();
              handleSubmit();
            }}
            handlePreview={handlePreview}
          />
        )}
      </div>
    </div>
  );
}
            
