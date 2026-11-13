import { ArrowUpRight, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";

export const booksyBookingUrl =
  import.meta.env.VITE_BOOKSY_BOOKING_URL?.trim() ?? "";

type BooksyActionProps = {
  label: string;
  fallbackTo?: string;
  className?: string;
  disabledWhenUnavailable?: boolean;
  variant?: "primary" | "inverse";
};

const buttonStyles =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold shadow-[0_8px_24px_rgba(89,52,93,0.14)] outline outline-2 transition-transform duration-200 hover:scale-[1.03]";

export function BooksyAction({
  label,
  fallbackTo = "#agendamento",
  className = "",
  disabledWhenUnavailable = false,
  variant = "primary",
}: BooksyActionProps) {
  const variantStyles =
    variant === "inverse"
      ? "bg-paper text-plum outline-paper hover:bg-lavender"
      : "bg-plum text-paper outline-lavender hover:bg-plum/90";
  const classes = `${buttonStyles} ${variantStyles} ${className}`;

  if (booksyBookingUrl) {
    return (
      <a
        className={classes}
        href={booksyBookingUrl}
        target="_blank"
        rel="noreferrer"
      >
        {label}
        <ArrowUpRight aria-hidden="true" className="text-champagne" size={16} />
      </a>
    );
  }

  if (disabledWhenUnavailable) {
    return (
      <button
        className={`${classes} cursor-not-allowed opacity-60 hover:scale-100`}
        type="button"
        disabled
      >
        Booksy em breve
        <CalendarDays aria-hidden="true" className="text-champagne" size={16} />
      </button>
    );
  }

  return (
    <Link className={classes} to={fallbackTo}>
      {label}
      <ArrowUpRight aria-hidden="true" className="text-champagne" size={16} />
    </Link>
  );
}
