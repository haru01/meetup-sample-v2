type ErrorAlertProps = {
  message: string | null | undefined;
};

export const ErrorAlert = ({ message }: ErrorAlertProps) => {
  if (!message) return null;

  return (
    <div
      className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600"
      role="alert"
    >
      {message}
    </div>
  );
};
