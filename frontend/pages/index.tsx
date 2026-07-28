import { useState } from 'react'
import { api, Todo, PointBalance } from '@/lib/api'
import { useApiData } from '@/lib/useApiData'
import Layout from '@/components/Layout'

// Point values must match src-tauri/src/db/mod.rs (easy=5, medium=10, hard=20)

export default function TasksPage() {
  const { data, loading, error, retry } = useApiData(async () => {
    const [todos, balance] = await Promise.all([
      api.getTodos(),
      api.getBalance(),
    ])
    return { todos, balance }
  })

  const todos = data?.todos ?? []
  const balance = data?.balance ?? null

  const [title, setTitle] = useState('')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')

  const createTask = async () => {
    if (!title.trim()) return
    try {
      await api.createTodo(title.trim(), difficulty)
      setTitle('')
      retry()
    } catch (e) {
      console.error(e)
    }
  }

  const completeTask = async (id: string) => {
    try {
      await api.completeTodo(id)
      retry()
    } catch (e) {
      console.error(e)
    }
  }

  const deleteTask = async (id: string, completed: boolean) => {
    if (completed && !confirm('Delete this completed task? Points already earned will not be affected.')) return
    if (!completed && !confirm('Delete this task?')) return
    try {
      await api.deleteTodo(id)
      retry()
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) {
    return <Layout balance={balance?.balance ?? 0}><p>Loading...</p></Layout>
  }

  return (
    <Layout balance={balance?.balance ?? 0}>
      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={retry}>Retry</button>
        </div>
      )}

      <div className="card">
        <h2>New Task</h2>
        <div className="form-row">
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What do you need to do?"
              onKeyDown={e => e.key === 'Enter' && createTask()}
            />
          </div>
          <div className="form-group">
            <label>Difficulty</label>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value as typeof difficulty)}>
              <option value="easy">Easy (5 pts)</option>
              <option value="medium">Medium (10 pts)</option>
              <option value="hard">Hard (20 pts)</option>
            </select>
          </div>
        </div>
        <button className="btn btn-primary" onClick={createTask} disabled={!title.trim()}>
          Add Task
        </button>
      </div>

      <div className="card">
        <h2>Tasks</h2>
        {todos.length === 0 ? (
          <div className="empty-state">No tasks yet. Create one above!</div>
        ) : (
          todos.map(todo => (
            <div key={todo.id} className="task-item">
              <div className="task-info">
                <div className={`task-title ${todo.completed ? 'completed' : ''}`}>
                  {todo.title}
                </div>
                <div className="task-meta">
                  <span className={`badge badge-${todo.difficulty}`}>
                    {todo.difficulty}
                  </span>
                  <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                    +{todo.points} pts
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {todo.created_at}
                  </span>
                </div>
              </div>
              {!todo.completed && (
                <button
                  className="btn btn-success"
                  onClick={() => completeTask(todo.id)}
                  style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
                >
                  Done
                </button>
              )}
              <button
                className="btn btn-danger"
                onClick={() => deleteTask(todo.id, todo.completed)}
                style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
                title={todo.completed ? "Deleting won't affect points already earned" : undefined}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </Layout>
  )
}