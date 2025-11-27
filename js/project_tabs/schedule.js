
App.ProjectTabs.Schedule = (() => {


function init() {
    const container = document.getElementById('schedule-tab');
    if (!container) return;
    container.innerHTML = `<h3>Project Schedule</h3><p>A dynamic Gantt chart is generated in the preview area for projects of type "Villa" once the design and construction durations are set.</p>`;
}

async function handleScheduleUpdate(updatedTask) {
    if (!App.currentProjectJobNo) return;
    const project = await DB.getProject(App.currentProjectJobNo);
    if (!project) return;
    project.scheduleTasks = project.scheduleTasks || [];
    const taskIndex = project.scheduleTasks.findIndex(t => t.id === updatedTask.id);
    if (taskIndex > -1) {
        project.scheduleTasks[taskIndex] = { ...project.scheduleTasks[taskIndex], ...updatedTask };
    } else {
        project.scheduleTasks.push(updatedTask);
    }
    await DB.putProject(project);
    App.Bulletin.log('Schedule Updated', `Construction schedule for <strong>${App.currentProjectJobNo}</strong> was modified.`);
    App.refreshCurrentPreview();
}

function renderPreview(fullData) {
    const scheduleData = UrbanAxisSchedule.calculateDynamicSchedule(fullData, CONTENT.VILLA_SCHEDULE_TEMPLATE, fullData.scheduleTasks);
    UrbanAxisSchedule.render(fullData, scheduleData, handleScheduleUpdate);
}

return { init, renderPreview };

})();
