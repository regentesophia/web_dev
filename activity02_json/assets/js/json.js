// Builds one card per character from the characters array (see characters.js).

// Card color for each element, using the site's palette
var elementColors = {
  Pyro: "tile-pink",
  Electro: "tile-lavender",
  Hydro: "tile-lilac",
  Cryo: "tile-lilac",
  Anemo: "tile-mint",
  Dendro: "tile-mint",
  Geo: "tile-cream"
};

var parent = document.getElementById("parent");
var html = "";

for (var i = 0; i < characters.length; i++) {
  var c = characters[i];
  var color = elementColors[c.element] || "tile-cream";

  // The portrait is the card's background; the text sits on top of it
  html += `
    <div class="col-12 col-lg-6 p-1">
      <div class="card portrait-card h-100 ` + color + `" role="button" tabindex="0" aria-pressed="false"
           aria-label="Play ` + c.name + `'s voice line" data-name="` + c.name + `">
        <div class="portrait-bg" aria-hidden="true">
          <img class="portrait" src="assets/img/` + c.name + `_Portrait.webp" alt="" loading="lazy">
          <span class="portrait-fallback" hidden>` + c.name.charAt(0) + `</span>
          <div class="portrait-veil"></div>
        </div>
        <div class="card-body">
          <h2 class="character-name">` + c.name + `</h2>
          <div class="d-flex flex-wrap gap-2 mb-2">
            <span class="retro-badge">` + c.element + `</span>
            <span class="retro-badge">` + c.weapon + `</span>
          </div>
          <p class="mb-0">` + c.intro + `</p>
        </div>
        <span class="play-chip" aria-hidden="true">
          <span class="chip-idle">Click to listen</span>
          <span class="chip-playing">Playing...</span>
        </span>
      </div>
    </div>
  `;
}

// Set the HTML once, after the loop (instead of rebuilding the page on every pass)
parent.innerHTML = html;

document.getElementById("count").textContent = characters.length + " object(s)";

// If a portrait file is missing, show a large faded initial instead
var portraits = parent.querySelectorAll(".portrait");
for (var j = 0; j < portraits.length; j++) {
  var img = portraits[j];
  var showInitial = function (el) {
    el.hidden = true;
    el.nextElementSibling.hidden = false;
  };
  img.addEventListener("error", function () { showInitial(this); });
  if (img.complete && img.naturalWidth === 0) showInitial(img);
}

// ---------- Voice lines ----------
// Click a card to hear the character's line (assets/audio/VO_Name_Hello.ogg).
// Only one plays at a time, and clicking the same card again stops it.
var voice = new Audio();
voice.volume = 0.8;
var currentCard = null;
var statusLeft = document.getElementById("count");
var defaultStatus = characters.length + " object(s)";
var statusTimer = null;

function stopVoice() {
  clearTimeout(statusTimer);
  voice.pause();
  if (currentCard) {
    currentCard.classList.remove("is-playing");
    currentCard.setAttribute("aria-pressed", "false");
  }
  currentCard = null;
  statusLeft.textContent = defaultStatus;
}

// File missing or format not supported by this browser
function failVoice() {
  if (!currentCard) return;
  var name = currentCard.dataset.name;
  stopVoice();
  statusLeft.textContent = "Can't play " + name + "'s voice line";
  statusTimer = setTimeout(function () { statusLeft.textContent = defaultStatus; }, 3500);
}

function playVoice(card) {
  var wasCurrent = (card === currentCard);
  stopVoice();
  if (wasCurrent) return; // second click on the same card stops it

  currentCard = card;
  card.classList.add("is-playing");
  card.setAttribute("aria-pressed", "true");
  statusLeft.textContent = "Playing: " + card.dataset.name + "...";

  voice.src = "assets/audio/VO_" + card.dataset.name + "_Hello.ogg";
  var started = voice.play();
  if (started && started.catch) {
    started.catch(function (err) {
      if (err && err.name === "AbortError") return; // interrupted by another click
      failVoice();
    });
  }
}

voice.addEventListener("ended", stopVoice);
voice.addEventListener("error", failVoice);

parent.addEventListener("click", function (e) {
  var card = e.target.closest(".portrait-card");
  if (card) playVoice(card);
});

// Keyboard: Enter or Space plays the focused card
parent.addEventListener("keydown", function (e) {
  if (e.key !== "Enter" && e.key !== " ") return;
  var card = e.target.closest(".portrait-card");
  if (card && e.target === card) {
    e.preventDefault();
    playVoice(card);
  }
});

// Stop the voice when the window is closed or minimized
var appWindow = document.querySelector(".retro-window");
new MutationObserver(function () {
  if (appWindow.hidden) stopVoice();
}).observe(appWindow, { attributes: true, attributeFilter: ["hidden"] });

// If the logo file is missing, show its name as text instead
var logo = document.querySelector(".version-logo");
function showLogoText() {
  logo.hidden = true;
  logo.nextElementSibling.hidden = false;
}
logo.addEventListener("error", showLogoText);
if (logo.complete && logo.naturalWidth === 0) showLogoText();

// Taskbar clock
var clock = document.getElementById("clock");
function tick() {
  clock.textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
tick();
setInterval(tick, 30000);
