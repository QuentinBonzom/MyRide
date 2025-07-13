export default function AddVehicleStep2(props) {
  // props: color, setColor, engine, setEngine, transmission, setTransmission, fuelType, setFuelType, zip, setZip, state, setState, city, setCity, description, setDescription, onPrev, onNext

  return (
    <form onSubmit={props.onNext}>
      <div className="p-8 mb-10 border border-gray-700 shadow-lg bg-gray-900/80 rounded-2xl">
        <h2 className="mb-6 text-2xl font-bold tracking-wide text-blue-200">
          Additional Details
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="block mb-1 text-sm">Color*</label>
            <input
              type="text"
              value={props.color}
              onChange={(e) => props.setColor(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
              placeholder="Color"
              required
            />
          </div>
          <div>
            <label className="block mb-1 text-sm">Engine*</label>
            <input
              type="text"
              value={props.engine}
              onChange={(e) => props.setEngine(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
              placeholder="Engine / CC"
              required
            />
          </div>
          <div>
            <label className="block mb-1 text-sm">Transmission*</label>
            <select
              value={props.transmission}
              onChange={(e) => props.setTransmission(e.target.value)}
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
              value={props.fuelType}
              onChange={(e) => props.setFuelType(e.target.value)}
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
              value={props.zip}
              onChange={(e) => props.setZip(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
              placeholder="Zip"
              required
            />
          </div>
          <div>
            <label className="block mb-1 text-sm">State*</label>
            <input
              type="text"
              value={props.state}
              onChange={(e) => props.setState(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
              placeholder="State"
              required
            />
          </div>
          <div>
            <label className="block mb-1 text-sm">City*</label>
            <input
              type="text"
              value={props.city}
              onChange={(e) => props.setCity(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
              placeholder="City"
              required
            />
          </div>
          <div className="col-span-2">
            <label className="block mb-1 text-sm">Description</label>
            <textarea
              value={props.description}
              onChange={(e) => props.setDescription(e.target.value)}
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
          className="px-8 py-2 font-semibold text-gray-400 transition bg-gray-700 rounded-lg shadow hover:bg-gray-600"
          onClick={props.onPrev}
        >
          Previous
        </button>
        <button
          type="submit"
          className="px-8 py-2 font-bold transition rounded-lg shadow bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          Next
        </button>
      </div>
    </form>
  );
}
