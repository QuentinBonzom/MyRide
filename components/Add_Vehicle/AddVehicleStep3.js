// components/AddVehicleStep3.js
import Image from "next/image";

export default function AddVehicleStep3(props) {
  // props: frontPreview, setFrontPhotos, setFrontPreview, rearPreview, setRearPhotos, setRearPreview, sideLeftPreview, setSideLeftPhotos, setSideLeftPreview, sideRightPreview, setSideRightPhotos, setSideRightPreview, interiorPreview, setInteriorPhotos, setInteriorPreview, engineBayPreview, setEngineBayPhotos, setEngineBayPreview, marketplace, vin, setVin, saving, onPrev, onSubmit, handlePreview

  return (
    <form onSubmit={props.onSubmit}>
      <div className="p-8 mb-10 border border-gray-700 shadow-lg bg-gray-900/80 rounded-2xl">
        <h2 className="mb-6 text-2xl font-bold tracking-wide text-blue-200">
          Pictures
        </h2>
        <div className="mb-8">
          <label className="block mb-4 text-lg font-semibold text-blue-100">
            Vehicle Photos
          </label>
          <div className="grid max-w-md grid-cols-2 gap-8 mx-auto sm:grid-cols-3">
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
                  props.setFrontPhotos(files);
                  props.handlePreview(files, props.setFrontPreview);
                }}
              />
              <label
                htmlFor="photo-front"
                className="flex flex-col items-center justify-center w-full h-24 overflow-hidden transition border-2 border-gray-500 border-dashed rounded-lg cursor-pointer hover:border-blue-400"
              >
                {props.frontPreview ? (
                  <Image
                    src={props.frontPreview}
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
                  props.setRearPhotos(files);
                  props.handlePreview(files, props.setRearPreview);
                }}
              />
              <label
                htmlFor="photo-rear"
                className="flex flex-col items-center justify-center w-full h-24 overflow-hidden transition border-2 border-gray-500 border-dashed rounded-lg cursor-pointer hover:border-blue-400"
              >
                {props.rearPreview ? (
                  <Image
                    src={props.rearPreview}
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
                  props.setSideLeftPhotos(files);
                  props.handlePreview(files, props.setSideLeftPreview);
                }}
              />
              <label
                htmlFor="photo-sideleft"
                className="flex flex-col items-center justify-center w-full h-24 overflow-hidden transition border-2 border-gray-500 border-dashed rounded-lg cursor-pointer hover:border-blue-400"
              >
                {props.sideLeftPreview ? (
                  <Image
                    src={props.sideLeftPreview}
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
                  props.setSideRightPhotos(files);
                  props.handlePreview(files, props.setSideRightPreview);
                }}
              />
              <label
                htmlFor="photo-sideright"
                className="flex flex-col items-center justify-center w-full h-24 overflow-hidden transition border-2 border-gray-500 border-dashed rounded-lg cursor-pointer hover:border-blue-400"
              >
                {props.sideRightPreview ? (
                  <Image
                    src={props.sideRightPreview}
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
                  props.setInteriorPhotos(files);
                  props.handlePreview(files, props.setInteriorPreview);
                }}
              />
              <label
                htmlFor="photo-interior"
                className="flex flex-col items-center justify-center w-full h-24 overflow-hidden transition border-2 border-gray-500 border-dashed rounded-lg cursor-pointer hover:border-blue-400"
              >
                {props.interiorPreview ? (
                  <Image
                    src={props.interiorPreview}
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
              <p className="mt-2 text-xs text-center text-gray-400">Interior</p>
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
                  props.setEngineBayPhotos(files);
                  props.handlePreview(files, props.setEngineBayPreview);
                }}
              />
              <label
                htmlFor="photo-enginebay"
                className="flex flex-col items-center justify-center w-full h-24 overflow-hidden transition border-2 border-gray-500 border-dashed rounded-lg cursor-pointer hover:border-blue-400"
              >
                {props.engineBayPreview ? (
                  <Image
                    src={props.engineBayPreview}
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
        {props.marketplace && (
          <div className="mb-4">
            <label className="block mb-1 text-sm">VIN</label>
            <input
              type="text"
              value={props.vin}
              onChange={(e) => props.setVin(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
              required={props.marketplace}
              placeholder="VIN"
            />
          </div>
        )}
      </div>
      <div className="flex justify-between mt-8 mb-8">
        <button
          type="button"
          className="px-8 py-2 font-semibold text-gray-400 transition bg-gray-700 rounded-lg shadow hover:bg-gray-600"
          onClick={props.onPrev}
        >
          Previous
        </button>
        <button
          type="submit"
          className={`px-8 py-2 rounded-lg font-bold shadow ${
            props.saving
              ? "bg-gray-500"
              : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition"
          }`}
          disabled={props.saving}
        >
          {props.saving ? "Saving..." : "Submit Vehicle"}
        </button>
      </div>
    </form>
  );
}
