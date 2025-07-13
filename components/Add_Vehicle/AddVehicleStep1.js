import { makesByType, modelsByMake } from "./VehicleData";

export default function AddVehicleStep1(props) {
  // props: vehicleType, setVehicleType, selectedMake, setSelectedMake, useCustomMake, setUseCustomMake, customMake, setCustomMake, hasMakeList, selectedModel, setSelectedModel, useCustomModel, setUseCustomModel, customModel, setCustomModel, hasModelList, selectedYear, setSelectedYear, boughtAt, setBoughtAt, title, setTitle, mileage, setMileage, onNext

  return (
    <form onSubmit={props.onNext}>
      <div className="p-8 mb-10 rounded-2xl border border-gray-700 shadow-lg bg-gray-900/80">
        <h2 className="mb-6 text-2xl font-bold tracking-wide text-blue-200">
          Basic Details
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Vehicle type */}
          <div>
            <label className="block mb-1 text-sm">Vehicle type*</label>
            <select
              value={props.vehicleType}
              onChange={(e) => {
                props.setVehicleType(e.target.value);
                props.setSelectedMake("");
                props.setCustomMake("");
                props.setSelectedModel("");
              }}
              className="px-3 py-2 w-full bg-gray-700 rounded border border-gray-600"
              required
            >
              <option value="">Select</option>
              <option value="car">Car</option>
              <option value="motorcycle">Motorcycle</option>
            </select>
          </div>
          {/* Make */}
          <div>
            <label className="block mb-1 text-sm">Make*</label>
            <div className="flex gap-2 items-center mb-1">
              <input
                type="checkbox"
                id="toggle-custom-make"
                checked={props.useCustomMake || !props.hasMakeList}
                onChange={() => {
                  if (!props.hasMakeList) return;
                  props.setUseCustomMake((v) => !v);
                  props.setCustomMake("");
                  props.setSelectedMake("");
                  props.setSelectedModel("");
                }}
                className="mr-2"
                disabled={!props.hasMakeList}
              />
              <label htmlFor="toggle-custom-make" className="text-xs">
                Enter custom make
              </label>
            </div>
            {props.hasMakeList && !props.useCustomMake ? (
              <select
                value={props.selectedMake}
                onChange={(e) => {
                  props.setSelectedMake(e.target.value);
                  props.setSelectedModel("");
                }}
                className="px-3 py-2 w-full bg-gray-700 rounded border border-gray-600"
                required={!props.useCustomMake}
                disabled={!props.vehicleType}
              >
                <option value="">Select</option>
                {makesByType[props.vehicleType]?.map((make) => (
                  <option key={make} value={make}>
                    {make}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={props.customMake}
                onChange={(e) => props.setCustomMake(e.target.value)}
                className="px-3 py-2 w-full bg-gray-700 rounded border border-gray-600"
                required
                placeholder="Enter make"
              />
            )}
          </div>
          {/* Model */}
          <div>
            <label className="block mb-1 text-sm">Model*</label>
            <div className="flex gap-2 items-center mb-1">
              <input
                type="checkbox"
                id="toggle-custom-model"
                checked={props.useCustomModel || !props.hasModelList}
                onChange={() => {
                  if (!props.hasModelList) return;
                  props.setUseCustomModel((v) => !v);
                  props.setCustomModel("");
                  props.setSelectedModel("");
                }}
                className="mr-2"
                disabled={!props.hasModelList}
              />
              <label htmlFor="toggle-custom-model" className="text-xs">
                Enter custom model
              </label>
            </div>
            {props.hasModelList && !props.useCustomModel ? (
              <select
                value={props.selectedModel}
                onChange={(e) => props.setSelectedModel(e.target.value)}
                className="px-3 py-2 w-full bg-gray-700 rounded border border-gray-600"
                required={!props.useCustomModel}
                disabled={!props.selectedMake}
              >
                <option value="">Select</option>
                {modelsByMake[props.selectedMake]?.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={props.customModel}
                onChange={(e) => props.setCustomModel(e.target.value)}
                className="px-3 py-2 w-full bg-gray-700 rounded border border-gray-600"
                required
                placeholder="Enter model"
              />
            )}
          </div>
          {/* Year */}
          <div>
            <label className="block mb-1 text-sm">Year*</label>
            <select
              value={props.selectedYear}
              onChange={(e) => props.setSelectedYear(e.target.value)}
              className="px-3 py-2 w-full bg-gray-700 rounded border border-gray-600"
              required
            >
              <option value="">Select year</option>
              {Array.from(
                { length: new Date().getFullYear() - 1950 + 1 },
                (_, i) => 1950 + i
              )
                .reverse()
                .map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
            </select>
          </div>
          {/* Purchased for */}
          <div>
            <label className="block mb-1 text-sm">Purchased for*</label>
            <input
              type="number"
              value={props.boughtAt}
              onChange={(e) => props.setBoughtAt(e.target.value)}
              className="px-3 py-2 w-full bg-gray-700 rounded border border-gray-600"
              required
              placeholder="Price"
            />
          </div>
          {/* Title brand */}
          <div>
            <label className="block mb-1 text-sm">Title brand*</label>
            <select
              value={props.title}
              onChange={(e) => props.setTitle(e.target.value)}
              className="px-3 py-2 w-full bg-gray-700 rounded border border-gray-600"
              required
            >
              <option value="">Title brand</option>
              <option value="clean">Clean</option>
              <option value="salvage">Salvage</option>
              <option value="rebuilt">Rebuilt</option>
            </select>
          </div>
          {/* Mileage */}
          <div>
            <label className="block mb-1 text-sm">Mileage*</label>
            <input
              type="number"
              value={props.mileage}
              onChange={(e) => props.setMileage(e.target.value)}
              className="px-3 py-2 w-full bg-gray-700 rounded border border-gray-600"
              required
              placeholder="Mileage"
            />
          </div>
        </div>
      </div>
      <div className="flex justify-between mb-16">
        <button
          type="button"
          className="px-8 py-2 font-semibold text-gray-400 bg-gray-700 rounded-lg shadow transition hover:bg-gray-600"
          disabled
        >
          Previous
        </button>
        <button
          type="submit"
          className="px-8 py-2 font-bold bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow transition hover:from-blue-700 hover:to-purple-700"
        >
          Next
        </button>
      </div>
    </form>
  );
}
