//--- START OF FILE overlay_gantt_chart.js ---

/**
 * @module OverlayGantt
 * Renders an advanced, interactive Gantt chart with a baseline (planned) schedule
 * and an overlay (actual/detailed) schedule. It visualizes delays, progress,
 * and critical path tasks, allowing for detailed project tracking and analysis.
 */
const OverlayGantt = (() => {

    // --- CONFIGURATION ---
    const CONFIG = {
        headerHeight: 50,
        rowHeight: 30, // Increased for clarity
        barHeight: 12, // Slimmer bars to fit two per row
        taskListWidth: 200,
        chartWidth: 1000,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        headerFontSize: '12px',
        taskFontSize: '11px',
        handleWidth: 8,
        // Colors
        baselineBarColor: '#cccccc', // Light grey for planned tasks
        onTimeBarColor: '#4363d8',   // Blue for on-time actual tasks
        delayedBarColor: '#f58231',  // Orange for delayed tasks
        completedBarColor: '#3cb44b',// Green for completed tasks
        criticalBorderColor: '#e6194B', // Red border for critical tasks
        gridLineColor: '#e0e0e0',
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);


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

                // Month separator line
                const line = createSvgElement('line', {
                    x1: xPos, x2: xPos, y1: CONFIG.headerHeight - 20, y2: chartHeight,
                    stroke: CONFIG.gridLineColor, 'stroke-dasharray': '2,2'
                });
                headerGroup.appendChild(line);

                // Month label
                const label = createSvgElement('text', {
                    x: xPos + 5, y: CONFIG.headerHeight - 25,
                    'font-size': CONFIG.headerFontSize, 'font-family': CONFIG.fontFamily, fill: '#555'
                });
                label.textContent = date.toLocaleString('default', { month: 'short', year: 'numeric' });
                headerGroup.appendChild(label);
            }
        }
        // Today line
        if (ganttStartDate < today && new Date() < ganttStartDate.getTime() + totalDays * 86400000) {
            const todayOffset = (today - ganttStartDate) / (1000 * 60 * 60 * 24);
            const todayX = CONFIG.taskListWidth + todayOffset * dayWidth;
            const todayLine = createSvgElement('line', {
                x1: todayX, y1: CONFIG.headerHeight - 20, x2: todayX, y2: chartHeight,
                stroke: '#dc3545', 'stroke-width': 1.5,
            });
            headerGroup.appendChild(todayLine);
        }

        svg.appendChild(headerGroup);
    };

    const drawTasks = (svg, schedule, ganttStartDate, totalDays, baselineMap, onUpdate) => {
        const tasksGroup = createSvgElement('g', { 'font-family': CONFIG.fontFamily });
        const dayWidth = CONFIG.chartWidth / totalDays;

        // Draw baseline tasks first
        const baselineGroup = createSvgElement('g', { id: 'baseline-group' });
        schedule.forEach((task, index) => {
            const y = CONFIG.headerHeight + index * CONFIG.rowHeight;
            const baselineTask = baselineMap.get(task.id);
            if(baselineTask) {
                const taskStartDate = new Date(baselineTask.start + 'T00:00:00');
                const startOffsetDays = (taskStartDate - ganttStartDate) / (1000 * 60 * 60 * 24);
                const barX = CONFIG.taskListWidth + startOffsetDays * dayWidth;
                const barWidth = baselineTask.duration * dayWidth;

                const bar = createSvgElement('rect', {
                    x: barX, y: y + CONFIG.barHeight + 2, width: barWidth, height: CONFIG.barHeight,
                    fill: CONFIG.baselineBarColor, rx: 2, ry: 2
                });
                const title = createSvgElement('title');
                title.textContent = `PLAN: ${baselineTask.name}\nStart: ${baselineTask.start}\nEnd: ${baselineTask.end}`;
                bar.appendChild(title);
                baselineGroup.appendChild(bar);
            }
        });
        tasksGroup.appendChild(baselineGroup);

        // Draw overlay/actual tasks
        schedule.forEach((task, index) => {
            const y = CONFIG.headerHeight + index * CONFIG.rowHeight;
            const taskStartDate = new Date(task.start + 'T00:00:00');
            const taskEndDate = new Date(task.end + 'T00:00:00');
            
            const startOffsetDays = (taskStartDate - ganttStartDate) / (1000 * 60 * 60 * 24);
            const barX = CONFIG.taskListWidth + startOffsetDays * dayWidth;
            const barWidth = task.duration * dayWidth;

            const barGroup = createSvgElement('g', { class: 'gantt-overlay-task-bar', 'data-task-id': task.uid, style: 'cursor: pointer;' });
            
            // Task Label
            const label = createSvgElement('text', {
                x: 10, y: y + CONFIG.barHeight, 'font-size': CONFIG.taskFontSize, fill: '#333'
            });
            label.textContent = task.name;
            tasksGroup.appendChild(label);

            // Determine Bar Color
            const baselineTask = baselineMap.get(task.id);
            let barColor = CONFIG.onTimeBarColor;
            if (baselineTask) {
                const baselineEndDate = new Date(baselineTask.end + 'T00:00:00');
                if (taskEndDate > baselineEndDate) barColor = CONFIG.delayedBarColor;
            }
            if(taskEndDate < today) barColor = CONFIG.completedBarColor;


            const bar = createSvgElement('rect', {
                x: barX, y: y, width: barWidth, height: CONFIG.barHeight,
                fill: barColor, rx: 2, ry: 2, class: 'gantt-bar-actual'
            });

            if (task.isCritical) {
                bar.setAttribute('stroke', CONFIG.criticalBorderColor);
                bar.setAttribute('stroke-width', '2');
            }

            const title = createSvgElement('title');
            title.textContent = `ACTUAL: ${task.name}\nStart: ${task.start}\nEnd: ${task.end}\nDuration: ${task.duration} days\nResponsible: ${task.responsible || 'N/A'}\nStatus: ${taskEndDate > today ? 'In Progress' : 'Completed'}${task.isCritical ? '\nCRITICAL PATH' : ''}`;
            
            barGroup.append(bar, title);
            tasksGroup.append(barGroup);
            
            // Double click to edit
            barGroup.addEventListener('dblclick', () => onUpdate({ action: 'edit', task }));

        });
        svg.appendChild(tasksGroup);
    };


    const render = (container, baselineSchedule, overlaySchedule, onUpdate) => {
        container.innerHTML = '';
        if (!baselineSchedule || baselineSchedule.length === 0) {
            container.innerHTML = `<p style="text-align:center; color:#888;">Baseline schedule not available.</p>`;
            return;
        }

        const baselineMap = new Map(baselineSchedule.map(t => [t.id, t]));

        // Use overlay tasks if they exist, otherwise fallback to baseline for display
        const displaySchedule = overlaySchedule.length > 0 ? overlaySchedule : baselineSchedule.map(t => ({...t, uid: `base_${t.id}`})); // Give baseline a UID if it's being displayed as primary

        const allDates = [
            ...baselineSchedule.flatMap(t => [new Date(t.start), new Date(t.end)]),
            ...overlaySchedule.flatMap(t => [new Date(t.start), new Date(t.end)])
        ];
        
        if (allDates.length === 0) return;

        const ganttStartDate = new Date(Math.min.apply(null, allDates));
        const ganttEndDate = new Date(Math.max.apply(null, allDates));
        ganttEndDate.setMonth(ganttEndDate.getMonth() + 1); // Add buffer
        
        const totalDays = Math.max(1, (ganttEndDate - ganttStartDate) / (1000 * 60 * 60 * 24));
        const chartHeight = CONFIG.headerHeight + displaySchedule.length * CONFIG.rowHeight;

        const svg = createSvgElement('svg', {
            width: CONFIG.chartWidth + CONFIG.taskListWidth, height: chartHeight, style: "max-width: 100%; background: #fff; border: 1px solid #eee;"
        });

        drawHeader(svg, ganttStartDate, totalDays, chartHeight);
        drawTasks(svg, displaySchedule, ganttStartDate, totalDays, baselineMap, onUpdate);
        container.appendChild(svg);
    };

    return { render };
})();