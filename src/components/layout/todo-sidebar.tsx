'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Plus,
  CheckCircle2,
  Circle,
  Calendar,
  Clock,
  MoreHorizontal,
  X
} from 'lucide-react'

interface TodoSidebarProps {
  collapsed: boolean
  onToggle: () => void
}

const todoItems = [
  {
    id: 1,
    title: 'Review supplier pricing updates',
    completed: false,
    priority: 'high',
    dueDate: 'Today',
  },
  {
    id: 2,
    title: 'Update customer contact information',
    completed: true,
    priority: 'medium',
    dueDate: 'Yesterday',
  },
  {
    id: 3,
    title: 'Process transport route approvals',
    completed: false,
    priority: 'high',
    dueDate: 'Tomorrow',
  },
  {
    id: 4,
    title: 'Generate monthly trade report',
    completed: false,
    priority: 'low',
    dueDate: 'Next week',
  },
  {
    id: 5,
    title: 'Call new supplier in Netherlands',
    completed: false,
    priority: 'medium',
    dueDate: 'Friday',
  },
]

export function TodoSidebar({ collapsed, onToggle }: TodoSidebarProps) {
  const [todos, setTodos] = useState(todoItems)

  const toggleTodo = (id: number) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ))
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'low': return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  if (collapsed) {
    return (
      <div className="w-12 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8 mb-4"
        >
          <CheckCircle2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        </Button>
        <div className="flex flex-col gap-2">
          {todos.slice(0, 3).map((todo) => (
            <div
              key={todo.id}
              className={cn(
                "w-2 h-2 rounded-full",
                todo.completed ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
              )}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Tasks</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-6 w-6"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {todos.filter(t => !t.completed).length}
            </div>
            <div className="text-gray-600 dark:text-gray-400">Pending</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {todos.filter(t => t.completed).length}
            </div>
            <div className="text-gray-600 dark:text-gray-400">Completed</div>
          </div>
        </div>
      </div>

      {/* Todo List */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {todos.map((todo) => (
            <div
              key={todo.id}
              className={cn(
                "group flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                "hover:bg-gray-50 dark:hover:bg-gray-800/50",
                todo.completed
                  ? "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
                  : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              )}
              onClick={() => toggleTodo(todo.id)}
            >
              <div className="pt-0.5">
                {todo.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Circle className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className={cn(
                  "text-sm font-medium",
                  todo.completed
                    ? "text-gray-500 dark:text-gray-400 line-through"
                    : "text-gray-900 dark:text-gray-100"
                )}>
                  {todo.title}
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <span className={cn(
                    "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                    getPriorityColor(todo.priority)
                  )}>
                    {todo.priority}
                  </span>

                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="h-3 w-3" />
                    {todo.dueDate}
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation()
                  // Handle more options
                }}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <Button className="w-full" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>
    </div>
  )
}