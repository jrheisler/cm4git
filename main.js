window.addEventListener('DOMContentLoaded', () => {

  const defaultBoxTemplates = [
    { title: "Avg PR Merge Time", category: "pr_merge_time", range: "this_week", graph: "line" },
    { title: "Avg Time to Close", category: "issue_resolution", range: "this_year", graph: "line" },
    { title: "Branch Activity", category: "branch_activity", range: "this_year", graph: "doughnut" },
    { title: "Branch Divergence", category: "branch_divergence", range: "this_year", graph: "bar" },
    { title: "Branches by Type", category: "branch_type_breakdown", range: "this_year", graph: "bar" },
    { title: "Code Churn (Files Changed)", category: "code_churn", range: "this_year", graph: "line" },
    { title: "Commits", category: "commits", range: "this_year", graph: "line" },
    { title: "Commits by Contributor", category: "contributors", range: "this_year", graph: "line" },
    { title: "Comments Over Time", category: "comments_over_time", range: "this_year", graph: "line" },
    { title: "Inactive Issues", category: "inactive_issues", range: "this_year", graph: "line" },
    { title: "Issues Over Time", category: "issues", range: "this_year", graph: "line" },
    { title: "Lead Time for Changes", category: "lead_time", range: "this_year", graph: "line" },
    { title: "Lines Added vs Deleted", category: "loc_change", range: "this_year", graph: "line" },
    { title: "Most Active Days", category: "most_active_days", range: "this_year", graph: "bar" },
    { title: "Most Changed Files", category: "most_changed_files", range: "this_year", graph: "bar" },
    { title: "New vs Closed Issues", category: "issue_compare", range: "this_year", graph: "bar" },
    { title: "Open vs Close PR", category: "pull_requests", range: "this_year", graph: "doughnut" },
    { title: "PR Rejection Rate", category: "pr_rejection_rate", range: "this_year", graph: "bar" },
    { title: "Release Frequency", category: "release_frequency", range: "last_year", graph: "bar" }
  ];
  
  const defaultConfig = { boxes: [] };
  let config = JSON.parse(localStorage.getItem('cm4git_config') || 'null');

  if (!config || !Array.isArray(config.boxes) || config.boxes.length === 0) {
    config = { boxes: defaultBoxTemplates };
    localStorage.setItem('cm4git_config', JSON.stringify(config));
  }
 
  let editingIndex = null;
  const dashboard = document.getElementById('dashboard');
  const charts = {};

  const addBoxBtn = document.createElement('button');
  addBoxBtn.id = "addBoxBtn";
  addBoxBtn.className = "mb-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded";
  addBoxBtn.textContent = "➕ Add Box";
  dashboard.parentNode.insertBefore(addBoxBtn, dashboard);

  const refreshAllBtn = document.createElement('button');
  refreshAllBtn.id = "refreshAllBtn";
  refreshAllBtn.className = "mb-4 ml-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded";
  refreshAllBtn.textContent = "🔁 Refresh All";
  dashboard.parentNode.insertBefore(refreshAllBtn, dashboard);
  refreshAllBtn.addEventListener('click', async () => {
    for (let i = 0; i < config.boxes.length; i++) {
      await refreshBox(i);
      await new Promise(resolve => setTimeout(resolve, 500)); // 0.5 second delay
    }
  });
  
  const importBtn = document.createElement('button');
  importBtn.id = "importBtn";
  importBtn.className = "mb-4 ml-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded";
  importBtn.textContent = "📥";
  importBtn.title = 'Import';
  
  const exportBtn = document.createElement('button');
  exportBtn.id = "exportBtn";
  exportBtn.className = "mb-4 ml-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded";
  exportBtn.textContent = "📤";
  exportBtn.title = 'Export';
  dashboard.parentNode.insertBefore(importBtn, dashboard);
  dashboard.parentNode.insertBefore(exportBtn, dashboard);

  const helpBtn = document.createElement('button');
  helpBtn.innerHTML = '❓';
  helpBtn.title = 'About this app';
  helpBtn.className = "mb-4 ml-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-full text-sm";
  helpBtn.onclick = () => document.getElementById('aboutModal').classList.remove('hidden');
  dashboard.parentNode.insertBefore(helpBtn, dashboard);

  document.getElementById('printBtn')?.addEventListener('click', printAboutContent);

  document.getElementById('exportBtn').addEventListener('click', () => {
    const exportData = JSON.stringify(config, null, 2);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
  
    const a = document.createElement('a');
    a.href = url;
    a.download = 'boxes.json';
    a.click();
  
    URL.revokeObjectURL(url);
  });
  document.getElementById('importBtn').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
  
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
  
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedConfig = JSON.parse(event.target.result);
  
          if (!importedConfig.boxes || !Array.isArray(importedConfig.boxes)) {
            alert("Invalid JSON format");
            return;
          }
  
          config = importedConfig;
          localStorage.setItem('cm4git_config', JSON.stringify(config));
  
          // Clear existing dashboard and reload boxes
          dashboard.innerHTML = "";
          config.boxes.forEach((_, index) => renderBox(index));
          config.boxes.forEach((_, index) => refreshBox(index));
          showToast("🎉 Boxes imported successfully!", "success");
        } catch (err) {
          alert("Failed to import JSON file.");
          console.error(err);
        }
      };
  
      reader.readAsText(file);
    };
  
    input.click();
  });
      

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
          <option value="this_year">This Year</option>
          <option value="last_year">Last Year</option>
        </select>
      </label>
      <label class="block mb-2 text-sm">Category
        <select id="boxCategory" class="w-full p-1 bg-gray-900 text-white border border-gray-700 rounded mt-1 text-sm">
          <option value="pr_merge_time">Avg PR Merge Time</option>  
          <option value="issue_resolution">Avg Time to Close Issues</option>
          <option value="branch_activity">Branch Activity</option>
          <option value="branch_divergence">Branch Divergence</option>
          <option value="branch_type_breakdown">Branches by Type</option>
          <option value="code_churn">Code Churn (Files Changed)</option>  
          <option value="comments_over_time">Comments Over Time</option>
          <option value="contributors">Commits by Contributor</option>
          <option value="commits">Commits</option>
          <option value="inactive_issues">Inactive Issues</option>
          <option value="issues">Issues Over Time</option>        
          <option value="lead_time">Lead Time for Changes</option>
          <option value="loc_change">Lines Added vs Deleted</option>                      
          <option value="most_active_days">Most Active Days</option>
          <option value="most_changed_files">Most Changed Files</option>
          <option value="issue_compare">New vs Closed Issues</option>
          <option value="pull_requests">Open vs Closed PRs</option> 
          <option value="pr_rejection_rate">PR Rejection Rate</option>         
          <option value="release_frequency">Release Frequency</option>          
        </select>
      </label>
      <label class="block mb-2 text-sm">
        <div class="flex justify-between items-center">
          <span>GitHub Token (optional)</span>
          <a href="https://github.com/settings/tokens" target="_blank" title="Generate a token"
            class="text-blue-400 hover:underline text-xs ml-2">(get token)</a>
        </div>
        <div class="relative mt-1">
          <input id="boxToken" type="text"
            class="w-full pr-20 p-1 bg-gray-900 text-white border border-gray-700 rounded text-sm"
          />
          <button type="button" id="toggleToken"
            class="absolute right-12 top-0 h-full px-2 text-xs text-gray-400 hover:text-white">Hide</button>
          <button type="button" id="copyToken"
            class="absolute right-0 top-0 h-full px-2 text-xs text-gray-400 hover:text-white">Copy</button>
        </div>
      </label>
      <label class="block mb-4 text-sm">Graph Type
        <select id="boxGraph" class="w-full p-1 bg-gray-900 text-white border border-gray-700 rounded mt-1 text-sm">
          <option value="line" selected>Line</option>
          <option value="bar">Bar</option>
          <option value="doughnut">Doughnut</option>
          <option value="pie">Pie</option>
        </select>
      </label>
      <div class="flex justify-end gap-2">
        <button id="cancelBtn" class="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm">Cancel</button>
        <button id="saveBtn" class="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm">Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  async function loadMostChangedFiles(index) {
    const box = config.boxes[index];
    const since = getSinceDate(box.range);
    const headers = box.token ? { Authorization: `token ${box.token}` } : {};
    const url = `https://api.github.com/repos/${box.repo}/commits?since=${since}&per_page=100`;
  
    const response = await fetch(url, { headers });
    const commits = await response.json();
  
    if (!Array.isArray(commits)) {
      console.error("GitHub API returned error:", commits);
      return;
    }
  
    const fileChanges = {};
  
    for (const commit of commits) {
      const detailResp = await fetch(commit.url, { headers });
      const detail = await detailResp.json();
  
      detail.files?.forEach(file => {
        const filename = file.filename;
        fileChanges[filename] = (fileChanges[filename] || 0) + 1;
      });
    }
  
    const sortedFiles = Object.entries(fileChanges)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // top 10
  
    const labels = sortedFiles.map(entry => entry[0]);
    const data = sortedFiles.map(entry => entry[1]);
  
    const canvasId = `chart_${index}`;
    if (charts[canvasId]) charts[canvasId].destroy();
  
    charts[canvasId] = new Chart(document.getElementById(canvasId), {
      type: box.graph,
      data: {
        labels,
        datasets: [{
          label: 'Times Changed',
          data,
          backgroundColor: 'rgba(239, 68, 68, 0.3)', // red-500
          borderColor: '#ef4444',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Changes"
            }
          }
        }
      }
    });
  }

  async function loadBranchDivergence(index) {
    const box = config.boxes[index];
    const headers = box.token ? { Authorization: `token ${box.token}` } : {};
    const branchesUrl = `https://api.github.com/repos/${box.repo}/branches`;
  
    const branchResp = await fetch(branchesUrl, { headers });
    const branches = await branchResp.json();
  
    if (!Array.isArray(branches)) {
      console.error("GitHub API error:", branches);
      return;
    }
  
    const mainBranch = "main"; // could be configurable later
    const divergenceData = [];
  
    for (const branch of branches) {
      if (branch.name === mainBranch) continue;
  
      try {
        const compareUrl = `https://api.github.com/repos/${box.repo}/compare/${mainBranch}...${branch.name}`;
        const compareResp = await fetch(compareUrl, { headers });
        const compare = await compareResp.json();
  
        if (compare.ahead_by != null && compare.behind_by != null) {
          divergenceData.push({
            branch: branch.name,
            ahead: compare.ahead_by,
            behind: compare.behind_by
          });
        }
      } catch (err) {
        console.warn(`Could not compare ${branch.name} with ${mainBranch}`, err);
      }
    }
  
    const labels = divergenceData.map(d => d.branch);
    const aheadData = divergenceData.map(d => d.ahead);
    const behindData = divergenceData.map(d => d.behind);
  
    const canvasId = `chart_${index}`;
    if (charts[canvasId]) charts[canvasId].destroy();
  
    charts[canvasId] = new Chart(document.getElementById(canvasId), {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Commits Ahead",
            data: aheadData,
            backgroundColor: "#60a5fa" // Tailwind blue-400
          },
          {
            label: "Commits Behind",
            data: behindData,
            backgroundColor: "#f87171" // Tailwind red-400
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                const label = ctx.dataset.label || "";
                return `${label}: ${ctx.raw} commits`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: "Commit Count" }
          }
        }
      }
    });
  }
  

// Add to your existing JS file, near your other loaders
async function loadBranchActivity(index) {
  const box = config.boxes[index];
  const headers = box.token ? { Authorization: `token ${box.token}` } : {};
  const url = `https://api.github.com/repos/${box.repo}/branches?per_page=100`;

  const response = await fetch(url, { headers });
  const branches = await response.json();
  if (!Array.isArray(branches)) {
    console.error("Unexpected branch list response:", branches);
    return;
  }

  const staleThreshold = new Date();
  staleThreshold.setDate(staleThreshold.getDate() - 30);

  let activeCount = 0;
  let staleCount = 0;
  const branchDetails = [];

  for (const branch of branches) {
    const branchResp = await fetch(branch.commit.url, { headers });
    const branchData = await branchResp.json();

    const commitDate = new Date(branchData.commit.committer.date);
    const isStale = commitDate < staleThreshold;

    if (isStale) staleCount++;
    else activeCount++;

    // PR Status lookup
    const prUrl = `https://api.github.com/repos/${box.repo}/pulls?head=${box.repo.split("/")[0]}:${branch.name}`;
    const prResp = await fetch(prUrl, { headers });
    const prData = await prResp.json();
    let prStatus = "None";
    if (Array.isArray(prData) && prData.length > 0) {
      prStatus = prData[0].state === "open" ? "Open" : "Merged";
    }

    // Compare to main branch
    const compareUrl = `https://api.github.com/repos/${box.repo}/compare/main...${branch.name}`;
    const compareResp = await fetch(compareUrl, { headers });
    const compareData = await compareResp.json();

    branchDetails.push({
      name: branch.name,
      lastCommit: commitDate.toISOString().split("T")[0],
      prStatus,
      ahead: compareData.ahead_by || 0,
      behind: compareData.behind_by || 0,
      author: branchData.commit.committer.name
    });
  }

  const canvasId = `chart_${index}`;
  if (charts[canvasId]) charts[canvasId].destroy();

  charts[canvasId] = new Chart(document.getElementById(canvasId), {
    type: box.graph || "bar",
    data: {
      labels: ["Active", "Stale"],
      datasets: [{
        label: "Branches",
        data: [activeCount, staleCount],
        backgroundColor: ["#34d399", "#f87171"]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });

  // Inject detail table
  const card = dashboard.children[index];
  let detailsEl = card.querySelector(".branch-details");
  if (!detailsEl) {
    detailsEl = document.createElement("div");
    detailsEl.className = "branch-details mt-4 text-sm overflow-x-auto text-white";
    card.appendChild(detailsEl);
  }

  detailsEl.innerHTML = `
  <details class="mt-2">
    <summary class="cursor-pointer text-purple-400 hover:underline mb-2">🔍 View Details</summary>
    <div class="overflow-x-auto max-w-full mt-2">
      <table class="min-w-[600px] text-left text-sm border border-gray-700">
        <thead>
          <tr class="bg-gray-700">
            <th class="p-2">Branch</th>
            <th class="p-2">Last Commit</th>
            <th class="p-2">PR Status</th>
            <th class="p-2">Ahead/Behind</th>
            <th class="p-2">Author</th>
          </tr>
        </thead>
        <tbody>
          ${branchDetails.map(b => `
            <tr class="border-t border-gray-600">
              <td class="p-2">${b.name}</td>
              <td class="p-2">${b.lastCommit}</td>
              <td class="p-2">${b.prStatus}</td>
              <td class="p-2">+${b.ahead} / -${b.behind}</td>
              <td class="p-2">${b.author}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </details>
`;

}


  
  async function loadLocChange(index) {
    const box = config.boxes[index];
    const since = getSinceDate(box.range);
    const headers = box.token ? { Authorization: `token ${box.token}` } : {};
    const url = `https://api.github.com/repos/${box.repo}/commits?since=${since}&per_page=100`;
  
    const response = await fetch(url, { headers });
    const commits = await response.json();
  
    if (!Array.isArray(commits)) {
      console.error("GitHub API returned error:", commits);
      return;
    }
  
    const dailyAdded = {};
    const dailyDeleted = {};
  
    for (const commit of commits) {
      const detailResp = await fetch(commit.url, { headers });
      const detail = await detailResp.json();
      const date = new Date(detail.commit.author.date).toISOString().split("T")[0];
  
      let additions = 0;
      let deletions = 0;
      detail.files?.forEach(file => {
        additions += file.additions || 0;
        deletions += file.deletions || 0;
      });
  
      dailyAdded[date] = (dailyAdded[date] || 0) + additions;
      dailyDeleted[date] = (dailyDeleted[date] || 0) + deletions;
    }
  
    const labels = Array.from(new Set([...Object.keys(dailyAdded), ...Object.keys(dailyDeleted)])).sort();
    const addedData = labels.map(date => dailyAdded[date] || 0);
    const deletedData = labels.map(date => dailyDeleted[date] || 0);
  
    const canvasId = `chart_${index}`;
    if (charts[canvasId]) charts[canvasId].destroy();
  
    charts[canvasId] = new Chart(document.getElementById(canvasId), {
      type: box.graph, // bar, line, etc.
      data: {
        labels,
        datasets: [
          {
            label: 'Lines Added',
            data: addedData,
            backgroundColor: 'rgba(34, 197, 94, 0.4)', // green
            borderColor: '#22c55e',
            borderWidth: 1,
            fill: box.graph === "line"
          },
          {
            label: 'Lines Deleted',
            data: deletedData,
            backgroundColor: 'rgba(239, 68, 68, 0.4)', // red
            borderColor: '#ef4444',
            borderWidth: 1,
            fill: box.graph === "line"
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Lines of Code"
            }
          }
        }
      }
    });
  }
  
  async function loadPRRejectionRate(index) {
    const box = config.boxes[index];
    const since = getSinceDate(box.range);
    const headers = box.token ? { Authorization: `token ${box.token}` } : {};
    const url = `https://api.github.com/repos/${box.repo}/pulls?state=closed&sort=updated&direction=desc&per_page=100`;
  
    const response = await fetch(url, { headers });
    const pullRequests = await response.json();
  
    if (!Array.isArray(pullRequests)) {
      console.error("GitHub API returned error:", pullRequests);
      return;
    }
  
    const daily = {};
  
    pullRequests.forEach(pr => {
      if (!pr.closed_at) return;
  
      const closedDate = new Date(pr.closed_at).toISOString().split("T")[0];
      const wasMerged = !!pr.merged_at;
  
      if (!daily[closedDate]) {
        daily[closedDate] = { merged: 0, rejected: 0 };
      }
  
      if (wasMerged) {
        daily[closedDate].merged += 1;
      } else {
        daily[closedDate].rejected += 1;
      }
    });
  
    const labels = Object.keys(daily).sort();
    const data = labels.map(date => {
      const { merged, rejected } = daily[date];
      const total = merged + rejected;
      if (total === 0) return 0;
      return parseFloat(((rejected / total) * 100).toFixed(2));
    });
  
    const canvasId = `chart_${index}`;
    if (charts[canvasId]) charts[canvasId].destroy();
  
    charts[canvasId] = new Chart(document.getElementById(canvasId), {
      type: box.graph,
      data: {
        labels,
        datasets: [{
          label: 'PR Rejection Rate (%)',
          data,
          borderColor: '#ef4444', // red-500
          backgroundColor: 'rgba(239, 68, 68, 0.3)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: "Rejection Rate (%)"
            }
          }
        }
      }
    });
  }
  
  async function loadMostActiveDays(index) {
    const box = config.boxes[index];
    const since = getSinceDate(box.range);
    const headers = box.token ? { Authorization: `token ${box.token}` } : {};
    const url = `https://api.github.com/repos/${box.repo}/commits?since=${since}&per_page=100`;
  
    const response = await fetch(url, { headers });
    const commits = await response.json();
  
    if (!Array.isArray(commits)) {
      console.error("GitHub API returned error:", commits);
      return;
    }
  
    const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dailyCounts = [0, 0, 0, 0, 0, 0, 0];
  
    commits.forEach(commit => {
      const day = new Date(commit.commit.author.date).getDay(); // 0 = Sunday
      dailyCounts[day]++;
    });
  
    const canvasId = `chart_${index}`;
    if (charts[canvasId]) charts[canvasId].destroy();
  
    charts[canvasId] = new Chart(document.getElementById(canvasId), {
      type: box.graph,
      data: {
        labels: dayLabels,
        datasets: [{
          label: 'Commits per Day of Week',
          data: dailyCounts,
          backgroundColor: 'rgba(251, 191, 36, 0.3)', // amber-400
          borderColor: '#fbbf24',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Commits"
            }
          }
        }
      }
    });
  }
  

  async function loadCodeChurn(index) {
    const box = config.boxes[index];
    const since = getSinceDate(box.range);
    const headers = box.token ? { Authorization: `token ${box.token}` } : {};
    const url = `https://api.github.com/repos/${box.repo}/commits?since=${since}&per_page=100`;
  
    const response = await fetch(url, { headers });
    const commits = await response.json();
  
    if (!Array.isArray(commits)) {
      console.error("GitHub API returned error:", commits);
      return;
    }
  
    const dailyChanges = {};
  
    for (const commit of commits) {
      const detailResp = await fetch(commit.url, { headers });
      const detail = await detailResp.json();
  
      const date = new Date(detail.commit.author.date).toISOString().split("T")[0];
      const filesChanged = detail.files?.length || 0;
  
      dailyChanges[date] = (dailyChanges[date] || 0) + filesChanged;
    }
  
    const labels = Object.keys(dailyChanges).sort();
    const data = labels.map(date => dailyChanges[date]);
    const canvasId = `chart_${index}`;
    if (charts[canvasId]) charts[canvasId].destroy();
  
    charts[canvasId] = new Chart(document.getElementById(canvasId), {
      type: box.graph,
      data: {
        labels,
        datasets: [{
          label: 'Files Changed',
          data,
          borderColor: '#34d399', // Tailwind green-400
          backgroundColor: 'rgba(52, 211, 153, 0.3)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Files Changed"
            }
          }
        }
      }
    });
  }
  
  
  async function loadCommentsOverTime(index) {    
    const box = config.boxes[index];
    const headers = box.token ? { Authorization: `token ${box.token}` } : {};
    const since = getSinceDate(box.range);
    const issuesUrl = `https://api.github.com/repos/${box.repo}/issues?state=all&since=${since}&per_page=100`;
    const response = await fetch(issuesUrl, { headers });
    const issues = await response.json();
  
    if (!Array.isArray(issues)) {
      console.error("GitHub API returned error:", issues);
      return;
    }
  
    const dailyComments = {};
  
    issues.forEach(issue => {
      const createdAt = new Date(issue.created_at).toISOString().split("T")[0];
      const comments = issue.comments || 0;
  
      if (!dailyComments[createdAt]) {
        dailyComments[createdAt] = 0;
      }
      dailyComments[createdAt] += comments;
    });
  
    const labels = Object.keys(dailyComments).sort();
    const data = labels.map(date => dailyComments[date]);
  
    const canvasId = `chart_${index}`;
    if (charts[canvasId]) charts[canvasId].destroy();
  
    charts[canvasId] = new Chart(document.getElementById(canvasId), {
      type: box.graph,
      data: {
        labels,
        datasets: [{
          label: 'Comments on Issues & PRs',
          data,
          borderColor: '#e879f9', // Tailwind fuchsia-400
          backgroundColor: 'rgba(232, 121, 249, 0.3)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Comments"
            }
          }
        }
      }
    });
  }
  
  async function loadPRMergeTime(index) {    
    const box = config.boxes[index];
    const headers = box.token ? { Authorization: `token ${box.token}` } : {};
    const since = getSinceDate(box.range);
    const url = `https://api.github.com/repos/${box.repo}/pulls?state=closed&sort=updated&direction=desc&per_page=100`;
  
    const response = await fetch(url, { headers });
    const pulls = await response.json();
  
    if (!Array.isArray(pulls)) {
      console.error("GitHub API returned error:", pulls);
      return;
    }
  
    const mergeDurations = {};
  
    pulls.forEach(pr => {
      if (!pr.merged_at) return; // only include merged PRs
      const mergedDate = new Date(pr.merged_at);
      const createdDate = new Date(pr.created_at);
  
      const mergeDay = mergedDate.toISOString().split("T")[0];
      const daysOpen = (mergedDate - createdDate) / (1000 * 60 * 60 * 24); // in days
  
      if (!mergeDurations[mergeDay]) {
        mergeDurations[mergeDay] = [];
      }
  
      mergeDurations[mergeDay].push(daysOpen);
    });
  
    const labels = Object.keys(mergeDurations).sort();
    const data = labels.map(date => {
      const durations = mergeDurations[date];
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      return parseFloat(avg.toFixed(2));
    });
  
    const canvasId = `chart_${index}`;
    if (charts[canvasId]) charts[canvasId].destroy();
  
    charts[canvasId] = new Chart(document.getElementById(canvasId), {
      type: box.graph,
      data: {
        labels,
        datasets: [{
          label: 'Avg Time to Merge PRs (Days)',
          data,
          borderColor: '#34d399', // Tailwind green-400
          backgroundColor: 'rgba(52, 211, 153, 0.3)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Avg Days to Merge"
            }
          }
        }
      }
    });
  }
  
  function getSinceDate(range) {
    const now = new Date();
    let since = new Date();
  
    if (range === "today") {
      since.setHours(0, 0, 0, 0);
    } else if (range === "this_week") {
      since.setDate(now.getDate() - 7);
    } else if (range === "this_month") {
      since.setMonth(now.getMonth() - 1);
    } else if (range === "this_year") {
      since = new Date(now.getFullYear(), 0, 1); // January 1st of current year
    } else if (range === "last_year") {
      since = new Date(now.getFullYear() - 1, 0, 1); // January 1st of last year
    }
  
    return since.toISOString();
  }
  
  async function loadIssueCompare(index) {    
    const box = config.boxes[index];
    const headers = box.token ? { Authorization: `token ${box.token}` } : {};
    const since = getSinceDate(box.range);
    const url = `https://api.github.com/repos/${box.repo}/issues?state=all&since=${since}&per_page=100`;
 
    const response = await fetch(url, { headers });
    const issues = await response.json();
  
    if (!Array.isArray(issues)) {
      console.error("GitHub API returned error:", issues);
      return;
    }
  
    const openedCounts = {};
    const closedCounts = {};
  
    issues.forEach(issue => {
      if (issue.pull_request) return; // skip PRs
  
      const createdDate = new Date(issue.created_at).toISOString().split("T")[0];
      openedCounts[createdDate] = (openedCounts[createdDate] || 0) + 1;
  
      if (issue.closed_at) {
        const closedDate = new Date(issue.closed_at).toISOString().split("T")[0];
        closedCounts[closedDate] = (closedCounts[closedDate] || 0) + 1;
      }
    });
  
    const allDates = new Set([
      ...Object.keys(openedCounts),
      ...Object.keys(closedCounts),
    ]);
    const sortedDates = Array.from(allDates).sort();
  
    const openData = sortedDates.map(date => openedCounts[date] || 0);
    const closedData = sortedDates.map(date => closedCounts[date] || 0);
  
    const canvasId = `chart_${index}`;
    if (charts[canvasId]) charts[canvasId].destroy();
  
    charts[canvasId] = new Chart(document.getElementById(canvasId), {
      type: box.graph,
      data: {
        labels: sortedDates,
        datasets: [
          {
            label: 'Issues Opened',
            data: openData,
            borderColor: '#60a5fa', // Tailwind blue-400
            backgroundColor: 'rgba(96, 165, 250, 0.2)',
            fill: true,
            tension: 0.3
          },
          {
            label: 'Issues Closed',
            data: closedData,
            borderColor: '#f472b6', // Tailwind pink-400
            backgroundColor: 'rgba(244, 114, 182, 0.2)',
            fill: true,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Issues"
            }
          }
        }
      }
    });
  }
  
  async function loadIssueResolution(index) {    
    const box = config.boxes[index];
    const headers = box.token ? { Authorization: `token ${box.token}` } : {};
    const since = getSinceDate(box.range);
    const url = `https://api.github.com/repos/${box.repo}/issues?state=closed&since=${since}&per_page=100`;
    
    const response = await fetch(url, { headers });
    const issues = await response.json();
  
    if (!Array.isArray(issues)) {
      console.error("GitHub API returned error:", issues);
      return;
    }
  
    // Filter out pull requests
    const filteredIssues = issues.filter(issue => !issue.pull_request);
  
    const dailyDurations = {};
  
    filteredIssues.forEach(issue => {
      if (!issue.closed_at) return;
  
      const created = new Date(issue.created_at);
      const closed = new Date(issue.closed_at);
      const daysToClose = (closed - created) / (1000 * 60 * 60 * 24); // in days
      const closedDateStr = closed.toISOString().split("T")[0];
  
      if (!dailyDurations[closedDateStr]) {
        dailyDurations[closedDateStr] = [];
      }
      dailyDurations[closedDateStr].push(daysToClose);
    });
  
    const labels = Object.keys(dailyDurations).sort();
    const data = labels.map(date =>
      dailyDurations[date].reduce((a, b) => a + b, 0) / dailyDurations[date].length
    );
  
    const canvasId = `chart_${index}`;
    if (charts[canvasId]) charts[canvasId].destroy();
  
    charts[canvasId] = new Chart(document.getElementById(canvasId), {
      type: box.graph,
      data: {
        labels,
        datasets: [{
          label: 'Avg Days to Close Issue',
          data,
          borderColor: '#34d399', // Tailwind green-400
          backgroundColor: 'rgba(52, 211, 153, 0.3)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Days"
            }
          }
        }
      }
    });
  }
  
  async function loadIssues(index) {    
    const box = config.boxes[index];
    const headers = box.token ? { Authorization: `token ${box.token}` } : {};
    const since = getSinceDate(box.range);
    const url = `https://api.github.com/repos/${box.repo}/issues?state=all&since=${since}&per_page=100`;
 
    const response = await fetch(url, { headers });
    const issues = await response.json();
  
    if (!Array.isArray(issues)) {
      console.error("GitHub API returned error:", issues);
      return;
    }
  
    // Filter out pull requests (issues with a pull_request field)
    const filteredIssues = issues.filter(issue => !issue.pull_request);
  
    const dailyCounts = {};
    filteredIssues.forEach(issue => {
      const date = new Date(issue.created_at).toISOString().split("T")[0];
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
          label: 'Issues',
          data,
          borderColor: '#facc15',
          backgroundColor: 'rgba(250, 204, 21, 0.3)',
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
  
  async function loadPullRequests(index) {    
    const box = config.boxes[index];
    const headers = box.token ? { Authorization: `token ${box.token}` } : {};
    const baseUrl = `https://api.github.com/repos/${box.repo}/pulls?per_page=100`;
    const openUrl = `${baseUrl}&state=open`;
    const closedUrl = `${baseUrl}&state=closed`;
  
    const [openRes, closedRes] = await Promise.all([
      fetch(openUrl, { headers }),
      fetch(closedUrl, { headers })
    ]);
    
  
    const openPRs = await openRes.json();
    const closedPRs = await closedRes.json();
  
    if (!Array.isArray(openPRs) || !Array.isArray(closedPRs)) {
      console.error("Error fetching PR data:", openPRs, closedPRs);
      return;
    }
  
    const labels = ["Open", "Closed"];
    const data = [openPRs.length, closedPRs.length];
    const canvasId = `chart_${index}`;
  
    if (charts[canvasId]) charts[canvasId].destroy();
  
    charts[canvasId] = new Chart(document.getElementById(canvasId), {
      type: box.graph === "bar" ? "bar" : "doughnut", // default to doughnut for this KPI
      data: {
        labels,
        datasets: [{
          label: 'Pull Requests',
          data,
          backgroundColor: ['#60a5fa', '#f87171'],
          borderColor: ['#3b82f6', '#ef4444'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }
  
  async function loadContributors(index) {
    const box = config.boxes[index];
    const headers = box.token ? { Authorization: `token ${box.token}` } : {};
    const url = `https://api.github.com/repos/${box.repo}/stats/contributors`;
  
    let contributors = null;
    let attempts = 0;
    const maxAttempts = 5;
  
    while (attempts < maxAttempts) {
      const response = await fetch(url, { headers });
      const data = await response.json();
  
      if (Array.isArray(data)) {
        contributors = data;
        break;
      }
  
      attempts++;
      await new Promise(res => setTimeout(res, 2000)); // wait 2 seconds before retry
    }
  
    if (!contributors) {
      console.error("Contributor stats not ready after retries");
      showToast("❌ Contributor data not available yet. Try again later.", "error");
      return;
    }
  
    const labels = contributors.map(c => c.author.login);
    const data = contributors.map(c => c.total);
    const canvasId = `chart_${index}`;
    
    if (charts[canvasId]) charts[canvasId].destroy();
  
    charts[canvasId] = new Chart(document.getElementById(canvasId), {
      type: box.graph,
      data: {
        labels,
        datasets: [{
          label: 'Commits',
          data,
          backgroundColor: 'rgba(99, 102, 241, 0.7)',
          borderColor: 'rgb(99, 102, 241)',
          borderWidth: 1
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
  
  
  async function loadCommits(index) {
    const box = config.boxes[index];
    const headers = box.token ? { Authorization: `token ${box.token}` } : {};
    const since = getSinceDate(box.range);
    const url = `https://api.github.com/repos/${box.repo}/commits?since=${since}`;
    const response = await fetch(url, { headers });
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
  async function loadReleaseFrequency(index) {    
    const box = config.boxes[index];
    const headers = box.token ? { Authorization: `token ${box.token}` } : {};
    const since = getSinceDate(box.range);
    const url = `https://api.github.com/repos/${box.repo}/releases?per_page=100`;
  
    const response = await fetch(url, { headers });
    const releases = await response.json();
  
    if (!Array.isArray(releases)) {
      console.error("GitHub API returned error:", releases);
      return;
    }
  
    const filtered = releases.filter(release => new Date(release.published_at) >= new Date(since));
  
    const dailyCounts = {};
    filtered.forEach(release => {
      const date = new Date(release.published_at).toISOString().split("T")[0];
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
          label: 'Releases',
          data,
          borderColor: '#60a5fa', // Tailwind blue-400
          backgroundColor: 'rgba(96, 165, 250, 0.3)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Release Count"
            }
          }
        }
      }
    });
  }
  
  async function loadLeadTimeForChanges(index) {
    const box = config.boxes[index];
    const since = getSinceDate(box.range);
    const headers = box.token ? { Authorization: `token ${box.token}` } : {};
    const prsUrl = `https://api.github.com/repos/${box.repo}/pulls?state=closed&sort=updated&direction=desc&per_page=100`;
  
    const response = await fetch(prsUrl, { headers });
    const pullRequests = await response.json();
  
    if (!Array.isArray(pullRequests)) {
      console.error("GitHub API returned error:", pullRequests);
      return;
    }
  
    const leadTimes = {};
  
    for (const pr of pullRequests) {
      if (!pr.merged_at) continue; // skip unmerged PRs
  
      const prDetailRes = await fetch(pr.url, { headers });
      const prDetail = await prDetailRes.json();
  
      const baseCommitUrl = prDetail.commits_url;
      const commitsRes = await fetch(baseCommitUrl, { headers });
      const commits = await commitsRes.json();
  
      if (!Array.isArray(commits) || commits.length === 0) continue;
  
      const firstCommitDate = new Date(commits[0].commit.author.date);
      const mergeDate = new Date(pr.merged_at);
      const leadTime = (mergeDate - firstCommitDate) / (1000 * 60 * 60 * 24); // in days
      const mergeDay = mergeDate.toISOString().split("T")[0];
  
      if (!leadTimes[mergeDay]) {
        leadTimes[mergeDay] = [];
      }
      leadTimes[mergeDay].push(leadTime);
    }
  
    const labels = Object.keys(leadTimes).sort();
    const data = labels.map(date =>
      parseFloat((leadTimes[date].reduce((a, b) => a + b, 0) / leadTimes[date].length).toFixed(2))
    );
  
    const canvasId = `chart_${index}`;
    if (charts[canvasId]) charts[canvasId].destroy();
  
    charts[canvasId] = new Chart(document.getElementById(canvasId), {
      type: box.graph,
      data: {
        labels,
        datasets: [{
          label: 'Lead Time for Changes (Days)',
          data,
          borderColor: '#f59e0b', // amber-500
          backgroundColor: 'rgba(245, 158, 11, 0.3)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Days"
            }
          }
        }
      }
    });
  }
  
  async function loadInactiveIssues(index) {
    const box = config.boxes[index];
    const since = getSinceDate(box.range);
    const headers = box.token ? { Authorization: `token ${box.token}` } : {};
    const url = `https://api.github.com/repos/${box.repo}/issues?state=open&since=${since}&per_page=100`;
  
    const response = await fetch(url, { headers });
    const issues = await response.json();
  
    if (!Array.isArray(issues)) {
      console.error("GitHub API returned error:", issues);
      return;
    }
  
    // Filter out PRs
    const filtered = issues.filter(issue => !issue.pull_request);
  
    const dailyInactiveCounts = {};
    const now = new Date();
    const inactivityThresholdDays = 14;
  
    filtered.forEach(issue => {
      const lastUpdated = new Date(issue.updated_at);
      const daysInactive = (now - lastUpdated) / (1000 * 60 * 60 * 24);
      if (daysInactive >= inactivityThresholdDays) {
        const created = new Date(issue.created_at).toISOString().split("T")[0];
        dailyInactiveCounts[created] = (dailyInactiveCounts[created] || 0) + 1;
      }
    });
  
    const labels = Object.keys(dailyInactiveCounts).sort();
    const data = labels.map(date => dailyInactiveCounts[date]);
    const canvasId = `chart_${index}`;
    if (charts[canvasId]) charts[canvasId].destroy();
  
    charts[canvasId] = new Chart(document.getElementById(canvasId), {
      type: box.graph,
      data: {
        labels,
        datasets: [{
          label: `Inactive Issues (≥${inactivityThresholdDays} days)`,
          data,
          borderColor: '#f59e0b', // amber-500
          backgroundColor: 'rgba(245, 158, 11, 0.3)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Inactive Issues"
            }
          }
        }
      }
    });
  }
  async function loadBranchTypeBreakdown(index) {
    const box = config.boxes[index];
    const headers = box.token ? { Authorization: `token ${box.token}` } : {};
    const url = `https://api.github.com/repos/${box.repo}/branches?per_page=100`;
  
    const response = await fetch(url, { headers });
    const branches = await response.json();
  
    if (!Array.isArray(branches)) {
      console.error("GitHub API error:", branches);
      return;
    }
  
    const typeCounts = {
      feature: 0,
      bugfix: 0,
      hotfix: 0,
      release: 0,
      test: 0,
      chore: 0,
      other: 0
    };
  
    for (const branch of branches) {
      const name = branch.name.toLowerCase();
      if (name.startsWith("feature/")) typeCounts.feature++;
      else if (name.startsWith("bugfix/")) typeCounts.bugfix++;
      else if (name.startsWith("hotfix/")) typeCounts.hotfix++;
      else if (name.startsWith("release/")) typeCounts.release++;
      else if (name.startsWith("test/")) typeCounts.test++;
      else if (name.startsWith("chore/")) typeCounts.chore++;
      else typeCounts.other++;
    }
  
    const labels = Object.keys(typeCounts);
    const data = labels.map(type => typeCounts[type]);
  
    const canvasId = `chart_${index}`;
    if (charts[canvasId]) charts[canvasId].destroy();
  
    charts[canvasId] = new Chart(document.getElementById(canvasId), {
      type: box.graph === "doughnut" ? "doughnut" : "bar",
      data: {
        labels,
        datasets: [{
          label: "Branch Count",
          data,
          backgroundColor: [
            "#34d399", "#f59e0b", "#ef4444", "#6366f1",
            "#10b981", "#eab308", "#9ca3af"
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: box.graph === "doughnut" ? "bottom" : "top" },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.label}: ${ctx.raw} branches`
            }
          }
        },
        scales: box.graph === "bar" ? {
          y: {
            beginAtZero: true,
            title: { display: true, text: "Branch Count" }
          }
        } : {}
      }
    });
  }
    
  async function refreshBox(index) {
    showSpinner(index, true);
    const box = config.boxes[index];
  
    try {
      if (box.category === "issues") {
        await loadIssues(index);
      } else if (box.category === "commits") {
        await loadCommits(index);
      } else if (box.category === "contributors") {
        await loadContributors(index);
      } else if (box.category === "pull_requests") {
        await loadPullRequests(index);
      } else if (box.category === "issue_resolution") {
        await loadIssueResolution(index);
      } else if (box.category === "issue_compare") {
        await loadIssueCompare(index);
      } else if (box.category === "pr_merge_time") {
        await loadPRMergeTime(index);
      } else if (box.category === "comments_over_time") {
        await loadCommentsOverTime(index);
      } else if (box.category === "release_frequency") {
        await loadReleaseFrequency(index);
      } else if (box.category === "code_churn") {
        await loadCodeChurn(index);
      } else if (box.category === "most_active_days") {
        await loadMostActiveDays(index);
      } else if (box.category === "most_changed_files") {
        await loadMostChangedFiles(index);
      } else if (box.category === "lead_time") {
        await loadLeadTimeForChanges(index);
      } else if (box.category === "pr_rejection_rate") {
        await loadPRRejectionRate(index);
      } else if (box.category === "inactive_issues") {
        await loadInactiveIssues(index);
      } else if (box.category === "loc_change") {
        await loadLocChange(index);
      } else if (box.category === "branch_activity") {
        await loadBranchActivity(index);
      } else if (box.category === "branch_divergence") {
        await loadBranchDivergence(index);
      } else if (box.category === "branch_type_breakdown") {
        await loadBranchTypeBreakdown(index);
      }                                       
    } catch (err) {
      console.error("Error loading box:", err);
    }
  
    showSpinner(index, false);
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

  function renderBox(index, card = null) {
    const box = config.boxes[index];
    const boxId = `${box.repo}_${box.category}_${index}`;
  
    if (!card) {
      card = document.createElement('div');
      card.dataset.boxId = boxId;
      dashboard.appendChild(card);
    } else {
      card.dataset.boxId = boxId; // In case it's being reused
    }
  
    card.className = 'bg-gray-800 rounded-lg shadow p-4 relative';
    const canvasId = `chart_${index}`;
    card.innerHTML = `
      <div class="flex justify-between items-center mb-2">
        <div class="flex items-center space-x-2">
          <span class="drag-handle cursor-move text-gray-400">⠿</span>
          <h2 class="text-lg font-semibold">${box.title}</h2>
        </div>
        <div class="text-sm text-blue-400 space-x-2">
          <button class="edit-btn hover:underline" data-index="${index}">Edit</button>
          <button class="delete-btn hover:underline" data-index="${index}">Delete</button>
          <button class="refresh-btn hover:underline" data-index="${index}">Refresh</button>
        </div>
      </div>
      <div class="loading-indicator hidden absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-60 z-10">
        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-purple-500"></div>
      </div>
      <canvas id="${canvasId}" class="mt-2 z-0"></canvas>
    `;
  
    card.querySelector('.edit-btn').addEventListener('click', () => openModal(index));
    card.querySelector('.delete-btn').addEventListener('click', () => showDeleteConfirm(index));
    card.querySelector('.refresh-btn').addEventListener('click', () => refreshBox(index));
  }
  
  function setupSortable() {
    Sortable.create(dashboard, {
      animation: 150,
      handle: '.drag-handle',
      onEnd: () => {
        const newOrder = Array.from(dashboard.children).map(card => {
          const id = card.dataset.boxId;
          return config.boxes.find(b =>
            `${b.repo}_${b.category}_${config.boxes.indexOf(b)}` === id
          );
        }).filter(Boolean);
  
        config.boxes = newOrder;
        localStorage.setItem('cm4git_config', JSON.stringify(config));
      }
    });
  }
  
  
  function showSpinner(index, show) {
    const card = dashboard.children[index];
    const spinner = card.querySelector('.loading-indicator');
    if (spinner) spinner.classList.toggle('hidden', !show);
  }
  

  function openModal(index = null) {
    editingIndex = index;
    const box = index !== null ? config.boxes[index] : {};
    
    document.getElementById('boxTitle').value = box?.title || "";
    document.getElementById('boxRepo').value = box?.repo || "";        // ✅ Ensure this is here
    document.getElementById('boxRange').value = box?.range || "this_week";
    document.getElementById('boxCategory').value = box?.category || "commits";
    document.getElementById('boxGraph').value = box?.graph || "line";
    document.getElementById('boxToken').value = box?.token || "";      // ✅ And this
    
    modal.classList.remove('hidden');
  
    document.getElementById('toggleToken').onclick = () => {
      const input = document.getElementById('boxToken');
      const btn = document.getElementById('toggleToken');
      const isText = input.type === 'text';
      input.type = isText ? 'password' : 'text';
      btn.textContent = isText ? 'Show' : 'Hide';
    };
  
    document.getElementById('copyToken').onclick = () => {
      const input = document.getElementById('boxToken');
      navigator.clipboard.writeText(input.value)
        .then(() => {
          const btn = document.getElementById('copyToken');
          btn.textContent = 'Copied!';
          setTimeout(() => btn.textContent = 'Copy', 1500);
        });
    };
  }
  

  document.getElementById('cancelBtn').addEventListener('click', () => {
    modal.classList.add('hidden');
    editingIndex = null;
  });

  document.getElementById('saveBtn').addEventListener('click', () => {
    const newBox = {
      title: document.getElementById('boxTitle').value || "Untitled",
      repo: document.getElementById('boxRepo').value.trim(),
      category: document.getElementById('boxCategory').value,
      range: document.getElementById('boxRange').value,
      graph: document.getElementById('boxGraph').value,
      token: document.getElementById('boxToken')?.value.trim() || ''
    };
  
    if (!newBox.repo) return alert("Repo is required");
  
    const refreshIndex = editingIndex !== null ? editingIndex : config.boxes.length;
  
    // ✅ Save the box to config BEFORE rendering
    if (editingIndex !== null) {
      config.boxes[editingIndex] = newBox;
    } else {
      config.boxes.push(newBox);
    }
  
    localStorage.setItem('cm4git_config', JSON.stringify(config));
    modal.classList.add('hidden');
  
    // ✅ Then render the updated version
    if (editingIndex !== null) {
      const newCard = document.createElement('div');
      renderBox(refreshIndex, newCard);
      dashboard.replaceChild(newCard, dashboard.children[refreshIndex]);
    } else {
      renderBox(refreshIndex);
    }
  
    refreshBox(refreshIndex);
    editingIndex = null;
  });
    
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    const colors = {
      success: 'bg-green-600',
      error: 'bg-red-600',
      info: 'bg-blue-600'
    };
  
    toast.className = `
      ${colors[type] || colors.info}
      text-white px-4 py-2 rounded shadow-lg animate-fade-in-out transition-opacity duration-500 opacity-0
    `;
    toast.textContent = message;
  
    document.getElementById('toast-container').appendChild(toast);
  
    // Trigger fade-in
    requestAnimationFrame(() => toast.classList.add('opacity-100'));
  
    // Remove after 3 seconds
    setTimeout(() => {
      toast.classList.remove('opacity-100');
      toast.classList.add('opacity-0');
      setTimeout(() => toast.remove(), 500);
    }, 3000);
  }
  
  window.printAboutContent = function () {
    const content = document.querySelector('#aboutModal > div').innerHTML;
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>About CM4Git</title>
          <style>
            body { font-family: sans-serif; padding: 20px; background: white; color: black; }
            h2, h3 { color: #6d28d9; }
            ul, ol { margin-left: 20px; }
            code { background: #eee; padding: 2px 4px; border-radius: 4px; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }
  
  

  addBoxBtn.addEventListener('click', () => openModal());
  config.boxes.forEach((_, index) => renderBox(index));
  setupSortable();
  const toastContainer = document.createElement('div');
  toastContainer.id = 'toast-container';
  toastContainer.className = 'fixed top-4 right-4 z-50 space-y-2';
  document.body.appendChild(toastContainer);

});