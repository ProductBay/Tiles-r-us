// App.jsx
import React, { useState, useEffect, useMemo, Suspense, useRef } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, Environment, TransformControls, Center, useGLTF } from "@react-three/drei";
import * as THREE from "three";

/* Floor component (repeating texture) */
function Floor({ tileTexture, repeatX = 8, repeatY = 8, sizeX = 10, sizeY = 10, roughness = 0.7, metalness = 0.05 }) {
  const texture = useLoader(THREE.TextureLoader, tileTexture);

  useEffect(() => {
    if (!texture) return;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(Math.max(1, Math.round(repeatX)), Math.max(1, Math.round(repeatY)));
    if (texture.anisotropy !== undefined) texture.anisotropy = 16;
    texture.encoding = THREE.sRGBEncoding;
    texture.needsUpdate = true;
  }, [texture, repeatX, repeatY]);

  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[sizeX, sizeY]} />
      <meshStandardMaterial map={texture} roughness={roughness} metalness={metalness} />
    </mesh>
  );
}

/* GroutLines - draws grout lines over floor */
function GroutLines({ sizeX, sizeY, repeatX, repeatY, thicknessMeters = 0.003, color = "#cccccc", y = 0.01 }) {
  if (repeatX < 2 && repeatY < 2) return null;
  const lines = [];

  const tileW = sizeX / repeatX;
  const tileH = sizeY / repeatY;

  // Vertical lines
  for (let i = 1; i < repeatX; i++) {
    const x = -sizeX / 2 + i * tileW;
    lines.push(
      <mesh key={`v-${i}`} position={[x, y, 0]}>
        <boxGeometry args={[thicknessMeters, 0.01, sizeY]} />
        <meshStandardMaterial color={color} metalness={0.02} roughness={0.9} />
      </mesh>
    );
  }

  // Horizontal lines
  for (let j = 1; j < repeatY; j++) {
    const z = -sizeY / 2 + j * tileH;
    lines.push(
      <mesh key={`h-${j}`} position={[0, y, z]}>
        <boxGeometry args={[sizeX, 0.01, thicknessMeters]} />
        <meshStandardMaterial color={color} metalness={0.02} roughness={0.9} />
      </mesh>
    );
  }

  return <group>{lines}</group>;
}

/* Soft lighting rig for Tiles‑R‑Us showroom */
const TilesRUsSoftLightRig = React.memo(function TilesRUsSoftLightRig({
  strength = 1,
  color = "#ffffff",
  softness = 0.7,
}) {
  const s = Math.max(0, strength);
  const clampedSoft = Math.min(1, Math.max(0, softness));
  const envBlur = 0.2 + clampedSoft * 0.8; // 0.2..1

  return (
    <>
      <ambientLight intensity={0.12 * s} color={color} />
      <hemisphereLight intensity={0.3 * s} color={color} groundColor="#d3d3d3" />
      <directionalLight castShadow intensity={0.28 * s} position={[5, 7, 5]} />
      <directionalLight intensity={0.12 * s} position={[-6, 4, -3]} />
      <Environment preset="apartment" background={false} blur={envBlur} />
    </>
  );
});

/* TilePreview - close-up tile viewer */
function TilePreview({
  textureUrl,
  roughness = 0.6,
  metalness = 0.05,
  showTiled = false,
  previewRepeat = 4,
  groutMm = 3,
  groutColor = "#cccccc",
  lightEnabled = true,
  lightStrength = 1,
  lightColor = "#ffffff",
  lightSoftness = 0.7,
}) {
  const texture = useLoader(THREE.TextureLoader, textureUrl);

  useEffect(() => {
    if (!texture) return;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    if (showTiled) {
      texture.repeat.set(previewRepeat, previewRepeat);
    } else {
      texture.repeat.set(1, 1);
    }
    if (texture.anisotropy !== undefined) texture.anisotropy = 16;
    texture.encoding = THREE.sRGBEncoding;
    texture.needsUpdate = true;
  }, [texture, showTiled, previewRepeat]);

  const groutMeters = Math.max(0, Number(groutMm) / 1000);
  const tileSizeNormalized = 1 / Math.max(1, previewRepeat);
  const normalizedThickness = Math.min(0.12, Math.max(0.001, (groutMeters / tileSizeNormalized) * 0.02));

  return (
    <Canvas shadows camera={{ position: [0, 0.7, 1.5], fov: 35 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 2, 2]} intensity={0.8} />
      <pointLight position={[0, 3, 0]} intensity={0.25} />

      {lightEnabled && (
        <TilesRUsSoftLightRig strength={lightStrength} color={lightColor} softness={lightSoftness} />
      )}

      <OrbitControls enablePan enableZoom enableRotate />
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial map={texture} roughness={roughness} metalness={metalness} />
      </mesh>

      {showTiled && (() => {
        const items = [];
        for (let i = 1; i < previewRepeat; i++) {
          const x = -0.5 + i * (1 / previewRepeat);
          items.push(
            <mesh key={`pv-${i}`} position={[x, 0.001, 0]}>
              <boxGeometry args={[normalizedThickness, 0.002, 1]} />
              <meshStandardMaterial color={groutColor} roughness={1} metalness={0} />
            </mesh>
          );
        }
        for (let j = 1; j < previewRepeat; j++) {
          const z = -0.5 + j * (1 / previewRepeat);
          items.push(
            <mesh key={`ph-${j}`} position={[0, 0.001, z]}>
              <boxGeometry args={[1, 0.002, normalizedThickness]} />
              <meshStandardMaterial color={groutColor} roughness={1} metalness={0} />
            </mesh>
          );
        }
        return <group>{items}</group>;
      })()}
    </Canvas>
  );
}

/* Skirting */
function Skirting({ roomWm = 10, roomLm = 10, height = 0.12, thickness = 0.05, color = "#e6e6e6" }) {
  const halfW = roomWm / 2;
  const halfL = roomLm / 2;
  const y = height / 2;
  return (
    <group>
      <mesh position={[0, y, -halfL + thickness / 2]} castShadow>
        <boxGeometry args={[roomWm, height, thickness]} />
        <meshStandardMaterial color={color} metalness={0.05} roughness={0.8} />
      </mesh>
      <mesh position={[0, y, halfL - thickness / 2]} castShadow>
        <boxGeometry args={[roomWm, height, thickness]} />
        <meshStandardMaterial color={color} metalness={0.05} roughness={0.8} />
      </mesh>
      <mesh position={[-halfW + thickness / 2, y, 0]} castShadow>
        <boxGeometry args={[thickness, height, roomLm]} />
        <meshStandardMaterial color={color} metalness={0.05} roughness={0.8} />
      </mesh>
      <mesh position={[halfW - thickness / 2, y, 0]} castShadow>
        <boxGeometry args={[thickness, height, roomLm]} />
        <meshStandardMaterial color={color} metalness={0.05} roughness={0.8} />
      </mesh>
    </group>
  );
}

/* Wall grout lines (tied to grout controls) */
function WallGroutLines({
  wallWidth,
  wallHeight = 3,
  tileWidthM,
  tileHeightM,
  groutMm = 3,
  color = "#cccccc",
  wallPosition = [0, 0, 0],
  wallRotationY = 0,
  zOffset = 0.001,
}) {
  const minTile = 0.05; // prevent extreme counts
  const tW = Math.max(minTile, tileWidthM || 0.3);
  const tH = Math.max(minTile, tileHeightM || 0.3);

  const numTilesX = Math.max(1, Math.floor(wallWidth / tW));
  const numTilesY = Math.max(1, Math.floor(wallHeight / tH));

  if (numTilesX * numTilesY > 900) return null;

  const groutThickness = Math.max(0.0005, Math.min(0.03, groutMm / 1000));

  const tileW = wallWidth / numTilesX;
  const tileH = wallHeight / numTilesY;

  const correctedWallWidth = Math.max(0, wallWidth - groutThickness * 2);
  const correctedWallHeight = Math.max(0, wallHeight - groutThickness * 2);

  const lines = [];

  // Vertical wall grout lines
  for (let i = 1; i < numTilesX; i++) {
    const xLocal = -wallWidth / 2 + i * tileW;
    lines.push(
      <mesh key={`wv-${i}`} position={[xLocal, 0, zOffset]}>
        <boxGeometry args={[groutThickness, correctedWallHeight, 0.002]} />
        <meshStandardMaterial color={color} roughness={0.9} metalness={0.02} />
      </mesh>
    );
  }

  // Horizontal wall grout lines
  for (let j = 1; j < numTilesY; j++) {
    const yLocal = -wallHeight / 2 + j * tileH;
    lines.push(
      <mesh key={`wh-${j}`} position={[0, yLocal, zOffset]}>
        <boxGeometry args={[correctedWallWidth, groutThickness, 0.002]} />
        <meshStandardMaterial color={color} roughness={0.9} metalness={0.02} />
      </mesh>
    );
  }

  return (
    <group position={wallPosition} rotation-y={wallRotationY}>
      {lines}
    </group>
  );
}

/* Wall plane component */
function WallPlane({
  width,
  height,
  position = [0, 0, 0],
  rotationY = 0,
  textureUrl,
  useTexture = true,
  fallbackColor = "#ffffff",
  roughness = 0.6,
  metalness = 0.05,
  envIntensity = 0,
  receiveShadow = true,
}) {
  const tex = useLoader(THREE.TextureLoader, textureUrl);

  useEffect(() => {
    if (!tex) return;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    if (tex.anisotropy !== undefined) tex.anisotropy = 16;
    tex.encoding = THREE.sRGBEncoding;
    tex.needsUpdate = true;
  }, [tex]);

  return (
    <mesh position={position} rotation={[0, rotationY, 0]} receiveShadow={receiveShadow}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        map={useTexture ? tex : undefined}
        color={useTexture ? undefined : fallbackColor}
        roughness={roughness}
        metalness={metalness}
        envMapIntensity={envIntensity}
      />
    </mesh>
  );
}

/* Draggable overlay panel */
/* Draggable overlay panel (collapsible + draggable) */
function DraggablePanel({ containerRef, title = "Showroom Controls", children, defaultCollapsed = false }) {
  const panelRef = useRef(null);
  const [pos, setPos] = useState({ x: 16, y: 16 });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [collapsed, setCollapsed] = useState(defaultCollapsed); // NEW

  const onPointerDown = (e) => {
    e.preventDefault();
    setDragging(true);
    const rect = panelRef.current?.getBoundingClientRect();
    if (rect) {
      setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging) return;
      const container = containerRef?.current;
      const panel = panelRef.current;
      if (!container || !panel) return;

      const cRect = container.getBoundingClientRect();
      const pRect = panel.getBoundingClientRect();
      let x = e.clientX - cRect.left - offset.x;
      let y = e.clientY - cRect.top - offset.y;
      const padding = 8;
      const maxX = Math.max(padding, cRect.width - pRect.width - padding);
      const maxY = Math.max(padding, cRect.height - pRect.height - padding);
      x = Math.min(maxX, Math.max(padding, x));
      y = Math.min(maxY, Math.max(padding, y));
      setPos({ x, y });
    };

    const onUp = () => setDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, offset, containerRef]);

  return (
    <div ref={panelRef} className="absolute z-10" style={{ left: pos.x, top: pos.y }}>
      <div className="bg-white/90 backdrop-blur-sm text-black rounded-md shadow-lg w-72 max-h-[70vh] overflow-hidden">
        {/* Header */}
        <div
          className={`cursor-${dragging ? "grabbing" : "grab"} flex items-center justify-between px-3 py-2 border-b bg-white/70 sticky top-0`}
          onPointerDown={onPointerDown}
        >
          <span className="text-sm font-semibold">{title}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCollapsed((c) => !c);
              }}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-black font-bold"
              title={collapsed ? "Expand panel" : "Collapse panel"}
            >
              {collapsed ? "+" : "–"}
            </button>
          </div>
        </div>
        {/* Content */}
        {!collapsed && <div className="p-3 overflow-auto max-h-[60vh]">{children}</div>}
      </div>
    </div>
  );
}

/* ---------- Helpers: distance & geocoding (Jamaica) ---------- */
const toRad = (d) => (d * Math.PI) / 180;
function haversineMiles(lat1, lon1, lat2, lon2) {
  const R_km = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const km = R_km * c;
  return km * 0.621371;
}

const JAMAICA_PARISHES = [
  "Kingston", "Saint Andrew", "Saint Thomas", "Portland", "Saint Mary",
  "Saint Ann", "Trelawny", "Saint James", "Hanover", "Westmoreland",
  "Saint Elizabeth", "Manchester", "Clarendon", "Saint Catherine",
];

function normalizeParish(name) {
  if (!name) return "";
  let n = String(name)
    .replace(/parish/gi, "")
    .replace(/^st[.\s]/i, "Saint ")
    .trim();
  return n.toLowerCase();
}

function matchParishName(anyString) {
  if (!anyString) return null;
  const s = normalizeParish(anyString);
  const found = JAMAICA_PARISHES.find(p => normalizeParish(p) === s || s.includes(normalizeParish(p)));
  return found || null;
}

async function geocodeNominatimJM(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&countrycodes=jm&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      "Accept-Language": "en",
    },
  });
  if (!res.ok) throw new Error(`Geocode failed (${res.status})`);
  const arr = await res.json();
  if (!arr || !arr.length) throw new Error("No results found");
  const item = arr[0];
  const lat = parseFloat(item.lat);
  const lon = parseFloat(item.lon);
  const addr = item.address || {};
  const parishGuess =
    matchParishName(addr.parish) ||
    matchParishName(addr.state) ||
    matchParishName(addr.county) ||
    matchParishName(addr.region) ||
    null;
  return {
    lat,
    lon,
    displayName: item.display_name,
    parish: parishGuess, // may be null
    rawAddress: addr,
  };
}

async function reverseGeocodeNominatimJM(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&zoom=12&lat=${lat}&lon=${lon}`;
  const res = await fetch(url, {
    headers: {
      "Accept-Language": "en",
    },
  });
  if (!res.ok) throw new Error(`Reverse geocode failed (${res.status})`);
  const data = await res.json();
  const addr = data.address || {};
  const parishGuess =
    matchParishName(addr.parish) ||
    matchParishName(addr.state) ||
    matchParishName(addr.county) ||
    matchParishName(addr.region) ||
    null;
  return {
    displayName: data.display_name,
    parish: parishGuess,
  };
}

/* ---------- 3D Objects: loader + items layer ---------- */
function GLTFModel({ url, modelScale = 1, scale, rotation = [0, 0, 0] }) {
  const { scene } = useGLTF(url);
  const s = scale ?? modelScale;
  return (
    <Center top>
      <primitive object={scene} scale={s} rotation={rotation} />
    </Center>
  );
}

function SceneObject({
  obj,
  selected,
  onSelect,
  onChange,
  onTransformStart,
  onTransformEnd,
  mode = "translate",
  snap = { t: 0, r: 0, s: 0 },
  bounds = { sizeX: 10, sizeY: 10 },
}) {
  const groupRef = useRef();

  const clampToRoom = (x, z) => {
    const halfX = bounds.sizeX / 2;
    const halfZ = bounds.sizeY / 2;
    return [
      Math.min(halfX, Math.max(-halfX, x)),
      Math.min(halfZ, Math.max(-halfZ, z)),
    ];
  };

  const handleChange = () => {
    if (!groupRef.current) return;
    const g = groupRef.current;

    // Keep upright and on floor
    g.position.y = 0;
    g.rotation.x = 0;
    g.rotation.z = 0;

    // Clamp to room
    const [cx, cz] = clampToRoom(g.position.x, g.position.z);
    g.position.set(cx, 0, cz);

    // Enforce uniform scale (use X as source)
    const s = Math.max(0.01, g.scale.x);
    g.scale.set(s, s, s);

    onChange(obj.id, {
      position: [g.position.x, g.position.y, g.position.z],
      rotationY: g.rotation.y,
      scale: s,
    });
  };

  // Configure which handles to show
  const showHandles = {
    translate: { showX: true, showY: false, showZ: true },
    rotate: { showX: false, showY: true, showZ: false }, // rotate only around Y
    scale: { showX: true, showY: false, showZ: true },
  }[mode] || { showX: true, showY: false, showZ: true };

  const content = (
    <group
      ref={groupRef}
      position={obj.position || [0, 0, 0]}
      rotation={[0, obj.rotationY || 0, 0]}
      scale={obj.scale || 1}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(obj.id);
      }}
    >
      <Suspense
        fallback={
          <mesh>
            <boxGeometry args={[0.8, 0.6, 1.2]} />
            <meshStandardMaterial color="#8a8a8a" />
          </mesh>
        }
      >
        <GLTFModel url={obj.url} modelScale={obj.modelScale || 1} />
      </Suspense>
    </group>
  );

  if (!selected) return content;

  return (
    <TransformControls
      mode={mode}
      enabled
      showX={showHandles.showX}
      showY={showHandles.showY}
      showZ={showHandles.showZ}
      onMouseDown={onTransformStart}
      onMouseUp={() => {
        handleChange();
        onTransformEnd();
      }}
      onChange={handleChange}
      translationSnap={snap.t || undefined}
      rotationSnap={snap.r || undefined}
      scaleSnap={snap.s || undefined}
    >
      {content}
    </TransformControls>
  );
}

function ObjectsLayer({
  objects = [],
  selectedId,
  onSelect,
  onChange,
  onTransformStart,
  onTransformEnd,
  mode,
  snap,
  sizeX,
  sizeY,
}) {
  return (
    <group>
      {objects.map((obj) => (
        <SceneObject
          key={obj.id}
          obj={obj}
          selected={obj.id === selectedId}
          onSelect={onSelect}
          onChange={onChange}
          onTransformStart={onTransformStart}
          onTransformEnd={onTransformEnd}
          mode={mode}
          snap={snap}
          bounds={{ sizeX, sizeY }}
        />
      ))}
    </group>
  );
}

export default function App() {
  // --- Auth/state ---
  const [loggedInUser,     setLoggedInUser] = useState(null);
  const [username,         setUsername] = useState("");
  const [password,         setPassword] = useState("");
  const [name,             setName] = useState("");
  const [employeeId,       setEmployeeId] = useState("");
  const [rememberMe,       setRememberMe] = useState(false);
  const [isRegistering,    setIsRegistering] = useState(false);

  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem("orders");
    return saved ? JSON.parse(saved) : [];
  });

  // Showroom & calculator states
  const [tile, setTile] = useState("Marble");
  const [wallTile, setWallTile] = useState("Marble");
  const [previewTarget, setPreviewTarget] = useState("both");
  const [wallColor, setWallColor] = useState("#ffffff");

  const [tileLength, setTileLength] = useState("");
  const [tileWidth,  setTileWidth]  = useState("");
  const [tileUnit,   setTileUnit]   = useState("m");
  const [tilePrice,  setTilePrice]  = useState("");
  const [roomLength, setRoomLength] = useState("");
  const [roomWidth,  setRoomWidth]  = useState("");
  const [roomUnit,   setRoomUnit]   = useState("m");
  const [result,     setResult]     = useState(null);

  const [useRealScale, setUseRealScale] = useState(true);
  const [roughness,    setRoughness]    = useState(0.7);
  const [metalness,    setMetalness]    = useState(0.05);

  const [showTiledPreview, setShowTiledPreview] = useState(true);
  const [previewRepeat,    setPreviewRepeat]    = useState(4);

  const [groutMm,     setGroutMm]     = useState(3);
  const [groutColor,  setGroutColor]  = useState("#d6d6d6");

  // Enhanced lighting controls (global)
  const [enhancedLight, setEnhancedLight] = useState(true);
  const [lightStrength, setLightStrength] = useState(1);   // 0..2
  const [lightSoftness, setLightSoftness] = useState(0.7); // 0..1
  const [lightColor,    setLightColor]    = useState("#ffffff");

  // Delivery Info
  const [deliveryMethod, setDeliveryMethod] = useState("pickup"); // "pickup" | "delivery"
  const [deliveryMiles, setDeliveryMiles] = useState("");
  const [isNewParish, setIsNewParish] = useState(false);
  const [deliveryCost, setDeliveryCost] = useState(0);

  // Store selection (for auto-distance)
  const STORES = [
    { id: "KNG", name: "Kingston (HWT)", lat: 18.0179, lon: -76.7936, parish: "Saint Andrew" },
    { id: "MBJ", name: "Montego Bay",    lat: 18.4667, lon: -77.9167, parish: "Saint James" },
    { id: "MAN", name: "Mandeville",     lat: 18.0425, lon: -77.5075, parish: "Manchester" },
    { id: "OCH", name: "Ocho Rios",      lat: 18.4075, lon: -77.1031, parish: "Saint Ann" },
    { id: "SPN", name: "Spanish Town",   lat: 17.9970, lon: -76.9570, parish: "Saint Catherine" },
  ];
  const [selectedStoreId, setSelectedStoreId] = useState(STORES[0].id);

  // Auto-distance lookup state
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoError, setAutoError] = useState("");
  const [autoTotalMiles, setAutoTotalMiles] = useState(0);  // estimated total distance
  const [detectedParish, setDetectedParish] = useState(""); // from geocode
  const [roadFactor, setRoadFactor] = useState(1.25);       // straight-line -> road estimate

  // 3D Objects
  const OBJECT_CATALOG = useMemo(() => ([
    // Bedroom
    { assetId: "bed_queen",   label: "Bed (Queen)",   url: "/models/bed_queen.glb",   category: "Bedroom", modelScale: 1 },
    { assetId: "nightstand",  label: "Nightstand",    url: "/models/nightstand.glb",  category: "Bedroom", modelScale: 1 },
    { assetId: "wardrobe",    label: "Wardrobe",      url: "/models/wardrobe.glb",    category: "Bedroom", modelScale: 1 },

    // Living Room
    { assetId: "sofa_3",      label: "Sofa (3-Seater)", url: "/models/sofa_3.glb",   category: "Living Room", modelScale: 1 },
    { assetId: "coffee_tbl",  label: "Coffee Table",    url: "/models/coffee_table.glb", category: "Living Room", modelScale: 1 },

    // Kitchen
    { assetId: "kitchen_cab", label: "Kitchen Cabinet", url: "/models/kitchen_cabinet.glb", category: "Kitchen", modelScale: 1 },
    { assetId: "fridge",      label: "Fridge",          url: "/models/fridge.glb",    category: "Kitchen", modelScale: 1 },

    // Bathroom
    { assetId: "toilet",      label: "Toilet",          url: "/models/toilet.glb",    category: "Bathroom", modelScale: 1 },
    { assetId: "sink",        label: "Sink",            url: "/models/sink.glb",      category: "Bathroom", modelScale: 1 },
    { assetId: "bathtub",     label: "Bathtub",         url: "/models/bathtub.glb",   category: "Bathroom", modelScale: 1 },

    // Misc
    { assetId: "plant",       label: "Plant",           url: "/models/plant.glb",     category: "Misc", modelScale: 1 },
  ]), []);

  const [objects, setObjects] = useState([]); // placed objects in scene
  const [selectedObjectId, setSelectedObjectId] = useState(null);
  const [transformMode, setTransformMode] = useState("translate"); // translate | rotate | scale
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [snapT, setSnapT] = useState(0.5); // meters
  const [snapRdeg, setSnapRdeg] = useState(22.5); // degrees
  const [snapS, setSnapS] = useState(0.1);
  const [orbitEnabled, setOrbitEnabled] = useState(true);
  const [objectCategory, setObjectCategory] = useState("Bedroom");

  // Preload GLTF models (optional; safe if files missing)
  useEffect(() => {
    try {
      OBJECT_CATALOG.forEach(a => {
        if (a?.url) useGLTF.preload(a.url);
      });
    } catch {
      // ignore
    }
  }, [OBJECT_CATALOG]);

  const selectedObject = useMemo(
    () => objects.find((o) => o.id === selectedObjectId) || null,
    [objects, selectedObjectId]
  );

  const snap = useMemo(
    () => ({
      t: snapEnabled ? snapT : 0,
      r: snapEnabled ? (snapRdeg * Math.PI) / 180 : 0,
      s: snapEnabled ? snapS : 0,
    }),
    [snapEnabled, snapT, snapRdeg, snapS]
  );

  const addObject = (assetId) => {
    const asset = OBJECT_CATALOG.find((a) => a.assetId === assetId);
    if (!asset) return;
    const id = `obj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newObj = {
      id,
      assetId,
      label: asset.label,
      url: asset.url,
      modelScale: asset.modelScale || 1,
      position: [0, 0, 0],
      rotationY: 0,
      scale: 1,
    };
    setObjects((prev) => [...prev, newObj]);
    setSelectedObjectId(id);
  };

  const removeObject = (id) => {
    setObjects((prev) => prev.filter((o) => o.id !== id));
    if (selectedObjectId === id) setSelectedObjectId(null);
  };

  const updateObject = (id, patch) => {
    setObjects((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  };

  // Customer info
  const [customerName,    setCustomerName]    = useState("");
  const [customerPhone,   setCustomerPhone]   = useState("");
  const [customerEmail,   setCustomerEmail]   = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerNotes,   setCustomerNotes]   = useState("");

  const textures = {
    Marble: "/textures/marble.jpg",
    Granite: "/textures/granite.jpg",
    Porcelain: "/textures/porcelain.jpg",
    Ceramic: "/textures/ceramic.jpg",
  };

  // Default sales rep + auto-login
  useEffect(() => {
    const reps = JSON.parse(localStorage.getItem("salesReps") || "[]");
    if (reps.length === 0) {
      const defaultRep = {
        id: 1,
        name: "Default Rep",
        username: "rep1",
        password: "1234",
        employeeId: "EMP001",
      };
      localStorage.setItem("salesReps", JSON.stringify([defaultRep]));
    }
    try {
      const storedUser =
        JSON.parse(localStorage.getItem("loggedInUser")) ||
        JSON.parse(sessionStorage.getItem("loggedInUser"));
      if (storedUser) setLoggedInUser(storedUser);
    } catch (err) {
      // ignore
    }
  }, []);

  // Helpers
  const convertToMeters = (value, unit) => {
    const v = parseFloat(value);
    if (isNaN(v) || v <= 0) return 0;
    if (unit === "ft") return v * 0.3048;
    if (unit === "in") return v * 0.0254;
    return v;
  };

  // Delivery cost helper
  const computeDeliveryCost = (method, milesInput, newParish) => {
    if (method !== "delivery") return 0;
    const miles = parseFloat(milesInput);

    if (newParish) {
      const insideMiles = isNaN(miles) || miles < 0 ? 0 : miles;
      return 3500 + insideMiles * 450;
    } else {
      if (isNaN(miles) || miles <= 0) return 0;
      return miles <= 5 ? 1500 : 1500 + (miles - 5) * 250;
    }
  };

  // Keep deliveryCost in sync as the user edits fields
  useEffect(() => {
    setDeliveryCost(computeDeliveryCost(deliveryMethod, deliveryMiles, isNewParish));
  }, [deliveryMethod, deliveryMiles, isNewParish]);

  // Auto-distance lookup
  const selectedStore = STORES.find(s => s.id === selectedStoreId) || STORES[0];

  const applyAutoDistanceToUI = (totalMiles, destParishGuess) => {
    setAutoTotalMiles(totalMiles);
    setDetectedParish(destParishGuess || "");

    // Auto-detect crossing based on parish, but allow manual override
    if (destParishGuess) {
      const cross = normalizeParish(destParishGuess) !== normalizeParish(selectedStore.parish);
      setIsNewParish(cross);
      if (cross) {
        // Estimate miles within new parish: assume last 30% of the trip is inside new parish
        const estimateInside = Math.max(1, +(totalMiles * 0.3).toFixed(1));
        setDeliveryMiles(String(estimateInside));
      } else {
        setDeliveryMiles(String(+totalMiles.toFixed(1)));
      }
    } else {
      // Unknown parish; default to within-parish miles = total
      setDeliveryMiles(String(+totalMiles.toFixed(1)));
    }
  };

  const handleLookupFromAddress = async () => {
    if (!customerAddress.trim()) {
      alert("Enter a customer address (Jamaica) in the Customer Information section first.");
      return;
    }
    setAutoError("");
    setAutoLoading(true);
    try {
      const geo = await geocodeNominatimJM(customerAddress.trim());
      const straight = haversineMiles(selectedStore.lat, selectedStore.lon, geo.lat, geo.lon);
      const estimated = straight * roadFactor;
      applyAutoDistanceToUI(estimated, geo.parish);
    } catch (e) {
      setAutoError(e.message || "Address lookup failed.");
    } finally {
      setAutoLoading(false);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setAutoError("Geolocation is not supported by this browser.");
      return;
    }
    setAutoError("");
    setAutoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const straight = haversineMiles(selectedStore.lat, selectedStore.lon, latitude, longitude);
          const estimated = straight * roadFactor;

          // Try to reverse-geocode for parish (optional)
          let parishGuess = "";
          try {
            const rev = await reverseGeocodeNominatimJM(latitude, longitude);
            parishGuess = rev.parish || "";
          } catch {
            parishGuess = "";
          }
          applyAutoDistanceToUI(estimated, parishGuess);
        } catch (e) {
          setAutoError(e.message || "Failed to compute distance.");
        } finally {
          setAutoLoading(false);
        }
      },
      (err) => {
        setAutoLoading(false);
        setAutoError(err?.message || "Unable to get current location.");
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  // Calculator (extended with thinset + delivery)
  const handleCalculate = () => {
    const tLength = convertToMeters(tileLength, tileUnit);
    const tWidth  = convertToMeters(tileWidth,  tileUnit);
    const rLength = convertToMeters(roomLength, roomUnit);
    const rWidth  = convertToMeters(roomWidth,  roomUnit);
    const price   = parseFloat(tilePrice);

    if (!tLength || !tWidth || !rLength || !rWidth || !price) {
      alert("Please enter all values correctly");
      return;
    }

    const tileArea = tLength * tWidth;      // m² per tile
    const roomArea = rLength * rWidth;      // m² total
    const tilesNeeded   = Math.ceil(roomArea / tileArea);
    const tileTotalCost = tilesNeeded * price;

    // Thinset: 1 (50 lb bag) covers 50 ft² at $1,500 per bag
    const roomAreaSqFt = roomArea * 10.7639;
    const THINSET_BAG_COVERAGE_SQFT = 50;
    const THINSET_BAG_PRICE         = 1500;
    const thinsetBags = Math.max(0, Math.ceil(roomAreaSqFt / THINSET_BAG_COVERAGE_SQFT));
    const thinsetCost = thinsetBags * THINSET_BAG_PRICE;

    // Delivery
    const deliveryCostNow = computeDeliveryCost(deliveryMethod, deliveryMiles, isNewParish);

    // Grand total includes tile + thinset + delivery
    const grandTotal = tileTotalCost + thinsetCost + deliveryCostNow;

    setResult({
      tilesNeeded,
      totalCost: tileTotalCost,
      roomAreaM2: roomArea,
      roomAreaSqFt,
      thinsetBags,
      thinsetBagCoverageSqFt: THINSET_BAG_COVERAGE_SQFT,
      thinsetBagPrice: THINSET_BAG_PRICE,
      thinsetCost,
      // Delivery details
      delivery: {
        method: deliveryMethod,
        isNewParish,
        miles: parseFloat(deliveryMiles) || 0, // within parish: total miles; new parish: miles inside new parish
        cost: deliveryCostNow,
        // Auto-distance enrichments
        store: {
          id: selectedStore.id,
          name: selectedStore.name,
          parish: selectedStore.parish,
          lat: selectedStore.lat,
          lon: selectedStore.lon,
        },
        auto: {
          totalMilesEstimate: autoTotalMiles || 0,
          detectedParish: detectedParish || "",
          roadFactor,
        },
      },
      grandTotal,
    });
  };

  // IDs
  const generateOrderId = () => {
    const timestamp  = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `ORD-${timestamp}-${randomPart}`;
  };

  const generateTicketNumber = () => {
    const existing = new Set((JSON.parse(localStorage.getItem("orders") || "[]")).map(o => o.ticketNumber));
    let ticket = "";
    do {
      const chunk1 = Math.random().toString(36).slice(2, 6).toUpperCase();
      const chunk2 = Math.random().toString(36).slice(2, 6).toUpperCase();
      ticket = `TRU-${chunk1}-${chunk2}`;
    } while (existing.has(ticket));
    return ticket;
  };

  const handlePlaceOrder = () => {
    if (!result) {
      alert("Please calculate tiles and cost first.");
      return;
    }
    if (!loggedInUser) {
      alert("No sales rep logged in.");
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      alert("Please enter customer name and phone number.");
      return;
    }
    if (deliveryMethod === "delivery" && !isNewParish) {
      const miles = parseFloat(deliveryMiles);
      if (isNaN(miles) || miles <= 0) {
        alert("Please enter delivery miles (within parish).");
        return;
      }
    }

    const {
      tilesNeeded,
      totalCost,
      thinsetBags = 0,
      thinsetCost = 0,
      thinsetBagPrice = 1500,
      delivery = {},
      grandTotal = (totalCost + thinsetCost + (delivery?.cost || 0)),
    } = result;

    const order = {
      orderId: generateOrderId(),
      ticketNumber: generateTicketNumber(),
      salesRep: loggedInUser.name,
      employeeId: loggedInUser.employeeId,
      // Customer info
      customer: {
        name: customerName.trim(),
        phone: customerPhone.trim(),
        email: customerEmail.trim(),
        address: customerAddress.trim(),
        notes: customerNotes.trim(),
      },
      // Selection
      tile,
      wallTile,
      tileDimensions: { length: tileLength, width: tileWidth, unit: tileUnit },
      tilePrice,
      roomDimensions: { length: roomLength, width: roomWidth, unit: roomUnit },
      // Calculations
      tilesNeeded,
      totalCost,
      thinset: {
        bags: thinsetBags,
        bagPrice: thinsetBagPrice,
        cost: thinsetCost,
      },
      // Delivery (includes store + auto info)
      delivery,
      grandTotal,
      createdAt: new Date().toISOString(),
    };

    const updatedOrders = [...orders, order];
    setOrders(updatedOrders);
    localStorage.setItem("orders", JSON.stringify(updatedOrders));

    const deliveryLine =
      delivery?.method === "delivery"
        ? `Delivery: ${delivery?.isNewParish ? "New parish" : "Within parish"} — Miles used: ${delivery?.miles ?? 0} = $${Number(delivery?.cost || 0).toFixed(2)}\n`
        : `Delivery: Pickup\n`;

    alert(
      `✅ Order Created!\n` +
        `Ticket: ${order.ticketNumber}\n` +
        `Order ID: ${order.orderId}\n` +
        `Customer: ${order.customer.name} (${order.customer.phone})\n` +
        `Sales Rep: ${order.salesRep} | ${order.employeeId}\n` +
        `Tiles Needed: ${tilesNeeded}\n` +
        `Tile Cost: $${Number(totalCost).toFixed(2)}\n` +
        `Thinset: ${thinsetBags} bag(s) x $${thinsetBagPrice.toLocaleString()} = $${Number(thinsetCost).toFixed(2)}\n` +
        (delivery?.store ? `Store: ${delivery.store.name} (${delivery.store.parish})\n` : "") +
        (delivery?.auto?.totalMilesEstimate ? `Auto distance (est): ${delivery.auto.totalMilesEstimate.toFixed(1)} mi${delivery?.auto?.detectedParish ? ` • Dest parish: ${delivery.auto.detectedParish}` : ""}\n` : "") +
        deliveryLine +
        `Grand Total: $${Number(grandTotal).toFixed(2)}`
    );

    // Optional: clear customer fields after placing order
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setCustomerAddress("");
    setCustomerNotes("");
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (!name || !username || !password || !employeeId) {
      alert("Please fill in all fields");
      return;
    }
    const reps = JSON.parse(localStorage.getItem("salesReps") || "[]");
    if (reps.some((rep) => rep.username === username)) {
      alert("Username already exists");
      return;
    }
    const newRep = { id: Date.now(), name, username, password, employeeId };
    localStorage.setItem("salesReps", JSON.stringify([...reps, newRep]));
    alert("✅ Registered! You can now log in.");
    setIsRegistering(false);
    setName("");
    setUsername("");
    setPassword("");
    setEmployeeId("");
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const reps = JSON.parse(localStorage.getItem("salesReps") || "[]");
    const found = reps.find((rep) => rep.username === username && rep.password === password);
    if (found) {
      setLoggedInUser(found);
      if (rememberMe) {
        localStorage.setItem("loggedInUser", JSON.stringify(found));
        sessionStorage.removeItem("loggedInUser");
      } else {
        sessionStorage.setItem("loggedInUser", JSON.stringify(found));
        localStorage.removeItem("loggedInUser");
      }
      setUsername("");
      setPassword("");
      setRememberMe(false);
    } else {
      alert("Invalid username or password");
    }
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    localStorage.removeItem("loggedInUser");
    sessionStorage.removeItem("loggedInUser");
  };

  // Compute dimensions
  const roomWm  = convertToMeters(roomWidth,  roomUnit) || 10;
  const roomLm  = convertToMeters(roomLength, roomUnit) || 10;
  const tileWm  = convertToMeters(tileWidth,  tileUnit) || 0.3;
  const tileLm  = convertToMeters(tileLength, tileUnit) || 0.3;

  const repeatsXReal = Math.max(1, Math.round(roomWm / tileWm));
  const repeatsYReal = Math.max(1, Math.round(roomLm / tileLm));
  const fixedRepeat  = 8;

  const repeatX = useRealScale ? repeatsXReal : fixedRepeat;
  const repeatY = useRealScale ? repeatsYReal : fixedRepeat;

  const floorSizeX = useRealScale ? roomWm : 10;
  const floorSizeY = useRealScale ? roomLm : 10;
  const wallHeight = 3;

  const camX = Math.max(5, floorSizeX);
  const camY = Math.max(3, wallHeight);
  const camZ = Math.max(5, floorSizeY);

  const floorGroutAllowed = repeatX * repeatY <= 900;

  // Memoize floor props
  const floorProps = useMemo(
    () => ({
      tileTexture: textures[tile],
      repeatX,
      repeatY,
      sizeX: floorSizeX,
      sizeY: floorSizeY,
      roughness,
      metalness,
    }),
    [tile, repeatX, repeatY, floorSizeX, floorSizeY, roughness, metalness]
  );

  // For bounding the draggable overlay
  const canvasContainerRef = useRef(null);

  // Auth screen
  if (!loggedInUser) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-purple-900 text-white p-4">
      <form
        onSubmit={isRegistering ? handleRegister : handleLogin}
        className="bg-white text-black p-6 rounded-xl shadow-md w-80 mb-6"
      >
        <h2 className="text-xl font-bold mb-4 text-center">
          {isRegistering ? "Register Sales Rep" : "Sales Rep Login"}
        </h2>
        {isRegistering && (
          <>
            <input placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border rounded mb-3" />
            <input placeholder="Employee ID" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full p-2 border rounded mb-3" />
          </>
        )}
        <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-2 border rounded mb-3" />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2 border rounded mb-3" />
        {!isRegistering && (
          <label className="flex items-center mb-3">
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="mr-2" /> Remember Me
          </label>
        )}
        <button type="submit" className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700">{isRegistering ? "Register" : "Login"}</button>
        <p onClick={() => setIsRegistering(!isRegistering)} className="text-sm text-center mt-4 cursor-pointer text-blue-600">
          {isRegistering ? "Already have an account? Login" : "New here? Register"}
        </p>
      </form>

      {/* Terms of Use Accordion (open by default) */}
      <details open className="bg-white/95 text-black rounded p-4 w-80 text-xs leading-relaxed shadow">
        <summary className="cursor-pointer font-semibold mb-2">
          Terms of Use
        </summary>
        <p>
          Welcome to the Tiles 3D Showroom demo. By using this demo application, you agree to the following terms:
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>This is a demonstration tool only; calculations, previews, and 3D visualizations are illustrative and approximate.</li>
          <li>All demo content (textures, models, user interface) is the property of <strong>Product Bay Group</strong>.</li>
          <li><strong>All source code, software logic, and related intellectual property of this tool are solely owned by Ashandie Powell.</strong></li>
          <li>Unauthorized reproduction, redistribution, resale, or modification of the code, in whole or in part, is strictly prohibited without prior written consent.</li>
          <li>Any information entered is treated as demo data only and is not private or secure.</li>
        </ul>
        <p className="mt-3 text-xs italic">
          © {new Date().getFullYear()} Product Bay Group. All rights reserved.<br/>
          Source Code Copyright © {new Date().getFullYear()} <strong>Ashandie Powell</strong>.
        </p>
      </details>
    </div>
  );
}

  // Main UI
  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-purple-900 to-purple-600 text-white p-4">
      <div className="flex justify-between items-center w-full max-w-4xl mb-6">
        <h1 className="text-3xl font-bold">Tiles-Я-Us 3D Showroom</h1>
        <div>
          <span className="mr-4">Logged in as: {loggedInUser.name} ({loggedInUser.employeeId})</span>
          <button onClick={handleLogout} className="bg-red-500 text-white py-1 px-3 rounded hover:bg-red-600">Logout</button>
        </div>
      </div>

      {/* 3D Canvas with draggable overlay controls */}
<div
  ref={canvasContainerRef}
  className="w-full max-w-6xl h-[75vh] mb-6 bg-white rounded-xl shadow-lg overflow-hidden relative"
>
        {/* Draggable overlay containing showroom controls */}
        <DraggablePanel containerRef={canvasContainerRef} title="Showroom Controls">
          {/* Tile choices */}
          <div className="mb-3">
            <label className="block text-xs font-medium mb-1">Floor Tile</label>
            <select value={tile} onChange={(e) => setTile(e.target.value)} className="w-full p-1.5 border rounded text-sm">
              {Object.keys(textures).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium mb-1">Wall Tile</label>
            <select value={wallTile} onChange={(e) => setWallTile(e.target.value)} className="w-full p-1.5 border rounded text-sm">
              {Object.keys(textures).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Preview target */}
          <div className="mb-3">
            <label className="block text-xs font-medium mb-1">Preview Target</label>
            <div className="flex items-center gap-3 text-xs">
              <label className="flex items-center gap-1">
                <input type="radio" checked={previewTarget === "both"} onChange={() => setPreviewTarget("both")} />
                Both
              </label>
              <label className="flex items-center gap-1">
                <input type="radio" checked={previewTarget === "floor"} onChange={() => setPreviewTarget("floor")} />
                Floor
              </label>
              <label className="flex items-center gap-1">
                <input type="radio" checked={previewTarget === "wall"} onChange={() => setPreviewTarget("wall")} />
                Wall
              </label>
            </div>
          </div>

          {/* Preview mode */}
          <div className="mb-3">
            <label className="block text-xs font-medium mb-1">Preview Mode</label>
            <div className="flex items-center gap-3 text-xs">
              <label className="flex items-center gap-1">
                <input type="radio" checked={useRealScale} onChange={() => setUseRealScale(true)} />
                Real-scale
              </label>
              <label className="flex items-center gap-1">
                <input type="radio" checked={!useRealScale} onChange={() => setUseRealScale(false)} />
                Fixed preview
              </label>
            </div>
          </div>

          {/* Material sliders */}
          <div className="mb-3">
            <label className="block text-xs mb-1">Roughness: {roughness.toFixed(2)}</label>
            <input type="range" min="0" max="1" step="0.01" value={roughness} onChange={(e) => setRoughness(parseFloat(e.target.value))} className="w-full" />
          </div>
          <div className="mb-3">
            <label className="block text-xs mb-1">Metalness: {metalness.toFixed(2)}</label>
            <input type="range" min="0" max="1" step="0.01" value={metalness} onChange={(e) => setMetalness(parseFloat(e.target.value))} className="w-full" />
          </div>

          {/* Grout controls */}
          <div className="mb-3">
            <label className="block text-xs font-medium mb-1">Grout Color</label>
            <input
              type="color"
              value={groutColor}
              onChange={(e) => setGroutColor(e.target.value)}
              className="w-full h-8 p-0 border rounded"
            />
          </div>
          <div className="mb-3">
            <label className="block text-xs mb-1">Grout size (mm): {groutMm} mm</label>
            <input type="range" min="0" max="15" step="0.5" value={groutMm} onChange={(e) => setGroutMm(parseFloat(e.target.value))} className="w-full" />
          </div>

          {/* Close-up preview tweaks */}
          <div className="mb-3 border-t pt-3">
            <label className="flex items-center gap-2 text-xs mb-2">
              <input type="checkbox" checked={showTiledPreview} onChange={(e) => setShowTiledPreview(e.target.checked)} />
              Show tiled in close-up preview
            </label>
            {showTiledPreview && (
              <div className="mb-1">
                <label className="block text-xs mb-1">Repeat (tiles across): {previewRepeat}</label>
                <input type="range" min="1" max="12" step="1" value={previewRepeat} onChange={(e) => setPreviewRepeat(parseInt(e.target.value, 10))} className="w-full" />
              </div>
            )}
          </div>

          {/* Enhanced lighting */}
          <div className="mt-1 border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold">Enhanced Lighting</span>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={enhancedLight} onChange={(e) => setEnhancedLight(e.target.checked)} />
                Enabled
              </label>
            </div>
            <div className="mb-2">
              <label className="block text-xs mb-1">Intensity: {lightStrength.toFixed(2)}x</label>
              <input type="range" min="0" max="2" step="0.01" value={lightStrength} onChange={(e) => setLightStrength(parseFloat(e.target.value))} className="w-full" />
            </div>
            <div className="mb-2">
              <label className="block text-xs mb-1">Softness: {Math.round(lightSoftness * 100)}%</label>
              <input type="range" min="0" max="1" step="0.01" value={lightSoftness} onChange={(e) => setLightSoftness(parseFloat(e.target.value))} className="w-full" />
            </div>
            <div className="mb-1">
              <label className="block text-xs mb-1">Light Color</label>
              <input type="color" value={lightColor} onChange={(e) => setLightColor(e.target.value)} className="w-full h-8 p-0 border rounded" />
            </div>
          </div>
        </DraggablePanel>

        {/* Objects Panel */}
        <DraggablePanel containerRef={canvasContainerRef} title="Objects" defaultCollapsed={true}>
          <div className="space-y-3 text-xs">
            {/* Catalog filter */}
            <div>
              <label className="block mb-1 font-medium">Category</label>
              <select
                value={objectCategory}
                onChange={(e) => setObjectCategory(e.target.value)}
                className="w-full p-1.5 border rounded"
              >
                {Array.from(new Set(OBJECT_CATALOG.map((a) => a.category))).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Catalog items */}
            <div>
              <label className="block mb-1 font-medium">Add item</label>
              <div className="grid grid-cols-2 gap-2">
                {OBJECT_CATALOG.filter((a) => a.category === objectCategory).map((a) => (
                  <button
                    key={a.assetId}
                    onClick={() => addObject(a.assetId)}
                    className="border rounded p-2 hover:bg-gray-100 text-left"
                    title={`Add ${a.label}`}
                  >
                    + {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Transform mode */}
            <div className="border-t pt-2">
              <div className="font-medium mb-1">Transform</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setTransformMode("translate")}
                  className={`px-2 py-1 rounded border ${transformMode === "translate" ? "bg-purple-600 text-white" : "bg-white"}`}
                >
                  Move
                </button>
                <button
                  onClick={() => setTransformMode("rotate")}
                  className={`px-2 py-1 rounded border ${transformMode === "rotate" ? "bg-purple-600 text-white" : "bg-white"}`}
                >
                  Rotate
                </button>
                <button
                  onClick={() => setTransformMode("scale")}
                  className={`px-2 py-1 rounded border ${transformMode === "scale" ? "bg-purple-600 text-white" : "bg-white"}`}
                >
                  Scale
                </button>
              </div>
              <label className="flex items-center gap-2 mt-2">
                <input type="checkbox" checked={snapEnabled} onChange={(e) => setSnapEnabled(e.target.checked)} />
                Snap
              </label>
              {snapEnabled && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div>
                    <div>Move (m)</div>
                    <input type="number" step="0.1" value={snapT} onChange={(e) => setSnapT(parseFloat(e.target.value) || 0)} className="w-full p-1 border rounded" />
                  </div>
                  <div>
                    <div>Rotate (°)</div>
                    <input type="number" step="1" value={snapRdeg} onChange={(e) => setSnapRdeg(parseFloat(e.target.value) || 0)} className="w-full p-1 border rounded" />
                  </div>
                  <div>
                    <div>Scale</div>
                    <input type="number" step="0.05" value={snapS} onChange={(e) => setSnapS(parseFloat(e.target.value) || 0)} className="w-full p-1 border rounded" />
                  </div>
                </div>
              )}
            </div>

            {/* Placed objects list */}
            <div className="border-t pt-2">
              <div className="font-medium mb-1">Placed Items</div>
              {objects.length === 0 ? (
                <div className="text-gray-500">No items yet. Add from the catalog above.</div>
              ) : (
                <ul className="space-y-1">
                  {objects.map((o) => (
                    <li key={o.id} className={`flex items-center justify-between p-2 border rounded ${o.id === selectedObjectId ? "bg-purple-50 border-purple-300" : "bg-white"}`}>
                      <button onClick={() => setSelectedObjectId(o.id)} className="text-left">
                        {o.label}
                      </button>
                      <button onClick={() => removeObject(o.id)} className="text-red-600 text-xs">Remove</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Selected object properties */}
            {selectedObject && (
              <div className="border-t pt-2">
                <div className="font-medium mb-2">Selected: {selectedObject.label}</div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="text-[11px]">X (m)</div>
                    <input
                      type="number"
                      step="0.1"
                      value={selectedObject.position?.[0] ?? 0}
                      onChange={(e) => {
                        const x = parseFloat(e.target.value) || 0;
                        updateObject(selectedObject.id, { position: [x, 0, selectedObject.position?.[2] ?? 0] });
                      }}
                      className="w-full p-1 border rounded"
                    />
                  </div>
                  <div>
                    <div className="text-[11px]">Z (m)</div>
                    <input
                      type="number"
                      step="0.1"
                      value={selectedObject.position?.[2] ?? 0}
                      onChange={(e) => {
                        const z = parseFloat(e.target.value) || 0;
                        updateObject(selectedObject.id, { position: [selectedObject.position?.[0] ?? 0, 0, z] });
                      }}
                      className="w-full p-1 border rounded"
                    />
                  </div>
                  <div>
                    <div className="text-[11px]">Rot Y (°)</div>
                    <input
                      type="number"
                      step="1"
                      value={((selectedObject.rotationY || 0) * 180 / Math.PI).toString()}
                      onChange={(e) => {
                        const deg = parseFloat(e.target.value) || 0;
                        updateObject(selectedObject.id, { rotationY: (deg * Math.PI) / 180 });
                      }}
                      className="w-full p-1 border rounded"
                    />
                  </div>
                  <div className="col-span-3">
                    <div className="text-[11px]">Scale</div>
                    <input
                      type="range"
                      min="0.2"
                      max="3"
                      step="0.01"
                      value={selectedObject.scale || 1}
                      onChange={(e) => updateObject(selectedObject.id, { scale: parseFloat(e.target.value) || 1 })}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </DraggablePanel>

        <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-gray-600">Loading 3D Scene...</div>}>
          <Canvas
            shadows
            camera={{ position: [camX, camY, camZ], fov: 50 }}
            onPointerMissed={() => setSelectedObjectId(null)}
          >
            {/* Existing base lights */}
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 10, 5]} intensity={1} castShadow />

            {/* Soft lighting rig */}
            {enhancedLight && (
              <TilesRUsSoftLightRig strength={lightStrength} color={lightColor} softness={lightSoftness} />
            )}

            <OrbitControls enabled={orbitEnabled} />

            <group position={[0, 0, 0]}>
              {/* Back wall */}
              <WallPlane
                width={floorSizeX}
                height={wallHeight}
                position={[0, wallHeight / 2, -floorSizeY / 2]}
                rotationY={0}
                textureUrl={textures[wallTile]}
                useTexture={previewTarget === "wall" || previewTarget === "both"}
                fallbackColor={wallColor}
                roughness={roughness}
                metalness={metalness}
                envIntensity={enhancedLight ? Math.max(0, lightStrength) : 0}
                receiveShadow
              />
              {(previewTarget === "wall" || previewTarget === "both") && (
                <WallGroutLines
                  wallWidth={floorSizeX}
                  wallHeight={wallHeight}
                  tileWidthM={tileWm}
                  tileHeightM={tileLm}
                  groutMm={groutMm}
                  color={groutColor}
                  wallPosition={[0, wallHeight / 2, -floorSizeY / 2]}
                  wallRotationY={0}
                  zOffset={0.001}
                />
              )}

              {/* Side wall */}
              <WallPlane
                width={floorSizeY}
                height={wallHeight}
                position={[-floorSizeX / 2, wallHeight / 2, 0]}
                rotationY={Math.PI / 2}
                textureUrl={textures[wallTile]}
                useTexture={previewTarget === "wall" || previewTarget === "both"}
                fallbackColor={wallColor}
                roughness={roughness}
                metalness={metalness}
                envIntensity={enhancedLight ? Math.max(0, lightStrength) : 0}
                receiveShadow
              />
              {(previewTarget === "wall" || previewTarget === "both") && (
                <WallGroutLines
                  wallWidth={floorSizeY}
                  wallHeight={wallHeight}
                  tileWidthM={tileWm}
                  tileHeightM={tileLm}
                  groutMm={groutMm}
                  color={groutColor}
                  wallPosition={[-floorSizeX / 2, wallHeight / 2, 0]}
                  wallRotationY={Math.PI / 2}
                  zOffset={0.001}
                />
              )}

              {/* Floor */}
              {(previewTarget === "floor" || previewTarget === "both") && (
                <>
                  <Floor {...floorProps} />
                  {floorGroutAllowed && repeatX > 1 && repeatY > 1 && (
                    <GroutLines
                      sizeX={floorSizeX}
                      sizeY={floorSizeY}
                      repeatX={repeatX}
                      repeatY={repeatY}
                      thicknessMeters={Math.max(0.0005, Math.min(0.03, groutMm / 1000))}
                      color={groutColor}
                      y={0.005}
                    />
                  )}
                </>
              )}

              {/* Objects in room */}
              <ObjectsLayer
                objects={objects}
                selectedId={selectedObjectId}
                onSelect={(id) => setSelectedObjectId(id)}
                onChange={(id, patch) => updateObject(id, patch)}
                onTransformStart={() => setOrbitEnabled(false)}
                onTransformEnd={() => setOrbitEnabled(true)}
                mode={transformMode}
                snap={snap}
                sizeX={floorSizeX}
                sizeY={floorSizeY}
              />

              {/* Skirting */}
              <Skirting roomWm={floorSizeX} roomLm={floorSizeY} height={0.12} thickness={0.06} color={"#eaeaea"} />
            </group>
          </Canvas>
        </Suspense>
      </div>

      {/* Tile preview (viewer only — controls in overlay) */}
      <div className="w-full max-w-4xl grid grid-cols-1 gap-6 mb-6">
        <div className="bg-white text-black rounded-xl shadow-md p-4 flex flex-col items-center">
          <h3 className="font-semibold mb-2">Close-up Tile Preview</h3>
          <div className="w-full h-48 bg-black rounded overflow-hidden">
            <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-white text-xs">Loading...</div>}>
              <TilePreview
                textureUrl={textures[tile]}
                roughness={roughness}
                metalness={metalness}
                showTiled={showTiledPreview}
                previewRepeat={previewRepeat}
                groutMm={groutMm}
                groutColor={groutColor}
                lightEnabled={enhancedLight}
                lightStrength={lightStrength}
                lightColor={lightColor}
                lightSoftness={lightSoftness}
              />
            </Suspense>
          </div>
          <p className="text-sm text-gray-600 mt-2">Rotate / zoom to inspect detail</p>
        </div>
      </div>

      {/* Performance notice */}
      {!floorGroutAllowed && useRealScale && (
        <div className="mt-3 p-3 rounded bg-yellow-100 text-yellow-900 border border-yellow-200">
          <div className="text-sm">
            Grout preview is hidden for very large rooms to avoid performance issues.
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => setUseRealScale(false)}
              className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 text-sm"
            >
              Switch to Fixed Preview
            </button>
            <button
              onClick={() => {
                setShowTiledPreview(true);
                setPreviewRepeat((p) => Math.max(4, p));
              }}
              className="bg-white text-gray-800 border px-3 py-1 rounded hover:bg-gray-50 text-sm"
            >
              Show Close-up Grout Only
            </button>
          </div>
          <div className="text-xs text-gray-700 mt-2">
            (Tip: switch to fixed preview or use the close-up preview to inspect grout and seams.)
          </div>
        </div>
      )}

      {/* Calculator + Customer Info */}
      <div className="w-full max-w-4xl bg-white text-black rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Tile Calculator</h2>

        {/* Basic dimensions and pricing */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <input
            type="number"
            placeholder="Tile Length"
            value={tileLength}
            onChange={(e) => setTileLength(e.target.value)}
            className="p-2 border rounded"
          />
          <input
            type="number"
            placeholder="Tile Width"
            value={tileWidth}
            onChange={(e) => setTileWidth(e.target.value)}
            className="p-2 border rounded"
          />
          <select
            value={tileUnit}
            onChange={(e) => setTileUnit(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="m">Meters</option>
            <option value="ft">Feet</option>
            <option value="in">Inches</option>
          </select>
          <input
            type="number"
            placeholder="Tile Price"
            value={tilePrice}
            onChange={(e) => setTilePrice(e.target.value)}
            className="p-2 border rounded"
          />
          <input
            type="number"
            placeholder="Room Length"
            value={roomLength}
            onChange={(e) => setRoomLength(e.target.value)}
            className="p-2 border rounded"
          />
          <input
            type="number"
            placeholder="Room Width"
            value={roomWidth}
            onChange={(e) => setRoomWidth(e.target.value)}
            className="p-2 border rounded"
          />
          <select
            value={roomUnit}
            onChange={(e) => setRoomUnit(e.target.value)}
            className="col-span-2 p-2 border rounded"
          >
            <option value="m">Meters</option>
            <option value="ft">Feet</option>
            <option value="in">Inches</option>
          </select>
        </div>

        {/* Delivery / Pickup + Store & Auto-distance */}
        <div className="mt-4 p-3 rounded border bg-gray-50 text-sm">
          <div className="font-semibold mb-2">Delivery or Pickup</div>

          {/* Store selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1">Select Store</label>
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="w-full p-2 border rounded"
              >
                {STORES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <div className="text-xs text-gray-600 mt-1">Store parish: {selectedStore.parish}</div>
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs font-medium mb-1">Road factor</label>
              <input
                type="number"
                min="1"
                max="1.7"
                step="0.05"
                value={roadFactor}
                onChange={(e) => setRoadFactor(parseFloat(e.target.value) || 1.25)}
                className="w-full p-2 border rounded"
              />
              <div className="text-xs text-gray-600 mt-1">
                Multiplier to convert straight-line to driving miles (typical 1.2–1.4)
              </div>
            </div>
          </div>

          {/* Method */}
          <div className="flex items-center gap-4 mb-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="pickup"
                checked={deliveryMethod === "pickup"}
                onChange={() => setDeliveryMethod("pickup")}
              />
              Pickup
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="delivery"
                checked={deliveryMethod === "delivery"}
                onChange={() => setDeliveryMethod("delivery")}
              />
              Delivery
            </label>
          </div>

          {deliveryMethod === "delivery" && (
            <>
              {/* Auto-distance tools */}
              <div className="p-2 border rounded bg-white mb-3">
                <div className="font-semibold text-xs mb-2">Auto-distance tools</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <button
                    onClick={handleLookupFromAddress}
                    disabled={autoLoading || !customerAddress.trim()}
                    className={`py-1.5 px-3 rounded text-white ${autoLoading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
                    title={!customerAddress.trim() ? "Enter an address in Customer Information below" : "Estimate distance from address"}
                  >
                    {autoLoading ? "Estimating..." : "Use Customer Address"}
                  </button>
                  <button
                    onClick={handleUseMyLocation}
                    disabled={autoLoading}
                    className={`py-1.5 px-3 rounded text-white ${autoLoading ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"}`}
                  >
                    {autoLoading ? "Estimating..." : "Use My Location"}
                  </button>
                  <div className="flex items-center">
                    <div className="text-xs text-gray-700">
                      Auto est: <strong>{autoTotalMiles ? autoTotalMiles.toFixed(1) : "—"}</strong> mi
                      {detectedParish ? ` • Parish: ${detectedParish}` : ""}
                    </div>
                  </div>
                </div>
                {autoError && <div className="text-xs text-red-600 mt-2">{autoError}</div>}
                <div className="text-[11px] text-gray-500 mt-2">
                  Note: Distance is an estimate; delivery charges are calculated per policy below.
                </div>
              </div>

              {/* Manual confirmation / overrides */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 md:col-span-3">
                  <input
                    type="checkbox"
                    checked={isNewParish}
                    onChange={(e) => setIsNewParish(e.target.checked)}
                  />
                  Crossing parish border (new parish)?
                </label>

                <div className="md:col-span-1">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder={
                      isNewParish
                        ? "Miles within new parish"
                        : "Total miles from store"
                    }
                    value={deliveryMiles}
                    onChange={(e) => setDeliveryMiles(e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                  <div className="text-xs text-gray-600 mt-1">
                    {isNewParish
                      ? "Cost: $3,500 + $450 per mile within the new parish."
                      : "Cost: $1,500 for first 5 miles, then $250 per mile after."}
                  </div>
                </div>

                <div className="md:col-span-2 flex items-end">
                  <div className="w-full p-2 bg-white border rounded">
                    Estimated Delivery Cost: <strong>${deliveryCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <button
          onClick={handleCalculate}
          className="mt-4 w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700"
        >
          Calculate Tiles & Cost
        </button>

        {result && (
          <div className="mt-4 text-sm">
            <div className="font-semibold text-lg mb-1">Results</div>
            <div>
              Room Area: {result.roomAreaM2.toLocaleString(undefined, { maximumFractionDigits: 2 })} m²
              {" "}({result.roomAreaSqFt.toLocaleString(undefined, { maximumFractionDigits: 2 })} ft²)
            </div>
            <div className="mt-1">Tiles Needed: <strong>{result.tilesNeeded.toLocaleString()}</strong></div>
            <div>Tile Cost: <strong>${result.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
            <div className="mt-2">
              Thinset (50 lb bags): <strong>{result.thinsetBags.toLocaleString()}</strong> @ ${result.thinsetBagPrice.toLocaleString()} per bag
            </div>
            <div>
              Thinset Cost: <strong>${result.thinsetCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>

            {/* Delivery Summary */}
            {result.delivery && (
              <>
                <div className="mt-2">
                  Delivery: <strong>{result.delivery.method === "delivery" ? "Delivery" : "Pickup"}</strong>
                  {result.delivery.method === "delivery" && (
                    <>
                      {" "}• {result.delivery.isNewParish ? "New parish" : "Within parish"}
                      {" "}• {result.delivery.isNewParish ? "Miles in new parish" : "Total miles"}: {result.delivery.miles.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </>
                  )}
                </div>
                {result.delivery.method === "delivery" && (
                  <>
                    <div>
                      Delivery Cost: <strong>${result.delivery.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </div>
                    {result.delivery.store && (
                      <div className="text-xs text-gray-700">
                        Store: {result.delivery.store.name} ({result.delivery.store.parish})
                      </div>
                    )}
                    {result.delivery.auto?.totalMilesEstimate ? (
                      <div className="text-xs text-gray-700">
                        Auto distance (est): {result.delivery.auto.totalMilesEstimate.toFixed(1)} mi
                        {result.delivery.auto.detectedParish ? ` • Dest parish: ${result.delivery.auto.detectedParish}` : ""}
                        {typeof result.delivery.auto.roadFactor === "number" ? ` • Factor: ${result.delivery.auto.roadFactor.toFixed(2)}` : ""}
                      </div>
                    ) : null}
                  </>
                )}
              </>
            )}

            <hr className="my-3" />
            <div className="text-base font-bold">
              Grand Total: ${result.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        )}

        {/* Customer Information */}
        <div className="mt-6 border-t pt-4">
          <h3 className="text-md font-semibold mb-3">Customer Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Full Name (required)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="p-2 border rounded"
            />
            <input
              type="tel"
              placeholder="Phone (required)"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="p-2 border rounded"
            />
            <input
              type="email"
              placeholder="Email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="p-2 border rounded md:col-span-2"
            />
            <input
              type="text"
              placeholder="Address (for auto-distance)"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              className="p-2 border rounded md:col-span-2"
            />
            <textarea
              placeholder="Notes"
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              className="p-2 border rounded md:col-span-2"
              rows={3}
            />
          </div>
          <p className="text-xs text-gray-600 mt-2">
            A unique cashier ticket number will be generated and attached to this order.
          </p>
        </div>

        {result && (
          <button
            onClick={handlePlaceOrder}
            className="mt-4 w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
          >
            Place Order & Generate Ticket
          </button>
        )}
      </div>

      {/* Orders */}
      <div className="w-full max-w-4xl bg-white text-black rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Order History</h2>
        {orders.length === 0 ? (
          <p>No orders yet.</p>
        ) : (
          <ul className="space-y-2">
            {orders.map((o) => (
              <li key={o.orderId} className="border p-2 rounded bg-gray-50 text-sm">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
                  <div>
                    <strong>Ticket:</strong> {o.ticketNumber || "—"} &nbsp;|&nbsp;{" "}
                    <strong>Order:</strong> {o.orderId}
                  </div>
                  <div>
                    <strong>Customer:</strong> {o.customer?.name || "N/A"}{" "}
                    {o.customer?.phone ? `(${o.customer.phone})` : ""}
                  </div>
                </div>
                <div className="text-xs text-gray-700 mt-1">
                  Rep: {o.salesRep} ({o.employeeId}) • Floor: {o.tile} / Wall: {o.wallTile} • Tiles:{" "}
                  {o.tilesNeeded?.toLocaleString?.() || o.tilesNeeded}
                </div>
                <div className="text-xs text-gray-700">
                  Tile Total: $
                  {Number(o.totalCost || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  {o.thinset ? (
                    <>
                      {" "}
                      • Thinset: {o.thinset.bags} bag(s) = $
                      {Number(o.thinset.cost || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </>
                  ) : null}
                  {o.delivery ? (
                    <>
                      {" "}
                      • {o.delivery.method === "delivery"
                        ? `Delivery: $${Number(o.delivery.cost || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        : "Pickup"}
                      {o.delivery?.store?.name ? ` • Store: ${o.delivery.store.name}` : ""}
                      {o.delivery?.auto?.totalMilesEstimate
                        ? ` • Auto: ${o.delivery.auto.totalMilesEstimate.toFixed(1)} mi`
                        : ""}
                    </>
                  ) : null}
                  {" "}
                  • Grand: $
                  {Number(
                    o.grandTotal ??
                      (Number(o.totalCost || 0) +
                        Number(o.thinset?.cost || 0) +
                        Number(o.delivery?.cost || 0))
                  ).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
				  
                </div>
              </li>
            ))}
          </ul>
        )}
		
      </div>
{/* Footer */}
<footer className="w-full max-w-4xl text-center text-xs text-gray-200 mt-8 border-t border-white/20 pt-4">
  <p className="mb-1">Developed by <strong>Ashandie Powell</strong></p>
  <p className="mb-1">
    📞 876-594-7320 &nbsp; | &nbsp; 📧{" "}
    <a href="mailto:ashandiepowell86@gmail.com" className="underline hover:text-white">
      ashandiepowell86@gmail.com
    </a>
  </p>
  <p className="italic mb-1">This demo showroom is a property of <strong>Product Bay Group</strong></p>

  {/* Accordion toggle */}
 <details className="mt-3">
  <summary className="cursor-pointer underline hover:text-white">Terms of Use</summary>
  <div className="bg-white/90 text-black rounded p-4 mt-2 text-left text-xs leading-relaxed">
    <p>
      Welcome to the Tiles 3D Showroom demo. By using this demo application, you agree to the following terms:
    </p>
    <ul className="list-disc pl-6 mt-2 space-y-1">
      <li>This is a demonstration tool only; all calculations, previews, and 3D visualizations are for illustrative purposes and may not reflect exact product specifications.</li>
      <li>All artwork, textures, and content in this demo remain the intellectual property of <strong>Product Bay Group</strong> and are for presentation use only.</li>
      <li><strong>All source code, software logic, and related intellectual property of this web tool are solely owned by Ashandie Powell.</strong></li>
      <li>Unauthorized reproduction, redistribution, resale, or modification of the code, in whole or in part, is strictly prohibited without prior written consent from Ashandie Powell.</li>
      <li>Any customer or business information entered is treated as demonstration input only and is not handled as confidential or secure data.</li>
    </ul>
    <p className="mt-3 text-sm font-semibold">
      © {new Date().getFullYear()} Product Bay Group. All rights reserved.
    </p>
    <p className="mt-1 text-sm">
      Software & Source Code Copyright © {new Date().getFullYear()} <strong>Ashandie Powell</strong>. All rights reserved.
    </p>
  </div>
</details>

</footer>
    </div>
  );
}
