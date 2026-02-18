(() => {
  if (window.__yappuccinoLoaded) return;
  window.__yappuccinoLoaded = true;

  // ── State ──────────────────────────────────────────────────────────────────
  // states: 'hidden' | 'running' | 'paused' | 'countdown'
  let state = 'hidden';
  let elapsed = 0;    // total accrued seconds (count-up)
  let countdown = 0;  // remaining seconds during punishment countdown
  let intervalId = null;
  let overlay = null;
  let timerEl = null;
  let msgEl = null;
  let subEl = null;
  let modeLabelEl = null;

  // ── Messages ───────────────────────────────────────────────────────────────
  const startMessages = [
    { main: "Uh oh! We're off task! 😬", sub: "Let's get back to work, friends." },
    { main: "Yikes! Too many Yappuccinos! ☕", sub: "Time to refocus, team." },
    { main: "Oops! Chatterbox mode activated! 📢", sub: "Let's bring those voices down." },
    { main: "Whoops! Too much talky, not enough worky! 🙊", sub: "Shh… let's refocus." },
    { main: "Uh oh! We've gone off the rails! 🚂", sub: "Time to get back on track." },
    { main: "Oh no! The noise train has left the station! 🎺", sub: "Let's settle down, legends." },
  ];

  const pauseMessages = [
    { main: "Thank you for refocusing! 🌟", sub: "Keep up the great work!" },
    { main: "Much better — let's keep it up! 💪", sub: "You've got this!" },
    { main: "That's more like it! ⭐", sub: "Great refocusing, everyone!" },
    { main: "Awesome job settling down! 🎉", sub: "I knew you could do it!" },
    { main: "Look at that — back on task! 🚀", sub: "You're all stars." },
  ];

  const reclaimMessages = [
    { main: "Work time reclaimed! 🎉", sub: "Excellent focus — that's how it's done!" },
    { main: "Debt cleared! Well done! ✅", sub: "You earned your time back, legends." },
    { main: "All caught up! Amazing work! 🌟", sub: "That's what I'm talking about!" },
    { main: "Time reclaimed! Superb effort! 🏆", sub: "You should be proud of yourselves." },
  ];

  function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ── Audio ──────────────────────────────────────────────────────────────────
  function playBuzzer() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    ctx.resume().then(() => {
      const times = [0, 0.18, 0.36];
      times.forEach(t => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(380, ctx.currentTime + t);
        osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + t + 0.15);
        gain.gain.setValueAtTime(0.85, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.16);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.18);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(190, ctx.currentTime + t);
        gain2.gain.setValueAtTime(0.4, ctx.currentTime + t);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.16);
        osc2.start(ctx.currentTime + t);
        osc2.stop(ctx.currentTime + t + 0.18);
      });
    });
  }

  function playChime() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    ctx.resume().then(() => {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.13;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.6, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        osc.start(t);
        osc.stop(t + 0.65);
      });
    });
  }

  // ── Formatting ─────────────────────────────────────────────────────────────
  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  }

  // ── Overlay ────────────────────────────────────────────────────────────────
  function createOverlay() {
    const el = document.createElement('div');
    el.id = '__yappuccino_overlay__';
    el.innerHTML = `
      <style>
        #__yappuccino_overlay__ {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) scale(0.85);
          z-index: 2147483647;
          width: min(680px, 88vw);
          border-radius: 28px;
          padding: 48px 56px;
          text-align: center;
          font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
          box-shadow: 0 24px 80px rgba(0,0,0,0.35), 0 0 0 3px rgba(255,255,255,0.15);
          transition: background 0.6s ease, transform 0.3s cubic-bezier(.34,1.56,.64,1), opacity 0.3s ease;
          opacity: 0;
          pointer-events: none;
        }
        #__yappuccino_overlay__.visible {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
          pointer-events: all;
        }
        #__yappuccino_overlay__.running   { background: linear-gradient(145deg, #c0392b, #e74c3c, #e05c45); }
        #__yappuccino_overlay__.paused    { background: linear-gradient(145deg, #1e8449, #27ae60, #2ecc71); }
        #__yappuccino_overlay__.countdown { background: linear-gradient(145deg, #1a5276, #2980b9, #3498db); }
        #__yappuccino_overlay__ .__yap_mode_label__ {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.6);
          margin-bottom: 10px;
        }
        #__yappuccino_overlay__ .__yap_timer__ {
          font-size: clamp(72px, 12vw, 110px);
          font-weight: 900;
          letter-spacing: -2px;
          color: #fff;
          text-shadow: 0 4px 20px rgba(0,0,0,0.3);
          line-height: 1;
          margin-bottom: 20px;
          font-variant-numeric: tabular-nums;
          transition: transform 0.1s ease;
        }
        #__yappuccino_overlay__ .__yap_timer__.tick { transform: scale(1.04); }
        #__yappuccino_overlay__ .__yap_msg__ {
          font-size: clamp(20px, 3.5vw, 28px);
          font-weight: 800;
          color: #fff;
          text-shadow: 0 2px 8px rgba(0,0,0,0.2);
          margin-bottom: 10px;
          line-height: 1.2;
        }
        #__yappuccino_overlay__ .__yap_sub__ {
          font-size: clamp(14px, 2.2vw, 18px);
          font-weight: 500;
          color: rgba(255,255,255,0.88);
        }
        #__yappuccino_overlay__ .__yap_hint__ {
          margin-top: 24px;
          font-size: 12px;
          color: rgba(255,255,255,0.5);
          letter-spacing: 0.5px;
        }
      </style>
      <div class="__yap_mode_label__"></div>
      <div class="__yap_timer__">00:00</div>
      <div class="__yap_msg__"></div>
      <div class="__yap_sub__"></div>
      <div class="__yap_hint__">Alt+Shift+Y to toggle</div>
    `;
    document.body.appendChild(el);
    timerEl       = el.querySelector('.__yap_timer__');
    msgEl         = el.querySelector('.__yap_msg__');
    subEl         = el.querySelector('.__yap_sub__');
    modeLabelEl   = el.querySelector('.__yap_mode_label__');
    return el;
  }

  function ensureOverlay() {
    if (!overlay || !document.body.contains(overlay)) {
      overlay = createOverlay();
    }
  }

  function tickAnim() {
    timerEl.classList.add('tick');
    setTimeout(() => timerEl.classList.remove('tick'), 100);
  }

  // ── Core actions ───────────────────────────────────────────────────────────
  function startRunning() {
    ensureOverlay();
    const msg = randomFrom(startMessages);
    msgEl.textContent = msg.main;
    subEl.textContent = msg.sub;
    modeLabelEl.textContent = '⏱ time accrued';
    overlay.className = '';
    void overlay.offsetWidth;
    overlay.classList.add('running', 'visible');
    timerEl.textContent = formatTime(elapsed);
    playBuzzer();
    intervalId = setInterval(() => {
      elapsed++;
      timerEl.textContent = formatTime(elapsed);
      tickAnim();
    }, 1000);
    state = 'running';
  }

  function pauseRunning() {
    clearInterval(intervalId);
    intervalId = null;
    const msg = randomFrom(pauseMessages);
    msgEl.textContent = msg.main;
    subEl.textContent = msg.sub;
    overlay.classList.remove('running');
    overlay.classList.add('paused');
    playChime();
    state = 'paused';
    setTimeout(() => {
      if (state === 'paused') overlay.classList.remove('visible');
    }, 3000);
  }

  function startCountdown() {
    if (elapsed === 0) return; // nothing to count down from
    clearInterval(intervalId);
    intervalId = null;
    countdown = elapsed;
    ensureOverlay();
    msgEl.textContent = '🔵 Silent work time!';
    subEl.textContent = "Work it off — you've got this!";
    modeLabelEl.textContent = '⏳ working it off';
    overlay.className = '';
    void overlay.offsetWidth;
    overlay.classList.add('countdown', 'visible');
    timerEl.textContent = formatTime(countdown);
    state = 'countdown';
    intervalId = setInterval(() => {
      countdown--;
      elapsed--;
      timerEl.textContent = formatTime(countdown);
      tickAnim();
      if (countdown <= 0) {
        clearInterval(intervalId);
        intervalId = null;
        finishCountdown();
      }
    }, 1000);
  }

  function finishCountdown() {
    elapsed = 0;
    countdown = 0;
    const msg = randomFrom(reclaimMessages);
    msgEl.textContent = msg.main;
    subEl.textContent = msg.sub;
    modeLabelEl.textContent = '✅ all done';
    timerEl.textContent = '00:00';
    overlay.classList.remove('countdown');
    overlay.classList.add('paused');
    playChime();
    state = 'hidden';
    setTimeout(() => {
      if (overlay) overlay.classList.remove('visible');
    }, 4000);
  }

  function reset() {
    clearInterval(intervalId);
    intervalId = null;
    elapsed = 0;
    countdown = 0;
    state = 'hidden';
    if (overlay) overlay.classList.remove('visible');
  }

  function toggle() {
    if (state === 'hidden')      { elapsed = 0; startRunning(); }
    else if (state === 'running')   { pauseRunning(); }
    else if (state === 'paused')    { startRunning(); }
    // Hotkey does nothing during an active countdown — let it finish
  }

  // ── Message listener ───────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === 'toggle') {
      toggle();
      sendResponse({ elapsed, state });
    } else if (msg.action === 'reset') {
      reset();
      sendResponse({ elapsed, state });
    } else if (msg.action === 'countdown') {
      startCountdown();
      sendResponse({ elapsed, state });
    } else if (msg.action === 'getState') {
      sendResponse({ elapsed, state });
    }
    return true;
  });
})();
