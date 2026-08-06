import { Link } from 'react-router-dom';
import CompletionRing from './CompletionRing';
import { toText } from '../lib/format';

const STATUS_LABEL = {
  studying: 'Studying',
};

export default function CarCard({ car, record, index, compact = false, drivenThisMonth = false }) {
  const photo = record?.diecast?.photo || car.heroImage;

  return (
    <Link
      to={`/car/${car.id}`}
      className="group block card-surface hover:border-vermilion transition-colors"
    >
      <div className="aspect-[4/3] bg-canvas dark:bg-garage overflow-hidden relative border-b border-canvas-line dark:border-garage-line">
        {photo ? (
          <img
            src={photo}
            alt={`${car.make} ${car.model}`}
            className="w-full h-full object-cover grayscale-[15%] group-hover:grayscale-0 transition-all duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-mono text-[9px] sm:text-[10px] tracking-plate text-ink-soft dark:text-paper-soft text-center px-1">
              NO PHOTO YET
            </span>
          </div>
        )}
        <span className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 font-mono font-semibold text-[9px] sm:text-[10px] tracking-plate bg-canvas/90 dark:bg-garage/90 px-1.5 sm:px-2 py-0.5 sm:py-1 border border-canvas-line dark:border-garage-line">
          {String(index + 1).padStart(3, '0')}
        </span>
      </div>
      <div className={`${compact ? 'p-2.5' : 'p-4'} flex items-start justify-between gap-2 sm:gap-3`}>
        <div className="min-w-0">
          <p className={`plate-label mb-1 ${compact ? 'text-[9px]' : ''}`}>{toText(car.make)}</p>
          <h3
            className={`font-display font-bold leading-snug ${
              compact ? 'text-sm line-clamp-2' : 'text-base truncate'
            }`}
          >
            {toText(car.model)} <span className="text-ink-soft dark:text-paper-soft font-semibold">{toText(car.variant)}</span>
          </h3>
          <p className={`font-mono font-medium text-ink-soft dark:text-paper-soft mt-1 ${compact ? 'text-[10px]' : 'text-xs'}`}>
            {toText(car.year)} · {toText(car.drivetrain || car.tech?.drivetrain)}
          </p>
          {record?.gt?.rating > 0 && (
            <p className={`text-vermilion mt-1 ${compact ? 'text-[10px]' : 'text-xs'}`} aria-label={`${record.gt.rating} out of 5 stars`}>
              {'★'.repeat(record.gt.rating)}
              <span className="text-canvas-line dark:text-garage-line">{'★'.repeat(5 - record.gt.rating)}</span>
            </p>
          )}
          {drivenThisMonth ? (
            <span className="inline-block mt-1.5 sm:mt-2 font-mono font-semibold text-[9px] sm:text-[10px] tracking-plate uppercase text-vermilion">
              Driven This Month
            </span>
          ) : (
            record?.status === 'studying' && (
              <span className="inline-block mt-1.5 sm:mt-2 font-mono font-semibold text-[9px] sm:text-[10px] tracking-plate uppercase text-vermilion">
                {STATUS_LABEL.studying}
              </span>
            )
          )}
        </div>
        <CompletionRing record={record} size={compact ? 32 : 40} />
      </div>
    </Link>
  );
}
