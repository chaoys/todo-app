const express = require('express');
const path = require('path');
const session = require('express-session');
const { router: authRoutes } = require('./routes/auth');
const todoRoutes = require('./routes/todos');
const { initDatabase, getTodosByUser, getAllUsers } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 配置session中间件
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// 设置模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 初始化数据库
initDatabase();

// 根路由处理
app.get('/', (req, res) => {
  if (req.session?.user) {
    res.redirect('/todos');
  } else {
    res.redirect('/login');
  }
});

// 页面路由
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.get('/register', (req, res) => {
  res.render('register', { error: null });
});

app.get('/todos', async (req, res) => {
  // 检查用户是否已登录
  if (!req.session?.user) {
    return res.redirect('/login');
  }
  try {
    const [todos, users] = await Promise.all([
      getTodosByUser(req.session.user.id),
      getAllUsers()
    ]);
    res.render('todos', { user: req.session.user, todos, users });
  } catch (error) {
    console.error('获取待办事项错误:', error);
    res.render('todos', { user: req.session.user, todos: [], users: [], error: '获取待办事项失败' });
  }
});

// API路由
app.use('/auth', authRoutes);
app.use('/todos', todoRoutes);

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});