const express = require('express');
const app = express();
const port = process.env.PORT || 5001;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const JWT_SECRET = 'your-secret-key';

app.use(cors());
app.use(express.json());

// ДАННЫЕ В ПАМЯТИ
let users = [];
let artworks = [];

// СОЗДАНИЕ НАЧАЛЬНЫХ ДАННЫХ
async function initData() {
    const adminHash = await bcrypt.hash('admin123', 10);
    const userHash = await bcrypt.hash('user123', 10);
    
    users = [
        { id: 1, name: "Админ", email: "admin@art.com", password: adminHash, role: "admin" },
        { id: 2, name: "Художник", email: "artist@art.com", password: userHash, role: "user" }
    ];
    
    artworks = [
        { id: 1, title: "Звездная ночь", artist: "Ван Гог", price: 1500, category: "Живопись", image: "https://images.unsplash.com/photo-1541961017774-22349e4a1262", artist_id: 1, likes: 42 },
        { id: 2, title: "Рассвет в горах", artist: "Иванов", price: 800, category: "Пейзаж", image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4", artist_id: 2, likes: 15 }
    ];
    
    console.log('👤 Тестовые пользователи:');
    console.log('📧 admin@art.com / admin123 (админ)');
    console.log('📧 artist@art.com / user123 (пользователь)');
}

// МИДЛВЭРЫ
const auth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Нет токена' });
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Неверный токен' });
        req.user = user;
        next();
    });
};

const isAdmin = (req, res, next) => req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Требуется админ' });
const isModerator = (req, res, next) => ['admin', 'moderator'].includes(req.user.role) ? next() : res.status(403).json({ error: 'Требуется модератор' });

// API МАРШРУТЫ

// АВТОРИЗАЦИЯ
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) return res.status(400).json({ error: 'Заполните все поля' });
        if (users.find(u => u.email === email)) return res.status(400).json({ error: 'Пользователь уже есть' });
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = { id: users.length + 1, name, email, password: hashedPassword, role: 'user' };
        users.push(newUser);
        
        const token = jwt.sign({ id: newUser.id, email, role: 'user' }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ message: 'Успешная регистрация', token, user: { id: newUser.id, name, email, role: 'user' } });
    } catch { res.status(500).json({ error: 'Ошибка сервера' }); }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = users.find(u => u.email === email);
        if (!user) return res.status(401).json({ error: 'Неверный email или пароль' });
        
        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) return res.status(401).json({ error: 'Неверный email или пароль' });
        
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ message: 'Вход выполнен', token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch { res.status(500).json({ error: 'Ошибка сервера' }); }
});

app.get('/api/profile', auth, (req, res) => {
    const user = users.find(u => u.id === req.user.id);
    res.json(user ? { id: user.id, name: user.name, email: user.email, role: user.role } : { error: 'Не найден' });
});

// РАБОТЫ
app.get('/api/artworks', (req, res) => res.json({ artworks, total: artworks.length }));

app.post('/api/artworks/add', auth, (req, res) => {
    const { title, price, category, image } = req.body;
    const user = users.find(u => u.id === req.user.id);
    
    const newArtwork = {
        id: artworks.length + 1,
        title,
        artist: user.name,
        price: price || 0,
        category,
        image: image || 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5',
        artist_id: req.user.id,
        likes: 0
    };
    
    artworks.push(newArtwork);
    res.json({ message: 'Работа добавлена', artwork: newArtwork });
});

app.delete('/api/artworks/:id', auth, (req, res) => {
    const artwork = artworks.find(a => a.id === parseInt(req.params.id));
    if (!artwork) return res.status(404).json({ error: 'Работа не найдена' });
    
    const canDelete = req.user.role === 'admin' || req.user.role === 'moderator' || req.user.id === artwork.artist_id;
    if (!canDelete) return res.status(403).json({ error: 'Нет прав' });
    
    artworks = artworks.filter(a => a.id !== parseInt(req.params.id));
    res.json({ message: 'Работа удалена', id: req.params.id });
});

app.get('/api/my-artworks', auth, (req, res) => {
    const userArtworks = artworks.filter(a => a.artist_id === req.user.id);
    res.json({ artworks: userArtworks, count: userArtworks.length });
});

// АДМИН
app.get('/api/admin/stats', auth, isModerator, (req, res) => {
    const categories = {};
    artworks.forEach(art => categories[art.category] = (categories[art.category] || 0) + 1);
    
    res.json({
        totalUsers: users.length,
        totalArtworks: artworks.length,
        categories,
        totalRevenue: artworks.reduce((sum, art) => sum + (art.price || 0), 0)
    });
});

app.get('/api/admin/users', auth, isAdmin, (req, res) => {
    res.json({
        users: users.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            artworksCount: artworks.filter(a => a.artist_id === u.id).length
        }))
    });
});

// СТАТИЧЕСКИЕ ФАЙЛЫ
app.use(express.static(__dirname));
app.get('*', (req, res) => res.sendFile(__dirname + '/index.html'));

// ЗАПУСК СЕРВЕРА
app.listen(port, async () => {
    await initData();
    console.log(`🚀 Сервер запущен: http://localhost:${port}`);
    console.log('✅ Используйте admin@art.com / admin123 для входа как админ');
});