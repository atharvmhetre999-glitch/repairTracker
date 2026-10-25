// ---------- Settings ----------
const STORAGE_KEY = "repairtrack_records";
const STATUSES = ["Received", "Diagnosing", "Repairing", "Ready for Pickup"];

// ---------- localStorage helpers ----------

// Read all repair records from localStorage (returns an array)
function getRecords() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

// Save the full array of repair records to localStorage
function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// Return a date string (YYYY-MM-DD) that is "days" away from today
function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// Add three sample records the first time the website is opened
function loadSampleData() {
  if (localStorage.getItem(STORAGE_KEY) !== null) return; // already has data

  saveRecords([
    { id: "RT-1001", customer: "Aarav Sharma", device: "iPhone 12", repairDate: dateOffset(-5), eta: dateOffset(2), status: "Repairing" },
    { id: "RT-1002", customer: "Priya Patil", device: "Dell Inspiron Laptop", repairDate: dateOffset(-2), eta: dateOffset(5), status: "Diagnosing" },
    { id: "RT-1003", customer: "Rohan Mehta", device: "Samsung Galaxy S21", repairDate: dateOffset(-8), eta: dateOffset(-1), status: "Ready for Pickup" }
  ]);
}

// Create a unique Repair ID like "RT-1004" (highest existing number + 1)
function generateRepairId() {
  const numbers = getRecords().map(r => parseInt(r.id.replace("RT-", ""), 10) || 0);
  const next = numbers.length ? Math.max(...numbers) + 1 : 1001;
  return "RT-" + next;
}

// Escape text so user input can't break the page HTML
function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ---------- Page navigation ----------

// Show one page section and highlight its nav link
function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("active", p.id === pageId));
  document.querySelectorAll(".nav-link").forEach(l => l.classList.toggle("active", l.dataset.page === pageId));
  window.scrollTo(0, 0);
  if (pageId === "admin") renderTable();
}

// Any link or button with a data-page attribute switches pages
document.querySelectorAll("[data-page]").forEach(el => {
  el.addEventListener("click", e => {
    e.preventDefault();
    showPage(el.dataset.page);
  });
});

// ---------- Track Repair page ----------

// Look up the Repair ID and show the saved record (or an error)
function trackRepair(e) {
  e.preventDefault();
  const idInput = document.getElementById("track-id").value.trim().toUpperCase();
  const errorBox = document.getElementById("track-error");
  const resultBox = document.getElementById("track-result");

  const record = getRecords().find(r => r.id.toUpperCase() === idInput);

  if (!record) {
    resultBox.classList.add("hidden");
    errorBox.textContent = "Repair ID \"" + idInput + "\" was not found. Check the ID and try again.";
    errorBox.classList.remove("hidden");
    return;
  }

  errorBox.classList.add("hidden");
  document.getElementById("res-device").textContent = record.device;
  document.getElementById("res-customer").textContent = record.customer;
  document.getElementById("res-id").textContent = record.id;
  document.getElementById("res-date").textContent = record.repairDate;
  document.getElementById("res-eta").textContent = record.eta;
  document.getElementById("res-status").textContent = record.status;
  renderTimeline(record.status);
  resultBox.classList.remove("hidden");
}

// Draw the progress timeline: steps up to the current status are marked
function renderTimeline(currentStatus) {
  const currentIndex = STATUSES.indexOf(currentStatus);
  document.getElementById("timeline").innerHTML = STATUSES.map((step, i) => {
    let cls = "";
    if (i < currentIndex) cls = "done";
    if (i === currentIndex) cls = "done current";
    return '<li class="' + cls + '">' + step + "</li>";
  }).join("");
}

document.getElementById("track-form").addEventListener("submit", trackRepair);

// ---------- Admin page ----------

// Fill the status dropdown in the add form
function fillStatusDropdown() {
  document.getElementById("f-status").innerHTML =
    STATUSES.map(s => '<option value="' + s + '">' + s + "</option>").join("");
}

// Reset the form and show a fresh auto-generated Repair ID
function resetForm() {
  document.getElementById("repair-form").reset();
  document.getElementById("f-id").value = generateRepairId();
  document.getElementById("f-date").value = dateOffset(0);
}

// Add a new repair record from the form and save it
function addRepair(e) {
  e.preventDefault();
  const errorBox = document.getElementById("admin-error");
  const repairDate = document.getElementById("f-date").value;
  const eta = document.getElementById("f-eta").value;

  if (eta < repairDate) {
    errorBox.textContent = "Expected completion date cannot be before the repair date.";
    errorBox.classList.remove("hidden");
    return;
  }
  errorBox.classList.add("hidden");

  const records = getRecords();
  records.push({
    id: generateRepairId(), // generated again at save time so it is always unique
    customer: document.getElementById("f-customer").value.trim(),
    device: document.getElementById("f-device").value.trim(),
    repairDate: repairDate,
    eta: eta,
    status: document.getElementById("f-status").value
  });
  saveRecords(records);

  resetForm();
  renderTable();
}

// Show every saved record in the table
function renderTable() {
  const body = document.getElementById("records-body");
  const records = getRecords();

  if (records.length === 0) {
    body.innerHTML = '<tr><td colspan="7" class="empty">No repair records yet. Add one above.</td></tr>';
    return;
  }

  body.innerHTML = records.map(r => {
    const options = STATUSES.map(s =>
      '<option value="' + s + '"' + (s === r.status ? " selected" : "") + ">" + s + "</option>"
    ).join("");

    return "<tr>" +
      "<td>" + escapeHTML(r.id) + "</td>" +
      "<td>" + escapeHTML(r.customer) + "</td>" +
      "<td>" + escapeHTML(r.device) + "</td>" +
      "<td>" + r.repairDate + "</td>" +
      "<td>" + r.eta + "</td>" +
      '<td><select class="status-select" data-id="' + escapeHTML(r.id) + '">' + options + "</select></td>" +
      '<td><button class="btn-danger delete-btn" data-id="' + escapeHTML(r.id) + '">Delete</button></td>' +
      "</tr>";
  }).join("");
}

// Change the status of one record and save it
function updateStatus(id, newStatus) {
  const records = getRecords();
  const record = records.find(r => r.id === id);
  if (record) {
    record.status = newStatus;
    saveRecords(records);
  }
}

// Remove one record (after confirmation) and save the rest
function deleteRepair(id) {
  if (!confirm("Delete repair record " + id + "?")) return;
  saveRecords(getRecords().filter(r => r.id !== id));
  renderTable();
  resetForm(); // the freed-up ID may be reused
}

// One listener on the table handles all status changes and delete clicks
const tableBody = document.getElementById("records-body");
tableBody.addEventListener("change", e => {
  if (e.target.classList.contains("status-select")) {
    updateStatus(e.target.dataset.id, e.target.value);
  }
});
tableBody.addEventListener("click", e => {
  if (e.target.classList.contains("delete-btn")) {
    deleteRepair(e.target.dataset.id);
  }
});

document.getElementById("repair-form").addEventListener("submit", addRepair);

// ---------- Start the app ----------
loadSampleData();
fillStatusDropdown();
resetForm();
renderTable();
