// --- Default Configuration (Pasted by User) ---
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAk1kC8_sBQ-gtnR2V7nP2nExdiYRQkjUA",
  authDomain: "data-todo-967e7.firebaseapp.com",
  projectId: "data-todo-967e7",
  storageBucket: "data-todo-967e7.firebasestorage.app",
  messagingSenderId: "900628117461",
  appId: "1:900628117461:web:dad9e9d771cc506391ef5c",
  measurementId: "G-WS31EF96NN"
};

// --- App State ---
const state = {
    tasks: [],
    currentView: 'kanban', // 'kanban' or 'list'
    filters: {
        search: '',
        priority: 'all',
        category: 'all'
    },
    firebaseConfig: null,
    isOnline: false,
    onlineStatusMessage: 'Initializing...'
};

// --- DOM elements ---
const elements = {
    // Buttons & Header
    syncStatusBtn: document.getElementById('syncStatusBtn'),
    statusDot: document.getElementById('statusDot'),
    statusText: document.getElementById('statusText'),
    themeToggle: document.getElementById('themeToggle'),
    addTaskBtn: document.getElementById('addTaskBtn'),
    
    // Stats
    statTotal: document.getElementById('stat-total'),
    statTodo: document.getElementById('stat-todo'),
    statProgress: document.getElementById('stat-progress'),
    statCompleted: document.getElementById('stat-completed'),
    statOverdue: document.getElementById('stat-overdue'),
    
    // Progress Bars
    progressTodo: document.getElementById('progress-todo'),
    progressInprogress: document.getElementById('progress-inprogress'),
    progressCompleted: document.getElementById('progress-completed'),
    progressOverdue: document.getElementById('progress-overdue'),
    
    // Controls
    searchInput: document.getElementById('searchInput'),
    filterPriority: document.getElementById('filterPriority'),
    filterCategory: document.getElementById('filterCategory'),
    viewKanbanBtn: document.getElementById('viewKanbanBtn'),
    viewListBtn: document.getElementById('viewListBtn'),
    
    // View containers
    kanbanView: document.getElementById('kanbanView'),
    listView: document.getElementById('listView'),
    
    // Kanban lists
    listTodo: document.getElementById('list-todo'),
    listInprogress: document.getElementById('list-inprogress'),
    listCompleted: document.getElementById('list-completed'),
    
    // List container
    listItemsWrapper: document.getElementById('listItemsWrapper'),
    
    // Modals
    taskModal: document.getElementById('taskModal'),
    syncModal: document.getElementById('syncModal'),
    
    // Task Form
    taskForm: document.getElementById('taskForm'),
    taskId: document.getElementById('taskId'),
    taskTitle: document.getElementById('taskTitle'),
    taskDesc: document.getElementById('taskDesc'),
    taskCategory: document.getElementById('taskCategory'),
    taskPriority: document.getElementById('taskPriority'),
    taskDate: document.getElementById('taskDate'),
    taskDeadline: document.getElementById('taskDeadline'),
    taskStatus: document.getElementById('taskStatus'),
    cancelTaskBtn: document.getElementById('cancelTaskBtn'),
    closeTaskModalBtn: document.getElementById('closeTaskModalBtn'),
    
    // Sync Form
    closeSyncModalBtn: document.getElementById('closeSyncModalBtn'),
    modalSyncStatus: document.getElementById('modalSyncStatus'),
    firebaseConfigForm: document.getElementById('firebaseConfigForm'),
    cfgApiKey: document.getElementById('cfgApiKey'),
    cfgProjectId: document.getElementById('cfgProjectId'),
    cfgAuthDomain: document.getElementById('cfgAuthDomain'),
    cfgStorageBucket: document.getElementById('cfgStorageBucket'),
    cfgAppId: document.getElementById('cfgAppId'),
    resetToDefaultConfig: document.getElementById('resetToDefaultConfig')
};

// --- Firebase Global variables ---
let fbApp = null;
let fbDb = null;
let fbUnsubscribe = null;

// --- Initialize Application ---
document.addEventListener('DOMContentLoaded', () => {
    // Load config from LocalStorage or use Default
    const savedConfig = localStorage.getItem('custom_firebase_config');
    if (savedConfig) {
        try {
            state.firebaseConfig = JSON.parse(savedConfig);
        } catch (e) {
            state.firebaseConfig = DEFAULT_FIREBASE_CONFIG;
        }
    } else {
        state.firebaseConfig = DEFAULT_FIREBASE_CONFIG;
    }
    
    // Setup form inputs with today's dates
    resetTaskFormDates();
    
    // Bind Event Listeners
    setupEventListeners();
    
    // Init Firebase/Firestore
    connectFirebase(state.firebaseConfig);
    
    // Initialize Lucide Icons
    lucide.createIcons();
});

// --- Firebase Connection Operations (v8 compat) ---
function connectFirebase(config) {
    if (fbUnsubscribe) {
        fbUnsubscribe();
        fbUnsubscribe = null;
    }

    setOnlineStatus(false, "Connecting...", "offline");

    try {
        if (!config || !config.apiKey) {
            throw new Error("Invalid Configuration");
        }
        
        // Clean up previous app installations to avoid conflicts
        if (firebase.apps.length > 0) {
            Promise.all(firebase.apps.map(app => app.delete()))
                .then(() => initializeAndListen(config))
                .catch(err => {
                    console.error("Error deleting previous firebase instances:", err);
                    initializeAndListen(config);
                });
        } else {
            initializeAndListen(config);
        }
        
    } catch (error) {
        console.error("Firebase connection error:", error);
        setOnlineStatus(false, "Offline / Local Mode", "error");
        loadLocalBackup();
    }
}

function initializeAndListen(config) {
    try {
        fbApp = firebase.initializeApp(config);
        fbDb = firebase.firestore();
        
        // Listen to Collection in real-time
        fbUnsubscribe = fbDb.collection("tasks").onSnapshot((snapshot) => {
            const dbTasks = [];
            snapshot.forEach((doc) => {
                dbTasks.push({ id: doc.id, ...doc.data() });
            });
            state.tasks = dbTasks;
            saveLocalBackup(state.tasks);
            setOnlineStatus(true, "Cloud Connected", "online");
            render();
        }, (error) => {
            console.error("Firestore sync error:", error);
            setOnlineStatus(false, "Cloud Error / Offline Mode", "error");
            loadLocalBackup();
        });
        
    } catch (e) {
        console.error("Firebase initialization failed:", e);
        setOnlineStatus(false, "Offline / Local Mode", "error");
        loadLocalBackup();
    }
}

function setOnlineStatus(online, message, cssClass) {
    state.isOnline = online;
    state.onlineStatusMessage = message;
    
    // Update header badge
    elements.statusText.textContent = message;
    elements.statusDot.className = `status-dot ${cssClass}`;
    
    // Update sync modal status
    elements.modalSyncStatus.textContent = message;
    elements.modalSyncStatus.className = `status-text ${cssClass}`;
}

// Save tasks to LocalStorage for backup/offline support
function saveLocalBackup(tasks) {
    localStorage.setItem('local_tasks_backup', JSON.stringify(tasks));
}

// Load tasks from LocalStorage if firebase is offline
function loadLocalBackup() {
    const backup = localStorage.getItem('local_tasks_backup');
    if (backup) {
        try {
            state.tasks = JSON.parse(backup);
        } catch (e) {
            state.tasks = [];
        }
    } else {
        state.tasks = [];
    }
    render();
}

// --- CRUD Operations ---
async function saveTask(taskData) {
    const isNew = !taskData.id;
    const taskId = taskData.id || 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const task = {
        id: taskId,
        title: taskData.title,
        description: taskData.description || '',
        category: taskData.category || 'work',
        priority: taskData.priority || 'medium',
        status: taskData.status || 'todo',
        createdAt: taskData.createdAt || new Date().toISOString().split('T')[0],
        deadline: taskData.deadline
    };

    if (state.isOnline && fbDb) {
        try {
            // Write directly to firestore (onSnapshot will handle state update & rendering)
            await fbDb.collection("tasks").doc(taskId).set(task);
        } catch (e) {
            console.error("Failed to write to firestore, updating locally:", e);
            saveTaskLocally(task);
        }
    } else {
        saveTaskLocally(task);
    }
}

function saveTaskLocally(task) {
    const idx = state.tasks.findIndex(t => t.id === task.id);
    if (idx >= 0) {
        state.tasks[idx] = task;
    } else {
        state.tasks.push(task);
    }
    saveLocalBackup(state.tasks);
    render();
}

async function deleteTask(taskId) {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบงานนี้?')) {
        if (state.isOnline && fbDb) {
            try {
                await fbDb.collection("tasks").doc(taskId).delete();
            } catch (e) {
                console.error("Failed to delete from firestore, deleting locally:", e);
                deleteTaskLocally(taskId);
            }
        } else {
            deleteTaskLocally(taskId);
        }
    }
}

function deleteTaskLocally(taskId) {
    state.tasks = state.tasks.filter(t => t.id !== taskId);
    saveLocalBackup(state.tasks);
    render();
}

async function updateTaskStatus(taskId, newStatus) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    // If setting status, copy it and make update
    const updatedTask = { ...task, status: newStatus };
    
    if (state.isOnline && fbDb) {
        try {
            await fbDb.collection("tasks").doc(taskId).set(updatedTask);
        } catch (e) {
            console.error("Failed to update status in firestore:", e);
            saveTaskLocally(updatedTask);
        }
    } else {
        saveTaskLocally(updatedTask);
    }
}

// --- Date Utils ---
function resetTaskFormDates() {
    const today = new Date().toISOString().split('T')[0];
    elements.taskDate.value = today;
    
    // Default deadline to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    elements.taskDeadline.value = tomorrow.toISOString().split('T')[0];
}

// --- Render Logic ---
function render() {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // 1. Calculate Stats
    let total = state.tasks.length;
    let todo = 0;
    let progress = 0;
    let completed = 0;
    let overdue = 0;
    
    state.tasks.forEach(t => {
        if (t.status === 'completed') {
            completed++;
        } else {
            if (t.status === 'todo') todo++;
            else if (t.status === 'inprogress') progress++;
            
            // Check if deadline has passed
            if (t.deadline && t.deadline < todayStr) {
                overdue++;
            }
        }
    });
    
    // Update Stats Display
    elements.statTotal.textContent = total;
    elements.statTodo.textContent = todo;
    elements.statProgress.textContent = progress;
    elements.statCompleted.textContent = completed;
    elements.statOverdue.textContent = overdue;
    
    // Update Progress Bars
    elements.progressTodo.style.width = total > 0 ? `${(todo / total) * 100}%` : '0%';
    elements.progressInprogress.style.width = total > 0 ? `${(progress / total) * 100}%` : '0%';
    elements.progressCompleted.style.width = total > 0 ? `${(completed / total) * 100}%` : '0%';
    elements.progressOverdue.style.width = total > 0 ? `${(overdue / total) * 100}%` : '0%';
    
    // Apply filters to tasks
    const filteredTasks = state.tasks.filter(t => {
        // Search Filter
        const matchesSearch = t.title.toLowerCase().includes(state.filters.search.toLowerCase()) || 
                             t.description.toLowerCase().includes(state.filters.search.toLowerCase());
        
        // Priority Filter
        const matchesPriority = state.filters.priority === 'all' || t.priority === state.filters.priority;
        
        // Category Filter
        const matchesCategory = state.filters.category === 'all' || t.category === state.filters.category;
        
        return matchesSearch && matchesPriority && matchesCategory;
    });
    
    // Sort tasks: high priority first, then closer deadlines
    filteredTasks.sort((a, b) => {
        // Sort completed tasks to the bottom
        if (a.status === 'completed' && b.status !== 'completed') return 1;
        if (a.status !== 'completed' && b.status === 'completed') return -1;
        
        // Sort by deadline
        if (a.deadline && b.deadline) {
            return a.deadline.localeCompare(b.deadline);
        }
        return 0;
    });

    if (state.currentView === 'kanban') {
        elements.kanbanView.classList.remove('hidden');
        elements.listView.classList.add('hidden');
        renderKanban(filteredTasks, todayStr);
    } else {
        elements.kanbanView.classList.add('hidden');
        elements.listView.classList.remove('hidden');
        renderList(filteredTasks, todayStr);
    }
    
    // Re-bind Lucide Icons for dynamic content
    lucide.createIcons();
}

function renderKanban(filteredTasks, todayStr) {
    // Clear lists
    elements.listTodo.innerHTML = '';
    elements.listInprogress.innerHTML = '';
    elements.listCompleted.innerHTML = '';
    
    let todoCount = 0;
    let progressCount = 0;
    let completedCount = 0;
    
    filteredTasks.forEach(task => {
        const card = createTaskCard(task, todayStr);
        
        if (task.status === 'todo') {
            elements.listTodo.appendChild(card);
            todoCount++;
        } else if (task.status === 'inprogress') {
            elements.listInprogress.appendChild(card);
            progressCount++;
        } else if (task.status === 'completed') {
            elements.listCompleted.appendChild(card);
            completedCount++;
        }
    });
    
    // Update badges
    document.getElementById('count-todo').textContent = todoCount;
    document.getElementById('count-inprogress').textContent = progressCount;
    document.getElementById('count-completed').textContent = completedCount;
}

function createTaskCard(task, todayStr) {
    const card = document.createElement('div');
    card.className = `task-card glass glass-hover priority-${task.priority}`;
    card.setAttribute('draggable', 'true');
    card.dataset.id = task.id;
    
    // Deadline urgency logic
    let deadlineClass = '';
    let deadlineText = task.deadline;
    
    if (task.status !== 'completed') {
        if (task.deadline < todayStr) {
            deadlineClass = 'overdue';
            deadlineText = `เลยกำหนด (${task.deadline})`;
        } else if (task.deadline === todayStr) {
            deadlineClass = 'urgent';
            deadlineText = 'กำหนดส่งวันนี้!';
        }
    }
    
    const categoryNames = { work: 'Work', personal: 'Personal', study: 'Study', others: 'Others' };
    
    card.innerHTML = `
        <div class="task-card-header">
            <h4 class="task-title">${escapeHTML(task.title)}</h4>
            <div class="task-actions">
                <button class="btn-card-action btn-edit" title="แก้ไขงาน">
                    <i data-lucide="edit-2"></i>
                </button>
                <button class="btn-card-action btn-delete" title="ลบงาน">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        </div>
        <div class="task-card-body">
            <p>${escapeHTML(task.description) || '<span class="text-muted">ไม่มีรายละเอียด</span>'}</p>
        </div>
        <div class="task-tags">
            <span class="tag tag-${task.category}">${categoryNames[task.category] || task.category}</span>
            <span class="tag tag-priority ${task.priority}">${task.priority.toUpperCase()}</span>
        </div>
        <div class="task-card-footer">
            <div class="task-due-date ${deadlineClass}">
                <i data-lucide="calendar"></i>
                <span>${deadlineText}</span>
            </div>
            <div class="task-status-control">
                ${task.status === 'todo' ? `
                    <button class="task-status-btn" data-action="inprogress" title="เริ่มงาน">
                        <i data-lucide="play"></i><span>เริ่มทำ</span>
                    </button>
                ` : task.status === 'inprogress' ? `
                    <button class="task-status-btn" data-action="completed" title="เสร็จงาน">
                        <i data-lucide="check"></i><span>เสร็จ</span>
                    </button>
                ` : `
                    <button class="task-status-btn" data-action="todo" title="ทำใหม่">
                        <i data-lucide="rotate-ccw"></i><span>ทำใหม่</span>
                    </button>
                `}
            </div>
        </div>
    `;
    
    // Card Event Listeners
    card.querySelector('.btn-edit').addEventListener('click', (e) => {
        e.stopPropagation();
        openTaskModal(task);
    });
    
    card.querySelector('.btn-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTask(task.id);
    });
    
    const statusBtn = card.querySelector('.task-status-btn');
    if (statusBtn) {
        statusBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = statusBtn.dataset.action;
            updateTaskStatus(task.id, action);
        });
    }
    
    // Drag and drop event listeners
    card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', task.id);
        card.classList.add('dragging');
    });
    
    card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
    });
    
    return card;
}

function renderList(filteredTasks, todayStr) {
    elements.listItemsWrapper.innerHTML = '';
    
    if (filteredTasks.length === 0) {
        elements.listItemsWrapper.innerHTML = `
            <div class="list-row" style="grid-template-columns: 1fr; text-align: center; padding: 40px; color: var(--text-muted);">
                ไม่มีงานตามตัวกรองที่กำหนด
            </div>
        `;
        return;
    }
    
    const categoryNames = { work: 'Work', personal: 'Personal', study: 'Study', others: 'Others' };
    const priorityNames = { high: 'สูง (High)', medium: 'กลาง (Medium)', low: 'ต่ำ (Low)' };
    
    filteredTasks.forEach(task => {
        const row = document.createElement('div');
        row.className = 'list-row';
        
        let deadlineClass = '';
        let deadlineText = task.deadline;
        let statusBadgeClass = `status-${task.status}`;
        let statusText = task.status === 'todo' ? 'To Do' : task.status === 'inprogress' ? 'In Progress' : 'Completed';
        
        if (task.status !== 'completed') {
            if (task.deadline < todayStr) {
                deadlineClass = 'overdue';
                deadlineText = `เลยกำหนด (${task.deadline})`;
                statusBadgeClass = 'status-overdue';
                statusText = 'Overdue';
            } else if (task.deadline === todayStr) {
                deadlineClass = 'urgent';
                deadlineText = 'ส่งวันนี้!';
            }
        }
        
        row.innerHTML = `
            <div class="list-row-title-info">
                <span class="list-row-title">${escapeHTML(task.title)}</span>
                <span class="list-row-desc">${escapeHTML(task.description) || 'ไม่มีรายละเอียด'}</span>
            </div>
            <div class="list-row-category-cell">
                <span class="tag tag-${task.category}">${categoryNames[task.category] || task.category}</span>
            </div>
            <div class="list-row-priority-cell">
                <span class="tag tag-priority ${task.priority}">${priorityNames[task.priority]}</span>
            </div>
            <div class="list-row-date">${task.createdAt}</div>
            <div class="list-row-deadline ${deadlineClass}">${deadlineText}</div>
            <div>
                <span class="status-badge ${statusBadgeClass}">${statusText}</span>
            </div>
            <div class="list-row-actions">
                <button class="btn-card-action btn-edit" title="แก้ไขงาน">
                    <i data-lucide="edit-2"></i>
                </button>
                <button class="btn-card-action btn-delete" title="ลบงาน">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        `;
        
        row.querySelector('.btn-edit').addEventListener('click', () => openTaskModal(task));
        row.querySelector('.btn-delete').addEventListener('click', () => deleteTask(task.id));
        
        elements.listItemsWrapper.appendChild(row);
    });
}

// --- Event Listeners and Modals Bindings ---
function setupEventListeners() {
    // 1. Task Modal Controls
    elements.addTaskBtn.addEventListener('click', () => openTaskModal());
    elements.cancelTaskBtn.addEventListener('click', closeTaskModal);
    elements.closeTaskModalBtn.addEventListener('click', closeTaskModal);
    
    // 2. Task Submit Form
    elements.taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const taskData = {
            id: elements.taskId.value || null,
            title: elements.taskTitle.value,
            description: elements.taskDesc.value,
            category: elements.taskCategory.value,
            priority: elements.taskPriority.value,
            createdAt: elements.taskDate.value,
            deadline: elements.taskDeadline.value,
            status: elements.taskStatus.value
        };
        
        saveTask(taskData);
        closeTaskModal();
    });
    
    // 3. View Switcher
    elements.viewKanbanBtn.addEventListener('click', () => {
        state.currentView = 'kanban';
        elements.viewKanbanBtn.classList.add('active');
        elements.viewListBtn.classList.remove('active');
        render();
    });
    
    elements.viewListBtn.addEventListener('click', () => {
        state.currentView = 'list';
        elements.viewListBtn.classList.add('active');
        elements.viewKanbanBtn.classList.remove('active');
        render();
    });
    
    // 4. Searching & Filtering
    elements.searchInput.addEventListener('input', (e) => {
        state.filters.search = e.target.value;
        render();
    });
    
    elements.filterPriority.addEventListener('change', (e) => {
        state.filters.priority = e.target.value;
        render();
    });
    
    elements.filterCategory.addEventListener('change', (e) => {
        state.filters.category = e.target.value;
        render();
    });
    
    // 5. Cloud Settings Modal
    elements.syncStatusBtn.addEventListener('click', openSyncModal);
    elements.closeSyncModalBtn.addEventListener('click', closeSyncModal);
    
    // 6. Config Submit Form
    elements.firebaseConfigForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const config = {
            apiKey: elements.cfgApiKey.value.trim(),
            projectId: elements.cfgProjectId.value.trim(),
            authDomain: elements.cfgAuthDomain.value.trim(),
            storageBucket: elements.cfgStorageBucket.value.trim(),
            appId: elements.cfgAppId.value.trim(),
            measurementId: DEFAULT_FIREBASE_CONFIG.measurementId
        };
        
        if (!config.apiKey || !config.projectId) {
            alert('กรุณากรอกข้อมูล API Key และ Project ID เป็นอย่างต่ำ');
            return;
        }
        
        state.firebaseConfig = config;
        localStorage.setItem('custom_firebase_config', JSON.stringify(config));
        
        // Reconnect Firebase
        connectFirebase(config);
        closeSyncModal();
    });
    
    elements.resetToDefaultConfig.addEventListener('click', () => {
        if (confirm('คุณต้องการรีเซ็ตการเชื่อมต่อกลับสู่ฐานข้อมูลเริ่มต้นระบบหรือไม่?')) {
            localStorage.removeItem('custom_firebase_config');
            state.firebaseConfig = DEFAULT_FIREBASE_CONFIG;
            connectFirebase(DEFAULT_FIREBASE_CONFIG);
            closeSyncModal();
        }
    });

    // Close Modals on Outer Click
    window.addEventListener('click', (e) => {
        if (e.target === elements.taskModal) closeTaskModal();
        if (e.target === elements.syncModal) closeSyncModal();
    });
    
    // 7. Drag & Drop target configuration
    const kanbanColumnsList = [
        { el: elements.listTodo, status: 'todo' },
        { el: elements.listInprogress, status: 'inprogress' },
        { el: elements.listCompleted, status: 'completed' }
    ];
    
    kanbanColumnsList.forEach(({ el, status }) => {
        el.dataset.status = status;
        
        el.addEventListener('dragover', (e) => {
            e.preventDefault();
            el.classList.add('drag-over');
        });
        
        el.addEventListener('dragleave', () => {
            el.classList.remove('drag-over');
        });
        
        el.addEventListener('drop', (e) => {
            e.preventDefault();
            el.classList.remove('drag-over');
            const taskId = e.dataTransfer.getData('text/plain');
            updateTaskStatus(taskId, status);
        });
    });
}

// --- Modal Helper Functions ---
function openTaskModal(task = null) {
    elements.taskForm.reset();
    resetTaskFormDates();
    
    if (task) {
        elements.modalTitle.textContent = 'แก้ไขรายละเอียดงาน';
        elements.taskId.value = task.id;
        elements.taskTitle.value = task.title;
        elements.taskDesc.value = task.description;
        elements.taskCategory.value = task.category;
        elements.taskPriority.value = task.priority;
        elements.taskDate.value = task.createdAt;
        elements.taskDeadline.value = task.deadline;
        elements.taskStatus.value = task.status;
    } else {
        elements.modalTitle.textContent = 'สร้างงานใหม่';
        elements.taskId.value = '';
    }
    
    elements.taskModal.classList.add('active');
}

function closeTaskModal() {
    elements.taskModal.classList.remove('active');
}

// --- Sync Modal Helpers ---
function openSyncModal() {
    // Fill in form placeholders or values with current config
    const cfg = state.firebaseConfig || {};
    elements.cfgApiKey.value = cfg.apiKey || '';
    elements.cfgProjectId.value = cfg.projectId || '';
    elements.cfgAuthDomain.value = cfg.authDomain || '';
    elements.cfgStorageBucket.value = cfg.storageBucket || '';
    elements.cfgAppId.value = cfg.appId || '';
    
    elements.syncModal.classList.add('active');
}

function closeSyncModal() {
    elements.syncModal.classList.remove('active');
}

// --- Safety HTML Escaper ---
function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
