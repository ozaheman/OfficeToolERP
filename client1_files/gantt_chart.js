/**
 * @module UrbanAxisSchedule
 * Renders a dynamic, interactive, SVG-based Gantt chart for a project schedule.
 * It calculates a project-specific timeline, displays task progress, and allows dragging/clicking to adjust dates.
 */
const UrbanAxisSchedule = (() => {

    // --- CONFIGURATION ---
    const CONFIG = {
        headerHeight: 50,
        rowHeight: 24,
        barHeight: 18,
        taskListWidth: 200,
        chartWidth: 1000,
        barColor: '#4363d8', // Blue
        progressBarColor: '#3cb44b', // Green
        gridLineColor: '#e0e0e0',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        headerFontSize: '12px',
        taskFontSize: '11px',
        handleWidth: 8, // Width of the resize handles
    };

    // --- STATE ---
    let dragState = null;

    // --- HELPERS ---
    const createSvgElement = (tag, attributes = {}) => {
        const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
        for (const key in attributes) {
            el.setAttribute(key, attributes[key]);
        }
        return el;
    };

    /**
     * Calculates a dynamic schedule based on project start date and duration.
     * Overrides template dates with any saved task-specific dates.
     */
    const calculateDynamicSchedule = (projectData, scheduleTemplate, savedTasks) => {
        const projectStartDate = new Date(projectData.agreementDate || new Date());
        const constructionMonths = parseFloat(projectData.constructionDuration) || 14; // Default to 14 months
        const templateTotalDays = Math.max(...scheduleTemplate.map(t => t.startOffset + t.duration));
        const scaleFactor = (constructionMonths * 30.4) / templateTotalDays;

        const savedTaskMap = new Map((savedTasks || []).map(t => [t.id, t]));

        return scheduleTemplate.map(taskTemplate => {
            if (savedTaskMap.has(taskTemplate.id)) {
                const saved = savedTaskMap.get(taskTemplate.id);
                const start = new Date(saved.start + 'T00:00:00');
                const end = new Date(saved.end + 'T00:00:00');
                const duration = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
                return { ...taskTemplate, ...saved, duration };
            }

            const newStartOffset = Math.round(taskTemplate.startOffset * scaleFactor);
            const newDuration = Math.max(1, Math.round(taskTemplate.duration * scaleFactor));

            const startDate = new Date(projectStartDate);
            startDate.setDate(startDate.getDate() + newStartOffset);

            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + newDuration - 1);

            return {
                ...taskTemplate,
                start: startDate.toISOString().split('T')[0],
                end: endDate.toISOString().split('T')[0],
                duration: newDuration
            };
        });
    };

    // --- DRAWING FUNCTIONS ---
    const drawHeader = (svg, ganttStartDate, totalDays, chartHeight) => {
        const headerGroup = createSvgElement('g', { transform: `translate(${CONFIG.taskListWidth}, 0)` });
        let currentMonth = -1;
        const dayWidth = CONFIG.chartWidth / totalDays;

        for (let i = 0; i <= totalDays; i++) {
            const date = new Date(ganttStartDate);
            date.setDate(date.getDate() + i);

            if (date.getMonth() !== currentMonth) {
                currentMonth = date.getMonth();
                const xPos = i * dayWidth;

                const line = createSvgElement('line', {
                    x1: xPos, x2: xPos, y1: CONFIG.headerHeight - 15, y2: chartHeight,
                    stroke: CONFIG.gridLineColor
                });
                headerGroup.appendChild(line);

                const label = createSvgElement('text', {
                    x: xPos + 5, y: CONFIG.headerHeight - 25,
                    'font-size': CONFIG.headerFontSize, 'font-family': CONFIG.fontFamily, fill: '#555'
                });
                label.textContent = date.toLocaleString('default', { month: 'short', year: 'numeric' });
                headerGroup.appendChild(label);
            }
        }
        svg.appendChild(headerGroup);
    };

    const drawTasks = (svg, schedule, ganttStartDate, totalDays, onUpdate) => {
        const tasksGroup = createSvgElement('g', { 'font-family': CONFIG.fontFamily });
        const dayWidth = CONFIG.chartWidth / totalDays;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        schedule.forEach((task, index) => {
            const y = CONFIG.headerHeight + index * CONFIG.rowHeight;
            const taskStartDate = new Date(task.start + 'T00:00:00');
            const startOffsetDays = Math.max(0, (taskStartDate - ganttStartDate) / (1000 * 60 * 60 * 24));
            const barX = CONFIG.taskListWidth + startOffsetDays * dayWidth;
            const barWidth = Math.max(dayWidth, task.duration * dayWidth);

            const barGroup = createSvgElement('g', { class: 'gantt-task-bar', 'data-task-id': task.id });
            const label = createSvgElement('text', {
                x: 10, y: y + CONFIG.barHeight / 2 + 3, 'font-size': CONFIG.taskFontSize, fill: '#333'
            });
            label.textContent = `${task.id}. ${task.name}`;

            const bar = createSvgElement('rect', {
                x: barX, y: y, width: barWidth, height: CONFIG.barHeight,
                fill: CONFIG.barColor, rx: 3, ry: 3, class: 'gantt-bar-main', style: 'cursor: move;'
            });

            let progress = 0;
            const taskEndDate = new Date(task.end + 'T00:00:00');
            if (today > taskEndDate) {
                progress = 100;
            } else if (today >= taskStartDate) {
                const elapsed = (today - taskStartDate) / (1000 * 60 * 60 * 24) + 1;
                progress = Math.min(100, (elapsed / task.duration) * 100);
            }
            const progressBar = createSvgElement('rect', {
                x: barX, y: y, width: barWidth * (progress / 100), height: CONFIG.barHeight,
                fill: CONFIG.progressBarColor, rx: 3, ry: 3, 'pointer-events': 'none'
            });

            const handleStart = createSvgElement('rect', {
                x: barX, y: y, width: CONFIG.handleWidth, height: CONFIG.barHeight,
                fill: 'transparent', style: 'cursor: ew-resize;'
            });
            const handleEnd = createSvgElement('rect', {
                x: barX + barWidth - CONFIG.handleWidth, y: y, width: CONFIG.handleWidth, height: CONFIG.barHeight,
                fill: 'transparent', style: 'cursor: ew-resize;'
            });

            const title = createSvgElement('title');
            title.textContent = `${task.name}\nStart: ${task.start}\nEnd: ${task.end}\n(Double-click to edit dates)`;

            barGroup.append(bar, progressBar, handleStart, handleEnd, title);
            tasksGroup.append(label, barGroup);

            // --- Event Handlers ---
            barGroup.addEventListener('dblclick', () => {
                const newStartStr = prompt("Enter new start date (YYYY-MM-DD):", task.start);
                if (!newStartStr || !/^\d{4}-\d{2}-\d{2}$/.test(newStartStr)) return;
                const newEndStr = prompt("Enter new end date (YYYY-MM-DD):", task.end);
                if (!newEndStr || !/^\d{4}-\d{2}-\d{2}$/.test(newEndStr)) return;
                
                if (new Date(newEndStr) < new Date(newStartStr)) {
                    alert("End date cannot be before start date."); return;
                }
                if (onUpdate) onUpdate({ id: task.id, start: newStartStr, end: newEndStr });
            });

            const startDrag = (e, type) => {
                e.preventDefault();
                dragState = { type, task, taskElement: barGroup, startX: e.clientX,
                    initialX: parseFloat(bar.getAttribute('x')), initialWidth: parseFloat(bar.getAttribute('width')) };
                barGroup.classList.add('dragging');
                document.body.addEventListener('mousemove', handleMouseMove);
                document.body.addEventListener('mouseup', handleMouseUp);
            };

            bar.addEventListener('mousedown', (e) => startDrag(e, 'move'));
            handleStart.addEventListener('mousedown', (e) => startDrag(e, 'resize-start'));
            handleEnd.addEventListener('mousedown', (e) => startDrag(e, 'resize-end'));

            const handleMouseMove = (e) => {
                if (!dragState) return;
                const dx = e.clientX - dragState.startX;
                const newX = dragState.initialX + dx;
                const newWidth = dragState.initialWidth - (dragState.type === 'resize-start' ? dx : -dx);

                if (dragState.type === 'move') {
                    barGroup.setAttribute('transform', `translate(${dx}, 0)`);
                } else if (dragState.type === 'resize-start') {
                    if (newWidth > dayWidth) {
                        bar.setAttribute('x', newX); bar.setAttribute('width', newWidth);
                    }
                } else if (dragState.type === 'resize-end') {
                    if (newWidth > dayWidth) {
                        bar.setAttribute('width', newWidth);
                    }
                }
            };

            const handleMouseUp = (e) => {
                if (!dragState) return;
                barGroup.classList.remove('dragging');
                barGroup.removeAttribute('transform');

                const finalBarX = parseFloat(bar.getAttribute('x'));
                const finalBarWidth = parseFloat(bar.getAttribute('width'));
                const startDays = (finalBarX - CONFIG.taskListWidth) / dayWidth;
                const durationDays = Math.round(finalBarWidth / dayWidth);

                const newStartDate = new Date(ganttStartDate);
                newStartDate.setDate(newStartDate.getDate() + Math.round(startDays));

                const newEndDate = new Date(newStartDate);
                newEndDate.setDate(newEndDate.getDate() + durationDays - 1);
                
                if (onUpdate) {
                    onUpdate({
                        id: dragState.task.id,
                        start: newStartDate.toISOString().split('T')[0],
                        end: newEndDate.toISOString().split('T')[0]
                    });
                }

                document.body.removeEventListener('mousemove', handleMouseMove);
                document.body.removeEventListener('mouseup', handleMouseUp);
                dragState = null;
            };
        });
        svg.appendChild(tasksGroup);
    };

    const drawChart = (container, schedule, onUpdate) => {
        container.innerHTML = '';
        if (!schedule || schedule.length === 0) return; // Guard clause

        const ganttStartDate = new Date(Math.min.apply(null, schedule.map(t => new Date(t.start))));
        const ganttEndDate = new Date(Math.max.apply(null, schedule.map(t => new Date(t.end))));
        ganttEndDate.setMonth(ganttEndDate.getMonth() + 1); // Add buffer
        
        const totalDays = Math.max(1, (ganttEndDate - ganttStartDate) / (1000 * 60 * 60 * 24));
        const chartHeight = CONFIG.headerHeight + schedule.length * CONFIG.rowHeight;

        const svg = createSvgElement('svg', {
            width: CONFIG.chartWidth + CONFIG.taskListWidth, height: chartHeight, style: "max-width: 100%;"
        });
        const style = createSvgElement('style');
        style.textContent = `.dragging { opacity: 0.7; cursor: grabbing; }`;
        svg.append(style);

        drawHeader(svg, ganttStartDate, totalDays, chartHeight);
        drawTasks(svg, schedule, ganttStartDate, totalDays, onUpdate);
        container.appendChild(svg);
    };

    /**
     * Main render function exposed by the module.
     */
    const render = (projectData, scheduleTemplate, onUpdate) => {
        const container = document.getElementById('villa-schedule-preview');
        if (!container) return;

        if (!projectData || !projectData.jobNo || projectData.projectType !== 'Villa') {
            container.innerHTML = '<div style="padding: 40px; text-align: center; color: #777;">Select a "Villa" project type to generate the dynamic construction schedule.</div>';
            return;
        }
        
        const constructionMonths = parseFloat(projectData.constructionDuration);
        if (isNaN(constructionMonths) || constructionMonths <= 0) {
            container.innerHTML = '<div style="padding: 40px; text-align: center; color: #555;"><h4>Schedule Preview Unavailable</h4><p>Please enter a valid \'Construction (Months)\' duration in the \'Fees\' tab.</p></div>';
            return;
        }
        
        try {
            // The schedule data passed in `scheduleTemplate` is actually the project-specific, potentially overridden schedule data
            const finalSchedule = scheduleTemplate; 
            drawChart(container, finalSchedule, onUpdate);
        } catch (error) {
            console.error("Failed to render Gantt chart:", error);
            container.innerHTML = '<div style="padding: 40px; text-align: center; color: red;">An error occurred while generating the schedule.</div>';
        }
    };

    return {
        render,
        calculateDynamicSchedule // <-- MODIFIED: Expose this function
    };

})();