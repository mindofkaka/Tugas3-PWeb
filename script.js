// task list
let tasks = []
let selectedTaskId = null 
let db = null 
let cameraStream = null 
let detailImage = ''

const defaultTasks = [
    {
        id: 1,
        title: 'Task 1',
        notes: 'This is the first task.',
        deadline: '2026-09-19',
        status: 'completed'
    },
    {
        id: 2,
        title: 'Task 2',
        notes: 'This is the second task.',
        deadline: '2026-09-20',
        status: 'in-progress'
    },{
        id: 3,
        title: 'Task 3',
        notes: 'This is the third task.',
        deadline: '2026-09-21',
        status: 'not-started'
    },{
        id: 4,
        title: 'Task 4',
        notes: 'This is the forth task.',
        deadline: '2026-09-22',
        status: 'not-started'
    },
]

const taskList = document.querySelector('.task-section')
const detailPanel = document.querySelector('.task-details')
const detailTitle = document.querySelector('input[name="task-title"]')
const detailDescription = document.querySelector('textarea[name="task-description"]')
const detailStatus = document.querySelector('select[name="task-status"]')
const detailDeadline = document.querySelector('input[name="task-deadline"]')
const addTaskForm = document.querySelector('.task-form')
const themeToggle = document.getElementById('theme-toggle')

const imagePreview = document.getElementById('task-image-preview')
const cameraVideo = document.getElementById('camera-video')
const cameraCanvas = document.getElementById('camera-canvas')
const openCameraBtn = document.getElementById('open-camera')
const captureBtn = document.getElementById('capture-photo')
const stopCameraBtn = document.getElementById('stop-camera')
const removeImageBtn = document.getElementById('remove-image')
const imageFileInput = document.getElementById('image-file')
const cameraMessage = document.getElementById('camera-message')

//indexedDB
function initDB(onReady) {
    const request = indexedDB.open('todoApp', 1)
    request.onupgradeneeded = function(e) {
        const database = e.target.result
        const store = database.objectStoreNames.contains('todos') ? e.target.transaction.objectStore('todos') : database.createObjectStore('todos', {keyPath: 'id'})
        const countReq = store.count() 
        countReq.onsuccess = function () {
            if(countReq.result === 0) {
                defaultTasks.forEach((t) => store.put(t))
            }
        }
    }

    request.onsuccess = function(e) {
        db = e.target.result
        db.onversionchange = function() {
            db.close()
            db = null
        }
        onReady()
    }

    request.onerror = function(e) {
        console.error('DB error:', e.target.error)
    }
}

function saveTask(task, callback) {
    if(!db) {
        if(callback) callback();
        return;
    }
    const tx = db.transaction('todos', 'readwrite')
    tx.objectStore('todos').put(task)
    tx.oncomplete = function() {
        if(callback) callback()
    }
    tx.onerror = function() {
        console.error('Save failed:', tx.error)
    }
}

function removeTask(id, callback) {
    if(!db) {
        if(callback) callback();
        return;
    }
    const tx = db.transaction('todos', 'readwrite')
    tx.objectStore('todos').delete(id)
    tx.oncomplete = function() {
        if(callback) callback()
    }
    tx.onerror = function() {
        console.error('Delete failed:', tx.error)
    }
}

function loadTasks(callback) {
    const req = db.transaction('todos', 'readonly').objectStore('todos').getAll()
    req.onsuccess = function() {
        callback(req.result)
    }
    req.onerror = function() {
        console.error('Read failed:', req.error)
    }
}

//renders
function showDetails(task) {
    selectedTaskId = task.id 
    detailTitle.value = task.title
    detailDescription.value = task.notes || ''
    detailStatus.value = task.status 
    detailDeadline.value = task.deadline || ''
}

function clearDetails() {
    selectedTaskId = null 
    detailTitle.value = ''
    detailDescription.value = ''
    detailStatus.value = 'not-started' 
    detailDeadline.value = ''
}

function renderTaskList() {
    taskList.innerHTML = ''

    tasks.forEach((task) => {
        const li = document.createElement('li')
        li.className = 'task-text'
        li.dataset.id = task.id 

        const checkbox = document.createElement('input')
        checkbox.type = 'checkbox'
        checkbox.className = 'task-check'
        checkbox.checked = task.status === 'completed'

        const label = document.createElement('span')
        label.className = 'task-label'
        label.textContent = task.title 
        if(task.status === 'completed') {
            label.classList.add('task-done')
        }else if(task.status === 'in-progress') {
            label.classList.add('task-in-progress') 
        }

        const deleteBtn = document.createElement('button')
        deleteBtn.type = 'button'
        deleteBtn.className = 'delete-task'
        deleteBtn.textContent = 'Delete'

        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation()
            removeTask(task.id, () => {
                tasks = tasks.filter((t) => t.id !== task.id)
                if(selectedTaskId === task.id) clearDetails()
                renderTaskList()
            })
        })

        checkbox.addEventListener('click', (e) => e.stopPropagation())
        checkbox.addEventListener('change', () => {
            if(checkbox.checked) {
                task.prevStatus = task.status
                task.status = 'completed'
            }else {
                task.status = task.prevStatus || 'not-started'
            }

            if(selectedTaskId === task.id) detailStatus.value = task.status 
            saveTask(task, renderTaskList)
        })

        li.addEventListener('click', () => showDetails(task))

        li.appendChild(checkbox)
        li.appendChild(label)
        li.appendChild(deleteBtn)
        taskList.appendChild(li)
    })
}

//update task
document.querySelector('.details-button').addEventListener('click', () => {
    const task = tasks.find((t) => t.id === selectedTaskId)
    if(!task) return 

    task.title = detailTitle.value.trim()
    task.notes = detailDescription.value.trim()
    task.status = detailStatus.value.trim()
    task.deadline = detailDeadline.value.trim()

    saveTask(task, renderTaskList)
})

//add task
addTaskForm.addEventListener('submit', function(e) {
    e.preventDefault()
    const title = addTaskForm.querySelector('input[name="task-title"]').value.trim()
    const description = addTaskForm.querySelector('textarea[name="task-description"]').value.trim()
    const deadline = addTaskForm.querySelector('input[name="task-deadline"]').value

    if(!title) {
        alert('Please enter a task title')
        return 
    }

    const newTask = {
        id: Date.now(),
        title,
        notes: description,
        deadline,
        status: 'not-started',
    }

    tasks.push(newTask)
    saveTask(newTask, renderTaskList)
    addTaskForm.reset()
})

//local storage
function loadTheme() {
    try {
        return localStorage.getItem('theme') || 'light'
    }catch (e) {
        return 'light'
    }
}

function saveTheme(theme) {
    try {
        localStorage.setItem('theme', theme)
    }catch(e) {
        console.warn("Couldn't save theme", e)
    }
}

function applyTheme(theme) {
    document.body.classList.toggle('dark-mode', theme === 'dark')
}

themeToggle.addEventListener('click', () => {
    const next = loadTheme() === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    saveTheme(next)
})

//media capture API
const MAX_IMAGE_WIDTH = 640
const IMAGE_QUALITY = 0.8

function setCameraMessage(text) {
    cameraMessage.textContent = text || ''
}

function setImage(dataUrl) {
    detailImage = dataUrl || ''
    if(detailImage) {
        imagePreview.src = detailImage
        imagePreview.hidden = false 
    }else {
        imagePreview.removeAttribute('src')
        imagePreview.hidden = true 
    }
    removeImageBtn.hidden = !(detailImage)
}

function drawToDataUrl(source, width, height) {
    const scale = Math.min(1, MAX_IMAGE_WIDTH/width)
    cameraCanvas.width = Math.round(width*scale)
    cameraCanvas.height = Math.round(height*scale)
    cameraCanvas.getContext('2d').drawImage(source, 0,0, cameraCanvas.width, cameraCanvas.height)
    return cameraCanvas.toDataURL('image/jpeg', IMAGE_QUALITY)
}

function stopCamera() {
    if(cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop())
        cameraStream = null 
    }
    cameraVideo.srcObject = null 
    cameraVideo.hidden = true 
    captureBtn.hidden = true 
    stopCameraBtn.hidden = true 
    openCameraBtn.hidden = false  
}

async function startCamera() {
    if(!selectedTaskId) {
        setCameraMessage('Select a task first.')
        return 
    }
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraMessage('Camera not available')
        return 
    }
    stopCamera()
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {facingMode: {ideal: 'environment'}},
            audio: false, 
        })
        cameraVideo.srcObject = cameraStream
        cameraVideo.hidden = false 
        captureBtn.hidden = false 
        stopCameraBtn.hidden = false 
        openCameraBtn.hidden = true 
        setCameraMessage('')
    } catch(err) {
        console.error('Camera error:', err)
        if(err.name === 'NotAllowedError') {
            setCameraMessage('Camera permission denied.')
        }else if(err.name === 'NotFoundError') {
            setCameraMessage('No camera was found.')
        }else if(err.name === 'NotReadableError') {
            setCameraMessage('Camera being used by other app.')
        }else {
            setCameraMessage('Couldn\'t open the camera.')
        }
    }
}

function capturePhoto() {
    if(!cameraStream || !cameraVideo.videoWidth) {
        setCameraMessage('Camera is not ready yet.')
        return 
    }
    setImage(drawToDataUrl(cameraVideo, cameraVideo.videoWidth, cameraVideo.videoHeight))
    stopCamera()
    setCameraMessage('Photo captured. Click "Update task" to save.')
}

openCameraBtn.addEventListener('click', startCamera)
captureBtn.addEventListener('click', capturePhoto)
stopCameraBtn.addEventListener('click', () => {
    stopCamera()
    setCameraMessage('')
})

removeImageBtn.addEventListener('click', () => {
    setImage('')
    setCameraMessage('Photo removed. Click "Update task" to save.')
})

imageFileInput.addEventListener('change', () => {
    const file = imageFileInput.files[0]
    imageFileInput.value = ''
    if(!file) return 

    if(!selectedTaskId) {
        setCameraMessage('Select a task first.')
        return 
    }
    if(!file.type.startsWith('image/')) {
        setCameraMessage('Please choose image file.')
        return 
    }

    const reader = new FileReader()
    reader.onload = () => {
        const img = new Image()
        img.onload() = () => {
            stopCamera()
            setImage(drawToDataUrl(img, img.naturalWidth, img.naturalHeight))
            setCameraMessage('Photo selected. Click "Update task" to save.')
        }
        img.onerror = () => setCameraMessage('Couldn\'t read photo.')
        img.src = reader.result 
    }
    reader.onerror = () => setCameraMessage('Couldn\'t read the file.')
    reader.readAsDataURL(file)
})

window.addEventListener('pagehide', stopCamera)

// service worker
const REMINDER_CHECK_MS = 30*1000
const LATE_NOTE_MS = 60*1000
const MAX_LATE_MS = 24*60*60*1000
let reminderTimer = null 
let permissionWarned = false 

function isFutureTime(value) {
    return new Date(value).getTime() > Date.now()
}

function selectedTaskById(id) {
    const task = tasks.find((t) => String(t.id) === String(id))
    if(task) showDetails(task)
}

if('serviceworker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch((err) => {
        console.warn('Service worker registration failed:', err)
    })
    navigator.serviceWorker.addEventListener('message', (event) => {
        if(event.data && event.data.type === 'select-task') {
            selectedTaskById(event.data.taskId)
        }
    })
}

function warnNotificationsOnce(message) {
    if(permissionWarned) return 
    permissionWarned = true 
    alert(message) 
}

async function ensureNotificationPermission() {
    if(!('Notification' in window)) {
        warnNotificationsOnce('This web browser doesn\'t support notifications feature.')
        return 
    }

    let permission = Notification.permission
    if(permission === 'default') {
        try {
            permission = await Notification.requestPermission()
        }catch(err) {
            permission = 'denied'
        }
    }
    if(permission !== 'granted') {
        warnNotificationsOnce('Notifications are blocked.')
    }
}

async function showReminder(task, lateMs) {
    const dueText = new Date(task.notifyAt).toLocaleString()
    let body = lateMs > LATE_NOTE_MS ? 'Missed reminder' : 'Reminder for ' + dueText
    if(task.notes) body += '\n' + task.notes 
    const title = 'To-Do: ' + task.title 
    const options = {
        body,
        tag: 'task-' + task.id,
        data: {taskId: task.id},
    }
    try {
        const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null 
        if(registration) {
            await registration.showNotification(title, options)
            return 
        }
    }catch(err) {
        console.warn('Service worker notification failed. Error:', err)
    }

    try {
        const n = new Notification(title, options)
        n.onclick = () => {
            window.focus()
            selectedTaskById(task.id)
            n.close()
        }
    }catch(err) {
        console.warn('Couldn\'t show notification. Error:', err)
    }
}

function checkReminders() {
    if(!('Notification' in window) || Notification.permission !== 'granted') return 

    const now = Date.now() 
    tasks.forEach((task) => {
        if(!task.notifyAt || task.notfied || task.status === 'completed') return 
        const due = new Date(task.notifyAt).getTime()
        if(Number.isNaN(due) || due > now) return 

        task.notified = true 
        saveTask(task)
        if(now-due <= MAX_LATE_MS) showReminder(task, now-due)
    })
}

function startReminders() {
    checkReminders()
    if(!reminderTimer) reminderTimer = setInterval(checkReminders, REMINDER_CHECK_MS)
}

document.addEventListener('visibilitychange', () => {
    if(!document.hidden) checkReminders()
})

function hasSeeded() {
    try {
        return localStorage.getItem('seeded') === '1'
    }catch(e) {
        return false 
    }
}

function markSeeded() {
    try {
        localStorage.setItem('seeded', '1')
    }catch(e) {
        console.warn("Couldn't save needed flag", e)
    }
}

//implement
applyTheme(loadTheme())
initDB(
    function onReady() {
        loadTasks(function (saved) {
            if (saved.length === 0 && !hasSeeded()) {
                tasks = defaultTasks.map((t) => ({ ...t }))
                tasks.forEach((t) => saveTask(t))
            } else {
                tasks = saved
            }
            markSeeded()
            renderTaskList()
            const wanted = new URLSearchParams(location.search).get('task')
            const target = tasks.find((t) => String(t.id) === wanted) || tasks[0]
            if(target) showDetails(target)
            startReminders()
        })
    },
    function onFail() {
        tasks = defaultTasks.map((t) => ({...t}))
        renderTaskList()
        showDetails(tasks[0])
        startReminders()
    }
)