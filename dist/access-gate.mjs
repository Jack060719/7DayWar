// A local entry prompt for a public static site, not server authentication.
// Never use this marker to authorize multiplayer actions or protect private data.
const key = '7daywar.access.v1';
const gate = document.querySelector('#accessGate');
const form = document.querySelector('#accessForm');
const input = document.querySelector('#accessPassword');
const button = document.querySelector('#accessSubmit');
const status = document.querySelector('#accessStatus');
let accepted = false, starting = false, failed = false;
try { accepted = localStorage.getItem(key) === 'accepted'; } catch {}

async function start() {
  if (starting) return;
  starting = true;
  button.disabled = true;
  input.disabled = true;
  gate.hidden = true;
  document.body.classList.remove('access-locked');
  try {
    await import(new URL(document.body.dataset.gameEntry, document.baseURI).href);
  } catch (error) {
    console.error('Game entry failed to load', error);
    document.body.classList.add('access-locked');
    gate.hidden = false;
    failed = true;
    status.textContent = '遊戲載入失敗，請確認連線後重新載入。既有存檔不會因此清除。';
    button.textContent = '重新載入';
    button.disabled = false;
    button.focus();
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  if (failed) { location.reload(); return; }
  if (starting) return;
  if (input.value !== '7day') {
    status.textContent = '密碼不正確，請再試一次。';
    input.setAttribute('aria-invalid', 'true');
    input.select();
    return;
  }
  input.removeAttribute('aria-invalid');
  input.value = '';
  try { localStorage.setItem(key, 'accepted'); } catch {}
  start();
});

if (accepted) start();
else { button.disabled = false; status.textContent = ''; }
