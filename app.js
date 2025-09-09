// Add your Google Maps API key here
const apiKey = "AIzaSyDT-4VZc9TnY76LB_WvO4hWJKE8BOgtzaM";

// CORS Proxy (for dev/testing)
const useProxy = true;
const proxy = "https://cors-anywhere.herokuapp.com/";

// Search config
const CONFIG = {
  searchRadius: 1500, // meters
  placeType: "cafe",
  photoMaxWidth: 400,
  cacheExpirationMinutes: 10
};

// DOM elements
const cardsEl = document.getElementById("cafeCards");
const savedCardsEl = document.getElementById("savedCafeCards");
const findView = document.getElementById("findCafesView");
const savedView = document.getElementById("savedCafesView");

// Navigation
document.getElementById("findCafesBtn").addEventListener("click", () => {
  showView("find");
});
document.getElementById("savedCafesBtn").addEventListener("click", () => {
  showView("saved");
});
document.getElementById("refreshBtn").addEventListener("click", () => {
  getLocation();
});

function showView(view) {
  if (view === "find") {
    findView.classList.add("active");
    savedView.classList.remove("active");
  } else {
    savedView.classList.add("active");
    findView.classList.remove("active");
    showSaved();
  }
}

// GELOCATION with caching
function getLocation() {
  // Show loading spinner
  cardsEl.innerHTML = `<div class="loading-state"><div class="loading-spinner"></div><p>Finding cafes near you...</p><small>Make sure to allow location access</small></div>`;
  const cache = JSON.parse(localStorage.getItem("cachedLocation") || "{}");
  const now = Date.now();
  if (cache.timestamp && now - cache.timestamp < CONFIG.cacheExpirationMinutes * 60 * 1000) {
    useLocation(cache.lat, cache.lng);
  } else {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        localStorage.setItem("cachedLocation", JSON.stringify({ lat, lng, timestamp: now }));
        useLocation(lat, lng);
      },
      () => {
        cardsEl.innerHTML = `<div class="loading-state"><p>Location access denied or unavailable.</p></div>`;
      }
    );
  }
}

// Google Places API request
async function useLocation(lat, lng) {
  const endpoint = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${CONFIG.searchRadius}&type=${CONFIG.placeType}&key=${apiKey}`;
  const url = useProxy ? proxy + endpoint : endpoint;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.results) {
      displayCards(data.results);
    } else {
      cardsEl.innerHTML = `<div class="loading-state"><p>No cafes found.</p></div>`;
    }
  } catch (e) {
    cardsEl.innerHTML = `<div class="loading-state"><p>Error fetching cafes.</p></div>`;
  }
}

// Render cards for cafes, add swipe
function displayCards(cafes) {
  cardsEl.innerHTML = "";
  cafes.forEach((cafe, i) => {
    const wrapper = document.createElement("div");
    wrapper.className = "swipe-wrapper";
    wrapper.style.zIndex = 200 - i;

    const imgUrl = cafe.photos?.[0]?.photo_reference
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${CONFIG.photoMaxWidth}&photoreference=${cafe.photos[0].photo_reference}&key=${apiKey}`
      : "https://via.placeholder.com/250x150?text=No+Image";

    const cafeData = {
      name: cafe.name,
      place_id: cafe.place_id,
      photo: imgUrl,
      rating: cafe.rating || "N/A"
    };

    const card = document.createElement("div");
    card.className = "location-card";
    card.innerHTML = `
      <img src="${imgUrl}" alt="${cafe.name}" />
      <h3>${cafe.name}</h3>
      <p>⭐️ Rating: ${cafe.rating || "N/A"}</p>
      <p><small>Swipe right to save 💖</small></p>
    `;
    wrapper.appendChild(card);
    cardsEl.appendChild(wrapper);

    // Swipe functionality with Hammer.js
    const hammertime = new Hammer(wrapper);
    hammertime.on('swipeleft', () => {
      wrapper.classList.add("swipe-left");
      setTimeout(() => wrapper.remove(), 400);
    });
    hammertime.on('swiperight', () => {
      saveCafe(JSON.stringify(cafeData));
      wrapper.classList.add("swipe-right");
      setTimeout(() => wrapper.remove(), 400);
    });
  });
}

// Save cafe to localStorage
function saveCafe(cafeJSON) {
  const cafe = JSON.parse(cafeJSON);
  let saved = JSON.parse(localStorage.getItem('savedCafes') || '[]');
  if (!saved.find(c => c.place_id === cafe.place_id)) {
    saved.push(cafe);
    localStorage.setItem('savedCafes', JSON.stringify(saved));
    alert(`${cafe.name} saved!`);
  } else {
    alert(`${cafe.name} is already saved.`);
  }
}

// Show saved cafes
function showSaved() {
  savedCardsEl.innerHTML = "";
  const saved = JSON.parse(localStorage.getItem('savedCafes') || '[]');
  if (saved.length === 0) {
    savedCardsEl.innerHTML = "<p>No saved cafes yet 😢</p>";
    return;
  }
  saved.forEach(cafe => {
    const card = document.createElement('div');
    card.className = 'location-card';
    card.innerHTML = `
      <img src="${cafe.photo}" alt="${cafe.name}" />
      <h3>${cafe.name}</h3>
      <p>⭐️ Rating: ${cafe.rating}</p>
    `;
    savedCardsEl.appendChild(card);
  });
}

// INITIALIZE: start with find view, trigger location fetch
showView("find");
getLocation();
