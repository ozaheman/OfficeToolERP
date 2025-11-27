/**
 * @module DesignCalendar
 * Renders a full monthly calendar view and an agenda view of all design tasks across projects.
 */
const DesignCalendar = (() => {
    let currentDate = new Date();

    function changeMonth(offset, allScrum, allStaff, allProjects) {
        currentDate.setMonth(currentDate.getMonth() + offset);
        renderMonthly(allScrum, allStaff, allProjects);
    }

    // --- MODIFICATION START: Completely rebuilt renderAgenda function ---
    function renderAgenda(allScrum, allStaff) {
        const container = document.getElementById('design-agenda-container');
        if (!container) return;

        // 1. Flatten all active tasks from all projects
        let allTasks = [];
        allScrum.forEach(project => {
            project.tasks.forEach(task => {
                if (task.status !== 'Done' && task.dueDate) {
                    allTasks.push({ ...task, jobNo: project.jobNo });
                }
            });
        });

        // 2. Define date ranges
        const today = new Date(); 
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today); 
        tomorrow.setDate(today.getDate() + 1);

        const dayAfterTomorrow = new Date(today);
        dayAfterTomorrow.setDate(today.getDate() + 2);

        const sevenDaysFromNow = new Date(today); 
        sevenDaysFromNow.setDate(today.getDate() + 7);

        // 3. Sort and group tasks
        allTasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        const tasks = {
            overdue: allTasks.filter(t => new Date(t.dueDate) < today),
            today: allTasks.filter(t => new Date(t.dueDate).getTime() === today.getTime()),
            tomorrow: allTasks.filter(t => new Date(t.dueDate).getTime() === tomorrow.getTime()),
            dayAfter: allTasks.filter(t => new Date(t.dueDate).getTime() === dayAfterTomorrow.getTime()),
            thisWeek: allTasks.filter(t => {
                const dueDate = new Date(t.dueDate);
                return dueDate > dayAfterTomorrow && dueDate <= sevenDaysFromNow;
            })
        };

        const staffMap = new Map(allStaff.map(s => [s.id, s.name]));
        
        // 4. Helper to render each group
        const renderTaskGroup = (taskList, title, emptyMessage) => {
            let groupHtml = `<h3 class="agenda-header">${title}</h3>`;
            if (taskList.length === 0) {
                groupHtml += `<p class="agenda-empty">${emptyMessage}</p>`;
            } else {
                groupHtml += taskList.map(task => {
                    const assignee = task.assigneeId ? staffMap.get(task.assigneeId) || 'Unassigned' : 'Unassigned';
                    return `
                        <div class="agenda-item">
                            <div class="agenda-item-main">
                                <span class="agenda-task-name">${task.name}</span>
                                <span class="agenda-project-id">${task.jobNo}</span>
                            </div>
                            <div class="agenda-item-details">
                                <span class="agenda-assignee">${assignee}</span>
                                <span class="agenda-due-date">${task.dueDate}</span>
                            </div>
                        </div>
                    `;
                }).join('');
            }
            return groupHtml;
        };

        // 5. Build the final HTML
        container.innerHTML = `
            ${renderTaskGroup(tasks.overdue, '🔴 Overdue', 'No overdue tasks.')}
            ${renderTaskGroup(tasks.today, '🗓️ Today', 'No tasks due today.')}
            ${renderTaskGroup(tasks.tomorrow, '▶️ Tomorrow', 'No tasks due tomorrow.')}
            ${renderTaskGroup(tasks.dayAfter, '⏩ Day After Tomorrow', 'No tasks due the day after tomorrow.')}
            ${renderTaskGroup(tasks.thisWeek, '📅 Later This Week', 'No other tasks due this week.')}
        `;
    }
    // --- MODIFICATION END ---
    
    // --- MODIFICATION START: Reworked renderMonthly to be full-width and show holidays/leaves ---
    async function renderMonthly(allScrum, allStaff, allProjects) {
        const container = document.getElementById('design-calendar-container');
        if (!container) return;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        const today = new Date();
        today.setHours(0, 0, 0, 0); // For accurate day difference calculation

        // 1. Fetch and process leave and holiday data
        const leavesByDate = new Map();
        allStaff.forEach(staff => {
            (staff.leaves || []).forEach(leave => {
                let d = new Date(leave.startDate + 'T00:00:00');
                const endDate = new Date(leave.endDate + 'T00:00:00');
                while(d <= endDate) {
                    const dateKey = d.toISOString().split('T')[0];
                    if (!leavesByDate.has(dateKey)) leavesByDate.set(dateKey, []);
                    leavesByDate.get(dateKey).push(staff.name);
                    d.setDate(d.getDate() + 1);
                }
            });
        });

        const holidays = await DB.getHolidays('AE', year);
        const holidaysByDate = new Map(holidays.map(h => [h.date, h.name]));

        // 2. Render Calendar Structure with a wrapper for scrolling
        container.innerHTML = `
            <div class="calendar-header">
                <button id="cal-prev-btn" class="secondary-button">&lt;</button>
                <h3 id="cal-month-year">${currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                <div>
                    <button id="cal-refresh-holidays-btn" class="secondary-button small-btn" title="Refresh public holiday data for ${year}">Refresh Holidays</button>
                    <button id="cal-next-btn" class="secondary-button">&gt;</button>
                </div>
            </div>
            <div id="cal-grid-wrapper">
                <div class="calendar-grid-header">
                    <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                </div>
                <div class="calendar-grid" id="cal-grid-body"></div>
            </div>
        `;
        const gridBody = document.getElementById('cal-grid-body');

        const firstDayOfMonth = new Date(year, month, 1);
        const startDayGrid = new Date(firstDayOfMonth);
        startDayGrid.setDate(startDayGrid.getDate() - firstDayOfMonth.getDay());
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const endDayGrid = new Date(lastDayOfMonth);
        endDayGrid.setDate(endDayGrid.getDate() + (6 - lastDayOfMonth.getDay()));

        let dayCells = [];
        let currentDayIter = new Date(startDayGrid);

        // 3. Create Day Cells with Holiday/Leave info
        while(currentDayIter <= endDayGrid) {
            const dateKey = currentDayIter.toISOString().split('T')[0];
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day';
            
            const tooltipParts = [];
            if (currentDayIter.getMonth() !== month) dayCell.classList.add('other-month');

            const dayOfWeek = currentDayIter.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) { // Sun, Sat are weekends
                dayCell.classList.add('is-weekend');
            }

            if(holidaysByDate.has(dateKey)) {
                dayCell.classList.add('is-holiday');
                tooltipParts.push(`Holiday: ${holidaysByDate.get(dateKey)}`);
            }
            if(leavesByDate.has(dateKey)) {
                dayCell.classList.add('is-leave');
                tooltipParts.push(`On Leave: ${leavesByDate.get(dateKey).join(', ')}`);
            }
            
            if(tooltipParts.length > 0) dayCell.title = tooltipParts.join('\n');

            dayCell.innerHTML = `<div class="day-header"><span class="day-number">${currentDayIter.getDate()}</span></div><div class="day-events"></div>`;
            gridBody.appendChild(dayCell);
            dayCells.push({ date: new Date(currentDayIter), element: dayCell });
            currentDayIter.setDate(currentDayIter.getDate() + 1);
        }

        // 4. Process and Render Task Bars
        const addDays = (date, days) => { const d = new Date(date); d.setDate(d.getDate() + days); return d; };
        
        let allTasks = [];
        allScrum.forEach(project => {
            project.tasks.forEach(task => {
                if (task.dueDate) {
                    const dueDate = new Date(task.dueDate + 'T00:00:00');
                    const duration = task.plannedDuration || 1;
                    // Note: This start date is for visualization only. Equalizer has its own logic.
                    const startDate = addDays(dueDate, -(duration - 1));
                    if (startDate <= endDayGrid && dueDate >= startDayGrid) {
                        allTasks.push({ ...task, jobNo: project.jobNo, startDate, dueDate });
                    }
                }
            });
        });
        allTasks.sort((a,b) => a.startDate - b.startDate);

        allTasks.forEach(task => {
            let placed = false;
            let level = 0;
            while(!placed) {
                let canPlaceHere = true;
                for(let i = 0; i < dayCells.length; i++) {
                    const day = dayCells[i];
                    if (task.startDate <= day.date && task.dueDate >= day.date) {
                        const eventsContainer = day.element.querySelector('.day-events');
                        if (eventsContainer.children[level]) { canPlaceHere = false; break; }
                    }
                }
                if (canPlaceHere) {
                    for(let i = 0; i < dayCells.length; i++) {
                        const day = dayCells[i];
                        if (task.startDate <= day.date && task.dueDate >= day.date) {
                             const eventsContainer = day.element.querySelector('.day-events');
                             while(eventsContainer.children.length < level) {
                                 const spacer = document.createElement('div');
                                 spacer.style.height = '22px';
                                 eventsContainer.appendChild(spacer);
                             }
                             const color = DEPARTMENT_COLORS[task.department] || '#777';
                             const eventBar = document.createElement('div');
                             eventBar.className = 'event-bar';
                             eventBar.style.backgroundColor = color;
                             eventBar.title = `${task.name} (${task.jobNo})\nDue: ${task.dueDate}`;
                             
                             const isInProgress = task.status === 'In Progress';
                             if (isInProgress) {
                                 eventBar.classList.add('in-progress');
                             }

                             let labelText = '';
                             let barClasses = [];
                             if (day.date.getTime() === task.startDate.getTime() || day.date.getDay() === 0 || i === 0) {
                                 labelText = `${task.jobNo}: ${task.name}`;
                                 barClasses.push('bar-start');

                                 if (isInProgress) {
                                    const timeDiff = task.dueDate.getTime() - today.getTime();
                                    const dayDiff = Math.round(timeDiff / (1000 * 3600 * 24));
                                    
                                    if (dayDiff < 0) {
                                        labelText += ` [Overdue]`;
                                    } else if (dayDiff === 0) {
                                        labelText += ` [Due Today]`;
                                    } else {
                                        labelText += ` [${dayDiff}d left]`;
                                    }
                                 }
                             }
                             if(day.date.getTime() === task.dueDate.getTime()){ barClasses.push('bar-end'); }
                             if(task.startDate.getTime() === task.dueDate.getTime()){ barClasses.push('bar-single'); }

                             eventBar.classList.add(...barClasses);
                             eventBar.innerHTML = `<span class="event-bar-label">${labelText}</span>`;
                             eventsContainer.appendChild(eventBar);
                        }
                    }
                    placed = true;
                } else {
                    level++;
                }
            }
        });

        // 5. Attach Event Listeners
        document.getElementById('cal-prev-btn').onclick = () => changeMonth(-1, allScrum, allStaff, allProjects);
        document.getElementById('cal-next-btn').onclick = () => changeMonth(1, allScrum, allStaff, allProjects);
        document.getElementById('cal-refresh-holidays-btn').onclick = async () => {
            await handleRefreshHolidays(year, true);
            renderMonthly(allScrum, allStaff, allProjects);
        };
    }

    async function handleRefreshHolidays(year, force = false) {
        if(force) {
            const oldHolidays = await DB.getHolidays('AE', year);
            for(const holiday of oldHolidays) {
                await DB.delete('holidays', holiday.id);
            }
        }
        try {
            const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/AE`);
            if (!response.ok) throw new Error(`API failed with status ${response.status}`);
            const data = await response.json();
            const holidays = data.map(h => ({ name: h.name, date: h.date }));
            await DB.addHolidays(holidays, 'AE', year);
            console.log(`Fetched and cached ${holidays.length} holidays for ${year}.`);
            alert(`Successfully refreshed holiday data for ${year}.`);
            return holidays;
        } catch(error) {
            console.error("Could not fetch public holidays:", error);
            alert("Could not fetch public holidays from the internet. Please check your connection. Using local data if available.");
            return [];
        }
    }
    // --- MODIFICATION END ---

    return { 
        render: renderMonthly, 
        renderAgenda 
    };

})();