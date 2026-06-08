import type { NoaTool } from '../../types/noa';

export const getTodaysBriefing: NoaTool<{
  jobs: number;
  tasks: number;
  meetings: number;
  priority: string;
  nextSystems: string[];
}> = {
  name: 'getTodaysBriefing',
  label: "Today's briefing",
  description: 'Returns a local placeholder daily briefing. Later this will read Optra, Notion and Calendar.',
  keywords: ['today', 'briefing', 'priority', 'priorities', 'attention', 'tasks', 'jobs', 'schedule', 'day'],
  async execute() {
    const data = {
      jobs: 3,
      tasks: 7,
      meetings: 1,
      priority: 'Connect live data sources next: Notion Daily Tasks, Optra jobs, and Google Calendar.',
      nextSystems: ['Notion', 'Optra', 'Google Calendar']
    };

    return {
      tool: 'getTodaysBriefing',
      label: "Today's briefing",
      data,
      summary: `You currently have ${data.jobs} placeholder jobs, ${data.tasks} placeholder tasks, and ${data.meetings} placeholder meeting in the local briefing model.`
    };
  }
};
