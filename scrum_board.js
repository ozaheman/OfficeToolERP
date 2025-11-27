/**
 * @module ScrumBoard
 * Renders an interactive drag-and-drop Scrum/Kanban board for a single project.
 */
const ScrumBoard = (() => {
    let onUpdateCallback = null;
    let onEditCallback = null;
    let departmentColorMap = {};

    function getDepartmentColor(department) {
        return departmentColorMap[department] || departmentColorMap['Default'];
    }

    function hexToRgba(hex, alpha) {
        if (!hex || hex.length < 4) return `rgba(128, 128, 128, ${alpha})`;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    function render(scrumData, staffList, onUpdate, onEdit, departmentColors) {
        onUpdateCallback = onUpdate;
        onEditCallback = onEdit;
        departmentColorMap = departmentColors;

        const container = document.getElementById('scrum-board-container');
        container.innerHTML = `
            <div class="scrum-column" data-status="Up Next"><div class="scrum-column-header">Up Next</div><div class="scrum-column-content"></div></div>
            <div class="scrum-column" data-status="To Do"><div class="scrum-column-header">To Do</div><div class="scrum-column-content"></div></div>
            <div class="scrum-column" data-status="In Progress"><div class="scrum-column-header">In Progress</div><div class="scrum-column-content"></div></div>
            <div class="scrum-column" data-status="Done"><div class="scrum-column-header">Done</div><div class="scrum-column-content"></div></div>
        `;

        const staffMap = new Map(staffList.map(s => [s.id, s.name]));
        const taskTemplateMap = new Map(DESIGN_SCRUM_TEMPLATE.map(t => [t.id, t]));

        if (scrumData && Array.isArray(scrumData.tasks)) {
            scrumData.tasks.forEach(task => {
                const assigneeName = task.assigneeId ? staffMap.get(task.assigneeId) || 'Unassigned' : 'Unassigned';
                const department = task.department || taskTemplateMap.get(task.id)?.department || 'Default';
                const color = getDepartmentColor(department);
                const jobNo = task.jobNo || scrumData.jobNo; // Use task's jobNo if available (for cumulative view)
                const duration = task.plannedDuration || taskTemplateMap.get(task.id)?.duration || '?';


                const card = document.createElement('div');
                card.className = 'scrum-card';
                card.draggable = true;
                card.dataset.taskId = task.id;
                card.dataset.jobNo = jobNo; // Set jobNo on the card for event listeners
                card.dataset.department = department;
                card.dataset.assigneeId = task.assigneeId || 'unassigned';
                
                card.style.backgroundColor = hexToRgba(color, 0.05);
                card.style.borderLeft = `5px solid ${color}`;

                if (task.status === 'Done') card.classList.add('scrum-card-done');

                card.innerHTML = `
                    <div class="scrum-card-header">
                        <span class="scrum-card-tag" style="background-color: ${color};">${department}</span>
                        <span class="scrum-card-project-id">${jobNo}</span>
                    </div>
                    <div class="scrum-card-title">${task.name}</div>
                    <div class="scrum-card-footer">
                        <span class="scrum-card-assignee">${assigneeName}</span>
                        <div>
                            <span class="scrum-card-duration" style="margin-right: 5px;">${duration}d</span>
                            <span class="scrum-card-duedate">${task.dueDate || ''}</span>
                        </div>
                    </div>
                `;

                const columnContent = container.querySelector(`[data-status="${task.status}"] .scrum-column-content`);
                if (columnContent) {
                    columnContent.appendChild(card);
                } else {
                    console.warn(`Task "${task.name}" has an invalid status: "${task.status}". Placing in 'To Do'.`);
                    task.status = 'To Do';
                    container.querySelector(`[data-status="To Do"] .scrum-column-content`)?.appendChild(card);
                }
            });
        }
    
        attachEventListeners();
    }
   
    
    // NEW: Function to render tasks grouped by assignee
    function renderByAssignee(allScrumData, staffList, onEdit) {
        const container = document.getElementById('design-assignee-container');
        if (!container) return;
        
        const tasksByAssignee = new Map();
        staffList.forEach(staff => tasksByAssignee.set(staff.id, []));
        tasksByAssignee.set(null, []); // For unassigned tasks

        allScrumData.forEach(project => {
            project.tasks.forEach(task => {
                if (task.status === 'Done') return; // Skip completed tasks
                const assigneeId = task.assigneeId || null;
                if (tasksByAssignee.has(assigneeId)) {
                    tasksByAssignee.get(assigneeId).push({ ...task, jobNo: project.jobNo });
                }
            });
        });
        
        let html = '';
        const staffMap = new Map(staffList.map(s => [s.id, s.name]));
        const today = new Date();
        today.setHours(0,0,0,0);

        tasksByAssignee.forEach((tasks, assigneeId) => {
            const assigneeName = assigneeId ? staffMap.get(assigneeId) : 'Unassigned';
            if (tasks.length > 0) {
                html += `<div class="assignee-column"><h3>${assigneeName} (${tasks.length} tasks)</h3><ul class="assignee-task-list">`;
                
                tasks.sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));
                
                tasks.forEach(task => {
                    const dueDate = new Date(task.dueDate + 'T00:00:00');
                    const isOverdue = dueDate < today;
                    html += `
                        <li class="assignee-task-item" data-task-id="${task.id}" data-job-no="${task.jobNo}">
                           <div class="info">
                             <span class="task-name">${task.name}</span>
                             <span class="project-id">${task.jobNo}</span>
                           </div>
                           <span class="due-date ${isOverdue ? 'overdue' : ''}">${task.dueDate}</span>
                        </li>
                    `;
                });
                html += `</ul></div>`;
            }
        });

        if (html === '') {
            html = '<p style="text-align:center; padding-top: 50px; color: #888;">No active tasks found across all projects.</p>';
        }

        container.innerHTML = html;
        
        // Add event listeners for the new task items
        container.querySelectorAll('.assignee-task-item').forEach(item => {
            item.addEventListener('click', () => {
                const taskId = item.dataset.taskId;
                const jobNo = item.dataset.jobNo;
                if (onEdit) {
                    onEdit(taskId, jobNo);
                }
            });
        });
    }

    function attachEventListeners() {
        const cards = document.querySelectorAll('.scrum-card');
        const columns = document.querySelectorAll('.scrum-column-content');

        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                if (card.classList.contains('scrum-card-done')) { e.preventDefault(); return; }
                card.classList.add('dragging');
            });
            card.addEventListener('dragend', () => card.classList.remove('dragging'));
            card.addEventListener('click', () => {
                if (onEditCallback) {
                    onEditCallback(card.dataset.taskId, card.dataset.jobNo);
                }
            });
        });

        columns.forEach(column => {
            column.addEventListener('dragover', e => { 
                e.preventDefault(); 
                const afterElement = getDragAfterElement(column, e.clientY);
                const draggable = document.querySelector('.dragging');
                if (!draggable) return;

                if (afterElement == null) {
                    column.appendChild(draggable);
                } else {
                    column.insertBefore(draggable, afterElement);
                }
            });
            column.addEventListener('drop', e => {
                e.preventDefault();
                const draggable = document.querySelector('.dragging');
                if (draggable && onUpdateCallback) {
                    const newStatus = column.parentElement.dataset.status;
                    onUpdateCallback(draggable.dataset.taskId, newStatus, draggable.dataset.jobNo);
                }
            });
        });
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.scrum-card:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            }
            return closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    return { render, renderByAssignee };
})();