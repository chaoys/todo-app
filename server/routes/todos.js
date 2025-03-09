const express = require('express');
const { authenticateSession } = require('./auth');
const { createTodo, updateTodo, getTodosByUser, deleteTodo } = require('../database');

const router = express.Router();

// 获取用户的所有待办事项
router.get('/', authenticateSession, async (req, res) => {
  try {
    const [todos, users] = await Promise.all([
      getTodosByUser(req.session.user.id),
      getAllUsers()
    ]);
    res.render('todos', { user: req.session.user, todos, users });
  } catch (error) {
    console.error('获取待办事项错误:', error);
    res.render('todos', { user: req.session.user, todos: [], error: '获取待办事项失败' });
  }
});

// 创建新的待办事项
router.post('/', authenticateSession, async (req, res) => {
  try {
    const { title, description, assigned_to, deadline } = req.body;

    await createTodo({
      title,
      description,
      assigned_to: assigned_to ? [...assigned_to, req.session.user.id] : [req.session.user.id],
      deadline
    });

    res.redirect('/todos');
  } catch (error) {
    console.error('创建待办事项错误:', error);
    const users = await getAllUsers();
    res.render('todos', { user: req.session.user, todos: [], users, error: '创建待办事项失败' });
  }
});

// 更新待办事项
router.post('/:id', authenticateSession, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, deadline } = req.body;
    const todos = await getTodosByUser(req.session.user.id);
    const todo = todos.find(t => t.id === parseInt(id));

    if (!todo) {
      return res.redirect('/todos');
    }

    await updateTodo(id, { title, description, deadline }, req.session.user.id);
    res.redirect('/todos');
  } catch (error) {
    console.error('更新待办事项错误:', error);
    res.redirect('/todos');
  }
});

// 切换待办事项状态
router.post('/:id/toggle', authenticateSession, async (req, res) => {
  try {
    const { id } = req.params;
    const todos = await getTodosByUser(req.session.user.id);
    const todo = todos.find(t => t.id === parseInt(id));

    if (!todo) {
      return res.redirect('/todos');
    }

    let newStatus;
    switch (todo.status) {
      case 'todo':
        newStatus = 'doing';
        break;
      case 'doing':
        newStatus = 'done';
        break;
      case 'done':
        newStatus = 'todo';
        break;
      default:
        newStatus = 'todo';
    }

    await updateTodo(id, { status: newStatus }, req.session.user.id);
    res.redirect('/todos');
  } catch (error) {
    console.error('更新待办事项状态错误:', error);
    res.redirect('/todos');
  }
});

// 删除待办事项
router.post('/:id/delete', authenticateSession, async (req, res) => {
  try {
    const { id } = req.params;
    const todos = await getTodosByUser(req.session.user.id);
    const todo = todos.find(t => t.id === parseInt(id));

    if (!todo) {
      return res.redirect('/todos');
    }

    await deleteTodo(id, req.session.user.id);
    res.redirect('/todos');
  } catch (error) {
    console.error('删除待办事项错误:', error);
    res.redirect('/todos');
  }
});



module.exports = router;