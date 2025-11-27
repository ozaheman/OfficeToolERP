/**
 * @module EfficiencyAnalyzer
 * Analyzes scrum data to calculate staff efficiency based on planned vs. actual task durations.
 */
const EfficiencyAnalyzer = (() => {

    /**
     * Analyzes all scrum data to calculate efficiency metrics for each staff member.
     * @param {Array} allStaff - The list of all staff members from the HR database.
     * @param {Array} allScrumData - The list of all scrum boards for all projects.
     * @param {Array} designScrumTemplate - The base template for scrum tasks to get default durations.
     * @returns {Array} An array of objects, each containing efficiency data for a staff member.
     */
    function analyzeStaffEfficiency(allStaff, allScrumData, designScrumTemplate) {
        const staffResults = new Map();
        const templateDurationMap = new Map(designScrumTemplate.map(t => [t.id, t.duration]));

        // Initialize results map for all staff
        allStaff.forEach(staff => {
            staffResults.set(staff.id, {
                staffId: staff.id,
                staffName: staff.name,
                plannedDays: 0,
                actualDays: 0,
                completedTasks: 0,
                efficiency: 0
            });
        });

        // Process all completed tasks
        allScrumData.forEach(projectScrum => {
            projectScrum.tasks.forEach(task => {
                // We only analyze completed tasks with an assignee and valid date records
                if (task.status === 'Done' && task.assigneeId && task.startDate && task.completedDate) {
                    const staffResult = staffResults.get(task.assigneeId);
                    if (staffResult) {
                        // 1. Get Planned Duration
                        // Use the task's own 'plannedDuration' if it's a custom task,
                        // otherwise fall back to the template duration. Default to 1 day if not found.
                        const plannedDuration = task.plannedDuration || templateDurationMap.get(task.id) || 1;
                        staffResult.plannedDays += plannedDuration;

                        // 2. Calculate Actual Duration
                        const startDate = new Date(task.startDate);
                        const completedDate = new Date(task.completedDate);
                        // Add 1 because a task started and finished on the same day took 1 day.
                        const actualDuration = Math.ceil((completedDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
                        staffResult.actualDays += actualDuration;

                        staffResult.completedTasks++;
                    }
                }
            });
        });

        // Final calculation of efficiency score for each staff member
        staffResults.forEach(result => {
            if (result.actualDays > 0) {
                // Efficiency = (Total Planned Time / Total Actual Time) * 100
                result.efficiency = Math.round((result.plannedDays / result.actualDays) * 100);
            }
        });

        // Convert Map values to an array and sort by name
        return Array.from(staffResults.values()).sort((a, b) => a.staffName.localeCompare(b.staffName));
    }

    return {
        analyzeStaffEfficiency
    };

})();