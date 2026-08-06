import { Link } from 'react-router-dom';
import CompletionRing from './CompletionRing';
import { toText } from '../lib/format';

export default function CarListRow({ car, record, index, drivenThisMonth = false }) {
  const photo = record?.diecast?.photo || car.heroImage;

  return (
    <Link
      to={`/car/${car.id}`}
      className="flex items-center gap-3 px-3 py-2.5 hairline first:border-t-0 hover:bg-canvas-soft dark:hover:bg-garage-soft transition-colors"
    >
      <span className="font-mono text-[10px] text-ink-soft dark:text-paper-soft w-6 flex-shrink-0">
        {String(index + 1).padStart(3, '0')}
      </span>
      <div className="w-11 h-11 flex-shrink-0 bg-canvas dark:bg-garage border border-canvas-line dark:border-garage-line overflow-hidden flex items-center justify-center">
        {photo ? (
          <img src={photo} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="font-mono text-[7px] text-ink-soft dark:text-paper-soft">N/A</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate">
          {toText(car.make)} {toText(car.model)} <span className="text-ink-soft dark:text-paper-soft font-medium">{toText(car.variant)}</span>
        </p>
        <p className="font-mono text-[10px] text-ink-soft dark:text-paper-soft mt-0.5">
          {toText(car.year)} · {toText(car.drivetrain || car.tech?.drivetrain)}
          {record?.gt?.rating > 0 && <span className="text-vermilion"> · {'★'.repeat(record.gt.rating)}</span>}
          {drivenThisMonth && <span className="text-vermilion"> · Driven this month</span>}
          {!drivenThisMonth && record?.status === 'studying' && <span className="text-vermilion"> · Studying</span>}
        </p>
      </div>
      <CompletionRing record={record} size={28} />
    </Link>
  );
}
