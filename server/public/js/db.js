// IndexedDB 数据库配置
const DB_NAME = 'TodoDB';
const DB_VERSION = 1;
const STORE_NAME = 'offlineRequests';

// 初始化数据库
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// 保存离线请求
async function saveOfflineRequest(request) {
  const db = await initDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const req = store.add({
      url: request.url,
      method: request.method,
      data: request.data,
      timestamp: Date.now()
    });

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// 获取所有离线请求
async function getOfflineRequests() {
  const db = await initDB();
  const transaction = db.transaction(STORE_NAME, 'readonly');
  const store = transaction.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// 删除离线请求
async function deleteOfflineRequest(id) {
  const db = await initDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// 同步离线请求
async function syncOfflineRequests() {
  if (!navigator.onLine) return;

  const requests = await getOfflineRequests();
  for (const request of requests) {
    try {
      await fetch(request.url, {
        method: request.method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request.data)
      });
      await deleteOfflineRequest(request.id);
    } catch (error) {
      console.error('同步离线请求失败:', error);
    }
  }
}

// 拦截表单提交
document.addEventListener('submit', async (event) => {
  const form = event.target;
  if (!navigator.onLine) {
    event.preventDefault();
    const formData = new FormData(form);
    const data = {};
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }

    await saveOfflineRequest({
      url: form.action,
      method: form.method,
      data
    });

    // 更新UI以反映离线更改
    if (form.closest('.todo-item')) {
      const todoItem = form.closest('.todo-item');
      if (form.matches('[action$="/toggle"]')) {
        todoItem.classList.toggle('completed');
      } else if (form.matches('[action$="/delete"]')) {
        todoItem.remove();
      }
    }
  }
});