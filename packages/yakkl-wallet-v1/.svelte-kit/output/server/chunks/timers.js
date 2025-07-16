import{T as TimerManager}from"./TimerManager.js";import{l as log}from"./Logger.js";function removeTimers(){try{const timerManager=TimerManager.getInstance();if(timerManager){timerManager.removeAll()}}catch(error){log.error("Error removing timers:",false,error)}}export{removeTimers};
//# sourceMappingURL=timers.js.map
