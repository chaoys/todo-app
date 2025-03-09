const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'todo.db'));

async function initDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      try {
        // 创建用户表
        await new Promise((resolve, reject) => {
          db.run(`
            CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              username TEXT UNIQUE NOT NULL,
              password TEXT NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        // 为现有用户创建todo表
        const users = await new Promise((resolve, reject) => {
          db.all('SELECT id FROM users', [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });

        for (const user of users) {
          await createUserTodoTable(user.id);
        }

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

// 创建用户专属的todo表
async function createUserTodoTable(userId) {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS todos_${userId} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT CHECK(status IN ('todo', 'doing', 'done')) DEFAULT 'todo',
        deadline DATE DEFAULT CURRENT_DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_synced_at DATETIME
      )
    `, function(err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

// 用户相关操作
async function createUser(username, password) {
  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      try {
        db.run('BEGIN TRANSACTION');

        // 创建用户
        const userId = await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            [username, password],
            function(err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });

        // 创建用户专属的todo表
        await createUserTodoTable(userId);

        db.run('COMMIT');
        resolve(userId);
      } catch (error) {
        db.run('ROLLBACK');
        reject(error);
      }
    });
  });
}

async function findUserByUsername(username) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM users WHERE username = ?',
      [username],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

// Todo相关操作
async function createTodo(todoData) {
  const {
    title,
    description,
    assigned_to,
    deadline
  } = todoData;

  return new Promise((resolve, reject) => {
    if (!assigned_to || !Array.isArray(assigned_to) || assigned_to.length === 0) {
      reject(new Error('必须指定至少一个分配用户'));
      return;
    }

    db.serialize(async () => {
      try {
        db.run('BEGIN TRANSACTION');

        // 在每个被分配用户的表中创建待办事项
        const todoPromises = assigned_to.map(userId => {
          return new Promise((resolve, reject) => {
            db.run(
              `INSERT INTO todos_${userId} (
                title, description, status, deadline
              ) VALUES (?, ?, 'todo', ?)
              `,
              [title, description, deadline === undefined || deadline === '' ? new Date().toISOString().split('T')[0] : deadline],
              function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
              }
            );
          });
        });

        // 等待所有待办事项创建完成
        const todoIds = await Promise.all(todoPromises);
        
        db.run('COMMIT');
        resolve(todoIds[0]); // 返回第一个创建的todo ID作为主ID
      } catch (error) {
        db.run('ROLLBACK');
        reject(error);
      }
    });
  });
}

async function deleteTodo(id, userId) {
  return new Promise((resolve, reject) => {
    // 直接从用户的专属表中删除待办事项
    db.run(`DELETE FROM todos_${userId} WHERE id = ?`, [id], function(err) {
      if (err) reject(err);
      else resolve(this.changes > 0);
    });
  });
}

async function updateTodo(id, todoData, userId) {
  const updates = Object.entries(todoData)
    .filter(([key]) => key !== 'id')
    .map(([key]) => `${key} = ?`)
    .join(', ');

  const values = [...Object.entries(todoData)
    .filter(([key]) => key !== 'id')
    .map(([, value]) => value === '' ? null : value), id];

  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE todos_${userId} SET ${updates}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values,
      function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      }
    );
  });
}

async function getTodosByUser(userId, includePublic = false) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT t.*,
      GROUP_CONCAT(DISTINCT au.username) as assigned_names,
      GROUP_CONCAT(DISTINCT ta.user_id) as assigned_user_ids,
      CASE WHEN t.status = 'done' THEN 1 ELSE 0 END as completed
      FROM todos_${userId} t
      LEFT JOIN todo_assignments ta ON t.id = ta.todo_id
      LEFT JOIN users au ON ta.user_id = au.id
      GROUP BY t.id
    `;

    db.all(query, [], (err, rows) => {
      if (err) reject(err);
      else {
        // 处理分配用户的数组
        rows.forEach(row => {
          row.assigned_names = row.assigned_names ? row.assigned_names.split(',') : [];
          row.assigned_user_ids = row.assigned_user_ids ? row.assigned_user_ids.split(',').map(Number) : [];
        });
        resolve(rows);
      }
    });
  });
}

async function deleteTodo(id, userId) {
  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      try {
        db.run('BEGIN TRANSACTION');

        // 删除待办事项分配关系
        await new Promise((resolve, reject) => {
          db.run('DELETE FROM todo_assignments WHERE todo_id = ?', [id], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        // 删除待办事项
        await new Promise((resolve, reject) => {
          db.run(`DELETE FROM todos_${userId} WHERE id = ?`, [id], function(err) {
            if (err) reject(err);
            else resolve(this.changes);
          });
        });

        db.run('COMMIT');
        resolve(true);
      } catch (error) {
        db.run('ROLLBACK');
        reject(error);
      }
    });
  });
}

async function getAllUsers() {
  return new Promise((resolve, reject) => {
    db.all('SELECT id, username FROM users', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

module.exports = {
  initDatabase,
  createUser,
  findUserByUsername,
  createTodo,
  updateTodo,
  getTodosByUser,
  deleteTodo,
  getAllUsers,
};