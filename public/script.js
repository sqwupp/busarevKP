const menuButton = document.querySelector('.menu-btn');
const navLinks = document.querySelector('.links');
menuButton?.addEventListener('click', () => navLinks?.classList.toggle('open'));

const API = '/api';
async function sendForm(url, data) {
  const response = await fetch(`${API}${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Something went wrong. Please try again.');
  return result;
}
function showNotice(form, message, success = true) {
  const notice = form.querySelector('.notice');
  if (!notice) return;
  notice.textContent = message;
  notice.className = `notice ${success ? 'success' : 'error'}`;
  notice.style.display = 'block';
}

document.querySelector('#register-form')?.addEventListener('submit', async (event) => {
  event.preventDefault(); const form = event.currentTarget; const data = Object.fromEntries(new FormData(form));
  try { const result = await sendForm('/auth/register', data); localStorage.setItem('crocketToken', result.token); window.location.href = 'index.html'; }
  catch (error) { showNotice(form, error.message, false); }
});
document.querySelector('#login-form')?.addEventListener('submit', async (event) => {
  event.preventDefault(); const form = event.currentTarget; const data = Object.fromEntries(new FormData(form));
  try { const result = await sendForm('/auth/login', data); localStorage.setItem('crocketToken', result.token); window.location.href = 'index.html'; }
  catch (error) { showNotice(form, error.message, false); }
});

// Show account state in the navigation and provide logout.
document.querySelectorAll('.links a[href="auth.html"]').forEach((link) => {
  if (localStorage.getItem('crocketToken')) {
    link.textContent = 'Log out';
    link.href = '#logout';
    link.addEventListener('click', (event) => {
      event.preventDefault();
      localStorage.removeItem('crocketToken');
      window.location.href = 'index.html';
    });
  }
});

document.querySelectorAll('.contact-form:not(#register-form):not(#login-form)').forEach((form) => {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const fields = [...form.querySelectorAll('input, select, textarea')];
    const values = fields.map((field) => field.value.trim());
    try {
      if (form.closest('main')?.querySelector('h1')?.textContent.toLowerCase().includes('unforgettable')) {
        const data = { destination: values[0], travel_dates: values[1], travellers: values[2], travel_style: values[3], notes: values[4] };
        await sendForm('/trips', data);
        showNotice(form, 'Your trip request was saved. We will be in touch!'); setTimeout(() => window.location.reload(), 900);
      } else {
        const data = { name: values[0], email: values[1], topic: values[2], destination: values[3], message: values[4] };
        await sendForm('/contact', data);
        showNotice(form, 'Message sent successfully. Thank you!'); setTimeout(() => window.location.reload(), 900);
      }
    } catch (error) { showNotice(form, `${error.message} Make sure the Node.js server is running.`, false); }
  });
});
