export function FieldError({ id, message, className = '' }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className={`mt-1 text-[11px] font-semibold text-rose-600 ${className}`}>
      {message}
    </p>
  );
}
