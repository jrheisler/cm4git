window.addEventListener('DOMContentLoaded', () => {
  const defaultConfig = { boxes: [] };
  if (!localStorage.getItem('cm4git_config')) {
    localStorage.setItem('cm4git_config', JSON.stringify(defaultConfig));
  }

  let config = JSON.parse(localStorage.getItem('cm4git_config'));
  let editingIndex = null;
  const dashboard = document.getElementById('dashboard');
  const charts = {};

  const addBoxBtn = document.createElement('button');
  addBoxBtn.id = "addBoxBtn";
  addBoxBtn.className = "mb-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded";
  addBoxBtn.textContent = "➕ Add Box";
  dashboard.parentNode.insertBefore(addBoxBtn, dashboard);

  const modal = document.createElement('div');
  modal.id = "editorModal";
  modal.className = "fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 px-2 py-5 hidden";
  modal.innerHTML = `
    <div class="bg-gray-800 text-white p-4 rounded shadow-lg w-full max-w-md h-full max-h-[calc(100vh-40px)] overflow-y-auto">
      <h2 class="text-base font-semibold mb-3">Box Editor</h2>
      <label class="block mb-2 text-sm">Title
        <input id="boxTitle" class="w-full p-1 bg-gray-900 text-white border border-gray-700 rounded mt-1 text-sm" />
      </label>
      <label class="block mb-2 text-sm">Repo (owner/repo)
        <input id="boxRepo" class="w-full p-1 bg-gray-900 text-white border border-gray-700 rounded mt-1 text-sm" />
      </label>
      <label class="block mb-2 text-sm">Range
        <select id="boxRange" class="w-full p-1 bg-gray-900 text-white border border-gray-700 rounded mt-1 text-sm">
          <option value="today">Today</option>
          <option value="this_week" selected>This Week</option>
          <option value="this_month">This Month</option>
        </select>
      </label>
      <label class="block mb-2 text-sm">Category
        <select id="boxCategory" class="w-full p-1 bg-gray-900 text-white border border-gray-700 rounded mt-1 text-sm">
          <option value="commits" selected>Commits</option>
        </select>
      </label>
      <label class="block mb-4 text-sm">Graph Type
        <select id="boxGraph" class="w-full p-1 bg-gray-900 text-white border border-gray-700 rounded mt-1 text-sm">
          <option value="line" selected>Line</option>
          <option value="bar">Bar</option>
        </select>
      </label>
      <div class="flex justify-end gap-2">
        <button id="cancelBtn" class="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm">Cancel</button>
        <button id="saveBtn" class="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm">Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  function getSinceDate(range) {
    const now = new Date();
    let since = new Date();
    if (range === "today") since.setHours(0, 0, 0, 0);
    else if (range === "this_week") since.setDate(now.getDate() - 7);
    else if (range === "this_month") since.setMonth(now.getMonth() - 1);
    return since.toISOString();
  }

  async function loadCommits(index) {
    const box = config.boxes[index];
    const since = getSinceDate(box.range);
    const url = `https://api.github.com/repos/${box.repo}/commits?since=${since}`;
    const response = await fetch(url);
    const commits = await response.json();

    const dailyCounts = {};
    commits.forEach(commit => {
      const date = new Date(commit.commit.author.date).toISOString().split("T")[0];
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });

    const labels = Object.keys(dailyCounts).sort();
    const data = labels.map(label => dailyCounts[label]);
    const canvasId = `chart_${index}`;
    if (charts[canvasId]) charts[canvasId].destroy();

    charts[canvasId] = new Chart(document.getElementById(canvasId), {
      type: box.graph,
      data: {
        labels,
        datasets: [{
          label: 'Commits',
          data,
          borderColor: 'rgb(99, 102, 241)',
          backgroundColor: 'rgba(99, 102, 241, 0.3)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }

  function refreshBox(index) {
    loadCommits(index);
  }

  function showDeleteConfirm(index) {
    const confirmModal = document.createElement('div');
    confirmModal.className = "fixed inset-0 z-50 bg-black bg-opacity-60 flex justify-center items-center";
    confirmModal.innerHTML = `
      <div class="bg-gray-800 text-white p-6 rounded shadow-lg w-full max-w-sm text-center">
        <p class="mb-4 text-lg">Are you sure you want to delete this box?</p>
        <div class="flex justify-center gap-4">
          <button class="px-4 py-2 bg-gray-500 hover:bg-gray-600 rounded" id="cancelDelete">Cancel</button>
          <button class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded" id="confirmDelete">Delete</button>
        </div>
      </div>
    `;
    document.body.appendChild(confirmModal);
    document.getElementById('cancelDelete').onclick = () => confirmModal.remove();
    document.getElementById('confirmDelete').onclick = () => {
      config.boxes.splice(index, 1);
      localStorage.setItem('cm4git_config', JSON.stringify(config));
      confirmModal.remove();
      location.reload();
    };
  }

  function renderBox(index) {
    const box = config.boxes[index];
    const card = document.createElement('div');
    card.className = 'bg-gray-800 rounded-lg shadow p-4';
    const canvasId = `chart_${index}`;
    card.innerHTML = `
      <div class="flex justify-between items-center mb-2">
        <h2 class="text-lg font-semibold">${box.title}</h2>
        <div class="text-sm text-blue-400 space-x-2">
          <button class="edit-btn hover:underline" data-index="${index}">Edit</button>
          <button class="delete-btn hover:underline" data-index="${index}">Delete</button>
          <button class="refresh-btn hover:underline" data-index="${index}">Refresh</button>
        </div>
      </div>
      <canvas id="${canvasId}" class="mt-2"></canvas>
    `;
    dashboard.appendChild(card);

    card.querySelector('.edit-btn').addEventListener('click', () => openModal(index));
    card.querySelector('.delete-btn').addEventListener('click', () => showDeleteConfirm(index));
    card.querySelector('.refresh-btn').addEventListener('click', () => refreshBox(index));
  }

  function openModal(index = null) {
    editingIndex = index;
    const box = index !== null ? config.boxes[index] : {};
    document.getElementById('boxTitle').value = box?.title || "";
    document.getElementById('boxRepo').value = box?.repo || "";
    document.getElementById('boxRange').value = box?.range || "this_week";
    document.getElementById('boxCategory').value = box?.category || "commits";
    document.getElementById('boxGraph').value = box?.graph || "line";
    modal.classList.remove('hidden');
  }

  document.getElementById('cancelBtn').addEventListener('click', () => {
    modal.classList.add('hidden');
    editingIndex = null;
  });

  document.getElementById('saveBtn').addEventListener('click', () => {
    const newBox = {
      title: document.getElementById('boxTitle').value || "Untitled",
      repo: document.getElementById('boxRepo').value,
      category: document.getElementById('boxCategory').value,
      range: document.getElementById('boxRange').value,
      graph: document.getElementById('boxGraph').value
    };
    if (!newBox.repo) return alert("Repo is required");

    if (editingIndex !== null) {
      config.boxes[editingIndex] = newBox;
    } else {
      config.boxes.push(newBox);
    }

    localStorage.setItem('cm4git_config', JSON.stringify(config));
    modal.classList.add('hidden');
    const refreshIndex = editingIndex !== null ? editingIndex : config.boxes.length - 1;

    if (editingIndex !== null) {
      const oldCard = dashboard.children[refreshIndex];
      if (oldCard) dashboard.removeChild(oldCard);
      renderBox(refreshIndex);
    } else {
      renderBox(refreshIndex);
    }

    refreshBox(refreshIndex);
    editingIndex = null;
  });

  addBoxBtn.addEventListener('click', () => openModal());
  config.boxes.forEach((_, index) => renderBox(index));
});
