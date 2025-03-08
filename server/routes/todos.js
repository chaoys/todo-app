const express = require('express');
const { authenticateSession } = require('./auth');
const { createTodo, updateTodo, getTodosByUser, deleteTodo } = require('../database');

const router = express.Router();

// 获取用户的所有待办事项
router.get('/', authenticateSession, async (req, res) => {
  try {
    const todos = await getTodosByUser(req.session.user.id);
    res.render('todos', { user: req.session.user, todos });
  } catch (error) {
    console.error('获取待办事项错误:', error);
    res.render('todos', { user: req.session.user, todos: [], error: '获取待办事项失败' });
  }
});

// 创建新的待办事项
router.post('/', authenticateSession, async (req, res) => {
  try {
    const { title, description, assigned_to } = req.body;

    await createTodo({
      title,
      description,
      assigned_to: assigned_to ? [...assigned_to, req.session.user.id] : [req.session.user.id]
    });

    res.redirect('/todos');
  } catch (error) {
    console.error('创建待办事项错误:', error);
    res.render('todos', { user: req.session.user, todos: [], error: '创建待办事项失败' });
  }
});

// 更新待办事项
router.post('/:id', authenticateSession, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    const todos = await getTodosByUser(req.session.user.id);
    const todo = todos.find(t => t.id === parseInt(id));

    if (!todo) {
      return res.redirect('/todos');
    }

    await updateTodo(id, { title, description });
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

    const newStatus = todo.status === 'done' ? 'todo' : 'done';
    await updateTodo(id, { status: newStatus });
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