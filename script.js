/* script.js - SMART EATING BUDDY
   Put this file alongside your model files (model.json, metadata.json, weights.bin).
   Open index.html via Live Server (http://localhost...) so camera permissions work.
*/

const MODEL_BASE = './'; // if your model files are in ./model/ change to './model/'
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
let animFrameId = null;
let predictingLive = false;

// ELEMENTS
const btnStart = document.getElementById('btnStart');
const btnStop  = document.getElementById('btnStop');
const btnUpload= document.getElementById('btnUpload');
const btnClear = document.getElementById('btnClear');
const fileInput= document.getElementById('fileInput');

const viewport  = document.getElementById('viewport');
const uploadImg = document.getElementById('uploadPreview');
const placeholder = document.getElementById('placeholder');

const statusEl = document.getElementById('status');
const predBox  = document.getElementById('predictions');

const nCal  = document.getElementById('nCal');
const nCarb = document.getElementById('nCarbs');
const nProt = document.getElementById('nProt');
const nFat  = document.getElementById('nFat');
const wPlan = document.getElementById('wPlan');

// HELPERS
const setStatus = msg => statusEl.textContent = msg;

async function ensureModel(){
  if (model) return model;
  setStatus('Loading model…');
  try{
    model = await tmImage.load(`${MODEL_BASE}model.json`, `${MODEL_BASE}metadata.json`);
    setStatus('Model loaded ✓');
    return model;
  }catch(err){
    setStatus('Model load failed — check model files & path');
    console.error(err);
    throw err;
  }
}

function clearViewport(){
  stopWebcam();
  viewport.innerHTML = '';
  viewport.appendChild(placeholder);
  uploadImg.style.display = 'none';
  predBox.innerHTML = '';
  nCal.textContent = nCarb.textContent = nProt.textContent = nFat.textContent = '—';
  wPlan.textContent = '—';
  setStatus('Cleared');
}

function stopWebcam(){
  predictingLive = false;
  if (animFrameId) cancelAnimationFrame(animFrameId);
  if (webcam){
    try{ webcam.stop(); }catch(e){}
    webcam = null;
  }
  btnStop.disabled = true;
  btnStart.disabled = false;
}

function getNutritionFor(label){
  const meta = model?.metadata?.userMetadata?.nutrition?.[label];
  return meta || FALLBACK_NUTRITION[label] || null;
}

function workoutPlanFor(calories){
  if (!calories || isNaN(calories)) return 'Take a 20-min walk';
  calories = Number(calories);
  if (calories < 150) return '15-min brisk walk';
  if (calories < 250) return '20 squats + 15-min walk';
  if (calories < 350) return '25-min jog or 20-min cycling';
  return '30–40 min cardio (jog / cycle)';
}

function renderPredictions(predictions){
  predBox.innerHTML = '';
  predictions.sort((a,b)=> b.probability - a.probability);
  predictions.forEach(p => {
    const row = document.createElement('div'); row.className = 'row';
    const label = document.createElement('div'); label.className='label';
    label.textContent = `${p.className} ${(p.probability*100).toFixed(1)}%`;
    const bar = document.createElement('div'); bar.className='bar';
    const fill = document.createElement('div'); fill.className='fill';
    fill.style.width = `${(p.probability*100).toFixed(1)}%`;
    bar.appendChild(fill);
    row.appendChild(label); row.appendChild(bar);
    predBox.appendChild(row);
  });

  // show nutrition for top prediction
  if (predictions.length){
    const top = predictions[0];
    const nut = getNutritionFor(top.className);
    if (nut){
      nCal.textContent = `${nut.calories} kcal`;
      nCarb.textContent = `${nut.carbs} g`;
      nProt.textContent = `${nut.protein} g`;
      nFat.textContent  = nut.fat ? `${nut.fat} g` : '—';
      wPlan.textContent = workoutPlanFor(nut.calories);
    } else {
      nCal.textContent = nCarb.textContent = nProt.textContent = nFat.textContent = '—';
      wPlan.textContent = 'Take a 20-min walk';
    }
  }
}

// PREDICTION FLOWS
async function predictOnce(sourceEl){
  await ensureModel();
  const preds = await model.predict(sourceEl);
  renderPredictions(preds);
}

async function loopPredict(){
  if (!predictingLive || !webcam) return;
  webcam.update();
  await predictOnce(webcam.canvas);
  animFrameId = requestAnimationFrame(loopPredict);
}

// EVENTS
btnStart.addEventListener('click', async () => {
  try{
    await ensureModel();
    btnStart.disabled = true;
    btnStop.disabled = false;

    uploadImg.style.display = 'none';
    if (placeholder && placeholder.parentNode !== viewport) viewport.appendChild(placeholder);
    try { placeholder.remove(); } catch {}

    // start webcam (mirror)
    webcam = new tmImage.Webcam(300, 300, true);
    setStatus('Requesting camera (allow in browser)…');
    await webcam.setup();
    await webcam.play();

    viewport.innerHTML = '';
    viewport.appendChild(webcam.canvas);
    setStatus('Live — scanning...');

    predictingLive = true;
    loopPredict();
  }catch(err){
    console.error(err);
    setStatus('Camera error: ' + (err.message || err));
    btnStart.disabled = false;
    btnStop.disabled = true;
  }
});

btnStop.addEventListener('click', () => {
  stopWebcam();
  setStatus('Webcam stopped');
});

btnUpload.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try{
    await ensureModel();
    // stop webcam if running
    stopWebcam();

    const url = URL.createObjectURL(file);
    uploadImg.src = url;
    uploadImg.onload = () => URL.revokeObjectURL(url);
    uploadImg.style.display = 'block';

    viewport.innerHTML = '';
    viewport.appendChild(uploadImg);

    setStatus('Predicting image…');
    await predictOnce(uploadImg);
    setStatus('Prediction complete');
  }catch(err){
    console.error(err);
    setStatus('Upload error: ' + (err.message || err));
  }finally{
    e.target.value = ''; // allow same file upload again
  }
});

btnClear.addEventListener('click', clearViewport);

// INIT
setStatus('Idle. Start webcam or upload an image.');
