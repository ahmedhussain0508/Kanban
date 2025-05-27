import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Plus, X, List, CheckSquare, AlignLeft, Edit2, Save, Trash2, MoreVertical, ChevronDown, ChevronRight, Clock, Tag, User, GripVertical } from 'lucide-react';
import Masonry from 'react-masonry-css'; // Add this line

const KanbanApp = () => {
  // Initialize boards from localStorage or use default
  const [boards, setBoards] = useState(() => {
    const savedBoards = localStorage.getItem('kanbanBoards');
    if (savedBoards) {
      try {
        return JSON.parse(savedBoards);
      } catch (error) {
        console.error('Error parsing saved boards:', error);
      }
    }
    
    // Default boards if nothing in localStorage
    return [
      {
        id: 'board-1',
        title: 'To Do',
        color: 'bg-red-500',
        order: 0,
        tasks: [
          {
            id: 'task-1',
            title: 'Research task management solutions',
            description: 'Look into existing apps and identify key features',
            dueDate: '2025-05-20',
            priority: 'high',
            tags: ['research', 'planning'],
            subtasks: [],
            content: [
              { type: 'bullet', text: 'Check user reviews' },
              { type: 'bullet', text: 'Compare pricing models' },
            ]
          }
        ]
      },
      {
        id: 'board-2',
        title: 'In Progress',
        color: 'bg-yellow-500',
        order: 1,
        tasks: []
      },
      {
        id: 'board-3',
        title: 'Done',
        color: 'bg-green-500',
        order: 2,
        tasks: []
      }
    ];
  });
  
  // Save boards to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('kanbanBoards', JSON.stringify(boards));
  }, [boards]);

  // State for UI interactions
  const [dragging, setDragging] = useState(null);
  const [draggingBoard, setDraggingBoard] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(null);
  const [openTasks, setOpenTasks] = useState({}); // Corrected this line previously
  const [currentDate, setCurrentDate] = useState(new Date());
  const [datePickerPosition, setDatePickerPosition] = useState({ top: 0, left: 0 });
  const [editingTitle, setEditingTitle] = useState(null);
  const [editingBoardTitle, setEditingBoardTitle] = useState(null);
  const [collapsedBoards, setCollapsedBoards] = useState({});
  const [activeDropdown, setActiveDropdown] = useState(null);
  const dropdownRef = useRef(null); 

  // Color options for boards
  const boardColors = [
    'bg-red-500', 'bg-yellow-500', 'bg-green-500', 'bg-blue-500', 
    'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-gray-500'
  ];

  // Priority colors
  const priorityColors = {
    high: 'bg-red-100 text-red-800 border-red-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    low: 'bg-green-100 text-green-800 border-green-300'
  };

  // Define breakpoints for masonry columns (ADD THIS OBJECT HERE)
  const breakpointColumnsObj = {
    default: 4,   // Default to 4 columns on very large screens (2xl and up)
    2000: 4,      // For screens >= 2000px, 4 columns
    1536: 3,      // For screens >= 1536px (2xl breakpoint), 3 columns
    1280: 3,      // For screens >= 1280px (xl breakpoint), 3 columns
    1024: 2,      // For screens >= 1024px, 2 columns
    768: 2,       // For screens >= 768px (md breakpoint), 2 columns
    640: 2,       // For screens >= 640px (sm breakpoint), 2 columns
    500: 1        // For screens below 500px, 1 column (adjust as needed)
  };

  // Toggle dropdown menu
  const toggleDropdown = (boardId, event) => {
    event.stopPropagation();
    console.log('Clicked dropdown for board:', boardId); // Add this
    setActiveDropdown(activeDropdown === boardId ? null : boardId);
    console.log('New active dropdown state:', activeDropdown === boardId ? null : boardId); // Add this
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // If a dropdown is active AND the click is outside the dropdown's ref element
      // AND the click is not on the button that opened the dropdown (to prevent immediate closing)
      if (
        activeDropdown &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !event.target.closest(`[data-dropdown-button="${activeDropdown}"]`) // Check if click is on the button that opened it
      ) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeDropdown]); // Dependency array is correct

  // Toggle board collapse
  const toggleBoardCollapse = (boardId) => {
    setCollapsedBoards(prev => ({
      ...prev,
      [boardId]: !prev[boardId]
    }));
  };

  // Apply visual styling for drag over
  const applyDragOverStyle = (e) => {
    const target = e.currentTarget;
    removeDragOverStyle(e);
    target.classList.add('bg-blue-50', 'border-blue-400', 'scale-[1.02]');
    target.style.borderStyle = 'dashed';
    target.style.borderWidth = '2px';
    target.style.transition = 'all 0.2s ease';
  };
  
  // Remove visual styling for drag over
  const removeDragOverStyle = (e) => {
    const target = e.currentTarget;
    target.classList.remove('bg-blue-50', 'border-blue-400', 'scale-[1.02]');
    target.style.borderStyle = '';
    target.style.borderWidth = '';
  };

  // Board drag handlers
  const handleBoardDragStart = (e, boardId) => {
    e.stopPropagation();
    setDraggingBoard(boardId); // This is for visual feedback (opacity)
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', boardId); // <--- IMPORTANT: Set the board ID here
    e.currentTarget.classList.add('opacity-50');
  };

  const handleBoardDragEnd = (e) => {
    e.currentTarget.classList.remove('opacity-50');
    setDraggingBoard(null);
  };

  const handleBoardDragOver = (e) => {
  e.preventDefault(); // Essential to allow a drop
  e.stopPropagation();
  // You could add visual feedback here if you want, e.g., applyDragOverStyle(e);
  };

  // Task drag handlers
  const handleDragStart = (e, boardId, taskId, isSubtask = false, parentTaskId = null) => {
    e.stopPropagation();
    const dragData = {
      boardId,
      taskId,
      isSubtask,
      parentTaskId
    };
    setDragging(dragData);
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.currentTarget.classList.add('opacity-50', 'rotate-1');
  };
  // New function for dropping boards
  const handleBoardDrop = (e, targetBoardId) => {
    e.preventDefault();
    e.stopPropagation();

    // Get the ID of the board being dragged from the dataTransfer
    const sourceBoardId = e.dataTransfer.getData('text/plain');

    // If no board ID was transferred, it's not a valid board drag
    if (!sourceBoardId) {
        setDraggingBoard(null); // Ensure dragging state is reset
        return;
    }

    // Prevent dropping a board onto itself
    if (sourceBoardId === targetBoardId) {
      setDraggingBoard(null); // Reset dragging state
      return;
    }

    const newBoards = [...boards];
    const draggedBoardIndex = newBoards.findIndex(b => b.id === sourceBoardId);
    const targetBoardIndex = newBoards.findIndex(b => b.id === targetBoardId);

    if (draggedBoardIndex === -1 || targetBoardIndex === -1) {
      console.error("Board not found during drop:", sourceBoardId, targetBoardId);
      setDraggingBoard(null);
      return;
    }

    // Perform the reordering
    const [draggedBoard] = newBoards.splice(draggedBoardIndex, 1);
    newBoards.splice(targetBoardIndex, 0, draggedBoard);

    // Update order property (good practice for persistence and consistent sorting)
    newBoards.forEach((board, index) => {
      board.order = index;
    });

    setBoards(newBoards); // Update state to trigger re-render by Masonry
    setDraggingBoard(null); // Reset dragging state
  };
  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('opacity-50', 'rotate-1');
    setDragging(null);
    
    document.querySelectorAll('.bg-blue-50').forEach(el => {
      el.classList.remove('bg-blue-50', 'border-blue-400', 'scale-[1.02]');
      el.style.borderStyle = '';
      el.style.borderWidth = '';
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    applyDragOverStyle(e);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    removeDragOverStyle(e);
  };

  const handleDrop = (e, targetBoardId, targetTaskId = null) => {
    e.preventDefault();
    e.stopPropagation();
    removeDragOverStyle(e);
    
    try {
      const jsonData = e.dataTransfer.getData('application/json');
      if (!jsonData) return;
      
      const dragData = JSON.parse(jsonData);
      const { boardId: sourceBoardId, taskId: sourceTaskId, isSubtask, parentTaskId } = dragData;
      
      if (targetTaskId === sourceTaskId) return;
      
      const newBoards = JSON.parse(JSON.stringify(boards));
      
      const findAndRemoveTask = (boardTasks, taskId) => {
        for (let i = 0; i < boardTasks.length; i++) {
          if (boardTasks[i].id === taskId) {
            return boardTasks.splice(i, 1)[0];
          }
          const fromSubtasks = findAndRemoveTask(boardTasks[i].subtasks, taskId);
          if (fromSubtasks) return fromSubtasks;
        }
        return null;
      };
      
      const isAncestorOf = (potentialAncestorId, descendantId) => {
        if (potentialAncestorId === descendantId) return true;
        
        for (const board of newBoards) {
          const searchInTasks = (tasks, targetId) => {
            for (const task of tasks) {
              if (task.id === potentialAncestorId) {
                const hasDescendant = (subtasks) => {
                  for (const subtask of subtasks) {
                    if (subtask.id === descendantId) return true;
                    if (hasDescendant(subtask.subtasks)) return true;
                  }
                  return false;
                };
                return hasDescendant(task.subtasks);
              }
              if (searchInTasks(task.subtasks, targetId)) return true;
            }
            return false;
          };
          
          if (searchInTasks(board.tasks, potentialAncestorId)) return true;
        }
        return false;
      };
      
      if (targetTaskId && isAncestorOf(sourceTaskId, targetTaskId)) return;
      
      const sourceBoardIndex = newBoards.findIndex(b => b.id === sourceBoardId);
      if (sourceBoardIndex === -1) return;
      
      const taskToMove = findAndRemoveTask(newBoards[sourceBoardIndex].tasks, sourceTaskId);
      if (!taskToMove) return;
      
      const targetBoardIndex = newBoards.findIndex(b => b.id === targetBoardId);
      if (targetBoardIndex === -1) return;
      
      if (targetTaskId) {
        const addSubtask = (tasks, parentId, newSubtask) => {
          for (let i = 0; i < tasks.length; i++) {
            if (tasks[i].id === parentId) {
              tasks[i].subtasks.push(newSubtask);
              return true;
            }
            if (addSubtask(tasks[i].subtasks, parentId, newSubtask)) return true;
          }
          return false;
        };
        
        addSubtask(newBoards[targetBoardIndex].tasks, targetTaskId, taskToMove);
      } else {
        newBoards[targetBoardIndex].tasks.push(taskToMove);
      }
      
      setBoards(newBoards);
      
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  };

  // Toggle task title editing
  const toggleTaskTitleEditing = (taskId, event) => {
    if (event) {
      event.stopPropagation();
    }
    setEditingTitle(editingTitle === taskId ? null : taskId);
  };
  
  // Update task title
  const updateTaskTitle = (boardId, taskId, newTitle, event) => {
    if (event) {
      event.stopPropagation();
    }
    
    const newBoards = [...boards];
    
    const updateTitle = (tasks, targetId, title) => {
      for (let i = 0; i < tasks.length; i++) {
        if (tasks[i].id === targetId) {
          tasks[i].title = title;
          return true;
        }
        if (updateTitle(tasks[i].subtasks, targetId, title)) {
          return true;
        }
      }
      return false;
    };
    
    const boardIndex = newBoards.findIndex(board => board.id === boardId);
    updateTitle(newBoards[boardIndex].tasks, taskId, newTitle);
    
    setBoards(newBoards);
    setEditingTitle(null);
  };
  
  // Toggle board title editing
  const toggleBoardTitleEditing = (boardId, event) => {
    if (event) {
      event.stopPropagation();
    }
    setEditingBoardTitle(editingBoardTitle === boardId ? null : boardId);
  };
  
  // Update board title
  const updateBoardTitle = (boardId, newTitle, event) => {
    if (event) {
      event.stopPropagation();
    }
    
    const newBoards = [...boards];
    const boardIndex = newBoards.findIndex(board => board.id === boardId);
    newBoards[boardIndex].title = newTitle;
    
    setBoards(newBoards);
    setEditingBoardTitle(null);
  };

  // Update board color
  const updateBoardColor = (boardId, newColor) => {
    const newBoards = [...boards];
    const boardIndex = newBoards.findIndex(board => board.id === boardId);
    newBoards[boardIndex].color = newColor;
    setBoards(newBoards);
    setActiveDropdown(null);
  };

  // Delete board
  const deleteBoard = (boardId) => {
    if (window.confirm('Are you sure you want to delete this board?')) {
      const newBoards = boards.filter(board => board.id !== boardId);
      setBoards(newBoards);
      setActiveDropdown(null);
    }
  };

  // Delete task
  const deleteTask = (boardId, taskId) => {
    const newBoards = [...boards];
    
    const removeTask = (tasks) => {
      for (let i = 0; i < tasks.length; i++) {
        if (tasks[i].id === taskId) {
          tasks.splice(i, 1);
          return true;
        }
        if (removeTask(tasks[i].subtasks)) return true;
      }
      return false;
    };
    
    const boardIndex = newBoards.findIndex(board => board.id === boardId);
    removeTask(newBoards[boardIndex].tasks);
    
    setBoards(newBoards);
  };

  // Delete content item from task
  const deleteContentItem = (taskId, boardId, contentIndex) => {
    const newBoards = [...boards];
    
    const removeContentFromTask = (tasks, targetId, index) => {
      for (let i = 0; i < tasks.length; i++) {
        if (tasks[i].id === targetId) {
          tasks[i].content.splice(index, 1);
          return true;
        }
        if (removeContentFromTask(tasks[i].subtasks, targetId, index)) {
          return true;
        }
      }
      return false;
    };
    
    const boardIndex = newBoards.findIndex(board => board.id === boardId);
    removeContentFromTask(newBoards[boardIndex].tasks, taskId, contentIndex);
    
    setBoards(newBoards);
  };
  // Toggle date picker
  const toggleDatePicker = (e, taskId) => {
    e.stopPropagation();
    
    if (showDatePicker === taskId) {
      setShowDatePicker(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      setDatePickerPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX - 150,
      });
      setShowDatePicker(taskId);
    }
  };

  // Render date picker component
  const renderDatePicker = (taskId, boardId) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const years = [2024, 2025, 2026, 2027];
    
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const firstDay = new Date(year, month, 1).getDay();
    
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const emptySlots = Array.from({ length: firstDay }, (_, i) => null);
    const allDays = [...emptySlots, ...daysArray];
    
    return (
      <div 
        className="absolute bg-white shadow-xl rounded-lg p-4 z-50 w-72 border border-gray-200"
        style={{ top: datePickerPosition.top + 'px', left: datePickerPosition.left + 'px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <select 
            className="p-2 border rounded-md text-sm"
            value={month}
            onChange={(e) => setCurrentDate(new Date(year, parseInt(e.target.value), 1))}
          >
            {months.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
          
          <select 
            className="p-2 border rounded-md text-sm"
            value={year}
            onChange={(e) => setCurrentDate(new Date(parseInt(e.target.value), month, 1))}
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
            <div key={day} className="text-xs font-bold text-gray-500">{day}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {allDays.map((day, i) => (
            <div key={i} className="h-8">
              {day && (
                <button 
                  className="w-full h-full rounded hover:bg-blue-100 text-sm transition-colors"
                  onClick={() => {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    setDueDate(taskId, boardId, dateStr);
                  }}
                >
                  {day}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Set due date
  const setDueDate = (taskId, boardId, date) => {
    const newBoards = [...boards];
    
    const updateTaskDate = (tasks, targetId, newDate) => {
      for (let i = 0; i < tasks.length; i++) {
        if (tasks[i].id === targetId) {
          tasks[i].dueDate = newDate;
          return true;
        }
        if (updateTaskDate(tasks[i].subtasks, targetId, newDate)) {
          return true;
        }
      }
      return false;
    };
    
    const boardIndex = newBoards.findIndex(board => board.id === boardId);
    updateTaskDate(newBoards[boardIndex].tasks, taskId, date);
    
    setBoards(newBoards);
    setShowDatePicker(null);
  };

  // Toggle task details
  const toggleTaskDetails = (taskId) => {
    setOpenTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  // Add new board
  const addNewBoard = () => {
    const newBoard = {
      id: `board-${Date.now()}`,
      title: 'New Board',
      color: boardColors[boards.length % boardColors.length],
      order: boards.length,
      tasks: []
    };
    setBoards([...boards, newBoard]);
  };

  // Add new task
  const addNewTask = (boardId) => {
    const newTask = {
      id: `task-${Date.now()}`,
      title: 'New Task',
      description: 'Add description here',
      dueDate: '',
      priority: 'medium',
      tags: [],
      subtasks: [],
      content: []
    };
    
    const newBoards = [...boards];
    const boardIndex = newBoards.findIndex(board => board.id === boardId);
    newBoards[boardIndex].tasks.push(newTask);
    setBoards(newBoards);
    setOpenTasks(prev => ({
      ...prev,
      [newTask.id]: true
    }));
  };

  // Add new content item to task
  const addContentItem = (taskId, boardId, type) => {
    const newBoards = [...boards];
    
    const addContentToTask = (tasks, targetId, contentType) => {
      for (let i = 0; i < tasks.length; i++) {
        if (tasks[i].id === targetId) {
          tasks[i].content.push({
            type: contentType,
            text: contentType === 'bullet' ? 'New bullet point' : 'New numbered item'
          });
          return true;
        }
        if (addContentToTask(tasks[i].subtasks, targetId, contentType)) {
          return true;
        }
      }
      return false;
    };
    
    const boardIndex = newBoards.findIndex(board => board.id === boardId);
    addContentToTask(newBoards[boardIndex].tasks, taskId, type);
    
    setBoards(newBoards);
  };

  // Update task priority
  const updateTaskPriority = (boardId, taskId, priority) => {
    const newBoards = [...boards];
    
    const updatePriority = (tasks, targetId, newPriority) => {
      for (let i = 0; i < tasks.length; i++) {
        if (tasks[i].id === targetId) {
          tasks[i].priority = newPriority;
          return true;
        }
        if (updatePriority(tasks[i].subtasks, targetId, newPriority)) {
          return true;
        }
      }
      return false;
    };
    
    const boardIndex = newBoards.findIndex(board => board.id === boardId);
    updatePriority(newBoards[boardIndex].tasks, taskId, priority);
    
    setBoards(newBoards);
  };

  // Render a single task
  const renderTask = (task, boardId, isSubtask = false, parentTaskId = null, nestingLevel = 0) => {
    const isOpen = openTasks[task.id] === true;
    const isEditing = editingTitle === task.id;
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
    
    return (
      <div 
        key={task.id}
        className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 mb-3 ${isSubtask ? `ml-${Math.min(nestingLevel * 4, 12)} border-l-4 border-indigo-300` : ''}`}
        draggable="true"
        onDragStart={(e) => {
          e.stopPropagation();
          handleDragStart(e, boardId, task.id, isSubtask, parentTaskId);
        }}
        onDragEnd={(e) => {
          e.stopPropagation();
          handleDragEnd(e);
        }}
        onDragOver={(e) => {
          e.stopPropagation();
          handleDragOver(e);
        }}
        onDragLeave={(e) => {
          e.stopPropagation();
          removeDragOverStyle(e);
        }}
        onDrop={(e) => {
          e.stopPropagation();
          handleDrop(e, boardId, task.id);
        }}
      >
        <div className="p-4 cursor-pointer" onClick={() => toggleTaskDetails(task.id)}>
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1 flex items-start">
              {isEditing ? (
                <div className="flex-1 flex items-center" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    className="flex-1 p-2 text-sm border rounded-md mr-2"
                    value={task.title}
                    onChange={(e) => {
                      const newBoards = [...boards];
                      const updateTaskTitle = (tasks, targetId, newTitle) => {
                        for (let i = 0; i < tasks.length; i++) {
                          if (tasks[i].id === targetId) {
                            tasks[i].title = newTitle;
                            return true;
                          }
                          if (updateTaskTitle(tasks[i].subtasks, targetId, newTitle)) return true;
                        }
                        return false;
                      };
                      const boardIndex = newBoards.findIndex(board => board.id === boardId);
                      updateTaskTitle(newBoards[boardIndex].tasks, task.id, e.target.value);
                      setBoards(newBoards);
                    }}
                    autoFocus
                    onBlur={(e) => updateTaskTitle(boardId, task.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        updateTaskTitle(boardId, task.id, e.target.value);
                      }
                    }}
                  />
                  <button 
                    className="p-1 text-gray-500 hover:text-green-600 transition-colors"
                    onClick={(e) => updateTaskTitle(boardId, task.id, task.title, e)}
                  >
                    <Save size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="font-medium text-gray-800 mr-2">{task.title}</h3>
                  <button 
                    className="text-gray-400 hover:text-blue-600 ml-1 transition-colors"
                    onClick={(e) => toggleTaskTitleEditing(task.id, e)}
                  >
                    <Edit2 size={14} />
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button 
                className="text-gray-400 hover:text-red-600 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteTask(boardId, task.id);
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 flex-wrap">
            {task.priority && (
              <span className={`text-xs px-2 py-1 rounded-full border ${priorityColors[task.priority]}`}>
                {task.priority}
              </span>
            )}
            {task.dueDate && (
              <div className="flex items-center space-x-1">
                <Calendar size={14} className={isOverdue ? 'text-red-500' : 'text-gray-500'} />
                <span className={`text-xs px-2 py-1 rounded ${isOverdue ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'}`}>
                  {new Date(task.dueDate).toLocaleDateString()}
                </span>
              </div>
            )}
            {task.subtasks.length > 0 && (
              <span className="text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-800">
                {task.subtasks.length} subtasks
              </span>
            )}
          </div>
        </div>
        
        {showDatePicker === task.id && renderDatePicker(task.id, boardId)}
        
        {isOpen && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="mt-3">
              <textarea 
                className="w-full p-3 border rounded-md text-sm resize-none"
                value={task.description}
                onChange={(e) => {
                  const newBoards = [...boards];
                  const updateTaskDescription = (tasks, targetId, newDescription) => {
                    for (let i = 0; i < tasks.length; i++) {
                      if (tasks[i].id === targetId) {
                        tasks[i].description = newDescription;
                        return true;
                      }
                      if (updateTaskDescription(tasks[i].subtasks, targetId, newDescription)) {
                        return true;
                      }
                    }
                    return false;
                  };
                  
                  const boardIndex = newBoards.findIndex(board => board.id === boardId);
                  updateTaskDescription(newBoards[boardIndex].tasks, task.id, e.target.value);
                  setBoards(newBoards);
                }}
                rows="3"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            
            <div className="mt-3 flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Priority:</label>
              <select
                className="p-2 border rounded-md text-sm"
                value={task.priority || 'medium'}
                onChange={(e) => updateTaskPriority(boardId, task.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              
              <button 
                className="ml-auto text-sm flex items-center px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
                onClick={(e) => toggleDatePicker(e, task.id)}
              >
                <Calendar size={14} className="mr-1" />
                Set Date
              </button>
            </div>
            
            <div className="mt-4 max-h-40 overflow-y-auto">
              {task.content.map((item, index) => (
                <div key={index} className="flex items-start mb-2">
                  <span className="mr-2 text-gray-500 flex-shrink-0">
                    {item.type === 'bullet' ? '•' : `${index + 1}.`}
                  </span>
                  <input 
                    type="text"
                    className="flex-1 p-2 border rounded-md text-sm"
                    value={item.text}
                    onChange={(e) => {
                      const newBoards = [...boards];
                      const updateTaskContent = (tasks, targetId, index, newText) => {
                        for (let i = 0; i < tasks.length; i++) {
                          if (tasks[i].id === targetId) {
                            tasks[i].content[index].text = newText;
                            return true;
                          }
                          if (updateTaskContent(tasks[i].subtasks, targetId, index, newText)) {
                            return true;
                          }
                        }
                        return false;
                      };
                      
                      const boardIndex = newBoards.findIndex(board => board.id === boardId);
                      updateTaskContent(newBoards[boardIndex].tasks, task.id, index, e.target.value);
                      setBoards(newBoards);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              ))}
            </div>
            
            <div className="flex space-x-2 mt-3">
              <button 
                className="text-xs flex items-center px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  addContentItem(task.id, boardId, 'bullet');
                }}
              >
                <List size={12} className="mr-1" />
                Bullet
              </button>
              <button 
                className="text-xs flex items-center px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  addContentItem(task.id, boardId, 'numbered');
                }}
              >
                <AlignLeft size={12} className="mr-1" />
                Numbered
              </button>
            </div>
            
            {task.subtasks.length > 0 && (
              <div className="mt-4 max-h-64 overflow-y-auto">
                <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Subtasks</h4>
                {task.subtasks.map(subtask => renderTask(subtask, boardId, true, task.id, nestingLevel + 1))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Sort boards by order
  const sortedBoards = [...boards].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen p-6">
      <header className="bg-white shadow-sm rounded-xl p-6 mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Kanban Board</h1>
          <div className="flex items-center space-x-3">
            <button
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
              onClick={addNewBoard}
            >
              <Plus size={20} className="mr-1" />
              New Board
            </button>
          </div>
        </div>
      </header>
      
      {/* REPLACE THIS DIV WITH MASONRY COMPONENT */}
      <Masonry
        breakpointCols={breakpointColumnsObj}
        className="my-masonry-grid"
        columnClassName="my-masonry-grid_column"
      >
        {sortedBoards.map(board => (
          <div
            key={board.id}
            data-board-id={board.id}
            className="bg-white rounded-xl shadow-sm overflow-hidden"
            draggable="true"
            onDragStart={(e) => handleBoardDragStart(e, board.id)}
            onDragEnd={handleBoardDragEnd} // This just removes opacity
            onDragOver={(e) => {
              e.preventDefault(); // Allow drop
              e.stopPropagation();
              // Optional: add visual feedback for board drag over here if desired
            }}
            onDrop={(e) => {
              e.preventDefault(); // Allow drop
              e.stopPropagation();

              if (draggingBoard) { // If a BOARD is being dragged
                handleBoardDrop(e, board.id); // Call the specific board drop handler
              } else if (dragging) { // If a TASK is being dragged
                handleDrop(e, board.id, null); // Handle dropping a task onto this board (no specific task)
              }
              // Remove visual feedback from handleDragOver if you added it
            }}
          >
            <div className={`${board.color} bg-opacity-90 p-4 cursor-move`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <GripVertical size={20} className="text-white opacity-60" />
                  <button
                    className="text-white hover:bg-white hover:bg-opacity-20 rounded p-1 transition-colors"
                    onClick={() => toggleBoardCollapse(board.id)}
                  >
                    {collapsedBoards[board.id] ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                  </button>
                  {editingBoardTitle === board.id ? (
                    <div className="flex items-center">
                      <input
                        type="text"
                        className="px-2 py-1 text-gray-800 bg-white rounded mr-2"
                        value={board.title}
                        onChange={(e) => {
                          const newBoards = [...boards];
                          const boardIndex = newBoards.findIndex(b => b.id === board.id);
                          newBoards[boardIndex].title = e.target.value;
                          setBoards(newBoards);
                        }}
                        autoFocus
                        onBlur={(e) => updateBoardTitle(board.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateBoardTitle(board.id, e.target.value);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button 
                        className="text-white hover:text-gray-200"
                        onClick={(e) => updateBoardTitle(board.id, board.title, e)}
                      >
                        <Save size={20} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <h2 className="font-bold text-white text-lg">{board.title}</h2>
                      <button 
                        className="text-white hover:text-gray-200 ml-2"
                        onClick={(e) => toggleBoardTitleEditing(board.id, e)}
                      >
                        <Edit2 size={16} />
                      </button>
                    </>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="bg-white bg-opacity-30 text-white text-sm px-2 py-1 rounded-full">
                    {board.tasks.length}
                  </span>
                  <div className="relative dropdown-menu">
                    <button 
                      className="text-white hover:text-gray-200"
                      onClick={(e) => toggleDropdown(board.id, e)}
                      data-dropdown-button={board.id} // <--- ADD THIS LINE

                    >
                      <MoreVertical size={20} />
                    </button>
                    {activeDropdown === board.id && (
                      <div 
                      ref={dropdownRef}
                      className="absolute right-0 top-8 bg-white rounded-lg shadow-lg p-3 z-20 min-w-[200px]">
                        <p className="text-xs text-gray-500 mb-2">Board Color</p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {boardColors.map(color => (
                            <button
                              key={color}
                              className={`w-8 h-8 rounded ${color} hover:scale-110 transition-transform border-2 ${board.color === color ? 'border-gray-800' : 'border-transparent'}`}
                              onClick={() => updateBoardColor(board.id, color)}
                            />
                          ))}
                        </div>
                        <hr className="my-2" />
                        <button
                          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                          onClick={() => deleteBoard(board.id)}
                        >
                          <Trash2 size={16} className="inline mr-2" />
                          Delete Board
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {!collapsedBoards[board.id] && (
              <div className="p-4">
                <div className=""> {/* No height constraints, no internal scrollbar */}
                                {board.tasks.map(task => renderTask(task, board.id))}
                </div>
                
                <button 
                  className="mt-4 w-full p-3 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:border-gray-400 transition-all"
                  onClick={() => addNewTask(board.id)}
                >
                  <Plus size={20} className="mr-2" />
                  Add Task
                </button>
              </div>
            )}
          </div>
        ))}
      </Masonry>
    </div>
  );
};

export default KanbanApp;