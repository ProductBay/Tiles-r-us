// TilesRUsShowroom.jsx
// Full showroom mockup with tile selector, wall colors, and tile calculator

import React, { useState } from 'react';

function TilesRUsShowroom() {
  const [tile, setTile] = useState("Marble");
  const [wallColor, setWallColor] = useState("#ffffff");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [unit, setUnit] = useState("m");
  const [result, setResult] = useState(null);

  const handleCalculate = () => {
    let l = parseFloat(length);
    let w = parseFloat(width);

    if (isNaN(l) || isNaN(w)) {
      alert("Please enter valid dimensions");
      return;
    }

    let area = (unit === "ft") ? (l * 0.3048) * (w * 0.3048) : l * w;
    let tilesNeeded = Math.ceil(area / 0.25); // assume each tile = 0.25m²
    setResult(tilesNeeded);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-purple-600 text-white flex flex-col items-center p-6">
      <h1 className="text-4xl font-bold mb-6">Tiles-Я-Us 3D Showroom</h1>

      {/* Demo Display */}
      <div className="w-full max-w-4xl bg-white text-black rounded-xl shadow-lg p-6 mb-6">
        <div
          className="h-64 rounded-md flex items-center justify-center"
          style={{ backgroundColor: wallColor }}
        >
          <p className="text-xl font-semibold">{tile} Floor Preview</p>
        </div>
      </div>

      {/* Controls */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tile Selection */}
        <div className="bg-white text-black rounded-xl shadow-md p-4">
          <h2 className="text-lg font-semibold mb-3">Choose Tile</h2>
          <select
            value={tile}
            onChange={(e) => setTile(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option>Marble</option>
            <option>Granite</option>
            <option>Porcelain</option>
            <option>Ceramic</option>
          </select>
        </div>

        {/* Wall Color */}
        <div className="bg-white text-black rounded-xl shadow-md p-4">
          <h2 className="text-lg font-semibold mb-3">Wall Color</h2>
          <input
            type="color"
            value={wallColor}
            onChange={(e) => setWallColor(e.target.value)}
            className="w-full h-10 cursor-pointer"
          />
        </div>
      </div>

      {/* Calculator */}
      <div className="w-full max-w-4xl bg-white text-black rounded-xl shadow-md p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">Tile Calculator</h2>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="number"
            placeholder="Length"
            value={length}
            onChange={(e) => setLength(e.target.value)}
            className="p-2 border rounded"
          />
          <input
            type="number"
            placeholder="Width"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            className="p-2 border rounded"
          />
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="col-span-2 p-2 border rounded"
          >
            <option value="m">Meters</option>
            <option value="ft">Feet</option>
          </select>
        </div>
        <button
          onClick={handleCalculate}
          className="mt-4 w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700"
        >
          Calculate Tiles Needed
        </button>
        {result && (
          <p className="mt-4 text-lg font-semibold">
            You need approximately {result} tiles
          </p>
        )}
      </div>
    </div>
  );
}

export default TilesRUsShowroom;
