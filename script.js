// КОНСТАНТЫ И ПЕРЕМЕННЫЕ
const API_URL = '/api';
let currentUser = null;
let allArtworks = [];

// МОДАЛЬНЫЕ ОКНА
function openModal(id) { document.getElementById(id).classList.add('active'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).classList.remove('active'); document.body.style.overflow = 'auto'; }

document.addEventListener('click', (e) => e.target.classList.contains('modal') && closeModal(e.target.id));
document.addEventListener('keydown', (e) => e.key === 'Escape' && document.querySelectorAll('.modal.active').forEach(m => closeModal(m.id)));

// АВТОРИЗАЦИЯ
async function registerUser() {
    const data = getFormData('registrationModal');
    if (!validateForm(data, 'reg')) return;
    
    try {
        const res = await postData('/register', data);
        if (res.ok) {
            saveUserData(res.data);
            showAlert('✅ Регистрация успешна!', 'success');
            closeModal('registrationModal');
        }
    } catch { showAlert('❌ Ошибка сервера', 'error'); }
}

async function loginUser() {
    const data = getFormData('loginModal');
    if (!validateForm(data, 'login')) return;
    
    try {
        const res = await postData('/login', data);
        if (res.ok) {
            saveUserData(res.data);
            showAlert('✅ Вход выполнен!', 'success');
            closeModal('loginModal');
            updateUI();
        }
    } catch { showAlert('❌ Ошибка сервера', 'error'); }
}

function logout() {
    if (confirm('Выйти из системы?')) {
        currentUser = null;
        localStorage.clear();
        updateUI();
        showAlert('Вы вышли из системы', 'info');
    }
}

// РАБОТЫ С ИСКУССТВОМ
async function loadArtworks() {
    try {
        const res = await getData('/artworks');
        if (res.ok) {
            allArtworks = res.data.artworks;
            displayArtworks(allArtworks);
        }
    } catch { showAlert('Ошибка загрузки работ', 'error'); }
}

function displayArtworks(artworks) {
    const grid = document.getElementById('artworksGrid');
    if (!artworks || artworks.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666; padding: 40px;">Работ пока нет</p>';
        return;
    }
    
    grid.innerHTML = artworks.map(art => `
        <div class="artwork-card">
            <div class="artwork-image"><img src="${art.image}" alt="${art.title}"></div>
            <div class="artwork-info">
                <h3>${art.title}</h3>
                <p><i class="fas fa-user"></i> ${art.artist}${currentUser?.id === art.artist_id ? ' (Ваша)' : ''}</p>
                <p><i class="fas fa-tag"></i> ${art.category}</p>
                <p><i class="fas fa-ruble-sign"></i> ${art.price} ₽</p>
                <div class="artwork-actions">
                    <button class="btn btn-small" onclick="likeArtwork(${art.id})"><i class="fas fa-heart"></i> ${art.likes || 0}</button>
                    ${canManageArtwork(art) ? `<button class="btn btn-small btn-danger" onclick="deleteArtwork(${art.id})"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

function canManageArtwork(artwork) {
    return currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator' || currentUser.id === artwork.artist_id);
}

async function addArtwork() {
    if (!currentUser) { showAlert('Сначала войдите в систему', 'error'); openModal('loginModal'); return; }
    
    const data = getFormData('uploadModal');
    if (!data.title || !data.category) { showAlert('Заполните название и категорию', 'error'); return; }
    
    try {
        const res = await postData('/artworks/add', data, true);
        if (res.ok) {
            showAlert('✅ Работа добавлена!', 'success');
            closeModal('uploadModal');
            loadArtworks();
        }
    } catch { showAlert('❌ Ошибка сервера', 'error'); }
}

async function deleteArtwork(id) {
    if (!confirm('Удалить эту работу?')) return;
    if (!currentUser) { showAlert('Требуется авторизация', 'error'); return; }
    
    try {
        const res = await deleteData(`/artworks/${id}`);
        if (res.ok) { showAlert('✅ Работа удалена', 'success'); loadArtworks(); }
    } catch { showAlert('❌ Ошибка сервера', 'error'); }
}

function likeArtwork(id) {
    if (!currentUser) { showAlert('Войдите, чтобы ставить лайки', 'error'); openModal('loginModal'); return; }
    
    const artwork = allArtworks.find(a => a.id === id);
    if (artwork) {
        artwork.likes = (artwork.likes || 0) + 1;
        displayArtworks(allArtworks);
        showAlert(`Лайк поставлен "${artwork.title}"`, 'success');
    }
}

// ФИЛЬТРАЦИЯ
function filterArtworks() {
    const category = document.getElementById('filterCategory').value;
    const minPrice = document.getElementById('filterPriceMin').value;
    const maxPrice = document.getElementById('filterPriceMax').value;
    
    let filtered = [...allArtworks];
    if (category) filtered = filtered.filter(art => art.category === category);
    if (minPrice) filtered = filtered.filter(art => art.price >= minPrice);
    if (maxPrice) filtered = filtered.filter(art => art.price <= maxPrice);
    
    displayArtworks(filtered);
}

function resetFilters() {
    document.getElementById('filterCategory').value = '';
    document.getElementById('filterPriceMin').value = '';
    document.getElementById('filterPriceMax').value = '';
    displayArtworks(allArtworks);
}

// АДМИН ПАНЕЛЬ
function openAdminPanel() {
    if (!currentUser) { showAlert('Сначала войдите в систему', 'error'); openModal('loginModal'); return; }
    if (!['admin', 'moderator'].includes(currentUser.role)) { showAlert('❌ Требуются права администратора', 'error'); return; }
    
    const modal = document.createElement('div');
    modal.id = 'adminModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px; max-height: 80vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0;"><i class="fas fa-crown"></i> Панель управления</h2>
                <button class="btn btn-small" onclick="closeModal('adminModal')"><i class="fas fa-times"></i></button>
            </div>
            
            <div style="margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                <h3><i class="fas fa-chart-pie"></i> Статистика системы</h3>
                <div id="statsContent">Загрузка...</div>
            </div>
            
            <div style="margin-top: 20px;">
                <button class="btn btn-primary" onclick="loadAdminStats()"><i class="fas fa-sync-alt"></i> Обновить</button>
                <button class="btn btn-outline" onclick="closeModal('adminModal')">Закрыть</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    openModal('adminModal');
    loadAdminStats();
}

async function loadAdminStats() {
    try {
        const res = await getData('/admin/stats', true);
        if (res.ok) {
            const stats = res.data;
            document.getElementById('statsContent').innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0;">
                    <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
                        <h4>👤 Пользователи</h4>
                        <p style="font-size: 2rem; font-weight: bold; color: #6c63ff;">${stats.totalUsers}</p>
                    </div>
                    <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
                        <h4>🎨 Работы</h4>
                        <p style="font-size: 2rem; font-weight: bold; color: #6c63ff;">${stats.totalArtworks}</p>
                    </div>
                    <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
                        <h4>💰 Общая стоимость</h4>
                        <p style="font-size: 1.5rem; font-weight: bold; color: #6c63ff;">${stats.totalRevenue || 0} ₽</p>
                    </div>
                    <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
                        <h4>🏷️ Категории</h4>
                        <p style="font-size: 2rem; font-weight: bold; color: #6c63ff;">${Object.keys(stats.categories || {}).length}</p>
                    </div>
                </div>
            `;
        }
    } catch { document.getElementById('statsContent').innerHTML = '<p style="color: #dc3545;">Ошибка загрузки</p>'; }
}

// ИНТЕРФЕЙС
function updateUI() {
    const userMenu = document.getElementById('userMenu');
    const addBtn = document.getElementById('addArtworkBtn');
    const savedUser = localStorage.getItem('user');
    
    if (savedUser && !currentUser) currentUser = JSON.parse(savedUser);
    
    if (currentUser) {
        userMenu.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <div class="avatar">${currentUser.name.charAt(0)}</div>
                <div style="text-align: right;">
                    <strong>${currentUser.name}</strong>
                    <small style="color: #666;">${currentUser.role === 'admin' ? '👑' : currentUser.role === 'moderator' ? '👮' : '👤'}</small>
                </div>
                <button class="btn btn-small btn-outline" onclick="openModal('uploadModal')" title="Добавить работу"><i class="fas fa-plus"></i></button>
                <button class="btn btn-small" onclick="logout()"><i class="fas fa-sign-out-alt"></i></button>
            </div>
        `;
        if (addBtn) addBtn.style.display = 'inline-block';
    } else {
        userMenu.innerHTML = `
            <div style="display: flex; gap: 10px;">
                <button class="btn btn-small btn-outline" onclick="openModal('loginModal')"><i class="fas fa-sign-in-alt"></i> Вход</button>
                <button class="btn btn-small btn-primary" onclick="openModal('registrationModal')"><i class="fas fa-user-plus"></i> Регистрация</button>
            </div>
        `;
        if (addBtn) addBtn.style.display = 'none';
    }
}

// УТИЛИТЫ
async function getData(endpoint, auth = false) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) headers['Authorization'] = `Bearer ${localStorage.getItem('token')}`;
    
    const response = await fetch(API_URL + endpoint, { headers });
    const data = await response.json();
    return { ok: response.ok, data };
}

async function postData(endpoint, body, auth = false) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) headers['Authorization'] = `Bearer ${localStorage.getItem('token')}`;
    
    const response = await fetch(API_URL + endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    });
    const data = await response.json();
    return { ok: response.ok, data };
}

async function deleteData(endpoint) {
    const response = await fetch(API_URL + endpoint, {
        method: 'DELETE',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    });
    const data = await response.json();
    return { ok: response.ok, data };
}

function getFormData(modalId) {
    const modal = document.getElementById(modalId);
    const inputs = modal.querySelectorAll('input, select');
    const data = {};
    inputs.forEach(input => data[input.id.replace(modalId === 'uploadModal' ? 'artwork' : /^(reg|login)/, '').toLowerCase()] = input.value);
    return data;
}

function validateForm(data, type) {
    if (type === 'reg' || type === 'login') {
        if (!data.name && type === 'reg') { showAlert('Введите имя', 'error'); return false; }
        if (!data.email) { showAlert('Введите email', 'error'); return false; }
        if (!data.password) { showAlert('Введите пароль', 'error'); return false; }
        if (data.password.length < 6 && type === 'reg') { showAlert('Пароль должен быть не менее 6 символов', 'error'); return false; }
    }
    return true;
}

function saveUserData(responseData) {
    currentUser = responseData.user;
    localStorage.setItem('token', responseData.token);
    localStorage.setItem('user', JSON.stringify(responseData.user));
    updateUI();
    loadArtworks();
}

function showAlert(message, type = 'info') {
    const colors = { success: '#28a745', error: '#dc3545', info: '#17a2b8' };
    const alert = document.createElement('div');
    alert.style.cssText = `position: fixed; top: 20px; right: 20px; padding: 12px 20px; border-radius: 8px; color: white; z-index: 9999; background: ${colors[type] || colors.info};`;
    alert.innerHTML = `${type === 'success' ? '✅' : '❌'} ${message}`;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 3000);
}

// ИНИЦИАЛИЗАЦИЯ
async function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const res = await getData('/profile', true);
            if (res.ok) saveUserData({ user: res.data, token });
        } catch { localStorage.clear(); }
    }
    updateUI();
    loadArtworks();
}

document.addEventListener('DOMContentLoaded', checkAuth);