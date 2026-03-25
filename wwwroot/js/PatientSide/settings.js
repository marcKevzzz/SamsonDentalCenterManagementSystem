window.disableNavScroll = true;
toggleNavbar(true);

function switchTab(name) {
  ['personal','contact','security'].forEach(t => {
    const panel = document.getElementById('tab-' + t);
    const btn   = document.getElementById('tab-btn-' + t);
    if (t === name) {
      panel.classList.remove('hidden');
      btn.classList.remove('text-muted','border-transparent');
      btn.classList.add('text-primary','border-primary');
    } else {
      panel.classList.add('hidden');
      btn.classList.remove('text-primary','border-primary');
      btn.classList.add('text-muted','border-transparent');
    }
  });
}
 
function previewAvatar(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    document.getElementById('avatarCircle').innerHTML =
      `<img src="${ev.target.result}" class="avatar-img" alt="avatar"/>`;
  };
  reader.readAsDataURL(file);
}
function removeAvatar() {
  document.getElementById('avatarCircle').innerHTML = 'JD';
  document.getElementById('avatarInput').value = '';
}
 
function togglePw(id, btn) {
  const inp = document.getElementById(id);
  const hide = inp.type === 'password';
  inp.type = hide ? 'text' : 'password';
  btn.innerHTML = hide
    ? `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke-width="2" stroke-linecap="round"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke-width="2" stroke-linecap="round"/><line x1="1" y1="1" x2="23" y2="23" stroke-width="2" stroke-linecap="round"/></svg>`
    : `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke-width="2"/><circle cx="12" cy="12" r="3" stroke-width="2"/></svg>`;
}
 
function checkStrength(pw) {
  const segs = ['s1','s2','s3','s4'].map(id => document.getElementById(id));
  const label = document.getElementById('strengthLabel');
  segs.forEach(s => { s.className = 'strength-seg'; });
  if (!pw) { label.textContent = 'Enter a new password'; label.style.color = ''; return; }
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const cls  = ['weak','weak','medium','strong'];
  const lbls = ['Too short','Weak','Moderate','Strong','Very strong'];
  const cols = ['#ef4444','#ef4444','#f59e0b','#10b981','#10b981'];
  for (let i = 0; i < score; i++) segs[i].classList.add(cls[Math.min(i, cls.length-1)]);
  label.textContent = lbls[score] || 'Very strong';
  label.style.color = cols[score];
}
 
function handlePasswordSave() {
  const np = document.getElementById('newPw').value;
  const cp = document.getElementById('confirmPw').value;
  if (!np || !cp) { showToast('Please fill in all fields.', true); return; }
  if (np !== cp)  { showToast('Passwords do not match.', true); return; }
  showToast('Password updated!');
}
 
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  t.style.background = isError ? '#c0392b' : '#0f1117';
  t.style.transform = 'translateY(0)';
  setTimeout(() => { t.style.transform = 'translateY(120%)'; }, 3000);
}