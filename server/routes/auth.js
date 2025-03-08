const express = require('express');
const bcrypt = require('bcryptjs');
const { createUser, findUserByUsername } = require('../database');

const router = express.Router();

// 用户注册
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 检查用户是否已存在
    const existingUser = await findUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: '用户名已存在' });
    }

    // 密码加密
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建新用户
    const userId = await createUser(username, hashedPassword);

    // 设置会话
    req.session.user = { id: userId, username };
    res.redirect('/todos');
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ message: '注册失败' });
  }
});

// 用户登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 查找用户
    const user = await findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    // 设置会话
    req.session.user = { id: user.id, username: user.username };
    res.redirect('/todos');
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ message: '登录失败' });
  }
});

// 验证会话中间件
function authenticateSession(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
}

// 退出登录
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

module.exports = {
  router,
  authenticateSession
};