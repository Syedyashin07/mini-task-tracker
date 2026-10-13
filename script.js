const STORAGE_KEY = "taskflow.tasks";

const form = document.querySelector("#task-form");
const input = document.querySelector("#task-input");
const message = document.querySelector("#form-message");
const list = document.querySelector("#task-list");
const emptyState = document.querySelector("#empty-state");
const totalEl = document.querySelector("#stat-total");
const completedEl = document.querySelector("#stat-completed");
const pendingEl = document.querySelector("#stat-pending");
const liveStatus = document.querySelector("#live-status");

const checkIcon = `
  <svg viewBox="0 0 24 24" class="icon" aria-hidden="true">
    <path d="M6.5 12.2 10.2 16 17.5 8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"></path>
  </svg>
`;

const trashIcon = `
  <svg viewBox="0 0 24 24" class="icon" aria-hidden="true">
    <path d="M5 8h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
    <path d="M9 8V6.5A1.5 1.5 0 0 1 10.5 5h3A1.5 1.5 0 0 1 15 6.5V8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
    <path d="M7.5 8l.7 10.2a1.5 1.5 0 0 0 1.5 1.4h4.6a1.5 1.5 0 0 0 1.5-1.4L16.5 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"></path>
  </svg>
`;

let tasks = loadTasks();

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isTask).map((task) => ({
      id: String(task.id),
      text: task.text.trim(),
      completed: task.completed,
    }));
  } catch {
    return [];
  }
}

function isTask(value) {
  if (!value || typeof value !== "object") {
    return false;
  }

  const idIsValid = typeof value.id === "string" || typeof value.id === "number";
  return (
    idIsValid &&
    typeof value.text === "string" &&
    value.text.trim().length > 0 &&
    typeof value.completed === "boolean"
  );
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch {
    setMessage("This browser blocked saving, so tasks will last only for this visit.");
    return false;
  }
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function setMessage(text) {
  if (!text) {
    message.hidden = true;
    message.textContent = "";
    input.removeAttribute("aria-invalid");
    return;
  }

  message.hidden = false;
  message.textContent = text;
  input.setAttribute("aria-invalid", "true");
}

function announce(text) {
  liveStatus.textContent = "";
  window.setTimeout(() => {
    liveStatus.textContent = text;
  }, 20);
}

function updateSummary() {
  const completed = tasks.filter((task) => task.completed).length;
  const total = tasks.length;

  totalEl.textContent = String(total);
  completedEl.textContent = String(completed);
  pendingEl.textContent = String(total - completed);
  emptyState.hidden = total > 0;
}

function createTaskElement(task, isNew) {
  const item = document.createElement("li");
  item.className = task.completed ? "task task--done" : "task";
  if (isNew) {
    item.classList.add("task--new");
  }
  item.dataset.id = task.id;

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "task__toggle";
  toggle.setAttribute("aria-pressed", String(task.completed));
  toggle.setAttribute(
    "aria-label",
    `${task.completed ? "Mark as pending" : "Mark as completed"}: ${task.text}`
  );

  const check = document.createElement("span");
  check.className = "task__check";
  check.setAttribute("aria-hidden", "true");
  check.innerHTML = checkIcon;

  const text = document.createElement("p");
  text.className = "task__text";
  text.textContent = task.text;

  toggle.append(check, text);

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "task__delete";
  remove.setAttribute("aria-label", `Delete task: ${task.text}`);
  remove.innerHTML = trashIcon;

  item.append(toggle, remove);
  return item;
}

function render(newId) {
  list.replaceChildren(...tasks.map((task) => createTaskElement(task, task.id === newId)));
  updateSummary();
}

function addTask(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    setMessage("Enter a task before adding it.");
    input.focus();
    return;
  }

  tasks.unshift({
    id: createId(),
    text: trimmed,
    completed: false,
  });

  const saved = saveTasks();
  if (saved) {
    setMessage("");
  }
  input.value = "";
  render(tasks[0].id);
  announce(`Added task: ${trimmed}`);
  input.focus();
}

function toggleTask(id) {
  const task = tasks.find((item) => item.id === id);
  if (!task) {
    return;
  }

  task.completed = !task.completed;
  saveTasks();
  render();
  announce(task.completed ? `Completed task: ${task.text}` : `Marked as pending: ${task.text}`);
}

function deleteTask(id) {
  const task = tasks.find((item) => item.id === id);
  if (!task) {
    return;
  }

  tasks = tasks.filter((item) => item.id !== id);
  saveTasks();
  render();
  announce(`Deleted task: ${task.text}`);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  addTask(input.value);
});

input.addEventListener("input", () => {
  if (input.value.trim()) {
    setMessage("");
  }
});

list.addEventListener("click", (event) => {
  const item = event.target.closest(".task");
  if (!item) {
    return;
  }

  if (event.target.closest(".task__delete")) {
    deleteTask(item.dataset.id);
    return;
  }

  if (event.target.closest(".task__toggle")) {
    toggleTask(item.dataset.id);
  }
});

render();
