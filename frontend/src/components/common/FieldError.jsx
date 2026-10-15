export function FieldError({ message, className = '' }) {
  if (!message) return null;
  return (
    <p role="alert" className={`mt-1 text-[11px] font-semibold text-rose-600 ${className}`}>
      {message}
    </p>
  );
}
