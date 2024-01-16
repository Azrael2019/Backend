// Init arguments
let lastDate;

export function logger(message, isError = false) {
    const newDate = new Date();
    if (!lastDate) lastDate = newDate;
    console[isError ? 'error' : 'log'](`[${newDate.toISOString()}] - ${isError ? 'ERROR - ' : ''}${message} - (${(newDate.getTime() - lastDate.getTime()) / 1000}s)`);
    lastDate = newDate;
}


export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
