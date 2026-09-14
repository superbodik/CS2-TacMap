import { qs, toast } from '../core/dom.js';

const MESSAGE = 'Функция парсинга демок требует бэкенда и находится в разработке';

export function createDemoAnalyzer({ api }) {
  const drop = qs('#demoDrop');
  const fileInput = qs('#demoFile');
  const fileBtn = qs('#btnDemoFile');
  const urlInput = qs('#demoUrl');
  const urlBtn = qs('#btnDemoUrl');

  function notify(detail) {
    window.alert(MESSAGE);
    if (detail) toast(detail, 'info', 4200);
  }

  async function handleFile(file) {
    if (!file) return;
    const sizeMb = (file.size / 1048576).toFixed(1);
    notify(`${file.name} · ${sizeMb} МБ поставлен в очередь`);
    if (!api.available()) return;
    try {
      const result = await api.uploadDemo(file);
      toast(`Сервер: ${result.status} (job ${result.jobId})`, 'info', 5000);
    } catch (error) {
      toast(`Demo API: ${error.message}`, 'err');
    }
  }

  async function handleLink() {
    const url = (urlInput.value || '').trim();
    if (!url) {
      notify('Вставьте ссылку на матч Faceit или матчмейкинга');
      return;
    }
    notify(`Матч принят в очередь: ${url.slice(0, 48)}`);
    if (!api.available()) return;
    try {
      const result = await api.submitDemoLink(url);
      toast(`Сервер: ${result.status} (job ${result.jobId})`, 'info', 5000);
    } catch (error) {
      toast(`Demo API: ${error.message}`, 'err');
    }
  }

  if (fileBtn) fileBtn.addEventListener('click', () => fileInput.click());
  if (drop) drop.addEventListener('click', () => fileInput.click());
  if (fileInput) fileInput.addEventListener('change', event => {
    handleFile(event.target.files[0]);
    event.target.value = '';
  });
  if (urlBtn) urlBtn.addEventListener('click', handleLink);
  if (urlInput) urlInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') handleLink();
  });

  if (drop) {
    for (const type of ['dragenter', 'dragover']) {
      drop.addEventListener(type, event => {
        event.preventDefault();
        drop.classList.add('over');
      });
    }
    for (const type of ['dragleave', 'drop']) {
      drop.addEventListener(type, event => {
        event.preventDefault();
        drop.classList.remove('over');
      });
    }
    drop.addEventListener('drop', event => {
      const file = event.dataTransfer.files[0];
      handleFile(file);
    });
  }

  return { notify };
}
