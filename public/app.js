const recordButton = document.getElementById('recordButton');
const recRing = document.getElementById('recRing');
const recLabel = document.getElementById('recLabel');
const recTimer = document.getElementById('recTimer');
const recordCount = document.getElementById('recordCount');
const recordingsList = document.getElementById('recordingsList');
const agreeBtn = document.getElementById('agreeBtn');
const recordMetadataForm = document.getElementById('recordMetadataForm');
const recordTitleInput = document.getElementById('recordTitle');
const recordSpeakerInput = document.getElementById('recordSpeaker');
const saveRecordingBtn = document.getElementById('saveRecordingBtn');
const cancelSaveBtn = document.getElementById('cancelSaveBtn');

let mediaRecorder = null;
let recordingChunks = [];
let recordingStart = null;
let isRecording = false;
let pendingRecordingBlob = null;
let pendingRecordingDuration = 0;

const screens = ['video','voice','health','ecg'];

function toggleAgree() {
  agreeBtn.classList.toggle('btn-disabled', !document.getElementById('agreeCheck').checked);
}

function enterApp() {
  if (!document.getElementById('agreeCheck').checked) return;
  document.getElementById('termsScreen').style.display = 'none';
  document.getElementById('app').classList.remove('hidden');
  showScreen('video', 0);
  fetchRecordings();
}

function showScreen(name, idx) {
  screens.forEach((s) => {
    const el = document.getElementById(`screen-${s}`);
    if (el) el.classList.toggle('active', s === name);
  });

  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.classList.toggle('active', Number(btn.dataset.idx) === idx);
  });

  const pill = document.getElementById('navPill');
  if (pill) pill.style.transform = `translateX(${idx * 100}%)`;
  const screenContent = document.getElementById('screenContent');
  if (screenContent) screenContent.scrollTop = 0;
}

let callActive = false;
let callSeconds = 0;
let callInterval = null;

function toggleCall() {
  callActive = !callActive;
  const btn = document.getElementById('callBtn');
  const tag = document.getElementById('callStatusTag');
  const dot = document.getElementById('liveDot');
  if (callActive) {
    btn.style.background = 'var(--red)';
    tag.textContent = 'Terhubung';
    dot.classList.remove('hidden');
    callInterval = setInterval(() => {
      callSeconds++;
      const m = String(Math.floor(callSeconds / 60)).padStart(2, '0');
      const s = String(callSeconds % 60).padStart(2, '0');
      document.getElementById('callTimer').textContent = `${m}:${s}`;
    }, 1000);
  } else {
    btn.style.background = 'var(--green)';
    tag.textContent = 'Menunggu';
    dot.classList.add('hidden');
    clearInterval(callInterval);
  }
}

function toggleMute() {
  const btn = document.getElementById('muteBtn');
  if (btn) btn.classList.toggle('bg-white/40');
}

function toggleCam() {
  const btn = document.getElementById('camBtn');
  if (btn) btn.classList.toggle('bg-white/40');
}


function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  recordingChunks = [];
  mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
  recordingStart = Date.now();

  mediaRecorder.addEventListener('dataavailable', (event) => {
    if (event.data.size > 0) recordingChunks.push(event.data);
  });

  mediaRecorder.addEventListener('stop', async () => {
    const blob = new Blob(recordingChunks, { type: 'audio/webm' });
    pendingRecordingBlob = blob;
    pendingRecordingDuration = Math.round((Date.now() - recordingStart) / 1000);
    showMetadataForm();
  });

  mediaRecorder.start();
  isRecording = true;
  recRing.classList.add('recording');
  recLabel.textContent = 'Merekam...';
  recordButton.textContent = 'Berhenti Rekam';
  recordButton.style.background = 'var(--red)';
  updateTimer();
}

function stopRecording() {
  if (!mediaRecorder) return;
  mediaRecorder.stop();
  mediaRecorder.stream.getTracks().forEach((track) => track.stop());
  isRecording = false;
  recRing.classList.remove('recording');
  recLabel.textContent = 'Ketuk untuk Rekaman';
  recordButton.textContent = 'Mulai Rekam';
  recordButton.style.background = 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)';
  recTimer.textContent = '00:00';
}

function updateTimer() {
  if (!isRecording) return;
  const seconds = Math.round((Date.now() - recordingStart) / 1000);
  recTimer.textContent = formatTime(seconds);
  requestAnimationFrame(updateTimer);
}

async function showMetadataForm() {
  if (!recordMetadataForm) return;
  recordMetadataForm.classList.remove('hidden');
  recordTitleInput.value = `Rekaman ${new Date().toLocaleString('id-ID')}`;
  recordSpeakerInput.value = '';
}

function hideMetadataForm() {
  if (!recordMetadataForm) return;
  recordMetadataForm.classList.add('hidden');
  recordTitleInput.value = '';
  recordSpeakerInput.value = '';
  pendingRecordingBlob = null;
  pendingRecordingDuration = 0;
}

async function saveQueuedRecording() {
  if (!pendingRecordingBlob) return;
  const title = recordTitleInput.value.trim();
  const speaker = recordSpeakerInput.value.trim();
  if (!title) {
    alert('Silakan isi judul rekaman.');
    return;
  }

  const arrayBuffer = await pendingRecordingBlob.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);
  try {
    await saveRecording({ name: title, speaker, audioData: base64, duration: pendingRecordingDuration });
    hideMetadataForm();
    await fetchRecordings();
  } catch (error) {
    console.error('Failed to save queued recording', error);
    alert('Gagal menyimpan rekaman. Coba lagi.');
  }
}

function cancelQueuedRecording() {
  hideMetadataForm();
}

async function toggleRecord() {
  if (isRecording) {
    stopRecording();
  } else {
    if (pendingRecordingBlob) {
      cancelQueuedRecording();
    }
    try {
      await startRecording();
    } catch (error) {
      console.error('Recording error', error);
      alert('Tidak dapat mengakses mikrofon. Pastikan izin diberikan.');
    }
  }
}

recordButton.addEventListener('click', toggleRecord);
recRing.addEventListener('click', toggleRecord);
if (saveRecordingBtn) saveRecordingBtn.addEventListener('click', saveQueuedRecording);
if (cancelSaveBtn) cancelSaveBtn.addEventListener('click', cancelQueuedRecording);

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return window.btoa(binary);
}

async function saveRecording(data) {
  const response = await fetch('/api/recordings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save recording');
  }
  return response.json();
}

async function fetchRecordings() {
  try {
    const response = await fetch('/api/recordings');
    if (!response.ok) {
      const bodyText = await response.text();
      let parsed;
      try {
        parsed = JSON.parse(bodyText);
      } catch {
        parsed = null;
      }
      if (parsed) {
        console.error('Failed to fetch recordings', parsed);
      } else {
        console.error('Failed to fetch recordings', bodyText);
      }
      recordCount.textContent = '0 rekaman';
      recordingsList.innerHTML = '';
      return;
    }
    const recordings = await response.json();
    recordCount.textContent = `${recordings.length} rekaman`;
    recordingsList.innerHTML = recordings.map(renderRecordingCard).join('');
    attachPlayHandlers();
  } catch (error) {
    console.error('Failed to fetch recordings', error);
    recordCount.textContent = '0 rekaman';
    recordingsList.innerHTML = '';
  }
}

function renderRecordingCard(rec) {
  return `
    <div class="card p-3 flex items-center gap-3">
      <button data-id="${rec.id}" class="play-btn w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0" style="background:var(--primary)">
        <svg class="play-ic" width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7L8 5Z"/></svg>
        <svg class="pause-ic hidden" width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>
      </button>
      <div class="flex-1">
        <p class="text-[12px] font-bold" style="color:var(--ink)">${rec.name}</p>
        <p class="text-[10px] font-medium" style="color:var(--ink-soft)">${new Date(rec.created_at).toLocaleString('id-ID')} · ${formatTime(rec.duration)}</p>
        ${rec.speaker ? `<p class="text-[10px]" style="color:var(--ink-soft)">Dari: ${rec.speaker}</p>` : ''}
      </div>
      <span class="wave-bars flex items-end h-5"><span></span><span></span><span></span><span></span><span></span></span>
    </div>
  `;
}

function attachPlayHandlers() {
  document.querySelectorAll('.play-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const recordingId = btn.dataset.id;
      await togglePlay(btn, recordingId);
    });
  });
}

let currentAudio = null;
let currentButton = null;

async function togglePlay(button, id) {
  const playIc = button.querySelector('.play-ic');
  const pauseIc = button.querySelector('.pause-ic');
  const wave = button.closest('.card').querySelector('.wave-bars');

  if (currentAudio && currentButton && currentButton !== button) {
    currentAudio.pause();
    currentButton.querySelector('.play-ic').classList.remove('hidden');
    currentButton.querySelector('.pause-ic').classList.add('hidden');
    currentButton.closest('.card').querySelector('.wave-bars').classList.remove('playing');
  }

  if (!currentAudio || currentButton !== button) {
    try {
      const audioBlob = await fetch(`/api/recordings/${id}`);
      if (!audioBlob.ok) {
        throw new Error('Failed to load audio');
      }
      const blob = await audioBlob.blob();
      const audioUrl = URL.createObjectURL(blob);
      currentAudio = new Audio(audioUrl);
      currentButton = button;
      currentAudio.addEventListener('ended', () => {
        playIc.classList.remove('hidden');
        pauseIc.classList.add('hidden');
        wave.classList.remove('playing');
        currentAudio = null;
        currentButton = null;
      });
      playIc.classList.add('hidden');
      pauseIc.classList.remove('hidden');
      wave.classList.add('playing');
      await currentAudio.play();
    } catch (error) {
      console.error('Playback error', error);
      alert('Tidak dapat memutar rekaman saat ini.');
      return;
    }
  } else {
    if (currentAudio.paused) {
      currentAudio.play();
      playIc.classList.add('hidden');
      pauseIc.classList.remove('hidden');
      wave.classList.add('playing');
    } else {
      currentAudio.pause();
      playIc.classList.remove('hidden');
      pauseIc.classList.add('hidden');
      wave.classList.remove('playing');
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  toggleAgree();
  window.showScreen = showScreen;
  window.toggleCall = toggleCall;
  window.toggleMute = toggleMute;
  window.toggleCam = toggleCam;
  window.enterApp = enterApp;
  window.toggleAgree = toggleAgree;
});
