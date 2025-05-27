import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Calendar, Plus, X, List, CheckSquare, AlignLeft, Edit2, Save, Trash2, MoreVertical, ChevronDown, ChevronRight, Clock, Tag, User, GripVertical } from 'lucide-react';

// Simple Masonry Component (since we can't use localStorage)
const SimpleMasonry = ({ children, breakpointCols, className, columnClassName }) => {
  const [columns, setColumns] = useState(3);

  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      let newColumns = breakpointCols.default;
      
      Object.keys(breakpointCols).forEach(breakpoint => {
        if (breakpoint !== 'default' && width >= parseInt(breakpoint)) {
          newColumns = breakpointCols[breakpoint];
        }
      });
      
      setColumns(newColumns);
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, [breakpointCols]);

  const distributeItems = (items, columnCount) => {
    const cols = Array.from({ length: columnCount }, () => []);
    items.forEach((item, index) => {
      cols[index % columnCount].push(item);
    });
    return cols;
  };

  const columnData = distributeItems(children, columns);

  return (
    <div className={className} style={{ display: 'flex', marginLeft: '-1.5rem' }}>
      {columnData.map((columnItems, index) => (
        <div key={index} className={columnClassName} style={{ paddingLeft: '1.5rem', flex: 1 }}>
          {columnItems.map((item, itemIndex) => (
            <div key={itemIndex} style={{ marginBottom: '1.5rem' }}>
              {item}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

// Function to get initial boards from localStorage or default
const getInitialBoards = () => {
  try {
    const storedBoards = localStorage.getItem('kanbanBoards');
    if (storedBoards) {
      return JSON.parse(storedBoards);
    }
  } catch (error) {
    console.error("Failed to parse boards from localStorage:", error);
    // Fallback to default if localStorage is corrupted
  }

  // Default boards if nothing in localStorage or error
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
};


const KanbanApp = () => {
  // Define a list of colors for new boards
  const randomBoardColors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-lime-500',
    'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500',
    'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500',
    'bg-pink-500', 'bg-rose-500', 'bg-gray-500', 'bg-slate-500', 'bg-zinc-500'
  ];

  // Initialize boards - using getInitialBoards to load from localStorage
  const [boards, setBoards] = useState(getInitialBoards);

  // --- NEW: Effect to save boards to localStorage whenever they change ---
  useEffect(() => {
    try {
      localStorage.setItem('kanbanBoards', JSON.stringify(boards));
    } catch (error) {
      console.error("Failed to save boards to localStorage:", error);
    }
  }, [boards]); // Dependency array: runs whenever 'boards' state changes
  // --- END NEW ---

  // State for UI interactions
  const [dragging, setDragging] = useState(null);
  const [draggingBoard, setDraggingBoard] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(null); // Stores { taskId, boardId } or null
  const [openTasks, setOpenTasks] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [datePickerPosition, setDatePickerPosition] = useState({ top: 0, left: 0 }); // Reintroduced for fixed positioning
  const [editingTitle, setEditingTitle] = useState(null);
  const [editingBoardTitle, setEditingBoardTitle] = useState(null);
  const [collapsedBoards, setCollapsedBoards] = useState({});
  const [activeDropdown, setActiveDropdown] = useState(null);
  const dropdownRef = useRef(null);
  const datePickerRef = useRef(null); // New ref for date picker

  // Priority colors
  const priorityColors = {
    high: 'bg-red-100 text-red-800 border-red-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    low: 'bg-green-100 text-green-800 border-green-300'
  };

  // Define breakpoints for masonry columns
  const breakpointColumnsObj = {
    default: 4,
    2000: 4,
    1536: 3,
    1280: 3,
    1024: 2,
    768: 2,
    640: 2,
    500: 1
  };

  // Toggle dropdown menu
  const toggleDropdown = (boardId, event) => {
    event.stopPropagation(); // Prevent click from propagating to parent elements

    if (activeDropdown === boardId) {
      setActiveDropdown(null);
    } else {
      setActiveDropdown(boardId);
    }
  };

  // Close dropdowns and date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close board dropdown
      if (
        activeDropdown &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !event.target.closest(`[data-dropdown-button="${activeDropdown}"]`)
      ) {
        setActiveDropdown(null);
      }

      // Close date picker
      if (
        showDatePicker && // Check if any date picker is open
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target) &&
        !event.target.closest('.date-picker-trigger') // Class on the button that opens the date picker
      ) {
        setShowDatePicker(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeDropdown, showDatePicker]); // Added showDatePicker to dependencies

  // Effect to reposition date picker on scroll or resize
  useEffect(() => {
    if (!showDatePicker) return; // Only run if a date picker is open

    const updatePosition = () => {
      // Find the trigger button using its data-task-id
      const triggerButton = document.querySelector(`.date-picker-trigger[data-task-id="${showDatePicker.taskId}"]`);
      if (triggerButton) {
        const rect = triggerButton.getBoundingClientRect();
        let top = rect.bottom + 5; // 5px below the button
        const pickerWidth = 288; // w-72 = 288px
        const pickerHeight = 300; // Approximate height of the date picker

        // Align right edge of picker with right edge of button
        let left = rect.right - pickerWidth; 

        // Ensure picker stays within viewport
        if (left < 10) left = 10; // Don't go too far left
        if (left + pickerWidth > window.innerWidth - 10) {
          left = window.innerWidth - pickerWidth - 10; // Don't go too far right
        }
        if (top + pickerHeight > window.innerHeight - 10) {
          top = rect.top - pickerHeight - 5; // Position above the button if not enough space below
        }

        setDatePickerPosition({ top, left });
      } else {
        // If the trigger button is no longer in the DOM (e.g., task deleted or collapsed)
        setShowDatePicker(null);
      }
    };

    // Initial position update when picker opens
    updatePosition();

    // Add event listeners for dynamic repositioning
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true); // Use capture phase for scroll events
    
    return () => {
      // Clean up event listeners
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [showDatePicker]); // Re-run this effect when showDatePicker changes

  // Toggle board collapse
  const toggleBoardCollapse = (boardId) => {
    setCollapsedBoards(prev => ({
      ...prev,
      [boardId]: !prev[boardId]
    }));
  };

  // Board drag handlers - now only for the grip area
  const handleBoardDragStart = (e, boardId) => {
    console.log('Starting board drag:', boardId);
    setDraggingBoard(boardId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('board/id', boardId);
    
    // Add visual feedback
    setTimeout(() => {
      const boardElement = document.querySelector(`[data-board-id="${boardId}"]`);
      if (boardElement) {
        boardElement.style.opacity = '0.5';
        boardElement.style.transform = 'rotate(2deg)';
      }
    }, 0);
  };

  const handleBoardDragEnd = (e, boardId) => {
    console.log('Ending board drag:', boardId);
    setDraggingBoard(null);
    
    // Remove visual feedback
    const boardElement = document.querySelector(`[data-board-id="${boardId}"]`);
    if (boardElement) {
      boardElement.style.opacity = '';
      boardElement.style.transform = '';
    }
  };

  const handleBoardDragOver = (e) => {
    if (draggingBoard) {
      e.preventDefault();
      e.stopPropagation();
      
      // Add visual feedback
      e.currentTarget.style.transform = 'scale(1.02)';
      e.currentTarget.style.boxShadow = '0 8px 16px rgba(59, 130, 246, 0.3)';
      e.currentTarget.style.border = '2px dashed rgb(59, 130, 246)';
    }
  };

  const handleBoardDragLeave = (e) => {
    if (draggingBoard) {
      // Remove visual feedback
      e.currentTarget.style.transform = '';
      e.currentTarget.style.boxShadow = '';
      e.currentTarget.style.border = '';
    }
  };

  const handleBoardDrop = (e, targetBoardId) => {
    if (!draggingBoard) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Remove visual feedback
    e.currentTarget.style.transform = '';
    e.currentTarget.style.boxShadow = '';
    e.currentTarget.style.border = '';

    const sourceBoardId = e.dataTransfer.getData('board/id');
    
    if (!sourceBoardId || sourceBoardId === targetBoardId) {
      setDraggingBoard(null);
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

    // Reorder boards
    const [draggedBoard] = newBoards.splice(draggedBoardIndex, 1);
    newBoards.splice(targetBoardIndex, 0, draggedBoard);

    // Update order property
    newBoards.forEach((board, index) => {
      board.order = index;
    });

    console.log('Updated board order:', newBoards.map(b => ({ id: b.id, title: b.title, order: b.order })));
    
    setBoards(newBoards);
    setDraggingBoard(null);
  };

  // Task drag handlers (keeping existing logic)
  const handleTaskDragStart = (e, boardId, taskId, isSubtask = false, parentTaskId = null) => {
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

  const handleTaskDragEnd = (e) => {
    e.currentTarget.classList.remove('opacity-50', 'rotate-1');
    setDragging(null);
    
    // Clean up any drag feedback
    document.querySelectorAll('.bg-blue-50').forEach(el => {
      el.classList.remove('bg-blue-50', 'border-blue-400', 'scale-[1.02]');
      el.style.borderStyle = '';
      el.style.borderWidth = '';
    });
  };

  const handleTaskDragOver = (e) => {
    if (dragging) {
      e.preventDefault();
      e.stopPropagation();
      
      const target = e.currentTarget;
      target.classList.add('bg-blue-50', 'border-blue-400', 'scale-[1.02]');
      target.style.borderStyle = 'dashed';
      target.style.borderWidth = '2px';
    }
  };

  const handleTaskDragLeave = (e) => {
    if (dragging) {
      const target = e.currentTarget;
      target.classList.remove('bg-blue-50', 'border-blue-400', 'scale-[1.02]');
      target.style.borderStyle = '';
      target.style.borderWidth = '';
    }
  };

  const handleTaskDrop = (e, targetBoardId, targetTaskId = null) => {
    if (!dragging) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Remove visual feedback
    const target = e.currentTarget;
    target.classList.remove('bg-blue-50', 'border-blue-400', 'scale-[1.02]');
    target.style.borderStyle = '';
    target.style.borderWidth = '';
    
    try {
      const jsonData = e.dataTransfer.getData('application/json');
      if (!jsonData) return;
      
      const dragData = JSON.parse(jsonData);
      const { boardId: sourceBoardId, taskId: sourceTaskId, isSubtask, parentTaskId } = dragData;
      
      if (targetTaskId === sourceTaskId) return;
      
      const newBoards = JSON.parse(JSON.stringify(boards));
      
      // Find and remove task logic (keeping existing)
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
      
      const sourceBoardIndex = newBoards.findIndex(b => b.id === sourceBoardId);
      if (sourceBoardIndex === -1) return;
      
      const taskToMove = findAndRemoveTask(newBoards[sourceBoardIndex].tasks, sourceTaskId);
      if (!taskToMove) return;
      
      const targetBoardIndex = newBoards.findIndex(b => b.id === targetBoardId);
      if (targetBoardIndex === -1) return;
      
      if (targetTaskId) {
        // Add as subtask logic (keeping existing)
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
      console.error('Error handling task drop:', error);
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
          tasks[i].title = newTitle; 
          return true;
        }
        if (updateTitle(tasks[i].subtasks, targetId, title)) {
          return true;
        }
      }
      return false;
    };
    
    const boardIndex = newBoards.findIndex(board => board.id === boardId);
    if (boardIndex !== -1) { 
      updateTitle(newBoards[boardIndex].tasks, taskId, newTitle);
    }
    
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
    if (boardIndex !== -1) { 
      newBoards[boardIndex].title = newTitle;
    }
    
    setBoards(newBoards);
    setEditingBoardTitle(null);
  };

  // Delete board
  const deleteBoard = (boardId) => {
    if (window.confirm('Are you sure you want to delete this board?')) {
      const newBoards = boards.filter(board => board.id !== boardId);
      setBoards(newBoards);
      setActiveDropdown(null);
      setCollapsedBoards(prev => { 
        const newState = { ...prev };
        delete newState[boardId];
        return newState;
      });
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
    if (boardIndex !== -1) {
      removeTask(newBoards[boardIndex].tasks);
    }
    
    setBoards(newBoards);
    setOpenTasks(prev => { 
      const newState = { ...prev };
      delete newState[taskId];
      return newState;
    });
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
    if (boardIndex !== -1) {
      removeContentFromTask(newBoards[boardIndex].tasks, taskId, contentIndex);
    }
    
    setBoards(newBoards);
  };

  // Toggle date picker
  const toggleDatePicker = (e, taskId, boardId) => { // Now accepts boardId
    e.stopPropagation();
    if (showDatePicker && showDatePicker.taskId === taskId) {
      setShowDatePicker(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      let top = rect.bottom + 5; // 5px below the button
      const pickerWidth = 288; // w-72 = 288px
      const pickerHeight = 300; // Approximate height of the date picker

      // Align right edge of picker with right edge of button
      let left = rect.right - pickerWidth; 

      // Ensure picker stays within viewport
      if (left < 10) left = 10; // Don't go too far left
      if (left + pickerWidth > window.innerWidth - 10) {
        left = window.innerWidth - pickerWidth - 10; // Don't go too far right
      }
      if (top + pickerHeight > window.innerHeight - 10) {
        top = rect.top - pickerHeight - 5; // Position above the button if not enough space below
      }

      setDatePickerPosition({ top, left });
      setShowDatePicker({ taskId, boardId }); // Store both taskId and boardId
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
        ref={datePickerRef} // Attach ref here
        className="fixed bg-white shadow-xl rounded-lg p-4 z-50 w-72 border border-gray-200" // Changed to fixed
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
    if (boardIndex !== -1) {
      updateTaskDate(newBoards[boardIndex].tasks, taskId, date);
    }
    
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
    const randomColor = randomBoardColors[Math.floor(Math.random() * randomBoardColors.length)];
    const newBoard = {
      id: `board-${Date.now()}`,
      title: 'New Board',
      color: randomColor, // Assign a random color
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
    if (boardIndex !== -1) {
      newBoards[boardIndex].tasks.push(newTask);
    }
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
    if (boardIndex !== -1) {
      addContentToTask(newBoards[boardIndex].tasks, taskId, type);
    }
    
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
    if (boardIndex !== -1) {
      updatePriority(newBoards[boardIndex].tasks, taskId, priority);
    }
    
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
          handleTaskDragStart(e, boardId, task.id, isSubtask, parentTaskId);
        }}
        onDragEnd={(e) => {
          e.stopPropagation();
          handleTaskDragEnd(e);
        }}
        onDragOver={(e) => {
          e.stopPropagation();
          handleTaskDragOver(e);
        }}
        onDragLeave={(e) => {
          e.stopPropagation();
          handleTaskDragLeave(e);
        }}
        onDrop={(e) => {
          e.stopPropagation();
          handleTaskDrop(e, boardId, task.id);
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
                      const updateTaskTitleInState = (tasks, targetId, newTitle) => { 
                        for (let i = 0; i < tasks.length; i++) {
                          if (tasks[i].id === targetId) {
                            tasks[i].title = newTitle;
                            return true;
                          }
                          if (updateTaskTitleInState(tasks[i].subtasks, targetId, newTitle)) return true;
                        }
                        return false;
                      };
                      const boardIndex = newBoards.findIndex(board => board.id === boardId);
                      if (boardIndex !== -1) {
                        updateTaskTitleInState(newBoards[boardIndex].tasks, task.id, e.target.value);
                      }
                      setBoards(newBoards);
                    }}
                    autoFocus
                    onBlur={(e) => updateTaskTitle(boardId, task.id, e.target.value, e)} 
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        updateTaskTitle(boardId, task.id, e.target.value, e);
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
                  if (boardIndex !== -1) {
                    updateTaskDescription(newBoards[boardIndex].tasks, task.id, e.target.value);
                  }
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
              
              {/* Date picker trigger button */}
              <button 
                className="ml-auto text-sm flex items-center px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors date-picker-trigger"
                onClick={(e) => toggleDatePicker(e, task.id, boardId)} // Pass boardId
                data-task-id={task.id} // Add data-task-id for easy lookup
              >
                <Calendar size={14} className="mr-1" />
                Set Date
              </button>
              {/* Date picker component is now rendered globally, not here */}
            </div>
            
            <div className="mt-4 max-h-40 overflow-y-auto">
              {task.content.map((item, index) => (
                <div key={index} className="flex items-start mb-2 group">
                  <span className="mr-2 text-gray-500 flex-shrink-0 mt-2">
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
                      if (boardIndex !== -1) {
                        updateTaskContent(newBoards[boardIndex].tasks, task.id, index, e.target.value);
                      }
                      setBoards(newBoards);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button 
                    className="ml-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteContentItem(task.id, boardId, index);
                    }}
                    title="Delete item"
                  >
                    <X size={14} />
                  </button>
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
      
      <SimpleMasonry
        breakpointCols={breakpointColumnsObj}
        className="my-masonry-grid"
        columnClassName="my-masonry-grid_column"
      >
        {sortedBoards.map(board => (
          <div
            key={board.id}
            data-board-id={board.id}
            className="bg-white rounded-xl shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md"
            onDragOver={handleBoardDragOver}
            onDragLeave={handleBoardDragLeave}
            onDrop={(e) => {
              if (draggingBoard) {
                handleBoardDrop(e, board.id);
              } else if (dragging) {
                handleTaskDrop(e, board.id, null);
              }
            }}
          >
            <div 
              className={`${board.color} bg-opacity-90 p-4`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2 flex-1">
                  {/* Draggable grip area */}
                  <div
                    className="cursor-move flex items-center space-x-2"
                    draggable="true"
                    onDragStart={(e) => handleBoardDragStart(e, board.id)}
                    onDragEnd={(e) => handleBoardDragEnd(e, board.id)}
                  >
                    <GripVertical size={20} className="text-white opacity-60" />
                  </div>
                  
                  <button
                    className="text-white hover:bg-white hover:bg-opacity-20 rounded p-1 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBoardCollapse(board.id);
                    }}
                  >
                    {collapsedBoards[board.id] ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                  </button>
                  
                  {editingBoardTitle === board.id ? (
                    <div className="flex items-center flex-1">
                      <input
                        type="text"
                        className="px-2 py-1 text-gray-800 bg-white rounded mr-2 flex-1"
                        value={board.title}
                        onChange={(e) => {
                          const newBoards = [...boards];
                          const boardIndex = newBoards.findIndex(b => b.id === board.id);
                          if (boardIndex !== -1) {
                            newBoards[boardIndex].title = e.target.value;
                          }
                          setBoards(newBoards);
                        }}
                        autoFocus
                        onBlur={(e) => updateBoardTitle(board.id, e.target.value, e)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateBoardTitle(board.id, e.target.value, e);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button 
                        className="text-white hover:text-gray-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateBoardTitle(board.id, board.title, e);
                        }}
                      >
                        <Save size={20} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center flex-1">
                      <h2 className="font-bold text-white text-lg">{board.title}</h2>
                      <button 
                        className="text-white hover:text-gray-200 ml-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBoardTitleEditing(board.id, e);
                        }}
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="bg-white bg-opacity-30 text-white text-sm px-2 py-1 rounded-full">
                    {board.tasks.length}
                  </span>
                  {/* Changed to relative positioning for the dropdown */}
                  <div className="relative"> 
                    <button 
                      className="text-white hover:text-gray-200 p-1 rounded hover:bg-white hover:bg-opacity-20 transition-colors"
                      onClick={(e) => toggleDropdown(board.id, e)}
                      data-dropdown-button={board.id}
                    >
                      <MoreVertical size={20} />
                    </button>
                    {activeDropdown === board.id && (
                      <div 
                        ref={dropdownRef}
                        className="absolute bg-white rounded-lg shadow-xl border p-2 z-50 top-full right-0 mt-2 w-48" // Adjusted positioning and width
                        onClick={(e) => e.stopPropagation()} 
                      >
                        <div className="space-y-1">
                          {/* Delete Board Section */}
                          <div>
                            <button
                              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteBoard(board.id);
                              }}
                            >
                              <Trash2 size={16} className="mr-2" /> {/* Adjusted margin */}
                              <span>Delete Board</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {!collapsedBoards[board.id] && (
              <div className="p-4">
                <div className="">
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
      </SimpleMasonry>

      {/* Render date picker globally if showDatePicker is active */}
      {showDatePicker && renderDatePicker(showDatePicker.taskId, showDatePicker.boardId)}
    </div>
  );
};

export default KanbanApp;