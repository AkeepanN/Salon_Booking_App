function toMinutes(time) {
  if (!/^\d{2}:\d{2}$/.test(time)) {
    throw new Error('Time must be in HH:mm format');
  }

  const [hours, minutes] = time.split(':').map(Number);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error('Invalid time');
  }

  return hours * 60 + minutes;
}

function toTime(minutes) {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 24 * 60) {
    throw new Error('Invalid time');
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function addMinutes(time, duration) {
  return toTime(toMinutes(time) + duration);
}

function getBlocks(startTime, endTime, intervalMinutes) {
  const blocks = [];
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);

  for (let cursor = start; cursor < end; cursor += intervalMinutes) {
    blocks.push(toTime(cursor));
  }

  return blocks;
}

function isDateString(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const [year, month, day] = date.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function isTimeString(time) {
  if (!/^\d{2}:\d{2}$/.test(time)) {
    return false;
  }

  try {
    toMinutes(time);
    return true;
  } catch (error) {
    return false;
  }
}

function isClosedDay(date, closedDays) {
  const weekday = new Date(`${date}T00:00:00+05:30`).getDay();
  return closedDays.includes(weekday);
}

function fitsWorkingHours({ startTime, endTime, open, close }) {
  return toMinutes(startTime) >= toMinutes(open) && toMinutes(endTime) <= toMinutes(close);
}

function isAlignedToInterval({ startTime, open, intervalMinutes }) {
  return (toMinutes(startTime) - toMinutes(open)) % intervalMinutes === 0;
}

module.exports = {
  addMinutes,
  fitsWorkingHours,
  getBlocks,
  isAlignedToInterval,
  isClosedDay,
  isDateString,
  isTimeString,
  toMinutes,
  toTime,
};
