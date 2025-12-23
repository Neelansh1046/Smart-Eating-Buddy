/* script.js - SMART EATING BUDDY (FIXED)
   Webcam only version – no upload
*/

const MODEL_BASE = "./"; // model.json, metadata.json in same folder

const FALLBACK_NUTRITION = {
  PIZZA:   { calories: 285, carbs: 36, protein: 12, fat: 10 },
  BURGER:  { calories: 295, carbs: 28, protein: 17, fat: 14 },
  NOODLES: { calories: 138, carbs: 25, protein: 5,  fat: 2  },
  SAMOSA:  { calories: 132, carbs: 15, protein: 3,  fat: 8  },
  APPLE:   { calories: 52,  carbs: 14, protein: 0.3,fat: 0.2}
};

// STATE
let model = null;
let webcam = null;
let predicting = false;
let animFrameId = null;

// ELEMENTS (MUST MATCH index.html)
const btnStart = document.getElementById("btnStart");
const btnStop  = document.getElementById("btnStop");

const viewport   = document.getElementById("viewport");
const placeholder= document.getElementById("placeholder");
const statusEl   = document.getElementById("status");
const predBox    = document.getElementById("predictions");

const nCal  = document.getElementById("nCal");
const nCarb = document.getElementById("nCarbs");
const nProt = document.getElementById("nProt");
const nFat  = document.getElementById("nFat");
const wPlan = document.getElementById("wPlan");

// SAFETY CHECK
if (!btnStart || !viewport || !statusEl) {
  console.error("❌ HTML IDs mismatch – check index.html");
}

// HELPERS
const setStatus = msg => statusEl.textContent = msg;

async function loadModel() {
  if (model) return model;
  setStatus("Loading model...");
  model = await tmImage.load(
    MODEL_BASE + "model.json",
    MODEL_BASE + "metadata.json"
  );
  setStatus("Model loaded ✓");
  return model;
}

function getNutrition(label) {
  return FALLBACK_NUTRITION[label] || null;
}

function workoutPlan(cal) {
  if (!cal) return "20 min walk";
  if (cal < 150) return "15 min walk";
  if (cal < 250) return "20 squats + walk";
  if (cal < 350) return "25 min jog";
  return "30–40 min cardio";
}

// PREDICTION RENDER
function renderPredictions(preds) {
  predBox.innerHTML = "";
  preds.sort((a, b) => b.probability - a.probability);

  preds.forEach(p => {
    const row = document.createElement("div");
    row.className = "row";

    const label = document.createElement("div");
    label.className = "label";
    label.innerText = `${p.className} ${(p.probability * 100).toFixed(1)}%`;

    const bar = document.createElement("div");
    bar.className = "bar";

    const fill = document.createElement("div");
    fill.className = "fill";
    fill.style.width = `${p.probability * 100}%`;

    bar.appendChild(fill);
    row.appendChild(label);
    row.appendChild(bar);
    predBox.appendChild(row);
  });

  if (preds.length) {
    const top = preds[0];
    const nut = getNutrition(top.className);
    if (nut) {
      nCal.innerText  = nut.calories + " kcal";
      nCarb.innerText = nut.carbs + " g";
      nProt.innerText = nut.protein + " g";
      nFat.innerText  = nut.fat + " g";
      wPlan.innerText = workoutPlan(nut.calories);
    }
  }
}

// LOOP
async function loop() {
  if (!predicting || !webcam) return;
  webcam.update();
  const preds = await model.predict(webcam.canvas);
  renderPredictions(preds);
  animFrameId = requestAnimationFrame(loop);
}

// START CAMERA
btnStart.onclick = async () => {
  try {
    await loadModel();
    btnStart.disabled = true;
    btnStop.disabled = false;

    setStatus("Requesting camera...");
    placeholder.style.display = "none";

    webcam = new tmImage.Webcam(300, 300, true);

    const isMobile = /Android|iPhone/i.test(navigator.userAgent);
    await webcam.setup(isMobile ? { facingMode: "environment" } : undefined);
    await webcam.play();

    viewport.innerHTML = "";
    viewport.appendChild(webcam.canvas);

    predicting = true;
    setStatus("Live scanning...");
    loop();

  } catch (err) {
    console.error(err);
    setStatus("Camera error: " + err.message);
    btnStart.disabled = false;
  }
};

// STOP CAMERA
btnStop.onclick = () => {
  predicting = false;
  if (animFrameId) cancelAnimationFrame(animFrameId);
  if (webcam) webcam.stop();

  viewport.innerHTML = "";
  viewport.appendChild(placeholder);
  placeholder.style.display = "block";

  btnStart.disabled = false;
  btnStop.disabled = true;
  setStatus("Stopped");
};

// INIT
setStatus("Idle. Click Start Webcam.");
