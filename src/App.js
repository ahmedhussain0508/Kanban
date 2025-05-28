import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Calendar, Plus, X, List, CheckSquare, AlignLeft, Edit2, Save, Trash2, MoreVertical, ChevronDown, ChevronRight, Clock, Tag, User, GripVertical, Download, Upload } from 'lucide-react';

// Import storage helper with fallback
let ElectronStorage;
try {
  ElectronStorage = require('./storage').default;
} catch (error) {
  console.warn('Storage helper not available, using localStorage fallback');
  // Create a simple localStorage fallback
  ElectronStorage = {
    isElectron: false,
    async saveData(key, data) {
      try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
      } catch (error) {
        console.error('Failed to save to localStorage:', error);
        return false;
      }
    },
    async loadData(key) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      } catch (error) {
        console.error('Failed to load from localStorage:', error);
        return null;
      }
    },
    async exportData() {
      console.warn('Export not available in browser mode');
      return null;
    },
    async importData() {
      console.warn('Import not available in browser mode');
      return null;
    }
  };
}

// SimpleMasonry: A lightweight masonry layout component to arrange items in columns.
// It adjusts the number of columns based on window width.
// Note: This component does not persist column state or item order itself;
// that responsibility lies with how items are passed to it.
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

// Updated storage functions for Electron
const getStorageKey = () => 'kanbanBoards';

// Helper function to get default boards
const getDefaultBoards = () => {
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

const getInitialBoards = async () => {
  console.log('getInitialBoards called');
  const storageKey = getStorageKey();

  try {
    // Try to load from storage (Electron or localStorage)
    const storedBoards = await ElectronStorage.loadData(storageKey);
    
    if (storedBoards) {
      console.log('Successfully loaded boards from storage:', storedBoards);
      return storedBoards;
    }

    console.log('No data found in storage. Initializing with default boards.');
    return getDefaultBoards();

  } catch (error) {
    console.error("Failed to load boards from storage:", error);
    console.log('Falling back to default boards.');
    return getDefaultBoards();
  }
};

const KanbanApp = () => {
  // Define a list of colors for new boards
  const randomBoardColors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-lime-500',
    'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500',
    'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500',
    'bg-pink-500', 'bg-rose-500', 'bg-gray-500', 'bg-slate-500', 'bg-zinc-500'
  ];

  // Initialize boards and loading state
  const [boards, setBoards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Effect to load boards on component mount
  useEffect(() => {
    const initializeBoards = async () => {
      try {
        const initialBoards = await getInitialBoards();
        setBoards(initialBoards);
      } catch (error) {
        console.error('Failed to initialize boards:', error);
        setBoards(getDefaultBoards()); // Fallback if async load fails
      } finally {
        setIsLoading(false);
      }
    };

    initializeBoards();
  }, []); // Run once on mount

  // Enhanced effect to save the 'boards' state to persistent storage whenever it changes.
  useEffect(() => {
    if (isLoading) return; // Don't save during initial load

    const saveBoards = async () => {
      const storageKey = getStorageKey();
      try {
        console.log('Saving boards to storage:', boards);
        await ElectronStorage.saveData(storageKey, boards);
      } catch (error) {
        console.error("Failed to save boards to storage for key \"" + storageKey + "\":", error);
      }
    };

    saveBoards();
  }, [boards, isLoading]); // Depend on boards and isLoading

  // State for UI interactions
  const [dragging, setDragging] = useState(null);
  const [draggingBoard, setDraggingBoard] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(null);
  const [openTasks, setOpenTasks] = useState({});
  const [taskContentView, setTaskContentView] = useState({});
  const [editingTaskInline, setEditingTaskInline] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [datePickerPosition, setDatePickerPosition] = useState({ top: 0, left: 0 });
  const [editingTitle, setEditingTitle] = useState(null);
  const [editingBoardTitle, setEditingBoardTitle] = useState(null);
  const [collapsedBoards, setCollapsedBoards] = useState({});
  const [activeDropdown, setActiveDropdown] = useState(null);
  const dropdownRef = useRef(null);
  const datePickerRef = useRef(null);

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

  // Export data function
  const exportData = async () => {
    try {
      const filePath = await ElectronStorage.exportData(getStorageKey());
      if (filePath) {
        alert(`Data exported successfully to: ${filePath}`);
      }
    } catch (error) {
      console.error('Failed to export data:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  // Import data function
  const importData = async () => {
    try {
      const data = await ElectronStorage.importData(getStorageKey());
      if (data) {
        setBoards(data);
        alert('Data imported successfully!');
      }
    } catch (error) {
      console.error('Failed to import data:', error);
      alert('Failed to import data. Please check the file format and try again.');
    }
  };

  // Keep all your existing functions exactly as they are...
  // (I'm keeping the paste.txt content for the rest of the functions)

  // Toggle dropdown menu
  const toggleDropdown = (boardId, event) => {
    event.stopPropagation();
    if (activeDropdown === boardId) {
      setActiveDropdown(null);
    } else {
      setActiveDropdown(boardId);
    }
  };

  // Effect to handle clicks outside of dropdowns, date pickers, or inline editors to close them.
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close board dropdown if click is outside
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
        showDatePicker &&
        datePickerRef.current &&
        !datePickerRef.current.contains(event.target) &&
        !event.target.closest('.date-picker-trigger')
      ) {
        setShowDatePicker(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeDropdown, showDatePicker, editingTaskInline]);

  // Effect to reposition date picker on scroll or resize
  useEffect(() => {
    if (!showDatePicker) return;

    const updatePosition = () => {
      const triggerButton = document.querySelector(`.date-picker-trigger[data-task-id="${showDatePicker.taskId}"]`);
      if (triggerButton) {
        const rect = triggerButton.getBoundingClientRect();
        let top = rect.bottom + 5;
        const pickerWidth = 288;
        const pickerHeight = 300;

        let left = rect.right - pickerWidth;

        if (left < 10) left = 10;
        if (left + pickerWidth > window.innerWidth - 10) {
          left = window.innerWidth - pickerWidth - 10;
        }
        if (top + pickerHeight > window.innerHeight - 10) {
          top = rect.top - pickerHeight - 5;
        }

        setDatePickerPosition({ top, left });
      } else {
        setShowDatePicker(null);
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [showDatePicker]);

  // Toggle board collapse
  const toggleBoardCollapse = (boardId) => {
    setCollapsedBoards(prev => ({
      ...prev,
      [boardId]: !prev[boardId]
    }));
  };

  // Board drag handlers
  const handleBoardDragStart = (e, boardId) => {
    setDraggingBoard(boardId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('board/id', boardId);

    const boardElement = e.currentTarget.closest('[data-board-id]');
    if (boardElement) {
      try {
        const clone = boardElement.cloneNode(true);
        clone.style.position = 'absolute';
        clone.style.left = '-9999px';
        clone.style.width = boardElement.offsetWidth + 'px';
        clone.style.height = boardElement.offsetHeight + 'px';
        clone.style.pointerEvents = 'none';
        document.body.appendChild(clone);
        
        const rect = boardElement.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        e.dataTransfer.setDragImage(clone, offsetX, offsetY);
        
        setTimeout(() => {
            if (clone.parentNode) {
                clone.parentNode.removeChild(clone);
            }
        }, 0);

      } catch (err) {
        console.warn("setDragImage failed:", err);
      }

      setTimeout(() => {
        boardElement.style.opacity = '0.4';
        boardElement.style.transform = 'rotate(3deg) scale(0.95)';
        boardElement.style.boxShadow = '0 15px 30px rgba(0,0,0,0.3)';
        boardElement.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out, box-shadow 0.2s ease-out';
      }, 0);
    } else {
      console.warn("Board element not found for drag start:", boardId);
    }
  };

  const handleBoardDragEnd = (e, boardId) => {
    setDraggingBoard(null);
    
    const boardElement = document.querySelector(`[data-board-id="${boardId}"]`);
    if (boardElement) {
      boardElement.style.opacity = '';
      boardElement.style.transform = '';
      boardElement.style.boxShadow = '';
      boardElement.style.transition = '';
    }
  };

  const handleBoardDragOver = (e) => {
    if (draggingBoard) {
      e.preventDefault();
      e.stopPropagation();
      
      e.currentTarget.style.transform = 'scale(1.02)';
      e.currentTarget.style.boxShadow = '0 8px 16px rgba(59, 130, 246, 0.3)';
      e.currentTarget.style.border = '2px dashed rgb(59, 130, 246)';
    }
  };

  const handleBoardDragLeave = (e) => {
    if (draggingBoard) {
      e.currentTarget.style.transform = '';
      e.currentTarget.style.boxShadow = '';
      e.currentTarget.style.border = '';
    }
  };

  const handleBoardDrop = (e, targetBoardId) => {
    if (!draggingBoard) return;
    
    e.preventDefault();
    e.stopPropagation();
    
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

    const [draggedBoard] = newBoards.splice(draggedBoardIndex, 1);
    newBoards.splice(targetBoardIndex, 0, draggedBoard);

    newBoards.forEach((board, index) => {
      board.order = index;
    });
    
    setBoards(newBoards);
    setDraggingBoard(null);
  };

  // Task drag handlers
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
      
      const findAndRemoveTask = (boardTasks, taskId) => {
        for (let i = 0; i < boardTasks.length; i++) {
          if (boardTasks[i].id === taskId) {
            return boardTasks.splice(i, 1)[0];
          }
          if (boardTasks[i].subtasks && Array.isArray(boardTasks[i].subtasks)) {
            const fromSubtasks = findAndRemoveTask(boardTasks[i].subtasks, taskId);
            if (fromSubtasks) return fromSubtasks;
          }
        }
        return null;
      };
      
      const sourceBoardIndex = newBoards.findIndex(b => b.id === sourceBoardId);
      if (sourceBoardIndex === -1) {
        console.error('Source board not found:', sourceBoardId);
        return;
      }
      
      const taskToMove = findAndRemoveTask(newBoards[sourceBoardIndex].tasks, sourceTaskId);
      if (!taskToMove) {
        console.error('Task to move not found in source board:', sourceTaskId, 'on board', sourceBoardId);
        return;
      }
      
      const targetBoardIndex = newBoards.findIndex(b => b.id === targetBoardId);
      if (targetBoardIndex === -1) {
        console.error('Target board not found:', targetBoardId);
        return;
      }
      
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
      console.error('Error handling task drop:', error);
    }
  };

  // IMPROVED: Board drop zone handler
  const handleBoardAreaDrop = (e, targetBoardId) => {
    console.log(`Board area drop triggered for board ${targetBoardId}. Dragging:`, dragging);
    
    if (dragging && !draggingBoard) {
      // This is a task being dropped on the board area (not on a specific task)
      e.preventDefault();
      e.stopPropagation();
      handleTaskDrop(e, targetBoardId, null);
    }
  };

  const handleBoardAreaDragOver = (e) => {
    if (dragging && !draggingBoard) {
      e.preventDefault();
      e.stopPropagation();
      
      // Visual feedback for board area
      const target = e.currentTarget;
      target.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
      target.style.borderRadius = '8px';
      target.style.transition = 'background-color 0.2s ease';
    }
  };

  const handleBoardAreaDragLeave = (e) => {
    if (dragging && !draggingBoard) {
      const target = e.currentTarget;
      target.style.backgroundColor = '';
    }
  };

  // Keep all your existing functions for task management, board management, etc.
  // (The rest of your functions from the paste.txt file)

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
  const toggleDatePicker = (e, taskId, boardId) => {
    e.stopPropagation();
    if (showDatePicker && showDatePicker.taskId === taskId) {
      setShowDatePicker(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      let top = rect.bottom + 5;
      const pickerWidth = 288;
      const pickerHeight = 300;

      let left = rect.right - pickerWidth;

      if (left < 10) left = 10;
      if (left + pickerWidth > window.innerWidth - 10) {
        left = window.innerWidth - pickerWidth - 10;
      }
      if (top + pickerHeight > window.innerHeight - 10) {
        top = rect.top - pickerHeight - 5;
      }

      setDatePickerPosition({ top, left });
      setShowDatePicker({ taskId, boardId });
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
        ref={datePickerRef}
        className="fixed bg-white shadow-xl rounded-lg p-4 z-50 w-72 border border-gray-200"
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
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button 
            className="w-full text-sm text-red-600 hover:bg-red-50 p-2 rounded transition-colors"
            onClick={() => {
              setDueDate(taskId, boardId, '');
            }}
          >
            Clear Date
          </button>
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

  // Toggle task details' visibility.
  const toggleTaskDetails = (taskId) => {
    const isCurrentlyOpen = openTasks[taskId];
    setOpenTasks(prev => ({
        ...prev,
        [taskId]: !prev[taskId]
    }));

    if (isCurrentlyOpen) { 
        setTaskContentView(prev => {
            const newState = { ...prev };
            delete newState[taskId];
            return newState;
        });
    }
  };

  // Add new board
  const addNewBoard = () => {
    const randomColor = randomBoardColors[Math.floor(Math.random() * randomBoardColors.length)];
    const newBoard = {
      id: `board-${Date.now()}`,
      title: 'New Board',
      color: randomColor,
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
    }
    
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
          
          {/* FIXED: Collapsed Task View - Always show priority and date picker */}
          <div className="flex items-center space-x-2 flex-wrap">
            {/* Priority always shown */}
            {editingTaskInline?.taskId === task.id && editingTaskInline?.field === 'priority' ? (
              <select
                value={task.priority}
                onChange={(e) => {
                  updateTaskPriority(boardId, task.id, e.target.value);
                  setEditingTaskInline(null);
                }}
                onBlur={() => setEditingTaskInline(null)}
                onClick={(e) => e.stopPropagation()}
                className={`text-xs p-1 rounded border ${priorityColors[task.priority]} bg-white shadow`}
                autoFocus
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingTaskInline({ taskId: task.id, field: 'priority' });
                }}
                className={`text-xs px-2 py-1 rounded-full border ${priorityColors[task.priority]} hover:opacity-75 transition-opacity`}
              >
                {task.priority}
              </button>
            )}
            
            {/* FIXED: Date picker button always shown */}
            <button
              className="flex items-center space-x-1 hover:opacity-75 transition-opacity date-picker-trigger"
              onClick={(e) => {
                toggleDatePicker(e, task.id, boardId);
              }}
              data-task-id={task.id}
            >
              <Calendar size={14} className={isOverdue ? 'text-red-500' : 'text-gray-500'} />
              <span className={`text-xs px-2 py-1 rounded ${
                task.dueDate 
                  ? (isOverdue ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700')
                  : 'bg-gray-50 text-gray-500 border border-gray-300'
              }`}>
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Set date'}
              </span>
            </button>
            
            {task.subtasks.length > 0 && (
              <span className="text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-800">
                {task.subtasks.length} subtasks
              </span>
            )}
          </div>
        </div>
        
        {isOpen && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="mt-3 flex items-center space-x-2">
              <button
                className={`text-xs flex items-center px-3 py-1 rounded transition-colors ${taskContentView[task.id] === 'text' || (!taskContentView[task.id] && task.description) ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                onClick={(e) => {
                    e.stopPropagation();
                    setTaskContentView(prev => {
                        const currentView = prev[task.id];
                        return { ...prev, [task.id]: currentView === 'text' ? null : 'text' };
                    });
                }}
              >
                Text
              </button>
              <button
                className={`text-xs flex items-center px-3 py-1 rounded transition-colors ${taskContentView[task.id] === 'list' || (!taskContentView[task.id] && task.content?.length > 0 && !task.description) ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                onClick={(e) => {
                    e.stopPropagation();
                    setTaskContentView(prev => {
                        const currentView = prev[task.id];
                        return { ...prev, [task.id]: currentView === 'list' ? null : 'list' };
                    });
                }}
              >
                List
              </button>
            </div>

            {(taskContentView[task.id] === 'text' || (!taskContentView[task.id] && task.description)) && (
              <div className="mt-3">
                <textarea
                  className="w-full p-3 border rounded-md text-sm resize-none"
                  value={task.description}
                  onChange={(e) => {
                    const newBoards = [...boards];
                    const updateDesc = (tasks, id, desc) => tasks.forEach(t => {
                      if (t.id === id) t.description = desc;
                      else if (t.subtasks) updateDesc(t.subtasks, id, desc);
                    });
                    const boardIdx = newBoards.findIndex(b => b.id === boardId);
                    if (boardIdx !== -1) updateDesc(newBoards[boardIdx].tasks, task.id, e.target.value);
                    setBoards(newBoards);
                  }}
                  rows="3"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}

            {(taskContentView[task.id] === 'list' || (!taskContentView[task.id] && task.content?.length > 0 && !task.description)) && (
              <div className="mt-3">
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
                          const updateItemText = (tasks, id, itemIdx, text) => tasks.forEach(t => {
                            if (t.id === id) t.content[itemIdx].text = text;
                            else if (t.subtasks) updateItemText(t.subtasks, id, itemIdx, text);
                          });
                          const boardIdx = newBoards.findIndex(b => b.id === boardId);
                          if (boardIdx !== -1) updateItemText(newBoards[boardIdx].tasks, task.id, index, e.target.value);
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
                    onClick={(e) => { e.stopPropagation(); addContentItem(task.id, boardId, 'bullet'); }}
                  >
                    <List size={12} className="mr-1" /> Bullet
                  </button>
                  <button
                    className="text-xs flex items-center px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
                    onClick={(e) => { e.stopPropagation(); addContentItem(task.id, boardId, 'numbered'); }}
                  >
                    <AlignLeft size={12} className="mr-1" /> Numbered
                  </button>
                </div>
              </div>
            )}
            
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

  // Show loading state
  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your Kanban boards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen p-6">
      <header className="bg-white shadow-sm rounded-xl p-6 mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Kanban Board</h1>
          <div className="flex items-center space-x-3">
            {/* Export/Import buttons - only show in Electron */}
            {ElectronStorage.isElectron && (
              <>
                <button
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                  onClick={exportData}
                  title="Export data to file"
                >
                  <Download size={20} className="mr-1" />
                  Export
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                  onClick={importData}
                  title="Import data from file"
                >
                  <Upload size={20} className="mr-1" />
                  Import
                </button>
              </>
            )}
            <button
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
              onClick={addNewBoard}
            >
              <Plus size={20} className="mr-1" />
              New Board
            </button>
          </div>
        </div>
        
        {/* Show data location info in Electron */}
        {ElectronStorage.isElectron && (
          <div className="mt-2 text-sm text-gray-500">
            Data is automatically saved to your system's application data folder
          </div>
        )}
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
              console.log(`onDrop called on BOARD ${board.id}. Dragging board: ${draggingBoard}, Dragging task: ${dragging}`);
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
                  <button
                    className="text-white hover:bg-white hover:bg-opacity-20 rounded p-1 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      addNewTask(board.id);
                    }}
                    title="Add Task"
                  >
                    <Plus size={20} />
                  </button>
                  <span className="bg-white bg-opacity-30 text-white text-sm px-2 py-1 rounded-full">
                    {board.tasks.length}
                  </span>
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
                        className="absolute bg-white rounded-lg shadow-xl border p-2 z-50 top-full right-0 mt-2 w-48"
                        onClick={(e) => e.stopPropagation()} 
                      >
                        <div className="space-y-1">
                          <div>
                            <button
                              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteBoard(board.id);
                              }}
                            >
                              <Trash2 size={16} className="mr-2" />
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
              <div 
                className="p-4"
                onDragOver={handleBoardAreaDragOver}
                onDragLeave={handleBoardAreaDragLeave}
                onDrop={(e) => handleBoardAreaDrop(e, board.id)}
              >
                <div className="">
                  {board.tasks.map(task => renderTask(task, board.id))}
                </div>
                
                {/* IMPROVED: Drop zone indicator when dragging tasks */}
                {dragging && !draggingBoard && board.tasks.length === 0 && (
                  <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-300 rounded-lg">
                    Drop task here
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </SimpleMasonry>

      {showDatePicker && renderDatePicker(showDatePicker.taskId, showDatePicker.boardId)}
    </div>
  );
};

export default KanbanApp;