const carousel = document.getElementById("carousel");
const tickerTrack = document.getElementById("tickerTrack");
const dateMonth = document.getElementById("dateMonth");
const dateYear = document.getElementById("dateYear");
const exportBtn = document.getElementById("exportBtn");

const TICK_STEP = parseFloat(
  getComputedStyle(document.documentElement).getPropertyValue("--ticker-tick-width")
) + parseFloat(
  getComputedStyle(document.documentElement).getPropertyValue("--ticker-gap")
);

let photos = [];
let slides = [];
let ticks = [];
let activeIndex = 0;
let displayedMonth = "";
let displayedYear = "";
let dateAnimating = false;
let rafId = null;

const WAVE_MAX_H = 28;
const WAVE_MIN_H = 5;
const WAVE_RADIUS = 3;
const VISUAL_GAP = 4;

async function init() {
  const res = await fetch("./data/manifest.json");
  const data = await res.json();
  photos = data.photos;

  buildCarousel();
  buildTicker();
  bindEvents();
  const startIndex = 0;
  const startPhoto = photos[startIndex];
  dateMonth.textContent = startPhoto.month;
  dateYear.textContent = startPhoto.year;
  displayedMonth = startPhoto.month;
  displayedYear = startPhoto.year;
  activeIndex = startIndex;
  requestAnimationFrame(() => {
    updateSpacers();
    scrollToIndex(activeIndex, false);
    onScroll();
  });
}

function buildCarousel() {
  const lead = document.createElement("div");
  lead.className = "carousel-spacer";
  carousel.appendChild(lead);

  slides = photos.map((photo, i) => {
    const slide = document.createElement("div");
    slide.className = "slide";
    slide.dataset.index = i;

    const img = document.createElement("img");
    img.alt = photo.label;
    img.decoding = "async";
    img.draggable = false;
    img.src = `./public/images/${encodeURIComponent(photo.file)}`;
    img.addEventListener("load", () => {
      if (img.naturalWidth > img.naturalHeight) {
        slide.classList.add("is-landscape");
      }
      updateSpacers();
      onScroll();
    });
    img.addEventListener("error", () => {
      slide.classList.add("is-broken");
    });
    slide.appendChild(img);
    carousel.appendChild(slide);
    return { el: slide, img, photo };
  });

  const trail = document.createElement("div");
  trail.className = "carousel-spacer";
  carousel.appendChild(trail);
}

function buildTicker() {
  tickerTrack.innerHTML = "";
  ticks = photos.map(() => {
    const tick = document.createElement("div");
    tick.className = "ticker-tick";
    tickerTrack.appendChild(tick);
    return tick;
  });
}

function bindEvents() {
  carousel.addEventListener("scroll", () => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(onScroll);
  }, { passive: true });

  exportBtn.addEventListener("click", exportCurrentImage);

  window.addEventListener("resize", () => {
    updateSpacers();
    scrollToIndex(activeIndex, false);
    onScroll();
  });
}

function updateSpacers() {
  const spacers = carousel.querySelectorAll(".carousel-spacer");
  if (spacers.length < 2 || !slides.length) return;

  const leadW = (carousel.clientWidth - slides[0].el.offsetWidth) / 2;
  const last = slides.length - 1;
  const trailW = (carousel.clientWidth - slides[last].el.offsetWidth) / 2;

  spacers[0].style.width = `${Math.max(0, leadW)}px`;
  spacers[1].style.width = `${Math.max(0, trailW)}px`;
}

function onScroll() {
  const center = carousel.scrollLeft + carousel.clientWidth / 2;
  let closest = 0;
  let closestDist = Infinity;
  const scales = [];

  slides.forEach(({ el }, i) => {
    const slideCenter = el.offsetLeft + el.offsetWidth / 2;
    const dist = Math.abs(center - slideCenter);
    if (dist < closestDist) {
      closestDist = dist;
      closest = i;
    }

    const norm = Math.min(dist / (carousel.clientWidth * 0.38), 1);
    scales[i] = 1 - norm * 0.48;
  });

  slides.forEach(({ el }, i) => {
    const scale = scales[i];
    const width = el.offsetWidth;
    const shrink = width * (1 - scale) * 0.5;
    const nextShrink = i < slides.length - 1
      ? slides[i + 1].el.offsetWidth * (1 - scales[i + 1]) * 0.5
      : 0;

    el.style.transform = `scale(${scale})`;
    el.style.opacity = "1";
    el.style.marginRight = `${VISUAL_GAP - shrink - nextShrink}px`;
  });

  const fractional = getFractionalIndex(center);
  updateTickerWave(fractional);

  if (closest !== activeIndex) {
    updateActive(closest);
  }
}

function getFractionalIndex(center) {
  if (!slides.length) return 0;
  if (slides.length === 1) return 0;

  const firstCenter = slides[0].el.offsetLeft + slides[0].el.offsetWidth / 2;
  if (center <= firstCenter) return 0;

  const last = slides.length - 1;
  const lastCenter = slides[last].el.offsetLeft + slides[last].el.offsetWidth / 2;
  if (center >= lastCenter) return last;

  for (let i = 0; i < last; i++) {
    const c0 = slides[i].el.offsetLeft + slides[i].el.offsetWidth / 2;
    const c1 = slides[i + 1].el.offsetLeft + slides[i + 1].el.offsetWidth / 2;
    if (center >= c0 && center <= c1) {
      const t = (center - c0) / (c1 - c0);
      return i + t;
    }
  }

  return 0;
}

function updateActive(index) {
  activeIndex = index;
  const photo = photos[index];
  animateDateChange(photo.month, photo.year);
}

function animateDateChange(month, year) {
  if (month === displayedMonth && year === displayedYear) return;
  if (dateAnimating) {
    displayedMonth = month;
    displayedYear = year;
    dateMonth.textContent = month;
    dateYear.textContent = year;
    dateMonth.classList.remove("is-blurring", "is-entering");
    dateYear.classList.remove("is-blurring", "is-entering");
    dateAnimating = false;
    return;
  }

  dateAnimating = true;
  dateMonth.classList.add("is-blurring");
  dateYear.classList.add("is-blurring");

  setTimeout(() => {
    dateMonth.textContent = month;
    dateYear.textContent = year;
    displayedMonth = month;
    displayedYear = year;

    dateMonth.classList.remove("is-blurring");
    dateYear.classList.remove("is-blurring");
    dateMonth.classList.add("is-entering");
    dateYear.classList.add("is-entering");

    requestAnimationFrame(() => {
      dateMonth.classList.remove("is-entering");
      dateYear.classList.remove("is-entering");
      dateAnimating = false;
    });
  }, 90);
}

function updateTickerWave(fractionalIndex) {
  const viewport = tickerTrack.parentElement;
  const start = Math.max(0, Math.floor(fractionalIndex) - WAVE_RADIUS - 4);
  const end = Math.min(ticks.length - 1, Math.ceil(fractionalIndex) + WAVE_RADIUS + 4);

  for (let i = 0; i < ticks.length; i++) {
    if (i < start || i > end) {
      ticks[i].style.height = `${WAVE_MIN_H}px`;
      ticks[i].style.backgroundColor = "#d0d0d0";
      continue;
    }

    const dist = Math.abs(i - fractionalIndex);
    const t = Math.min(dist / WAVE_RADIUS, 1);
    const height = WAVE_MAX_H - t * (WAVE_MAX_H - WAVE_MIN_H);

    ticks[i].style.height = `${height}px`;
    ticks[i].style.backgroundColor = dist < 0.45 ? "#111" : "#c8c8c8";
  }

  const offset = fractionalIndex * TICK_STEP + TICK_STEP / 2 - viewport.clientWidth / 2;
  tickerTrack.style.transform = `translateX(${-offset}px)`;
}

function scrollToIndex(index, smooth = true) {
  const slide = slides[index]?.el;
  if (!slide) return;
  const target = slide.offsetLeft - (carousel.clientWidth - slide.offsetWidth) / 2;
  carousel.scrollTo({ left: target, behavior: smooth ? "smooth" : "instant" });
}

async function exportCurrentImage() {
  const photo = photos[activeIndex];
  const url = `./public/images/${encodeURIComponent(photo.file)}`;

  exportBtn.disabled = true;

  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const filename = photo.file;

    if (navigator.share && navigator.canShare?.({ files: [new File([blob], filename, { type: blob.type })] })) {
      const file = new File([blob], filename, { type: blob.type });
      await navigator.share({ files: [file], title: "Film photo" });
      return;
    }

    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  } catch {
    window.open(url, "_blank");
  } finally {
    exportBtn.disabled = false;
  }
}

init();
