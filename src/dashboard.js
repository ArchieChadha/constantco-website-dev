// Smooth reveal for Upload + Records
document.addEventListener('DOMContentLoaded', () => {
    const nameEl = document.getElementById('dashName');
    const btnUpload = document.getElementById('btnUpload');
    const btnRecords = document.getElementById('btnRecords');

    const uploadSection = document.getElementById('uploadSection');
    const recordsSection = document.getElementById('recordsSection');

    // optional: personalize if you stored a name in sessionStorage/localStorage
    const storedName = sessionStorage.getItem('clientName') || localStorage.getItem('clientName');
    if (storedName && nameEl) nameEl.textContent = storedName;

    function openSection(section) {
        if (!section) return;
        // make it renderable
        section.classList.remove('is-hidden');
        // next frame -> add open class to animate
        requestAnimationFrame(() => {
            section.classList.add('is-open');
        });
        // scroll into view after animation starts
        setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    }

    function closeSection(section) {
        if (!section) return;
        section.classList.remove('is-open');
        // after transition finishes, fully hide
        section.addEventListener('transitionend', function onEnd(e) {
            if (e.propertyName === 'max-height') {
                section.classList.add('is-hidden');
                section.removeEventListener('transitionend', onEnd);
            }
        });
    }

    function toggleSection(section) {
        if (section.classList.contains('is-hidden') || !section.classList.contains('is-open')) {
            openSection(section);
        } else {
            closeSection(section);
        }
    }

    // Buttons open their sections; also close the other to keep the page tidy
    btnUpload?.addEventListener('click', () => {
        openSection(uploadSection);
        if (recordsSection?.classList.contains('is-open')) closeSection(recordsSection);
    });

    btnRecords?.addEventListener('click', () => {
        openSection(recordsSection);
        if (uploadSection?.classList.contains('is-open')) closeSection(uploadSection);
        // you can load records here if you have an API:
        // loadRecords();
    });

    // If you want one section pre-opened on load, uncomment:
    // openSection(uploadSection);

    /* ---- (optional) stub for records fetch) ----
    async function loadRecords() {
      const list = document.getElementById('recordsList');
      list.textContent = 'Loading...';
      try {
        const res = await fetch('http://localhost:3001/api/records'); // adjust to your API
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) {
          list.textContent = 'No records found.';
          return;
        }
        list.innerHTML = data.map(d => `
          <div class="record-item">
            <strong>${d.title}</strong> — <small>${new Date(d.created_at).toLocaleString()}</small>
          </div>
        `).join('');
      } catch (e) {
        list.textContent = 'Failed to load records.';
      }
    }
    */
});
