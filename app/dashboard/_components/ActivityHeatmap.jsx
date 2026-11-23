import { formatDisplayDate } from "@/utils/dates";

// A one-hue ramp in the brand orange: more practice is brighter. Days without
// practice use a neutral step.
const RAMP = ["#55260f", "#923d14", "#db5f1d", "#ffa060"];
const EMPTY = "#1c1c21";
const WEEKDAYS = ["Mon", "", "Wed", "", "Fri", "", ""];

function cellColor(count) {
  if (count === 0) return EMPTY;
  if (count === 1) return RAMP[0];
  if (count === 2) return RAMP[1];
  if (count <= 4) return RAMP[2];
  return RAMP[3];
}

function describe({ day, count }) {
  const date = formatDisplayDate(new Date(`${day}T00:00:00Z`));
  return `${count === 0 ? "No answers" : `${count} ${count === 1 ? "answer" : "answers"}`} on ${date}`;
}

/** Answers per day over the last 12 weeks, one column per week (Monday first). */
export default function ActivityHeatmap({ weeks, practiceDays }) {
  return (
    <figure>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <div className="grid grid-rows-7 gap-[3px] pt-px text-[10px] leading-3 text-muted-foreground" aria-hidden="true">
          {WEEKDAYS.map((label, index) => (
            <span key={index} className="h-3">
              {label}
            </span>
          ))}
        </div>
        <div
          role="img"
          aria-label={`Practice activity over the last 12 weeks: ${practiceDays} ${practiceDays === 1 ? "day" : "days"} with at least one answer.`}
          className="grid grid-flow-col grid-rows-7 gap-[3px]"
        >
          {weeks.flat().map((cell) =>
            cell.count === null ? (
              <span key={cell.day} className="h-3 w-3" aria-hidden="true" />
            ) : (
              <span
                key={cell.day}
                title={describe(cell)}
                className="h-3 w-3 rounded-[3px] transition-transform hover:scale-125"
                style={{ backgroundColor: cellColor(cell.count) }}
              />
            )
          )}
        </div>
      </div>
      <figcaption className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
        Less
        {[EMPTY, ...RAMP].map((color) => (
          <span key={color} className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: color }} aria-hidden="true" />
        ))}
        More
      </figcaption>
    </figure>
  );
}
