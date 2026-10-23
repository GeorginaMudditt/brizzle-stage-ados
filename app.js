const button = document.querySelector("#user-button");
const list = document.querySelector("#user-list");
const options = [...list.querySelectorAll(".user-option")];
const stage = document.querySelector("#stage");
const dancerImg = document.querySelector("#dancer-img");
const dancerName = document.querySelector("#dancer-name");
const playerBadge = document.querySelector("#player-badge");
const status = document.querySelector("#user-status");
const buttonFace = document.querySelector(".user-button-face");
const buttonImg = buttonFace.querySelector("img");
const buttonLabel = document.querySelector(".user-button-label");
const starCount = document.querySelector("#star-count");
const pictureStar = document.querySelector("#picture-star");

const progressKey = "brizzle-stage-ados";
let currentId = "";
let pendingStars = 0;
let writingReady = false;
let progress = loadProgress();

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(progressKey));
    if (!saved || typeof saved !== "object") {
      return { user: "", stars: {}, pictures: {}, pictureDone: {}, memorySeen: {}, grammarDone: {}, listeningDone: {}, readingDone: {}, writingDone: {}, letterWords: {}, writing: {} };
    }
    return {
      user: typeof saved.user === "string" ? saved.user : "",
      stars: saved.stars && typeof saved.stars === "object" ? saved.stars : {},
      pictures: saved.pictures && typeof saved.pictures === "object" ? saved.pictures : {},
      pictureDone: saved.pictureDone && typeof saved.pictureDone === "object" ? saved.pictureDone : {},
      memorySeen: saved.memorySeen && typeof saved.memorySeen === "object" ? saved.memorySeen : {},
      grammarDone: saved.grammarDone && typeof saved.grammarDone === "object" ? saved.grammarDone : {},
      listeningDone: saved.listeningDone && typeof saved.listeningDone === "object" ? saved.listeningDone : {},
      readingDone: saved.readingDone && typeof saved.readingDone === "object" ? saved.readingDone : {},
      writingDone: saved.writingDone && typeof saved.writingDone === "object" ? saved.writingDone : {},
      letterWords: saved.letterWords && typeof saved.letterWords === "object" ? saved.letterWords : {},
      writing: saved.writing && typeof saved.writing === "object" ? saved.writing : {},
    };
  } catch {
    return { user: "", stars: {}, pictures: {}, pictureDone: {}, memorySeen: {}, grammarDone: {}, listeningDone: {}, readingDone: {}, writingDone: {}, letterWords: {}, writing: {} };
  }
}

function saveProgress() {
  try {
    localStorage.setItem(progressKey, JSON.stringify(progress));
  } catch {
    // The star still shows for this visit if the browser cannot store it.
  }
}

function starLabel(count) {
  return `${count} ${count === 1 ? "star" : "stars"}`;
}

function pictureDoneList(id) {
  const list = progress.pictureDone[id];
  return Array.isArray(list) ? list.filter((index) => Number.isInteger(index)) : [];
}

function pictureStars(id) {
  return Math.min(2, Math.floor(pictureDoneList(id).length / 5));
}

function letterWordCount(id) {
  const count = progress.letterWords && progress.letterWords[id];
  return Number.isInteger(count) && count > 0 ? count : 0;
}

function letterStars(id) {
  return Math.floor(letterWordCount(id) / 10);
}

function totalStars(id) {
  if (!id) return 0;
  return (progress.stars[id] || 0) + pictureStars(id) + letterStars(id);
}

const starCardRules = {
  pictures: { pictures: true },
  clothes: { listening: ["clothes-match", "clothes-memory"] },
  verbs: { listening: ["verbs-match", "verbs-memory"] },
  "clothes-match": { listening: ["clothes-match"] },
  "clothes-memory": { listening: ["clothes-memory"] },
  "verbs-match": { listening: ["verbs-match"] },
  "verbs-memory": { listening: ["verbs-memory"] },
  simple: { grammar: ["simple-be", "simple-verbs"] },
  continuous: { grammar: ["continuous"] },
  contrast: { grammar: ["contrast"] },
  past: { grammar: ["past-match", "past-gaps"] },
  landmarks: { listening: ["landmarks"] },
  people: { listening: ["people"] },
  letters: { letters: true },
  plastic: { reading: ["plastic"] },
  potter: { reading: ["potter"] },
  intro: { writing: ["intro"] },
  "photo-writing": { writing: ["photo-writing"] },
};

function savedIds(store, id) {
  const list = progress[store] && progress[store][id];
  return new Set(Array.isArray(list) ? list : []);
}

function starCardState(activity) {
  const rule = starCardRules[activity];
  if (!rule) return null;
  const owner = currentId || "pending";
  if (rule.pictures) return { won: pictureStars(owner), total: 2 };
  if (rule.letters) return { won: letterStars(owner), total: Infinity };
  const store = rule.grammar ? "grammarDone" : rule.reading ? "readingDone" : rule.writing ? "writingDone" : "listeningDone";
  const ids = rule.grammar || rule.reading || rule.writing || rule.listening;
  const done = savedIds(store, owner);
  return { won: ids.filter((item) => done.has(item)).length, total: ids.length };
}

function starCardMessage(activity, won, total) {
  if (activity === "pictures") {
    if (won <= 0) return "Win 2 stars";
    if (won === 1) return "You have won 1 star";
    return "✓ Completed. You have won 2 stars.";
  }
  if (activity === "letters") {
    if (won <= 0) return "Win unlimited stars";
    return won === 1 ? "You have won 1 star" : `You have won ${won} stars`;
  }
  if (won >= total) {
    return total === 1
      ? "✓ Completed. You have won a star for this activity."
      : `✓ Completed. You have won ${total} stars for this activity.`;
  }
  if (won > 0) return `You have won ${won} of ${total} stars`;
  return total === 1 ? "Win 1 star" : `Win ${total} stars`;
}

function refreshStarCards() {
  document.querySelectorAll(".game-stars").forEach((node) => {
    const state = starCardState(node.dataset.activity);
    if (!state) return;
    const done = state.won >= state.total && state.total > 0;
    node.textContent = starCardMessage(node.dataset.activity, state.won, state.total);
    node.classList.toggle("is-done", done);
  });
}

function renderStars() {
  options.forEach((option) => {
    const id = option.dataset.name.toLowerCase();
    const count = totalStars(id);
    const chip = option.querySelector(".user-stars");
    chip.textContent = `★ ${count}`;
    chip.setAttribute("aria-label", starLabel(count));
  });
  refreshStarCards();
  updatePictureProgress();
  updateLetterProgress();
  updateWritingDoneButtons();
  if (!currentId) return;
  const count = totalStars(currentId);
  starCount.textContent = `★ ${count}`;
  starCount.setAttribute("aria-label", starLabel(count));
}

function awardStar() {
  if (!currentId) {
    pendingStars += 1;
    status.textContent = "Choose your name to keep your star.";
    return "Choose your name to keep your star.";
  }
  progress.stars[currentId] = (progress.stars[currentId] || 0) + 1;
  saveProgress();
  renderStars();
  const message = `${buttonLabel.textContent} earned a star. ${starLabel(totalStars(currentId))}.`;
  status.textContent = message;
  return message;
}

function claimPending(id) {
  if (!progress.pictureDone) progress.pictureDone = {};
  if (pendingStars) {
    progress.stars[id] = (progress.stars[id] || 0) + pendingStars;
    pendingStars = 0;
  }
  const waiting = pictureDoneList("pending");
  if (waiting.length) {
    const merged = new Set([...pictureDoneList(id), ...waiting]);
    progress.pictureDone[id] = [...merged];
    delete progress.pictureDone.pending;
  }
  if (!progress.memorySeen) progress.memorySeen = {};
  if (Array.isArray(progress.memorySeen.pending) && progress.memorySeen.pending.length) {
    const clothesKey = `${id}:clothes`;
    const mergedWords = new Set([...(progress.memorySeen[clothesKey] || []), ...progress.memorySeen.pending]);
    progress.memorySeen[clothesKey] = [...mergedWords];
    delete progress.memorySeen.pending;
  }
  if (!progress.grammarDone) progress.grammarDone = {};
  if (Array.isArray(progress.grammarDone.pending) && progress.grammarDone.pending.length) {
    const mergedLessons = new Set([
      ...(Array.isArray(progress.grammarDone[id]) ? progress.grammarDone[id] : []),
      ...progress.grammarDone.pending,
    ]);
    progress.grammarDone[id] = [...mergedLessons];
    delete progress.grammarDone.pending;
  }
  if (!progress.listeningDone) progress.listeningDone = {};
  if (Array.isArray(progress.listeningDone.pending) && progress.listeningDone.pending.length) {
    const mergedListening = new Set([
      ...(Array.isArray(progress.listeningDone[id]) ? progress.listeningDone[id] : []),
      ...progress.listeningDone.pending,
    ]);
    progress.listeningDone[id] = [...mergedListening];
    delete progress.listeningDone.pending;
  }
  if (!progress.readingDone) progress.readingDone = {};
  if (Array.isArray(progress.readingDone.pending) && progress.readingDone.pending.length) {
    const mergedReading = new Set([
      ...(Array.isArray(progress.readingDone[id]) ? progress.readingDone[id] : []),
      ...progress.readingDone.pending,
    ]);
    progress.readingDone[id] = [...mergedReading];
    delete progress.readingDone.pending;
  }
  if (!progress.writingDone) progress.writingDone = {};
  if (Array.isArray(progress.writingDone.pending) && progress.writingDone.pending.length) {
    const mergedWriting = new Set([
      ...(Array.isArray(progress.writingDone[id]) ? progress.writingDone[id] : []),
      ...progress.writingDone.pending,
    ]);
    progress.writingDone[id] = [...mergedWriting];
    delete progress.writingDone.pending;
  }
  if (!progress.letterWords) progress.letterWords = {};
  const pendingLetterWords = letterWordCount("pending");
  if (pendingLetterWords) {
    progress.letterWords[id] = letterWordCount(id) + pendingLetterWords;
    delete progress.letterWords.pending;
  }
  Object.keys(progress.memorySeen).forEach((key) => {
    if (!key.startsWith("pending:")) return;
    const topic = key.slice("pending:".length);
    const nextKey = `${id}:${topic}`;
    const mergedWords = new Set([
      ...(Array.isArray(progress.memorySeen[nextKey]) ? progress.memorySeen[nextKey] : []),
      ...progress.memorySeen[key],
    ]);
    progress.memorySeen[nextKey] = [...mergedWords];
    delete progress.memorySeen[key];
  });
  if (!progress.writing) progress.writing = {};
  const waitingWriting = progress.writing.pending;
  if (waitingWriting && typeof waitingWriting === "object") {
    const mine = progress.writing[id] && typeof progress.writing[id] === "object"
      ? progress.writing[id]
      : { intro: "", photos: [] };
    const photos = Array.isArray(mine.photos) ? mine.photos : [];
    const pendingPhotos = Array.isArray(waitingWriting.photos) ? waitingWriting.photos : [];
    progress.writing[id] = {
      intro: mine.intro || waitingWriting.intro || "",
      photos: [0, 1, 2, 3].map((index) => photos[index] || pendingPhotos[index] || ""),
    };
    delete progress.writing.pending;
  }
  saveProgress();
  movePendingRecordings(id);
}

function setOpen(open) {
  button.setAttribute("aria-expanded", String(open));
  list.hidden = !open;
  if (open) {
    const selected =
      options.find((option) => option.getAttribute("aria-selected") === "true") ||
      options[0];
    selected.focus();
  }
}

function choose(option, restore) {
  saveWritingFromPage();
  options.forEach((item) => item.setAttribute("aria-selected", "false"));
  option.setAttribute("aria-selected", "true");

  const name = option.dataset.name;
  const src = option.dataset.src;
  currentId = name.toLowerCase();
  claimPending(currentId);
  progress.user = currentId;
  saveProgress();
  renderStars();

  buttonLabel.textContent = name;
  buttonImg.src = src;
  buttonFace.hidden = false;
  dancerImg.src = src;
  dancerImg.alt = "";
  dancerName.textContent = name;
  playerBadge.hidden = false;
  stage.hidden = false;
  status.textContent = `${name} is using Brizzle Stage Ados. ${starLabel(totalStars(currentId))}.`;
  showWritingFromStore();

  setOpen(false);
  if (!restore) button.focus();
}

button.addEventListener("click", () => {
  setOpen(list.hidden);
});

button.addEventListener("keydown", (event) => {
  if ((event.key === "ArrowDown" || event.key === "ArrowUp") && list.hidden) {
    event.preventDefault();
    setOpen(true);
  }
  if (event.key === "Escape") {
    setOpen(false);
  }
});

options.forEach((option, index) => {
  option.addEventListener("click", () => choose(option));
  option.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      options[(index + 1) % options.length].focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      options[(index - 1 + options.length) % options.length].focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      button.focus();
    }
  });
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".user-menu")) {
    setOpen(false);
  }
});

renderStars();

const pictures = [
  {
    src: "assets/picture-birthday.jpg?v=2",
    label: "Birthday party",
    alt: "Six friends around a birthday cake with candles, balloons, and presents.",
  },
  {
    src: "assets/picture-football.jpg",
    label: "Football match",
    alt: "Children playing football on a sunny pitch, with friends cheering beside the field.",
  },
  {
    src: "assets/picture-skatepark.jpg",
    label: "Skate park",
    alt: "Children skateboarding and scooting at a colourful city skate park.",
  },
  {
    src: "assets/picture-camping.jpg",
    label: "Camping trip",
    alt: "Three children camping beside a lake, with a tent, backpacks, and a campfire.",
  },
  {
    src: "assets/picture-band.jpg",
    label: "Band practice",
    alt: "Four children playing keyboard, drums, and guitar, and singing in a garage.",
  },
  {
    src: "assets/picture-themepark.jpg",
    label: "Theme park",
    alt: "Three friends at a theme park, with a roller coaster, a ferris wheel, and a snack stall.",
  },
  {
    src: "assets/picture-classroom.jpg?v=2",
    label: "Classroom",
    alt: "A teacher stands beside the whiteboard while a grumpy class looks toward her. One pupil is in a wheelchair, and one wears glasses.",
  },
  {
    src: "assets/picture-work.jpg",
    label: "At work",
    alt: "Four adults working in an office, typing, talking on the phone, pointing at a chart, and carrying a folder.",
  },
  {
    src: "assets/picture-beach.jpg?v=2",
    label: "Beach",
    alt: "Four friends at the beach, building a sandcastle, running with a ball, eating ice cream, and paddling.",
  },
  {
    src: "assets/picture-baking.jpg",
    label: "Baking",
    alt: "Three children baking in a kitchen, stirring a bowl, decorating a cake, and tasting the icing.",
  },
];

const picture = document.querySelector("#picture");
const pictureCaption = document.querySelector("#picture-caption");
const pictureStatus = document.querySelector("#picture-status");
const picturePrev = document.querySelector("#picture-prev");
const pictureNext = document.querySelector("#picture-next");
const pictureThumbs = document.querySelector("#picture-thumbs");
const speakingMenu = document.querySelector("#speaking-menu");
const speakingPlay = document.querySelector("#speaking-play");
const speakingTitle = document.querySelector("#speaking-title");
const pictureTitle = document.querySelector("#picture-title");

let pictureIndex = 0;

pictures.forEach((item, index) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "thumb";
  button.setAttribute("aria-label", item.label);
  button.innerHTML = `<img src="${item.src}" alt="">`;
  button.addEventListener("click", () => showPicture(index));
  pictureThumbs.append(button);
});

const thumbs = [...pictureThumbs.querySelectorAll(".thumb")];

function showPicture(index) {
  playback.pause();
  if (recorder && recorder.state === "recording") recorder.stop();
  pictureIndex = (index + pictures.length) % pictures.length;
  const item = pictures[pictureIndex];
  picture.src = item.src;
  picture.alt = item.alt;
  pictureCaption.textContent = `${item.label} · ${pictureIndex + 1} of ${pictures.length}`;
  pictureStatus.textContent = pictureCaption.textContent;
  pictureStar.hidden = true;
  thumbs.forEach((thumb, thumbIndex) => {
    if (thumbIndex === pictureIndex) {
      thumb.setAttribute("aria-current", "true");
    } else {
      thumb.removeAttribute("aria-current");
    }
  });
  markThumbs();
  updatePictureTools();
}

picturePrev.addEventListener("click", () => showPicture(pictureIndex - 1));
pictureNext.addEventListener("click", () => showPicture(pictureIndex + 1));

const pictureDoneButton = document.querySelector("#picture-done");
const recordButton = document.querySelector("#record-button");
const playback = document.querySelector("#playback");
const clipUrls = new Map();
let recorder = null;
let recordIndex = 0;

function clipKey(id, index) {
  return `${id || "pending"}:${index}`;
}

function openRecordings() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("brizzle-recordings", 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("clips")) {
        request.result.createObjectStore("clips");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function rememberClip(key, blob) {
  const previous = clipUrls.get(key);
  if (previous) URL.revokeObjectURL(previous);
  clipUrls.set(key, URL.createObjectURL(blob));
}

async function storeRecording(id, index, blob) {
  const key = clipKey(id, index);
  rememberClip(key, blob);
  try {
    const db = await openRecordings();
    await new Promise((resolve, reject) => {
      const tx = db.transaction("clips", "readwrite");
      tx.objectStore("clips").put(blob, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Playback still works for this visit from the copy kept in memory.
  }
}

async function readRecording(id, index) {
  const key = clipKey(id, index);
  if (clipUrls.has(key)) return clipUrls.get(key);
  try {
    const db = await openRecordings();
    const blob = await new Promise((resolve, reject) => {
      const tx = db.transaction("clips", "readonly");
      const request = tx.objectStore("clips").get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    if (!blob) return "";
    rememberClip(key, blob);
    return clipUrls.get(key);
  } catch {
    return "";
  }
}

async function movePendingRecordings(id) {
  try {
    const db = await openRecordings();
    const keys = await new Promise((resolve, reject) => {
      const request = db.transaction("clips", "readonly").objectStore("clips").getAllKeys();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    const pendingKeys = keys.filter((key) => String(key).startsWith("pending:"));
    for (const key of pendingKeys) {
      const blob = await new Promise((resolve, reject) => {
        const request = db.transaction("clips", "readonly").objectStore("clips").get(key);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
      if (!blob) continue;
      const index = String(key).slice("pending:".length);
      const nextKey = `${id}:${index}`;
      await new Promise((resolve, reject) => {
        const tx = db.transaction("clips", "readwrite");
        tx.objectStore("clips").put(blob, nextKey);
        tx.objectStore("clips").delete(key);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      if (clipUrls.has(key)) {
        clipUrls.set(nextKey, clipUrls.get(key));
        clipUrls.delete(key);
      }
    }
    db.close();
  } catch {
    // The recording can still be played during this visit.
  }
  updatePictureTools();
}

function markThumbs() {
  const done = new Set(pictureDoneList(currentId || "pending"));
  thumbs.forEach((thumb, index) => {
    thumb.classList.toggle("is-done", done.has(index));
  });
}

function updatePictureTools() {
  const owner = currentId || "pending";
  const index = pictureIndex;
  const done = pictureDoneList(owner).includes(index);
  const recording = recorder && recorder.state === "recording";
  pictureDoneButton.setAttribute("aria-pressed", String(done));
  pictureDoneButton.textContent = done ? "✓ Ticked" : "Tick this picture";
  pictureDoneButton.classList.toggle("is-done", done);
  recordButton.textContent = recording ? "Stop" : "Record";
  recordButton.classList.toggle("is-recording", recording);
  recordButton.setAttribute("aria-pressed", String(recording));
  markThumbs();
  readRecording(owner, index).then((url) => {
    if (pictureIndex !== index) return;
    if (recorder && recorder.state === "recording" && recordIndex === index) {
      playback.pause();
      playback.hidden = true;
      return;
    }
    if (!url) {
      playback.removeAttribute("src");
      playback.hidden = true;
      return;
    }
    recordButton.textContent = "Record again";
    if (playback.getAttribute("src") !== url) playback.src = url;
    playback.hidden = false;
  });
}

function updatePictureProgress() {
  const line = document.querySelector("#picture-progress");
  if (!line) return;
  const key = currentId || "pending";
  const ticked = pictureDoneList(key).length;
  const stars = pictureStars(key);
  if (stars >= 2) {
    line.textContent = "You have described ten pictures. You have won 2 stars.";
    return;
  }
  const towardsNext = ticked % 5;
  if (stars === 0) {
    line.textContent = `You need to describe five pictures to win one star. ${towardsNext} of 5 ticked.`;
    return;
  }
  line.textContent = `You have won 1 star. Describe five more pictures to win another. ${towardsNext} of 5 ticked.`;
}

function updateLetterProgress() {
  const line = document.querySelector("#letter-progress");
  if (!line) return;
  const key = currentId || "pending";
  const words = letterWordCount(key);
  const stars = letterStars(key);
  const towardsNext = words % 10;
  if (stars === 0) {
    line.textContent = `You need ten English words to win one star. ${towardsNext} of 10 words.`;
    return;
  }
  const won = stars === 1 ? "You have won 1 star." : `You have won ${stars} stars.`;
  line.textContent = `${won} ${towardsNext} of 10 words towards the next star.`;
}

function updateWritingDoneButtons() {
  const done = savedIds("writingDone", currentId || "pending");
  document.querySelectorAll("[data-writing-done]").forEach((button) => {
    const marked = done.has(button.dataset.writingDone);
    button.classList.toggle("is-done", marked);
    button.setAttribute("aria-pressed", String(marked));
    button.textContent = marked ? "✓ Marked as done" : "Mark as done";
  });
}

function togglePictureDone() {
  const key = currentId || "pending";
  const before = pictureStars(key);
  const list = new Set(pictureDoneList(key));
  const wasDone = list.has(pictureIndex);
  if (wasDone) list.delete(pictureIndex);
  else list.add(pictureIndex);
  progress.pictureDone[key] = [...list];
  saveProgress();
  renderStars();
  markThumbs();
  updatePictureTools();
  const after = pictureStars(key);
  if (!wasDone && after > before) {
    const won = after === 1 ? "You have won 1 star." : "You have won 2 stars.";
    pictureStar.hidden = false;
    pictureStar.textContent = currentId
      ? `${buttonLabel.textContent} earned a star. ${won}`
      : "Choose your name to keep this star.";
    status.textContent = pictureStar.textContent;
    return;
  }
  pictureStar.hidden = true;
  if (currentId) {
    status.textContent = `${buttonLabel.textContent} is using Brizzle Stage Ados. ${starLabel(totalStars(currentId))}.`;
  }
}

async function startRecording() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === "undefined") {
    pictureStar.hidden = false;
    pictureStar.textContent = "This browser cannot record sound.";
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks = [];
    recordIndex = pictureIndex;
    const preferred = ["audio/webm", "audio/mp4"];
    const mimeType = preferred.find((type) => MediaRecorder.isTypeSupported(type)) || "";
    recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      const index = recordIndex;
      storeRecording(currentId, index, blob).then(() => {
        if (pictureIndex === index) updatePictureTools();
      });
      recorder = null;
      updatePictureTools();
    };
    recorder.start();
    updatePictureTools();
  } catch {
    pictureStar.hidden = false;
    pictureStar.textContent = "Allow the microphone to record.";
    recorder = null;
  }
}

function toggleRecording() {
  if (recorder && recorder.state === "recording") {
    recorder.stop();
    return;
  }
  startRecording();
}

pictureDoneButton.addEventListener("click", togglePictureDone);
recordButton.addEventListener("click", toggleRecording);

const savedOption = options.find((option) => option.dataset.name.toLowerCase() === progress.user);
if (savedOption) choose(savedOption, true);

function showSpeakingMenu() {
  speakingPlay.hidden = true;
  speakingMenu.hidden = false;
  speakingTitle.focus();
}

function openPictures() {
  speakingMenu.hidden = true;
  speakingPlay.hidden = false;
  showPicture(pictureIndex);
  window.scrollTo(0, 0);
  pictureTitle.focus();
}

document.querySelector("#open-pictures").addEventListener("click", openPictures);
document.querySelector("#speaking-back").addEventListener("click", showSpeakingMenu);

function onSpeakingPage() {
  return location.hash === "#speaking";
}

document.addEventListener("keydown", (event) => {
  if (!onSpeakingPage() || event.target.closest(".user-menu")) return;
  if (!speakingPlay.hidden) {
    if (event.key === "ArrowRight") showPicture(pictureIndex + 1);
    else if (event.key === "ArrowLeft") showPicture(pictureIndex - 1);
    else if (event.key === "Escape") {
      event.preventDefault();
      showSpeakingMenu();
    }
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    location.hash = "#home";
  }
});

window.addEventListener("hashchange", () => {
  if (onSpeakingPage()) showSpeakingMenu();
  if (location.hash === "#vocabulary") showVocabTopics();
  if (location.hash === "#grammar") showGrammarTopics();
  if (location.hash === "#listening") showListeningTopics();
  if (location.hash === "#writing") showWritingTopics();
  if (location.hash === "#reading") showReadingTopics();
  window.scrollTo(0, 0);
});

showPicture(0);

const clothes = [
  ["belt", "ceinture"],
  ["cap", "casquette"],
  ["earring", "boucle d'oreille"],
  ["fashion", "mode"],
  ["glove", "gant"],
  ["handbag", "sac à main"],
  ["jewellery", "bijoux"],
  ["jumper", "pull"],
  ["leather", "cuir"],
  ["necklace", "collier"],
  ["pocket", "poche"],
  ["raincoat", "imperméable"],
  ["ring", "bague"],
  ["scarf", "écharpe"],
  ["sock", "chaussette"],
  ["suit", "costume"],
  ["sunglasses", "lunettes de soleil"],
  ["swimming costume", "maillot de bain"],
  ["tights", "collant"],
  ["trainers", "baskets"],
  ["uniform", "uniforme"],
];

const verbs = [
  ["to begin", "commencer"],
  ["to buy", "acheter"],
  ["to come", "venir"],
  ["to draw", "dessiner"],
  ["to drive", "conduire"],
  ["to feel", "sentir"],
  ["to finish", "finir"],
  ["to have", "avoir"],
  ["to learn", "apprendre"],
  ["to like", "aimer"],
  ["to look", "regarder (une photo)"],
  ["to love", "adorer"],
  ["to see", "voir"],
  ["to send", "envoyer"],
  ["to show", "montrer"],
  ["to sit", "asseoir"],
  ["to start", "commencer"],
  ["to study", "étudier"],
  ["to take", "prendre"],
  ["to teach", "apprendre (à quelqu'un)"],
  ["to watch", "regarder (un film)"],
  ["to work", "travailler"],
];

const topics = {
  clothes: {
    id: "clothes",
    title: "Clothes",
    done: "You matched every clothes word.",
    words: clothes,
  },
  verbs: {
    id: "verbs",
    title: "Verbs",
    done: "You matched every verb.",
    words: verbs,
  },
};

let currentTopic = topics.clothes;

const vocabTopics = document.querySelector("#vocab-topics");
const vocabMenu = document.querySelector("#vocab-menu");
const vocabPlay = document.querySelector("#vocab-play");
const vocabTitle = document.querySelector("#vocab-title");
const topicTitle = document.querySelector("#topic-title");
const topicBackLabel = document.querySelector("#topic-back-label");
const topicEyebrow = document.querySelector("#topic-eyebrow");
const vocabBack = document.querySelector("#vocab-back");
const gameTitle = document.querySelector("#game-title");
const gameHelp = document.querySelector("#game-help");
const gameScore = document.querySelector("#game-score");
const gameBoard = document.querySelector("#game-board");
const gameStatus = document.querySelector("#game-status");

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function showVocabTopics() {
  vocabPlay.hidden = true;
  vocabMenu.hidden = true;
  letterPlay.hidden = true;
  vocabTopics.hidden = false;
  vocabTitle.focus();
}

function showTopicMenu() {
  vocabTopics.hidden = true;
  vocabPlay.hidden = true;
  letterPlay.hidden = true;
  vocabMenu.hidden = false;
  topicTitle.textContent = currentTopic.title;
  topicBackLabel.textContent = currentTopic.title;
  topicEyebrow.textContent = `Vocabulary · ${currentTopic.title}`;
  vocabBack.setAttribute("aria-label", `Back to ${currentTopic.title}`);
  const matchStars = vocabMenu.querySelector("[data-game='match'] .game-stars");
  const memoryStars = vocabMenu.querySelector("[data-game='memory'] .game-stars");
  if (matchStars) matchStars.dataset.activity = `${currentTopic.id}-match`;
  if (memoryStars) memoryStars.dataset.activity = `${currentTopic.id}-memory`;
  refreshStarCards();
  window.scrollTo(0, 0);
  topicTitle.focus();
}

function openTopic(id) {
  currentTopic = topics[id];
  showTopicMenu();
}

document.querySelector("#vocab-topics-back").addEventListener("click", showVocabTopics);
document.querySelectorAll("[data-topic]").forEach((choice) => {
  choice.addEventListener("click", () => openTopic(choice.dataset.topic));
});
document.querySelector("#vocab-back").addEventListener("click", showTopicMenu);

document.querySelectorAll("[data-game]").forEach((choice) => {
  choice.addEventListener("click", () => startGame(choice.dataset.game));
});

function startGame(kind) {
  vocabTopics.hidden = true;
  vocabMenu.hidden = true;
  letterPlay.hidden = true;
  vocabPlay.hidden = false;
  gameStatus.textContent = "";
  window.scrollTo(0, 0);
  if (kind === "match") startMatch();
  if (kind === "memory") startMemory();
  gameTitle.focus();
}

function startMatch() {
  const rounds = [];
  const order = shuffle(currentTopic.words);
  for (let index = 0; index < order.length; index += 6) {
    rounds.push(order.slice(index, index + 6));
  }
  let round = 0;
  let found = 0;
  let busy = false;
  let colorIndex = 0;
  let selected = { en: null, fr: null };

  gameTitle.textContent = "Match up";
  gameHelp.textContent = "Choose an English word, then choose its French partner.";

  function draw() {
    found = 0;
    colorIndex = 0;
    selected = { en: null, fr: null };
    const pairs = rounds[round];
    gameScore.textContent = `Set ${round + 1} of ${rounds.length}`;
    gameBoard.replaceChildren();
    const board = document.createElement("div");
    board.className = "match-board";
    const english = document.createElement("div");
    english.className = "match-col";
    const french = document.createElement("div");
    french.className = "match-col match-col-fr";
    const englishLabel = document.createElement("p");
    englishLabel.className = "column-label";
    englishLabel.textContent = "English";
    const frenchLabel = document.createElement("p");
    frenchLabel.className = "column-label";
    frenchLabel.textContent = "French";
    english.append(englishLabel);
    french.append(frenchLabel);

    function check() {
      if (!selected.en || !selected.fr) return;
      const englishButton = selected.en;
      const frenchButton = selected.fr;
      selected = { en: null, fr: null };
      if (englishButton.dataset.fr === frenchButton.dataset.fr) {
        englishButton.classList.remove("is-selected");
        frenchButton.classList.remove("is-selected");
        englishButton.classList.add("is-matched", `pair-${colorIndex}`);
        frenchButton.classList.add("is-matched", `pair-${colorIndex}`);
        colorIndex += 1;
        englishButton.disabled = true;
        frenchButton.disabled = true;
        found += 1;
        gameStatus.textContent = `${englishButton.textContent} is ${frenchButton.textContent}`;
        if (found === pairs.length) finishRound();
        return;
      }
      busy = true;
      englishButton.classList.add("is-wrong");
      frenchButton.classList.add("is-wrong");
      gameStatus.textContent = "Not a pair. Try again.";
      window.setTimeout(() => {
        englishButton.classList.remove("is-selected", "is-wrong");
        frenchButton.classList.remove("is-selected", "is-wrong");
        busy = false;
      }, 550);
    }

    function choose(side, button) {
      if (busy || button.disabled) return;
      const previous = selected[side];
      if (previous && previous !== button) previous.classList.remove("is-selected");
      selected[side] = button;
      button.classList.add("is-selected");
      check();
    }

    shuffle(pairs).forEach(([en, fr]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "word-btn";
      button.textContent = en;
      button.dataset.fr = fr;
      button.addEventListener("click", () => choose("en", button));
      english.append(button);
    });
    shuffle(pairs).forEach(([, fr]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "word-btn";
      button.textContent = fr;
      button.dataset.fr = fr;
      button.addEventListener("click", () => choose("fr", button));
      french.append(button);
    });

    board.append(english, french);
    gameBoard.append(board);
  }

  function finishRound() {
    const note = document.createElement("p");
    note.className = "result-line";
    const again = document.createElement("button");
    again.type = "button";
    again.className = "next-round";
    if (round < rounds.length - 1) {
      note.textContent = "Set complete.";
      again.textContent = "Next words";
      again.addEventListener("click", () => {
        round += 1;
        draw();
      });
    } else {
      note.textContent = `${currentTopic.done} ${awardListeningStar(`${currentTopic.id}-match`)}`;
      again.textContent = "Play again";
      again.addEventListener("click", startMatch);
    }
    gameBoard.append(note, again);
    gameStatus.textContent = note.textContent;
  }

  draw();
}

function nextMemoryPairs() {
  const key = `${currentId || "pending"}:${currentTopic.id}`;
  if (!progress.memorySeen) progress.memorySeen = {};
  let seen = new Set(Array.isArray(progress.memorySeen[key]) ? progress.memorySeen[key] : []);
  let pool = currentTopic.words.filter(([english]) => !seen.has(english));
  if (pool.length === 0) {
    seen = new Set();
    pool = currentTopic.words.slice();
  }
  const pairs = shuffle(pool).slice(0, Math.min(6, pool.length));
  pairs.forEach(([english]) => seen.add(english));
  progress.memorySeen[key] = [...seen];
  saveProgress();
  return pairs;
}

function startMemory() {
  const pairs = nextMemoryPairs();
  const cards = shuffle(
    pairs.flatMap(([en, fr], index) => [
      { id: index, text: en, lang: "en" },
      { id: index, text: fr, lang: "fr" },
    ])
  );
  let first = null;
  let lock = false;
  let moves = 0;
  let matched = 0;

  gameTitle.textContent = "Memory";
  gameHelp.textContent = "Turn over two cards. Find the English word and its French partner.";
  gameScore.textContent = "0 moves";
  gameBoard.replaceChildren();

  const board = document.createElement("div");
  board.className = "memory-board";

  cards.forEach((card) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "memory-card is-down";
    button.dataset.word = card.text;
    button.setAttribute("aria-label", "Hidden card");
    button.addEventListener("click", () => flip(button, card));
    board.append(button);
  });
  gameBoard.append(board);

  function flip(button, card) {
    if (lock || button.disabled || !button.classList.contains("is-down")) return;
    button.classList.remove("is-down");
    button.classList.add(card.lang === "fr" ? "is-fr" : "is-en");
    button.textContent = card.text;
    button.setAttribute("aria-label", card.text);
    if (!first) {
      first = { button, card };
      return;
    }
    moves += 1;
    gameScore.textContent = `${moves} ${moves === 1 ? "move" : "moves"}`;
    const previous = first;
    first = null;
    if (previous.card.id === card.id) {
      previous.button.disabled = true;
      button.disabled = true;
      previous.button.classList.add("is-matched");
      button.classList.add("is-matched");
      matched += 1;
      gameStatus.textContent = `${previous.card.text} matches ${card.text}`;
      if (matched === pairs.length) finish();
      return;
    }
    lock = true;
    window.setTimeout(() => {
      previous.button.classList.remove("is-en", "is-fr");
      button.classList.remove("is-en", "is-fr");
      previous.button.classList.add("is-down");
      button.classList.add("is-down");
      previous.button.textContent = "";
      button.textContent = "";
      previous.button.setAttribute("aria-label", "Hidden card");
      button.setAttribute("aria-label", "Hidden card");
      lock = false;
    }, 800);
  }

  function finish() {
    const note = document.createElement("p");
    note.className = "result-line";
    note.textContent = `All pairs found in ${moves} moves. ${awardListeningStar(`${currentTopic.id}-memory`)}`;
    const again = document.createElement("button");
    again.type = "button";
    again.className = "next-round";
    again.textContent = "New cards";
    again.addEventListener("click", startMemory);
    gameBoard.append(note, again);
    gameStatus.textContent = note.textContent;
  }
}

const LETTER_DICE = [
  ["A", "E", "I", "O", "U", "A"],
  ["A", "E", "I", "O", "U", "E"],
  ["E", "I", "O", "U", "A", "I"],
  ["A", "E", "O", "U", "Y", "A"],
  ["A", "E", "I", "N", "R", "S"],
  ["A", "E", "O", "T", "S", "R"],
  ["A", "E", "I", "L", "N", "T"],
  ["B", "C", "D", "M", "P", "T"],
  ["C", "H", "L", "N", "R", "S"],
  ["D", "G", "L", "N", "R", "T"],
  ["F", "H", "M", "N", "S", "T"],
  ["B", "C", "L", "P", "R", "S"],
  ["B", "F", "G", "P", "V", "W"],
  ["C", "D", "H", "M", "N", "R"],
  ["H", "K", "L", "R", "S", "W"],
  ["J", "K", "Q", "X", "Y", "Z"],
];

const BRITISH_WORDS = [
  "coloured", "colouring", "colourful", "honour", "honours", "neighbour", "neighbours",
  "theatres", "metre", "pyjamas", "travelled", "organise", "organising", "realise",
  "realised", "recognise", "labelled", "flavour", "flavours", "humour", "rumour",
  "cosy", "mum", "maths", "practise", "practised", "aeroplane", "aeroplanes",
  "cheques", "tyre", "tyres", "kerb", "kerbs", "plough", "doughnut", "doughnuts", "jumper",
];

const SUGGESTION_SKIP = new Set([
  "color", "colors", "colored", "coloring", "colorful",
  "favorite", "favorites", "honor", "honors", "neighbor", "neighbors",
  "gray", "theater", "theaters", "center", "centers", "jewelry", "pajamas",
  "traveling", "traveled", "traveler", "organize", "organized", "organizing",
  "realize", "realized", "recognize", "recognized", "canceled", "labeled",
  "flavor", "flavors", "humor", "rumor", "cozy", "mom", "math", "airplane", "airplanes",
]);

const letterPlay = document.querySelector("#letter-play");
const letterTitle = document.querySelector("#letter-title");
const letterGrid = document.querySelector("#letter-grid");
const letterShake = document.querySelector("#letter-shake");
const letterTimer = document.querySelector("#letter-timer");
const letterRows = document.querySelector("#letter-rows");
const letterAdd = document.querySelector("#letter-add");
const letterCheck = document.querySelector("#letter-check");
const letterSuggest = document.querySelector("#letter-suggest");
const letterSuggestions = document.querySelector("#letter-suggestions");
const letterSuggestionList = document.querySelector("#letter-suggestion-list");
const letterStatus = document.querySelector("#letter-status");

const LETTER_FACES = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LETTER_ROW_COUNT = 12;
const WORDS_PER_COLUMN = 12;
const MAX_WORDS = 36;
const ROUND_MS = 5 * 60 * 1000;

let dictionaryReady = null;
let dictionary = null;
let englishReady = null;
let englishWords = null;
let currentLetters = [];
let shaking = false;
let roundToken = 0;
let timerId = 0;
let roundEndsAt = 0;
const suggestedWords = new Set();
const creditedLetters = new Set();

function loadDictionary() {
  if (!dictionaryReady) {
    dictionaryReady = fetch("data/common-words.txt")
      .then((response) => {
        if (!response.ok) throw new Error("word list");
        return response.text();
      })
      .then((text) => {
        const words = new Map();
        text.trim().split(/\s+/).forEach((word, index) => {
          const clean = word.toLowerCase();
          if (/^[a-z]+$/.test(clean) && !words.has(clean)) words.set(clean, index);
        });
        BRITISH_WORDS.forEach((word) => {
          if (!words.has(word)) words.set(word, 1800);
        });
        dictionary = words;
      });
  }
  return dictionaryReady;
}

function letterCounts(letters) {
  const counts = {};
  letters.forEach((letter) => {
    const key = letter.toLowerCase();
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

function canSpell(word, counts) {
  const used = {};
  for (const letter of word) {
    used[letter] = (used[letter] || 0) + 1;
    if (used[letter] > (counts[letter] || 0)) return false;
  }
  return word.length > 0;
}

function readWord(value) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return { empty: true };
  if (!/^[a-z]+(?:'[a-z]+)?$/.test(trimmed)) return { invalid: true };
  return { letters: trimmed.replace(/'/g, ""), written: trimmed };
}

function formatClock(ms) {
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function setWritingEnabled(enabled) {
  letterRows.querySelectorAll("input").forEach((input) => {
    input.disabled = !enabled;
  });
  letterAdd.disabled = !enabled;
}

function setReviewEnabled(enabled) {
  letterCheck.disabled = !enabled;
  letterSuggest.disabled = !enabled;
}

function wordCount() {
  return letterRows.querySelectorAll(".letter-row").length;
}

function ensureLetterColumn() {
  const column = letterRows.lastElementChild;
  if (column && column.querySelectorAll(".letter-row").length < WORDS_PER_COLUMN) return column;
  const next = document.createElement("div");
  next.className = "letter-column";
  letterRows.append(next);
  return next;
}

function addLetterRow() {
  if (wordCount() >= MAX_WORDS) return null;
  const column = ensureLetterColumn();
  const row = document.createElement("label");
  row.className = "letter-row";
  const input = document.createElement("input");
  input.type = "text";
  input.maxLength = 16;
  input.autocomplete = "off";
  input.autocapitalize = "none";
  input.spellcheck = false;
  const mark = document.createElement("span");
  mark.className = "letter-mark";
  row.append(input, mark);
  column.append(row);
  input.setAttribute("aria-label", `Word ${wordCount()}`);
  input.addEventListener("input", () => {
    mark.textContent = "";
    mark.className = "letter-mark";
    const inputs = [...letterRows.querySelectorAll("input")];
    if (input === inputs[inputs.length - 1] && input.value.trim()) {
      const added = addLetterRow();
      if (added) added.disabled = input.disabled;
    }
  });
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const inputs = [...letterRows.querySelectorAll("input")];
    const next = inputs[inputs.indexOf(input) + 1];
    if (next && !next.disabled) next.focus();
    else {
      const added = addLetterRow();
      if (added) {
        added.disabled = input.disabled;
        if (!added.disabled) added.focus();
      }
    }
  });
  return input;
}

function resetLetterRows() {
  letterRows.replaceChildren();
  for (let index = 0; index < LETTER_ROW_COUNT; index += 1) addLetterRow();
}

function paintLetters(letters, landed) {
  [...letterGrid.children].forEach((cube, index) => {
    cube.textContent = letters[index] || "";
    cube.classList.toggle("is-landed", landed);
  });
}

function stopTimer() {
  window.clearInterval(timerId);
  timerId = 0;
}

function finishRound() {
  stopTimer();
  letterTimer.classList.remove("is-low");
  letterTimer.classList.add("is-done");
  letterTimer.textContent = "0:00";
  setWritingEnabled(false);
  letterStatus.textContent = "Time is up. Check your words, or shake the letters again.";
}

function tickTimer() {
  const left = Math.max(0, roundEndsAt - Date.now());
  letterTimer.textContent = formatClock(left);
  letterTimer.classList.toggle("is-low", left > 0 && left <= 30000);
  if (left <= 0) finishRound();
}

function startTimer() {
  stopTimer();
  roundEndsAt = Date.now() + ROUND_MS;
  letterTimer.classList.remove("is-low", "is-done");
  tickTimer();
  timerId = window.setInterval(tickTimer, 200);
}

function buildGrid() {
  letterGrid.replaceChildren();
  for (let index = 0; index < 16; index += 1) {
    const cube = document.createElement("div");
    cube.className = `letter-cube tone-${index % 8}`;
    cube.style.animationDelay = `${(index % 4) * 0.04}s`;
    letterGrid.append(cube);
  }
}

function showLetterPlay() {
  vocabTopics.hidden = true;
  vocabMenu.hidden = true;
  vocabPlay.hidden = true;
  letterPlay.hidden = false;
  window.scrollTo(0, 0);
  letterTitle.focus();
}

function loadEnglishWords() {
  if (!englishReady) {
    englishReady = fetch("data/english-words.txt")
      .then((response) => {
        if (!response.ok) throw new Error("english words");
        return response.text();
      })
      .then((text) => {
        const words = new Set();
        text.split(/\s+/).forEach((word) => {
          const clean = word.toLowerCase();
          if (/^[a-z]+$/.test(clean)) words.add(clean);
        });
        englishWords = words;
      });
  }
  return englishReady;
}

async function lookupEnglish(word) {
  if ((dictionary && dictionary.has(word)) || (englishWords && englishWords.has(word))) return "yes";
  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (response.ok) return "yes";
    if (response.status === 404) return "no";
    return "unknown";
  } catch {
    return "unknown";
  }
}

function spellableSuggestions() {
  const counts = letterCounts(currentLetters);
  const found = [];
  dictionary.forEach((rank, word) => {
    if (word.length < 3 || rank > 7000 || SUGGESTION_SKIP.has(word)) return;
    if (!canSpell(word, counts)) return;
    const lengthWeight = (8 - Math.min(word.length, 8)) * 350;
    found.push({ word, score: rank + lengthWeight });
  });
  found.sort((a, b) => a.score - b.score || a.word.localeCompare(b.word));
  return found.map((item) => item.word);
}

async function checkLetters() {
  if (!currentLetters.length || shaking || letterCheck.disabled) return;
  letterCheck.disabled = true;
  letterStatus.textContent = "Checking your words…";
  try {
    await Promise.all([loadDictionary(), loadEnglishWords()]);
  } catch {
    dictionary = dictionary || new Map();
    try {
      await loadEnglishWords();
    } catch {
      englishWords = englishWords || new Set();
    }
  }
  const counts = letterCounts(currentLetters);
  const seen = new Set();
  const jobs = [];
  let correct = 0;
  let missed = 0;
  let added = 0;
  const owner = currentId || "pending";
  const beforeStars = letterStars(owner);
  letterRows.querySelectorAll(".letter-row").forEach((row) => {
    const input = row.querySelector("input");
    const mark = row.querySelector(".letter-mark");
    const word = readWord(input.value);
    mark.className = "letter-mark";
    if (word.empty) {
      mark.textContent = "";
      return;
    }
    if (word.invalid) {
      mark.classList.add("is-no");
      mark.textContent = "Use letters only.";
      return;
    }
    if (seen.has(word.letters)) {
      mark.classList.add("is-no");
      mark.textContent = "Already written.";
      return;
    }
    seen.add(word.letters);
    if (!canSpell(word.letters, counts)) {
      mark.classList.add("is-no");
      mark.textContent = "Not in these letters.";
      return;
    }
    mark.textContent = "Checking…";
    jobs.push(
      lookupEnglish(word.letters).then((result) => {
        mark.className = "letter-mark";
        if (result === "yes") {
          correct += 1;
          if (!creditedLetters.has(word.letters)) {
            creditedLetters.add(word.letters);
            added += 1;
          }
          mark.classList.add("is-yes");
          mark.textContent = "✓";
        } else if (result === "no") {
          mark.classList.add("is-no");
          mark.textContent = "Not an English word.";
        } else {
          missed += 1;
          mark.textContent = "Try again.";
        }
      })
    );
  });
  await Promise.all(jobs);
  if (added) {
    if (!progress.letterWords) progress.letterWords = {};
    progress.letterWords[owner] = letterWordCount(owner) + added;
    saveProgress();
    renderStars();
  }
  const afterStars = letterStars(owner);
  let starNote = "";
  if (afterStars > beforeStars) {
    const gained = afterStars - beforeStars;
    const earned = gained === 1 ? "You earned a star." : `You earned ${gained} stars.`;
    const won = afterStars === 1 ? "You have won 1 star." : `You have won ${afterStars} stars.`;
    starNote = currentId ? ` ${earned} ${won}` : " Choose your name to keep this star.";
  }
  if (!jobs.length && !letterRows.querySelector(".letter-mark.is-no")) {
    letterStatus.textContent = "Write a word first.";
  } else {
    const total = correct === 1 ? "1 English word." : `${correct} English words.`;
    const checked = missed ? `${total} ${missed} could not be checked.` : total;
    letterStatus.textContent = `${checked}${starNote}`;
  }
  letterCheck.disabled = false;
}

async function suggestLetters() {
  if (!currentLetters.length || shaking) return;
  letterSuggest.disabled = true;
  try {
    await loadDictionary();
  } catch {
    letterStatus.textContent = "The word list could not be loaded.";
    letterSuggest.disabled = false;
    return;
  }
  const typed = new Set();
  letterRows.querySelectorAll("input").forEach((input) => {
    const word = readWord(input.value);
    if (word.letters) typed.add(word.letters);
  });
  const next = spellableSuggestions()
    .filter((word) => !suggestedWords.has(word) && !typed.has(word))
    .slice(0, 8);
  if (!next.length) {
    letterStatus.textContent = suggestedWords.size
      ? "Those are the words I can suggest from these letters."
      : "I cannot find more words from these letters.";
    letterSuggest.disabled = false;
    return;
  }
  next.forEach((word) => {
    suggestedWords.add(word);
    const item = document.createElement("li");
    item.textContent = word;
    letterSuggestionList.append(item);
  });
  letterSuggestions.hidden = false;
  letterStatus.textContent = `Here are ${next.length} more words.`;
  letterSuggest.disabled = false;
}

function shakeLetters() {
  if (shaking) return;
  shaking = true;
  roundToken += 1;
  const token = roundToken;
  stopTimer();
  currentLetters = shuffle(LETTER_DICE).map((die) => die[Math.floor(Math.random() * die.length)]);
  suggestedWords.clear();
  creditedLetters.clear();
  letterSuggestionList.replaceChildren();
  letterSuggestions.hidden = true;
  letterStatus.textContent = "Shaking…";
  letterTimer.classList.remove("is-low", "is-done");
  letterTimer.textContent = "5:00";
  resetLetterRows();
  setWritingEnabled(false);
  setReviewEnabled(false);
  letterShake.disabled = true;
  letterGrid.classList.add("is-shaking");
  letterGrid.setAttribute("aria-busy", "true");

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const reveal = () => {
    if (token !== roundToken) return;
    letterGrid.classList.remove("is-shaking");
    letterGrid.setAttribute("aria-busy", "false");
    paintLetters(currentLetters, !reduced);
    letterGrid.setAttribute("aria-label", `Letters: ${currentLetters.join(", ")}`);
    shaking = false;
    letterShake.disabled = false;
    letterShake.textContent = "Shake again";
    setWritingEnabled(true);
    setReviewEnabled(true);
    letterStatus.textContent = "The letters have landed. Five minutes starts now.";
    startTimer();
    const first = letterRows.querySelector("input");
    if (first) first.focus();
  };

  if (reduced) {
    reveal();
    return;
  }

  const flicker = window.setInterval(() => {
    if (token !== roundToken) {
      window.clearInterval(flicker);
      return;
    }
    paintLetters(
      currentLetters.map(() => LETTER_FACES[Math.floor(Math.random() * LETTER_FACES.length)]),
      false
    );
  }, 80);
  window.setTimeout(() => {
    window.clearInterval(flicker);
    reveal();
  }, 1600);
}

buildGrid();
resetLetterRows();
setWritingEnabled(false);
setReviewEnabled(false);
loadDictionary().catch(() => {});
loadEnglishWords().catch(() => {});

document.querySelector("#open-letters").addEventListener("click", showLetterPlay);
document.querySelector("#letter-back").addEventListener("click", showVocabTopics);
letterShake.addEventListener("click", shakeLetters);
letterAdd.addEventListener("click", () => {
  if (wordCount() >= MAX_WORDS) return;
  addLetterRow().focus();
});
letterCheck.addEventListener("click", () => {
  checkLetters();
});
letterSuggest.addEventListener("click", () => {
  suggestLetters();
});

document.addEventListener("keydown", (event) => {
  if (location.hash !== "#vocabulary" || event.target.closest(".user-menu")) return;
  if (event.key !== "Escape") return;
  event.preventDefault();
  if (!letterPlay.hidden) showVocabTopics();
  else if (!vocabPlay.hidden) showTopicMenu();
  else if (!vocabMenu.hidden) showVocabTopics();
  else location.hash = "#home";
});

const grammarTopics = document.querySelector("#grammar-topics");
const grammarLesson = document.querySelector("#grammar-lesson");
const grammarTitle = document.querySelector("#grammar-title");
const grammarLessonTitle = document.querySelector("#grammar-lesson-title");
const grammarEyebrow = document.querySelector("#grammar-eyebrow");
const grammarExplain = document.querySelector("#grammar-explain");
const grammarExercises = document.querySelector("#grammar-exercises");
const grammarCheck = document.querySelector("#grammar-check");
const grammarResult = document.querySelector("#grammar-result");

const grammarLessons = {
  simple: {
    id: "simple",
    title: "Present simple",
    sections: [
      {
        heading: "When do we use it?",
        paragraphs: ["We use the present simple for things we do again and again, and for things that are true."],
        examples: ["I walk to school every day.", "She likes cats.", "The shop opens at nine."],
      },
      {
        heading: "The verb to be",
        forms: ["I am", "You are", "He is", "She is", "It is", "We are", "They are"],
        examples: ["I am not tired.", "She is not here.", "Are they ready?"],
      },
      {
        heading: "Other verbs",
        paragraphs: [
          "After I, you, we, and they, use the verb. I play. They live.",
          "After he, she, and it, add s. He plays. She lives.",
          "Some verbs change a little: watch → watches, go → goes, study → studies.",
          "For the negative, use do not (don't) or does not (doesn't). For a question, use do or does.",
        ],
        examples: ["I don't play tennis.", "She doesn't like peas.", "Do you speak French?", "Does he walk to school?"],
      },
    ],
    groups: [
      {
        title: "Exercise 1. The verb to be",
        starId: "simple-be",
        note: "Write am, is, or are.",
        items: [
          { pieces: ["I ", { answers: ["am"] }, " a student."] },
          { pieces: ["She ", { answers: ["is"] }, " my best friend."] },
          { pieces: ["They ", { answers: ["are"] }, " in the classroom."] },
          { pieces: ["We ", { answers: ["are"] }, " not hungry."] },
          { pieces: [{ answers: ["are"] }, " you ready?"] },
          { pieces: ["He ", { answers: ["is"] }, " not at home."] },
        ],
      },
      {
        title: "Exercise 2. Other verbs",
        starId: "simple-verbs",
        note: "Write the verb in the present simple. The word in brackets helps you.",
        items: [
          { hint: "live", pieces: ["I ", { answers: ["live"] }, " in London."] },
          { hint: "play", pieces: ["She ", { answers: ["plays"] }, " tennis on Fridays."] },
          { hint: "watch", pieces: ["We ", { answers: ["watch"] }, " TV after school."] },
          { hint: "go", pieces: ["He ", { answers: ["goes"] }, " to school by bus."] },
          { hint: "study", pieces: ["Anna ", { answers: ["studies"] }, " English every day."] },
          { hint: "not / like", pieces: ["They ", { answers: ["don't like", "do not like"] }, " fish."] },
          { hint: "not / get", pieces: ["My sister ", { answers: ["doesn't get", "does not get"] }, " up at seven."] },
          {
            hint: "speak",
            pieces: [{ answers: ["do"] }, " you ", { answers: ["speak"] }, " Spanish?"],
          },
        ],
      },
    ],
  },
  continuous: {
    id: "continuous",
    title: "Present continuous",
    sections: [
      {
        heading: "When do we use it?",
        paragraphs: ["We use the present continuous for something happening now."],
        examples: ["I am reading now.", "They are playing football at the moment."],
      },
      {
        heading: "How to make it",
        paragraphs: ["Use am, is, or are, then a verb ending in -ing."],
        forms: ["I am eating", "She is eating", "They are eating"],
        examples: ["I am not eating.", "Is she eating?", "Are they eating?"],
      },
      {
        heading: "Spelling",
        paragraphs: ["Most verbs just add -ing. A few change a little."],
        examples: ["play → playing", "make → making", "run → running"],
      },
    ],
    groups: [
      {
        title: "am, is, or are",
        note: "Write am, is, or are.",
        items: [
          { pieces: ["I ", { answers: ["am"] }, " talking to you now."] },
          { pieces: ["She ", { answers: ["is"] }, " sitting next to me."] },
          { pieces: ["They ", { answers: ["are"] }, " playing a game."] },
          { pieces: ["We ", { answers: ["are"] }, " not sleeping."] },
          { pieces: [{ answers: ["is"] }, " he listening?"] },
        ],
      },
      {
        title: "The whole verb",
        note: "Write am, is, or are, and the verb with -ing.",
        items: [
          { hint: "write", pieces: ["I ", { answers: ["am writing"] }, " a letter at the moment."] },
          { hint: "make", pieces: ["She ", { answers: ["is making"] }, " a cake now."] },
          { hint: "run", pieces: ["The children ", { answers: ["are running"] }, " in the park."] },
          {
            hint: "not / work",
            pieces: ["He ", { answers: ["isn't working", "is not working"] }, " today."],
          },
          { hint: "study", pieces: ["We ", { answers: ["are studying"] }, " for the test today."] },
          {
            hint: "listen",
            pieces: [{ answers: ["are"] }, " you ", { answers: ["listening"] }, " to music?"],
          },
        ],
      },
    ],
  },
  contrast: {
    id: "contrast",
    title: "Present simple versus present continuous",
    sections: [
      {
        heading: "How are they different?",
        paragraphs: [
          "Present simple is for habits and things that are always true. Words like every day, usually, often, and always go with the present simple.",
          "Present continuous is for actions happening now. Words like now, right now, at the moment, and today go with the present continuous.",
        ],
        pairs: [
          { simple: "I drink milk every morning.", continuous: "I am drinking milk now." },
          { simple: "She walks to school.", continuous: "Look! She is walking to school." },
        ],
      },
      {
        heading: "A small extra rule",
        paragraphs: ["We usually use the present simple, not the present continuous, with like, love, want, and know."],
        examples: ["I like this song."],
      },
    ],
    groups: [
      {
        title: "Which tense is it?",
        note: "Write the verb in the present simple or the present continuous.",
        items: [
          { hint: "walk", pieces: ["She ", { answers: ["walks"] }, " to school every day."] },
          { hint: "walk", pieces: ["She ", { answers: ["is walking"] }, " to school now."] },
          { hint: "drink", pieces: ["I usually ", { answers: ["drink"] }, " tea."] },
          { hint: "drink", pieces: ["I ", { answers: ["am drinking"] }, " tea at the moment."] },
          { hint: "sing", pieces: ["Listen! The birds ", { answers: ["are singing"] }, "."] },
          { hint: "not / like", pieces: ["He ", { answers: ["doesn't like", "does not like"] }, " milk."] },
          { hint: "play", pieces: ["They ", { answers: ["play"] }, " football on Saturdays."] },
          { hint: "play", pieces: ["They ", { answers: ["are playing"] }, " football now."] },
        ],
      },
    ],
  },
  past: {
    id: "past",
    title: "Past simple",
    sections: [
      {
        heading: "When do we use it?",
        paragraphs: [
          "We use the past simple for a finished action. It happened yesterday, last week, last year, or at another time that is finished.",
        ],
        examples: ["I played football yesterday.", "She went to Paris last summer."],
      },
      {
        heading: "The verb to be",
        paragraphs: ["In the past, be has two forms: was and were."],
        forms: ["I was", "You were", "He was", "She was", "It was", "We were", "They were"],
        examples: ["I was tired.", "They were at home.", "She was not late.", "Were you at school?"],
      },
      {
        heading: "Regular verbs",
        paragraphs: [
          "For most verbs, add -ed. If the verb already ends in e, just add -d.",
          "travel is a little different: travelled.",
        ],
        forms: ["like → liked", "play → played", "watch → watched", "visit → visited", "cook → cooked", "travel → travelled"],
      },
      {
        heading: "Irregular verbs",
        paragraphs: [
          "Some verbs do not use -ed. There is no spelling rule, so we learn them in pairs.",
          "read looks the same in the past, but we say it like red.",
        ],
        forms: [
          "find → found",
          "eat → ate",
          "swim → swam",
          "make → made",
          "go → went",
          "have → had",
          "see → saw",
          "take → took",
          "buy → bought",
          "read → read",
          "meet → met",
          "wake up → woke up",
          "run → ran",
          "drink → drank",
          "sleep → slept",
        ],
      },
      {
        heading: "Negatives and questions",
        paragraphs: ["Use did and the present verb. You do not add -ed after did."],
        examples: ["I didn't go.", "Did you go?"],
      },
    ],
    groups: [
      {
        title: "Exercise 1. Match the verbs",
        starId: "past-match",
        note: "Choose the past simple for each present verb.",
        choices: ["bought", "went", "ate", "saw", "took", "had", "played", "watched", "travelled", "was/were"],
        items: [
          { prompt: "buy", pieces: [{ answers: ["bought"] }] },
          { prompt: "go", pieces: [{ answers: ["went"] }] },
          { prompt: "eat", pieces: [{ answers: ["ate"] }] },
          { prompt: "see", pieces: [{ answers: ["saw"] }] },
          { prompt: "take", pieces: [{ answers: ["took"] }] },
          { prompt: "have", pieces: [{ answers: ["had"] }] },
          { prompt: "play", pieces: [{ answers: ["played"] }] },
          { prompt: "watch", pieces: [{ answers: ["watched"] }] },
          { prompt: "travel", pieces: [{ answers: ["travelled"] }] },
          { prompt: "be", pieces: [{ answers: ["was/were"] }] },
        ],
      },
      {
        title: "Exercise 2. Past simple in a sentence",
        starId: "past-gaps",
        note: "Write the past simple in the gap. The verb in brackets is the present.",
        items: [
          { hint: "swim", pieces: ["She ", { answers: ["swam"] }, " across the pool."] },
          { hint: "find", pieces: ["I ", { answers: ["found"] }, " my keys under the sofa."] },
          { hint: "visit", pieces: ["We ", { answers: ["visited"] }, " our grandparents on Sunday."] },
          { hint: "drink", pieces: ["He ", { answers: ["drank"] }, " a glass of milk."] },
          { hint: "sleep", pieces: ["The baby ", { answers: ["slept"] }, " for two hours."] },
          { hint: "cook", pieces: ["Mum ", { answers: ["cooked"] }, " pasta last night."] },
          { hint: "run", pieces: ["They ", { answers: ["ran"] }, " to the bus stop."] },
          { hint: "make", pieces: ["I ", { answers: ["made"] }, " a birthday card for my friend."] },
        ],
      },
    ],
  },
};

let currentGrammarId = "";

function showGrammarTopics() {
  grammarLesson.hidden = true;
  grammarTopics.hidden = false;
  window.scrollTo(0, 0);
  grammarTitle.focus();
}

function tidyAnswer(value) {
  return value.trim().toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ");
}

function sameAnswer(value, expected) {
  const given = tidyAnswer(value);
  const wanted = tidyAnswer(expected);
  return given === wanted || given.replace(/'/g, "") === wanted.replace(/'/g, "");
}

function tenseCard(label, sentence, tone) {
  const card = document.createElement("div");
  card.className = `tense-card ${tone}`;
  const name = document.createElement("span");
  name.className = "tense-label";
  name.textContent = label;
  const line = document.createElement("p");
  line.textContent = sentence;
  card.append(name, line);
  return card;
}

function renderExercise(item, number) {
  const row = document.createElement("li");
  row.className = "exercise-item";
  const count = document.createElement("span");
  count.className = "exercise-number";
  count.textContent = `${number}.`;
  row.append(count);
  if (item.choices) {
    const prompt = document.createElement("span");
    prompt.className = "match-prompt";
    prompt.textContent = item.prompt;
    const select = document.createElement("select");
    select.className = "gap-input verb-choice";
    select.setAttribute("aria-label", `Past simple of ${item.prompt}`);
    select.dataset.answers = item.pieces[0].answers.join("|");
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "Choose";
    select.append(blank);
    item.choices.forEach((choice) => {
      const option = document.createElement("option");
      option.value = choice;
      option.textContent = choice;
      select.append(option);
    });
    const clearMark = () => {
      select.classList.remove("is-right", "is-wrong");
      row.querySelector(".exercise-mark").textContent = "";
      const nearby = row.closest(".exercise-group")?.querySelector(".result-line");
      if (nearby) nearby.textContent = "";
      grammarResult.textContent = "";
    };
    select.addEventListener("input", clearMark);
    select.addEventListener("change", clearMark);
    row.append(prompt, select);
  } else {
  item.pieces.forEach((piece) => {
    if (typeof piece === "string") {
      row.append(document.createTextNode(piece));
      return;
    }
    const input = document.createElement("input");
    input.type = "text";
    input.className = "gap-input";
    input.autocomplete = "off";
    input.autocapitalize = "none";
    input.spellcheck = false;
    input.setAttribute("aria-label", `Answer ${number}`);
    input.dataset.answers = piece.answers.join("|");
    const longest = piece.answers.reduce((max, answer) => Math.max(max, answer.length), 0);
    if (longest <= 4) input.classList.add("is-short");
    else input.style.width = `${Math.min(14, Math.max(8.5, longest * 0.62))}rem`;
    input.addEventListener("input", () => {
      input.classList.remove("is-right", "is-wrong");
      row.querySelector(".exercise-mark").textContent = "";
      const nearby = row.closest(".exercise-group")?.querySelector(".result-line");
      if (nearby) nearby.textContent = "";
      grammarResult.textContent = "";
    });
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      const group = row.closest(".exercise-group");
      const inputs = [...(group?.querySelectorAll(".gap-input") || grammarExercises.querySelectorAll(".gap-input"))];
      const next = inputs[inputs.indexOf(input) + 1];
      if (next) next.focus();
      else (group?.querySelector(".next-round") || grammarCheck).focus();
    });
    row.append(input);
  });
  if (item.hint) {
    const hint = document.createElement("span");
    hint.className = "exercise-hint";
    hint.textContent = `(${item.hint})`;
    row.append(hint);
  }
  }
  const mark = document.createElement("span");
  mark.className = "exercise-mark";
  row.append(mark);
  return row;
}

function openGrammarLesson(id) {
  const lesson = grammarLessons[id];
  currentGrammarId = lesson.id;
  grammarTopics.hidden = true;
  grammarLesson.hidden = false;
  grammarEyebrow.textContent = "Grammar";
  grammarLessonTitle.textContent = lesson.title;
  grammarResult.textContent = "";
  grammarExplain.replaceChildren();
  grammarExercises.replaceChildren();
  const separateStars = lesson.groups.some((group) => group.starId);
  grammarCheck.hidden = separateStars;
  grammarResult.hidden = separateStars;

  const explanation = document.createElement("div");
  explanation.className = "grammar-explain";
  lesson.sections.forEach((section) => {
    const heading = document.createElement("h2");
    heading.textContent = section.heading;
    explanation.append(heading);
    (section.paragraphs || []).forEach((text) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      explanation.append(paragraph);
    });
    if (section.forms) {
      const forms = document.createElement("ul");
      forms.className = "grammar-forms";
      section.forms.forEach((form) => {
        const item = document.createElement("li");
        item.textContent = form;
        forms.append(item);
      });
      explanation.append(forms);
    }
    if (section.examples) {
      const examples = document.createElement("ul");
      examples.className = "grammar-examples";
      section.examples.forEach((example) => {
        const item = document.createElement("li");
        item.textContent = example;
        examples.append(item);
      });
      explanation.append(examples);
    }
    (section.pairs || []).forEach((pair) => {
      const grid = document.createElement("div");
      grid.className = "tense-pairs";
      grid.append(tenseCard("Present simple", pair.simple, "simple"));
      grid.append(tenseCard("Present continuous", pair.continuous, "now"));
      explanation.append(grid);
    });
  });
  grammarExplain.append(explanation);

  let number = 0;
  lesson.groups.forEach((group) => {
    const block = document.createElement("section");
    block.className = "exercise-group";
    const heading = document.createElement("h2");
    heading.textContent = group.title;
    const note = document.createElement("p");
    note.className = "exercise-note";
    note.textContent = group.note;
    const list = document.createElement("ol");
    list.className = "exercise-list";
    if (group.starId) number = 0;
    const choiceBank = group.choices ? shuffle(group.choices) : null;
    group.items.forEach((item) => {
      number += 1;
      list.append(renderExercise(choiceBank ? { ...item, choices: choiceBank } : item, number));
    });
    block.append(heading, note, list);
    if (group.starId) {
      const check = document.createElement("button");
      check.type = "button";
      check.className = "next-round";
      check.textContent = "Check answers";
      const result = document.createElement("p");
      result.className = "result-line";
      result.setAttribute("aria-live", "polite");
      check.addEventListener("click", () => checkExercise(block, group.starId, result));
      block.append(check, result);
    }
    grammarExercises.append(block);
  });

  window.scrollTo(0, 0);
  grammarLessonTitle.focus();
}

function awardGrammarStar(lessonId) {
  const id = currentId || "pending";
  if (!progress.grammarDone) progress.grammarDone = {};
  const done = new Set(Array.isArray(progress.grammarDone[id]) ? progress.grammarDone[id] : []);
  if (done.has(lessonId)) return "You already have this star.";
  done.add(lessonId);
  progress.grammarDone[id] = [...done];
  saveProgress();
  return awardStar();
}

function markExercise(block) {
  const items = [...block.querySelectorAll(".exercise-item")];
  let correct = 0;
  items.forEach((item) => {
    const inputs = [...item.querySelectorAll(".gap-input")];
    const allRight = inputs.every((input) => {
      const answers = input.dataset.answers.split("|");
      const right = answers.some((answer) => sameAnswer(input.value, answer));
      input.classList.toggle("is-right", right);
      input.classList.toggle("is-wrong", !right);
      return right;
    });
    item.querySelector(".exercise-mark").textContent = allRight ? "✓" : "";
    if (allRight) correct += 1;
  });
  return { correct, total: items.length };
}

function checkExercise(block, starId, result) {
  const score = markExercise(block);
  if (score.correct === score.total) {
    result.textContent = `All ${score.total} answers are correct. ${awardGrammarStar(starId)}`;
    return;
  }
  result.textContent = `${score.correct} of ${score.total} correct. Look again at the pink boxes.`;
}

function checkGrammar() {
  const score = markExercise(grammarExercises);
  if (score.correct === score.total) {
    grammarResult.textContent = `All ${score.total} answers are correct. ${awardGrammarStar(currentGrammarId)}`;
    return;
  }
  grammarResult.textContent = `${score.correct} of ${score.total} correct. Look again at the pink boxes.`;
}

document.querySelectorAll("[data-lesson]").forEach((choice) => {
  choice.addEventListener("click", () => openGrammarLesson(choice.dataset.lesson));
});
document.querySelector("#grammar-back").addEventListener("click", showGrammarTopics);
grammarCheck.addEventListener("click", checkGrammar);

document.addEventListener("keydown", (event) => {
  if (location.hash !== "#grammar" || event.target.closest(".user-menu")) return;
  if (event.key !== "Escape") return;
  event.preventDefault();
  if (!grammarLesson.hidden) showGrammarTopics();
  else location.hash = "#home";
});

const listeningTopics = document.querySelector("#listening-topics");
const listeningPlay = document.querySelector("#listening-play");
const listeningPeople = document.querySelector("#listening-people");
const listeningTitle = document.querySelector("#listening-title");
const landmarksTitle = document.querySelector("#landmarks-title");
const landmarkAudio = document.querySelector("#landmark-audio");
const landmarkMissing = document.querySelector("#landmark-missing");
const landmarkSpeed = document.querySelector("#landmark-speed");
const landmarkQuiz = document.querySelector("#landmark-quiz");
const landmarkResult = document.querySelector("#landmark-result");

function syncHeaderOffset() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  document.documentElement.style.setProperty(
    "--header-offset",
    `${Math.ceil(header.getBoundingClientRect().height) + 8}px`
  );
}

function pausePeople() {
  document.querySelectorAll(".people-clip audio").forEach((audio) => {
    audio.pause();
  });
  document.querySelectorAll(".people-play").forEach((button) => {
    button.textContent = button.dataset.label;
    button.setAttribute("aria-pressed", "false");
    button.classList.remove("is-last");
    button.removeAttribute("aria-current");
  });
  const now = document.querySelector("#people-now");
  if (now) {
    now.hidden = true;
    now.textContent = "";
  }
}

function showListeningTopics() {
  listeningPlay.hidden = true;
  listeningPeople.hidden = true;
  listeningTopics.hidden = false;
  if (landmarkAudio) landmarkAudio.pause();
  pausePeople();
  window.scrollTo(0, 0);
  listeningTitle.focus();
}

function showLandmarks() {
  listeningTopics.hidden = true;
  listeningPeople.hidden = true;
  listeningPlay.hidden = false;
  pausePeople();
  window.scrollTo(0, 0);
  landmarksTitle.focus();
}

function skipAudio(seconds) {
  if (!Number.isFinite(landmarkAudio.duration)) return;
  landmarkAudio.currentTime = Math.min(
    landmarkAudio.duration,
    Math.max(0, landmarkAudio.currentTime + seconds)
  );
}

function checkLandmarks() {
  const items = [...landmarkQuiz.querySelectorAll(".quiz-item")];
  let correct = 0;
  items.forEach((item) => {
    item.querySelectorAll("label").forEach((label) => {
      label.classList.remove("is-right", "is-wrong");
    });
    const chosen = item.querySelector("input:checked");
    const right = item.querySelector(`input[value="${item.dataset.answer}"]`);
    if (right) right.closest("label").classList.add("is-right");
    if (chosen && chosen.value === item.dataset.answer) correct += 1;
    else if (chosen) chosen.closest("label").classList.add("is-wrong");
  });
  if (correct === items.length) {
    landmarkResult.textContent = `${correct} of ${items.length} correct. ${awardListeningStar("landmarks")}`;
    return;
  }
  landmarkResult.textContent = `${correct} of ${items.length} correct.`;
}

function awardStoredStar(store, activityId) {
  const id = currentId || "pending";
  if (!progress[store]) progress[store] = {};
  const done = new Set(Array.isArray(progress[store][id]) ? progress[store][id] : []);
  if (done.has(activityId)) return "You already have this star.";
  done.add(activityId);
  progress[store][id] = [...done];
  saveProgress();
  return awardStar();
}

function awardListeningStar(activityId) {
  return awardStoredStar("listeningDone", activityId);
}

function awardReadingStar(activityId) {
  return awardStoredStar("readingDone", activityId);
}

function awardWritingStar(activityId) {
  return awardStoredStar("writingDone", activityId);
}

document.querySelector("#open-landmarks").addEventListener("click", showLandmarks);
document.querySelector("#listening-back").addEventListener("click", showListeningTopics);
document.querySelector("#landmark-back-ten").addEventListener("click", () => skipAudio(-10));
document.querySelector("#landmark-forward-ten").addEventListener("click", () => skipAudio(10));
landmarkSpeed.addEventListener("click", () => {
  const slow = landmarkAudio.playbackRate === 1;
  landmarkAudio.playbackRate = slow ? 0.75 : 1;
  landmarkSpeed.textContent = slow ? "Play at normal speed" : "Play at 0.75 speed";
  landmarkSpeed.setAttribute("aria-pressed", String(slow));
});
landmarkAudio.addEventListener("error", () => {
  landmarkMissing.hidden = false;
});
document.querySelector("#landmark-check").addEventListener("click", checkLandmarks);
landmarkQuiz.addEventListener("change", () => {
  landmarkResult.textContent = "";
});

const people = [
  { id: 1, alt: "A boy with short black hair holding a map, in a green jacket and brown boots." },
  { id: 2, alt: "An older woman with short grey hair, a blue coat, and a blue umbrella." },
  { id: 3, alt: "A smiling child in a blue and white striped T-shirt and a colourful paper hat." },
  { id: 4, alt: "An older man with grey hair, a white beard, glasses, and a green jumper." },
  { id: 5, alt: "A girl with a brown braid, a pink apron, and a mixing bowl." },
  { id: 6, alt: "A young woman with brown hair in a bun, green eyes, a beige cardigan, and black and white striped trousers." },
  { id: 7, alt: "A man with curly brown hair and a beard, a red plaid shirt, brown shoes, and a mug of coffee." },
  { id: 8, alt: "A boy with very short brown hair, a red T-shirt, and a glass of orange juice." },
  { id: 9, alt: "A smiling girl in a navy school uniform and a yellow hat." },
  { id: 10, alt: "An older woman with curly grey hair, lots of jewellery, colourful patterned trousers, and flower sandals." },
  { id: 11, alt: "A boy in a purple T-shirt and shorts, holding a football." },
  { id: 12, alt: "A boy with glasses and short black hair, eating a sandwich." },
  { id: 13, alt: "A smiling girl with long red hair, headphones, a green and white striped jumper, and jeans." },
  { id: 14, alt: "An older man with curly grey hair, a grey moustache, a red tie, and black and white striped trousers." },
];

const peopleClips = document.querySelector("#people-clips");
const peopleGrid = document.querySelector("#people-grid");
const peopleResult = document.querySelector("#people-result");
const peopleSpeed = document.querySelector("#people-speed");
const peopleTitle = document.querySelector("#people-title");
let peopleSlow = false;

function peopleRate() {
  return peopleSlow ? 0.75 : 1;
}

function resetPeopleButton(button) {
  button.textContent = button.dataset.label;
  button.setAttribute("aria-pressed", "false");
}

function rememberPeople(button, id, playing) {
  document.querySelectorAll(".people-play").forEach((other) => {
    const current = other === button;
    other.classList.toggle("is-last", current);
    if (current) other.setAttribute("aria-current", "true");
    else other.removeAttribute("aria-current");
  });
  const now = document.querySelector("#people-now");
  now.hidden = false;
  now.textContent = playing ? `Playing: Description ${id}` : `Last one: Description ${id}`;
}

people.forEach((person) => {
  const audio = document.createElement("audio");
  audio.preload = "none";
  audio.src = `assets/people-${person.id}.mp3?v=3`;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tool-button people-play";
  button.dataset.label = `Description ${person.id}`;
  button.setAttribute("aria-pressed", "false");
  resetPeopleButton(button);
  button.addEventListener("click", () => {
    if (!audio.paused) {
      audio.pause();
      resetPeopleButton(button);
      rememberPeople(button, person.id, false);
      return;
    }
    document.querySelectorAll(".people-clip audio").forEach((other) => {
      if (other !== audio) other.pause();
    });
    document.querySelectorAll(".people-play").forEach(resetPeopleButton);
    audio.playbackRate = peopleRate();
    audio.play();
    button.textContent = `Pause ${person.id}`;
    button.setAttribute("aria-pressed", "true");
    rememberPeople(button, person.id, true);
  });
  audio.addEventListener("ended", () => {
    resetPeopleButton(button);
    rememberPeople(button, person.id, false);
  });
  const clip = document.createElement("div");
  clip.className = "people-clip";
  clip.append(button, audio);
  peopleClips.append(clip);
});

shuffle(people).forEach((person) => {
  const card = document.createElement("figure");
  card.className = "people-card";
  card.dataset.person = String(person.id);
  const image = document.createElement("img");
  image.src = `assets/people-${person.id}.jpg`;
  image.alt = person.alt;
  const label = document.createElement("label");
  const selectId = `people-choice-${person.id}`;
  label.htmlFor = selectId;
  label.textContent = "Which description?";
  const select = document.createElement("select");
  select.id = selectId;
  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = "Choose";
  select.append(blank);
  people.forEach((choice) => {
    const option = document.createElement("option");
    option.value = String(choice.id);
    option.textContent = `Description ${choice.id}`;
    select.append(option);
  });
  select.addEventListener("change", () => {
    card.classList.remove("is-right", "is-wrong");
    peopleResult.textContent = "";
  });
  card.append(image, label, select);
  peopleGrid.append(card);
});

function showPeople() {
  listeningTopics.hidden = true;
  listeningPlay.hidden = true;
  listeningPeople.hidden = false;
  if (landmarkAudio) landmarkAudio.pause();
  syncHeaderOffset();
  window.scrollTo(0, 0);
  peopleTitle.focus();
}

window.addEventListener("resize", syncHeaderOffset);

function checkPeople() {
  const cards = [...peopleGrid.querySelectorAll(".people-card")];
  let correct = 0;
  cards.forEach((card) => {
    const select = card.querySelector("select");
    const right = select.value === card.dataset.person;
    card.classList.toggle("is-right", right);
    card.classList.toggle("is-wrong", !right);
    if (right) correct += 1;
  });
  if (correct === cards.length) {
    peopleResult.textContent = `${correct} of ${cards.length} correct. ${awardListeningStar("people")}`;
    return;
  }
  peopleResult.textContent = `${correct} of ${cards.length} correct.`;
}

document.querySelector("#open-people").addEventListener("click", showPeople);
document.querySelector("#people-back").addEventListener("click", showListeningTopics);
document.querySelector("#people-check").addEventListener("click", checkPeople);
peopleSpeed.addEventListener("click", () => {
  peopleSlow = !peopleSlow;
  peopleSpeed.textContent = peopleSlow ? "Play at normal speed" : "Play at 0.75 speed";
  peopleSpeed.setAttribute("aria-pressed", String(peopleSlow));
  document.querySelectorAll(".people-clip audio").forEach((audio) => {
    audio.playbackRate = peopleRate();
  });
});

document.addEventListener("keydown", (event) => {
  if (location.hash !== "#listening" || event.target.closest(".user-menu")) return;
  if (event.key !== "Escape") return;
  event.preventDefault();
  if (!listeningPlay.hidden || !listeningPeople.hidden) showListeningTopics();
  else location.hash = "#home";
});

const writingTopics = document.querySelector("#writing-topics");
const writingIntro = document.querySelector("#writing-intro");
const writingPhotos = document.querySelector("#writing-photos");
const writingTitle = document.querySelector("#writing-title");
const introText = document.querySelector("#intro-text");
const photoTexts = [...document.querySelectorAll(".photo-text")];
let writingTimer = 0;

function saveWritingFromPage() {
  if (!writingReady || !introText) return;
  clearTimeout(writingTimer);
  if (!progress.writing) progress.writing = {};
  progress.writing[currentId || "pending"] = {
    intro: introText.value,
    photos: photoTexts.map((box) => box.value),
  };
  saveProgress();
}

function showWritingFromStore() {
  if (!writingReady || !introText) return;
  const saved = (progress.writing && progress.writing[currentId || "pending"]) || {};
  const photos = Array.isArray(saved.photos) ? saved.photos : [];
  introText.value = saved.intro || "";
  photoTexts.forEach((box, index) => {
    box.value = photos[index] || "";
  });
  document.querySelectorAll("[data-writing-status]").forEach((note) => {
    note.textContent = "";
  });
}

function showWritingTopics() {
  writingIntro.hidden = true;
  writingPhotos.hidden = true;
  writingTopics.hidden = false;
  writingTitle.focus();
}

function showIntro() {
  writingTopics.hidden = true;
  writingPhotos.hidden = true;
  writingIntro.hidden = false;
  document.querySelector("#intro-title").focus();
  window.scrollTo(0, 0);
}

function showPhotoWriting() {
  writingTopics.hidden = true;
  writingIntro.hidden = true;
  writingPhotos.hidden = false;
  document.querySelector("#photo-writing-title").focus();
  window.scrollTo(0, 0);
}

document.querySelector("#open-intro").addEventListener("click", showIntro);
document.querySelector("#open-photo-writing").addEventListener("click", showPhotoWriting);
document.querySelector("#intro-back").addEventListener("click", showWritingTopics);
document.querySelector("#photo-writing-back").addEventListener("click", showWritingTopics);
[introText, ...photoTexts].forEach((box) => {
  box.addEventListener("input", () => {
    clearTimeout(writingTimer);
    writingTimer = setTimeout(saveWritingFromPage, 300);
  });
});
writingReady = true;
showWritingFromStore();

document.addEventListener("keydown", (event) => {
  if (location.hash !== "#writing" || event.target.closest(".user-menu")) return;
  if (event.key !== "Escape") return;
  event.preventDefault();
  if (!writingIntro.hidden || !writingPhotos.hidden) showWritingTopics();
  else location.hash = "#home";
});

const readingTopics = document.querySelector("#reading-topics");
const readingPlastic = document.querySelector("#reading-plastic");
const readingPotter = document.querySelector("#reading-potter");
const readingTitle = document.querySelector("#reading-title");

function readingWord(value) {
  return tidyAnswer(value).replace(/^(a|an|the)\s+/, "");
}

function readingScores(panel) {
  const wordItems = [...panel.querySelectorAll(".word-hunt .word-item")];
  const wordsCorrect = wordItems.filter((item) => {
    const input = item.querySelector("input");
    const answers = input.dataset.answers.split("|");
    return answers.some((answer) => readingWord(input.value) === tidyAnswer(answer));
  }).length;
  const quizItems = [...panel.querySelectorAll(".reading-quiz .quiz-item")];
  const quizCorrect = quizItems.filter((item) => {
    const chosen = item.querySelector("input:checked");
    return chosen && chosen.value === item.dataset.answer;
  }).length;
  return {
    wordsCorrect,
    wordsTotal: wordItems.length,
    quizCorrect,
    quizTotal: quizItems.length,
  };
}

function checkReadingWords(block) {
  const items = [...block.querySelectorAll(".word-item")];
  let correct = 0;
  items.forEach((item) => {
    const input = item.querySelector("input");
    const answers = input.dataset.answers.split("|");
    const right = answers.some((answer) => readingWord(input.value) === tidyAnswer(answer));
    input.classList.toggle("is-right", right);
    input.classList.toggle("is-wrong", !right);
    if (right) correct += 1;
  });
  const panel = block.closest("[data-reading]");
  const scores = readingScores(panel);
  const result = block.querySelector(".word-result");
  if (correct === items.length && scores.quizCorrect === scores.quizTotal) {
    result.textContent = `All ${items.length} words are correct. ${awardReadingStar(panel.dataset.reading)}`;
  } else if (correct === items.length) {
    result.textContent = `All ${items.length} words are correct. Answer every question correctly to win the star.`;
  } else {
    result.textContent = `${correct} of ${items.length} correct. Look again at the pink boxes.`;
  }
}

function checkReadingQuiz(block) {
  const items = [...block.querySelectorAll(".quiz-item")];
  let correct = 0;
  items.forEach((item) => {
    item.querySelectorAll("label").forEach((label) => label.classList.remove("is-right", "is-wrong"));
    const chosen = item.querySelector("input:checked");
    const right = item.querySelector(`input[value="${item.dataset.answer}"]`);
    if (right) right.closest("label").classList.add("is-right");
    if (chosen && chosen.value === item.dataset.answer) correct += 1;
    else if (chosen) chosen.closest("label").classList.add("is-wrong");
  });
  const panel = block.closest("[data-reading]");
  const scores = readingScores(panel);
  const result = block.querySelector(".quiz-result");
  if (correct === items.length && scores.wordsCorrect === scores.wordsTotal) {
    result.textContent = `${correct} of ${items.length} correct. ${awardReadingStar(panel.dataset.reading)}`;
  } else if (correct === items.length) {
    result.textContent = `${correct} of ${items.length} correct. Find every word to win the star.`;
  } else {
    result.textContent = `${correct} of ${items.length} correct.`;
  }
}

function showReadingTopics() {
  readingPlastic.hidden = true;
  readingPotter.hidden = true;
  readingTopics.hidden = false;
  window.scrollTo(0, 0);
  readingTitle.focus();
}

function showReading(panel, title) {
  readingTopics.hidden = true;
  readingPlastic.hidden = panel !== readingPlastic;
  readingPotter.hidden = panel !== readingPotter;
  window.scrollTo(0, 0);
  title.focus();
}

document.querySelector("#open-plastic").addEventListener("click", () => showReading(readingPlastic, document.querySelector("#plastic-title")));
document.querySelector("#open-potter").addEventListener("click", () => showReading(readingPotter, document.querySelector("#potter-title")));
document.querySelectorAll(".reading-back").forEach((button) => {
  button.addEventListener("click", showReadingTopics);
});
document.querySelectorAll(".reading-word-check").forEach((button) => {
  button.addEventListener("click", () => checkReadingWords(button.closest(".word-hunt")));
});
document.querySelectorAll(".reading-quiz-check").forEach((button) => {
  button.addEventListener("click", () => checkReadingQuiz(button.closest(".reading-quiz")));
});
document.querySelectorAll(".word-item input").forEach((input) => {
  input.addEventListener("input", () => {
    input.classList.remove("is-right", "is-wrong");
    input.closest(".word-hunt").querySelector(".word-result").textContent = "";
  });
});
document.querySelectorAll(".reading-quiz").forEach((quiz) => {
  quiz.addEventListener("change", () => {
    quiz.querySelector(".quiz-result").textContent = "";
  });
});
document.querySelectorAll("[data-writing-done]").forEach((button) => {
  button.addEventListener("click", () => {
    saveWritingFromPage();
    const activityId = button.dataset.writingDone;
    const note = document.querySelector(`[data-writing-status="${activityId}"]`);
    const message = awardWritingStar(activityId);
    if (note) note.textContent = message;
  });
});

document.addEventListener("keydown", (event) => {
  if (location.hash !== "#reading" || event.target.closest(".user-menu")) return;
  if (event.key !== "Escape") return;
  event.preventDefault();
  if (!readingPlastic.hidden || !readingPotter.hidden) showReadingTopics();
  else location.hash = "#home";
});
